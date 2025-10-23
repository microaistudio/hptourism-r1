import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users Table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mobile: varchar("mobile", { length: 15 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  fullName: text("full_name").notNull(),
  role: varchar("role", { length: 50 }).notNull().default('owner'), // 'owner', 'district_officer', 'state_officer', 'admin'
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).unique(),
  district: varchar("district", { length: 100 }),
  password: text("password"), // For demo/testing, in production would use proper auth
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  email: z.string().email().optional(),
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  role: z.enum(['owner', 'district_officer', 'state_officer', 'admin']),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Invalid Aadhaar number").optional(),
  district: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Homestay Applications Table
export const homestayApplications = pgTable("homestay_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  applicationNumber: varchar("application_number", { length: 50 }).notNull().unique(),
  
  // Property Details
  propertyName: varchar("property_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(), // 'diamond', 'gold', 'silver'
  totalRooms: integer("total_rooms").notNull(),
  address: text("address").notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Owner Details
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  ownerMobile: varchar("owner_mobile", { length: 15 }).notNull(),
  ownerEmail: varchar("owner_email", { length: 255 }),
  ownerAadhaar: varchar("owner_aadhaar", { length: 12 }).notNull(),
  
  // Amenities and Room Details (JSONB for flexibility)
  amenities: jsonb("amenities").$type<{
    ac?: boolean;
    wifi?: boolean;
    parking?: boolean;
    restaurant?: boolean;
    hotWater?: boolean;
    tv?: boolean;
    laundry?: boolean;
    roomService?: boolean;
    garden?: boolean;
    mountainView?: boolean;
    petFriendly?: boolean;
  }>(),
  rooms: jsonb("rooms").$type<Array<{
    roomType: string;
    size: number;
    count: number;
  }>>(),
  
  // Fee Calculation
  baseFee: decimal("base_fee", { precision: 10, scale: 2 }).notNull(),
  perRoomFee: decimal("per_room_fee", { precision: 10, scale: 2 }).notNull(),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).notNull(),
  totalFee: decimal("total_fee", { precision: 10, scale: 2 }).notNull(),
  
  // Workflow
  status: varchar("status", { length: 50 }).default('draft'), // 'draft', 'submitted', 'district_review', 'state_review', 'approved', 'rejected', 'clarification_requested'
  currentStage: varchar("current_stage", { length: 50 }), // 'district', 'state', 'final'
  
  // Approval Details
  districtOfficerId: varchar("district_officer_id").references(() => users.id),
  districtReviewDate: timestamp("district_review_date"),
  districtNotes: text("district_notes"),
  
  stateOfficerId: varchar("state_officer_id").references(() => users.id),
  stateReviewDate: timestamp("state_review_date"),
  stateNotes: text("state_notes"),
  
  rejectionReason: text("rejection_reason"),
  clarificationRequested: text("clarification_requested"),
  
  // Certificate
  certificateNumber: varchar("certificate_number", { length: 50 }).unique(),
  certificateIssuedDate: timestamp("certificate_issued_date"),
  certificateExpiryDate: timestamp("certificate_expiry_date"),
  
  // Timestamps
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHomestayApplicationSchema = createInsertSchema(homestayApplications, {
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  category: z.enum(['diamond', 'gold', 'silver']),
  totalRooms: z.number().int().min(1).max(50),
  address: z.string().min(10, "Address must be at least 10 characters"),
  district: z.string().min(2),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Invalid pincode"),
  ownerName: z.string().min(3),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/),
  ownerAadhaar: z.string().regex(/^\d{12}$/),
}).omit({ id: true, applicationNumber: true, createdAt: true, updatedAt: true });

export const selectHomestayApplicationSchema = createSelectSchema(homestayApplications);
export type InsertHomestayApplication = z.infer<typeof insertHomestayApplicationSchema>;
export type HomestayApplication = typeof homestayApplications.$inferSelect;

// Documents Table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: 'cascade' }),
  documentType: varchar("document_type", { length: 100 }).notNull(), // 'property_photo', 'ownership_proof', 'fire_noc', etc.
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  uploadDate: timestamp("upload_date").defaultNow(),
  
  // AI Verification (for future)
  aiVerificationStatus: varchar("ai_verification_status", { length: 50 }), // 'pending', 'verified', 'flagged'
  aiConfidenceScore: decimal("ai_confidence_score", { precision: 5, scale: 2 }),
  aiNotes: text("ai_notes"),
  
  // Officer Verification
  isVerified: boolean("is_verified").default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verificationDate: timestamp("verification_date"),
  verificationNotes: text("verification_notes"),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadDate: true });
export const selectDocumentSchema = createSelectSchema(documents);
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Payments Table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id),
  paymentType: varchar("payment_type", { length: 50 }).notNull(), // 'registration', 'renewal', 'late_fee'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment Gateway
  gatewayTransactionId: varchar("gateway_transaction_id", { length: 255 }).unique(),
  paymentMethod: varchar("payment_method", { length: 50 }), // 'upi', 'netbanking', 'card', 'wallet'
  paymentStatus: varchar("payment_status", { length: 50 }).default('pending'), // 'pending', 'success', 'failed', 'refunded'
  
  // Timestamps
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  
  // Receipt
  receiptNumber: varchar("receipt_number", { length: 100 }).unique(),
  receiptUrl: text("receipt_url"),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, initiatedAt: true });
export const selectPaymentSchema = createSelectSchema(payments);
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Notifications Table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  applicationId: varchar("application_id").references(() => homestayApplications.id),
  
  type: varchar("type", { length: 100 }).notNull(), // 'status_change', 'sla_breach', 'renewal_reminder', etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Delivery Channels
  channels: jsonb("channels").$type<{
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
    inapp?: boolean;
  }>(),
  
  // Status
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const selectNotificationSchema = createSelectSchema(notifications);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Reviews Table (for Discovery Platform)
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  rating: integer("rating").notNull(), // 1-5
  reviewText: text("review_text"),
  
  // Verification
  isVerifiedStay: boolean("is_verified_stay").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(10, "Review must be at least 10 characters").optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectReviewSchema = createSelectSchema(reviews);
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
