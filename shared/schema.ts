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
  role: varchar("role", { length: 50 }).notNull().default('property_owner'), // 'property_owner', 'district_officer', 'state_officer', 'admin', 'dealing_assistant', 'district_tourism_officer', 'super_admin'
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).unique(),
  district: varchar("district", { length: 100 }),
  password: text("password"), // For demo/testing, in production would use proper auth
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users, {
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  email: z.string().email().optional().or(z.literal('')),
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  role: z.enum(['property_owner', 'district_officer', 'state_officer', 'admin', 'dealing_assistant', 'district_tourism_officer', 'super_admin']),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Invalid Aadhaar number").optional().or(z.literal('')),
  district: z.string().optional().or(z.literal('')),
  password: z.string().min(1, "Password is required"),
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });

export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Homestay Applications Table
export const homestayApplications = pgTable("homestay_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  applicationNumber: varchar("application_number", { length: 50 }).notNull().unique(),
  
  // Property Details (ANNEXURE-I)
  propertyName: varchar("property_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(), // 'diamond', 'gold', 'silver'
  locationType: varchar("location_type", { length: 10 }).notNull(), // 'mc', 'tcp', 'gp' - CRITICAL for fee calculation
  totalRooms: integer("total_rooms").notNull(),
  
  // LGD Hierarchical Address Fields
  district: varchar("district", { length: 100 }).notNull(),
  tehsil: varchar("tehsil", { length: 100 }).notNull(),
  
  // Rural Address (for GP - Gram Panchayat)
  block: varchar("block", { length: 100 }), // Mandatory for rural (gp)
  gramPanchayat: varchar("gram_panchayat", { length: 100 }), // Mandatory for rural (gp)
  
  // Urban Address (for MC/TCP)
  urbanBody: varchar("urban_body", { length: 200 }), // Name of MC/TCP/Nagar Panchayat - Mandatory for urban
  ward: varchar("ward", { length: 50 }), // Ward/Zone number - Mandatory for urban
  
  // Additional address details
  address: text("address").notNull(), // House/building number, street, locality
  pincode: varchar("pincode", { length: 10 }).notNull(),
  telephone: varchar("telephone", { length: 20 }),
  fax: varchar("fax", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  
  // Owner Details (ANNEXURE-I)
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  ownerMobile: varchar("owner_mobile", { length: 15 }).notNull(),
  ownerEmail: varchar("owner_email", { length: 255 }),
  ownerAadhaar: varchar("owner_aadhaar", { length: 12 }).notNull(),
  
  // Room & Category Details (ANNEXURE-I)
  proposedRoomRate: decimal("proposed_room_rate", { precision: 10, scale: 2 }).notNull(),
  projectType: varchar("project_type", { length: 20 }).notNull(), // 'new_rooms', 'new_project'
  propertyArea: decimal("property_area", { precision: 10, scale: 2 }).notNull(), // in sq meters
  singleBedRooms: integer("single_bed_rooms").default(0),
  singleBedRoomSize: decimal("single_bed_room_size", { precision: 10, scale: 2 }), // in sq ft
  doubleBedRooms: integer("double_bed_rooms").default(0),
  doubleBedRoomSize: decimal("double_bed_room_size", { precision: 10, scale: 2 }), // in sq ft
  familySuites: integer("family_suites").default(0),
  familySuiteSize: decimal("family_suite_size", { precision: 10, scale: 2 }), // in sq ft
  attachedWashrooms: integer("attached_washrooms").notNull(),
  gstin: varchar("gstin", { length: 15 }), // Mandatory for Diamond/Gold, optional for Silver
  
  // Distances from key locations (ANNEXURE-I) - in km
  distanceAirport: decimal("distance_airport", { precision: 10, scale: 2 }),
  distanceRailway: decimal("distance_railway", { precision: 10, scale: 2 }),
  distanceCityCenter: decimal("distance_city_center", { precision: 10, scale: 2 }),
  distanceShopping: decimal("distance_shopping", { precision: 10, scale: 2 }),
  distanceBusStand: decimal("distance_bus_stand", { precision: 10, scale: 2 }),
  
  // Public Areas (ANNEXURE-I) - in sq ft
  lobbyArea: decimal("lobby_area", { precision: 10, scale: 2 }),
  diningArea: decimal("dining_area", { precision: 10, scale: 2 }),
  parkingArea: text("parking_area"), // Description of parking facilities
  
  // Additional Facilities (ANNEXURE-I)
  ecoFriendlyFacilities: text("eco_friendly_facilities"),
  differentlyAbledFacilities: text("differently_abled_facilities"),
  fireEquipmentDetails: text("fire_equipment_details"),
  nearestHospital: varchar("nearest_hospital", { length: 255 }),
  
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
  status: varchar("status", { length: 50 }).default('draft'), // 'draft', 'submitted', 'document_verification', 'clarification_requested', 'site_inspection_scheduled', 'site_inspection_complete', 'payment_pending', 'approved', 'rejected'
  currentStage: varchar("current_stage", { length: 50 }), // 'document_upload', 'document_verification', 'site_inspection', 'payment', 'approved'
  currentPage: integer("current_page").default(1), // Track which page of the form user is on (1-6) for draft resume
  
  // Approval Details
  districtOfficerId: varchar("district_officer_id").references(() => users.id),
  districtReviewDate: timestamp("district_review_date"),
  districtNotes: text("district_notes"),
  
  stateOfficerId: varchar("state_officer_id").references(() => users.id),
  stateReviewDate: timestamp("state_review_date"),
  stateNotes: text("state_notes"),
  
  rejectionReason: text("rejection_reason"),
  clarificationRequested: text("clarification_requested"),
  
  // Site Inspection (2025 Rules)
  siteInspectionScheduledDate: timestamp("site_inspection_scheduled_date"),
  siteInspectionCompletedDate: timestamp("site_inspection_completed_date"),
  siteInspectionOfficerId: varchar("site_inspection_officer_id").references(() => users.id),
  siteInspectionNotes: text("site_inspection_notes"),
  siteInspectionOutcome: varchar("site_inspection_outcome", { length: 50 }), // 'approved', 'corrections_needed', 'rejected'
  siteInspectionFindings: jsonb("site_inspection_findings").$type<{
    roomCountVerified?: boolean;
    roomCountActual?: number;
    amenitiesVerified?: boolean;
    amenitiesIssues?: string;
    fireSafetyVerified?: boolean;
    fireSafetyIssues?: string;
    categoryRecommendation?: string;
    overallSatisfactory?: boolean;
    issuesFound?: string;
  }>(),
  
  // Legacy document columns (keeping for backward compatibility)
  ownershipProofUrl: text("ownership_proof_url"),
  aadhaarCardUrl: text("aadhaar_card_url"),
  panCardUrl: text("pan_card_url"),
  gstCertificateUrl: text("gst_certificate_url"),
  fireSafetyNocUrl: text("fire_safety_noc_url"),
  pollutionClearanceUrl: text("pollution_clearance_url"),
  buildingPlanUrl: text("building_plan_url"),
  propertyPhotosUrls: jsonb("property_photos_urls").$type<string[]>(),
  
  // New JSONB documents column for ANNEXURE-II documents
  documents: jsonb("documents").$type<Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    documentType: string;
    uploadedAt?: string;
  }>>(),
  
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
  locationType: z.enum(['mc', 'tcp', 'gp']),
  totalRooms: z.number().int().min(1).max(50),
  
  // LGD Hierarchical Address
  district: z.string().min(2, "District is required"),
  tehsil: z.string().min(2, "Tehsil is required"),
  block: z.string().optional().or(z.literal('')), // Required for GP, handled in form validation
  gramPanchayat: z.string().optional().or(z.literal('')), // Required for GP, handled in form validation
  urbanBody: z.string().optional().or(z.literal('')), // Required for MC/TCP, handled in form validation
  ward: z.string().optional().or(z.literal('')), // Required for MC/TCP, handled in form validation
  
  address: z.string().min(10, "Address must be at least 10 characters"),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Invalid pincode"),
  telephone: z.string().optional(),
  fax: z.string().optional(),
  ownerName: z.string().min(3),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/),
  ownerEmail: z.string().email().optional().or(z.literal('')),
  ownerAadhaar: z.string().regex(/^\d{12}$/),
  proposedRoomRate: z.number().min(100, "Room rate must be at least ₹100"),
  projectType: z.enum(['new_rooms', 'new_project']),
  propertyArea: z.number().min(1, "Property area required"),
  singleBedRooms: z.number().int().min(0).default(0),
  singleBedRoomSize: z.number().min(0).optional(),
  doubleBedRooms: z.number().int().min(0).default(0),
  doubleBedRoomSize: z.number().min(0).optional(),
  familySuites: z.number().int().min(0).max(3).default(0),
  familySuiteSize: z.number().min(0).optional(),
  attachedWashrooms: z.number().int().min(0),
  gstin: z.string().optional().or(z.literal('')),
  distanceAirport: z.number().min(0).optional(),
  distanceRailway: z.number().min(0).optional(),
  distanceCityCenter: z.number().min(0).optional(),
  distanceShopping: z.number().min(0).optional(),
  distanceBusStand: z.number().min(0).optional(),
  lobbyArea: z.number().min(0).optional(),
  diningArea: z.number().min(0).optional(),
  parkingArea: z.string().optional().or(z.literal('')),
  ecoFriendlyFacilities: z.string().optional().or(z.literal('')),
  differentlyAbledFacilities: z.string().optional().or(z.literal('')),
  fireEquipmentDetails: z.string().optional().or(z.literal('')),
  nearestHospital: z.string().optional().or(z.literal('')),
}).omit({ id: true, applicationNumber: true, createdAt: true, updatedAt: true });

// Draft Application Schema - Most fields optional for saving incomplete applications
export const draftHomestayApplicationSchema = createInsertSchema(homestayApplications, {
  propertyName: z.string().min(1).optional().or(z.literal('')),
  category: z.enum(['diamond', 'gold', 'silver']).optional(),
  locationType: z.enum(['mc', 'tcp', 'gp']).optional(),
  totalRooms: z.number().int().min(0).optional(),
  
  // LGD Hierarchical Address - All optional for drafts
  district: z.string().optional().or(z.literal('')),
  tehsil: z.string().optional().or(z.literal('')),
  block: z.string().optional().or(z.literal('')),
  gramPanchayat: z.string().optional().or(z.literal('')),
  urbanBody: z.string().optional().or(z.literal('')),
  ward: z.string().optional().or(z.literal('')),
  
  address: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')),
  telephone: z.string().optional().or(z.literal('')),
  fax: z.string().optional().or(z.literal('')),
  ownerName: z.string().optional().or(z.literal('')),
  ownerMobile: z.string().optional().or(z.literal('')),
  ownerEmail: z.string().optional().or(z.literal('')),
  ownerAadhaar: z.string().optional().or(z.literal('')),
  proposedRoomRate: z.number().optional(),
  projectType: z.enum(['new_rooms', 'new_project']).optional(),
  propertyArea: z.number().optional(),
  singleBedRooms: z.number().int().min(0).optional(),
  singleBedRoomSize: z.number().optional(),
  doubleBedRooms: z.number().int().min(0).optional(),
  doubleBedRoomSize: z.number().optional(),
  familySuites: z.number().int().optional(),
  familySuiteSize: z.number().optional(),
  attachedWashrooms: z.number().int().optional(),
  gstin: z.string().optional().or(z.literal('')),
  distanceAirport: z.number().optional(),
  distanceRailway: z.number().optional(),
  distanceCityCenter: z.number().optional(),
  distanceShopping: z.number().optional(),
  distanceBusStand: z.number().optional(),
  lobbyArea: z.number().optional(),
  diningArea: z.number().optional(),
  parkingArea: z.string().optional().or(z.literal('')),
  ecoFriendlyFacilities: z.string().optional().or(z.literal('')),
  differentlyAbledFacilities: z.string().optional().or(z.literal('')),
  fireEquipmentDetails: z.string().optional().or(z.literal('')),
  nearestHospital: z.string().optional().or(z.literal('')),
  baseFee: z.number().optional(),
  perRoomFee: z.number().optional(),
  gstAmount: z.number().optional(),
  totalFee: z.number().optional(),
}).omit({ id: true, applicationNumber: true, createdAt: true, updatedAt: true });

export const selectHomestayApplicationSchema = createSelectSchema(homestayApplications);
export type InsertHomestayApplication = z.infer<typeof insertHomestayApplicationSchema>;
export type DraftHomestayApplication = z.infer<typeof draftHomestayApplicationSchema>;
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
  verificationStatus: varchar("verification_status", { length: 50 }).default('pending'), // 'pending', 'verified', 'rejected', 'needs_correction'
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
  paymentGateway: varchar("payment_gateway", { length: 50 }), // 'himkosh', 'razorpay', 'ccavenue', 'payu', 'upi_qr'
  gatewayTransactionId: varchar("gateway_transaction_id", { length: 255 }).unique(),
  paymentMethod: varchar("payment_method", { length: 50 }), // 'upi', 'netbanking', 'card', 'wallet'
  paymentStatus: varchar("payment_status", { length: 50 }).default('pending'), // 'pending', 'success', 'failed', 'refunded'
  
  // Payment Link & QR Code (2025 Rules - payment after approval)
  paymentLink: text("payment_link"),
  qrCodeUrl: text("qr_code_url"),
  paymentLinkExpiryDate: timestamp("payment_link_expiry_date"),
  
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

// Application Action History Table
export const applicationActions = pgTable("application_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: 'cascade' }),
  officerId: varchar("officer_id").notNull().references(() => users.id),
  
  action: varchar("action", { length: 50 }).notNull(), // 'approved', 'rejected', 'sent_back_for_corrections', 'clarification_requested', 'site_inspection_scheduled', etc.
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  
  // Feedback and Comments
  feedback: text("feedback"), // Officer's comments explaining the action
  issuesFound: jsonb("issues_found").$type<Array<string>>(), // List of issues if sending back for corrections
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApplicationActionSchema = createInsertSchema(applicationActions, {
  action: z.enum(['approved', 'rejected', 'sent_back_for_corrections', 'clarification_requested', 'site_inspection_scheduled', 'document_verified', 'payment_verified']),
  feedback: z.string().min(10, "Feedback must be at least 10 characters"),
}).omit({ id: true, createdAt: true });

export const selectApplicationActionSchema = createSelectSchema(applicationActions);
export type InsertApplicationAction = z.infer<typeof insertApplicationActionSchema>;
export type ApplicationAction = typeof applicationActions.$inferSelect;

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

// Production Statistics Table (scraped from production portal)
export const productionStats = pgTable("production_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalApplications: integer("total_applications").notNull(),
  approvedApplications: integer("approved_applications").notNull(),
  rejectedApplications: integer("rejected_applications").notNull(),
  pendingApplications: integer("pending_applications").notNull(),
  scrapedAt: timestamp("scraped_at").defaultNow(),
  sourceUrl: text("source_url"),
});

export const insertProductionStatsSchema = createInsertSchema(productionStats).omit({ id: true, scrapedAt: true });
export const selectProductionStatsSchema = createSelectSchema(productionStats);
export type InsertProductionStats = z.infer<typeof insertProductionStatsSchema>;
export type ProductionStats = typeof productionStats.$inferSelect;

// HimKosh Transactions Table (Cyber Treasury Portal Integration)
export const himkoshTransactions = pgTable("himkosh_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id),
  
  // Departmental Reference (our side)
  deptRefNo: varchar("dept_ref_no", { length: 45 }).notNull(), // Application number
  appRefNo: varchar("app_ref_no", { length: 20 }).notNull().unique(), // Our unique transaction ID
  
  // Payment Details
  totalAmount: integer("total_amount").notNull(), // In rupees (no decimals as per CTP spec)
  tenderBy: varchar("tender_by", { length: 70 }).notNull(), // Applicant name
  
  // CTP Configuration (from environment/config)
  merchantCode: varchar("merchant_code", { length: 15 }), // e.g., HIMKOSH230
  deptId: varchar("dept_id", { length: 10 }), // Department code (e.g., CTO00-068)
  serviceCode: varchar("service_code", { length: 5 }), // Service code (e.g., TSM)
  ddo: varchar("ddo", { length: 12 }), // DDO code (e.g., SML00-532)
  
  // Head of Account Details
  head1: varchar("head1", { length: 14 }), // Mandatory head
  amount1: integer("amount1"), // Amount for head1
  head2: varchar("head2", { length: 14 }),
  amount2: integer("amount2"),
  head3: varchar("head3", { length: 14 }),
  amount3: integer("amount3"),
  head4: varchar("head4", { length: 14 }),
  amount4: integer("amount4"),
  head10: varchar("head10", { length: 50 }), // Bank account for non-govt charges (IFSC-AccountNo)
  amount10: integer("amount10"), // Non-govt charges amount
  
  // Period
  periodFrom: varchar("period_from", { length: 10 }), // MM-DD-YYYY
  periodTo: varchar("period_to", { length: 10 }), // MM-DD-YYYY
  
  // Request/Response Tracking
  encryptedRequest: text("encrypted_request"), // Stored for audit
  requestChecksum: varchar("request_checksum", { length: 32 }), // MD5 checksum
  
  // Response from CTP (after payment)
  echTxnId: varchar("ech_txn_id", { length: 10 }).unique(), // HIMGRN number from CTP
  bankCIN: varchar("bank_cin", { length: 20 }), // Bank transaction number
  bankName: varchar("bank_name", { length: 10 }), // SBI, PNB, SBP
  paymentDate: varchar("payment_date", { length: 14 }), // DDMMYYYYHHMMSS
  status: varchar("status", { length: 70 }), // Status message from bank
  statusCd: varchar("status_cd", { length: 1 }), // 1=Success, 0=Failure
  responseChecksum: varchar("response_checksum", { length: 32 }), // MD5 checksum of response
  
  // Double Verification
  isDoubleVerified: boolean("is_double_verified").default(false),
  doubleVerificationDate: timestamp("double_verification_date"),
  doubleVerificationData: jsonb("double_verification_data"),
  
  // Challan Details
  challanPrintUrl: text("challan_print_url"), // URL to print challan from CTP
  
  // Transaction Status
  transactionStatus: varchar("transaction_status", { length: 50 }).default('initiated'), // 'initiated', 'redirected', 'success', 'failed', 'verified'
  
  // Timestamps
  initiatedAt: timestamp("initiated_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHimkoshTransactionSchema = createInsertSchema(himkoshTransactions, {
  deptRefNo: z.string().min(1),
  appRefNo: z.string().min(1),
  totalAmount: z.number().int().min(1),
  tenderBy: z.string().min(3),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectHimkoshTransactionSchema = createSelectSchema(himkoshTransactions);
export type InsertHimkoshTransaction = z.infer<typeof insertHimkoshTransactionSchema>;
export type HimkoshTransaction = typeof himkoshTransactions.$inferSelect;

// DDO Codes Table (Drawing & Disbursing Officer codes by district)
export const ddoCodes = pgTable("ddo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  district: varchar("district", { length: 100 }).notNull().unique(),
  ddoCode: varchar("ddo_code", { length: 20 }).notNull(),
  ddoDescription: text("ddo_description").notNull(),
  treasuryCode: varchar("treasury_code", { length: 10 }).notNull(), // e.g., CHM00, KLU00, SML00
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDdoCodeSchema = createInsertSchema(ddoCodes, {
  district: z.string().min(2),
  ddoCode: z.string().min(3),
  ddoDescription: z.string().min(3),
  treasuryCode: z.string().min(3),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectDdoCodeSchema = createSelectSchema(ddoCodes);
export type InsertDdoCode = z.infer<typeof insertDdoCodeSchema>;
export type DdoCode = typeof ddoCodes.$inferSelect;

// ====================================================================
// PRD v2.0 - Multi-Role Workflow Tables
// ====================================================================

// Inspection Orders Table (DTDO schedules inspection, assigns to DA)
export const inspectionOrders = pgTable("inspection_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: 'cascade' }),
  
  // Scheduled by DTDO
  scheduledBy: varchar("scheduled_by").notNull().references(() => users.id), // DTDO user ID
  scheduledDate: timestamp("scheduled_date").notNull(),
  
  // Assigned to DA
  assignedTo: varchar("assigned_to").notNull().references(() => users.id), // DA user ID
  assignedDate: timestamp("assigned_date").notNull(),
  
  // Inspection Details
  inspectionDate: timestamp("inspection_date").notNull(), // Scheduled date for inspection
  inspectionAddress: text("inspection_address").notNull(),
  specialInstructions: text("special_instructions"), // DTDO's instructions to DA
  
  // Status
  status: varchar("status", { length: 50 }).default('scheduled'), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  
  // DTDO Notes
  dtdoNotes: text("dtdo_notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInspectionOrderSchema = createInsertSchema(inspectionOrders, {
  inspectionDate: z.date().or(z.string()),
  inspectionAddress: z.string().min(10, "Address must be at least 10 characters"),
  specialInstructions: z.string().optional().or(z.literal('')),
  dtdoNotes: z.string().optional().or(z.literal('')),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectInspectionOrderSchema = createSelectSchema(inspectionOrders);
export type InsertInspectionOrder = z.infer<typeof insertInspectionOrderSchema>;
export type InspectionOrder = typeof inspectionOrders.$inferSelect;

// Inspection Reports Table (DA submits after completing inspection)
export const inspectionReports = pgTable("inspection_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionOrderId: varchar("inspection_order_id").notNull().references(() => inspectionOrders.id, { onDelete: 'cascade' }),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: 'cascade' }),
  
  // Submitted by DA
  submittedBy: varchar("submitted_by").notNull().references(() => users.id), // DA user ID
  submittedDate: timestamp("submitted_date").notNull(),
  
  // Inspection Findings
  actualInspectionDate: timestamp("actual_inspection_date").notNull(),
  roomCountVerified: boolean("room_count_verified").notNull(),
  actualRoomCount: integer("actual_room_count"),
  
  // Category Verification
  categoryMeetsStandards: boolean("category_meets_standards").notNull(),
  recommendedCategory: varchar("recommended_category", { length: 20 }), // 'diamond', 'gold', 'silver'
  
  // Amenities Verification
  amenitiesVerified: jsonb("amenities_verified").$type<{
    wifi?: boolean;
    parking?: boolean;
    ac?: boolean;
    hotWater?: boolean;
    restaurant?: boolean;
    [key: string]: boolean | undefined;
  }>(),
  amenitiesIssues: text("amenities_issues"),
  
  // Safety & Compliance
  fireSafetyCompliant: boolean("fire_safety_compliant").notNull(),
  fireSafetyIssues: text("fire_safety_issues"),
  structuralSafety: boolean("structural_safety").notNull(),
  structuralIssues: text("structural_issues"),
  
  // Overall Assessment
  overallSatisfactory: boolean("overall_satisfactory").notNull(),
  recommendation: varchar("recommendation", { length: 50 }).notNull(), // 'approve', 'approve_with_conditions', 'raise_objections', 'reject'
  detailedFindings: text("detailed_findings").notNull(),
  
  // Supporting Documents (Photos from inspection)
  inspectionPhotos: jsonb("inspection_photos").$type<Array<{
    fileName: string;
    fileUrl: string;
    caption?: string;
    uploadedAt: string;
  }>>(),
  
  // Report Document (PDF uploaded by DA)
  reportDocumentUrl: text("report_document_url"), // PDF of official inspection report
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInspectionReportSchema = createInsertSchema(inspectionReports, {
  actualInspectionDate: z.date().or(z.string()),
  roomCountVerified: z.boolean(),
  actualRoomCount: z.number().int().min(0).optional(),
  categoryMeetsStandards: z.boolean(),
  recommendedCategory: z.enum(['diamond', 'gold', 'silver']).optional().or(z.literal('')),
  fireSafetyCompliant: z.boolean(),
  structuralSafety: z.boolean(),
  overallSatisfactory: z.boolean(),
  recommendation: z.enum(['approve', 'approve_with_conditions', 'raise_objections', 'reject']),
  detailedFindings: z.string().min(20, "Detailed findings must be at least 20 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectInspectionReportSchema = createSelectSchema(inspectionReports);
export type InsertInspectionReport = z.infer<typeof insertInspectionReportSchema>;
export type InspectionReport = typeof inspectionReports.$inferSelect;

// Objections Table (DTDO raises objections after reviewing inspection report)
export const objections = pgTable("objections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: 'cascade' }),
  inspectionReportId: varchar("inspection_report_id").references(() => inspectionReports.id),
  
  // Raised by DTDO
  raisedBy: varchar("raised_by").notNull().references(() => users.id), // DTDO user ID
  raisedDate: timestamp("raised_date").notNull(),
  
  // Objection Details
  objectionType: varchar("objection_type", { length: 50 }).notNull(), // 'document_incomplete', 'category_mismatch', 'safety_violation', 'amenity_mismatch', 'structural_issue', 'other'
  objectionTitle: varchar("objection_title", { length: 255 }).notNull(),
  objectionDescription: text("objection_description").notNull(),
  
  // Severity
  severity: varchar("severity", { length: 20 }).notNull(), // 'minor', 'major', 'critical'
  
  // Resolution Timeline
  responseDeadline: timestamp("response_deadline"), // Deadline for applicant to respond
  
  // Status
  status: varchar("status", { length: 50 }).default('pending'), // 'pending', 'responded', 'resolved', 'escalated'
  
  // Resolution
  resolutionNotes: text("resolution_notes"),
  resolvedBy: varchar("resolved_by").references(() => users.id), // DTDO user ID
  resolvedDate: timestamp("resolved_date"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertObjectionSchema = createInsertSchema(objections, {
  objectionType: z.enum(['document_incomplete', 'category_mismatch', 'safety_violation', 'amenity_mismatch', 'structural_issue', 'other']),
  objectionTitle: z.string().min(5, "Title must be at least 5 characters"),
  objectionDescription: z.string().min(20, "Description must be at least 20 characters"),
  severity: z.enum(['minor', 'major', 'critical']),
  responseDeadline: z.date().or(z.string()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectObjectionSchema = createSelectSchema(objections);
export type InsertObjection = z.infer<typeof insertObjectionSchema>;
export type Objection = typeof objections.$inferSelect;

// Clarifications Table (Applicant responses to objections)
export const clarifications = pgTable("clarifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectionId: varchar("objection_id").notNull().references(() => objections.id, { onDelete: 'cascade' }),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: 'cascade' }),
  
  // Submitted by Property Owner
  submittedBy: varchar("submitted_by").notNull().references(() => users.id), // Property owner user ID
  submittedDate: timestamp("submitted_date").notNull(),
  
  // Clarification Details
  clarificationText: text("clarification_text").notNull(),
  
  // Supporting Documents
  supportingDocuments: jsonb("supporting_documents").$type<Array<{
    fileName: string;
    fileUrl: string;
    documentType: string;
    uploadedAt: string;
  }>>(),
  
  // Review by DTDO
  reviewedBy: varchar("reviewed_by").references(() => users.id), // DTDO user ID
  reviewedDate: timestamp("reviewed_date"),
  reviewStatus: varchar("review_status", { length: 50 }), // 'accepted', 'rejected', 'needs_revision'
  reviewNotes: text("review_notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClarificationSchema = createInsertSchema(clarifications, {
  clarificationText: z.string().min(20, "Clarification must be at least 20 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectClarificationSchema = createSelectSchema(clarifications);
export type InsertClarification = z.infer<typeof insertClarificationSchema>;
export type Clarification = typeof clarifications.$inferSelect;

// Certificates Table (Auto-generated after successful payment)
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: 'cascade' }).unique(),
  
  // Certificate Details
  certificateNumber: varchar("certificate_number", { length: 50 }).notNull().unique(), // e.g., HP/HST/2025/KLU/001
  certificateType: varchar("certificate_type", { length: 50 }).default('homestay_registration'), // Future: renewal, amendment
  
  // Validity
  issuedDate: timestamp("issued_date").notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUpto: timestamp("valid_upto").notNull(), // 3 years from issue date
  
  // Property Details (snapshot at time of issue)
  propertyName: varchar("property_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(), // 'diamond', 'gold', 'silver'
  address: text("address").notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  
  // Owner Details (snapshot)
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  ownerMobile: varchar("owner_mobile", { length: 15 }).notNull(),
  
  // Certificate Document
  certificatePdfUrl: text("certificate_pdf_url"), // URL to generated PDF
  qrCodeData: text("qr_code_data"), // QR code for verification (contains certificate number + validation URL)
  
  // Digital Signature
  digitalSignature: text("digital_signature"), // Future: Digital signature of issuing officer
  issuedBy: varchar("issued_by").references(() => users.id), // System admin or auto-generated
  
  // Status
  status: varchar("status", { length: 50 }).default('active'), // 'active', 'expired', 'revoked', 'suspended'
  revocationReason: text("revocation_reason"),
  revokedBy: varchar("revoked_by").references(() => users.id),
  revokedDate: timestamp("revoked_date"),
  
  // Renewal Tracking
  renewalReminderSent: boolean("renewal_reminder_sent").default(false),
  renewalApplicationId: varchar("renewal_application_id").references(() => homestayApplications.id), // Link to renewal application
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCertificateSchema = createInsertSchema(certificates, {
  certificateNumber: z.string().min(5),
  issuedDate: z.date().or(z.string()),
  validFrom: z.date().or(z.string()),
  validUpto: z.date().or(z.string()),
  propertyName: z.string().min(3),
  category: z.enum(['diamond', 'gold', 'silver']),
  address: z.string().min(10),
  district: z.string().min(2),
  ownerName: z.string().min(3),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectCertificateSchema = createSelectSchema(certificates);
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;
