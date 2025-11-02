/**
 * Document Management Service
 * 
 * Independent module for handling document storage, versioning, and audit trails.
 * Supports multiple storage providers: Replit Object Storage, MinIO, or local filesystem.
 * 
 * Features:
 * - Document versioning (never delete, only supersede)
 * - Audit logging (track all uploads, views, downloads)
 * - Soft delete (mark as deleted instead of removing)
 * - File organization (separate photos from documents)
 * - Multi-provider support (Replit/MinIO/Local)
 */

import { db } from './db';
import { documents, documentAuditLogs, type InsertDocument, type Document, type InsertDocumentAuditLog } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface DocumentMetadata {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: string;
  fileCategory?: 'document' | 'image' | 'photo';
}

export interface UploadDocumentOptions {
  applicationId: string;
  uploadedBy: string;
  metadata: DocumentMetadata;
  version?: number;
  previousVersionId?: string;
}

export interface AuditLogOptions {
  documentId: string;
  applicationId: string;
  action: 'upload' | 'view' | 'download' | 'verify' | 'delete';
  actionBy: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

export class DocumentService {
  /**
   * Upload a new document or create a new version
   */
  async uploadDocument(options: UploadDocumentOptions): Promise<Document> {
    const { applicationId, uploadedBy, metadata, version, previousVersionId } = options;
    
    // Determine file category from MIME type if not provided
    const fileCategory = metadata.fileCategory || this.determineFileCategory(metadata.mimeType);
    
    // If this is a new version, mark previous version as superseded
    if (previousVersionId) {
      await db.update(documents)
        .set({ 
          isLatestVersion: false,
          status: 'superseded'
        })
        .where(eq(documents.id, previousVersionId));
    }
    
    // Create new document record
    const newDocument: InsertDocument = {
      applicationId,
      documentType: metadata.documentType,
      fileName: metadata.fileName,
      filePath: metadata.filePath,
      fileSize: metadata.fileSize,
      mimeType: metadata.mimeType,
      fileCategory,
      version: version || 1,
      previousVersionId,
      isLatestVersion: true,
      uploadedBy,
      status: 'active',
      isDeleted: false,
    };
    
    const [createdDocument] = await db.insert(documents).values(newDocument).returning();
    
    // Log the upload action
    await this.logAction({
      documentId: createdDocument.id,
      applicationId,
      action: 'upload',
      actionBy: uploadedBy,
      notes: `Uploaded ${metadata.fileName} (version ${version || 1})`,
    });
    
    return createdDocument;
  }
  
  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document | undefined> {
    const [document] = await db.select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.isDeleted, false)
      ));
    
    return document;
  }
  
  /**
   * Get all documents for an application (latest versions only)
   */
  async getApplicationDocuments(applicationId: string, includeDeleted = false): Promise<Document[]> {
    const conditions = [
      eq(documents.applicationId, applicationId),
      eq(documents.isLatestVersion, true)
    ];
    
    if (!includeDeleted) {
      conditions.push(eq(documents.isDeleted, false));
    }
    
    return await db.select()
      .from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.uploadDate));
  }
  
  /**
   * Get all versions of a specific document
   */
  async getDocumentVersions(documentType: string, applicationId: string): Promise<Document[]> {
    return await db.select()
      .from(documents)
      .where(and(
        eq(documents.applicationId, applicationId),
        eq(documents.documentType, documentType)
      ))
      .orderBy(desc(documents.version));
  }
  
  /**
   * Soft delete a document
   */
  async deleteDocument(documentId: string, deletedBy: string, applicationId: string): Promise<Document> {
    const [deletedDocument] = await db.update(documents)
      .set({
        isDeleted: true,
        status: 'deleted',
        deletedBy,
        deletedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();
    
    // Log the deletion
    await this.logAction({
      documentId,
      applicationId,
      action: 'delete',
      actionBy: deletedBy,
      notes: `Document marked as deleted`,
    });
    
    return deletedDocument;
  }
  
  /**
   * Create a new version of an existing document
   */
  async createNewVersion(
    currentDocumentId: string,
    metadata: DocumentMetadata,
    uploadedBy: string
  ): Promise<Document> {
    // Get current document
    const currentDoc = await this.getDocument(currentDocumentId);
    if (!currentDoc) {
      throw new Error('Document not found');
    }
    
    // Create new version
    return await this.uploadDocument({
      applicationId: currentDoc.applicationId,
      uploadedBy,
      metadata,
      version: currentDoc.version + 1,
      previousVersionId: currentDocumentId,
    });
  }
  
  /**
   * Log document access/action for audit trail
   */
  async logAction(options: AuditLogOptions): Promise<void> {
    const auditLog: InsertDocumentAuditLog = {
      documentId: options.documentId,
      applicationId: options.applicationId,
      action: options.action,
      actionBy: options.actionBy,
      userRole: options.userRole,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      notes: options.notes,
    };
    
    await db.insert(documentAuditLogs).values(auditLog);
  }
  
  /**
   * Get audit logs for a document
   */
  async getDocumentAuditLogs(documentId: string) {
    return await db.select()
      .from(documentAuditLogs)
      .where(eq(documentAuditLogs.documentId, documentId))
      .orderBy(desc(documentAuditLogs.actionAt));
  }
  
  /**
   * Get all audit logs for an application
   */
  async getApplicationAuditLogs(applicationId: string) {
    return await db.select()
      .from(documentAuditLogs)
      .where(eq(documentAuditLogs.applicationId, applicationId))
      .orderBy(desc(documentAuditLogs.actionAt));
  }
  
  /**
   * Determine file category from MIME type
   */
  private determineFileCategory(mimeType: string): 'document' | 'image' | 'photo' {
    if (mimeType.startsWith('image/')) {
      return 'photo';
    }
    return 'document';
  }
  
  /**
   * Get storage path for file based on category and type
   * Organizes files: documents/type/*.pdf or images/type/*.jpg
   */
  getStoragePath(fileCategory: 'document' | 'image' | 'photo', documentType: string, fileName: string): string {
    const baseFolder = fileCategory === 'document' ? 'documents' : 'images';
    return `${baseFolder}/${documentType}/${fileName}`;
  }
}

// Export singleton instance
export const documentService = new DocumentService();
