/**
 * HimKosh Payment Gateway Configuration
 * Store sensitive credentials in Replit Secrets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getEnvValue = (...keys: Array<string | undefined>) => {
  for (const key of keys) {
    if (!key) continue;
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

export function resolveKeyFilePath(explicitPath?: string): string {
  const candidates = [
    explicitPath,
    process.env.HIMKOSH_KEY_FILE_PATH,
    path.resolve(process.cwd(), 'server/himkosh/echallan.key'),
    path.resolve(process.cwd(), 'dist/himkosh/echallan.key'),
    path.resolve(process.cwd(), 'dist/echallan.key'),
    path.join(__dirname, 'echallan.key'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore and continue to next candidate
    }
  }

  // Fall back to module-relative path; loadKey will throw a clearer error
  return path.join(__dirname, 'echallan.key');
}

export const himkoshConfig = {
  // CTP API Endpoints
  paymentUrl: getEnvValue('HIMKOSH_PAYMENT_URL', 'HIMKOSH_POST_URL') || 'https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx',
  verificationUrl: getEnvValue('HIMKOSH_VERIFICATION_URL', 'HIMKOSH_VERIFY_URL') || 'https://himkosh.hp.nic.in/eChallan/webpages/AppVerification.aspx',
  challanPrintUrl: getEnvValue('HIMKOSH_CHALLAN_PRINT_URL') || 'https://himkosh.hp.nic.in/eChallan/challan_reports/reportViewer.aspx',
  searchChallanUrl: getEnvValue('HIMKOSH_SEARCH_URL') || 'https://himkosh.hp.nic.in/eChallan/SearchChallan.aspx',

  // Merchant Configuration (from CTP team)
  // These will be stored in Replit Secrets
  merchantCode: getEnvValue('HIMKOSH_MERCHANT_CODE', 'HIMKOSH_MERCHANTCODE', 'HIMKOSH_MERCHANT_ID') || '',
  deptId: getEnvValue('HIMKOSH_DEPT_ID', 'HIMKOSH_DEPT_CODE') || '',
  serviceCode: getEnvValue('HIMKOSH_SERVICE_CODE', 'HIMKOSH_SERVICECODE') || '',
  ddo: getEnvValue('HIMKOSH_DDO', 'HIMKOSH_DDO_CODE') || '',

  // Head of Account Codes (Budget heads)
  heads: {
    registrationFee: getEnvValue('HIMKOSH_HEAD', 'HIMKOSH_HEAD_OF_ACCOUNT', 'HIMKOSH_HEAD1') || '',
    secondaryHead: getEnvValue('HIMKOSH_HEAD2', 'HIMKOSH_SECONDARY_HEAD', 'HIMKOSH_HEAD_OF_ACCOUNT_2'),
    secondaryHeadAmount: (() => {
      const raw = getEnvValue('HIMKOSH_HEAD2_AMOUNT', 'HIMKOSH_SECONDARY_HEAD_AMOUNT');
      if (!raw) return undefined;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    })(),
  },

  // Return URL for payment callback
  // CRITICAL: Must be the actual URL where this app is running
  // In Replit, use REPLIT_DEV_DOMAIN or REPL_SLUG/REPL_OWNER
  returnUrl:
    getEnvValue("HIMKOSH_RETURN_URL") || "https://hptourism.osipl.dev/api/himkosh/callback",

  // Key file path (will be provided by CTP team)
  // Use absolute path to ensure it's found regardless of working directory
  keyFilePath: resolveKeyFilePath(),
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
    secondaryHead: !!himkoshConfig.heads.secondaryHead,
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
        secondaryHead: himkoshConfig.heads.secondaryHead,
        secondaryHeadAmount: himkoshConfig.heads.secondaryHeadAmount,
      },
      isConfigured: true,
      configStatus: 'placeholder' as const,
    };
  }

  console.log('[himkosh-config] ✅ All credentials configured - production mode enabled');
  return {
    ...himkoshConfig,
    isConfigured: true,
    configStatus: 'production' as const,
  };
}
