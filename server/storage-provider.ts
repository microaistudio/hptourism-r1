/**
 * Unified Storage Provider Interface
 * 
 * Supports both Replit Object Storage and MinIO with the same interface.
 * This ensures code tested in development works identically in production DC.
 */

import { Storage } from '@google-cloud/storage';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface StorageProvider {
  uploadFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string>;
  getFileUrl(filePath: string): Promise<string>;
  getFile(filePath: string): Promise<Buffer>;
  deleteFile(filePath: string): Promise<void>;
  fileExists(filePath: string): Promise<boolean>;
  init(): Promise<void>;
}

/**
 * Replit Object Storage Provider
 * Uses Google Cloud Storage SDK (Replit's backend)
 */
class ReplitStorageProvider implements StorageProvider {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.storage = new Storage();
    this.bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || '';
  }

  async init(): Promise<void> {
    console.log('[storage] Using Replit Object Storage');
    console.log(`[storage] Bucket: ${this.bucketName}`);
  }

  async uploadFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filePath);
    
    await file.save(fileBuffer, {
      contentType,
      metadata: {
        contentType,
      },
    });
    
    return filePath;
  }

  async getFileUrl(filePath: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filePath);
    
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 3600 * 1000, // 1 hour
    });
    
    return url;
  }

  async getFile(filePath: string): Promise<Buffer> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filePath);
    
    const [contents] = await file.download();
    return contents;
  }

  async deleteFile(filePath: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filePath);
    
    await file.delete();
  }

  async fileExists(filePath: string): Promise<boolean> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filePath);
    
    const [exists] = await file.exists();
    return exists;
  }
}

/**
 * MinIO Storage Provider
 * Uses AWS S3 SDK (MinIO is S3-compatible)
 * This code is production-ready for customer DC deployment
 */
class MinIOStorageProvider implements StorageProvider {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'hp-tourism-documents';
    
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    
    this.client = new S3Client({
      endpoint: `http://${endpoint}:${port}`,
      region: 'us-east-1', // MinIO doesn't use regions but SDK requires it
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async init(): Promise<void> {
    console.log('[storage] Using MinIO Object Storage');
    console.log(`[storage] Endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
    console.log(`[storage] Bucket: ${this.bucketName}`);
    
    // Ensure bucket exists
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      console.log(`[storage] Bucket '${this.bucketName}' exists`);
    } catch (error: any) {
      if (error.name === 'NotFound') {
        console.log(`[storage] Creating bucket '${this.bucketName}'...`);
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        console.log(`[storage] Bucket '${this.bucketName}' created`);
      } else {
        console.error('[storage] Error checking bucket:', error.message);
        throw error;
      }
    }
  }

  async uploadFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await this.client.send(command);
    return filePath;
  }

  async getFileUrl(filePath: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    // Generate signed URL valid for 1 hour
    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async getFile(filePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    const response = await this.client.send(command);
    
    if (!response.Body) {
      throw new Error('File not found');
    }

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    await this.client.send(command);
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });
      
      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Local Filesystem Storage Provider
 * Fallback for testing without object storage
 */
class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = process.env.LOCAL_STORAGE_DIR || '/tmp/hp-tourism-storage';
  }

  async init(): Promise<void> {
    console.log('[storage] Using Local Filesystem Storage');
    console.log(`[storage] Directory: ${this.baseDir}`);
    
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async uploadFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const fullPath = path.join(this.baseDir, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, fileBuffer);
    
    return filePath;
  }

  async getFileUrl(filePath: string): Promise<string> {
    // Return local file path (in production this would need a download endpoint)
    return `file://${path.join(this.baseDir, filePath)}`;
  }

  async getFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, filePath);
    return await fs.readFile(fullPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, filePath);
    await fs.unlink(fullPath);
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create the appropriate storage provider
 */
export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'replit';
  
  switch (provider.toLowerCase()) {
    case 'minio':
      return new MinIOStorageProvider();
    case 'replit':
      return new ReplitStorageProvider();
    case 'local':
      return new LocalStorageProvider();
    default:
      console.warn(`[storage] Unknown provider '${provider}', defaulting to Replit`);
      return new ReplitStorageProvider();
  }
}

// Export singleton instance
export const storageProvider = createStorageProvider();
