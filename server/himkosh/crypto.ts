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
  private iv: Buffer | null = null;

  constructor(keyFilePath?: string) {
    // Default to echallan.key in server/himkosh directory
    this.keyFilePath = keyFilePath || path.join(__dirname, 'echallan.key');
  }

  /**
   * Load encryption key and IV from file
   * Key file format from CTP:
   * - 16 bytes: Key only (will use zero IV)
   * - 32 bytes: Key (0-15) + IV (16-31)
   * Any other size is invalid and will throw an error
   */
  private async loadKey(): Promise<{ key: Buffer; iv: Buffer }> {
    if (this.key && this.iv) {
      console.log('[himkosh-crypto] Using cached key/IV');
      return { key: this.key, iv: this.iv };
    }

    try {
      console.log('[himkosh-crypto] Loading key from:', this.keyFilePath);
      const keyData = await fs.readFile(this.keyFilePath);
      console.log('[himkosh-crypto] Key file size:', keyData.length, 'bytes');
      
      // Strict validation: Must be exactly 16 or 32 bytes
      if (keyData.length !== 16 && keyData.length !== 32) {
        throw new Error(
          `Invalid key file size: ${keyData.length} bytes. ` +
          `Expected exactly 16 bytes (key only) or 32 bytes (key + IV). ` +
          `Please verify echallan.key file from CTP team.`
        );
      }
      
      // Extract 16-byte key (bytes 0-15)
      const keyBytes = Buffer.alloc(16);
      keyData.copy(keyBytes, 0, 0, 16);
      this.key = keyBytes;
      console.log('[himkosh-crypto] Key loaded successfully (16 bytes)');
      
      // Extract 16-byte IV (bytes 16-31) if available
      let ivBytes: Buffer;
      if (keyData.length === 32) {
        // IV provided in file
        ivBytes = Buffer.alloc(16);
        keyData.copy(ivBytes, 0, 16, 32);
        console.log('[himkosh-crypto] IV loaded from file (16 bytes)');
      } else {
        // 16-byte file: Use zero IV
        ivBytes = Buffer.alloc(16, 0);
        console.log('[himkosh-crypto] Using zero IV (16-byte key file)');
      }
      this.iv = ivBytes;
      
      return { key: this.key, iv: this.iv };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Key file not found at: ${this.keyFilePath}. Please obtain echallan.key from CTP team.`);
    }
  }

  /**
   * Encrypt data string using AES-128-CBC
   * .NET backend expects ASCII encoding (NOT UTF-8)
   * @param textToEncrypt - Plain text string to encrypt
   * @returns Base64 encoded encrypted string
   */
  async encrypt(textToEncrypt: string): Promise<string> {
    try {
      const { key, iv } = await this.loadKey();
      
      // Create cipher with separate key and IV
      const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
      
      // TRY VARIANT 4: Back to UTF-8 encoding (most standard)
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
   * .NET backend uses ASCII encoding (NOT UTF-8)
   * @param textToDecrypt - Base64 encoded encrypted string
   * @returns Decrypted plain text string
   */
  async decrypt(textToDecrypt: string): Promise<string> {
    try {
      const { key, iv } = await this.loadKey();
      
      // Create decipher with separate key and IV
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      
      // CRITICAL: Use 'ascii' encoding to match .NET's Encoding.ASCII.GetString()
      let decrypted = decipher.update(textToDecrypt, 'base64', 'ascii');
      decrypted += decipher.final('ascii');
      
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
   * .NET backend expects UPPERCASE hex (NOT lowercase)
   * @param dataString - String to generate checksum for
   * @returns MD5 checksum in UPPERCASE hexadecimal
   */
  static generateChecksum(dataString: string): string {
    const hash = crypto.createHash('md5');
    // Use UTF-8 for checksum
    hash.update(dataString, 'utf8');
    // CRITICAL: HimKosh expects LOWERCASE hex (as per documentation example)
    return hash.digest('hex').toLowerCase();
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
 * @returns Pipe-delimited string WITHOUT checksum (for encryption)
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
  // CRITICAL: Field ORDER must match government code EXACTLY!
  let parts = [
    `DeptID=${params.deptId}`,
    `DeptRefNo=${params.deptRefNo}`,
    `TotalAmount=${params.totalAmount}`,
    `TenderBy=${params.tenderBy}`,
    `AppRefNo=${params.appRefNo}`,
    `Head1=${params.head1}`,
    `Amount1=${params.amount1}`,
  ];

  // Add Head2/Amount2 BEFORE Ddo (government code order)
  // CRITICAL: Government code includes Head2/Amount2 ALWAYS (even if Amount2=0)
  if (params.head2 !== undefined && params.amount2 !== undefined) {
    parts.push(`Head2=${params.head2}`);
    parts.push(`Amount2=${params.amount2}`);
  }

  // Add Ddo AFTER Head2/Amount2
  parts.push(`Ddo=${params.ddo}`);
  parts.push(`PeriodFrom=${params.periodFrom}`);
  parts.push(`PeriodTo=${params.periodTo}`);
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

  // CRITICAL: Service_code and return_url MUST be included in checksum calculation
  // Confirmed by HP Government's production code (Dummy Code.txt)
  if (params.serviceCode) {
    parts.push(`Service_code=${params.serviceCode}`);
  }
  if (params.returnUrl) {
    parts.push(`return_url=${params.returnUrl}`);
  }
  
  // Join with pipe delimiter and return WITHOUT checksum
  // Checksum is calculated separately and appended before encryption
  return parts.join('|');
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
