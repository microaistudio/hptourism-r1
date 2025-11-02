import { Router } from 'express';
import { db } from '../db';
import { himkoshTransactions, homestayApplications, ddoCodes, systemSettings } from '../../shared/schema';
import { HimKoshCrypto, buildPipeString, parseResponseString, buildVerificationString } from './crypto';
import { getHimKoshConfig } from './config';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const router = Router();
const crypto = new HimKoshCrypto();

/**
 * POST /api/himkosh/initiate
 * Initiate HimKosh payment for an application
 */
router.post('/initiate', async (req, res) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    // Fetch application details
    const [application] = await db
      .select()
      .from(homestayApplications)
      .where(eq(homestayApplications.id, applicationId))
      .limit(1);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify application is ready for payment
    if (application.status !== 'payment_pending' && application.status !== 'verified_for_payment') {
      return res.status(400).json({ 
        error: 'Application is not ready for payment',
        currentStatus: application.status 
      });
    }

    const config = getHimKoshConfig();

    // Look up DDO code based on application's district
    let ddoCode = config.ddo; // Default/fallback DDO
    if (application.district) {
      const [ddoMapping] = await db
        .select()
        .from(ddoCodes)
        .where(eq(ddoCodes.district, application.district))
        .limit(1);
      
      if (ddoMapping) {
        ddoCode = ddoMapping.ddoCode;
        console.log(`[himkosh] Using district-specific DDO: ${ddoCode} for district: ${application.district}`);
      } else {
        console.log(`[himkosh] No DDO mapping found for district: ${application.district}, using fallback: ${config.ddo}`);
      }
    }

    // Generate unique transaction reference
    const appRefNo = `HPT${Date.now()}${nanoid(6)}`.substring(0, 20);

    // CRITICAL FIX #2: Amounts must be integers only (no decimals like 100.00)
    // DLL expects whole rupees, decimals trigger ASP.NET FormatException
    if (!application.totalFee) {
      return res.status(400).json({ error: 'Total fee not calculated for this application' });
    }
    const actualAmount = Math.round(parseFloat(application.totalFee.toString())); // Ensure integer

    // Check if test payment mode is enabled
    const [testModeSetting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, 'payment_test_mode'))
      .limit(1);
    
    const isTestMode = testModeSetting 
      ? (testModeSetting.settingValue as { enabled: boolean }).enabled 
      : false;
    
    // Use ₹1 for gateway if test mode is enabled, otherwise use actual amount
    const gatewayAmount = isTestMode ? 1 : actualAmount;
    
    if (isTestMode) {
      console.log(`[himkosh] 🧪 TEST PAYMENT MODE ACTIVE - Sending ₹1 to gateway instead of ₹${actualAmount}`);
    }

    // Get period dates (first and last day of current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const formatDate = (date: Date) => 
      `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;

    // Build pipe string parameters (matches working Node.js sample)
    const pipeParams = {
      deptId: config.deptId,
      deptRefNo: application.applicationNumber,
      totalAmount: gatewayAmount, // Use gateway amount (₹1 in test mode)
      tenderBy: application.ownerName,
      appRefNo,
      head1: config.heads.registrationFee,
      amount1: gatewayAmount, // Use gateway amount (₹1 in test mode)
      periodFrom: formatDate(firstDay),
      periodTo: formatDate(lastDay),
      serviceCode: config.serviceCode,
      ddo: ddoCode,
      returnUrl: config.returnUrl,
    };

    // Build pipe string WITH checksum appended (ready to encrypt)
    // This matches the working sample exactly
    const pipeStringWithChecksum = buildPipeString(pipeParams);
    
    // Encrypt the ENTIRE pipe string (including checksum)
    const encryptedData = await crypto.encrypt(pipeStringWithChecksum);

    // Debug logging
    console.log('[himkosh] Pipe string with checksum (before encryption):', pipeStringWithChecksum);
    console.log('[himkosh] Encrypted data:', encryptedData);
    console.log('[himkosh] POST fields: encdata + merchant_code ONLY (no separate checksum)');

    // Save transaction to database (store gateway amount that was actually sent)
    await db.insert(himkoshTransactions).values({
      applicationId,
      deptRefNo: application.applicationNumber,
      appRefNo,
      totalAmount: gatewayAmount, // Store what was sent to gateway
      tenderBy: application.ownerName,
      merchantCode: config.merchantCode,
      deptId: config.deptId,
      serviceCode: config.serviceCode,
      ddo: ddoCode,
      head1: config.heads.registrationFee,
      amount1: gatewayAmount, // Store what was sent to gateway
      periodFrom: formatDate(firstDay),
      periodTo: formatDate(lastDay),
      encryptedRequest: encryptedData,
      requestChecksum: '', // Checksum is inside encrypted data (not separate)
      transactionStatus: 'initiated',
    });

    // Return payment initiation data (ONLY 2 fields: encdata + merchant_code)
    const response = {
      success: true,
      paymentUrl: config.paymentUrl,
      merchantCode: config.merchantCode,
      encdata: encryptedData,
      // NO separate checksum field! Checksum is inside encrypted data
      appRefNo,
      totalAmount: gatewayAmount, // Gateway amount (₹1 in test mode)
      actualAmount, // Actual calculated fee (for display purposes)
      isTestMode, // Flag to indicate test mode
      isConfigured: config.isConfigured,
      message: isTestMode 
        ? `🧪 TEST MODE: Sending ₹1 to gateway (actual fee: ₹${actualAmount})`
        : (config.isConfigured 
          ? 'Payment initiated successfully' 
          : 'Using test configuration - waiting for CTP credentials'),
    };
    
    console.log('[himkosh] ✅ Using working sample format - checksum INSIDE encrypted data');
    res.json(response);
  } catch (error) {
    console.error('HimKosh initiation error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/himkosh/callback
 * Handle payment response callback from CTP
 */
router.post('/callback', async (req, res) => {
  try {
    const { encdata } = req.body;

    if (!encdata) {
      return res.status(400).send('Missing payment response data');
    }

    // Decrypt response
    const decryptedData = await crypto.decrypt(encdata);
    const parsedResponse = parseResponseString(decryptedData);

    // Verify checksum
    const dataWithoutChecksum = decryptedData.substring(0, decryptedData.lastIndexOf('|checksum='));
    const isValid = HimKoshCrypto.verifyChecksum(dataWithoutChecksum, parsedResponse.checksum);

    if (!isValid) {
      console.error('HimKosh callback: Checksum verification failed');
      return res.status(400).send('Invalid checksum');
    }

    // Find transaction
    const [transaction] = await db
      .select()
      .from(himkoshTransactions)
      .where(eq(himkoshTransactions.appRefNo, parsedResponse.appRefNo))
      .limit(1);

    if (!transaction) {
      console.error('HimKosh callback: Transaction not found:', parsedResponse.appRefNo);
      return res.status(404).send('Transaction not found');
    }

    // Update transaction with response
    await db
      .update(himkoshTransactions)
      .set({
        echTxnId: parsedResponse.echTxnId,
        bankCIN: parsedResponse.bankCIN,
        bankName: parsedResponse.bankName,
        paymentDate: parsedResponse.paymentDate,
        status: parsedResponse.status,
        statusCd: parsedResponse.statusCd,
        responseChecksum: parsedResponse.checksum,
        transactionStatus: parsedResponse.statusCd === '1' ? 'success' : 'failed',
        respondedAt: new Date(),
        challanPrintUrl: parsedResponse.statusCd === '1' 
          ? `${getHimKoshConfig().challanPrintUrl}?reportName=PaidChallan&TransId=${parsedResponse.echTxnId}`
          : undefined,
      })
      .where(eq(himkoshTransactions.id, transaction.id));

    // If payment successful, update application
    if (parsedResponse.statusCd === '1') {
      // Generate certificate number
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const certificateNumber = `HP-HST-${year}-${randomSuffix}`;

      const issueDate = new Date();
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      await db
        .update(homestayApplications)
        .set({
          status: 'approved',
          certificateNumber,
          certificateIssuedDate: issueDate,
          certificateExpiryDate: expiryDate,
          approvedAt: issueDate,
        })
        .where(eq(homestayApplications.id, transaction.applicationId));
    }

    // Redirect user to application page
    res.redirect(`${process.env.VITE_FRONTEND_URL || ''}/application/${transaction.applicationId}?payment=${parsedResponse.statusCd === '1' ? 'success' : 'failed'}&himgrn=${parsedResponse.echTxnId}`);
  } catch (error) {
    console.error('HimKosh callback error:', error);
    res.status(500).send('Payment processing failed');
  }
});

/**
 * POST /api/himkosh/verify/:appRefNo
 * Double verification of transaction (server-to-server)
 */
router.post('/verify/:appRefNo', async (req, res) => {
  try {
    const { appRefNo } = req.params;
    const config = getHimKoshConfig();

    // Build verification request
    const verificationString = buildVerificationString({
      appRefNo,
      serviceCode: config.serviceCode,
      merchantCode: config.merchantCode,
    });

    const encryptedData = await crypto.encrypt(verificationString);

    // Make request to CTP verification endpoint
    const response = await fetch(config.verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `encdata=${encodeURIComponent(encryptedData)}`,
    });

    const responseData = await response.text();
    
    // Parse response (will be pipe-delimited string)
    const parts = responseData.split('|');
    const verificationData: Record<string, string> = {};
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value !== undefined) {
        verificationData[key] = value;
      }
    }

    // Update transaction
    const [transaction] = await db
      .select()
      .from(himkoshTransactions)
      .where(eq(himkoshTransactions.appRefNo, appRefNo))
      .limit(1);

    if (transaction) {
      await db
        .update(himkoshTransactions)
        .set({
          isDoubleVerified: true,
          doubleVerificationDate: new Date(),
          doubleVerificationData: verificationData,
          verifiedAt: new Date(),
        })
        .where(eq(himkoshTransactions.id, transaction.id));
    }

    res.json({
      success: true,
      verified: verificationData.TXN_STAT === '1',
      data: verificationData,
    });
  } catch (error) {
    console.error('HimKosh verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/himkosh/transactions
 * Get all HimKosh transactions (admin only)
 */
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await db
      .select()
      .from(himkoshTransactions)
      .orderBy(himkoshTransactions.createdAt);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/himkosh/transaction/:appRefNo
 * Get specific transaction details
 */
router.get('/transaction/:appRefNo', async (req, res) => {
  try {
    const { appRefNo } = req.params;

    const [transaction] = await db
      .select()
      .from(himkoshTransactions)
      .where(eq(himkoshTransactions.appRefNo, appRefNo))
      .limit(1);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

/**
 * GET /api/himkosh/config/status
 * Check HimKosh configuration status
 */
router.get('/config/status', (req, res) => {
  const config = getHimKoshConfig();
  res.json({
    configured: config.isConfigured,
    merchantCode: config.merchantCode,
    deptId: config.deptId,
    serviceCode: config.serviceCode,
    returnUrl: config.returnUrl,
  });
});

/**
 * POST /api/himkosh/test-callback-url
 * Test if a specific callback URL makes the checksum pass
 */
router.post('/test-callback-url', async (req, res) => {
  try {
    const { callbackUrl, applicationId } = req.body;

    if (!callbackUrl || !applicationId) {
      return res.status(400).json({ error: 'callbackUrl and applicationId are required' });
    }

    // Fetch application details
    const [application] = await db
      .select()
      .from(homestayApplications)
      .where(eq(homestayApplications.id, applicationId))
      .limit(1);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const config = getHimKoshConfig();

    // Look up DDO code
    let ddoCode = config.ddo;
    if (application.district) {
      const [ddoMapping] = await db
        .select()
        .from(ddoCodes)
        .where(eq(ddoCodes.district, application.district))
        .limit(1);
      
      if (ddoMapping) {
        ddoCode = ddoMapping.ddoCode;
      }
    }

    const appRefNo = `HPT${Date.now()}${nanoid(6)}`.substring(0, 20);
    
    if (!application.totalFee) {
      return res.status(400).json({ error: 'Total fee not calculated for this application' });
    }
    const totalAmount = Math.round(parseFloat(application.totalFee.toString()));

    const now = new Date();
    const periodDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    const requestParams = {
      deptId: config.deptId,
      deptRefNo: application.applicationNumber,
      totalAmount: totalAmount,
      tenderBy: application.ownerName,
      appRefNo: appRefNo,
      head1: config.heads.registrationFee,
      amount1: totalAmount,
      ddo: ddoCode,
      periodFrom: periodDate,
      periodTo: periodDate,
      serviceCode: config.serviceCode,
      returnUrl: callbackUrl, // Use the test callback URL
    };

    // Build pipe string WITH checksum (matches working sample)
    const pipeStringWithChecksum = buildPipeString(requestParams);
    
    // Encrypt the entire pipe string (including checksum)
    const encrypted = await crypto.encrypt(pipeStringWithChecksum);

    console.log('[himkosh-test] Testing callback URL:', callbackUrl);
    console.log('[himkosh-test] Pipe string with checksum:', pipeStringWithChecksum);
    console.log('[himkosh-test] Encrypted:', encrypted);

    res.json({
      success: true,
      testUrl: callbackUrl,
      pipeStringWithChecksum: pipeStringWithChecksum,
      encrypted: encrypted,
      paymentUrl: `${config.paymentUrl}?encdata=${encodeURIComponent(encrypted)}&merchant_code=${config.merchantCode}`,
      message: 'Using working Node.js sample format - checksum INSIDE encrypted data',
    });

  } catch (error) {
    console.error('[himkosh-test] Error:', error);
    res.status(500).json({ error: 'Failed to generate test data' });
  }
});

export default router;
