import { type User, type InsertUser, type HomestayApplication, type InsertHomestayApplication, type Document, type InsertDocument, type Payment, type InsertPayment } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // Homestay Application methods
  getApplication(id: string): Promise<HomestayApplication | undefined>;
  getApplicationsByUser(userId: string): Promise<HomestayApplication[]>;
  getApplicationsByDistrict(district: string): Promise<HomestayApplication[]>;
  getApplicationsByStatus(status: string): Promise<HomestayApplication[]>;
  getAllApplications(): Promise<HomestayApplication[]>;
  createApplication(app: InsertHomestayApplication, options?: { trusted?: boolean }): Promise<HomestayApplication>;
  updateApplication(id: string, app: Partial<HomestayApplication>): Promise<HomestayApplication | undefined>;
  
  // Document methods
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocumentsByApplication(applicationId: string): Promise<Document[]>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<Payment>): Promise<Payment | undefined>;
  getPaymentsByApplication(applicationId: string): Promise<Payment[]>;
  
  // Production Stats methods
  saveProductionStats(stats: { totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; sourceUrl: string }): Promise<void>;
  getLatestProductionStats(): Promise<{ totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; scrapedAt: Date } | null>;
  
  // Dev methods
  getStats(): Promise<{ users: number; applications: number; documents: number; payments: number }>;
  clearAll(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private applications: Map<string, HomestayApplication>;
  private documents: Map<string, Document>;
  private payments: Map<string, Payment>;

  constructor() {
    this.users = new Map();
    this.applications = new Map();
    this.documents = new Map();
    this.payments = new Map();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.mobile === mobile,
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email || null,
      aadhaarNumber: insertUser.aadhaarNumber || null,
      district: insertUser.district || null,
      password: insertUser.password || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  // Homestay Application methods
  async getApplication(id: string): Promise<HomestayApplication | undefined> {
    return this.applications.get(id);
  }

  async getApplicationsByUser(userId: string): Promise<HomestayApplication[]> {
    return Array.from(this.applications.values()).filter(app => app.userId === userId);
  }

  async getApplicationsByDistrict(district: string): Promise<HomestayApplication[]> {
    // District officers should only see applications pending review
    return Array.from(this.applications.values()).filter(
      app => app.district === district && app.status === 'pending'
    );
  }

  async getApplicationsByStatus(status: string): Promise<HomestayApplication[]> {
    return Array.from(this.applications.values()).filter(app => app.status === status);
  }

  async getAllApplications(): Promise<HomestayApplication[]> {
    return Array.from(this.applications.values());
  }

  async createApplication(insertApp: InsertHomestayApplication, options?: { trusted?: boolean }): Promise<HomestayApplication> {
    const id = randomUUID();
    const now = new Date();
    const applicationNumber = `HP-HS-2025-${String(this.applications.size + 1).padStart(6, '0')}`;
    
    // Security: Only trusted server code (not client requests) can override status
    // Untrusted calls (from client) always get 'draft' status
    const isTrusted = options?.trusted === true;
    const status = isTrusted && insertApp.status ? insertApp.status : 'draft';
    const submittedAt = isTrusted && insertApp.submittedAt ? insertApp.submittedAt : (status === 'pending' ? now : null);
    const currentStage = status === 'pending' ? 'district' : null;
    
    const app: HomestayApplication = {
      ...insertApp,
      id,
      applicationNumber,
      latitude: insertApp.latitude || null,
      longitude: insertApp.longitude || null,
      ownerEmail: insertApp.ownerEmail || null,
      amenities: (insertApp.amenities || null) as any,
      rooms: (insertApp.rooms || null) as any,
      status,
      currentStage,
      districtOfficerId: null,
      districtReviewDate: null,
      districtNotes: null,
      stateOfficerId: null,
      stateReviewDate: null,
      stateNotes: null,
      rejectionReason: null,
      clarificationRequested: null,
      certificateNumber: null,
      certificateIssuedDate: null,
      certificateExpiryDate: null,
      submittedAt,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.applications.set(id, app);
    return app;
  }

  async updateApplication(id: string, update: Partial<HomestayApplication>): Promise<HomestayApplication | undefined> {
    const existing = this.applications.get(id);
    if (!existing) return undefined;
    
    const updated: HomestayApplication = {
      ...existing,
      ...update,
      updatedAt: new Date(),
    };
    
    this.applications.set(id, updated);
    return updated;
  }

  // Document methods
  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const now = new Date();
    
    const doc: Document = {
      ...insertDoc,
      id,
      uploadDate: now,
      aiVerificationStatus: insertDoc.aiVerificationStatus || null,
      aiConfidenceScore: insertDoc.aiConfidenceScore || null,
      aiNotes: insertDoc.aiNotes || null,
      isVerified: insertDoc.isVerified || false,
      verifiedBy: insertDoc.verifiedBy || null,
      verificationDate: insertDoc.verificationDate || null,
      verificationNotes: insertDoc.verificationNotes || null,
    };
    
    this.documents.set(id, doc);
    return doc;
  }

  async getDocumentsByApplication(applicationId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.applicationId === applicationId);
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const now = new Date();
    const receiptNumber = `REC-2025-${String(this.payments.size + 1).padStart(6, '0')}`;
    
    const payment: Payment = {
      ...insertPayment,
      id,
      gatewayTransactionId: insertPayment.gatewayTransactionId || null,
      paymentMethod: insertPayment.paymentMethod || null,
      paymentStatus: insertPayment.paymentStatus || 'pending',
      initiatedAt: now,
      completedAt: insertPayment.completedAt || null,
      receiptNumber,
      receiptUrl: insertPayment.receiptUrl || null,
    };
    
    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: string, update: Partial<Payment>): Promise<Payment | undefined> {
    const existing = this.payments.get(id);
    if (!existing) return undefined;
    
    const updated: Payment = {
      ...existing,
      ...update,
    };
    
    this.payments.set(id, updated);
    return updated;
  }

  async getPaymentsByApplication(applicationId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.applicationId === applicationId);
  }

  // Production Stats methods (stub for MemStorage - not used in production)
  async saveProductionStats(stats: { totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; sourceUrl: string }): Promise<void> {
    // No-op for MemStorage
  }

  async getLatestProductionStats(): Promise<{ totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; scrapedAt: Date } | null> {
    return null;
  }

  // Dev methods
  async getStats() {
    return {
      users: this.users.size,
      applications: this.applications.size,
      documents: this.documents.size,
      payments: this.payments.size,
    };
  }

  async clearAll() {
    this.users.clear();
    this.applications.clear();
    this.documents.clear();
    this.payments.clear();
  }
}

import { DbStorage } from './db-storage';

// Use DbStorage by default (PostgreSQL)
// Set USE_MEM_STORAGE=true to use in-memory storage (testing only)
export const storage: IStorage = process.env.USE_MEM_STORAGE === 'true' 
  ? new MemStorage() 
  : new DbStorage();
