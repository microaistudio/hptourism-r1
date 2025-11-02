import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * HimKosh Encryption/Decryption Utilities
 * Based on working Node.js sample implementation
 * 
 * Algorithm: AES-128-CBC (or AES-256-CBC based on key length)
 * Mode: CBC
 * Padding: PKCS7 (default in Node.js)
 * Key Size: 128/192/256 bits (16/24/32 bytes)
 * Block Size: 128 bits (16 bytes)
 * 
 * CRITICAL: echallan.key file format (from Treasury):
 * Line 1: base64-encoded encryption key
 * Line 2: base64-encoded IV
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HimKoshCrypto {
  private keyFilePath: string;
  private key: Buffer | null = null;
  private iv: Buffer | null = null;
  private algorithm: string | null = null;

  constructor(keyFilePath?: string) {
    this.keyFilePath = keyFilePath || path.join(__dirname, 'echallan.key');
  }

  /**
   * Load encryption key and IV from file
   * File format: Two lines with base64-encoded key and IV
   */
  private async loadKey(): Promise<{ key: Buffer; iv: Buffer; algorithm: string }> {
    if (this.key && this.iv && this.algorithm) {
      return { key: this.key, iv: this.iv, algorithm: this.algorithm };
    }

    try {
      const raw = await fs.readFile(this.keyFilePath, 'utf8');
      const lines = raw.trim().split(/\r?\n/);
      
      if (lines.length < 2) {
        throw new Error('echallan.key must contain base64 key and IV on separate lines');
      }

      const keyLine = lines[0].trim();
      const ivLine = lines[1].trim();
      
      this.key = Buffer.from(keyLine, 'base64');
      this.iv = Buffer.from(ivLine, 'base64');

      if (!this.key.length || !this.iv.length) {
        throw new Error('Invalid key file format - key or IV is empty');
      }

      if (![16, 24, 32].includes(this.key.length)) {
        throw new Error('Encryption key must be 16/24/32 bytes (AES-128/192/256)');
      }

      if (this.iv.length !== 16) {
        throw new Error('Encryption IV must be 16 bytes (AES block size)');
      }

      // Determine algorithm based on key length
      this.algorithm = 
        this.key.length === 16 ? 'aes-128-cbc' : 
        this.key.length === 24 ? 'aes-192-cbc' : 
        'aes-256-cbc';

      console.log(`[himkosh-crypto] Loaded ${this.algorithm.toUpperCase()} key (${this.key.length} bytes) and IV (${this.iv.length} bytes)`);
      
      return { key: this.key, iv: this.iv, algorithm: this.algorithm };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Key file not found at: ${this.keyFilePath}`);
    }
  }

  /**
   * Encrypt data string using AES-CBC
   * @param textToEncrypt - Plain text string to encrypt (includes checksum)
   * @returns Base64 encoded encrypted string
   */
  async encrypt(textToEncrypt: string): Promise<string> {
    try {
      const { key, iv, algorithm } = await this.loadKey();
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      const encrypted = Buffer.concat([
        cipher.update(textToEncrypt, 'utf8'),
        cipher.final(),
      ]);
      
      return encrypted.toString('base64');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Encryption failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Decrypt data string using AES-CBC
   * @param textToDecrypt - Base64 encoded encrypted string
   * @returns Decrypted plain text string
   */
  async decrypt(textToDecrypt: string): Promise<string> {
    try {
      const { key, iv, algorithm } = await this.loadKey();
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(textToDecrypt, 'base64')),
        decipher.final(),
      ]);
      
      return decrypted.toString('utf8');
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
    return crypto.createHash('md5').update(dataString, 'utf8').digest('hex');
  }

  /**
   * Verify checksum of received data
   * @param dataString - Data string without checksum
   * @param receivedChecksum - Checksum to verify against
   * @returns true if checksums match
   */
  static verifyChecksum(dataString: string, receivedChecksum: string): boolean {
    const calculatedChecksum = this.generateChecksum(dataString);
    return calculatedChecksum.toLowerCase() === receivedChecksum.toLowerCase();
  }
}

/**
 * Build pipe-delimited request string for HimKosh (WITH checksum appended)
 * @param params - Request parameters
 * @returns Complete pipe string with checksum (ready to encrypt)
 */
export function buildPipeString(params: {
  deptId: string;
  deptRefNo: string;
  totalAmount: number;
  tenderBy: string;
  appRefNo: string;
  head1: string;
  amount1: number;
  ddo?: string;
  periodFrom: string;
  periodTo: string;
  head2?: string;
  amount2?: number;
  serviceCode?: string;
  returnUrl?: string;
}): string {
  // Ensure amounts are integers (no decimals)
  const intAmount = Math.round(Number(params.totalAmount || 0));
  const intAmount1 = Math.round(Number(params.amount1 || 0));
  
  // Build pipe string in exact order from working sample
  const pieces = [
    `DeptID=${params.deptId}`,
    `DeptRefNo=${params.deptRefNo}`,
    `TotalAmount=${intAmount}`,
    `TenderBy=${params.tenderBy}`,
    `AppRefNo=${params.appRefNo}`,
    `Head1=${params.head1}`,
    `Amount1=${intAmount1}`,
    `PeriodFrom=${params.periodFrom}`,
    `PeriodTo=${params.periodTo}`,
    `Service_code=${params.serviceCode || ''}`,
  ];

  // Add DDO if provided
  if (params.ddo) {
    pieces.push(`Ddo=${params.ddo}`);
  }

  // Add return URL if provided
  if (params.returnUrl) {
    pieces.push(`return_url=${params.returnUrl}`);
  }

  // Add Head2/Amount2 if provided
  if (params.head2 && params.amount2 !== undefined) {
    const intAmount2 = Math.round(Number(params.amount2));
    pieces.push(`Head2=${params.head2}`);
    pieces.push(`Amount2=${intAmount2}`);
  }

  // Join into pipe string
  const pipe = pieces.join('|');
  
  // Calculate checksum on the pipe string
  const checksum = HimKoshCrypto.generateChecksum(pipe);
  
  // CRITICAL: Append checksum to the pipe string
  // This entire string (including checksum) gets encrypted
  return `${pipe}|checkSum=${checksum}`;
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
    const [key, ...rest] = part.split('=');
    if (key) {
      data[key] = rest.join('=');
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
    checksum: data.checkSum || data.checksum || '',
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
