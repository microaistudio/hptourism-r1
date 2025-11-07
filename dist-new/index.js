var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/db.ts
import ws from "ws";
import { Pool as PgPool } from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  applicationActions: () => applicationActions,
  auditLogs: () => auditLogs,
  certificates: () => certificates,
  clarifications: () => clarifications,
  ddoCodes: () => ddoCodes,
  documents: () => documents,
  draftHomestayApplicationSchema: () => draftHomestayApplicationSchema,
  himkoshTransactions: () => himkoshTransactions,
  homestayApplications: () => homestayApplications,
  insertApplicationActionSchema: () => insertApplicationActionSchema,
  insertAuditLogSchema: () => insertAuditLogSchema,
  insertCertificateSchema: () => insertCertificateSchema,
  insertClarificationSchema: () => insertClarificationSchema,
  insertDdoCodeSchema: () => insertDdoCodeSchema,
  insertDocumentSchema: () => insertDocumentSchema,
  insertHimkoshTransactionSchema: () => insertHimkoshTransactionSchema,
  insertHomestayApplicationSchema: () => insertHomestayApplicationSchema,
  insertInspectionOrderSchema: () => insertInspectionOrderSchema,
  insertInspectionReportSchema: () => insertInspectionReportSchema,
  insertLgdBlockSchema: () => insertLgdBlockSchema,
  insertLgdDistrictSchema: () => insertLgdDistrictSchema,
  insertLgdGramPanchayatSchema: () => insertLgdGramPanchayatSchema,
  insertLgdTehsilSchema: () => insertLgdTehsilSchema,
  insertLgdUrbanBodySchema: () => insertLgdUrbanBodySchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertObjectionSchema: () => insertObjectionSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertProductionStatsSchema: () => insertProductionStatsSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertSystemSettingSchema: () => insertSystemSettingSchema,
  insertUserProfileSchema: () => insertUserProfileSchema,
  insertUserSchema: () => insertUserSchema,
  inspectionOrders: () => inspectionOrders,
  inspectionReports: () => inspectionReports,
  lgdBlocks: () => lgdBlocks,
  lgdDistricts: () => lgdDistricts,
  lgdGramPanchayats: () => lgdGramPanchayats,
  lgdTehsils: () => lgdTehsils,
  lgdUrbanBodies: () => lgdUrbanBodies,
  notifications: () => notifications,
  objections: () => objections,
  payments: () => payments,
  productionStats: () => productionStats,
  reviews: () => reviews,
  selectApplicationActionSchema: () => selectApplicationActionSchema,
  selectAuditLogSchema: () => selectAuditLogSchema,
  selectCertificateSchema: () => selectCertificateSchema,
  selectClarificationSchema: () => selectClarificationSchema,
  selectDdoCodeSchema: () => selectDdoCodeSchema,
  selectDocumentSchema: () => selectDocumentSchema,
  selectHimkoshTransactionSchema: () => selectHimkoshTransactionSchema,
  selectHomestayApplicationSchema: () => selectHomestayApplicationSchema,
  selectInspectionOrderSchema: () => selectInspectionOrderSchema,
  selectInspectionReportSchema: () => selectInspectionReportSchema,
  selectLgdBlockSchema: () => selectLgdBlockSchema,
  selectLgdDistrictSchema: () => selectLgdDistrictSchema,
  selectLgdGramPanchayatSchema: () => selectLgdGramPanchayatSchema,
  selectLgdTehsilSchema: () => selectLgdTehsilSchema,
  selectLgdUrbanBodySchema: () => selectLgdUrbanBodySchema,
  selectNotificationSchema: () => selectNotificationSchema,
  selectObjectionSchema: () => selectObjectionSchema,
  selectPaymentSchema: () => selectPaymentSchema,
  selectProductionStatsSchema: () => selectProductionStatsSchema,
  selectReviewSchema: () => selectReviewSchema,
  selectSystemSettingSchema: () => selectSystemSettingSchema,
  selectUserProfileSchema: () => selectUserProfileSchema,
  selectUserSchema: () => selectUserSchema,
  systemSettings: () => systemSettings,
  userProfiles: () => userProfiles,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mobile: varchar("mobile", { length: 15 }).notNull().unique(),
  // Name fields (fullName kept for backward compatibility, firstName/lastName for staff)
  fullName: text("full_name").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  username: varchar("username", { length: 50 }),
  // Contact Information
  email: varchar("email", { length: 255 }),
  alternatePhone: varchar("alternate_phone", { length: 15 }),
  // Official Information (for staff users)
  designation: varchar("designation", { length: 100 }),
  // Job title/position
  department: varchar("department", { length: 100 }),
  employeeId: varchar("employee_id", { length: 50 }),
  officeAddress: text("office_address"),
  officePhone: varchar("office_phone", { length: 15 }),
  // System fields
  role: varchar("role", { length: 50 }).notNull().default("property_owner"),
  // 'property_owner', 'district_officer', 'state_officer', 'admin', 'dealing_assistant', 'district_tourism_officer', 'super_admin'
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }).unique(),
  district: varchar("district", { length: 100 }),
  password: text("password"),
  // For demo/testing, in production would use proper auth
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users, {
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  email: z.string().email().optional().or(z.literal("")),
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  firstName: z.string().min(1).optional().or(z.literal("")),
  lastName: z.string().min(1).optional().or(z.literal("")),
  username: z.string().min(3).optional().or(z.literal("")),
  alternatePhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number").optional().or(z.literal("")),
  designation: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  employeeId: z.string().optional().or(z.literal("")),
  officeAddress: z.string().optional().or(z.literal("")),
  officePhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number").optional().or(z.literal("")),
  role: z.enum(["property_owner", "district_officer", "state_officer", "admin", "dealing_assistant", "district_tourism_officer", "super_admin"]),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Invalid Aadhaar number").optional().or(z.literal("")),
  district: z.string().optional().or(z.literal("")),
  password: z.string().min(1, "Password is required")
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });
var selectUserSchema = createSelectSchema(users);
var userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // Personal Details
  fullName: varchar("full_name", { length: 255 }).notNull(),
  gender: varchar("gender", { length: 10 }).notNull(),
  // 'male', 'female', 'other'
  aadhaarNumber: varchar("aadhaar_number", { length: 12 }),
  mobile: varchar("mobile", { length: 15 }).notNull(),
  email: varchar("email", { length: 255 }),
  // Address Details (LGD Hierarchical)
  district: varchar("district", { length: 100 }),
  tehsil: varchar("tehsil", { length: 100 }),
  block: varchar("block", { length: 100 }),
  // For rural (GP) areas
  gramPanchayat: varchar("gram_panchayat", { length: 100 }),
  // For rural (GP) areas
  urbanBody: varchar("urban_body", { length: 200 }),
  // For urban (MC/TCP) areas
  ward: varchar("ward", { length: 50 }),
  // For urban (MC/TCP) areas
  address: text("address"),
  pincode: varchar("pincode", { length: 10 }),
  telephone: varchar("telephone", { length: 20 }),
  fax: varchar("fax", { length: 20 }),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserProfileSchema = createInsertSchema(userProfiles, {
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  gender: z.enum(["male", "female", "other"]),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Invalid Aadhaar number").optional().or(z.literal("")),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  email: z.string().email().optional().or(z.literal("")),
  district: z.string().optional().or(z.literal("")),
  tehsil: z.string().optional().or(z.literal("")),
  block: z.string().optional().or(z.literal("")),
  gramPanchayat: z.string().optional().or(z.literal("")),
  urbanBody: z.string().optional().or(z.literal("")),
  ward: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Invalid pincode").optional().or(z.literal("")),
  telephone: z.string().optional().or(z.literal("")),
  fax: z.string().optional().or(z.literal(""))
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
var selectUserProfileSchema = createSelectSchema(userProfiles);
var homestayApplications = pgTable("homestay_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  applicationNumber: varchar("application_number", { length: 50 }).notNull().unique(),
  // Property Details (ANNEXURE-I)
  propertyName: varchar("property_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  // 'diamond', 'gold', 'silver'
  locationType: varchar("location_type", { length: 10 }).notNull(),
  // 'mc', 'tcp', 'gp' - CRITICAL for fee calculation
  totalRooms: integer("total_rooms").notNull(),
  // LGD Hierarchical Address Fields
  district: varchar("district", { length: 100 }).notNull(),
  districtOther: varchar("district_other", { length: 100 }),
  // Custom district if not in LGD
  tehsil: varchar("tehsil", { length: 100 }).notNull(),
  tehsilOther: varchar("tehsil_other", { length: 100 }),
  // Custom tehsil if not in LGD
  // Rural Address (for GP - Gram Panchayat)
  block: varchar("block", { length: 100 }),
  // Mandatory for rural (gp)
  blockOther: varchar("block_other", { length: 100 }),
  // Custom block if not in LGD
  gramPanchayat: varchar("gram_panchayat", { length: 100 }),
  // Mandatory for rural (gp)
  gramPanchayatOther: varchar("gram_panchayat_other", { length: 100 }),
  // Custom gram panchayat if not in LGD
  // Urban Address (for MC/TCP)
  urbanBody: varchar("urban_body", { length: 200 }),
  // Name of MC/TCP/Nagar Panchayat - Mandatory for urban
  urbanBodyOther: varchar("urban_body_other", { length: 200 }),
  // Custom urban body if not in LGD
  ward: varchar("ward", { length: 50 }),
  // Ward/Zone number - Mandatory for urban
  // Additional address details
  address: text("address").notNull(),
  // House/building number, street, locality
  pincode: varchar("pincode", { length: 10 }).notNull(),
  telephone: varchar("telephone", { length: 20 }),
  fax: varchar("fax", { length: 20 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  // Owner Details (ANNEXURE-I)
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  ownerGender: varchar("owner_gender", { length: 10 }).notNull(),
  // 'male', 'female', 'other' - affects fee (female gets 10% discount for 3 years)
  ownerMobile: varchar("owner_mobile", { length: 15 }).notNull(),
  ownerEmail: varchar("owner_email", { length: 255 }),
  ownerAadhaar: varchar("owner_aadhaar", { length: 12 }).notNull(),
  propertyOwnership: varchar("property_ownership", { length: 10 }).$type().notNull().default("owned"),
  // Room & Category Details (ANNEXURE-I)
  proposedRoomRate: decimal("proposed_room_rate", { precision: 10, scale: 2 }),
  // DEPRECATED: Use per-room-type rates below
  projectType: varchar("project_type", { length: 20 }).notNull(),
  // 'new_rooms', 'new_project'
  propertyArea: decimal("property_area", { precision: 10, scale: 2 }).notNull(),
  // in sq meters
  // 2025 Rules - Per Room Type Rates (Required for Form-A certificate)
  singleBedRooms: integer("single_bed_rooms").default(0),
  singleBedRoomSize: decimal("single_bed_room_size", { precision: 10, scale: 2 }),
  // in sq ft
  singleBedRoomRate: decimal("single_bed_room_rate", { precision: 10, scale: 2 }),
  // per night rate for single bed rooms
  doubleBedRooms: integer("double_bed_rooms").default(0),
  doubleBedRoomSize: decimal("double_bed_room_size", { precision: 10, scale: 2 }),
  // in sq ft
  doubleBedRoomRate: decimal("double_bed_room_rate", { precision: 10, scale: 2 }),
  // per night rate for double bed rooms
  familySuites: integer("family_suites").default(0),
  familySuiteSize: decimal("family_suite_size", { precision: 10, scale: 2 }),
  // in sq ft
  familySuiteRate: decimal("family_suite_rate", { precision: 10, scale: 2 }),
  // per night rate for family suites
  attachedWashrooms: integer("attached_washrooms").notNull(),
  gstin: varchar("gstin", { length: 15 }),
  // Mandatory for Diamond/Gold, optional for Silver
  // 2025 Rules - Category Selection & Room Rate Analysis
  selectedCategory: varchar("selected_category", { length: 20 }),
  // User-selected category (may differ from final approved category)
  averageRoomRate: decimal("average_room_rate", { precision: 10, scale: 2 }),
  // Auto-calculated from room rates
  highestRoomRate: decimal("highest_room_rate", { precision: 10, scale: 2 }),
  // For category validation
  lowestRoomRate: decimal("lowest_room_rate", { precision: 10, scale: 2 }),
  // For consistency check
  // 2025 Rules - Certificate Validity & Location-based Discounts
  certificateValidityYears: integer("certificate_validity_years").default(1),
  // 1 or 3 years
  isPangiSubDivision: boolean("is_pangi_sub_division").default(false),
  // Pangi (Chamba) gets 50% discount
  // Distances from key locations (ANNEXURE-I) - in km
  distanceAirport: decimal("distance_airport", { precision: 10, scale: 2 }),
  distanceRailway: decimal("distance_railway", { precision: 10, scale: 2 }),
  distanceCityCenter: decimal("distance_city_center", { precision: 10, scale: 2 }),
  distanceShopping: decimal("distance_shopping", { precision: 10, scale: 2 }),
  distanceBusStand: decimal("distance_bus_stand", { precision: 10, scale: 2 }),
  // Public Areas (ANNEXURE-I) - in sq ft
  lobbyArea: decimal("lobby_area", { precision: 10, scale: 2 }),
  diningArea: decimal("dining_area", { precision: 10, scale: 2 }),
  parkingArea: text("parking_area"),
  // Description of parking facilities
  // Additional Facilities (ANNEXURE-I)
  ecoFriendlyFacilities: text("eco_friendly_facilities"),
  differentlyAbledFacilities: text("differently_abled_facilities"),
  fireEquipmentDetails: text("fire_equipment_details"),
  nearestHospital: varchar("nearest_hospital", { length: 255 }),
  // Amenities and Room Details (JSONB for flexibility)
  amenities: jsonb("amenities").$type(),
  rooms: jsonb("rooms").$type(),
  // Fee Calculation (2025 Rules - Flat fees, GST included)
  baseFee: decimal("base_fee", { precision: 10, scale: 2 }),
  // Annual base fee from category + location matrix
  totalBeforeDiscounts: decimal("total_before_discounts", { precision: 10, scale: 2 }),
  // baseFee × validityYears
  validityDiscount: decimal("validity_discount", { precision: 10, scale: 2 }).default("0"),
  // 10% for 3-year lump sum
  femaleOwnerDiscount: decimal("female_owner_discount", { precision: 10, scale: 2 }).default("0"),
  // 5% for female owners
  pangiDiscount: decimal("pangi_discount", { precision: 10, scale: 2 }).default("0"),
  // 50% for Pangi sub-division
  totalDiscount: decimal("total_discount", { precision: 10, scale: 2 }).default("0"),
  // Sum of all discounts
  totalFee: decimal("total_fee", { precision: 10, scale: 2 }),
  // Final payable amount
  // Legacy fields (keeping for backward compatibility - can be removed in future migration)
  perRoomFee: decimal("per_room_fee", { precision: 10, scale: 2 }),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }),
  // Workflow
  status: varchar("status", { length: 50 }).default("draft"),
  // 'draft', 'submitted', 'document_verification', 'clarification_requested', 'site_inspection_scheduled', 'site_inspection_complete', 'payment_pending', 'approved', 'rejected'
  currentStage: varchar("current_stage", { length: 50 }),
  // 'document_upload', 'document_verification', 'site_inspection', 'payment', 'approved'
  currentPage: integer("current_page").default(1),
  // Track which page of the form user is on (1-6) for draft resume
  // Approval Details
  districtOfficerId: varchar("district_officer_id").references(() => users.id),
  districtReviewDate: timestamp("district_review_date"),
  districtNotes: text("district_notes"),
  // DA (Dealing Assistant) Details
  daId: varchar("da_id").references(() => users.id),
  daReviewDate: timestamp("da_review_date"),
  daForwardedDate: timestamp("da_forwarded_date"),
  stateOfficerId: varchar("state_officer_id").references(() => users.id),
  stateReviewDate: timestamp("state_review_date"),
  stateNotes: text("state_notes"),
  // DTDO (District Tourism Development Officer) Details
  dtdoId: varchar("dtdo_id").references(() => users.id),
  dtdoReviewDate: timestamp("dtdo_review_date"),
  dtdoRemarks: text("dtdo_remarks"),
  rejectionReason: text("rejection_reason"),
  clarificationRequested: text("clarification_requested"),
  // Site Inspection (2025 Rules)
  siteInspectionScheduledDate: timestamp("site_inspection_scheduled_date"),
  siteInspectionCompletedDate: timestamp("site_inspection_completed_date"),
  siteInspectionOfficerId: varchar("site_inspection_officer_id").references(() => users.id),
  siteInspectionNotes: text("site_inspection_notes"),
  siteInspectionOutcome: varchar("site_inspection_outcome", { length: 50 }),
  // 'approved', 'corrections_needed', 'rejected'
  siteInspectionFindings: jsonb("site_inspection_findings").$type(),
  // Legacy document columns (keeping for backward compatibility)
  ownershipProofUrl: text("ownership_proof_url"),
  aadhaarCardUrl: text("aadhaar_card_url"),
  panCardUrl: text("pan_card_url"),
  gstCertificateUrl: text("gst_certificate_url"),
  fireSafetyNocUrl: text("fire_safety_noc_url"),
  pollutionClearanceUrl: text("pollution_clearance_url"),
  buildingPlanUrl: text("building_plan_url"),
  propertyPhotosUrls: jsonb("property_photos_urls").$type(),
  // New JSONB documents column for ANNEXURE-II documents
  documents: jsonb("documents").$type(),
  // Certificate
  certificateNumber: varchar("certificate_number", { length: 50 }).unique(),
  certificateIssuedDate: timestamp("certificate_issued_date"),
  certificateExpiryDate: timestamp("certificate_expiry_date"),
  // Timestamps
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertHomestayApplicationSchema = createInsertSchema(homestayApplications, {
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  category: z.enum(["diamond", "gold", "silver"]),
  locationType: z.enum(["mc", "tcp", "gp"]),
  totalRooms: z.number().int().min(1).max(50),
  // LGD Hierarchical Address
  district: z.string().min(2, "District is required"),
  tehsil: z.string().min(2, "Tehsil is required"),
  block: z.string().optional().or(z.literal("")),
  // Required for GP, handled in form validation
  gramPanchayat: z.string().optional().or(z.literal("")),
  // Required for GP, handled in form validation
  urbanBody: z.string().optional().or(z.literal("")),
  // Required for MC/TCP, handled in form validation
  ward: z.string().optional().or(z.literal("")),
  // Required for MC/TCP, handled in form validation
  address: z.string().min(10, "Address must be at least 10 characters"),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Invalid pincode"),
  telephone: z.string().optional(),
  fax: z.string().optional(),
  ownerName: z.string().min(3),
  ownerGender: z.enum(["male", "female", "other"]),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/),
  ownerEmail: z.string().email().optional().or(z.literal("")),
  ownerAadhaar: z.string().regex(/^\d{12}$/),
  proposedRoomRate: z.number().min(100, "Room rate must be at least \u20B9100").optional(),
  // DEPRECATED: Use per-room-type rates
  projectType: z.enum(["new_rooms", "new_project"]),
  propertyArea: z.number().min(1, "Property area required"),
  // 2025 Rules - Per Room Type Rates
  singleBedRooms: z.number().int().min(0).default(0),
  singleBedRoomSize: z.number().min(0).optional(),
  singleBedRoomRate: z.number().min(100, "Single bed room rate must be at least \u20B9100").optional(),
  doubleBedRooms: z.number().int().min(0).default(0),
  doubleBedRoomSize: z.number().min(0).optional(),
  doubleBedRoomRate: z.number().min(100, "Double bed room rate must be at least \u20B9100").optional(),
  familySuites: z.number().int().min(0).max(3).default(0),
  familySuiteSize: z.number().min(0).optional(),
  familySuiteRate: z.number().min(100, "Family suite rate must be at least \u20B9100").optional(),
  attachedWashrooms: z.number().int().min(0),
  gstin: z.string().optional().or(z.literal("")),
  // 2025 Rules - New fields
  selectedCategory: z.enum(["diamond", "gold", "silver"]).optional(),
  averageRoomRate: z.number().min(0).optional(),
  highestRoomRate: z.number().min(0).optional(),
  lowestRoomRate: z.number().min(0).optional(),
  certificateValidityYears: z.number().int().min(1).max(3).default(1),
  isPangiSubDivision: z.boolean().default(false),
  distanceAirport: z.number().min(0).optional(),
  distanceRailway: z.number().min(0).optional(),
  distanceCityCenter: z.number().min(0).optional(),
  distanceShopping: z.number().min(0).optional(),
  distanceBusStand: z.number().min(0).optional(),
  lobbyArea: z.number().min(0).optional(),
  diningArea: z.number().min(0).optional(),
  parkingArea: z.string().optional().or(z.literal("")),
  ecoFriendlyFacilities: z.string().optional().or(z.literal("")),
  differentlyAbledFacilities: z.string().optional().or(z.literal("")),
  fireEquipmentDetails: z.string().optional().or(z.literal("")),
  nearestHospital: z.string().optional().or(z.literal(""))
}).omit({ id: true, applicationNumber: true, createdAt: true, updatedAt: true });
var draftHomestayApplicationSchema = createInsertSchema(homestayApplications, {
  propertyName: z.string().min(1).optional().or(z.literal("")),
  category: z.enum(["diamond", "gold", "silver"]).optional(),
  locationType: z.enum(["mc", "tcp", "gp"]).optional(),
  totalRooms: z.number().int().min(0).optional(),
  // LGD Hierarchical Address - All optional for drafts
  district: z.string().optional().or(z.literal("")),
  tehsil: z.string().optional().or(z.literal("")),
  block: z.string().optional().or(z.literal("")),
  gramPanchayat: z.string().optional().or(z.literal("")),
  urbanBody: z.string().optional().or(z.literal("")),
  ward: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  pincode: z.string().optional().or(z.literal("")),
  telephone: z.string().optional().or(z.literal("")),
  fax: z.string().optional().or(z.literal("")),
  ownerName: z.string().optional().or(z.literal("")),
  ownerGender: z.enum(["male", "female", "other"]).optional(),
  ownerMobile: z.string().optional().or(z.literal("")),
  ownerEmail: z.string().optional().or(z.literal("")),
  ownerAadhaar: z.string().optional().or(z.literal("")),
  proposedRoomRate: z.number().optional(),
  // DEPRECATED: Use per-room-type rates
  projectType: z.enum(["new_rooms", "new_project"]).optional(),
  propertyArea: z.number().optional(),
  // 2025 Rules - Per Room Type Rates (optional for drafts)
  singleBedRooms: z.number().int().min(0).optional(),
  singleBedRoomSize: z.number().optional(),
  singleBedRoomRate: z.number().optional(),
  doubleBedRooms: z.number().int().min(0).optional(),
  doubleBedRoomSize: z.number().optional(),
  doubleBedRoomRate: z.number().optional(),
  familySuites: z.number().int().optional(),
  familySuiteSize: z.number().optional(),
  familySuiteRate: z.number().optional(),
  attachedWashrooms: z.number().int().optional(),
  gstin: z.string().optional().or(z.literal("")),
  // 2025 Rules - New fields (all optional for drafts)
  selectedCategory: z.enum(["diamond", "gold", "silver"]).optional(),
  averageRoomRate: z.number().optional(),
  highestRoomRate: z.number().optional(),
  lowestRoomRate: z.number().optional(),
  certificateValidityYears: z.number().int().optional(),
  isPangiSubDivision: z.boolean().optional(),
  distanceAirport: z.number().optional(),
  distanceRailway: z.number().optional(),
  distanceCityCenter: z.number().optional(),
  distanceShopping: z.number().optional(),
  distanceBusStand: z.number().optional(),
  lobbyArea: z.number().optional(),
  diningArea: z.number().optional(),
  parkingArea: z.string().optional().or(z.literal("")),
  ecoFriendlyFacilities: z.string().optional().or(z.literal("")),
  differentlyAbledFacilities: z.string().optional().or(z.literal("")),
  fireEquipmentDetails: z.string().optional().or(z.literal("")),
  nearestHospital: z.string().optional().or(z.literal("")),
  // Fee fields (all optional for drafts)
  baseFee: z.number().optional(),
  totalBeforeDiscounts: z.number().optional(),
  validityDiscount: z.number().optional(),
  femaleOwnerDiscount: z.number().optional(),
  pangiDiscount: z.number().optional(),
  totalDiscount: z.number().optional(),
  totalFee: z.number().optional(),
  perRoomFee: z.number().optional(),
  // Legacy
  gstAmount: z.number().optional()
  // Legacy
}).omit({ id: true, applicationNumber: true, createdAt: true, updatedAt: true });
var selectHomestayApplicationSchema = createSelectSchema(homestayApplications);
var documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  // 'property_photo', 'ownership_proof', 'fire_noc', etc.
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  uploadDate: timestamp("upload_date").defaultNow(),
  // AI Verification (for future)
  aiVerificationStatus: varchar("ai_verification_status", { length: 50 }),
  // 'pending', 'verified', 'flagged'
  aiConfidenceScore: decimal("ai_confidence_score", { precision: 5, scale: 2 }),
  aiNotes: text("ai_notes"),
  // Officer Verification
  isVerified: boolean("is_verified").default(false),
  verificationStatus: varchar("verification_status", { length: 50 }).default("pending"),
  // 'pending', 'verified', 'rejected', 'needs_correction'
  verifiedBy: varchar("verified_by").references(() => users.id),
  verificationDate: timestamp("verification_date"),
  verificationNotes: text("verification_notes")
});
var insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadDate: true });
var selectDocumentSchema = createSelectSchema(documents);
var payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id),
  paymentType: varchar("payment_type", { length: 50 }).notNull(),
  // 'registration', 'renewal', 'late_fee'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  // Payment Gateway
  paymentGateway: varchar("payment_gateway", { length: 50 }),
  // 'himkosh', 'razorpay', 'ccavenue', 'payu', 'upi_qr'
  gatewayTransactionId: varchar("gateway_transaction_id", { length: 255 }).unique(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  // 'upi', 'netbanking', 'card', 'wallet'
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  // 'pending', 'success', 'failed', 'refunded'
  // Payment Link & QR Code (2025 Rules - payment after approval)
  paymentLink: text("payment_link"),
  qrCodeUrl: text("qr_code_url"),
  paymentLinkExpiryDate: timestamp("payment_link_expiry_date"),
  // Timestamps
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  // Receipt
  receiptNumber: varchar("receipt_number", { length: 100 }).unique(),
  receiptUrl: text("receipt_url")
});
var insertPaymentSchema = createInsertSchema(payments).omit({ id: true, initiatedAt: true });
var selectPaymentSchema = createSelectSchema(payments);
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  applicationId: varchar("application_id").references(() => homestayApplications.id),
  type: varchar("type", { length: 100 }).notNull(),
  // 'status_change', 'sla_breach', 'renewal_reminder', etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  // Delivery Channels
  channels: jsonb("channels").$type(),
  // Status
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
var selectNotificationSchema = createSelectSchema(notifications);
var applicationActions = pgTable("application_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: "cascade" }),
  officerId: varchar("officer_id").notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  // 'approved', 'rejected', 'sent_back_for_corrections', 'clarification_requested', 'site_inspection_scheduled', etc.
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  // Feedback and Comments
  feedback: text("feedback"),
  // Officer's comments explaining the action
  issuesFound: jsonb("issues_found").$type(),
  // List of issues if sending back for corrections
  createdAt: timestamp("created_at").defaultNow()
});
var insertApplicationActionSchema = createInsertSchema(applicationActions, {
  action: z.enum(["approved", "rejected", "sent_back_for_corrections", "clarification_requested", "site_inspection_scheduled", "document_verified", "payment_verified"]),
  feedback: z.string().min(10, "Feedback must be at least 10 characters")
}).omit({ id: true, createdAt: true });
var selectApplicationActionSchema = createSelectSchema(applicationActions);
var reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  // 1-5
  reviewText: text("review_text"),
  // Verification
  isVerifiedStay: boolean("is_verified_stay").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(10, "Review must be at least 10 characters").optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectReviewSchema = createSelectSchema(reviews);
var auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
var selectAuditLogSchema = createSelectSchema(auditLogs);
var productionStats = pgTable("production_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  totalApplications: integer("total_applications").notNull(),
  approvedApplications: integer("approved_applications").notNull(),
  rejectedApplications: integer("rejected_applications").notNull(),
  pendingApplications: integer("pending_applications").notNull(),
  scrapedAt: timestamp("scraped_at").defaultNow(),
  sourceUrl: text("source_url")
});
var insertProductionStatsSchema = createInsertSchema(productionStats).omit({ id: true, scrapedAt: true });
var selectProductionStatsSchema = createSelectSchema(productionStats);
var himkoshTransactions = pgTable("himkosh_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id),
  // Departmental Reference (our side)
  deptRefNo: varchar("dept_ref_no", { length: 45 }).notNull(),
  // Application number
  appRefNo: varchar("app_ref_no", { length: 20 }).notNull().unique(),
  // Our unique transaction ID
  // Payment Details
  totalAmount: integer("total_amount").notNull(),
  // In rupees (no decimals as per CTP spec)
  tenderBy: varchar("tender_by", { length: 70 }).notNull(),
  // Applicant name
  // CTP Configuration (from environment/config)
  merchantCode: varchar("merchant_code", { length: 15 }),
  // e.g., HIMKOSH230
  deptId: varchar("dept_id", { length: 10 }),
  // Department code (e.g., CTO00-068)
  serviceCode: varchar("service_code", { length: 5 }),
  // Service code (e.g., TSM)
  ddo: varchar("ddo", { length: 12 }),
  // DDO code (e.g., SML00-532)
  // Head of Account Details
  head1: varchar("head1", { length: 14 }),
  // Mandatory head
  amount1: integer("amount1"),
  // Amount for head1
  head2: varchar("head2", { length: 14 }),
  amount2: integer("amount2"),
  head3: varchar("head3", { length: 14 }),
  amount3: integer("amount3"),
  head4: varchar("head4", { length: 14 }),
  amount4: integer("amount4"),
  head10: varchar("head10", { length: 50 }),
  // Bank account for non-govt charges (IFSC-AccountNo)
  amount10: integer("amount10"),
  // Non-govt charges amount
  // Period
  periodFrom: varchar("period_from", { length: 10 }),
  // MM-DD-YYYY
  periodTo: varchar("period_to", { length: 10 }),
  // MM-DD-YYYY
  // Request/Response Tracking
  encryptedRequest: text("encrypted_request"),
  // Stored for audit
  requestChecksum: varchar("request_checksum", { length: 32 }),
  // MD5 checksum
  // Response from CTP (after payment)
  echTxnId: varchar("ech_txn_id", { length: 10 }).unique(),
  // HIMGRN number from CTP
  bankCIN: varchar("bank_cin", { length: 20 }),
  // Bank transaction number
  bankName: varchar("bank_name", { length: 10 }),
  // SBI, PNB, SBP
  paymentDate: varchar("payment_date", { length: 14 }),
  // DDMMYYYYHHMMSS
  status: varchar("status", { length: 70 }),
  // Status message from bank
  statusCd: varchar("status_cd", { length: 1 }),
  // 1=Success, 0=Failure
  responseChecksum: varchar("response_checksum", { length: 32 }),
  // MD5 checksum of response
  // Double Verification
  isDoubleVerified: boolean("is_double_verified").default(false),
  doubleVerificationDate: timestamp("double_verification_date"),
  doubleVerificationData: jsonb("double_verification_data"),
  // Challan Details
  challanPrintUrl: text("challan_print_url"),
  // URL to print challan from CTP
  // Transaction Status
  transactionStatus: varchar("transaction_status", { length: 50 }).default("initiated"),
  // 'initiated', 'redirected', 'success', 'failed', 'verified'
  // Timestamps
  initiatedAt: timestamp("initiated_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertHimkoshTransactionSchema = createInsertSchema(himkoshTransactions, {
  deptRefNo: z.string().min(1),
  appRefNo: z.string().min(1),
  totalAmount: z.number().int().min(1),
  tenderBy: z.string().min(3)
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectHimkoshTransactionSchema = createSelectSchema(himkoshTransactions);
var ddoCodes = pgTable("ddo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  district: varchar("district", { length: 100 }).notNull().unique(),
  ddoCode: varchar("ddo_code", { length: 20 }).notNull(),
  ddoDescription: text("ddo_description").notNull(),
  treasuryCode: varchar("treasury_code", { length: 10 }).notNull(),
  // e.g., CHM00, KLU00, SML00
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertDdoCodeSchema = createInsertSchema(ddoCodes, {
  district: z.string().min(2),
  ddoCode: z.string().min(3),
  ddoDescription: z.string().min(3),
  treasuryCode: z.string().min(3)
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectDdoCodeSchema = createSelectSchema(ddoCodes);
var inspectionOrders = pgTable("inspection_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: "cascade" }),
  // Scheduled by DTDO
  scheduledBy: varchar("scheduled_by").notNull().references(() => users.id),
  // DTDO user ID
  scheduledDate: timestamp("scheduled_date").notNull(),
  // Assigned to DA
  assignedTo: varchar("assigned_to").notNull().references(() => users.id),
  // DA user ID
  assignedDate: timestamp("assigned_date").notNull(),
  // Inspection Details
  inspectionDate: timestamp("inspection_date").notNull(),
  // Scheduled date for inspection
  inspectionAddress: text("inspection_address").notNull(),
  specialInstructions: text("special_instructions"),
  // DTDO's instructions to DA
  // Status
  status: varchar("status", { length: 50 }).default("scheduled"),
  // 'scheduled', 'in_progress', 'completed', 'cancelled'
  // DTDO Notes
  dtdoNotes: text("dtdo_notes"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertInspectionOrderSchema = createInsertSchema(inspectionOrders, {
  inspectionDate: z.date().or(z.string()),
  inspectionAddress: z.string().min(10, "Address must be at least 10 characters"),
  specialInstructions: z.string().optional().or(z.literal("")),
  dtdoNotes: z.string().optional().or(z.literal(""))
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectInspectionOrderSchema = createSelectSchema(inspectionOrders);
var inspectionReports = pgTable("inspection_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionOrderId: varchar("inspection_order_id").notNull().references(() => inspectionOrders.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: "cascade" }),
  // Submitted by DA
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  // DA user ID
  submittedDate: timestamp("submitted_date").notNull(),
  // Inspection Findings
  actualInspectionDate: timestamp("actual_inspection_date").notNull(),
  roomCountVerified: boolean("room_count_verified").notNull(),
  actualRoomCount: integer("actual_room_count"),
  // Category Verification
  categoryMeetsStandards: boolean("category_meets_standards").notNull(),
  recommendedCategory: varchar("recommended_category", { length: 20 }),
  // 'diamond', 'gold', 'silver'
  // ANNEXURE-III Compliance Checklist (HP Homestay Rules 2025)
  // Section A: Mandatory Requirements (18 points)
  mandatoryChecklist: jsonb("mandatory_checklist").$type(),
  mandatoryRemarks: text("mandatory_remarks"),
  // Section B: Desirable Requirements (18 points)
  desirableChecklist: jsonb("desirable_checklist").$type(),
  desirableRemarks: text("desirable_remarks"),
  // Legacy fields (kept for backward compatibility)
  amenitiesVerified: jsonb("amenities_verified").$type(),
  amenitiesIssues: text("amenities_issues"),
  fireSafetyCompliant: boolean("fire_safety_compliant"),
  fireSafetyIssues: text("fire_safety_issues"),
  structuralSafety: boolean("structural_safety"),
  structuralIssues: text("structural_issues"),
  // Overall Assessment
  overallSatisfactory: boolean("overall_satisfactory").notNull(),
  recommendation: varchar("recommendation", { length: 50 }).notNull(),
  // 'approve', 'approve_with_conditions', 'raise_objections', 'reject'
  detailedFindings: text("detailed_findings").notNull(),
  // Supporting Documents (Photos from inspection)
  inspectionPhotos: jsonb("inspection_photos").$type(),
  // Report Document (PDF uploaded by DA)
  reportDocumentUrl: text("report_document_url"),
  // PDF of official inspection report
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertInspectionReportSchema = createInsertSchema(inspectionReports, {
  actualInspectionDate: z.date().or(z.string()),
  roomCountVerified: z.boolean(),
  actualRoomCount: z.number().int().min(0).optional(),
  categoryMeetsStandards: z.boolean(),
  recommendedCategory: z.enum(["diamond", "gold", "silver"]).optional().or(z.literal("")),
  mandatoryChecklist: z.object({
    applicationForm: z.boolean(),
    documents: z.boolean(),
    onlinePayment: z.boolean(),
    wellMaintained: z.boolean(),
    cleanRooms: z.boolean(),
    comfortableBedding: z.boolean(),
    roomSize: z.boolean(),
    cleanKitchen: z.boolean(),
    cutleryCrockery: z.boolean(),
    waterFacility: z.boolean(),
    wasteDisposal: z.boolean(),
    energySavingLights: z.boolean(),
    visitorBook: z.boolean(),
    doctorDetails: z.boolean(),
    luggageAssistance: z.boolean(),
    fireEquipment: z.boolean(),
    guestRegister: z.boolean(),
    cctvCameras: z.boolean()
  }).optional(),
  desirableChecklist: z.object({
    parking: z.boolean(),
    attachedBathroom: z.boolean(),
    toiletAmenities: z.boolean(),
    hotColdWater: z.boolean(),
    waterConservation: z.boolean(),
    diningArea: z.boolean(),
    wardrobe: z.boolean(),
    storage: z.boolean(),
    furniture: z.boolean(),
    laundry: z.boolean(),
    refrigerator: z.boolean(),
    lounge: z.boolean(),
    heatingCooling: z.boolean(),
    luggageHelp: z.boolean(),
    safeStorage: z.boolean(),
    securityGuard: z.boolean(),
    himachaliCrafts: z.boolean(),
    rainwaterHarvesting: z.boolean()
  }).optional(),
  fireSafetyCompliant: z.boolean().optional(),
  structuralSafety: z.boolean().optional(),
  overallSatisfactory: z.boolean(),
  recommendation: z.enum(["approve", "approve_with_conditions", "raise_objections", "reject"]),
  detailedFindings: z.string().min(20, "Detailed findings must be at least 20 characters")
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectInspectionReportSchema = createSelectSchema(inspectionReports);
var objections = pgTable("objections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: "cascade" }),
  inspectionReportId: varchar("inspection_report_id").references(() => inspectionReports.id),
  // Raised by DTDO
  raisedBy: varchar("raised_by").notNull().references(() => users.id),
  // DTDO user ID
  raisedDate: timestamp("raised_date").notNull(),
  // Objection Details
  objectionType: varchar("objection_type", { length: 50 }).notNull(),
  // 'document_incomplete', 'category_mismatch', 'safety_violation', 'amenity_mismatch', 'structural_issue', 'other'
  objectionTitle: varchar("objection_title", { length: 255 }).notNull(),
  objectionDescription: text("objection_description").notNull(),
  // Severity
  severity: varchar("severity", { length: 20 }).notNull(),
  // 'minor', 'major', 'critical'
  // Resolution Timeline
  responseDeadline: timestamp("response_deadline"),
  // Deadline for applicant to respond
  // Status
  status: varchar("status", { length: 50 }).default("pending"),
  // 'pending', 'responded', 'resolved', 'escalated'
  // Resolution
  resolutionNotes: text("resolution_notes"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  // DTDO user ID
  resolvedDate: timestamp("resolved_date"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertObjectionSchema = createInsertSchema(objections, {
  objectionType: z.enum(["document_incomplete", "category_mismatch", "safety_violation", "amenity_mismatch", "structural_issue", "other"]),
  objectionTitle: z.string().min(5, "Title must be at least 5 characters"),
  objectionDescription: z.string().min(20, "Description must be at least 20 characters"),
  severity: z.enum(["minor", "major", "critical"]),
  responseDeadline: z.date().or(z.string()).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectObjectionSchema = createSelectSchema(objections);
var clarifications = pgTable("clarifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectionId: varchar("objection_id").notNull().references(() => objections.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: "cascade" }),
  // Submitted by Property Owner
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  // Property owner user ID
  submittedDate: timestamp("submitted_date").notNull(),
  // Clarification Details
  clarificationText: text("clarification_text").notNull(),
  // Supporting Documents
  supportingDocuments: jsonb("supporting_documents").$type(),
  // Review by DTDO
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  // DTDO user ID
  reviewedDate: timestamp("reviewed_date"),
  reviewStatus: varchar("review_status", { length: 50 }),
  // 'accepted', 'rejected', 'needs_revision'
  reviewNotes: text("review_notes"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertClarificationSchema = createInsertSchema(clarifications, {
  clarificationText: z.string().min(20, "Clarification must be at least 20 characters")
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectClarificationSchema = createSelectSchema(clarifications);
var certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => homestayApplications.id, { onDelete: "cascade" }).unique(),
  // Certificate Details
  certificateNumber: varchar("certificate_number", { length: 50 }).notNull().unique(),
  // e.g., HP/HST/2025/KLU/001
  certificateType: varchar("certificate_type", { length: 50 }).default("homestay_registration"),
  // Future: renewal, amendment
  // Validity
  issuedDate: timestamp("issued_date").notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUpto: timestamp("valid_upto").notNull(),
  // 3 years from issue date
  // Property Details (snapshot at time of issue)
  propertyName: varchar("property_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(),
  // 'diamond', 'gold', 'silver'
  address: text("address").notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  // Owner Details (snapshot)
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  ownerMobile: varchar("owner_mobile", { length: 15 }).notNull(),
  // Certificate Document
  certificatePdfUrl: text("certificate_pdf_url"),
  // URL to generated PDF
  qrCodeData: text("qr_code_data"),
  // QR code for verification (contains certificate number + validation URL)
  // Digital Signature
  digitalSignature: text("digital_signature"),
  // Future: Digital signature of issuing officer
  issuedBy: varchar("issued_by").references(() => users.id),
  // System admin or auto-generated
  // Status
  status: varchar("status", { length: 50 }).default("active"),
  // 'active', 'expired', 'revoked', 'suspended'
  revocationReason: text("revocation_reason"),
  revokedBy: varchar("revoked_by").references(() => users.id),
  revokedDate: timestamp("revoked_date"),
  // Renewal Tracking
  renewalReminderSent: boolean("renewal_reminder_sent").default(false),
  renewalApplicationId: varchar("renewal_application_id").references(() => homestayApplications.id),
  // Link to renewal application
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertCertificateSchema = createInsertSchema(certificates, {
  certificateNumber: z.string().min(5),
  issuedDate: z.date().or(z.string()),
  validFrom: z.date().or(z.string()),
  validUpto: z.date().or(z.string()),
  propertyName: z.string().min(3),
  category: z.enum(["diamond", "gold", "silver"]),
  address: z.string().min(10),
  district: z.string().min(2),
  ownerName: z.string().min(3),
  ownerMobile: z.string().regex(/^[6-9]\d{9}$/)
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectCertificateSchema = createSelectSchema(certificates);
var systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Setting Key (unique identifier for the setting)
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  // e.g., 'test_payment_mode'
  // Setting Value (stored as JSON for flexibility)
  settingValue: jsonb("setting_value").notNull(),
  // e.g., { enabled: true }
  // Metadata
  description: text("description"),
  // Human-readable description
  category: varchar("category", { length: 50 }).default("general"),
  // e.g., 'payment', 'general', 'notification'
  // Audit fields
  updatedBy: varchar("updated_by").references(() => users.id),
  // Admin who last updated
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertSystemSettingSchema = createInsertSchema(systemSettings, {
  settingKey: z.string().min(1, "Setting key is required"),
  settingValue: z.any(),
  // Allow any JSON value
  description: z.string().optional().or(z.literal("")),
  category: z.enum(["general", "payment", "notification", "security"]).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var selectSystemSettingSchema = createSelectSchema(systemSettings);
var lgdDistricts = pgTable("lgd_districts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lgdCode: varchar("lgd_code", { length: 20 }).unique(),
  // Official LGD code
  districtName: varchar("district_name", { length: 100 }).notNull().unique(),
  divisionName: varchar("division_name", { length: 100 }),
  // Shimla, Mandi, Kangra
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertLgdDistrictSchema = createInsertSchema(lgdDistricts, {
  districtName: z.string().min(2),
  lgdCode: z.string().optional(),
  divisionName: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });
var selectLgdDistrictSchema = createSelectSchema(lgdDistricts);
var lgdTehsils = pgTable("lgd_tehsils", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lgdCode: varchar("lgd_code", { length: 20 }).unique(),
  // Official LGD code
  tehsilName: varchar("tehsil_name", { length: 100 }).notNull(),
  districtId: varchar("district_id").notNull().references(() => lgdDistricts.id, { onDelete: "cascade" }),
  tehsilType: varchar("tehsil_type", { length: 50 }).default("tehsil"),
  // 'tehsil', 'sub_division', 'sub_tehsil'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertLgdTehsilSchema = createInsertSchema(lgdTehsils, {
  tehsilName: z.string().min(2),
  districtId: z.string().uuid(),
  lgdCode: z.string().optional(),
  tehsilType: z.enum(["tehsil", "sub_division", "sub_tehsil"]).optional()
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });
var selectLgdTehsilSchema = createSelectSchema(lgdTehsils);
var lgdBlocks = pgTable("lgd_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lgdCode: varchar("lgd_code", { length: 20 }).unique(),
  // Official LGD code
  blockName: varchar("block_name", { length: 100 }).notNull(),
  districtId: varchar("district_id").notNull().references(() => lgdDistricts.id, { onDelete: "cascade" }),
  tehsilId: varchar("tehsil_id").references(() => lgdTehsils.id, { onDelete: "set null" }),
  // Optional linkage
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertLgdBlockSchema = createInsertSchema(lgdBlocks, {
  blockName: z.string().min(2),
  districtId: z.string().uuid(),
  lgdCode: z.string().optional(),
  tehsilId: z.string().uuid().optional()
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });
var selectLgdBlockSchema = createSelectSchema(lgdBlocks);
var lgdGramPanchayats = pgTable("lgd_gram_panchayats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lgdCode: varchar("lgd_code", { length: 20 }).unique(),
  // Official LGD code
  gramPanchayatName: varchar("gram_panchayat_name", { length: 100 }).notNull(),
  districtId: varchar("district_id").notNull().references(() => lgdDistricts.id, { onDelete: "cascade" }),
  blockId: varchar("block_id").references(() => lgdBlocks.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertLgdGramPanchayatSchema = createInsertSchema(lgdGramPanchayats, {
  gramPanchayatName: z.string().min(2),
  districtId: z.string().uuid(),
  blockId: z.string().uuid().optional(),
  lgdCode: z.string().optional()
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });
var selectLgdGramPanchayatSchema = createSelectSchema(lgdGramPanchayats);
var lgdUrbanBodies = pgTable("lgd_urban_bodies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lgdCode: varchar("lgd_code", { length: 20 }).unique(),
  // Official LGD code
  urbanBodyName: varchar("urban_body_name", { length: 200 }).notNull(),
  districtId: varchar("district_id").notNull().references(() => lgdDistricts.id, { onDelete: "cascade" }),
  bodyType: varchar("body_type", { length: 50 }).notNull(),
  // 'mc' (Municipal Corporation), 'tcp' (Town & Country Planning), 'np' (Nagar Panchayat)
  numberOfWards: integer("number_of_wards"),
  // Total wards in this urban body
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertLgdUrbanBodySchema = createInsertSchema(lgdUrbanBodies, {
  urbanBodyName: z.string().min(2),
  districtId: z.string().uuid(),
  bodyType: z.enum(["mc", "tcp", "np"]),
  lgdCode: z.string().optional(),
  numberOfWards: z.number().int().positive().optional()
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });
var selectLgdUrbanBodySchema = createSelectSchema(lgdUrbanBodies);

// server/db.ts
var databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var isLocalConnection = (() => {
  try {
    const { hostname, protocol } = new URL(databaseUrl);
    if (process.env.DATABASE_DRIVER === "pg") {
      return true;
    }
    return protocol.startsWith("postgres") && (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1");
  } catch {
    return false;
  }
})();
var pool;
var db;
if (isLocalConnection) {
  const localPool = new PgPool({ connectionString: databaseUrl });
  pool = localPool;
  db = drizzlePg(localPool, { schema: schema_exports });
} else {
  neonConfig.webSocketConstructor = ws;
  const neonPool = new NeonPool({ connectionString: databaseUrl });
  pool = neonPool;
  db = drizzleNeon(neonPool, { schema: schema_exports });
}

// server/storage.ts
import { randomUUID } from "crypto";

// server/db-storage.ts
import { eq, and, desc } from "drizzle-orm";
var DbStorage = class {
  // User methods
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByMobile(mobile) {
    const result = await db.select().from(users).where(eq(users.mobile, mobile)).limit(1);
    return result[0];
  }
  async getAllUsers() {
    return await db.select().from(users);
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  async updateUser(id, updates) {
    const result = await db.update(users).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return result[0];
  }
  // Homestay Application methods
  async getApplication(id) {
    const result = await db.select().from(homestayApplications).where(eq(homestayApplications.id, id)).limit(1);
    return result[0];
  }
  async getApplicationsByUser(userId) {
    return await db.select().from(homestayApplications).where(eq(homestayApplications.userId, userId)).orderBy(desc(homestayApplications.createdAt));
  }
  async getApplicationsByDistrict(district) {
    return await db.select().from(homestayApplications).where(
      and(
        eq(homestayApplications.district, district),
        eq(homestayApplications.status, "pending")
      )
    ).orderBy(desc(homestayApplications.createdAt));
  }
  async getApplicationsByStatus(status) {
    return await db.select().from(homestayApplications).where(eq(homestayApplications.status, status)).orderBy(desc(homestayApplications.createdAt));
  }
  async getAllApplications() {
    return await db.select().from(homestayApplications).orderBy(desc(homestayApplications.createdAt));
  }
  async createApplication(insertApp, options) {
    const allApps = await this.getAllApplications();
    const applicationNumber = `HP-HS-2025-${String(allApps.length + 1).padStart(6, "0")}`;
    const status = options?.trusted ? insertApp.status || "draft" : "draft";
    const appToInsert = {
      ...insertApp,
      applicationNumber,
      status
    };
    const result = await db.insert(homestayApplications).values([appToInsert]).returning();
    return result[0];
  }
  async updateApplication(id, updates) {
    const result = await db.update(homestayApplications).set(updates).where(eq(homestayApplications.id, id)).returning();
    return result[0];
  }
  // Document methods
  async createDocument(doc) {
    const result = await db.insert(documents).values(doc).returning();
    return result[0];
  }
  async getDocumentsByApplication(applicationId) {
    return await db.select().from(documents).where(eq(documents.applicationId, applicationId)).orderBy(desc(documents.uploadDate));
  }
  async deleteDocumentsByApplication(applicationId) {
    await db.delete(documents).where(eq(documents.applicationId, applicationId));
  }
  // Payment methods
  async createPayment(payment) {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }
  async updatePayment(id, updates) {
    const result = await db.update(payments).set(updates).where(eq(payments.id, id)).returning();
    return result[0];
  }
  async getPaymentById(id) {
    const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return result[0];
  }
  async getPaymentsByApplication(applicationId) {
    return await db.select().from(payments).where(eq(payments.applicationId, applicationId)).orderBy(desc(payments.initiatedAt));
  }
  // Notification methods
  async createNotification(notification) {
    const rawChannels = notification.channels;
    const normalizedChannels = rawChannels ? {
      email: rawChannels.email,
      sms: rawChannels.sms,
      whatsapp: rawChannels.whatsapp,
      inapp: rawChannels.inapp
    } : void 0;
    const payload = {
      ...notification,
      channels: normalizedChannels
    };
    const result = await db.insert(notifications).values(payload).returning();
    return result[0];
  }
  async getNotificationsByUser(userId) {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async markNotificationAsRead(id) {
    await db.update(notifications).set({ isRead: true, readAt: /* @__PURE__ */ new Date() }).where(eq(notifications.id, id));
  }
  // Application Action methods
  async createApplicationAction(action) {
    const payload = {
      ...action,
      issuesFound: Array.isArray(action.issuesFound) ? action.issuesFound.map((issue) => String(issue)) : void 0
    };
    const result = await db.insert(applicationActions).values(payload).returning();
    return result[0];
  }
  async getApplicationActions(applicationId) {
    return await db.select().from(applicationActions).where(eq(applicationActions.applicationId, applicationId)).orderBy(applicationActions.createdAt);
  }
  // Dev methods
  async getStats() {
    const { count } = await import("drizzle-orm");
    const [usersCountResult, appsCountResult, docsCountResult, paymentsCountResult] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(homestayApplications),
      db.select({ count: count() }).from(documents),
      db.select({ count: count() }).from(payments)
    ]);
    const usersCount = usersCountResult[0]?.count ?? 0;
    const appsCount = appsCountResult[0]?.count ?? 0;
    const docsCount = docsCountResult[0]?.count ?? 0;
    const paymentsCount = paymentsCountResult[0]?.count ?? 0;
    return {
      users: Number(usersCount),
      applications: Number(appsCount),
      documents: Number(docsCount),
      payments: Number(paymentsCount)
    };
  }
  async clearAll() {
    await db.delete(applicationActions);
    await db.delete(notifications);
    await db.delete(payments);
    await db.delete(documents);
    await db.delete(homestayApplications);
    await db.delete(users);
  }
  // Production Stats methods
  async saveProductionStats(stats) {
    await db.insert(productionStats).values(stats);
  }
  async getLatestProductionStats() {
    const result = await db.select().from(productionStats).orderBy(desc(productionStats.scrapedAt)).limit(1);
    if (!result[0]) return null;
    return {
      totalApplications: result[0].totalApplications,
      approvedApplications: result[0].approvedApplications,
      rejectedApplications: result[0].rejectedApplications,
      pendingApplications: result[0].pendingApplications,
      scrapedAt: result[0].scrapedAt || /* @__PURE__ */ new Date()
    };
  }
};

// server/storage.ts
var MemStorage = class _MemStorage {
  users;
  applications;
  documents;
  payments;
  notifications;
  applicationActions;
  static normalizeNullable(input) {
    const normalized = { ...input };
    for (const key of Object.keys(normalized)) {
      if (normalized[key] === void 0) {
        normalized[key] = null;
      }
    }
    return normalized;
  }
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.applications = /* @__PURE__ */ new Map();
    this.documents = /* @__PURE__ */ new Map();
    this.payments = /* @__PURE__ */ new Map();
    this.notifications = /* @__PURE__ */ new Map();
    this.applicationActions = /* @__PURE__ */ new Map();
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByMobile(mobile) {
    return Array.from(this.users.values()).find(
      (user) => user.mobile === mobile
    );
  }
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const user = {
      ...insertUser,
      id,
      fullName: insertUser.fullName,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      username: insertUser.username ?? null,
      email: insertUser.email ?? null,
      alternatePhone: insertUser.alternatePhone ?? null,
      designation: insertUser.designation ?? null,
      department: insertUser.department ?? null,
      employeeId: insertUser.employeeId ?? null,
      officeAddress: insertUser.officeAddress ?? null,
      officePhone: insertUser.officePhone ?? null,
      aadhaarNumber: insertUser.aadhaarNumber ?? null,
      district: insertUser.district ?? null,
      password: insertUser.password ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }
  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return void 0;
    const updatedUser = {
      ...user,
      ...updates,
      id: user.id,
      // Prevent ID from being changed
      createdAt: user.createdAt,
      // Preserve creation date
      updatedAt: /* @__PURE__ */ new Date()
      // Update modification date
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  // Homestay Application methods
  async getApplication(id) {
    return this.applications.get(id);
  }
  async getApplicationsByUser(userId) {
    return Array.from(this.applications.values()).filter((app2) => app2.userId === userId).sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
  }
  async getApplicationsByDistrict(district) {
    return Array.from(this.applications.values()).filter(
      (app2) => app2.district === district && app2.status === "pending"
    );
  }
  async getApplicationsByStatus(status) {
    return Array.from(this.applications.values()).filter((app2) => app2.status === status);
  }
  async getAllApplications() {
    return Array.from(this.applications.values());
  }
  async createApplication(insertApp, options) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const applicationNumber = `HP-HS-2025-${String(this.applications.size + 1).padStart(6, "0")}`;
    const isTrusted = options?.trusted === true;
    const status = isTrusted && insertApp.status ? insertApp.status : "draft";
    const submittedAt = isTrusted && insertApp.submittedAt ? insertApp.submittedAt : status === "pending" ? now : null;
    const currentStage = status === "pending" ? "district" : null;
    const app2 = {
      ..._MemStorage.normalizeNullable(insertApp),
      id,
      applicationNumber,
      latitude: insertApp.latitude ?? null,
      longitude: insertApp.longitude ?? null,
      ownerEmail: insertApp.ownerEmail ?? null,
      amenities: insertApp.amenities ?? null,
      rooms: insertApp.rooms ?? null,
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
      updatedAt: now
    };
    this.applications.set(id, app2);
    return app2;
  }
  async updateApplication(id, update) {
    const existing = this.applications.get(id);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...update,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.applications.set(id, updated);
    return updated;
  }
  // Document methods
  async createDocument(insertDoc) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const doc = {
      ..._MemStorage.normalizeNullable(insertDoc),
      id,
      uploadDate: now,
      aiVerificationStatus: insertDoc.aiVerificationStatus ?? null,
      aiConfidenceScore: insertDoc.aiConfidenceScore ?? null,
      aiNotes: insertDoc.aiNotes ?? null,
      isVerified: insertDoc.isVerified ?? false,
      verifiedBy: insertDoc.verifiedBy ?? null,
      verificationDate: insertDoc.verificationDate ?? null,
      verificationNotes: insertDoc.verificationNotes ?? null,
      verificationStatus: insertDoc.verificationStatus ?? "pending"
    };
    this.documents.set(id, doc);
    return doc;
  }
  async getDocumentsByApplication(applicationId) {
    return Array.from(this.documents.values()).filter((doc) => doc.applicationId === applicationId);
  }
  async deleteDocumentsByApplication(applicationId) {
    for (const [id, doc] of Array.from(this.documents.entries())) {
      if (doc.applicationId === applicationId) {
        this.documents.delete(id);
      }
    }
  }
  // Payment methods
  async createPayment(insertPayment) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const receiptNumber = `REC-2025-${String(this.payments.size + 1).padStart(6, "0")}`;
    const payment = {
      ..._MemStorage.normalizeNullable(insertPayment),
      id,
      paymentGateway: insertPayment.paymentGateway ?? null,
      gatewayTransactionId: insertPayment.gatewayTransactionId ?? null,
      paymentMethod: insertPayment.paymentMethod ?? null,
      paymentStatus: insertPayment.paymentStatus ?? "pending",
      initiatedAt: now,
      completedAt: insertPayment.completedAt ?? null,
      receiptNumber,
      receiptUrl: insertPayment.receiptUrl ?? null,
      paymentLink: insertPayment.paymentLink ?? null,
      qrCodeUrl: insertPayment.qrCodeUrl ?? null,
      paymentLinkExpiryDate: insertPayment.paymentLinkExpiryDate ?? null
    };
    this.payments.set(id, payment);
    return payment;
  }
  async updatePayment(id, update) {
    const existing = this.payments.get(id);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...update
    };
    this.payments.set(id, updated);
    return updated;
  }
  async getPaymentById(id) {
    return this.payments.get(id);
  }
  async getPaymentsByApplication(applicationId) {
    return Array.from(this.payments.values()).filter((payment) => payment.applicationId === applicationId);
  }
  // Notification methods
  async createNotification(insertNotification) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const rawChannels = insertNotification.channels;
    const normalizedChannels = rawChannels ? {
      email: rawChannels.email,
      sms: rawChannels.sms,
      whatsapp: rawChannels.whatsapp,
      inapp: rawChannels.inapp
    } : { inapp: true, email: false, sms: false, whatsapp: false };
    const notification = {
      ...insertNotification,
      id,
      applicationId: insertNotification.applicationId || null,
      channels: normalizedChannels,
      isRead: false,
      readAt: null,
      createdAt: now
    };
    this.notifications.set(id, notification);
    return notification;
  }
  async getNotificationsByUser(userId) {
    return Array.from(this.notifications.values()).filter((notif) => notif.userId === userId).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }
  async markNotificationAsRead(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      notification.readAt = /* @__PURE__ */ new Date();
      this.notifications.set(id, notification);
    }
  }
  // Application Action methods
  async createApplicationAction(insertAction) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const action = {
      ...insertAction,
      id,
      previousStatus: insertAction.previousStatus || null,
      newStatus: insertAction.newStatus || null,
      feedback: insertAction.feedback || null,
      issuesFound: Array.isArray(insertAction.issuesFound) ? insertAction.issuesFound.map((issue) => String(issue)) : null,
      createdAt: now
    };
    this.applicationActions.set(id, action);
    return action;
  }
  async getApplicationActions(applicationId) {
    return Array.from(this.applicationActions.values()).filter((action) => action.applicationId === applicationId).sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }
  // Production Stats methods (stub for MemStorage - not used in production)
  async saveProductionStats(stats) {
  }
  async getLatestProductionStats() {
    return null;
  }
  // Dev methods
  async getStats() {
    return {
      users: this.users.size,
      applications: this.applications.size,
      documents: this.documents.size,
      payments: this.payments.size
    };
  }
  async clearAll() {
    this.users.clear();
    this.applications.clear();
    this.documents.clear();
    this.payments.clear();
    this.notifications.clear();
    this.applicationActions.clear();
  }
};
var storage = process.env.USE_MEM_STORAGE === "true" ? new MemStorage() : new DbStorage();

// server/routes.ts
import express from "express";
import { randomUUID as randomUUID3 } from "crypto";
import path3 from "path";
import fs4 from "fs";
import fsPromises2 from "fs/promises";
import { z as z2 } from "zod";
import bcrypt from "bcrypt";
import { eq as eq3, desc as desc3, ne, notInArray, and as and2, sql as sql2, gte, lte } from "drizzle-orm";

// server/scraper.ts
import https from "https";
var PRODUCTION_PORTAL_URL = "https://eservices.himachaltourism.gov.in/";
async function fetchWithCustomAgent(url) {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    https.get(url, {
      agent,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}
async function scrapeProductionStats() {
  try {
    console.log(`[scraper] Fetching stats from ${PRODUCTION_PORTAL_URL}`);
    const html = await fetchWithCustomAgent(PRODUCTION_PORTAL_URL);
    const stats = extractStatsFromHTML(html);
    if (stats) {
      await storage.saveProductionStats({
        ...stats,
        sourceUrl: PRODUCTION_PORTAL_URL
      });
      console.log(`[scraper] Successfully scraped and saved stats:`, stats);
    }
    return stats;
  } catch (error) {
    console.error("[scraper] Error scraping production stats:", error);
    return null;
  }
}
function extractStatsFromHTML(html) {
  try {
    const totalMatch = html.match(/Total Applications[\s\S]*?([\d,]+)/i);
    const approvedMatch = html.match(/Approved Applications[\s\S]*?([\d,]+)/i);
    const rejectedMatch = html.match(/Rejected Applications[\s\S]*?([\d,]+)/i);
    const pendingMatch = html.match(/Pending Applications[\s\S]*?([\d,]+)/i);
    if (totalMatch && approvedMatch && rejectedMatch && pendingMatch) {
      const stats = {
        totalApplications: parseInt(totalMatch[1].replace(/,/g, "")),
        approvedApplications: parseInt(approvedMatch[1].replace(/,/g, "")),
        rejectedApplications: parseInt(rejectedMatch[1].replace(/,/g, "")),
        pendingApplications: parseInt(pendingMatch[1].replace(/,/g, ""))
      };
      if (isNaN(stats.totalApplications) || isNaN(stats.approvedApplications) || isNaN(stats.rejectedApplications) || isNaN(stats.pendingApplications)) {
        console.error("[scraper] Failed to parse numbers from HTML");
        return null;
      }
      console.log("[scraper] Parsed stats:", stats);
      return stats;
    }
    console.error("[scraper] Failed to match all required statistics in HTML");
    return null;
  } catch (error) {
    console.error("[scraper] Error extracting stats from HTML:", error);
    return null;
  }
}
var scraperInterval = null;
function startScraperScheduler() {
  scrapeProductionStats();
  scraperInterval = setInterval(() => {
    scrapeProductionStats();
  }, 60 * 60 * 1e3);
  console.log("[scraper] Scheduler started - will scrape every hour");
}

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID as randomUUID2 } from "crypto";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var OBJECT_STORAGE_MODE = process.env.OBJECT_STORAGE_MODE || "replit";
var LOCAL_OBJECT_DIR = path.resolve(
  process.env.LOCAL_OBJECT_DIR || path.join(process.cwd(), "local-object-storage")
);
var LOCAL_MAX_UPLOAD_BYTES = parseInt(process.env.LOCAL_MAX_UPLOAD_BYTES || "", 10) || 20 * 1024 * 1024;
if (OBJECT_STORAGE_MODE === "local") {
  fs.mkdirSync(LOCAL_OBJECT_DIR, { recursive: true });
}
var objectStorageClient = OBJECT_STORAGE_MODE === "replit" ? new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
}) : void 0;
var ObjectStorageService = class {
  getPrivateObjectDir() {
    if (OBJECT_STORAGE_MODE === "local") {
      return LOCAL_OBJECT_DIR;
    }
    const dir = process.env.PRIVATE_OBJECT_DIR;
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR not set");
    }
    return dir;
  }
  async getUploadURL(fileType = "document") {
    if (OBJECT_STORAGE_MODE === "local") {
      const objectId2 = randomUUID2();
      await this.ensureLocalDirectory(fileType);
      return `/api/local-object/upload/${objectId2}?type=${encodeURIComponent(fileType)}`;
    }
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID2();
    const fullPath = `${privateObjectDir}/${fileType}s/${objectId}`;
    const { bucketName, objectName } = this.parseObjectPath(fullPath);
    return this.signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }
  normalizeObjectPath(uploadURL) {
    if (OBJECT_STORAGE_MODE === "local") {
      const url2 = new URL(`http://localhost${uploadURL}`);
      const objectId = url2.pathname.split("/").pop();
      const fileType = url2.searchParams.get("type") || "document";
      return `/api/local-object/download/${objectId}?type=${encodeURIComponent(fileType)}`;
    }
    if (!uploadURL.startsWith("https://storage.googleapis.com/")) {
      return uploadURL;
    }
    const url = new URL(uploadURL);
    return url.pathname;
  }
  async getViewURL(filePath) {
    if (OBJECT_STORAGE_MODE === "local") {
      return filePath;
    }
    const { bucketName, objectName } = this.parseObjectPath(filePath);
    return this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec: 3600
      // 1 hour
    });
  }
  parseObjectPath(path6) {
    if (!path6.startsWith("/")) {
      path6 = `/${path6}`;
    }
    const pathParts = path6.split("/");
    if (pathParts.length < 3) {
      throw new Error("Invalid path");
    }
    return {
      bucketName: pathParts[1],
      objectName: pathParts.slice(2).join("/")
    };
  }
  async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec
  }) {
    if (!objectStorageClient) {
      throw new Error("Object storage client not configured");
    }
    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
    };
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to sign object URL: ${response.status}`);
    }
    const { signed_url } = await response.json();
    return signed_url;
  }
  async ensureLocalDirectory(fileType) {
    const dirPath = path.join(LOCAL_OBJECT_DIR, `${fileType}s`);
    await fsPromises.mkdir(dirPath, { recursive: true });
  }
};

// server/himkosh/routes.ts
import { Router } from "express";

// server/himkosh/crypto.ts
import crypto from "crypto";
import { promises as fs3 } from "fs";

// server/himkosh/config.ts
import fs2 from "fs";
import path2 from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var getEnvValue = (...keys) => {
  for (const key of keys) {
    if (!key) continue;
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return void 0;
};
function resolveKeyFilePath(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.HIMKOSH_KEY_FILE_PATH,
    path2.resolve(process.cwd(), "server/himkosh/echallan.key"),
    path2.resolve(process.cwd(), "dist/himkosh/echallan.key"),
    path2.resolve(process.cwd(), "dist/echallan.key"),
    path2.join(__dirname, "echallan.key")
  ].filter((candidate) => Boolean(candidate));
  for (const candidate of candidates) {
    try {
      if (fs2.existsSync(candidate)) {
        return candidate;
      }
    } catch {
    }
  }
  return path2.join(__dirname, "echallan.key");
}
var himkoshConfig = {
  // CTP API Endpoints
  paymentUrl: getEnvValue("HIMKOSH_PAYMENT_URL", "HIMKOSH_POST_URL") || "https://himkosh.hp.nic.in/echallan/WebPages/wrfApplicationRequest.aspx",
  verificationUrl: getEnvValue("HIMKOSH_VERIFICATION_URL", "HIMKOSH_VERIFY_URL") || "https://himkosh.hp.nic.in/eChallan/webpages/AppVerification.aspx",
  challanPrintUrl: getEnvValue("HIMKOSH_CHALLAN_PRINT_URL") || "https://himkosh.hp.nic.in/eChallan/challan_reports/reportViewer.aspx",
  searchChallanUrl: getEnvValue("HIMKOSH_SEARCH_URL") || "https://himkosh.hp.nic.in/eChallan/SearchChallan.aspx",
  // Merchant Configuration (from CTP team)
  // These will be stored in Replit Secrets
  merchantCode: getEnvValue("HIMKOSH_MERCHANT_CODE", "HIMKOSH_MERCHANTCODE", "HIMKOSH_MERCHANT_ID") || "",
  deptId: getEnvValue("HIMKOSH_DEPT_ID", "HIMKOSH_DEPT_CODE") || "",
  serviceCode: getEnvValue("HIMKOSH_SERVICE_CODE", "HIMKOSH_SERVICECODE") || "",
  ddo: getEnvValue("HIMKOSH_DDO", "HIMKOSH_DDO_CODE") || "",
  // Head of Account Codes (Budget heads)
  heads: {
    registrationFee: getEnvValue("HIMKOSH_HEAD", "HIMKOSH_HEAD_OF_ACCOUNT", "HIMKOSH_HEAD1") || "",
    secondaryHead: getEnvValue("HIMKOSH_HEAD2", "HIMKOSH_SECONDARY_HEAD", "HIMKOSH_HEAD_OF_ACCOUNT_2"),
    secondaryHeadAmount: (() => {
      const raw = getEnvValue("HIMKOSH_HEAD2_AMOUNT", "HIMKOSH_SECONDARY_HEAD_AMOUNT");
      if (!raw) return void 0;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : void 0;
    })()
  },
  // Return URL for payment callback
  // CRITICAL: Must be the actual URL where this app is running
  // In Replit, use REPLIT_DEV_DOMAIN or REPL_SLUG/REPL_OWNER
  returnUrl: getEnvValue("HIMKOSH_RETURN_URL") || "https://hptourism.osipl.dev/api/himkosh/callback",
  // Key file path (will be provided by CTP team)
  // Use absolute path to ensure it's found regardless of working directory
  keyFilePath: resolveKeyFilePath()
};
function validateHimKoshConfig() {
  const requiredFields = [
    "merchantCode",
    "deptId",
    "serviceCode",
    "ddo"
  ];
  const missingFields = [];
  for (const field of requiredFields) {
    if (!himkoshConfig[field]) {
      missingFields.push(field);
    }
  }
  if (!himkoshConfig.heads.registrationFee) {
    missingFields.push("heads.registrationFee");
  }
  return {
    valid: missingFields.length === 0,
    missingFields
  };
}
function getHimKoshConfig() {
  const config = validateHimKoshConfig();
  console.log("[himkosh-config] Validation result:", {
    valid: config.valid,
    missingFields: config.missingFields,
    merchantCode: !!himkoshConfig.merchantCode,
    deptId: !!himkoshConfig.deptId,
    serviceCode: !!himkoshConfig.serviceCode,
    ddo: !!himkoshConfig.ddo,
    head: !!himkoshConfig.heads.registrationFee,
    secondaryHead: !!himkoshConfig.heads.secondaryHead
  });
  if (!config.valid) {
    console.warn("\u26A0\uFE0F  HimKosh configuration incomplete. Missing:", config.missingFields.join(", "));
    console.warn("\u26A0\uFE0F  Using placeholder values for development/testing.");
    return {
      ...himkoshConfig,
      merchantCode: himkoshConfig.merchantCode || "HIMKOSH228",
      deptId: himkoshConfig.deptId || "228",
      serviceCode: himkoshConfig.serviceCode || "TRM",
      ddo: himkoshConfig.ddo || "SML10-001",
      heads: {
        registrationFee: himkoshConfig.heads.registrationFee || "0230-00-104-01",
        secondaryHead: himkoshConfig.heads.secondaryHead,
        secondaryHeadAmount: himkoshConfig.heads.secondaryHeadAmount
      },
      isConfigured: true,
      configStatus: "placeholder"
    };
  }
  console.log("[himkosh-config] \u2705 All credentials configured - production mode enabled");
  return {
    ...himkoshConfig,
    isConfigured: true,
    configStatus: "production"
  };
}

// server/himkosh/crypto.ts
var HimKoshCrypto = class {
  keyFilePath;
  key = null;
  iv = null;
  constructor(keyFilePath) {
    this.keyFilePath = resolveKeyFilePath(keyFilePath);
  }
  /**
   * Load encryption key and IV from file
   * CRITICAL FIX #3: DLL uses IV = key (first 16 bytes), NOT separate IV
   * Key file format from CTP:
   * - Must be exactly 16 bytes for the key
   * - IV is set equal to the key (actual DLL behavior)
   */
  async loadKey() {
    if (this.key && this.iv) {
      console.log("[himkosh-crypto] Using cached key/IV");
      return { key: this.key, iv: this.iv };
    }
    try {
      console.log("[himkosh-crypto] Loading key from:", this.keyFilePath);
      const keyData = await fs3.readFile(this.keyFilePath);
      console.log("[himkosh-crypto] Key file size:", keyData.length, "bytes");
      const keyBytes = Buffer.alloc(16);
      keyData.copy(keyBytes, 0, 0, Math.min(16, keyData.length));
      this.key = keyBytes;
      console.log("[himkosh-crypto] Key loaded successfully (16 bytes)");
      this.iv = keyBytes;
      console.log("[himkosh-crypto] IV set equal to key (DLL behavior)");
      return { key: this.key, iv: this.iv };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Key file not found at: ${this.keyFilePath}. Please obtain echallan.key from CTP team or set HIMKOSH_KEY_FILE_PATH.`);
    }
  }
  /**
   * Encrypt data string using AES-128-CBC
   * .NET backend expects ASCII encoding (NOT UTF-8)
   * @param textToEncrypt - Plain text string to encrypt
   * @returns Base64 encoded encrypted string
   */
  async encrypt(textToEncrypt) {
    try {
      const { key, iv } = await this.loadKey();
      const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
      let encrypted = cipher.update(textToEncrypt, "ascii", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Encryption failed: ${error.message}`);
      }
      throw error;
    }
  }
  /**
   * Decrypt data string using AES-128-CBC
   * .NET backend uses ASCII encoding (NOT UTF-8)
   * @param textToDecrypt - Base64 encoded encrypted string
   * @returns Decrypted plain text string
   */
  async decrypt(textToDecrypt) {
    try {
      const { key, iv } = await this.loadKey();
      const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
      let decrypted = decipher.update(textToDecrypt, "base64", "ascii");
      decrypted += decipher.final("ascii");
      return decrypted;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Decryption failed: ${error.message}`);
      }
      throw error;
    }
  }
  /**
   * Generate MD5 checksum for data string.
   * HimKosh reference DLL emits lowercase hexadecimal using UTF-8 bytes.
   * @param dataString - String to generate checksum for
   * @returns MD5 checksum in lowercase hexadecimal
   */
  static generateChecksum(dataString) {
    const hash = crypto.createHash("md5");
    hash.update(dataString, "utf8");
    return hash.digest("hex");
  }
  /**
   * Verify checksum of received data
   * @param dataString - Data string without checksum
   * @param receivedChecksum - Checksum to verify against
   * @returns true if checksums match (case-insensitive comparison)
   */
  static verifyChecksum(dataString, receivedChecksum) {
    const calculatedChecksum = this.generateChecksum(dataString);
    return calculatedChecksum.toUpperCase() === receivedChecksum.toUpperCase();
  }
};
function buildRequestString(params) {
  let parts = [
    `DeptID=${params.deptId}`,
    `DeptRefNo=${params.deptRefNo}`,
    `TotalAmount=${Math.round(params.totalAmount)}`,
    // Ensure integer
    `TenderBy=${params.tenderBy}`,
    `AppRefNo=${params.appRefNo}`,
    `Head1=${params.head1}`,
    `Amount1=${Math.round(params.amount1)}`
    // Ensure integer
  ];
  if (params.head2 && params.amount2 !== void 0 && Math.round(params.amount2) > 0) {
    parts.push(`Head2=${params.head2}`);
    parts.push(`Amount2=${Math.round(params.amount2)}`);
  }
  parts.push(`Ddo=${params.ddo}`);
  parts.push(`PeriodFrom=${params.periodFrom}`);
  parts.push(`PeriodTo=${params.periodTo}`);
  if (params.head3 && params.amount3 && params.amount3 > 0) {
    parts.push(`Head3=${params.head3}`);
    parts.push(`Amount3=${Math.round(params.amount3)}`);
  }
  if (params.head4 && params.amount4 && params.amount4 > 0) {
    parts.push(`Head4=${params.head4}`);
    parts.push(`Amount4=${Math.round(params.amount4)}`);
  }
  if (params.head10 && params.amount10 && params.amount10 > 0) {
    parts.push(`Head10=${params.head10}`);
    parts.push(`Amount10=${Math.round(params.amount10)}`);
  }
  if (params.serviceCode) {
    parts.push(`Service_code=${params.serviceCode}`);
  }
  if (params.returnUrl) {
    parts.push(`return_url=${params.returnUrl}`);
  }
  const dataString = parts.join("|");
  return { coreString: dataString, fullString: dataString };
}
function parseResponseString(responseString) {
  const parts = responseString.split("|");
  const data = {};
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value !== void 0) {
      data[key] = value;
    }
  }
  return {
    echTxnId: data.EchTxnId || "",
    bankCIN: data.BankCIN || "",
    bank: data.Bank || "",
    status: data.Status || "",
    statusCd: data.StatusCd || "",
    appRefNo: data.AppRefNo || "",
    amount: data.Amount || "",
    paymentDate: data.Payment_date || "",
    deptRefNo: data.DeptRefNo || "",
    bankName: data.BankName || "",
    checksum: data.checksum || ""
  };
}
function buildVerificationString(params) {
  const dataString = `AppRefNo=${params.appRefNo}|Service_code=${params.serviceCode}|merchant_code=${params.merchantCode}`;
  const checksum = HimKoshCrypto.generateChecksum(dataString);
  return `${dataString}|checkSum=${checksum}`;
}

// server/himkosh/routes.ts
import { desc as desc2, eq as eq2 } from "drizzle-orm";
import { nanoid } from "nanoid";
var router = Router();
var crypto2 = new HimKoshCrypto();
var parseEnvBool = (value) => {
  if (!value) return void 0;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return void 0;
};
router.post("/initiate", async (req, res) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({ error: "Application ID is required" });
    }
    const [application] = await db.select().from(homestayApplications).where(eq2(homestayApplications.id, applicationId)).limit(1);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (application.status !== "payment_pending" && application.status !== "verified_for_payment") {
      return res.status(400).json({
        error: "Application is not ready for payment",
        currentStatus: application.status
      });
    }
    const config = getHimKoshConfig();
    let ddoCode = config.ddo;
    if (application.district) {
      const [ddoMapping] = await db.select().from(ddoCodes).where(eq2(ddoCodes.district, application.district)).limit(1);
      if (ddoMapping) {
        ddoCode = ddoMapping.ddoCode;
        console.log(`[himkosh] Using district-specific DDO: ${ddoCode} for district: ${application.district}`);
      } else {
        console.log(`[himkosh] No DDO mapping found for district: ${application.district}, using fallback: ${config.ddo}`);
      }
    }
    const appRefNo = `HPT${Date.now()}${nanoid(6)}`.substring(0, 20);
    if (!application.totalFee) {
      return res.status(400).json({ error: "Total fee not calculated for this application" });
    }
    const actualAmount = Math.round(parseFloat(application.totalFee.toString()));
    const [testModeSetting] = await db.select().from(systemSettings).where(eq2(systemSettings.settingKey, "payment_test_mode")).limit(1);
    const envTestOverride = parseEnvBool(process.env.HIMKOSH_TEST_MODE) ?? parseEnvBool(process.env.HIMKOSH_FORCE_TEST_MODE);
    const isTestMode = envTestOverride !== void 0 ? envTestOverride : testModeSetting ? testModeSetting.settingValue.enabled : false;
    const gatewayAmount = isTestMode ? 1 : actualAmount;
    if (isTestMode) {
      console.log(`[himkosh] \u{1F9EA} TEST PAYMENT MODE ACTIVE - Sending \u20B91 to gateway instead of \u20B9${actualAmount}`);
    }
    const now = /* @__PURE__ */ new Date();
    const periodDate = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    const requestParams = {
      deptId: config.deptId,
      deptRefNo: application.applicationNumber,
      totalAmount: gatewayAmount,
      // Use gateway amount (₹1 in test mode)
      tenderBy: application.ownerName,
      appRefNo,
      head1: config.heads.registrationFee,
      amount1: gatewayAmount,
      // Use gateway amount (₹1 in test mode)
      ddo: ddoCode,
      periodFrom: periodDate,
      periodTo: periodDate,
      serviceCode: config.serviceCode,
      returnUrl: config.returnUrl
    };
    const secondaryHead = config.heads.secondaryHead;
    const secondaryAmountRaw = Number(config.heads.secondaryHeadAmount ?? 0);
    if (secondaryHead && secondaryAmountRaw > 0) {
      requestParams.head2 = secondaryHead;
      requestParams.amount2 = Math.round(secondaryAmountRaw);
    }
    const { coreString, fullString } = buildRequestString(requestParams);
    const checksum = HimKoshCrypto.generateChecksum(coreString);
    const requestStringWithChecksum = `${fullString}|checkSum=${checksum}`;
    const encryptedData = await crypto2.encrypt(requestStringWithChecksum);
    console.log("[himkosh] Transaction values:", {
      merchantCode: config.merchantCode,
      merchantCodeLen: config.merchantCode?.length,
      deptId: config.deptId,
      deptIdLen: config.deptId?.length,
      serviceCode: config.serviceCode,
      serviceCodeLen: config.serviceCode?.length,
      ddo: ddoCode,
      ddoLen: ddoCode?.length,
      head1: config.heads.registrationFee,
      head1Len: config.heads.registrationFee?.length
    });
    console.log("[himkosh-encryption] CORE string (for checksum):", coreString);
    console.log("[himkosh-encryption] FULL string (before checksum):", fullString);
    console.log("[himkosh-encryption] Checksum calculated on CORE:", checksum);
    console.log("[himkosh-encryption] Full string WITH checksum (what we encrypt):", requestStringWithChecksum);
    console.log("[himkosh-encryption] Full string length:", requestStringWithChecksum.length);
    console.log("[himkosh-encryption] Encrypted data:", encryptedData);
    console.log("[himkosh-encryption] Encrypted length:", encryptedData.length);
    await db.insert(himkoshTransactions).values({
      applicationId,
      deptRefNo: application.applicationNumber,
      appRefNo,
      totalAmount: gatewayAmount,
      // Store what was sent to gateway
      tenderBy: application.ownerName,
      merchantCode: config.merchantCode,
      deptId: config.deptId,
      serviceCode: config.serviceCode,
      ddo: ddoCode,
      head1: config.heads.registrationFee,
      amount1: gatewayAmount,
      // Store what was sent to gateway
      head2: requestParams.head2,
      amount2: requestParams.amount2,
      periodFrom: periodDate,
      periodTo: periodDate,
      encryptedRequest: encryptedData,
      requestChecksum: checksum,
      transactionStatus: "initiated"
    });
    const response = {
      success: true,
      paymentUrl: config.paymentUrl,
      merchantCode: config.merchantCode,
      encdata: encryptedData,
      checksum,
      // CRITICAL: Send checksum separately (NOT encrypted)
      appRefNo,
      totalAmount: gatewayAmount,
      // Gateway amount (₹1 in test mode)
      actualAmount,
      // Actual calculated fee (for display purposes)
      isTestMode,
      // Flag to indicate test mode
      isConfigured: config.isConfigured,
      configStatus: config.configStatus || "production",
      message: isTestMode ? `\u{1F9EA} Test mode active: Gateway receives \u20B9${gatewayAmount.toLocaleString("en-IN")}` : "Payment initiated successfully."
    };
    console.log("[himkosh] Response isConfigured:", config.isConfigured);
    console.log("[himkosh] Response isTestMode:", isTestMode);
    res.json(response);
  } catch (error) {
    console.error("HimKosh initiation error:", error);
    res.status(500).json({
      error: "Failed to initiate payment",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router.get("/callback", (_req, res) => {
  res.status(200).send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>HimKosh Payment</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f5f7fb; margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; color:#0f172a; }
          .card { background:#fff; border-radius:16px; padding:32px; box-shadow:0 20px 45px rgba(15,23,42,0.12); max-width:420px; text-align:center; }
          h1 { font-size:1.5rem; margin-bottom:0.5rem; }
          p { margin:0.25rem 0; color:#334155; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Processing Payment</h1>
          <p>HimKosh is completing your transaction and will return you to the HP Tourism portal automatically.</p>
          <p>You can safely close this tab once the confirmation appears in the main window.</p>
        </div>
      </body>
    </html>
  `);
});
router.post("/callback", async (req, res) => {
  try {
    const { encdata } = req.body;
    if (!encdata) {
      return res.status(400).send("Missing payment response data");
    }
    const decryptedData = await crypto2.decrypt(encdata);
    const parsedResponse = parseResponseString(decryptedData);
    const dataWithoutChecksum = decryptedData.substring(0, decryptedData.lastIndexOf("|checksum="));
    const isValid = HimKoshCrypto.verifyChecksum(dataWithoutChecksum, parsedResponse.checksum);
    if (!isValid) {
      console.error("HimKosh callback: Checksum verification failed");
      return res.status(400).send("Invalid checksum");
    }
    const [transaction] = await db.select().from(himkoshTransactions).where(eq2(himkoshTransactions.appRefNo, parsedResponse.appRefNo)).limit(1);
    if (!transaction) {
      console.error("HimKosh callback: Transaction not found:", parsedResponse.appRefNo);
      return res.status(404).send("Transaction not found");
    }
    await db.update(himkoshTransactions).set({
      echTxnId: parsedResponse.echTxnId,
      bankCIN: parsedResponse.bankCIN,
      bankName: parsedResponse.bankName,
      paymentDate: parsedResponse.paymentDate,
      status: parsedResponse.status,
      statusCd: parsedResponse.statusCd,
      responseChecksum: parsedResponse.checksum,
      transactionStatus: parsedResponse.statusCd === "1" ? "success" : "failed",
      respondedAt: /* @__PURE__ */ new Date(),
      challanPrintUrl: parsedResponse.statusCd === "1" ? `${getHimKoshConfig().challanPrintUrl}?reportName=PaidChallan&TransId=${parsedResponse.echTxnId}` : void 0
    }).where(eq2(himkoshTransactions.id, transaction.id));
    if (parsedResponse.statusCd === "1") {
      const year = (/* @__PURE__ */ new Date()).getFullYear();
      const randomSuffix = Math.floor(1e4 + Math.random() * 9e4);
      const certificateNumber = `HP-HST-${year}-${randomSuffix}`;
      const issueDate = /* @__PURE__ */ new Date();
      const expiryDate = /* @__PURE__ */ new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      await db.update(homestayApplications).set({
        status: "approved",
        certificateNumber,
        certificateIssuedDate: issueDate,
        certificateExpiryDate: expiryDate,
        approvedAt: issueDate
      }).where(eq2(homestayApplications.id, transaction.applicationId));
    }
    res.redirect(`${process.env.VITE_FRONTEND_URL || ""}/application/${transaction.applicationId}?payment=${parsedResponse.statusCd === "1" ? "success" : "failed"}&himgrn=${parsedResponse.echTxnId}`);
  } catch (error) {
    console.error("HimKosh callback error:", error);
    res.status(500).send("Payment processing failed");
  }
});
router.post("/verify/:appRefNo", async (req, res) => {
  try {
    const { appRefNo } = req.params;
    const config = getHimKoshConfig();
    const verificationString = buildVerificationString({
      appRefNo,
      serviceCode: config.serviceCode,
      merchantCode: config.merchantCode
    });
    const encryptedData = await crypto2.encrypt(verificationString);
    const response = await fetch(config.verificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `encdata=${encodeURIComponent(encryptedData)}`
    });
    const responseData = await response.text();
    const parts = responseData.split("|");
    const verificationData = {};
    for (const part of parts) {
      const [key, value] = part.split("=");
      if (key && value !== void 0) {
        verificationData[key] = value;
      }
    }
    const [transaction] = await db.select().from(himkoshTransactions).where(eq2(himkoshTransactions.appRefNo, appRefNo)).limit(1);
    if (transaction) {
      await db.update(himkoshTransactions).set({
        isDoubleVerified: true,
        doubleVerificationDate: /* @__PURE__ */ new Date(),
        doubleVerificationData: verificationData,
        verifiedAt: /* @__PURE__ */ new Date()
      }).where(eq2(himkoshTransactions.id, transaction.id));
    }
    res.json({
      success: true,
      verified: verificationData.TXN_STAT === "1",
      data: verificationData
    });
  } catch (error) {
    console.error("HimKosh verification error:", error);
    res.status(500).json({
      error: "Verification failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
router.get("/transactions", async (req, res) => {
  try {
    const transactions = await db.select().from(himkoshTransactions).orderBy(himkoshTransactions.createdAt);
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});
router.get("/transaction/:appRefNo", async (req, res) => {
  try {
    const { appRefNo } = req.params;
    const [transaction] = await db.select().from(himkoshTransactions).where(eq2(himkoshTransactions.appRefNo, appRefNo)).limit(1);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});
router.get("/application/:applicationId/transactions", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const sessionUserId = req.session?.userId;
    if (!sessionUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const [application] = await db.select({
      id: homestayApplications.id,
      ownerId: homestayApplications.userId
    }).from(homestayApplications).where(eq2(homestayApplications.id, applicationId)).limit(1);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (application.ownerId !== sessionUserId) {
      const [actor] = await db.select({ role: users.role }).from(users).where(eq2(users.id, sessionUserId)).limit(1);
      const allowedOfficerRoles = /* @__PURE__ */ new Set([
        "district_officer",
        "state_officer",
        "dealing_assistant",
        "district_tourism_officer",
        "super_admin",
        "admin"
      ]);
      if (!actor || !allowedOfficerRoles.has(actor.role)) {
        return res.status(403).json({ error: "Access denied for this application" });
      }
    }
    const transactions = await db.select().from(himkoshTransactions).where(eq2(himkoshTransactions.applicationId, applicationId)).orderBy(desc2(himkoshTransactions.createdAt));
    res.json({ transactions });
  } catch (error) {
    console.error("Error fetching application transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});
router.post("/application/:applicationId/reset", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const sessionUserId = req.session?.userId;
    if (!sessionUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const [application] = await db.select({
      id: homestayApplications.id,
      ownerId: homestayApplications.userId
    }).from(homestayApplications).where(eq2(homestayApplications.id, applicationId)).limit(1);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (application.ownerId !== sessionUserId) {
      const [actor] = await db.select({ role: users.role }).from(users).where(eq2(users.id, sessionUserId)).limit(1);
      const allowedOfficerRoles = /* @__PURE__ */ new Set([
        "district_officer",
        "state_officer",
        "dealing_assistant",
        "district_tourism_officer",
        "super_admin",
        "admin"
      ]);
      if (!actor || !allowedOfficerRoles.has(actor.role)) {
        return res.status(403).json({ error: "Access denied for this application" });
      }
    }
    const [latestTransaction] = await db.select().from(himkoshTransactions).where(eq2(himkoshTransactions.applicationId, applicationId)).orderBy(desc2(himkoshTransactions.createdAt)).limit(1);
    if (!latestTransaction) {
      return res.status(404).json({ error: "No transactions found for this application" });
    }
    const finalStates = /* @__PURE__ */ new Set(["success", "failed", "verified"]);
    if (finalStates.has(latestTransaction.transactionStatus ?? "")) {
      return res.status(400).json({ error: "Latest transaction is already complete" });
    }
    await db.update(himkoshTransactions).set({
      transactionStatus: "failed",
      status: "Cancelled by applicant",
      statusCd: "0",
      respondedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(himkoshTransactions.id, latestTransaction.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error resetting HimKosh transaction:", error);
    res.status(500).json({ error: "Failed to reset transaction" });
  }
});
router.get("/config/status", (req, res) => {
  const config = getHimKoshConfig();
  res.json({
    configured: config.isConfigured,
    merchantCode: config.merchantCode,
    deptId: config.deptId,
    serviceCode: config.serviceCode,
    returnUrl: config.returnUrl
  });
});
router.post("/test-callback-url", async (req, res) => {
  try {
    const { callbackUrl, applicationId } = req.body;
    if (!callbackUrl || !applicationId) {
      return res.status(400).json({ error: "callbackUrl and applicationId are required" });
    }
    const [application] = await db.select().from(homestayApplications).where(eq2(homestayApplications.id, applicationId)).limit(1);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    const config = getHimKoshConfig();
    let ddoCode = config.ddo;
    if (application.district) {
      const [ddoMapping] = await db.select().from(ddoCodes).where(eq2(ddoCodes.district, application.district)).limit(1);
      if (ddoMapping) {
        ddoCode = ddoMapping.ddoCode;
      }
    }
    const appRefNo = `HPT${Date.now()}${nanoid(6)}`.substring(0, 20);
    if (!application.totalFee) {
      return res.status(400).json({ error: "Total fee not calculated for this application" });
    }
    const totalAmount = Math.round(parseFloat(application.totalFee.toString()));
    const now = /* @__PURE__ */ new Date();
    const periodDate = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    const requestParams = {
      deptId: config.deptId,
      deptRefNo: application.applicationNumber,
      totalAmount,
      tenderBy: application.ownerName,
      appRefNo,
      head1: config.heads.registrationFee,
      amount1: totalAmount,
      head2: config.heads.registrationFee,
      amount2: 0,
      ddo: ddoCode,
      periodFrom: periodDate,
      periodTo: periodDate,
      serviceCode: config.serviceCode,
      returnUrl: callbackUrl
      // Use the test callback URL
    };
    const { coreString, fullString } = buildRequestString(requestParams);
    const checksumCalc = HimKoshCrypto.generateChecksum(coreString);
    const fullStringWithChecksum = `${fullString}|checkSum=${checksumCalc}`;
    const encrypted = await crypto2.encrypt(fullStringWithChecksum);
    console.log("[himkosh-test] Testing callback URL:", callbackUrl);
    console.log("[himkosh-test] CORE string (for checksum):", coreString);
    console.log("[himkosh-test] FULL string (before checksum):", fullString);
    console.log("[himkosh-test] Checksum (on CORE only):", checksumCalc);
    res.json({
      success: true,
      testUrl: callbackUrl,
      checksum: checksumCalc,
      coreString,
      fullString,
      fullStringWithChecksum,
      encrypted,
      paymentUrl: `${config.paymentUrl}?encdata=${encodeURIComponent(encrypted)}&merchant_code=${config.merchantCode}`,
      message: "FIXED: Checksum now calculated on CORE string only (excluding Service_code/return_url)"
    });
  } catch (error) {
    console.error("[himkosh-test] Error:", error);
    res.status(500).json({ error: "Failed to generate test data" });
  }
});
var routes_default = router;

// server/routes.ts
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
var normalizeStringField = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};
var preprocessNumericInput = (val) => {
  if (typeof val === "number") {
    return Number.isNaN(val) ? void 0 : val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed.toLowerCase() === "nan") {
      return void 0;
    }
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? void 0 : trimmed;
  }
  return val;
};
var coerceNumberField = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};
var removeUndefined = (obj) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value !== void 0)
);
var normalizeDocumentsForPersistence = (docs) => {
  if (!Array.isArray(docs)) {
    return void 0;
  }
  const normalized = docs.map((doc, index) => {
    const documentType = doc.documentType || doc.type || "supporting_document";
    const fileName = doc.fileName || doc.name || `Document ${index + 1}`;
    const filePath = doc.filePath || doc.fileUrl || doc.url;
    if (!filePath || typeof filePath !== "string") {
      return null;
    }
    let fileSize = doc.fileSize;
    if (typeof fileSize === "string") {
      const parsed = Number(fileSize);
      fileSize = Number.isFinite(parsed) ? parsed : void 0;
    }
    const resolvedSize = typeof fileSize === "number" && Number.isFinite(fileSize) ? fileSize : 0;
    return {
      id: doc.id && typeof doc.id === "string" ? doc.id : randomUUID3(),
      documentType,
      fileName,
      filePath,
      fileSize: resolvedSize,
      mimeType: doc.mimeType && typeof doc.mimeType === "string" && doc.mimeType.length > 0 ? doc.mimeType : "application/octet-stream",
      name: fileName,
      type: documentType,
      url: filePath,
      uploadedAt: doc.uploadedAt,
      required: typeof doc.required === "boolean" ? doc.required : void 0
    };
  }).filter((doc) => Boolean(doc));
  return normalized;
};
var resolveTehsilFields = (rawTehsil, rawTehsilOther) => {
  const tehsilString = typeof rawTehsil === "string" ? rawTehsil.trim() : "";
  const tehsilOtherString = typeof rawTehsilOther === "string" ? rawTehsilOther.trim() : "";
  const isPlaceholder = tehsilString.length === 0 || tehsilString.toLowerCase() === "not provided" || tehsilString === "__other" || tehsilString === "__manual";
  const resolvedTehsil = !isPlaceholder && tehsilString.length > 0 ? tehsilString : tehsilOtherString.length > 0 ? tehsilOtherString : "Not Provided";
  const resolvedTehsilOther = tehsilOtherString.length > 0 ? tehsilOtherString : null;
  return {
    tehsil: resolvedTehsil,
    tehsilOther: resolvedTehsilOther
  };
};
var sanitizeDraftForPersistence = (validatedData, user) => {
  const normalizedDocuments = normalizeDocumentsForPersistence(
    validatedData.documents
  );
  const { tehsil: resolvedTehsil, tehsilOther: resolvedTehsilOther } = resolveTehsilFields(validatedData.tehsil, validatedData.tehsilOther);
  return {
    ...validatedData,
    propertyName: normalizeStringField(
      validatedData.propertyName,
      "Draft Homestay"
    ),
    category: validatedData.category || "silver",
    locationType: validatedData.locationType || "gp",
    district: normalizeStringField(validatedData.district),
    tehsil: resolvedTehsil,
    tehsilOther: resolvedTehsilOther,
    block: normalizeStringField(validatedData.block),
    blockOther: normalizeStringField(validatedData.blockOther),
    gramPanchayat: normalizeStringField(validatedData.gramPanchayat),
    gramPanchayatOther: normalizeStringField(validatedData.gramPanchayatOther),
    urbanBody: normalizeStringField(validatedData.urbanBody),
    urbanBodyOther: normalizeStringField(validatedData.urbanBodyOther),
    ward: normalizeStringField(validatedData.ward),
    address: normalizeStringField(validatedData.address),
    pincode: normalizeStringField(validatedData.pincode),
    telephone: normalizeStringField(validatedData.telephone),
    ownerName: normalizeStringField(
      validatedData.ownerName,
      normalizeStringField(user?.fullName, "Draft Owner")
    ),
    ownerGender: validatedData.ownerGender || "other",
    ownerMobile: normalizeStringField(
      validatedData.ownerMobile,
      normalizeStringField(user?.mobile, "0000000000")
    ),
    ownerEmail: normalizeStringField(
      validatedData.ownerEmail,
      normalizeStringField(user?.email, "")
    ),
    ownerAadhaar: normalizeStringField(validatedData.ownerAadhaar, "000000000000"),
    propertyOwnership: validatedData.propertyOwnership === "leased" ? "leased" : "owned",
    projectType: validatedData.projectType || "new_project",
    propertyArea: coerceNumberField(validatedData.propertyArea),
    singleBedRooms: coerceNumberField(validatedData.singleBedRooms),
    singleBedRoomSize: coerceNumberField(validatedData.singleBedRoomSize),
    singleBedRoomRate: coerceNumberField(validatedData.singleBedRoomRate),
    doubleBedRooms: coerceNumberField(validatedData.doubleBedRooms),
    doubleBedRoomSize: coerceNumberField(validatedData.doubleBedRoomSize),
    doubleBedRoomRate: coerceNumberField(validatedData.doubleBedRoomRate),
    familySuites: coerceNumberField(validatedData.familySuites),
    familySuiteSize: coerceNumberField(validatedData.familySuiteSize),
    familySuiteRate: coerceNumberField(validatedData.familySuiteRate),
    attachedWashrooms: coerceNumberField(validatedData.attachedWashrooms),
    gstin: normalizeStringField(validatedData.gstin),
    selectedCategory: validatedData.selectedCategory || validatedData.category || "silver",
    averageRoomRate: coerceNumberField(validatedData.averageRoomRate),
    highestRoomRate: coerceNumberField(validatedData.highestRoomRate),
    lowestRoomRate: coerceNumberField(validatedData.lowestRoomRate),
    certificateValidityYears: validatedData.certificateValidityYears ?? 1,
    isPangiSubDivision: validatedData.isPangiSubDivision ?? false,
    distanceAirport: coerceNumberField(validatedData.distanceAirport),
    distanceRailway: coerceNumberField(validatedData.distanceRailway),
    distanceCityCenter: coerceNumberField(validatedData.distanceCityCenter),
    distanceShopping: coerceNumberField(validatedData.distanceShopping),
    distanceBusStand: coerceNumberField(validatedData.distanceBusStand),
    lobbyArea: coerceNumberField(validatedData.lobbyArea),
    diningArea: coerceNumberField(validatedData.diningArea),
    parkingArea: normalizeStringField(validatedData.parkingArea),
    ecoFriendlyFacilities: normalizeStringField(
      validatedData.ecoFriendlyFacilities
    ),
    differentlyAbledFacilities: normalizeStringField(
      validatedData.differentlyAbledFacilities
    ),
    fireEquipmentDetails: normalizeStringField(
      validatedData.fireEquipmentDetails
    ),
    nearestHospital: normalizeStringField(validatedData.nearestHospital),
    baseFee: coerceNumberField(validatedData.baseFee),
    totalBeforeDiscounts: coerceNumberField(validatedData.totalBeforeDiscounts),
    validityDiscount: coerceNumberField(validatedData.validityDiscount),
    femaleOwnerDiscount: coerceNumberField(validatedData.femaleOwnerDiscount),
    pangiDiscount: coerceNumberField(validatedData.pangiDiscount),
    totalDiscount: coerceNumberField(validatedData.totalDiscount),
    totalFee: coerceNumberField(validatedData.totalFee),
    perRoomFee: coerceNumberField(validatedData.perRoomFee),
    gstAmount: coerceNumberField(validatedData.gstAmount),
    documents: normalizedDocuments ?? [],
    currentPage: validatedData.currentPage ?? 1,
    status: "draft"
  };
};
async function registerRoutes(app2) {
  const PgSession = connectPgSimple(session);
  app2.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || "hp-tourism-secret-dev-only",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        // Set to false for HTTP (non-HTTPS) deployments
        httpOnly: true,
        maxAge: 1e3 * 60 * 60 * 24 * 7
        // 7 days
      }
    })
  );
  if (OBJECT_STORAGE_MODE === "local") {
    const uploadLimitMb = Math.max(1, Math.ceil(LOCAL_MAX_UPLOAD_BYTES / (1024 * 1024)));
    const rawUploadMiddleware = express.raw({ type: "*/*", limit: `${uploadLimitMb}mb` });
    app2.put(
      "/api/local-object/upload/:objectId",
      requireAuth,
      rawUploadMiddleware,
      async (req, res) => {
        try {
          if (!Buffer.isBuffer(req.body)) {
            return res.status(400).json({ message: "Upload payload missing" });
          }
          const objectId = req.params.objectId;
          const fileType = req.query.type || "document";
          const safeType = fileType.replace(/[^a-zA-Z0-9_-]/g, "");
          const targetDir = path3.join(LOCAL_OBJECT_DIR, `${safeType}s`);
          await fsPromises2.mkdir(targetDir, { recursive: true });
          const targetPath = path3.join(targetDir, objectId);
          await fsPromises2.writeFile(targetPath, req.body);
          res.status(200).json({ success: true });
        } catch (error) {
          console.error("Local upload error", error);
          res.status(500).json({ message: "Failed to store uploaded file" });
        }
      }
    );
    app2.get(
      "/api/local-object/download/:objectId",
      requireAuth,
      async (req, res) => {
        try {
          const objectId = req.params.objectId;
          const fileType = req.query.type || "document";
          const safeType = fileType.replace(/[^a-zA-Z0-9_-]/g, "");
          const filePath = path3.join(LOCAL_OBJECT_DIR, `${safeType}s`, objectId);
          await fsPromises2.access(filePath, fs4.constants.R_OK);
          res.setHeader("Content-Type", "application/octet-stream");
          res.setHeader(
            "Content-Disposition",
            `inline; filename="${objectId}"`
          );
          const stream = fs4.createReadStream(filePath);
          stream.on("error", (err) => {
            console.error("Stream error", err);
            res.destroy(err);
          });
          stream.pipe(res);
        } catch (error) {
          console.error("Local download error", error);
          res.status(404).json({ message: "File not found" });
        }
      }
    );
  }
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const rawData = {
        ...req.body,
        role: "property_owner",
        // FORCE property_owner role - override any client input
        email: req.body.email || void 0,
        aadhaarNumber: req.body.aadhaarNumber || void 0,
        district: req.body.district || void 0
      };
      const data = insertUserSchema.parse(rawData);
      const existing = await storage.getUserByMobile(data.mobile);
      if (existing) {
        return res.status(400).json({ message: "Mobile number already registered" });
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword
      });
      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("[registration] Error during registration:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: error.errors[0].message, errors: error.errors });
      }
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        if ("constraint" in error && error.constraint === "users_aadhaar_number_unique") {
          return res.status(400).json({
            message: "This Aadhaar number is already registered. Please login or use a different Aadhaar number."
          });
        }
      }
      res.status(500).json({ message: "Registration failed", error: error instanceof Error ? error.message : String(error) });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { mobile, password } = req.body;
      if (!mobile || !password) {
        return res.status(400).json({ message: "Mobile and password required" });
      }
      const user = await storage.getUserByMobile(mobile);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const bcrypt2 = await import("bcrypt");
      const passwordMatch = await bcrypt2.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: "Account deactivated" });
      }
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });
  app2.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const [profile] = await db.select().from(userProfiles).where(eq3(userProfiles.userId, userId)).limit(1);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("[profile] Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  app2.post("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const profileData = insertUserProfileSchema.parse(req.body);
      const [existingProfile] = await db.select().from(userProfiles).where(eq3(userProfiles.userId, userId)).limit(1);
      let profile;
      if (existingProfile) {
        [profile] = await db.update(userProfiles).set({
          ...profileData,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(userProfiles.userId, userId)).returning();
      } else {
        [profile] = await db.insert(userProfiles).values({
          ...profileData,
          userId
        }).returning();
      }
      res.json({
        profile,
        message: existingProfile ? "Profile updated successfully" : "Profile created successfully"
      });
    } catch (error) {
      console.error("[profile] Error saving profile:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: error.errors[0].message,
          errors: error.errors
        });
      }
      res.status(500).json({ message: "Failed to save profile" });
    }
  });
  app2.get("/api/upload-url", requireAuth, async (req, res) => {
    try {
      const fileType = req.query.fileType || "document";
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getUploadURL(fileType);
      const filePath = objectStorageService.normalizeObjectPath(uploadURL);
      res.json({ uploadUrl: uploadURL, filePath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });
  app2.get("/api/object-storage/view", requireAuth, async (req, res) => {
    try {
      const filePath = req.query.path;
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      const objectStorageService = new ObjectStorageService();
      const viewURL = await objectStorageService.getViewURL(filePath);
      res.redirect(viewURL);
    } catch (error) {
      console.error("Error getting view URL:", error);
      res.status(500).json({ message: "Failed to get view URL" });
    }
  });
  app2.post("/api/applications/draft", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const draftSchema = z2.object({
        propertyName: z2.string().optional(),
        category: z2.enum(["diamond", "gold", "silver"]).optional(),
        address: z2.string().optional(),
        district: z2.string().optional(),
        pincode: z2.string().optional(),
        locationType: z2.enum(["mc", "tcp", "gp"]).optional(),
        telephone: z2.string().optional(),
        ownerName: z2.string().optional(),
        ownerMobile: z2.string().optional(),
        ownerEmail: z2.string().optional(),
        ownerAadhaar: z2.string().optional(),
        proposedRoomRate: z2.coerce.number().optional(),
        singleBedRoomRate: z2.coerce.number().optional(),
        doubleBedRoomRate: z2.coerce.number().optional(),
        familySuiteRate: z2.coerce.number().optional(),
        projectType: z2.enum(["new_rooms", "new_project"]).optional(),
        propertyArea: z2.coerce.number().optional(),
        singleBedRooms: z2.coerce.number().optional(),
        singleBedRoomSize: z2.coerce.number().optional(),
        doubleBedRooms: z2.coerce.number().optional(),
        doubleBedRoomSize: z2.coerce.number().optional(),
        familySuites: z2.coerce.number().optional(),
        familySuiteSize: z2.coerce.number().optional(),
        attachedWashrooms: z2.coerce.number().optional(),
        gstin: z2.string().optional(),
        distanceAirport: z2.coerce.number().optional(),
        distanceRailway: z2.coerce.number().optional(),
        distanceCityCenter: z2.coerce.number().optional(),
        distanceShopping: z2.coerce.number().optional(),
        distanceBusStand: z2.coerce.number().optional(),
        lobbyArea: z2.coerce.number().optional(),
        diningArea: z2.coerce.number().optional(),
        parkingArea: z2.string().optional(),
        ecoFriendlyFacilities: z2.string().optional(),
        differentlyAbledFacilities: z2.string().optional(),
        fireEquipmentDetails: z2.string().optional(),
        nearestHospital: z2.string().optional(),
        amenities: z2.any().optional(),
        // 2025 Fee Structure - handle NaN for incomplete drafts
        baseFee: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        totalBeforeDiscounts: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        validityDiscount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        femaleOwnerDiscount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        pangiDiscount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        totalDiscount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        totalFee: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        // Legacy fields
        perRoomFee: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        gstAmount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        // 2025 Fields
        certificateValidityYears: z2.coerce.number().optional(),
        isPangiSubDivision: z2.boolean().optional(),
        ownerGender: z2.enum(["male", "female", "other"]).optional(),
        latitude: z2.string().optional(),
        longitude: z2.string().optional(),
        currentPage: z2.coerce.number().optional(),
        // Track which page user was on
        documents: z2.array(z2.any()).optional()
      }).passthrough();
      const existingApps = await storage.getApplicationsByUser(userId);
      if (existingApps.length > 0) {
        const existing = existingApps[0];
        if (existing.status === "draft") {
          return res.json({
            application: existing,
            message: "Existing draft loaded"
          });
        }
        return res.status(409).json({
          message: "Only one homestay application is permitted per owner account (HP Tourism Rules 2025). Please continue the existing application.",
          existingApplicationId: existing.id,
          status: existing.status
        });
      }
      const validatedData = draftSchema.parse(req.body);
      const user = await storage.getUser(userId);
      const sanitizedDraft = sanitizeDraftForPersistence(validatedData, user);
      const totalRooms = (sanitizedDraft.singleBedRooms || 0) + (sanitizedDraft.doubleBedRooms || 0) + (sanitizedDraft.familySuites || 0);
      const application = await storage.createApplication({
        ...sanitizedDraft,
        userId,
        totalRooms: totalRooms || 0,
        status: "draft"
        // Explicitly set as draft
      });
      res.json({
        application,
        message: "Draft saved successfully. You can continue editing anytime."
      });
    } catch (error) {
      console.error("Draft save error:", error);
      res.status(500).json({ message: "Failed to save draft" });
    }
  });
  app2.patch("/api/applications/:id/draft", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const existing = await storage.getApplication(id);
      if (!existing) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this application" });
      }
      if (existing.status !== "draft") {
        return res.status(400).json({ message: "Can only update draft applications" });
      }
      const draftSchema = z2.object({
        propertyName: z2.string().optional(),
        category: z2.enum(["diamond", "gold", "silver"]).optional(),
        address: z2.string().optional(),
        district: z2.string().optional(),
        pincode: z2.string().optional(),
        locationType: z2.enum(["mc", "tcp", "gp"]).optional(),
        telephone: z2.string().optional(),
        ownerName: z2.string().optional(),
        ownerMobile: z2.string().optional(),
        ownerEmail: z2.string().optional(),
        ownerAadhaar: z2.string().optional(),
        proposedRoomRate: z2.coerce.number().optional(),
        singleBedRoomRate: z2.coerce.number().optional(),
        doubleBedRoomRate: z2.coerce.number().optional(),
        familySuiteRate: z2.coerce.number().optional(),
        projectType: z2.enum(["new_rooms", "new_project"]).optional(),
        propertyArea: z2.coerce.number().optional(),
        singleBedRooms: z2.coerce.number().optional(),
        singleBedRoomSize: z2.coerce.number().optional(),
        doubleBedRooms: z2.coerce.number().optional(),
        doubleBedRoomSize: z2.coerce.number().optional(),
        familySuites: z2.coerce.number().optional(),
        familySuiteSize: z2.coerce.number().optional(),
        attachedWashrooms: z2.coerce.number().optional(),
        gstin: z2.string().optional(),
        distanceAirport: z2.coerce.number().optional(),
        distanceRailway: z2.coerce.number().optional(),
        distanceCityCenter: z2.coerce.number().optional(),
        distanceShopping: z2.coerce.number().optional(),
        distanceBusStand: z2.coerce.number().optional(),
        lobbyArea: z2.coerce.number().optional(),
        diningArea: z2.coerce.number().optional(),
        parkingArea: z2.string().optional(),
        ecoFriendlyFacilities: z2.string().optional(),
        differentlyAbledFacilities: z2.string().optional(),
        fireEquipmentDetails: z2.string().optional(),
        nearestHospital: z2.string().optional(),
        amenities: z2.any().optional(),
        // 2025 Fee Structure - handle NaN for incomplete drafts
        baseFee: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        totalBeforeDiscounts: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        validityDiscount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        femaleOwnerDiscount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        pangiDiscount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        totalDiscount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        totalFee: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        // Legacy fields
        perRoomFee: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        gstAmount: z2.preprocess(preprocessNumericInput, z2.coerce.number().optional()),
        // 2025 Fields
        certificateValidityYears: z2.coerce.number().optional(),
        isPangiSubDivision: z2.boolean().optional(),
        ownerGender: z2.enum(["male", "female", "other"]).optional(),
        latitude: z2.string().optional(),
        longitude: z2.string().optional(),
        currentPage: z2.coerce.number().optional(),
        // Track which page user was on
        documents: z2.array(z2.any()).optional()
      }).passthrough();
      const validatedData = draftSchema.parse(req.body);
      const user = await storage.getUser(userId);
      const sanitizedDraft = sanitizeDraftForPersistence(validatedData, user);
      const totalRooms = (sanitizedDraft.singleBedRooms || 0) + (sanitizedDraft.doubleBedRooms || 0) + (sanitizedDraft.familySuites || 0);
      const updated = await storage.updateApplication(id, {
        ...sanitizedDraft,
        totalRooms: totalRooms || existing.totalRooms
      });
      res.json({
        application: updated,
        message: "Draft updated successfully"
      });
    } catch (error) {
      console.error("Draft update error:", error);
      res.status(500).json({ message: "Failed to update draft" });
    }
  });
  app2.post("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const ownerSubmittableSchema = z2.object({
        // Basic property info
        propertyName: z2.string(),
        category: z2.enum(["diamond", "gold", "silver"]),
        address: z2.string(),
        district: z2.string(),
        pincode: z2.string(),
        locationType: z2.enum(["mc", "tcp", "gp"]),
        telephone: z2.string().optional(),
        block: z2.string().optional(),
        blockOther: z2.string().optional(),
        gramPanchayat: z2.string().optional(),
        gramPanchayatOther: z2.string().optional(),
        urbanBody: z2.string().optional(),
        urbanBodyOther: z2.string().optional(),
        ward: z2.string().optional(),
        // Owner info
        ownerName: z2.string(),
        ownerMobile: z2.string(),
        ownerEmail: z2.string().optional(),
        ownerAadhaar: z2.string(),
        propertyOwnership: z2.enum(["owned", "leased"]).optional(),
        // Room & category details
        proposedRoomRate: z2.coerce.number(),
        singleBedRoomRate: z2.coerce.number().optional(),
        doubleBedRoomRate: z2.coerce.number().optional(),
        familySuiteRate: z2.coerce.number().optional(),
        projectType: z2.enum(["new_rooms", "new_project"]),
        propertyArea: z2.coerce.number(),
        singleBedRooms: z2.coerce.number().optional(),
        singleBedRoomSize: z2.coerce.number().optional(),
        doubleBedRooms: z2.coerce.number().optional(),
        doubleBedRoomSize: z2.coerce.number().optional(),
        familySuites: z2.coerce.number().optional(),
        familySuiteSize: z2.coerce.number().optional(),
        attachedWashrooms: z2.coerce.number(),
        gstin: z2.string().optional(),
        // Distances (in km)
        distanceAirport: z2.coerce.number().optional(),
        distanceRailway: z2.coerce.number().optional(),
        distanceCityCenter: z2.coerce.number().optional(),
        distanceShopping: z2.coerce.number().optional(),
        distanceBusStand: z2.coerce.number().optional(),
        // Public areas
        lobbyArea: z2.coerce.number().optional(),
        diningArea: z2.coerce.number().optional(),
        parkingArea: z2.string().optional(),
        // Additional facilities
        ecoFriendlyFacilities: z2.string().optional(),
        differentlyAbledFacilities: z2.string().optional(),
        fireEquipmentDetails: z2.string().optional(),
        nearestHospital: z2.string().optional(),
        // Amenities
        amenities: z2.any().optional(),
        // 2025 Fee Structure
        baseFee: z2.coerce.number(),
        totalBeforeDiscounts: z2.coerce.number().optional(),
        validityDiscount: z2.coerce.number().optional(),
        femaleOwnerDiscount: z2.coerce.number().optional(),
        pangiDiscount: z2.coerce.number().optional(),
        totalDiscount: z2.coerce.number().optional(),
        totalFee: z2.coerce.number(),
        // Legacy fields
        perRoomFee: z2.coerce.number().optional(),
        gstAmount: z2.coerce.number().optional(),
        // 2025 Fields
        certificateValidityYears: z2.coerce.number().optional(),
        isPangiSubDivision: z2.boolean().optional(),
        ownerGender: z2.enum(["male", "female", "other"]).optional(),
        tehsil: z2.string().optional().nullable(),
        tehsilOther: z2.string().optional(),
        // Coordinates (optional)
        latitude: z2.string().optional(),
        longitude: z2.string().optional(),
        // ANNEXURE-II documents with metadata
        documents: z2.array(
          z2.preprocess(
            (value) => {
              if (!value || typeof value !== "object") {
                return value;
              }
              const doc = { ...value };
              doc.filePath = typeof doc.filePath === "string" && doc.filePath.length > 0 ? doc.filePath : typeof doc.fileUrl === "string" && doc.fileUrl.length > 0 ? doc.fileUrl : typeof doc.url === "string" && doc.url.length > 0 ? doc.url : `missing://${randomUUID3()}`;
              doc.documentType = typeof doc.documentType === "string" && doc.documentType.length > 0 ? doc.documentType : typeof doc.type === "string" && doc.type.length > 0 ? doc.type : "supporting_document";
              doc.fileName = typeof doc.fileName === "string" && doc.fileName.length > 0 ? doc.fileName : typeof doc.name === "string" && doc.name.length > 0 ? doc.name : `${doc.documentType}.pdf`;
              if (doc.fileSize === void 0 && typeof doc.size !== "undefined") {
                doc.fileSize = doc.size;
              }
              if (typeof doc.fileSize !== "number" || !Number.isFinite(doc.fileSize)) {
                doc.fileSize = 0;
              }
              doc.mimeType = typeof doc.mimeType === "string" && doc.mimeType.length > 0 ? doc.mimeType : typeof doc.type === "string" && doc.type.length > 0 ? doc.type : "application/octet-stream";
              return doc;
            },
            z2.object({
              filePath: z2.string().min(1, "Document file path is required"),
              fileName: z2.string().min(1, "Document file name is required"),
              fileSize: z2.coerce.number().nonnegative().optional(),
              mimeType: z2.string().optional(),
              documentType: z2.string()
            })
          )
        ).optional()
      });
      const validatedData = ownerSubmittableSchema.parse(req.body);
      const totalRooms = (validatedData.singleBedRooms || 0) + (validatedData.doubleBedRooms || 0) + (validatedData.familySuites || 0);
      if ((validatedData.singleBedRooms || 0) > 0 && !validatedData.singleBedRoomRate) {
        return res.status(400).json({
          message: "Per-room-type rates are mandatory. Single bed room rate is required (HP Homestay Rules 2025 - ANNEXURE-I Form-A Certificate Requirement)"
        });
      }
      if ((validatedData.doubleBedRooms || 0) > 0 && !validatedData.doubleBedRoomRate) {
        return res.status(400).json({
          message: "Per-room-type rates are mandatory. Double bed room rate is required (HP Homestay Rules 2025 - ANNEXURE-I Form-A Certificate Requirement)"
        });
      }
      if ((validatedData.familySuites || 0) > 0 && !validatedData.familySuiteRate) {
        return res.status(400).json({
          message: "Per-room-type rates are mandatory. Family suite rate is required (HP Homestay Rules 2025 - ANNEXURE-I Form-A Certificate Requirement)"
        });
      }
      const existingApps = await storage.getApplicationsByUser(userId);
      const existingApp = existingApps[0];
      if (existingApp && existingApp.status !== "draft") {
        return res.status(409).json({
          message: `You already have an application (${existingApp.applicationNumber}) in status "${existingApp.status}". Amendments are required instead of creating a new application.`,
          existingApplicationId: existingApp.id,
          status: existingApp.status
        });
      }
      const rawTehsilInput = validatedData.tehsil;
      const rawTehsilOtherInput = validatedData.tehsilOther;
      const {
        tehsil: resolvedTehsilValue,
        tehsilOther: resolvedTehsilOther
      } = resolveTehsilFields(rawTehsilInput, rawTehsilOtherInput);
      console.log("[applications:create] tehsil normalization", {
        district: validatedData.district,
        tehsilValueRaw: typeof rawTehsilInput === "string" ? rawTehsilInput : null,
        tehsilOtherValueRaw: typeof rawTehsilOtherInput === "string" ? rawTehsilOtherInput : null,
        resolvedTehsilValue,
        resolvedTehsilOther
      });
      const applicationPayload = removeUndefined({
        propertyName: validatedData.propertyName,
        category: validatedData.category,
        totalRooms,
        address: validatedData.address,
        district: validatedData.district,
        block: validatedData.block || null,
        blockOther: validatedData.blockOther || null,
        gramPanchayat: validatedData.gramPanchayat || null,
        gramPanchayatOther: validatedData.gramPanchayatOther || null,
        urbanBody: validatedData.urbanBody || null,
        urbanBodyOther: validatedData.urbanBodyOther || null,
        ward: validatedData.ward || null,
        pincode: validatedData.pincode,
        locationType: validatedData.locationType,
        telephone: validatedData.telephone || null,
        tehsil: resolvedTehsilValue,
        tehsilOther: resolvedTehsilOther || null,
        ownerName: validatedData.ownerName,
        propertyOwnership: validatedData.propertyOwnership || null,
        ownerMobile: validatedData.ownerMobile,
        ownerEmail: validatedData.ownerEmail || null,
        ownerAadhaar: validatedData.ownerAadhaar,
        proposedRoomRate: validatedData.proposedRoomRate,
        singleBedRoomRate: validatedData.singleBedRoomRate,
        doubleBedRoomRate: validatedData.doubleBedRoomRate,
        familySuiteRate: validatedData.familySuiteRate,
        projectType: validatedData.projectType,
        propertyArea: validatedData.propertyArea,
        singleBedRooms: validatedData.singleBedRooms,
        singleBedRoomSize: validatedData.singleBedRoomSize,
        doubleBedRooms: validatedData.doubleBedRooms,
        doubleBedRoomSize: validatedData.doubleBedRoomSize,
        familySuites: validatedData.familySuites,
        familySuiteSize: validatedData.familySuiteSize,
        attachedWashrooms: validatedData.attachedWashrooms,
        gstin: validatedData.gstin || null,
        distanceAirport: validatedData.distanceAirport,
        distanceRailway: validatedData.distanceRailway,
        distanceCityCenter: validatedData.distanceCityCenter,
        distanceShopping: validatedData.distanceShopping,
        distanceBusStand: validatedData.distanceBusStand,
        lobbyArea: validatedData.lobbyArea,
        diningArea: validatedData.diningArea,
        parkingArea: validatedData.parkingArea || null,
        ecoFriendlyFacilities: validatedData.ecoFriendlyFacilities || null,
        differentlyAbledFacilities: validatedData.differentlyAbledFacilities || null,
        fireEquipmentDetails: validatedData.fireEquipmentDetails || null,
        nearestHospital: validatedData.nearestHospital || null,
        amenities: validatedData.amenities,
        baseFee: typeof validatedData.baseFee === "string" ? Number(validatedData.baseFee) : validatedData.baseFee,
        totalBeforeDiscounts: typeof validatedData.totalBeforeDiscounts === "string" ? Number(validatedData.totalBeforeDiscounts) : validatedData.totalBeforeDiscounts ?? null,
        validityDiscount: typeof validatedData.validityDiscount === "string" ? Number(validatedData.validityDiscount) : validatedData.validityDiscount ?? null,
        femaleOwnerDiscount: typeof validatedData.femaleOwnerDiscount === "string" ? Number(validatedData.femaleOwnerDiscount) : validatedData.femaleOwnerDiscount ?? null,
        pangiDiscount: typeof validatedData.pangiDiscount === "string" ? Number(validatedData.pangiDiscount) : validatedData.pangiDiscount ?? null,
        totalDiscount: typeof validatedData.totalDiscount === "string" ? Number(validatedData.totalDiscount) : validatedData.totalDiscount ?? null,
        totalFee: typeof validatedData.totalFee === "string" ? Number(validatedData.totalFee) : validatedData.totalFee,
        perRoomFee: typeof validatedData.perRoomFee === "string" ? Number(validatedData.perRoomFee) : validatedData.perRoomFee ?? null,
        gstAmount: typeof validatedData.gstAmount === "string" ? Number(validatedData.gstAmount) : validatedData.gstAmount ?? null,
        certificateValidityYears: validatedData.certificateValidityYears,
        isPangiSubDivision: validatedData.isPangiSubDivision ?? false,
        ownerGender: validatedData.ownerGender || null,
        latitude: validatedData.latitude || null,
        longitude: validatedData.longitude || null,
        userId
      });
      const normalizedDocuments = normalizeDocumentsForPersistence(validatedData.documents);
      if (normalizedDocuments) {
        applicationPayload.documents = normalizedDocuments;
      }
      let application;
      const submissionMeta = {
        status: "submitted",
        submittedAt: /* @__PURE__ */ new Date()
      };
      if (existingApp) {
        application = await storage.updateApplication(
          existingApp.id,
          removeUndefined({
            ...applicationPayload,
            ...submissionMeta
          })
        );
        if (!application) {
          throw new Error("Failed to update existing application");
        }
      } else {
        application = await storage.createApplication(
          {
            ...applicationPayload,
            ...submissionMeta
          },
          { trusted: true }
        );
      }
      if (normalizedDocuments && normalizedDocuments.length > 0) {
        await storage.deleteDocumentsByApplication(application.id);
        for (const doc of normalizedDocuments) {
          await storage.createDocument({
            applicationId: application.id,
            documentType: doc.documentType,
            fileName: doc.fileName,
            filePath: doc.filePath,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType
          });
        }
      }
      res.json({ application });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Application creation error:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });
  app2.get("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      let applications = [];
      if (user?.role === "property_owner") {
        applications = await storage.getApplicationsByUser(userId);
      } else if (user?.role === "district_officer" && user.district) {
        applications = await storage.getApplicationsByDistrict(user.district);
      } else if (user?.role === "state_officer" || user?.role === "admin") {
        applications = await storage.getApplicationsByStatus("state_review");
      }
      res.json({ applications });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.get("/api/applications/all", requireRole("dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      let applications = [];
      if (user.role === "district_officer" || user.role === "dealing_assistant" || user.role === "district_tourism_officer") {
        if (!user.district) {
          return res.status(400).json({ message: "District role must have an assigned district" });
        }
        applications = await db.select().from(homestayApplications).where(eq3(homestayApplications.district, user.district)).orderBy(desc3(homestayApplications.createdAt));
      } else if (user.role === "state_officer" || user.role === "admin") {
        applications = await storage.getAllApplications();
      }
      res.json(applications);
    } catch (error) {
      console.error("[workflow-monitoring] Error fetching all applications:", error);
      res.status(500).json({ message: "Failed to fetch applications for monitoring" });
    }
  });
  app2.post("/api/applications/search", requireRole("dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"), async (req, res) => {
    try {
      const {
        applicationNumber,
        ownerMobile,
        ownerAadhaar,
        month,
        year,
        fromDate,
        toDate
      } = req.body ?? {};
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const searchConditions = [];
      if (typeof applicationNumber === "string" && applicationNumber.trim()) {
        searchConditions.push(eq3(homestayApplications.applicationNumber, applicationNumber.trim()));
      }
      if (typeof ownerMobile === "string" && ownerMobile.trim()) {
        searchConditions.push(eq3(homestayApplications.ownerMobile, ownerMobile.trim()));
      }
      if (typeof ownerAadhaar === "string" && ownerAadhaar.trim()) {
        searchConditions.push(eq3(homestayApplications.ownerAadhaar, ownerAadhaar.trim()));
      }
      let rangeStart;
      let rangeEnd;
      if (fromDate || toDate) {
        if (fromDate) {
          const parsed = new Date(fromDate);
          if (!Number.isNaN(parsed.getTime())) {
            rangeStart = parsed;
          }
        }
        if (toDate) {
          const parsed = new Date(toDate);
          if (!Number.isNaN(parsed.getTime())) {
            parsed.setHours(23, 59, 59, 999);
            rangeEnd = parsed;
          }
        }
      } else if (month && year) {
        const monthNum = Number(month);
        const yearNum = Number(year);
        if (Number.isInteger(monthNum) && Number.isInteger(yearNum) && monthNum >= 1 && monthNum <= 12) {
          rangeStart = new Date(yearNum, monthNum - 1, 1);
          rangeEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        }
      }
      if (rangeStart) {
        searchConditions.push(gte(homestayApplications.createdAt, rangeStart));
      }
      if (rangeEnd) {
        searchConditions.push(lte(homestayApplications.createdAt, rangeEnd));
      }
      if (searchConditions.length === 0) {
        return res.status(400).json({
          message: "Provide at least one search filter (application number, phone, Aadhaar, or date range)."
        });
      }
      const filters = [...searchConditions];
      if (user.role === "district_officer" || user.role === "district_tourism_officer" || user.role === "dealing_assistant") {
        if (!user.district) {
          return res.status(400).json({ message: "Your profile is missing district information." });
        }
        filters.push(eq3(homestayApplications.district, user.district));
      }
      const whereClause = filters.length === 1 ? filters[0] : and2(...filters);
      const results = await db.select().from(homestayApplications).where(whereClause).orderBy(desc3(homestayApplications.createdAt)).limit(200);
      res.json({ results });
    } catch (error) {
      console.error("[application-search] Error searching applications:", error);
      res.status(500).json({ message: "Failed to search applications" });
    }
  });
  app2.get("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (user?.role === "property_owner" && application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json({ application });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });
  app2.patch("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (application.status !== "sent_back_for_corrections" && application.status !== "reverted_to_applicant" && application.status !== "reverted_by_dtdo") {
        return res.status(400).json({ message: "Application can only be updated when sent back for corrections" });
      }
      const updateSchema = z2.object({
        // Property Details
        propertyName: z2.string().min(3, "Property name must be at least 3 characters").optional(),
        category: z2.enum(["diamond", "gold", "silver"]).optional(),
        locationType: z2.enum(["mc", "tcp", "gp"]).optional(),
        // totalRooms is derived from room counts, should not be directly updated
        // LGD Hierarchical Address
        district: z2.string().min(2, "District is required").optional(),
        districtOther: z2.string().optional().or(z2.literal("")),
        tehsil: z2.string().optional(),
        tehsilOther: z2.string().optional().or(z2.literal("")),
        block: z2.string().optional().or(z2.literal("")),
        blockOther: z2.string().optional().or(z2.literal("")),
        gramPanchayat: z2.string().optional().or(z2.literal("")),
        gramPanchayatOther: z2.string().optional().or(z2.literal("")),
        urbanBody: z2.string().optional().or(z2.literal("")),
        urbanBodyOther: z2.string().optional().or(z2.literal("")),
        ward: z2.string().optional().or(z2.literal("")),
        // Address Details
        address: z2.string().min(10, "Address must be at least 10 characters").optional(),
        pincode: z2.string().regex(/^[1-9]\d{5}$/, "Invalid pincode").optional(),
        telephone: z2.string().optional().or(z2.literal("")),
        latitude: z2.string().optional().or(z2.literal("")),
        longitude: z2.string().optional().or(z2.literal("")),
        // Owner Details
        ownerName: z2.string().min(3, "Name must be at least 3 characters").optional(),
        ownerGender: z2.enum(["male", "female", "other"]).optional(),
        ownerMobile: z2.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number").optional(),
        ownerEmail: z2.string().email("Invalid email").optional().or(z2.literal("")),
        ownerAadhaar: z2.string().regex(/^\d{12}$/, "Invalid Aadhaar number").optional(),
        propertyOwnership: z2.enum(["owned", "leased"]).optional(),
        // Room & Category Details
        projectType: z2.enum(["new_rooms", "new_project"]).optional(),
        propertyArea: z2.coerce.number().min(1, "Property area must be at least 1 sq meter").optional(),
        // Per Room Type Details (2025 Rules)
        singleBedRooms: z2.coerce.number().int().min(0).optional(),
        singleBedRoomSize: z2.coerce.number().min(0).optional(),
        singleBedRoomRate: z2.coerce.number().min(100, "Rate must be at least \u20B9100").optional(),
        doubleBedRooms: z2.coerce.number().int().min(0).optional(),
        doubleBedRoomSize: z2.coerce.number().min(0).optional(),
        doubleBedRoomRate: z2.coerce.number().min(100, "Rate must be at least \u20B9100").optional(),
        familySuites: z2.coerce.number().int().min(0).max(3).optional(),
        familySuiteSize: z2.coerce.number().min(0).optional(),
        familySuiteRate: z2.coerce.number().min(100, "Rate must be at least \u20B9100").optional(),
        attachedWashrooms: z2.coerce.number().int().min(0).optional(),
        gstin: z2.string().optional().or(z2.literal("")),
        // Certificate Validity & Discounts
        certificateValidityYears: z2.coerce.number().int().min(1).max(3).optional(),
        isPangiSubDivision: z2.boolean().optional(),
        // Distances from key locations (in km)
        distanceAirport: z2.coerce.number().min(0).optional(),
        distanceRailway: z2.coerce.number().min(0).optional(),
        distanceCityCenter: z2.coerce.number().min(0).optional(),
        distanceShopping: z2.coerce.number().min(0).optional(),
        distanceBusStand: z2.coerce.number().min(0).optional(),
        // Public Areas (in sq ft)
        lobbyArea: z2.coerce.number().min(0).optional(),
        diningArea: z2.coerce.number().min(0).optional(),
        parkingArea: z2.string().optional().or(z2.literal("")),
        // Additional Facilities
        ecoFriendlyFacilities: z2.string().optional().or(z2.literal("")),
        differentlyAbledFacilities: z2.string().optional().or(z2.literal("")),
        fireEquipmentDetails: z2.string().optional().or(z2.literal("")),
        nearestHospital: z2.string().optional().or(z2.literal("")),
        // Amenities (validated JSONB structure)
        amenities: z2.object({
          ac: z2.boolean().optional(),
          wifi: z2.boolean().optional(),
          parking: z2.boolean().optional(),
          restaurant: z2.boolean().optional(),
          hotWater: z2.boolean().optional(),
          tv: z2.boolean().optional(),
          laundry: z2.boolean().optional(),
          roomService: z2.boolean().optional(),
          garden: z2.boolean().optional(),
          mountainView: z2.boolean().optional(),
          petFriendly: z2.boolean().optional()
        }).optional(),
        // Rooms (legacy field - use with caution)
        rooms: z2.array(z2.object({
          roomType: z2.string(),
          size: z2.coerce.number(),
          count: z2.coerce.number()
        })).optional(),
        // Fee Calculation (calculated fields - typically set by server)
        baseFee: z2.coerce.number().optional(),
        totalBeforeDiscounts: z2.coerce.number().optional(),
        validityDiscount: z2.coerce.number().optional(),
        femaleOwnerDiscount: z2.coerce.number().optional(),
        pangiDiscount: z2.coerce.number().optional(),
        totalDiscount: z2.coerce.number().optional(),
        totalFee: z2.coerce.number().optional(),
        // Legacy fee fields
        perRoomFee: z2.coerce.number().optional(),
        gstAmount: z2.coerce.number().optional(),
        // Documents (validated JSONB structure)
        documents: z2.array(z2.object({
          id: z2.string().optional(),
          name: z2.string().optional(),
          type: z2.string().optional(),
          url: z2.string().optional(),
          fileName: z2.string().optional(),
          filePath: z2.string().optional(),
          fileUrl: z2.string().optional(),
          documentType: z2.string().optional(),
          fileSize: z2.preprocess((value) => {
            if (typeof value === "string" && value.trim() !== "") {
              const parsed = Number(value);
              return Number.isNaN(parsed) ? value : parsed;
            }
            return value;
          }, z2.number().optional()),
          mimeType: z2.string().optional(),
          uploadedAt: z2.string().optional(),
          required: z2.boolean().optional()
        })).optional(),
        // Legacy document URLs (for backward compatibility)
        ownershipProofUrl: z2.string().optional(),
        aadhaarCardUrl: z2.string().optional(),
        panCardUrl: z2.string().optional(),
        gstCertificateUrl: z2.string().optional(),
        propertyPhotosUrls: z2.array(z2.string()).optional()
      });
      const validatedData = updateSchema.parse(req.body);
      const decimalFields = [
        "propertyArea",
        "singleBedRoomSize",
        "singleBedRoomRate",
        "doubleBedRoomSize",
        "doubleBedRoomRate",
        "familySuiteSize",
        "familySuiteRate",
        "distanceAirport",
        "distanceRailway",
        "distanceCityCenter",
        "distanceShopping",
        "distanceBusStand",
        "lobbyArea",
        "diningArea",
        "averageRoomRate",
        "highestRoomRate",
        "lowestRoomRate",
        "totalBeforeDiscounts",
        "validityDiscount",
        "femaleOwnerDiscount",
        "pangiDiscount",
        "totalDiscount",
        "totalFee",
        "perRoomFee",
        "gstAmount"
      ];
      const normalizedUpdate = { ...validatedData };
      const normalizedDocuments = normalizeDocumentsForPersistence(validatedData.documents);
      if (normalizedDocuments) {
        normalizedUpdate.documents = normalizedDocuments;
      }
      if (Object.prototype.hasOwnProperty.call(normalizedUpdate, "tehsil") || Object.prototype.hasOwnProperty.call(normalizedUpdate, "tehsilOther")) {
        const { tehsil, tehsilOther } = resolveTehsilFields(
          normalizedUpdate.tehsil,
          normalizedUpdate.tehsilOther
        );
        normalizedUpdate.tehsil = tehsil;
        if (Object.prototype.hasOwnProperty.call(normalizedUpdate, "tehsilOther")) {
          normalizedUpdate.tehsilOther = tehsilOther;
        }
      }
      for (const field of decimalFields) {
        const value = normalizedUpdate[field];
        if (typeof value === "number") {
          normalizedUpdate[field] = value.toString();
        }
      }
      const singleRooms = typeof normalizedUpdate.singleBedRooms === "number" ? normalizedUpdate.singleBedRooms : application.singleBedRooms ?? 0;
      const doubleRooms = typeof normalizedUpdate.doubleBedRooms === "number" ? normalizedUpdate.doubleBedRooms : application.doubleBedRooms ?? 0;
      const familySuites = typeof normalizedUpdate.familySuites === "number" ? normalizedUpdate.familySuites : application.familySuites ?? 0;
      const totalRooms = Number(singleRooms || 0) + Number(doubleRooms || 0) + Number(familySuites || 0);
      normalizedUpdate.totalRooms = totalRooms;
      const updatedApplication = await storage.updateApplication(id, {
        ...normalizedUpdate,
        status: "submitted",
        submittedAt: /* @__PURE__ */ new Date(),
        clarificationRequested: null,
        // Clear DA feedback after resubmission
        dtdoRemarks: null
        // Clear DTDO feedback after resubmission
      });
      if (normalizedDocuments) {
        await storage.deleteDocumentsByApplication(id);
        for (const doc of normalizedDocuments) {
          await storage.createDocument({
            applicationId: id,
            documentType: doc.documentType,
            fileName: doc.fileName,
            filePath: doc.filePath,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType
          });
        }
      }
      res.json({ application: updatedApplication });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });
  app2.post("/api/applications/:id/review", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, comments } = req.body;
      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (user.role !== "district_officer" && user.role !== "state_officer") {
        return res.status(403).json({ message: "Only officers can review applications" });
      }
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user.role === "district_officer" && application.district !== user.district) {
        return res.status(403).json({ message: "You can only review applications in your district" });
      }
      if (user.role === "district_officer" && application.status !== "pending") {
        return res.status(400).json({ message: "This application is not in pending status and cannot be reviewed by district officer" });
      }
      if (user.role === "state_officer" && application.status !== "state_review") {
        return res.status(400).json({ message: "This application is not in state review status and cannot be reviewed by state officer" });
      }
      const updateData = {};
      if (user.role === "district_officer") {
        updateData.districtOfficerId = user.id;
        updateData.districtReviewDate = /* @__PURE__ */ new Date();
        updateData.districtNotes = comments || null;
        if (action === "approve") {
          updateData.status = "state_review";
          updateData.currentStage = "state";
        } else {
          updateData.status = "rejected";
          updateData.rejectionReason = comments || "Rejected at district level";
        }
      } else if (user.role === "state_officer") {
        updateData.stateOfficerId = user.id;
        updateData.stateReviewDate = /* @__PURE__ */ new Date();
        updateData.stateNotes = comments || null;
        if (action === "approve") {
          updateData.status = "approved";
          updateData.approvedAt = /* @__PURE__ */ new Date();
          updateData.currentStage = "final";
        } else {
          updateData.status = "rejected";
          updateData.rejectionReason = comments || "Rejected at state level";
        }
      }
      const updated = await storage.updateApplication(id, updateData);
      res.json({ application: updated });
    } catch (error) {
      res.status(500).json({ message: "Failed to review application" });
    }
  });
  app2.post("/api/applications/:id/send-back", requireRole("district_officer", "state_officer"), async (req, res) => {
    try {
      const { id } = req.params;
      const { feedback, issuesFound } = req.body;
      if (!feedback || feedback.trim().length < 10) {
        return res.status(400).json({ message: "Feedback is required (minimum 10 characters)" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "district_officer" && user.role !== "state_officer") {
        return res.status(403).json({ message: "Only officers can send back applications" });
      }
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const updated = await storage.updateApplication(id, {
        status: "sent_back_for_corrections",
        clarificationRequested: feedback
      });
      res.json({ application: updated, message: "Application sent back to applicant" });
    } catch (error) {
      console.error("Send back error:", error);
      res.status(500).json({ message: "Failed to send back application" });
    }
  });
  app2.post("/api/applications/:id/move-to-inspection", requireRole("district_officer", "state_officer"), async (req, res) => {
    try {
      const { id } = req.params;
      const { scheduledDate, notes } = req.body;
      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "district_officer" && user.role !== "state_officer") {
        return res.status(403).json({ message: "Only officers can schedule inspections" });
      }
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const updated = await storage.updateApplication(id, {
        status: "site_inspection_scheduled",
        currentStage: "site_inspection",
        siteInspectionScheduledDate: scheduledDate ? new Date(scheduledDate) : /* @__PURE__ */ new Date(),
        siteInspectionOfficerId: user.id,
        siteInspectionNotes: notes
      });
      res.json({ application: updated, message: "Site inspection scheduled" });
    } catch (error) {
      console.error("Move to inspection error:", error);
      res.status(500).json({ message: "Failed to schedule inspection" });
    }
  });
  app2.post("/api/applications/:id/complete-inspection", requireRole("district_officer", "state_officer"), async (req, res) => {
    try {
      const { id } = req.params;
      const { outcome, findings, notes } = req.body;
      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "district_officer" && user.role !== "state_officer") {
        return res.status(403).json({ message: "Only officers can complete inspections" });
      }
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (!["approved", "corrections_needed", "rejected"].includes(outcome)) {
        return res.status(400).json({ message: "Invalid inspection outcome" });
      }
      if ((outcome === "corrections_needed" || outcome === "rejected") && !findings?.issuesFound && !notes) {
        return res.status(400).json({
          message: "Issues description is required when sending back for corrections or rejecting an application"
        });
      }
      let newStatus;
      let clarificationRequested = null;
      switch (outcome) {
        case "approved":
          newStatus = "payment_pending";
          break;
        case "corrections_needed":
          newStatus = "sent_back_for_corrections";
          clarificationRequested = findings?.issuesFound || notes || "Site inspection found issues that need correction";
          break;
        case "rejected":
          newStatus = "rejected";
          break;
        default:
          newStatus = "inspection_completed";
      }
      const updateData = {
        status: newStatus,
        siteInspectionCompletedDate: /* @__PURE__ */ new Date(),
        siteInspectionOutcome: outcome,
        siteInspectionFindings: findings || {},
        siteInspectionNotes: notes
      };
      if (outcome === "rejected") {
        updateData.rejectionReason = findings?.issuesFound || notes || "Application rejected after site inspection";
      } else if (outcome === "corrections_needed") {
        updateData.clarificationRequested = clarificationRequested;
      }
      const updated = await storage.updateApplication(id, updateData);
      res.json({ application: updated, message: "Inspection completed successfully" });
    } catch (error) {
      console.error("Complete inspection error:", error);
      res.status(500).json({ message: "Failed to complete inspection" });
    }
  });
  app2.patch("/api/da/profile", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const { fullName, email, mobile } = req.body;
      if (!fullName || fullName.trim().length < 3) {
        return res.status(400).json({ message: "Full name must be at least 3 characters" });
      }
      if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: "Invalid mobile number" });
      }
      const updated = await storage.updateUser(userId, {
        fullName: fullName.trim(),
        email: email?.trim() || null,
        mobile: mobile ? mobile.trim() : void 0
      });
      res.json({ user: updated, message: "Profile updated successfully" });
    } catch (error) {
      console.error("[da] Failed to update profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app2.post("/api/da/change-password", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password || "");
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword });
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("[da] Failed to change password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
  app2.get("/api/da/applications", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !user.district) {
        return res.status(400).json({ message: "DA must be assigned to a district" });
      }
      const allApplications = await db.select().from(homestayApplications).where(eq3(homestayApplications.district, user.district));
      console.log("[da] applications in district", user.district, allApplications.map((app3) => ({ id: app3.id, status: app3.status, tehsil: app3.tehsil })));
      const daRelevantStatuses = /* @__PURE__ */ new Set(["submitted", "under_scrutiny", "forwarded_to_dtdo", "reverted_to_applicant"]);
      const relevantApplications = allApplications.filter((app3) => {
        const normalizedStatus = (app3.status ?? "").trim().toLowerCase();
        if (!normalizedStatus) {
          return true;
        }
        return daRelevantStatuses.has(normalizedStatus);
      });
      const applicationsWithOwner = await Promise.all(
        relevantApplications.map(async (app3) => {
          const owner = await storage.getUser(app3.userId);
          return {
            ...app3,
            ownerName: owner?.fullName || "Unknown",
            ownerMobile: owner?.mobile || "N/A"
          };
        })
      );
      res.json(applicationsWithOwner);
    } catch (error) {
      console.error("[da] Failed to fetch applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.get("/api/da/applications/:id", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only access applications from your district" });
      }
      const owner = await storage.getUser(application.userId);
      const documents2 = await storage.getDocumentsByApplication(req.params.id);
      res.json({
        application,
        owner: owner ? {
          fullName: owner.fullName,
          mobile: owner.mobile,
          email: owner.email
        } : null,
        documents: documents2
      });
    } catch (error) {
      console.error("[da] Failed to fetch application details:", error);
      res.status(500).json({ message: "Failed to fetch application details" });
    }
  });
  app2.post("/api/da/applications/:id/start-scrutiny", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (application.status !== "submitted") {
        return res.status(400).json({ message: "Only submitted applications can be put under scrutiny" });
      }
      await storage.updateApplication(req.params.id, { status: "under_scrutiny" });
      res.json({ message: "Application is now under scrutiny" });
    } catch (error) {
      console.error("[da] Failed to start scrutiny:", error);
      res.status(500).json({ message: "Failed to start scrutiny" });
    }
  });
  app2.post("/api/da/applications/:id/save-scrutiny", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const { verifications } = req.body;
      const userId = req.session.userId;
      if (!verifications || !Array.isArray(verifications)) {
        return res.status(400).json({ message: "Invalid verification data" });
      }
      for (const verification of verifications) {
        await db.update(documents).set({
          verificationStatus: verification.status,
          verificationNotes: verification.notes || null,
          isVerified: verification.status === "verified",
          verifiedBy: verification.status !== "pending" ? userId : null,
          verificationDate: verification.status !== "pending" ? /* @__PURE__ */ new Date() : null
        }).where(eq3(documents.id, verification.documentId));
      }
      res.json({ message: "Scrutiny progress saved successfully" });
    } catch (error) {
      console.error("[da] Failed to save scrutiny progress:", error);
      res.status(500).json({ message: "Failed to save scrutiny progress" });
    }
  });
  app2.post("/api/da/applications/:id/forward-to-dtdo", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const { remarks } = req.body;
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (application.status !== "under_scrutiny") {
        return res.status(400).json({ message: "Only applications under scrutiny can be forwarded" });
      }
      await storage.updateApplication(req.params.id, { status: "forwarded_to_dtdo" });
      res.json({ message: "Application forwarded to DTDO successfully" });
    } catch (error) {
      console.error("[da] Failed to forward to DTDO:", error);
      res.status(500).json({ message: "Failed to forward application" });
    }
  });
  app2.post("/api/da/applications/:id/send-back", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "Reason for sending back is required" });
      }
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (application.status !== "under_scrutiny") {
        return res.status(400).json({ message: "Only applications under scrutiny can be sent back" });
      }
      await storage.updateApplication(req.params.id, { status: "reverted_to_applicant" });
      res.json({ message: "Application sent back to applicant successfully" });
    } catch (error) {
      console.error("[da] Failed to send back application:", error);
      res.status(500).json({ message: "Failed to send back application" });
    }
  });
  app2.get("/api/dtdo/applications", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !user.district) {
        return res.status(400).json({ message: "DTDO must be assigned to a district" });
      }
      const allApplications = await db.select().from(homestayApplications).where(eq3(homestayApplications.district, user.district));
      const dtdoRelevantStatuses = [
        "forwarded_to_dtdo",
        "dtdo_review",
        "inspection_scheduled",
        "inspection_under_review"
      ];
      const relevantApplications = allApplications.filter(
        (app3) => dtdoRelevantStatuses.includes(app3.status ?? "")
      );
      const applicationsWithDetails = await Promise.all(
        relevantApplications.map(async (app3) => {
          const owner = await storage.getUser(app3.userId);
          let daName = void 0;
          const daRemarks = app3.daRemarks;
          if (daRemarks || app3.daId) {
            const da = app3.daId ? await storage.getUser(app3.daId) : null;
            daName = da?.fullName || "Unknown DA";
          }
          return {
            ...app3,
            ownerName: owner?.fullName || "Unknown",
            ownerMobile: owner?.mobile || "N/A",
            daName
          };
        })
      );
      res.json(applicationsWithDetails);
    } catch (error) {
      console.error("[dtdo] Failed to fetch applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.get("/api/dtdo/applications/:id", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only access applications from your district" });
      }
      const owner = await storage.getUser(application.userId);
      const documents2 = await storage.getDocumentsByApplication(req.params.id);
      let daInfo = null;
      if (application.daId) {
        const da = await storage.getUser(application.daId);
        daInfo = da ? { fullName: da.fullName, mobile: da.mobile } : null;
      }
      res.json({
        application,
        owner: owner ? {
          fullName: owner.fullName,
          mobile: owner.mobile,
          email: owner.email
        } : null,
        documents: documents2,
        daInfo
      });
    } catch (error) {
      console.error("[dtdo] Failed to fetch application details:", error);
      res.status(500).json({ message: "Failed to fetch application details" });
    }
  });
  app2.post("/api/dtdo/applications/:id/accept", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const { remarks } = req.body;
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }
      if (application.status !== "forwarded_to_dtdo" && application.status !== "dtdo_review") {
        return res.status(400).json({ message: "Application is not in the correct status for DTDO review" });
      }
      await storage.updateApplication(req.params.id, {
        status: "dtdo_review",
        dtdoRemarks: remarks || null,
        dtdoId: userId,
        dtdoReviewDate: /* @__PURE__ */ new Date()
      });
      res.json({ message: "Application accepted. Proceed to schedule inspection.", applicationId: req.params.id });
    } catch (error) {
      console.error("[dtdo] Failed to accept application:", error);
      res.status(500).json({ message: "Failed to accept application" });
    }
  });
  app2.post("/api/dtdo/applications/:id/reject", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const { remarks } = req.body;
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }
      await storage.updateApplication(req.params.id, {
        status: "rejected",
        dtdoRemarks: remarks,
        dtdoId: userId,
        dtdoReviewDate: /* @__PURE__ */ new Date(),
        rejectionReason: remarks
      });
      res.json({ message: "Application rejected successfully" });
    } catch (error) {
      console.error("[dtdo] Failed to reject application:", error);
      res.status(500).json({ message: "Failed to reject application" });
    }
  });
  app2.post("/api/dtdo/applications/:id/revert", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const { remarks } = req.body;
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ message: "Please specify what corrections are needed" });
      }
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }
      await storage.updateApplication(req.params.id, {
        status: "reverted_by_dtdo",
        dtdoRemarks: remarks,
        dtdoId: userId,
        dtdoReviewDate: /* @__PURE__ */ new Date()
      });
      res.json({ message: "Application reverted to applicant successfully" });
    } catch (error) {
      console.error("[dtdo] Failed to revert application:", error);
      res.status(500).json({ message: "Failed to revert application" });
    }
  });
  app2.get("/api/dtdo/available-das", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !user.district) {
        return res.status(400).json({ message: "DTDO must be assigned to a district" });
      }
      const allUsers = await db.select().from(users).where(eq3(users.district, user.district));
      const das = allUsers.filter((u) => u.role === "dealing_assistant").map((da) => ({
        id: da.id,
        fullName: da.fullName,
        mobile: da.mobile
      }));
      res.json({ das });
    } catch (error) {
      console.error("[dtdo] Failed to fetch DAs:", error);
      res.status(500).json({ message: "Failed to fetch available DAs" });
    }
  });
  app2.post("/api/dtdo/schedule-inspection", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const { applicationId, inspectionDate, assignedTo, specialInstructions } = req.body;
      const userId = req.session.userId;
      if (!applicationId || !inspectionDate || !assignedTo) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (application.status !== "dtdo_review") {
        return res.status(400).json({ message: "Application must be accepted by DTDO before scheduling inspection" });
      }
      const newInspectionOrder = await db.insert(inspectionOrders).values({
        applicationId,
        scheduledBy: userId,
        scheduledDate: /* @__PURE__ */ new Date(),
        assignedTo,
        assignedDate: /* @__PURE__ */ new Date(),
        inspectionDate: new Date(inspectionDate),
        inspectionAddress: application.address,
        specialInstructions: specialInstructions || null,
        status: "scheduled"
      }).returning();
      await storage.updateApplication(applicationId, {
        status: "inspection_scheduled"
      });
      res.json({ message: "Inspection scheduled successfully", inspectionOrder: newInspectionOrder[0] });
    } catch (error) {
      console.error("[dtdo] Failed to schedule inspection:", error);
      res.status(500).json({ message: "Failed to schedule inspection" });
    }
  });
  app2.get("/api/dtdo/inspection-report/:applicationId", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only review applications from your district" });
      }
      const inspectionOrder = await db.select().from(inspectionOrders).where(eq3(inspectionOrders.applicationId, applicationId)).orderBy(desc3(inspectionOrders.createdAt)).limit(1);
      if (inspectionOrder.length === 0) {
        return res.status(404).json({ message: "No inspection order found" });
      }
      const report = await db.select().from(inspectionReports).where(eq3(inspectionReports.inspectionOrderId, inspectionOrder[0].id)).limit(1);
      if (report.length === 0) {
        return res.status(404).json({ message: "Inspection report not found" });
      }
      const da = await storage.getUser(report[0].submittedBy);
      const owner = await storage.getUser(application.userId);
      res.json({
        report: report[0],
        application,
        inspectionOrder: inspectionOrder[0],
        owner: owner ? {
          fullName: owner.fullName,
          mobile: owner.mobile,
          email: owner.email
        } : null,
        da: da ? {
          fullName: da.fullName,
          mobile: da.mobile
        } : null
      });
    } catch (error) {
      console.error("[dtdo] Failed to fetch inspection report:", error);
      res.status(500).json({ message: "Failed to fetch inspection report" });
    }
  });
  app2.post("/api/dtdo/inspection-report/:applicationId/approve", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { remarks } = req.body;
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }
      if (application.status !== "inspection_under_review") {
        return res.status(400).json({
          message: `Cannot approve inspection report. Application must be in inspection_under_review status (current: ${application.status})`
        });
      }
      await storage.updateApplication(applicationId, {
        status: "verified_for_payment",
        districtNotes: remarks || "Inspection report approved. Property meets all requirements.",
        districtOfficerId: userId,
        districtReviewDate: /* @__PURE__ */ new Date()
      });
      res.json({ message: "Inspection report approved successfully" });
    } catch (error) {
      console.error("[dtdo] Failed to approve inspection report:", error);
      res.status(500).json({ message: "Failed to approve inspection report" });
    }
  });
  app2.post("/api/dtdo/inspection-report/:applicationId/reject", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { remarks } = req.body;
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }
      if (application.status !== "inspection_under_review") {
        return res.status(400).json({
          message: `Cannot reject application. Application must be in inspection_under_review status (current: ${application.status})`
        });
      }
      await storage.updateApplication(applicationId, {
        status: "rejected",
        rejectionReason: remarks,
        districtNotes: remarks,
        districtOfficerId: userId,
        districtReviewDate: /* @__PURE__ */ new Date()
      });
      res.json({ message: "Application rejected successfully" });
    } catch (error) {
      console.error("[dtdo] Failed to reject inspection report:", error);
      res.status(500).json({ message: "Failed to reject inspection report" });
    }
  });
  app2.post("/api/dtdo/inspection-report/:applicationId/raise-objections", requireRole("district_tourism_officer", "district_officer"), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { remarks } = req.body;
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ message: "Please specify the objections" });
      }
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }
      if (application.status !== "inspection_under_review") {
        return res.status(400).json({
          message: `Cannot raise objections. Application must be in inspection_under_review status (current: ${application.status})`
        });
      }
      await storage.updateApplication(applicationId, {
        status: "objection_raised",
        clarificationRequested: remarks,
        districtNotes: remarks,
        districtOfficerId: userId,
        districtReviewDate: /* @__PURE__ */ new Date()
      });
      res.json({ message: "Objections raised successfully. Application will require re-inspection." });
    } catch (error) {
      console.error("[dtdo] Failed to raise objections:", error);
      res.status(500).json({ message: "Failed to raise objections" });
    }
  });
  app2.get("/api/da/inspections", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      const inspectionOrdersData = await db.select().from(inspectionOrders).where(eq3(inspectionOrders.assignedTo, userId)).orderBy(desc3(inspectionOrders.createdAt));
      const enrichedOrders = await Promise.all(
        inspectionOrdersData.map(async (order) => {
          const application = await storage.getApplication(order.applicationId);
          const owner = application ? await storage.getUser(application.userId) : null;
          const existingReport = await db.select().from(inspectionReports).where(eq3(inspectionReports.inspectionOrderId, order.id)).limit(1);
          return {
            ...order,
            application: application ? {
              id: application.id,
              applicationNumber: application.applicationNumber,
              propertyName: application.propertyName,
              category: application.category,
              status: application.status
            } : null,
            owner: owner ? {
              fullName: owner.fullName,
              mobile: owner.mobile
            } : null,
            reportSubmitted: existingReport.length > 0
          };
        })
      );
      res.json(enrichedOrders);
    } catch (error) {
      console.error("[da] Failed to fetch inspections:", error);
      res.status(500).json({ message: "Failed to fetch inspections" });
    }
  });
  app2.get("/api/da/inspections/:id", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const order = await db.select().from(inspectionOrders).where(eq3(inspectionOrders.id, req.params.id)).limit(1);
      if (order.length === 0) {
        return res.status(404).json({ message: "Inspection order not found" });
      }
      if (order[0].assignedTo !== userId) {
        return res.status(403).json({ message: "You can only access inspections assigned to you" });
      }
      const application = await storage.getApplication(order[0].applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const owner = await storage.getUser(application.userId);
      const documents2 = await storage.getDocumentsByApplication(application.id);
      const existingReport = await db.select().from(inspectionReports).where(eq3(inspectionReports.inspectionOrderId, req.params.id)).limit(1);
      res.json({
        order: order[0],
        application,
        owner: owner ? {
          fullName: owner.fullName,
          mobile: owner.mobile,
          email: owner.email
        } : null,
        documents: documents2,
        reportSubmitted: existingReport.length > 0,
        existingReport: existingReport.length > 0 ? existingReport[0] : null
      });
    } catch (error) {
      console.error("[da] Failed to fetch inspection details:", error);
      res.status(500).json({ message: "Failed to fetch inspection details" });
    }
  });
  app2.post("/api/da/inspections/:id/submit-report", requireRole("dealing_assistant"), async (req, res) => {
    try {
      const userId = req.session.userId;
      const orderId = req.params.id;
      const order = await db.select().from(inspectionOrders).where(eq3(inspectionOrders.id, orderId)).limit(1);
      if (order.length === 0) {
        return res.status(404).json({ message: "Inspection order not found" });
      }
      if (order[0].assignedTo !== userId) {
        return res.status(403).json({ message: "You can only submit reports for inspections assigned to you" });
      }
      const existingReport = await db.select().from(inspectionReports).where(eq3(inspectionReports.inspectionOrderId, orderId)).limit(1);
      if (existingReport.length > 0) {
        return res.status(400).json({ message: "Inspection report already submitted for this order" });
      }
      const reportData = {
        inspectionOrderId: orderId,
        applicationId: order[0].applicationId,
        submittedBy: userId,
        submittedDate: /* @__PURE__ */ new Date(),
        // Convert date string to Date object
        actualInspectionDate: req.body.actualInspectionDate ? new Date(req.body.actualInspectionDate) : /* @__PURE__ */ new Date(),
        // Basic verification fields
        roomCountVerified: req.body.roomCountVerified ?? false,
        actualRoomCount: req.body.actualRoomCount || null,
        categoryMeetsStandards: req.body.categoryMeetsStandards ?? false,
        recommendedCategory: req.body.recommendedCategory || null,
        // ANNEXURE-III Checklists
        mandatoryChecklist: req.body.mandatoryChecklist || null,
        mandatoryRemarks: req.body.mandatoryRemarks || null,
        desirableChecklist: req.body.desirableChecklist || null,
        desirableRemarks: req.body.desirableRemarks || null,
        // Legacy compatibility fields
        amenitiesVerified: req.body.amenitiesVerified || null,
        amenitiesIssues: req.body.amenitiesIssues || null,
        fireSafetyCompliant: req.body.fireSafetyCompliant ?? false,
        fireSafetyIssues: req.body.fireSafetyIssues || null,
        structuralSafety: req.body.structuralSafety ?? false,
        structuralIssues: req.body.structuralIssues || null,
        // Overall assessment
        overallSatisfactory: req.body.overallSatisfactory ?? false,
        recommendation: req.body.recommendation || "approve",
        detailedFindings: req.body.detailedFindings || "",
        // Additional fields
        inspectionPhotos: req.body.inspectionPhotos || null,
        reportDocumentUrl: req.body.reportDocumentUrl || null
      };
      const [newReport] = await db.insert(inspectionReports).values(reportData).returning();
      await db.update(inspectionOrders).set({ status: "completed", updatedAt: /* @__PURE__ */ new Date() }).where(eq3(inspectionOrders.id, orderId));
      await storage.updateApplication(order[0].applicationId, {
        status: "inspection_under_review",
        currentStage: "inspection_completed"
      });
      res.json({ report: newReport, message: "Inspection report submitted successfully" });
    } catch (error) {
      console.error("[da] Failed to submit inspection report:", error);
      res.status(500).json({ message: "Failed to submit inspection report" });
    }
  });
  app2.get("/api/applications/:id/documents", requireAuth, async (req, res) => {
    try {
      const documents2 = await storage.getDocumentsByApplication(req.params.id);
      res.json({ documents: documents2 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
  app2.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const payment = await storage.createPayment(req.body);
      res.json({ payment });
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment" });
    }
  });
  app2.patch("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.updatePayment(req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json({ payment });
    } catch (error) {
      res.status(500).json({ message: "Failed to update payment" });
    }
  });
  app2.get("/api/applications/:id/payments", requireAuth, async (req, res) => {
    try {
      const payments2 = await storage.getPaymentsByApplication(req.params.id);
      res.json({ payments: payments2 });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });
  app2.post("/api/payments/:id/confirm", requireRole("district_officer", "state_officer"), async (req, res) => {
    try {
      const payment = await storage.getPaymentById(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      await storage.updatePayment(req.params.id, {
        paymentStatus: "success",
        completedAt: /* @__PURE__ */ new Date()
      });
      const application = await storage.getApplication(payment.applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      const certificateNumber = `HP-HST-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Math.floor(Math.random() * 1e5)).padStart(5, "0")}`;
      await storage.updateApplication(payment.applicationId, {
        status: "approved",
        certificateNumber,
        certificateIssuedDate: /* @__PURE__ */ new Date(),
        certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3),
        // 1 year from now
        approvedAt: /* @__PURE__ */ new Date()
      });
      res.json({
        message: "Payment confirmed and certificate issued",
        certificateNumber,
        applicationId: payment.applicationId
      });
    } catch (error) {
      console.error("Payment confirmation error:", error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });
  app2.get("/api/payments/pending", requireRole("district_officer", "state_officer"), async (req, res) => {
    try {
      const allApplications = await storage.getAllApplications();
      const pendingPaymentApps = allApplications.filter((a) => a.status === "payment_pending");
      const paymentsWithApps = await Promise.all(
        pendingPaymentApps.map(async (app3) => {
          const payments2 = await storage.getPaymentsByApplication(app3.id);
          return {
            application: app3,
            payment: payments2.find((p) => p.paymentStatus === "pending_verification") || payments2[0] || null
          };
        })
      );
      res.json({ pendingPayments: paymentsWithApps.filter((p) => p.payment !== null) });
    } catch (error) {
      console.error("Pending payments fetch error:", error);
      res.status(500).json({ message: "Failed to fetch pending payments" });
    }
  });
  app2.get("/api/public/properties", async (req, res) => {
    try {
      const properties = await storage.getApplicationsByStatus("approved");
      res.json({ properties });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });
  app2.get("/api/analytics/production-stats", requireRole("dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"), async (req, res) => {
    try {
      const stats = await storage.getLatestProductionStats();
      res.json({ stats });
    } catch (error) {
      console.error("Production stats error:", error);
      res.status(500).json({ message: "Failed to fetch production stats" });
    }
  });
  app2.get("/api/analytics/dashboard", requireRole("dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"), async (req, res) => {
    try {
      const allApplications = await storage.getAllApplications();
      const allUsers = await storage.getAllUsers();
      const total = allApplications.length;
      const byStatus = {
        pending: allApplications.filter((a) => a.status === "pending").length,
        district_review: allApplications.filter((a) => a.status === "district_review").length,
        state_review: allApplications.filter((a) => a.status === "state_review").length,
        approved: allApplications.filter((a) => a.status === "approved").length,
        rejected: allApplications.filter((a) => a.status === "rejected").length
      };
      const byCategory = {
        diamond: allApplications.filter((a) => a.category === "diamond").length,
        gold: allApplications.filter((a) => a.category === "gold").length,
        silver: allApplications.filter((a) => a.category === "silver").length
      };
      const districtCounts = {};
      allApplications.forEach((app3) => {
        districtCounts[app3.district] = (districtCounts[app3.district] || 0) + 1;
      });
      const approvedApps = allApplications.filter((a) => a.status === "approved" && a.submittedAt && a.stateReviewDate);
      const processingTimes = approvedApps.map((app3) => {
        const submitted = new Date(app3.submittedAt).getTime();
        const approved = new Date(app3.stateReviewDate).getTime();
        return Math.floor((approved - submitted) / (1e3 * 60 * 60 * 24));
      });
      const avgProcessingTime = processingTimes.length > 0 ? Math.round(processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length) : 0;
      const recentApplications = [...allApplications].sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 10);
      res.json({
        overview: {
          total,
          byStatus,
          byCategory,
          avgProcessingTime,
          totalOwners: allUsers.filter((u) => u.role === "property_owner").length
        },
        districts: districtCounts,
        recentApplications
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });
  app2.post("/admin/seed-database", async (req, res) => {
    try {
      const existingUser = await storage.getUserByMobile("9999999991");
      if (existingUser) {
        return res.json({
          message: "Seed data already exists",
          users: 3,
          properties: 5,
          note: "Database already has test accounts. Use /api/dev/clear-all first if you want to re-seed."
        });
      }
      const owner = await storage.createUser({
        fullName: "Property Owner Demo",
        mobile: "9999999991",
        email: "owner@hptourism.com",
        password: "test123",
        role: "property_owner",
        district: "Shimla",
        aadhaarNumber: "123456789001"
      });
      const districtOfficer = await storage.createUser({
        fullName: "District Officer Shimla",
        mobile: "9999999992",
        email: "district@hptourism.gov.in",
        password: "test123",
        role: "district_officer",
        district: "Shimla",
        aadhaarNumber: "123456789002"
      });
      const stateOfficer = await storage.createUser({
        fullName: "State Tourism Officer",
        mobile: "9999999993",
        email: "state@hptourism.gov.in",
        password: "test123",
        role: "state_officer",
        district: "Shimla",
        aadhaarNumber: "123456789003"
      });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Mountain View Retreat",
        category: "diamond",
        totalRooms: 8,
        address: "Naldehra Road, Near Golf Course, Shimla",
        district: "Shimla",
        pincode: "171002",
        latitude: "31.0850",
        longitude: "77.1734",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          restaurant: true,
          hotWater: true,
          mountainView: true,
          garden: true,
          tv: true
        },
        rooms: [
          { roomType: "Deluxe", size: 300, count: 4 },
          { roomType: "Suite", size: 450, count: 4 }
        ],
        baseFee: "5000.00",
        perRoomFee: "1000.00",
        gstAmount: "2340.00",
        totalFee: "15340.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: /* @__PURE__ */ new Date(),
        districtNotes: "Excellent property, meets all Diamond category standards",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: /* @__PURE__ */ new Date(),
        stateNotes: "Approved. Exemplary homestay facility",
        certificateNumber: `HP-CERT-2025-${Date.now()}`,
        certificateIssuedDate: /* @__PURE__ */ new Date(),
        certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3),
        submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1e3),
        approvedAt: /* @__PURE__ */ new Date()
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Pine Valley Homestay",
        category: "gold",
        totalRooms: 5,
        address: "Kufri Road, Near Himalayan Nature Park, Shimla",
        district: "Shimla",
        pincode: "171012",
        latitude: "31.1048",
        longitude: "77.2659",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          hotWater: true,
          mountainView: true,
          garden: true
        },
        rooms: [
          { roomType: "Standard", size: 200, count: 3 },
          { roomType: "Deluxe", size: 280, count: 2 }
        ],
        baseFee: "3000.00",
        perRoomFee: "800.00",
        gstAmount: "1260.00",
        totalFee: "8260.00",
        status: "state_review",
        currentStage: "state",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: /* @__PURE__ */ new Date(),
        districtNotes: "Good property, forwarded to state level",
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3)
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Cedar Wood Cottage",
        category: "silver",
        totalRooms: 3,
        address: "Mashobra Village, Near Reserve Forest, Shimla",
        district: "Shimla",
        pincode: "171007",
        latitude: "31.1207",
        longitude: "77.2291",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          hotWater: true,
          garden: true
        },
        rooms: [
          { roomType: "Standard", size: 180, count: 3 }
        ],
        baseFee: "2000.00",
        perRoomFee: "600.00",
        gstAmount: "720.00",
        totalFee: "4720.00",
        status: "district_review",
        currentStage: "district",
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3)
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Himalayan Heritage Home",
        category: "gold",
        totalRooms: 6,
        address: "The Mall Road, Near Christ Church, Shimla",
        district: "Shimla",
        pincode: "171001",
        latitude: "31.1048",
        longitude: "77.1734",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          hotWater: true,
          tv: true,
          laundry: true,
          roomService: true
        },
        rooms: [
          { roomType: "Standard", size: 220, count: 4 },
          { roomType: "Deluxe", size: 300, count: 2 }
        ],
        baseFee: "3000.00",
        perRoomFee: "800.00",
        gstAmount: "1440.00",
        totalFee: "9440.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3),
        districtNotes: "Heritage property, well maintained",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: /* @__PURE__ */ new Date(),
        stateNotes: "Approved for Gold category",
        certificateNumber: `HP-CERT-2025-${Date.now() + 1}`,
        certificateIssuedDate: /* @__PURE__ */ new Date(),
        certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3),
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3),
        approvedAt: /* @__PURE__ */ new Date()
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Snowfall Cottage",
        category: "silver",
        totalRooms: 4,
        address: "Chharabra Village, Near Wildflower Hall, Shimla",
        district: "Shimla",
        pincode: "171012",
        latitude: "31.1207",
        longitude: "77.2659",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          hotWater: true,
          mountainView: true,
          petFriendly: true
        },
        rooms: [
          { roomType: "Standard", size: 190, count: 4 }
        ],
        baseFee: "2000.00",
        perRoomFee: "600.00",
        gstAmount: "900.00",
        totalFee: "5900.00",
        status: "submitted",
        currentStage: "district",
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3)
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Devdar Manor",
        category: "diamond",
        totalRooms: 10,
        address: "Near Ridge, Scandal Point, Shimla",
        district: "Shimla",
        pincode: "171001",
        latitude: "31.1041",
        longitude: "77.1732",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          restaurant: true,
          hotWater: true,
          mountainView: true,
          garden: true,
          tv: true,
          ac: true
        },
        rooms: [
          { roomType: "Deluxe", size: 350, count: 6 },
          { roomType: "Suite", size: 500, count: 4 }
        ],
        baseFee: "5000.00",
        perRoomFee: "1000.00",
        gstAmount: "2700.00",
        totalFee: "17700.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1e3),
        districtNotes: "Premium property with excellent facilities",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3),
        stateNotes: "Outstanding property. Highly recommended",
        certificateNumber: `HP-CERT-2025-${Date.now() + 2}`,
        certificateIssuedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3),
        certificateExpiryDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1e3),
        submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1e3),
        approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3)
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Maple Tree Homestay",
        category: "gold",
        totalRooms: 7,
        address: "Summer Hill, Near Himachal Pradesh University, Shimla",
        district: "Shimla",
        pincode: "171005",
        latitude: "31.0897",
        longitude: "77.1516",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          hotWater: true,
          tv: true,
          garden: true,
          mountainView: true
        },
        rooms: [
          { roomType: "Standard", size: 240, count: 4 },
          { roomType: "Deluxe", size: 320, count: 3 }
        ],
        baseFee: "3000.00",
        perRoomFee: "800.00",
        gstAmount: "1620.00",
        totalFee: "10620.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1e3),
        districtNotes: "Well-maintained property in scenic location",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3),
        stateNotes: "Approved for Gold category",
        certificateNumber: `HP-CERT-2025-${Date.now() + 3}`,
        certificateIssuedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3),
        certificateExpiryDate: new Date(Date.now() + 358 * 24 * 60 * 60 * 1e3),
        submittedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1e3),
        approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3)
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Oak Ridge Villa",
        category: "silver",
        totalRooms: 5,
        address: "Sanjauli, Near State Museum, Shimla",
        district: "Shimla",
        pincode: "171006",
        latitude: "31.1125",
        longitude: "77.1914",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          hotWater: true,
          tv: true,
          garden: true
        },
        rooms: [
          { roomType: "Standard", size: 200, count: 5 }
        ],
        baseFee: "2000.00",
        perRoomFee: "600.00",
        gstAmount: "900.00",
        totalFee: "5900.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1e3),
        districtNotes: "Clean and comfortable property",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1e3),
        stateNotes: "Approved for Silver category",
        certificateNumber: `HP-CERT-2025-${Date.now() + 4}`,
        certificateIssuedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1e3),
        certificateExpiryDate: new Date(Date.now() + 359 * 24 * 60 * 60 * 1e3),
        submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1e3),
        approvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1e3)
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Riverside Haven",
        category: "gold",
        totalRooms: 6,
        address: "Tara Devi, Near Temple Road, Shimla",
        district: "Shimla",
        pincode: "171009",
        latitude: "31.0383",
        longitude: "77.1291",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          hotWater: true,
          restaurant: true,
          mountainView: true,
          tv: true
        },
        rooms: [
          { roomType: "Standard", size: 250, count: 4 },
          { roomType: "Deluxe", size: 320, count: 2 }
        ],
        baseFee: "3000.00",
        perRoomFee: "800.00",
        gstAmount: "1440.00",
        totalFee: "9440.00",
        status: "district_review",
        currentStage: "district",
        submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1e3)
      }, { trusted: true });
      await storage.createApplication({
        userId: owner.id,
        propertyName: "Alpine Chalet",
        category: "diamond",
        totalRooms: 9,
        address: "Lakkar Bazaar, Near Ice Skating Rink, Shimla",
        district: "Shimla",
        pincode: "171001",
        latitude: "31.1023",
        longitude: "77.1691",
        ownerName: "Property Owner Demo",
        ownerMobile: "9999999991",
        ownerEmail: "owner@hptourism.com",
        ownerAadhaar: "123456789001",
        amenities: {
          wifi: true,
          parking: true,
          restaurant: true,
          hotWater: true,
          mountainView: true,
          garden: true,
          tv: true,
          ac: true
        },
        rooms: [
          { roomType: "Deluxe", size: 330, count: 5 },
          { roomType: "Suite", size: 480, count: 4 }
        ],
        baseFee: "5000.00",
        perRoomFee: "1000.00",
        gstAmount: "2520.00",
        totalFee: "16520.00",
        status: "state_review",
        currentStage: "state",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3),
        districtNotes: "Luxury property with all modern amenities. Forwarded to state",
        submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1e3)
      }, { trusted: true });
      res.json({
        success: true,
        message: "\u2705 Database seeded successfully with 10 properties!",
        users: 3,
        properties: 10,
        approved: 5,
        inReview: 5,
        testAccounts: {
          propertyOwner: { mobile: "9999999991", password: "test123" },
          districtOfficer: { mobile: "9999999992", password: "test123" },
          stateOfficer: { mobile: "9999999993", password: "test123" }
        }
      });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to seed database",
        error: error.message
      });
    }
  });
  if (process.env.NODE_ENV === "development") {
    app2.get("/api/dev/stats", async (req, res) => {
      const stats = await storage.getStats();
      res.json(stats);
    });
    app2.get("/api/dev/users", async (req, res) => {
      const users2 = await storage.getAllUsers();
      const usersWithoutPasswords = users2.map(({ password, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    });
    app2.post("/api/dev/clear-all", async (req, res) => {
      await storage.clearAll();
      res.json({ message: "All data cleared successfully" });
    });
    app2.post("/api/dev/seed", async (req, res) => {
      try {
        const owner = await storage.createUser({
          fullName: "Demo Property Owner",
          mobile: "9876543210",
          password: "test123",
          role: "property_owner",
          district: "Shimla"
        });
        const districtOfficer = await storage.createUser({
          fullName: "District Officer Shimla",
          mobile: "9876543211",
          password: "test123",
          role: "district_officer",
          district: "Shimla"
        });
        const stateOfficer = await storage.createUser({
          fullName: "State Tourism Officer",
          mobile: "9876543212",
          password: "test123",
          role: "state_officer"
        });
        const app1 = await storage.createApplication({
          userId: owner.id,
          propertyName: "Mountain View Homestay",
          address: "Near Mall Road, Shimla",
          district: "Shimla",
          pincode: "171001",
          ownerName: owner.fullName,
          ownerMobile: owner.mobile,
          ownerEmail: `demo${Date.now()}@example.com`,
          ownerAadhaar: "123456789012",
          totalRooms: 5,
          category: "gold",
          baseFee: "3000",
          perRoomFee: "300",
          gstAmount: "1080",
          totalFee: "7080",
          status: "approved",
          submittedAt: /* @__PURE__ */ new Date(),
          districtOfficerId: districtOfficer.id,
          districtReviewDate: /* @__PURE__ */ new Date(),
          districtNotes: "Excellent property. All criteria met.",
          stateOfficerId: stateOfficer.id,
          stateReviewDate: /* @__PURE__ */ new Date(),
          stateNotes: "Approved for tourism operations.",
          certificateNumber: "HP-HM-2025-001"
        }, { trusted: true });
        const app22 = await storage.createApplication({
          userId: owner.id,
          propertyName: "Valley Retreat",
          address: "Lower Bazaar, Shimla",
          district: "Shimla",
          pincode: "171003",
          ownerName: owner.fullName,
          ownerMobile: owner.mobile,
          ownerEmail: `demo${Date.now() + 1}@example.com`,
          ownerAadhaar: "123456789012",
          totalRooms: 3,
          category: "silver",
          baseFee: "2000",
          perRoomFee: "200",
          gstAmount: "792",
          totalFee: "3392",
          amenities: {
            wifi: true,
            parking: true,
            mountainView: true,
            hotWater: true
          },
          status: "approved",
          submittedAt: /* @__PURE__ */ new Date(),
          districtOfficerId: districtOfficer.id,
          districtReviewDate: /* @__PURE__ */ new Date(),
          districtNotes: "Good property. Meets all requirements.",
          stateOfficerId: stateOfficer.id,
          stateReviewDate: /* @__PURE__ */ new Date(),
          stateNotes: "Approved for tourism operations.",
          certificateNumber: "HP-HM-2025-002"
        }, { trusted: true });
        res.json({
          message: "Sample data created",
          users: 3,
          applications: 2
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to seed data" });
      }
    });
  }
  app2.get("/api/admin/users", requireRole("admin"), async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json({ users: users2 });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.patch("/api/admin/users/:id", requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const {
        role,
        isActive,
        fullName,
        email,
        district,
        password,
        firstName,
        lastName,
        username,
        alternatePhone,
        designation,
        department,
        employeeId,
        officeAddress,
        officePhone
      } = req.body;
      const currentUser = await storage.getUser(req.session.userId);
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const updates = {};
      if (fullName !== void 0 && fullName !== null && fullName.trim()) {
        updates.fullName = fullName.trim();
      }
      if (firstName !== void 0 && firstName !== null) {
        updates.firstName = firstName.trim() || null;
      }
      if (lastName !== void 0 && lastName !== null) {
        updates.lastName = lastName.trim() || null;
      }
      if (username !== void 0 && username !== null) {
        updates.username = username.trim() || null;
      }
      if (email !== void 0 && email !== null) {
        updates.email = email.trim() || null;
      }
      if (alternatePhone !== void 0 && alternatePhone !== null) {
        updates.alternatePhone = alternatePhone.trim() || null;
      }
      if (designation !== void 0 && designation !== null) {
        updates.designation = designation.trim() || null;
      }
      if (department !== void 0 && department !== null) {
        updates.department = department.trim() || null;
      }
      if (employeeId !== void 0 && employeeId !== null) {
        updates.employeeId = employeeId.trim() || null;
      }
      if (district !== void 0 && district !== null) {
        updates.district = district.trim() || null;
      }
      if (officeAddress !== void 0 && officeAddress !== null) {
        updates.officeAddress = officeAddress.trim() || null;
      }
      if (officePhone !== void 0 && officePhone !== null) {
        updates.officePhone = officePhone.trim() || null;
      }
      if (password !== void 0 && password !== null && password.trim()) {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        updates.password = hashedPassword;
      }
      if (role !== void 0) {
        const allowedRoles = ["property_owner", "dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        updates.role = role;
      }
      if (isActive !== void 0) {
        updates.isActive = isActive;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      if (currentUser && id === currentUser.id) {
        if (role && role !== currentUser.role) {
          return res.status(400).json({ message: "Cannot change your own role" });
        }
        if (isActive === false) {
          return res.status(400).json({ message: "Cannot deactivate your own account" });
        }
      }
      if (targetUser.role === "admin" && (!currentUser || id !== currentUser.id)) {
        if (role && role !== targetUser.role) {
          return res.status(403).json({ message: "Cannot change another admin's role" });
        }
        if (isActive === false) {
          return res.status(403).json({ message: "Cannot deactivate another admin" });
        }
      }
      const updatedUser = await storage.updateUser(id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  app2.patch("/api/admin/users/:id/status", requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const currentUser = await storage.getUser(req.session.userId);
      if (currentUser && id === currentUser.id && isActive === false) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.role === "admin" && !isActive && (!currentUser || user.id !== currentUser.id)) {
        return res.status(400).json({ message: "Cannot deactivate other admin users" });
      }
      const updatedUser = await storage.updateUser(id, { isActive });
      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Failed to update user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });
  app2.post("/api/admin/users", requireRole("admin", "super_admin"), async (req, res) => {
    try {
      const {
        mobile,
        fullName,
        role,
        district,
        password,
        firstName,
        lastName,
        username,
        email,
        alternatePhone,
        designation,
        department,
        employeeId,
        officeAddress,
        officePhone
      } = req.body;
      if (role !== "property_owner") {
        if (!mobile || !firstName || !lastName || !password) {
          return res.status(400).json({
            message: "Mobile, first name, last name, and password are required for staff users"
          });
        }
      } else {
        if (!mobile || !fullName || !password) {
          return res.status(400).json({
            message: "Mobile, full name, and password are required"
          });
        }
      }
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: "Invalid mobile number format" });
      }
      const allowedRoles = [
        "property_owner",
        "dealing_assistant",
        "district_tourism_officer",
        "district_officer",
        "state_officer",
        "admin"
      ];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const existingUser = await db.select().from(users).where(eq3(users.mobile, mobile)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({
          message: "A user with this mobile number already exists"
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = {
        mobile,
        fullName: fullName || `${firstName} ${lastName}`,
        // Auto-generate for staff
        role,
        district: district?.trim() || null,
        password: hashedPassword,
        isActive: true
      };
      if (role !== "property_owner") {
        userData.firstName = firstName?.trim() || null;
        userData.lastName = lastName?.trim() || null;
        userData.username = username?.trim() || null;
        userData.email = email?.trim() || null;
        userData.alternatePhone = alternatePhone?.trim() || null;
        userData.designation = designation?.trim() || null;
        userData.department = department?.trim() || null;
        userData.employeeId = employeeId?.trim() || null;
        userData.officeAddress = officeAddress?.trim() || null;
        userData.officePhone = officePhone?.trim() || null;
      }
      const [newUser] = await db.insert(users).values(userData).returning();
      console.log(`[admin] Created new user: ${userData.fullName} (${role}) - ${mobile}`);
      res.json({
        user: newUser,
        message: "User created successfully"
      });
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  app2.post("/api/admin/reset-db", requireRole("admin"), async (req, res) => {
    try {
      const {
        preserveDdoCodes = false,
        preservePropertyOwners = false,
        preserveDistrictOfficers = false,
        preserveStateOfficers = false,
        preserveLgdData = false
      } = req.body;
      console.log("[admin] Starting database reset...", {
        preserveDdoCodes,
        preservePropertyOwners,
        preserveDistrictOfficers,
        preserveStateOfficers,
        preserveLgdData
      });
      const safeDelete = async (table, tableName) => {
        try {
          await db.delete(table);
          console.log(`[admin] \u2713 Deleted all ${tableName}`);
        } catch (error) {
          if (error.code === "42P01") {
            console.log(`[admin] \u2299 Skipped ${tableName} (table doesn't exist yet)`);
          } else {
            throw error;
          }
        }
      };
      await safeDelete(inspectionReports, "inspection reports");
      await safeDelete(inspectionOrders, "inspection orders");
      await safeDelete(certificates, "certificates");
      await safeDelete(clarifications, "clarifications");
      await safeDelete(objections, "objections");
      await safeDelete(applicationActions, "application actions");
      await safeDelete(reviews, "reviews");
      await safeDelete(himkoshTransactions, "HimKosh transactions");
      await safeDelete(payments, "payments");
      await safeDelete(documents, "documents");
      await safeDelete(homestayApplications, "homestay applications");
      await safeDelete(notifications, "notifications");
      await safeDelete(auditLogs, "audit logs");
      await safeDelete(productionStats, "production stats");
      let ddoCodesStatus = "preserved (configuration data)";
      if (!preserveDdoCodes) {
        await db.delete(ddoCodes);
        ddoCodesStatus = "deleted";
        console.log(`[admin] \u2713 Deleted all DDO codes`);
      } else {
        console.log(`[admin] \u2299 Preserved DDO codes (configuration data)`);
      }
      console.log(`[admin] \u2299 Preserved system settings (configuration data)`);
      let lgdDataStatus = "preserved (configuration data)";
      if (!preserveLgdData) {
        await db.delete(lgdUrbanBodies);
        await db.delete(lgdGramPanchayats);
        await db.delete(lgdBlocks);
        await db.delete(lgdTehsils);
        await db.delete(lgdDistricts);
        lgdDataStatus = "deleted";
        console.log(`[admin] \u2713 Deleted all LGD master data`);
      } else {
        console.log(`[admin] \u2299 Preserved LGD master data (configuration data)`);
      }
      const rolesToPreserve = ["admin", "super_admin"];
      if (preservePropertyOwners) {
        rolesToPreserve.push("property_owner");
      }
      if (preserveDistrictOfficers) {
        rolesToPreserve.push("dealing_assistant", "district_tourism_officer", "district_officer");
      }
      if (preserveStateOfficers) {
        rolesToPreserve.push("state_officer");
      }
      console.log(`[admin] Roles to preserve:`, rolesToPreserve);
      const deletedProfiles = await db.delete(userProfiles).where(
        sql2`${userProfiles.userId} IN (SELECT id FROM ${users} WHERE ${notInArray(users.role, rolesToPreserve)})`
      ).returning();
      console.log(`[admin] \u2713 Deleted ${deletedProfiles.length} user profiles for non-preserved roles`);
      const deletedUsers = await db.delete(users).where(
        notInArray(users.role, rolesToPreserve)
      ).returning();
      const preservedUsers = await db.select().from(users);
      const preservedCounts = preservedUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      console.log(`[admin] \u2713 Deleted ${deletedUsers.length} users (preserved ${preservedUsers.length} accounts)`);
      console.log("[admin] \u2705 Database reset complete");
      res.json({
        message: "Database reset successful",
        deleted: {
          inspectionReports: "all",
          inspectionOrders: "all",
          certificates: "all",
          clarifications: "all",
          objections: "all",
          applicationActions: "all",
          reviews: "all",
          himkoshTransactions: "all",
          payments: "all",
          documents: "all",
          applications: "all",
          notifications: "all",
          auditLogs: "all",
          productionStats: "all",
          ddoCodes: ddoCodesStatus,
          userProfiles: `${deletedProfiles.length} deleted, ${preservedUsers.length} preserved`,
          users: `${deletedUsers.length} deleted`
        },
        preserved: {
          totalUsers: preservedUsers.length,
          byRole: preservedCounts,
          ddoCodes: preserveDdoCodes,
          propertyOwners: preservePropertyOwners,
          districtOfficers: preserveDistrictOfficers,
          stateOfficers: preserveStateOfficers,
          lgdData: preserveLgdData,
          systemSettings: "always preserved"
        }
      });
    } catch (error) {
      console.error("[admin] \u274C Database reset failed:", error);
      res.status(500).json({
        message: "Failed to reset database",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/admin/dashboard/stats", requireRole("super_admin"), async (req, res) => {
    try {
      const allApplications = await db.select().from(homestayApplications);
      const statusCounts = allApplications.reduce((acc, app3) => {
        const statusKey = app3.status ?? "unknown";
        acc[statusKey] = (acc[statusKey] || 0) + 1;
        return acc;
      }, {});
      const allUsers = await db.select().from(users);
      const propertyOwners = allUsers.filter((u) => u.role === "property_owner").length;
      const officers = allUsers.filter((u) => ["dealing_assistant", "district_tourism_officer", "state_officer"].includes(u.role)).length;
      const admins = allUsers.filter((u) => ["admin", "super_admin"].includes(u.role)).length;
      const [allInspectionOrders, allInspectionReports] = await Promise.all([
        db.select().from(inspectionOrders),
        db.select().from(inspectionReports)
      ]);
      const allPayments = await db.select().from(payments);
      const completedPayments = allPayments.filter((p) => p.paymentStatus === "completed");
      const totalAmount = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      res.json({
        applications: {
          total: allApplications.length,
          pending: statusCounts["submitted"] || 0,
          underReview: statusCounts["under_review"] || 0,
          approved: statusCounts["approved"] || 0,
          rejected: statusCounts["rejected"] || 0,
          draft: statusCounts["draft"] || 0
        },
        users: {
          total: allUsers.length,
          propertyOwners,
          officers,
          admins
        },
        inspections: {
          scheduled: allInspectionOrders.length,
          completed: allInspectionReports.length,
          pending: allInspectionOrders.length - allInspectionReports.length
        },
        payments: {
          total: allPayments.length,
          completed: completedPayments.length,
          pending: allPayments.length - completedPayments.length,
          totalAmount
        }
      });
    } catch (error) {
      console.error("[admin] Failed to fetch dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
  app2.get("/api/admin/stats", requireRole("super_admin"), async (req, res) => {
    try {
      const environment = process.env.NODE_ENV || "development";
      const [superConsoleSetting] = await db.select().from(systemSettings).where(eq3(systemSettings.settingKey, "admin_super_console_enabled")).limit(1);
      let superConsoleOverride = false;
      if (superConsoleSetting) {
        const value = superConsoleSetting.settingValue;
        if (typeof value === "boolean") {
          superConsoleOverride = value;
        } else if (value && typeof value === "object") {
          if ("enabled" in value) {
            superConsoleOverride = Boolean(value.enabled);
          }
        } else if (typeof value === "string") {
          superConsoleOverride = value === "true";
        }
      }
      const resetEnabled = superConsoleOverride || environment === "development" || environment === "test";
      const [
        applicationsCount,
        usersCount,
        documentsCount,
        paymentsCount
      ] = await Promise.all([
        db.select().from(homestayApplications).then((r) => r.length),
        db.select().from(users).then((r) => r.length),
        db.select().from(documents).then((r) => r.length),
        db.select().from(payments).then((r) => r.length)
      ]);
      const applications = await db.select().from(homestayApplications);
      const byStatus = applications.reduce((acc, app3) => {
        const statusKey = app3.status ?? "unknown";
        acc[statusKey] = (acc[statusKey] || 0) + 1;
        return acc;
      }, {});
      const allUsers = await db.select().from(users);
      const byRole = allUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      const dbSize = "N/A";
      const tables = 10;
      res.json({
        database: {
          size: dbSize,
          tables
        },
        applications: {
          total: applicationsCount,
          byStatus
        },
        users: {
          total: usersCount,
          byRole
        },
        files: {
          total: documentsCount,
          totalSize: "N/A"
          // Would need to calculate from storage
        },
        environment,
        resetEnabled,
        superConsoleOverride
      });
    } catch (error) {
      console.error("[admin] Failed to fetch stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });
  app2.get("/api/admin/settings/super-console", requireRole("super_admin"), async (_req, res) => {
    try {
      const [setting] = await db.select().from(systemSettings).where(eq3(systemSettings.settingKey, "admin_super_console_enabled")).limit(1);
      let enabled = false;
      if (setting) {
        const value = setting.settingValue;
        if (typeof value === "boolean") {
          enabled = value;
        } else if (value && typeof value === "object" && "enabled" in value) {
          enabled = Boolean(value.enabled);
        } else if (typeof value === "string") {
          enabled = value === "true";
        }
      }
      res.json({ enabled, environment: process.env.NODE_ENV || "development" });
    } catch (error) {
      console.error("[admin] Failed to fetch super console setting:", error);
      res.status(500).json({ message: "Failed to fetch super console setting" });
    }
  });
  app2.post("/api/admin/settings/super-console/toggle", requireRole("super_admin"), async (req, res) => {
    try {
      const { enabled } = req.body;
      const userId = req.session.userId || null;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      const [existingSetting] = await db.select().from(systemSettings).where(eq3(systemSettings.settingKey, "admin_super_console_enabled")).limit(1);
      if (existingSetting) {
        const [updated] = await db.update(systemSettings).set({
          settingValue: { enabled },
          description: existingSetting.description || "Controls whether Super Admin Console is available in production environments",
          category: existingSetting.category || "security",
          updatedBy: userId,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(systemSettings.settingKey, "admin_super_console_enabled")).returning();
        console.log(`[admin] Super console override ${enabled ? "enabled" : "disabled"}`);
        res.json(updated);
      } else {
        const [created] = await db.insert(systemSettings).values({
          settingKey: "admin_super_console_enabled",
          settingValue: { enabled },
          description: "Controls whether Super Admin Console is available in production environments",
          category: "security",
          updatedBy: userId
        }).returning();
        console.log(`[admin] Super console override ${enabled ? "enabled" : "disabled"}`);
        res.json(created);
      }
    } catch (error) {
      console.error("[admin] Failed to toggle super console:", error);
      res.status(500).json({ message: "Failed to toggle super console" });
    }
  });
  app2.get("/api/admin/settings/:key", requireRole("admin"), async (req, res) => {
    try {
      const { key } = req.params;
      const [setting] = await db.select().from(systemSettings).where(eq3(systemSettings.settingKey, key)).limit(1);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("[admin] Failed to fetch setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });
  app2.put("/api/admin/settings/:key", requireRole("admin"), async (req, res) => {
    try {
      const { key } = req.params;
      const { settingValue, description } = req.body;
      const userId = req.session.userId || null;
      if (!settingValue) {
        return res.status(400).json({ message: "Setting value is required" });
      }
      const [existingSetting] = await db.select().from(systemSettings).where(eq3(systemSettings.settingKey, key)).limit(1);
      if (existingSetting) {
        const [updated] = await db.update(systemSettings).set({
          settingValue,
          description: description || existingSetting.description,
          updatedBy: userId,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(systemSettings.settingKey, key)).returning();
        console.log(`[admin] Updated setting: ${key}`);
        res.json(updated);
      } else {
        const [created] = await db.insert(systemSettings).values({
          settingKey: key,
          settingValue,
          description: description || "",
          category: key.startsWith("payment_") ? "payment" : "general",
          updatedBy: userId
        }).returning();
        console.log(`[admin] Created setting: ${key}`);
        res.json(created);
      }
    } catch (error) {
      console.error("[admin] Failed to update setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });
  app2.get("/api/admin/settings/payment/test-mode", requireRole("admin"), async (req, res) => {
    try {
      const [setting] = await db.select().from(systemSettings).where(eq3(systemSettings.settingKey, "payment_test_mode")).limit(1);
      if (!setting) {
        res.json({ enabled: false, isDefault: true });
      } else {
        const value = setting.settingValue;
        res.json({ enabled: value.enabled, isDefault: false });
      }
    } catch (error) {
      console.error("[admin] Failed to fetch test payment mode:", error);
      res.status(500).json({ message: "Failed to fetch test payment mode" });
    }
  });
  app2.post("/api/admin/settings/payment/test-mode/toggle", requireRole("admin"), async (req, res) => {
    try {
      const { enabled } = req.body;
      const userId = req.session.userId || null;
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      const [existingSetting] = await db.select().from(systemSettings).where(eq3(systemSettings.settingKey, "payment_test_mode")).limit(1);
      if (existingSetting) {
        const [updated] = await db.update(systemSettings).set({
          settingValue: { enabled },
          updatedBy: userId,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq3(systemSettings.settingKey, "payment_test_mode")).returning();
        console.log(`[admin] Test payment mode ${enabled ? "enabled" : "disabled"}`);
        res.json(updated);
      } else {
        const [created] = await db.insert(systemSettings).values({
          settingKey: "payment_test_mode",
          settingValue: { enabled },
          description: "When enabled, payment requests send \u20B91 to gateway instead of actual amount (for testing)",
          category: "payment",
          updatedBy: userId
        }).returning();
        console.log(`[admin] Test payment mode ${enabled ? "enabled" : "disabled"}`);
        res.json(created);
      }
    } catch (error) {
      console.error("[admin] Failed to toggle test payment mode:", error);
      res.status(500).json({ message: "Failed to toggle test payment mode" });
    }
  });
  app2.post("/api/admin/db-console/execute", requireRole("admin"), async (req, res) => {
    try {
      const { query: sqlQuery } = req.body;
      if (!sqlQuery || typeof sqlQuery !== "string") {
        return res.status(400).json({ message: "SQL query is required" });
      }
      const environment = process.env.NODE_ENV || "development";
      if (environment === "production") {
        return res.status(403).json({
          message: "Database console is disabled in production for security"
        });
      }
      const trimmedQuery = sqlQuery.trim().toLowerCase();
      const isSelect = trimmedQuery.startsWith("select");
      const isShow = trimmedQuery.startsWith("show");
      const isDescribe = trimmedQuery.startsWith("describe") || trimmedQuery.startsWith("\\d");
      const isExplain = trimmedQuery.startsWith("explain");
      const isReadOnly = isSelect || isShow || isDescribe || isExplain;
      console.log(`[db-console] Executing ${isReadOnly ? "READ" : "WRITE"} query:`, sqlQuery.substring(0, 100));
      const result = await db.execute(sql2.raw(sqlQuery));
      let rows = [];
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && result.rows) {
        rows = result.rows;
      } else if (result) {
        rows = [result];
      }
      const response = {
        success: true,
        type: isReadOnly ? "read" : "write",
        rowCount: rows.length,
        data: rows,
        query: sqlQuery
      };
      console.log(`[db-console] Query returned ${rows.length} row(s)`);
      res.json(response);
    } catch (error) {
      console.error("[db-console] Query execution failed:", error);
      res.status(500).json({
        success: false,
        message: "Query execution failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/admin/db-console/tables", requireRole("admin"), async (req, res) => {
    try {
      const environment = process.env.NODE_ENV || "development";
      if (environment === "production") {
        return res.status(403).json({
          message: "Database console is disabled in production"
        });
      }
      const result = await db.execute(sql2`
        SELECT table_name, 
               pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      res.json({ tables: result });
    } catch (error) {
      console.error("[db-console] Failed to fetch tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });
  app2.get("/api/admin/db-console/table/:tableName/schema", requireRole("admin"), async (req, res) => {
    try {
      const { tableName } = req.params;
      const environment = process.env.NODE_ENV || "development";
      if (environment === "production") {
        return res.status(403).json({
          message: "Database console is disabled in production"
        });
      }
      const result = await db.execute(sql2.raw(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `));
      res.json({ schema: result });
    } catch (error) {
      console.error("[db-console] Failed to fetch table schema:", error);
      res.status(500).json({ message: "Failed to fetch table schema" });
    }
  });
  app2.post("/api/admin/reset/:operation", requireRole("super_admin"), async (req, res) => {
    try {
      const { operation } = req.params;
      const { confirmationText, reason } = req.body;
      const environment = process.env.NODE_ENV || "development";
      if (environment === "production") {
        return res.status(403).json({
          message: "Reset operations are disabled in production"
        });
      }
      const requiredText = operation === "full" ? "RESET" : "DELETE";
      if (confirmationText !== requiredText) {
        return res.status(400).json({
          message: `Confirmation text must be "${requiredText}"`
        });
      }
      if (!reason || reason.length < 10) {
        return res.status(400).json({
          message: "Reason must be at least 10 characters"
        });
      }
      console.log(`[super-admin] Reset operation: ${operation}, reason: ${reason}`);
      let deletedCounts = {};
      switch (operation) {
        case "full":
          await db.delete(certificates);
          await db.delete(clarifications);
          await db.delete(objections);
          await db.delete(inspectionReports);
          await db.delete(inspectionOrders);
          await db.delete(documents);
          await db.delete(payments);
          await db.delete(homestayApplications);
          await db.delete(productionStats);
          await db.delete(users).where(ne(users.role, "super_admin"));
          deletedCounts = { all: "All data except super_admin accounts" };
          break;
        case "applications":
          await db.delete(certificates);
          await db.delete(clarifications);
          await db.delete(objections);
          await db.delete(inspectionReports);
          await db.delete(inspectionOrders);
          await db.delete(documents);
          await db.delete(payments);
          const deletedApps = await db.delete(homestayApplications);
          deletedCounts = { applications: "all" };
          break;
        case "users":
          const deletedUsers = await db.delete(users).where(ne(users.role, "super_admin"));
          deletedCounts = { users: "All non-super_admin users" };
          break;
        case "files":
          const deletedDocs = await db.delete(documents);
          deletedCounts = { documents: "all" };
          break;
        case "timeline":
          deletedCounts = { timeline: "not yet implemented" };
          break;
        case "inspections":
          await db.delete(inspectionReports);
          await db.delete(inspectionOrders);
          deletedCounts = { inspections: "all orders and reports" };
          break;
        case "objections":
          await db.delete(clarifications);
          await db.delete(objections);
          deletedCounts = { objections: "all objections and clarifications" };
          break;
        case "payments":
          await db.delete(payments);
          deletedCounts = { payments: "all" };
          break;
        default:
          return res.status(400).json({ message: "Invalid operation" });
      }
      res.json({
        success: true,
        message: `Reset operation '${operation}' completed successfully`,
        deletedCounts
      });
    } catch (error) {
      console.error("[super-admin] Reset failed:", error);
      res.status(500).json({ message: "Reset operation failed" });
    }
  });
  app2.post("/api/admin/seed/:type", requireRole("super_admin"), async (req, res) => {
    try {
      const { type } = req.params;
      const { count = 10, scenario } = req.body;
      console.log(`[super-admin] Seeding data: ${type}, count: ${count}, scenario: ${scenario}`);
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      switch (type) {
        case "applications":
          const createdApps = [];
          for (let i = 0; i < count; i++) {
            const nightlyRate = 2e3 + i * 150;
            const app3 = await storage.createApplication({
              userId: currentUser.id,
              propertyName: `Test Property ${i + 1}`,
              category: ["diamond", "gold", "silver"][i % 3],
              totalRooms: 4,
              address: `Test Address ${i + 1}, Shimla`,
              district: "Shimla",
              pincode: "171001",
              locationType: "mc",
              ownerName: `Test Owner ${i + 1}`,
              ownerMobile: `98${String(765e6 + i)}`,
              ownerEmail: `test${i + 1}@example.com`,
              ownerAadhaar: `${(1e11 + i).toString().slice(-12)}`,
              proposedRoomRate: nightlyRate,
              projectType: "new_project",
              propertyArea: 1200,
              singleBedRooms: 2,
              doubleBedRooms: 1,
              familySuites: 1,
              attachedWashrooms: 4,
              amenities: {
                wifi: true,
                parking: i % 2 === 0,
                restaurant: i % 3 === 0
              },
              baseFee: (4e3 + i * 250).toString(),
              totalFee: (6e3 + i * 300).toString(),
              status: "draft",
              currentPage: 1,
              maxStepReached: 1
            });
            createdApps.push(app3);
          }
          return res.json({
            success: true,
            message: `Created ${createdApps.length} test applications`
          });
        case "users":
          const testUsers = [];
          const roles = ["property_owner", "dealing_assistant", "district_tourism_officer", "state_officer"];
          for (const role of roles) {
            const user = await storage.createUser({
              fullName: `Test ${role.replace(/_/g, " ")}`,
              mobile: `9${role.length}${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
              email: `test.${role}@example.com`,
              password: "Test@123",
              role,
              district: role.includes("district") ? "shimla" : void 0
            });
            testUsers.push(user);
          }
          return res.json({
            success: true,
            message: `Created ${testUsers.length} test users (all roles)`
          });
        case "scenario":
          return res.json({
            success: true,
            message: `Scenario '${scenario}' loaded (not yet implemented)`
          });
        default:
          return res.status(400).json({ message: "Invalid seed type" });
      }
    } catch (error) {
      console.error("[super-admin] Seed failed:", error);
      res.status(500).json({ message: "Failed to generate test data" });
    }
  });
  app2.post("/api/admin/lgd/import", requireRole("admin"), async (req, res) => {
    try {
      const { csvData, dataType } = req.body;
      if (!csvData || !dataType) {
        return res.status(400).json({ message: "Missing csvData or dataType" });
      }
      const lines = csvData.trim().split("\n");
      const headers = lines[0].split(",");
      let inserted = {
        districts: 0,
        tehsils: 0,
        blocks: 0,
        gramPanchayats: 0,
        urbanBodies: 0
      };
      if (dataType === "villages") {
        const districtMap = /* @__PURE__ */ new Map();
        const tehsilMap = /* @__PURE__ */ new Map();
        const villages = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",");
          if (values.length < 9 || values[0] !== "2") continue;
          const districtCode = values[2];
          const districtName = values[3];
          const tehsilCode = values[4];
          const tehsilName = values[5];
          const villageCode = values[6];
          const villageName = values[7];
          const pincode = values[8];
          districtMap.set(districtCode, { lgdCode: districtCode, districtName });
          const tehsilKey = `${districtCode}-${tehsilCode}`;
          tehsilMap.set(tehsilKey, {
            lgdCode: tehsilCode,
            tehsilName,
            districtCode
          });
          villages.push({
            lgdCode: villageCode,
            gramPanchayatName: villageName,
            tehsilCode,
            districtCode,
            pincode: pincode || null
          });
        }
        for (const [, data] of Array.from(districtMap.entries())) {
          await db.insert(lgdDistricts).values({
            lgdCode: data.lgdCode,
            districtName: data.districtName,
            isActive: true
          }).onConflictDoNothing();
          inserted.districts++;
        }
        const existingDistricts = await db.select().from(lgdDistricts);
        const districtIdMap = /* @__PURE__ */ new Map();
        existingDistricts.forEach((district) => {
          if (district.lgdCode) {
            districtIdMap.set(district.lgdCode, district.id);
          }
          districtIdMap.set(district.districtName, district.id);
        });
        for (const [, data] of Array.from(tehsilMap.entries())) {
          const districtId = districtIdMap.get(data.districtCode);
          if (districtId) {
            await db.insert(lgdTehsils).values({
              lgdCode: data.lgdCode,
              tehsilName: data.tehsilName,
              districtId,
              isActive: true
            }).onConflictDoNothing();
            inserted.tehsils++;
          }
        }
        for (const village of villages) {
          const districtId = districtIdMap.get(village.districtCode);
          if (!districtId) continue;
          await db.insert(lgdGramPanchayats).values({
            lgdCode: village.lgdCode,
            gramPanchayatName: village.gramPanchayatName,
            districtId,
            blockId: null,
            isActive: true
          }).onConflictDoNothing();
          inserted.gramPanchayats++;
        }
      } else if (dataType === "urbanBodies") {
        const [defaultDistrict] = await db.select().from(lgdDistricts).limit(1);
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",");
          if (values.length < 6 || values[0] !== "2") continue;
          const bodyCode = values[2];
          const bodyName = values[3];
          const bodyType = values[4];
          const pincode = values[5];
          if (!defaultDistrict) {
            console.warn("[LGD] No districts available; skipping urban body import");
            break;
          }
          const normalizedType = (() => {
            const value = bodyType?.toLowerCase() || "";
            if (value.includes("corporation")) return "mc";
            if (value.includes("council") || value.includes("tcp")) return "tcp";
            return "np";
          })();
          await db.insert(lgdUrbanBodies).values({
            lgdCode: bodyCode,
            urbanBodyName: bodyName,
            bodyType: normalizedType,
            districtId: defaultDistrict.id,
            numberOfWards: null,
            isActive: true
          }).onConflictDoNothing();
          inserted.urbanBodies++;
        }
      } else {
        return res.status(400).json({ message: "Invalid dataType. Must be 'villages' or 'urbanBodies'" });
      }
      res.json({
        success: true,
        message: `Successfully imported LGD data (${dataType})`,
        inserted
      });
    } catch (error) {
      console.error("[admin] LGD import failed:", error);
      res.status(500).json({ message: "Failed to import LGD data", error: String(error) });
    }
  });
  app2.use("/api/himkosh", routes_default);
  console.log("[himkosh] Payment gateway routes registered");
  startScraperScheduler();
  console.log("[scraper] Production stats scraper initialized");
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs5 from "fs";
import path5 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path4 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path4.resolve(import.meta.dirname, "client", "src"),
      "@shared": path4.resolve(import.meta.dirname, "shared"),
      "@assets": path4.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path4.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path4.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid as nanoid2 } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path5.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs5.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path5.resolve(import.meta.dirname, "public");
  if (!fs5.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path5.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
