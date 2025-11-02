/**
 * MinIO Storage Service
 * 
 * Provides S3-compatible object storage using MinIO.
 * Used for development environment to match production DC deployment.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface MinIOConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  useSSL: boolean;
  bucketName: string;
}

export class MinIOStorage {
  private client: S3Client;
  private bucketName: string;

  constructor(config: MinIOConfig) {
    this.bucketName = config.bucketName;
    
    this.client = new S3Client({
      endpoint: `http://${config.endpoint}:${config.port}`,
      region: 'us-east-1', // MinIO doesn't care about region, but SDK requires it
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  /**
   * Initialize bucket if it doesn't exist
   */
  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      console.log(`[minio] Bucket '${this.bucketName}' exists`);
    } catch (error: any) {
      if (error.name === 'NotFound') {
        console.log(`[minio] Creating bucket '${this.bucketName}'...`);
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        console.log(`[minio] Bucket '${this.bucketName}' created successfully`);
      } else {
        console.error('[minio] Error checking bucket:', error);
        throw error;
      }
    }
  }

  /**
   * Upload file to MinIO
   */
  async uploadFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await this.client.send(command);
    
    // Return the file path (URL will be generated on demand)
    return filePath;
  }

  /**
   * Get signed URL for file download (valid for 1 hour)
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get file as buffer
   */
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

  /**
   * Delete file from MinIO
   */
  async deleteFile(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
    });

    await this.client.send(command);
  }

  /**
   * Check if file exists
   */
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

// Export singleton instance
const minioConfig: MinIOConfig = {
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  useSSL: process.env.MINIO_USE_SSL === 'true',
  bucketName: process.env.MINIO_BUCKET_NAME || 'hp-tourism-documents',
};

export const minioStorage = new MinIOStorage(minioConfig);
