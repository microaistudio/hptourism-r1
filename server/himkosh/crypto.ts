import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * HimKosh Encryption/Decryption Utilities
 * Based on CTP Technical Specification
 * 
 * Algorithm: AES-128 (Rijndael)
 * Mode: CBC
 * Padding: PKCS7
 * Key Size: 128 bits (16 bytes)
 * Block Size: 128 bits (16 bytes)
 */

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HimKoshCrypto {
  private keyFilePath: string;
  private key: Buffer | null = null;

  constructor(keyFilePath?: string) {
    // Default to echallan.key in server/himkosh directory
    this.keyFilePath = keyFilePath || path.join(__dirname, 'echallan.key');
  }

  /**
   * Load encryption key from file
   * Key file will be provided by CTP team
   */
  private async loadKey(): Promise<Buffer> {
    if (this.key) {
      return this.key;
    }

    try {
      const keyData = await fs.readFile(this.keyFilePath);
      const keyBytes = Buffer.alloc(16); // 128 bits = 16 bytes
      const len = Math.min(keyData.length, keyBytes.length);
      keyData.copy(keyBytes, 0, 0, len);
      this.key = keyBytes;
      return this.key;
    } catch (error) {
      throw new Error(`Key file not found at: ${this.keyFilePath}. Please obtain echallan.key from CTP team.`);
    }
  }

  /**
   * Encrypt data string using AES-128-CBC
   * @param textToEncrypt - Plain text string to encrypt
   * @returns Base64 encoded encrypted string
   */
  async encrypt(textToEncrypt: string): Promise<string> {
    try {
      const keyBytes = await this.loadKey();
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-128-cbc', keyBytes, keyBytes);
      
      // Encrypt
      let encrypted = cipher.update(textToEncrypt, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return encrypted;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Encryption failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Decrypt data string using AES-128-CBC
   * @param textToDecrypt - Base64 encoded encrypted string
   * @returns Decrypted plain text string
   */
  async decrypt(textToDecrypt: string): Promise<string> {
    try {
      const keyBytes = await this.loadKey();
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-128-cbc', keyBytes, keyBytes);
      
      // Decrypt
      let decrypted = decipher.update(textToDecrypt, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Decryption failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate MD5 checksum for data string
   * @param dataString - String to generate checksum for
   * @returns MD5 checksum in lowercase hexadecimal
   */
  static generateChecksum(dataString: string): string {
    const hash = crypto.createHash('md5');
    hash.update(dataString, 'ascii');
    return hash.digest('hex');
  }

  /**
   * Verify checksum of received data
   * @param dataString - Data string without checksum
   * @param receivedChecksum - Checksum to verify against
   * @returns true if checksums match
   */
  static verifyChecksum(dataString: string, receivedChecksum: string): boolean {
    const calculatedChecksum = this.generateChecksum(dataString);
    return calculatedChecksum === receivedChecksum.toLowerCase();
  }
}

/**
 * Build pipe-delimited request string for HimKosh
 * @param params - Request parameters
 * @returns Pipe-delimited string with checksum
 */
export function buildRequestString(params: {
  deptId: string;
  deptRefNo: string;
  totalAmount: number;
  tenderBy: string;
  appRefNo: string;
  head1: string;
  amount1: number;
  ddo: string;
  periodFrom: string;
  periodTo: string;
  head2?: string;
  amount2?: number;
  head3?: string;
  amount3?: number;
  head4?: string;
  amount4?: number;
  head10?: string;
  amount10?: number;
  serviceCode?: string;
  returnUrl?: string;
}): string {
  // Build base string (mandatory fields)
  let parts = [
    `DeptID=${params.deptId}`,
    `DeptRefNo=${params.deptRefNo}`,
    `TotalAmount=${params.totalAmount}`,
    `TenderBy=${params.tenderBy}`,
    `AppRefNo=${params.appRefNo}`,
    `Head1=${params.head1}`,
    `Amount1=${params.amount1}`,
    `Ddo=${params.ddo}`,
    `PeriodFrom=${params.periodFrom}`,
    `PeriodTo=${params.periodTo}`,
  ];

  // Add optional heads (only if amount > 0)
  if (params.head2 && params.amount2 && params.amount2 > 0) {
    parts.push(`Head2=${params.head2}`);
    parts.push(`Amount2=${params.amount2}`);
  }
  if (params.head3 && params.amount3 && params.amount3 > 0) {
    parts.push(`Head3=${params.head3}`);
    parts.push(`Amount3=${params.amount3}`);
  }
  if (params.head4 && params.amount4 && params.amount4 > 0) {
    parts.push(`Head4=${params.head4}`);
    parts.push(`Amount4=${params.amount4}`);
  }
  if (params.head10 && params.amount10 && params.amount10 > 0) {
    parts.push(`Head10=${params.head10}`);
    parts.push(`Amount10=${params.amount10}`);
  }

  // Add service code if provided
  if (params.serviceCode) {
    parts.push(`Service_code=${params.serviceCode}`);
  }

  // Add return URL if provided
  if (params.returnUrl) {
    parts.push(`return_url=${params.returnUrl}`);
  }

  // Join with pipe delimiter
  const dataString = parts.join('|');

  // Calculate checksum and append
  const checksum = HimKoshCrypto.generateChecksum(dataString);
  return `${dataString}|checkSum=${checksum}`;
}

/**
 * Parse pipe-delimited response string from HimKosh
 * @param responseString - Decrypted response string
 * @returns Parsed response object
 */
export function parseResponseString(responseString: string): {
  echTxnId: string;
  bankCIN: string;
  bank: string;
  status: string;
  statusCd: string;
  appRefNo: string;
  amount: string;
  paymentDate: string;
  deptRefNo: string;
  bankName: string;
  checksum: string;
} {
  const parts = responseString.split('|');
  const data: Record<string, string> = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value !== undefined) {
      data[key] = value;
    }
  }

  return {
    echTxnId: data.EchTxnId || '',
    bankCIN: data.BankCIN || '',
    bank: data.Bank || '',
    status: data.Status || '',
    statusCd: data.StatusCd || '',
    appRefNo: data.AppRefNo || '',
    amount: data.Amount || '',
    paymentDate: data.Payment_date || '',
    deptRefNo: data.DeptRefNo || '',
    bankName: data.BankName || '',
    checksum: data.checksum || '',
  };
}

/**
 * Build double verification request string
 * @param params - Verification parameters
 * @returns Pipe-delimited string with checksum
 */
export function buildVerificationString(params: {
  appRefNo: string;
  serviceCode: string;
  merchantCode: string;
}): string {
  const dataString = `AppRefNo=${params.appRefNo}|Service_code=${params.serviceCode}|merchant_code=${params.merchantCode}`;
  const checksum = HimKoshCrypto.generateChecksum(dataString);
  return `${dataString}|checkSum=${checksum}`;
}
