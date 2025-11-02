/**
 * Document Management API Routes
 * 
 * Independent RESTful API for document operations.
 * All routes require authentication and are prefixed with /api/documents
 */

import type { Express, Request } from 'express';
import { documentService } from './document-service';
import { db } from './db';
import { homestayApplications } from '@shared/schema';
import type { User } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Extend Express Request with session user info
interface AuthenticatedRequest extends Request {
  session: {
    userId: string;
    user?: User;
  };
}

/**
 * Check if user can access an application's documents
 * Property owners can only access their own applications
 * Officers can access applications in their district
 * Admins can access all applications
 */
async function canAccessApplication(userId: string, userRole: string, applicationId: string, userDistrict?: string): Promise<boolean> {
  // Get application details
  const [application] = await db.select()
    .from(homestayApplications)
    .where(eq(homestayApplications.id, applicationId));
  
  if (!application) {
    return false; // Application doesn't exist
  }
  
  // Property owners can only access their own applications
  if (userRole === 'property_owner') {
    return application.userId === userId;
  }
  
  // District-level roles can access applications in their district
  if (['district_officer', 'dealing_assistant', 'district_tourism_officer'].includes(userRole)) {
    if (!userDistrict) return false;
    return application.district === userDistrict;
  }
  
  // State officers, admins, and super_admins can access all applications
  if (['state_officer', 'admin', 'super_admin'].includes(userRole)) {
    return true;
  }
  
  return false;
}

/**
 * Register document management routes
 */
export function registerDocumentRoutes(app: Express, requireAuth: any, storage: any) {
  
  /**
   * GET /api/documents/:id
   * Get a single document by ID
   */
  app.get('/api/documents/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      
      const document = await documentService.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Get user details for authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check authorization
      const hasAccess = await canAccessApplication(userId, user.role, document.applicationId, user.district || undefined);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Log document view
      await documentService.logAction({
        documentId: id,
        applicationId: document.applicationId,
        action: 'view',
        actionBy: userId,
        userRole: user.role,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.json({ document });
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });
  
  /**
   * GET /api/documents/application/:applicationId
   * Get all documents for an application
   */
  app.get('/api/documents/application/:applicationId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId } = req.params;
      const userId = req.session.userId;
      const includeDeleted = req.query.includeDeleted === 'true';
      
      // Get user details for authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check authorization
      const hasAccess = await canAccessApplication(userId, user.role, applicationId, user.district || undefined);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const documents = await documentService.getApplicationDocuments(applicationId, includeDeleted);
      
      res.json({ documents });
    } catch (error) {
      console.error('Error fetching application documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });
  
  /**
   * GET /api/documents/versions/:documentType/:applicationId
   * Get all versions of a specific document type
   */
  app.get('/api/documents/versions/:documentType/:applicationId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { documentType, applicationId } = req.params;
      const userId = req.session.userId;
      
      // Get user details for authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check authorization
      const hasAccess = await canAccessApplication(userId, user.role, applicationId, user.district || undefined);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const versions = await documentService.getDocumentVersions(documentType, applicationId);
      
      res.json({ versions });
    } catch (error) {
      console.error('Error fetching document versions:', error);
      res.status(500).json({ message: 'Failed to fetch document versions' });
    }
  });
  
  /**
   * POST /api/documents/upload
   * Upload a new document
   */
  app.post('/api/documents/upload', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.session.userId;
      const {
        applicationId,
        fileName,
        filePath,
        fileSize,
        mimeType,
        documentType,
        fileCategory
      } = req.body;
      
      // Validate required fields
      if (!applicationId || !fileName || !filePath || !fileSize || !mimeType || !documentType) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Get user details for authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check authorization - only property owner can upload to their own application
      const hasAccess = await canAccessApplication(userId, user.role, applicationId, user.district || undefined);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied - you can only upload documents to your own applications' });
      }
      
      const document = await documentService.uploadDocument({
        applicationId,
        uploadedBy: userId,
        metadata: {
          fileName,
          filePath,
          fileSize,
          mimeType,
          documentType,
          fileCategory,
        },
      });
      
      res.json({ document });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });
  
  /**
   * POST /api/documents/:id/new-version
   * Create a new version of an existing document
   */
  app.post('/api/documents/:id/new-version', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const {
        fileName,
        filePath,
        fileSize,
        mimeType,
        documentType,
        fileCategory
      } = req.body;
      
      // Validate required fields
      if (!fileName || !filePath || !fileSize || !mimeType || !documentType) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Get existing document to check authorization
      const existingDoc = await documentService.getDocument(id);
      if (!existingDoc) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Get user details for authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check authorization - only owner can create new versions
      const hasAccess = await canAccessApplication(userId, user.role, existingDoc.applicationId, user.district || undefined);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied - you can only create new versions for your own documents' });
      }
      
      const newVersion = await documentService.createNewVersion(
        id,
        {
          fileName,
          filePath,
          fileSize,
          mimeType,
          documentType,
          fileCategory,
        },
        userId
      );
      
      res.json({ document: newVersion });
    } catch (error) {
      console.error('Error creating new document version:', error);
      res.status(500).json({ message: 'Failed to create new version' });
    }
  });
  
  /**
   * DELETE /api/documents/:id
   * Soft delete a document
   */
  app.delete('/api/documents/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      
      // Get the document first to verify its actual applicationId
      const document = await documentService.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Get user details for authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check authorization using the document's ACTUAL applicationId (not caller-supplied)
      const hasAccess = await canAccessApplication(userId, user.role, document.applicationId, user.district || undefined);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const deletedDocument = await documentService.deleteDocument(id, userId, document.applicationId);
      
      res.json({ document: deletedDocument });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });
  
  /**
   * GET /api/documents/:id/audit-logs
   * Get audit logs for a specific document
   */
  app.get('/api/documents/:id/audit-logs', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      
      // Get document to verify access to its application
      const document = await documentService.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Get user details for authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check authorization
      const hasAccess = await canAccessApplication(userId, user.role, document.applicationId, user.district || undefined);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const logs = await documentService.getDocumentAuditLogs(id);
      
      res.json({ logs });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });
  
  /**
   * GET /api/documents/application/:applicationId/audit-logs
   * Get all audit logs for an application's documents
   */
  app.get('/api/documents/application/:applicationId/audit-logs', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { applicationId } = req.params;
      const userId = req.session.userId;
      
      // Get user details for authorization
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check authorization
      const hasAccess = await canAccessApplication(userId, user.role, applicationId, user.district || undefined);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const logs = await documentService.getApplicationAuditLogs(applicationId);
      
      res.json({ logs });
    } catch (error) {
      console.error('Error fetching application audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });
  
  console.log('[document-routes] Document management API routes registered');
}
