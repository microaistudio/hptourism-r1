import { eq, and, desc } from 'drizzle-orm';
import { db } from './db';
import {
  users, homestayApplications, documents, payments, productionStats, notifications, applicationActions,
  type User, type InsertUser,
  type HomestayApplication, type InsertHomestayApplication,
  type Document, type InsertDocument,
  type Payment, type InsertPayment,
  type Notification, type InsertNotification,
  type ApplicationAction, type InsertApplicationAction
} from '../shared/schema';
import type { IStorage } from './storage';

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
    // Password should already be hashed by the caller (routes.ts)
    // Do NOT hash here to avoid double-hashing
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
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

  async getPaymentById(id: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments)
      .where(eq(payments.id, id))
      .limit(1);
    return result[0];
  }

  async getPaymentsByApplication(applicationId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.applicationId, applicationId))
      .orderBy(desc(payments.initiatedAt));
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values([notification]).returning();
    return result[0];
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  // Application Action methods
  async createApplicationAction(action: InsertApplicationAction): Promise<ApplicationAction> {
    const result = await db.insert(applicationActions).values([action]).returning();
    return result[0];
  }

  async getApplicationActions(applicationId: string): Promise<ApplicationAction[]> {
    return await db.select().from(applicationActions)
      .where(eq(applicationActions.applicationId, applicationId))
      .orderBy(applicationActions.createdAt);
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
    await db.delete(applicationActions);
    await db.delete(notifications);
    await db.delete(payments);
    await db.delete(documents);
    await db.delete(homestayApplications);
    await db.delete(users);
  }

  // Production Stats methods
  async saveProductionStats(stats: { totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; sourceUrl: string }): Promise<void> {
    await db.insert(productionStats).values(stats);
  }

  async getLatestProductionStats(): Promise<{ totalApplications: number; approvedApplications: number; rejectedApplications: number; pendingApplications: number; scrapedAt: Date } | null> {
    const result = await db.select().from(productionStats)
      .orderBy(desc(productionStats.scrapedAt))
      .limit(1);
    
    if (!result[0]) return null;
    
    return {
      totalApplications: result[0].totalApplications,
      approvedApplications: result[0].approvedApplications,
      rejectedApplications: result[0].rejectedApplications,
      pendingApplications: result[0].pendingApplications,
      scrapedAt: result[0].scrapedAt || new Date()
    };
  }
}
