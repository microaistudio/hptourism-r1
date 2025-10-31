/**
 * HimKosh Payment Gateway Configuration
 * Store sensitive credentials in Replit Secrets
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const himkoshConfig = {
  // CTP API Endpoints
  paymentUrl: 'https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx',
  verificationUrl: 'https://himkosh.hp.nic.in/eChallan/webpages/AppVerification.aspx',
  challanPrintUrl: 'https://himkosh.hp.nic.in/eChallan/challan_reports/reportViewer.aspx',
  searchChallanUrl: 'https://himkosh.hp.nic.in/eChallan/SearchChallan.aspx',

  // Merchant Configuration (from CTP team)
  // These will be stored in Replit Secrets
  merchantCode: process.env.HIMKOSH_MERCHANT_CODE || '', // e.g., 'HIMKOSH228'
  deptId: process.env.HIMKOSH_DEPT_ID || '', // 3-digit dept code
  serviceCode: process.env.HIMKOSH_SERVICE_CODE || '', // 3-char service code (e.g., 'TSM')
  ddo: process.env.HIMKOSH_DDO || '', // DDO code (e.g., 'SML00-532')

  // Head of Account Codes (Budget heads)
  heads: {
    registrationFee: process.env.HIMKOSH_HEAD || '', // e.g., '1452-00-800-01'
    // Add more heads as needed
  },

  // Return URL for payment callback
  // CRITICAL: Must be the actual URL where this app is running
  // In Replit, use REPLIT_DEV_DOMAIN or REPL_SLUG/REPL_OWNER
  returnUrl: process.env.HIMKOSH_RETURN_URL || 
    (process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/himkosh/callback`
      : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/himkosh/callback`),

  // Key file path (will be provided by CTP team)
  // Use absolute path to ensure it's found regardless of working directory
  keyFilePath: process.env.HIMKOSH_KEY_FILE_PATH || path.join(__dirname, 'echallan.key'),
};

/**
 * Validate HimKosh configuration
 * @returns true if all required config is present
 */
export function validateHimKoshConfig(): { valid: boolean; missingFields: string[] } {
  const requiredFields = [
    'merchantCode',
    'deptId',
    'serviceCode',
    'ddo',
  ];

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!himkoshConfig[field as keyof typeof himkoshConfig]) {
      missingFields.push(field);
    }
  }

  // Check if at least one head is configured
  if (!himkoshConfig.heads.registrationFee) {
    missingFields.push('heads.registrationFee');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Get configured or placeholder values
 * This allows development/testing even without CTP credentials
 */
export function getHimKoshConfig() {
  const config = validateHimKoshConfig();
  
  console.log('[himkosh-config] Validation result:', {
    valid: config.valid,
    missingFields: config.missingFields,
    merchantCode: !!himkoshConfig.merchantCode,
    deptId: !!himkoshConfig.deptId,
    serviceCode: !!himkoshConfig.serviceCode,
    ddo: !!himkoshConfig.ddo,
    head: !!himkoshConfig.heads.registrationFee,
  });
  
  if (!config.valid) {
    console.warn('⚠️  HimKosh configuration incomplete. Missing:', config.missingFields.join(', '));
    console.warn('⚠️  Using placeholder values for development/testing.');
    
    return {
      ...himkoshConfig,
      merchantCode: himkoshConfig.merchantCode || 'HIMKOSH228',
      deptId: himkoshConfig.deptId || '228',
      serviceCode: himkoshConfig.serviceCode || 'TRM',
      ddo: himkoshConfig.ddo || 'SML10-001',
      heads: {
        registrationFee: himkoshConfig.heads.registrationFee || '0230-00-104-01',
      },
      isConfigured: false,
    };
  }

  console.log('[himkosh-config] ✅ All credentials configured - production mode enabled');
  return {
    ...himkoshConfig,
    isConfigured: true,
  };
}
