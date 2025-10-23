import { eq, and, desc } from 'drizzle-orm';
import { db } from './db';
import {
  users, homestayApplications, documents, payments,
  type User, type InsertUser,
  type HomestayApplication, type InsertHomestayApplication,
  type Document, type InsertDocument,
  type Payment, type InsertPayment
} from '../shared/schema';
import type { IStorage } from './storage';
import bcrypt from 'bcrypt';

export class DbStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.mobile, mobile)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const userWithHashedPassword = { ...insertUser, password: hashedPassword };
    
    const result = await db.insert(users).values(userWithHashedPassword).returning();
    return result[0];
  }

  // Homestay Application methods
  async getApplication(id: string): Promise<HomestayApplication | undefined> {
    const result = await db.select().from(homestayApplications).where(eq(homestayApplications.id, id)).limit(1);
    return result[0];
  }

  async getApplicationsByUser(userId: string): Promise<HomestayApplication[]> {
    return await db.select().from(homestayApplications)
      .where(eq(homestayApplications.userId, userId))
      .orderBy(desc(homestayApplications.createdAt));
  }

  async getApplicationsByDistrict(district: string): Promise<HomestayApplication[]> {
    return await db.select().from(homestayApplications)
      .where(
        and(
          eq(homestayApplications.district, district),
          eq(homestayApplications.status, 'pending')
        )
      )
      .orderBy(desc(homestayApplications.createdAt));
  }

  async getApplicationsByStatus(status: string): Promise<HomestayApplication[]> {
    return await db.select().from(homestayApplications)
      .where(eq(homestayApplications.status, status))
      .orderBy(desc(homestayApplications.createdAt));
  }

  async getAllApplications(): Promise<HomestayApplication[]> {
    return await db.select().from(homestayApplications)
      .orderBy(desc(homestayApplications.createdAt));
  }

  async createApplication(insertApp: InsertHomestayApplication, options?: { trusted?: boolean }): Promise<HomestayApplication> {
    // Generate application number
    const allApps = await this.getAllApplications();
    const applicationNumber = `HP-HS-2025-${String(allApps.length + 1).padStart(6, '0')}`;
    
    // Security: Only trusted server code can override status
    const status = options?.trusted ? (insertApp.status || 'draft') : 'draft';
    
    const appToInsert: any = {
      ...insertApp,
      applicationNumber,
      status,
    };
    
    const result = await db.insert(homestayApplications).values([appToInsert]).returning();
    return result[0];
  }

  async updateApplication(id: string, updates: Partial<HomestayApplication>): Promise<HomestayApplication | undefined> {
    const result = await db.update(homestayApplications)
      .set(updates)
      .where(eq(homestayApplications.id, id))
      .returning();
    return result[0];
  }

  // Document methods
  async createDocument(doc: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(doc).returning();
    return result[0];
  }

  async getDocumentsByApplication(applicationId: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.applicationId, applicationId))
      .orderBy(desc(documents.uploadDate));
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const result = await db.update(payments)
      .set(updates)
      .where(eq(payments.id, id))
      .returning();
    return result[0];
  }

  async getPaymentsByApplication(applicationId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.applicationId, applicationId))
      .orderBy(desc(payments.initiatedAt));
  }

  // Dev methods
  async getStats() {
    const { sql, count } = await import('drizzle-orm');
    
    const [usersCount, appsCount, docsCount, paymentsCount] = await Promise.all([
      db.select({ count: count() }).from(users).then(rows => rows[0]?.count || 0),
      db.select({ count: count() }).from(homestayApplications).then(rows => rows[0]?.count || 0),
      db.select({ count: count() }).from(documents).then(rows => rows[0]?.count || 0),
      db.select({ count: count() }).from(payments).then(rows => rows[0]?.count || 0),
    ]);
    
    return {
      users: Number(usersCount),
      applications: Number(appsCount),
      documents: Number(docsCount),
      payments: Number(paymentsCount),
    };
  }

  async clearAll(): Promise<void> {
    // Delete in reverse order of dependencies
    await db.delete(payments);
    await db.delete(documents);
    await db.delete(homestayApplications);
    await db.delete(users);
  }
}
