/**
 * Migration Script: JSONB Documents to Relational Table
 * 
 * Migrates all existing documents from the homestay_applications.documents JSONB field
 * to the dedicated documents table with proper versioning and audit trails.
 * 
 * Run this script once to migrate existing data, then update application code
 * to use the new document service for all future operations.
 */

import { db } from './db';
import { homestayApplications, documents } from '@shared/schema';
import { sql } from 'drizzle-orm';

interface LegacyDocument {
  id: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  documentType?: string;
  filePath?: string;
}

export async function migrateDocuments() {
  console.log('[migration] Starting document migration from JSONB to table...');
  
  let totalApplications = 0;
  let totalDocumentsMigrated = 0;
  let errors = 0;
  
  try {
    // Fetch all applications with documents
    const applications = await db.select({
      id: homestayApplications.id,
      userId: homestayApplications.userId,
      documents: homestayApplications.documents,
    }).from(homestayApplications);
    
    console.log(`[migration] Found ${applications.length} applications to process`);
    
    for (const app of applications) {
      totalApplications++;
      
      if (!app.documents || !Array.isArray(app.documents) || app.documents.length === 0) {
        continue; // Skip applications with no documents
      }
      
      const docs = app.documents as unknown as LegacyDocument[];
      
      for (const doc of docs) {
        try {
          // Skip if essential fields are missing
          if (!doc.fileName || (!doc.fileUrl && !doc.filePath)) {
            console.warn(`[migration] Skipping invalid document in application ${app.id}:`, doc);
            continue;
          }
          
          // Determine file path (prefer fileUrl, fallback to filePath)
          const filePath = doc.fileUrl || doc.filePath || '';
          
          // Determine MIME type from file extension if missing
          let mimeType = doc.mimeType || 'application/octet-stream';
          if (!doc.mimeType && doc.fileName) {
            const ext = doc.fileName.split('.').pop()?.toLowerCase();
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (['jpg', 'jpeg'].includes(ext || '')) mimeType = 'image/jpeg';
            else if (ext === 'png') mimeType = 'image/png';
          }
          
          // Determine file category from MIME type
          const fileCategory = mimeType.startsWith('image/') ? 'photo' : 'document';
          
          // Insert into documents table
          await db.insert(documents).values({
            id: doc.id,
            applicationId: app.id,
            documentType: doc.documentType || 'unknown',
            fileName: doc.fileName,
            filePath,
            fileSize: doc.fileSize || 0,
            mimeType,
            fileCategory,
            version: 1,
            isLatestVersion: true,
            uploadedBy: app.userId, // Attribute to application owner
            status: 'active',
            isDeleted: false,
          });
          
          totalDocumentsMigrated++;
        } catch (error) {
          errors++;
          console.error(`[migration] Error migrating document ${doc.id} in application ${app.id}:`, error);
        }
      }
      
      if (totalApplications % 10 === 0) {
        console.log(`[migration] Progress: ${totalApplications}/${applications.length} applications processed, ${totalDocumentsMigrated} documents migrated`);
      }
    }
    
    console.log('[migration] ✓ Migration completed successfully');
    console.log(`[migration] Summary:`);
    console.log(`  - Applications processed: ${totalApplications}`);
    console.log(`  - Documents migrated: ${totalDocumentsMigrated}`);
    console.log(`  - Errors: ${errors}`);
    
    return {
      success: true,
      totalApplications,
      totalDocumentsMigrated,
      errors,
    };
  } catch (error) {
    console.error('[migration] Fatal error during migration:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDocuments()
    .then((result) => {
      if (result.success) {
        console.log('[migration] Migration completed successfully');
        process.exit(0);
      } else {
        console.error('[migration] Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('[migration] Unexpected error:', error);
      process.exit(1);
    });
}
