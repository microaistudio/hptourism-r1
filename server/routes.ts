import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  type User, 
  type HomestayApplication, 
  homestayApplications, 
  documents, 
  payments, 
  productionStats, 
  users,
  userProfiles,
  insertUserProfileSchema,
  type UserProfile,
  inspectionOrders,
  inspectionReports,
  objections,
  clarifications,
  certificates,
  notifications,
  applicationActions,
  reviews,
  auditLogs,
  himkoshTransactions,
  ddoCodes,
  systemSettings,
  type SystemSetting,
  lgdDistricts,
  lgdTehsils,
  lgdBlocks,
  lgdGramPanchayats,
  lgdUrbanBodies
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcrypt";
import { eq, desc, ne, notInArray, and, sql } from "drizzle-orm";
import { startScraperScheduler } from "./scraper";
import { ObjectStorageService } from "./objectStorage";
import himkoshRoutes from "./himkosh/routes";

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Role Hierarchy: Maps each role to all roles it can act as (including itself)
// super_admin inherits all admin privileges plus additional super_admin-only features
const ROLE_HIERARCHY: Record<string, string[]> = {
  'property_owner': ['property_owner'],
  'dealing_assistant': ['dealing_assistant'],
  'district_tourism_officer': ['district_tourism_officer'],
  'district_officer': ['district_officer'],
  'state_officer': ['state_officer'],
  'admin': ['admin'],
  'super_admin': ['super_admin', 'admin'], // super_admin inherits all admin permissions
};

// Get effective roles for a user (includes inherited roles)
function getEffectiveRoles(userRole: string): string[] {
  return ROLE_HIERARCHY[userRole] || [userRole];
}

// Auth middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Role-based middleware with hierarchy support
// super_admin automatically satisfies any admin check
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    // Get effective roles including inherited ones
    const effectiveRoles = getEffectiveRoles(user.role);
    
    // Check if user has any of the required roles (including via inheritance)
    const hasPermission = roles.some(role => effectiveRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // PostgreSQL session store for production
  const PgSession = connectPgSimple(session);
  
  // Session middleware
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "hp-tourism-secret-dev-only",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to false for HTTP (non-HTTPS) deployments
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  // Auth Routes
  
  // Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      // SECURITY: Force role to property_owner BEFORE validation
      // This prevents role escalation attacks via direct API calls
      const rawData = {
        ...req.body,
        role: 'property_owner', // FORCE property_owner role - override any client input
        email: req.body.email || undefined,
        aadhaarNumber: req.body.aadhaarNumber || undefined,
        district: req.body.district || undefined,
      };
      
      const data = insertUserSchema.parse(rawData);
      
      // Check if user already exists
      const existing = await storage.getUserByMobile(data.mobile);
      if (existing) {
        return res.status(400).json({ message: "Mobile number already registered" });
      }
      
      // Hash password before storing
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      
      // Auto-login after registration
      req.session.userId = user.id;
      
      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('[registration] Error during registration:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message, errors: error.errors });
      }
      
      // Handle duplicate Aadhaar number error
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        if ('constraint' in error && error.constraint === 'users_aadhaar_number_unique') {
          return res.status(400).json({ 
            message: "This Aadhaar number is already registered. Please login or use a different Aadhaar number." 
          });
        }
      }
      
      res.status(500).json({ message: "Registration failed", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { mobile, password } = req.body;
      
      if (!mobile || !password) {
        return res.status(400).json({ message: "Mobile and password required" });
      }
      
      const user = await storage.getUserByMobile(mobile);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Compare password with bcrypt hash
      const bcrypt = await import('bcrypt');
      const passwordMatch = await bcrypt.compare(password, user.password);
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

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
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

  // User Profile Routes
  
  // Get user profile
  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error('[profile] Error fetching profile:', error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  
  // Create or update user profile
  app.post("/api/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Validate profile data
      const profileData = insertUserProfileSchema.parse(req.body);
      
      // Check if profile already exists
      const [existingProfile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      
      let profile;
      
      if (existingProfile) {
        // Update existing profile
        [profile] = await db
          .update(userProfiles)
          .set({
            ...profileData,
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.userId, userId))
          .returning();
      } else {
        // Create new profile
        [profile] = await db
          .insert(userProfiles)
          .values({
            ...profileData,
            userId,
          })
          .returning();
      }
      
      res.json({ 
        profile, 
        message: existingProfile ? "Profile updated successfully" : "Profile created successfully" 
      });
    } catch (error) {
      console.error('[profile] Error saving profile:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0].message, 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to save profile" });
    }
  });

  // Homestay Application Routes
  
  // File Upload - Get presigned upload URL
  app.get("/api/upload-url", requireAuth, async (req, res) => {
    try {
      const fileType = (req.query.fileType as string) || "document";
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getUploadURL(fileType);
      const filePath = objectStorageService.normalizeObjectPath(uploadURL);
      res.json({ uploadUrl: uploadURL, filePath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // File View - Get presigned view URL and redirect
  app.get("/api/object-storage/view", requireAuth, async (req, res) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const viewURL = await objectStorageService.getViewURL(filePath);
      
      // Redirect to the signed URL
      res.redirect(viewURL);
    } catch (error) {
      console.error("Error getting view URL:", error);
      res.status(500).json({ message: "Failed to get view URL" });
    }
  });
  
  // Save application as draft (partial data allowed)
  // ENFORCE ONE-APPLICATION-PER-OWNER RULE: Check for existing application first
  app.post("/api/applications/draft", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // For drafts, accept any partial data - validation is minimal
      const draftSchema = z.object({
        propertyName: z.string().optional(),
        category: z.enum(['diamond', 'gold', 'silver']).optional(),
        address: z.string().optional(),
        district: z.string().optional(),
        pincode: z.string().optional(),
        locationType: z.enum(['mc', 'tcp', 'gp']).optional(),
        telephone: z.string().optional(),
        fax: z.string().optional(),
        ownerName: z.string().optional(),
        ownerMobile: z.string().optional(),
        ownerEmail: z.string().optional(),
        ownerAadhaar: z.string().optional(),
        proposedRoomRate: z.coerce.number().optional(),
        singleBedRoomRate: z.coerce.number().optional(),
        doubleBedRoomRate: z.coerce.number().optional(),
        familySuiteRate: z.coerce.number().optional(),
        projectType: z.enum(['new_rooms', 'new_project']).optional(),
        propertyArea: z.coerce.number().optional(),
        singleBedRooms: z.coerce.number().optional(),
        singleBedRoomSize: z.coerce.number().optional(),
        doubleBedRooms: z.coerce.number().optional(),
        doubleBedRoomSize: z.coerce.number().optional(),
        familySuites: z.coerce.number().optional(),
        familySuiteSize: z.coerce.number().optional(),
        attachedWashrooms: z.coerce.number().optional(),
        gstin: z.string().optional(),
        distanceAirport: z.coerce.number().optional(),
        distanceRailway: z.coerce.number().optional(),
        distanceCityCenter: z.coerce.number().optional(),
        distanceShopping: z.coerce.number().optional(),
        distanceBusStand: z.coerce.number().optional(),
        lobbyArea: z.coerce.number().optional(),
        diningArea: z.coerce.number().optional(),
        parkingArea: z.string().optional(),
        ecoFriendlyFacilities: z.string().optional(),
        differentlyAbledFacilities: z.string().optional(),
        fireEquipmentDetails: z.string().optional(),
        nearestHospital: z.string().optional(),
        amenities: z.any().optional(),
        // 2025 Fee Structure - handle NaN for incomplete drafts
        baseFee: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        totalBeforeDiscounts: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        validityDiscount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        femaleOwnerDiscount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        pangiDiscount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        totalDiscount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        totalFee: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        // Legacy fields
        perRoomFee: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        gstAmount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        // 2025 Fields
        certificateValidityYears: z.coerce.number().optional(),
        isPangiSubDivision: z.boolean().optional(),
        ownerGender: z.enum(['male', 'female', 'other']).optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        currentPage: z.coerce.number().optional(), // Track which page user was on
        documents: z.array(z.object({
          filePath: z.string(),
          fileName: z.string(),
          fileSize: z.number(),
          mimeType: z.string(),
          documentType: z.string(),
        })).optional(),
      });
      
      const validatedData = draftSchema.parse(req.body);
      
      // Calculate totalRooms if room data exists
      const totalRooms = (validatedData.singleBedRooms || 0) + 
                        (validatedData.doubleBedRooms || 0) + 
                        (validatedData.familySuites || 0);

      // ONE-APPLICATION-PER-OWNER RULE: Check if user already has an active application
      const existingApp = await storage.getUserActiveApplication(userId);
      
      let application;
      if (existingApp) {
        // Update existing application instead of creating a new one
        application = await storage.updateApplication(existingApp.id, {
          ...validatedData,
          totalRooms: totalRooms || existingApp.totalRooms,
        } as any);
      } else {
        // Create new application only if none exists
        application = await storage.createApplication({
          ...validatedData,
          userId,
          totalRooms: totalRooms || 0,
          status: 'draft', // Explicitly set as draft
        } as any);
      }

      res.json({ 
        application, 
        message: existingApp 
          ? "Draft updated successfully. You can continue editing anytime." 
          : "Draft saved successfully. You can continue editing anytime."
      });
    } catch (error) {
      console.error("Draft save error:", error);
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  // Update existing draft
  app.patch("/api/applications/:id/draft", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      
      // Check if application exists and belongs to user
      const existing = await storage.getApplication(id);
      if (!existing) {
        return res.status(404).json({ message: "Application not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this application" });
      }
      if (existing.status !== 'draft') {
        return res.status(400).json({ message: "Can only update draft applications" });
      }
      
      // Same minimal validation as create draft
      const draftSchema = z.object({
        propertyName: z.string().optional(),
        category: z.enum(['diamond', 'gold', 'silver']).optional(),
        address: z.string().optional(),
        district: z.string().optional(),
        pincode: z.string().optional(),
        locationType: z.enum(['mc', 'tcp', 'gp']).optional(),
        telephone: z.string().optional(),
        fax: z.string().optional(),
        ownerName: z.string().optional(),
        ownerMobile: z.string().optional(),
        ownerEmail: z.string().optional(),
        ownerAadhaar: z.string().optional(),
        proposedRoomRate: z.coerce.number().optional(),
        singleBedRoomRate: z.coerce.number().optional(),
        doubleBedRoomRate: z.coerce.number().optional(),
        familySuiteRate: z.coerce.number().optional(),
        projectType: z.enum(['new_rooms', 'new_project']).optional(),
        propertyArea: z.coerce.number().optional(),
        singleBedRooms: z.coerce.number().optional(),
        singleBedRoomSize: z.coerce.number().optional(),
        doubleBedRooms: z.coerce.number().optional(),
        doubleBedRoomSize: z.coerce.number().optional(),
        familySuites: z.coerce.number().optional(),
        familySuiteSize: z.coerce.number().optional(),
        attachedWashrooms: z.coerce.number().optional(),
        gstin: z.string().optional(),
        distanceAirport: z.coerce.number().optional(),
        distanceRailway: z.coerce.number().optional(),
        distanceCityCenter: z.coerce.number().optional(),
        distanceShopping: z.coerce.number().optional(),
        distanceBusStand: z.coerce.number().optional(),
        lobbyArea: z.coerce.number().optional(),
        diningArea: z.coerce.number().optional(),
        parkingArea: z.string().optional(),
        ecoFriendlyFacilities: z.string().optional(),
        differentlyAbledFacilities: z.string().optional(),
        fireEquipmentDetails: z.string().optional(),
        nearestHospital: z.string().optional(),
        amenities: z.any().optional(),
        // 2025 Fee Structure - handle NaN for incomplete drafts
        baseFee: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        totalBeforeDiscounts: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        validityDiscount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        femaleOwnerDiscount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        pangiDiscount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        totalDiscount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        totalFee: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        // Legacy fields
        perRoomFee: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        gstAmount: z.preprocess((val) => (typeof val === 'number' && isNaN(val)) ? undefined : val, z.coerce.number().optional()),
        // 2025 Fields
        certificateValidityYears: z.coerce.number().optional(),
        isPangiSubDivision: z.boolean().optional(),
        ownerGender: z.enum(['male', 'female', 'other']).optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        currentPage: z.coerce.number().optional(), // Track which page user was on
        documents: z.array(z.object({
          filePath: z.string(),
          fileName: z.string(),
          fileSize: z.number(),
          mimeType: z.string(),
          documentType: z.string(),
        })).optional(),
      });
      
      const validatedData = draftSchema.parse(req.body);
      
      // Calculate totalRooms if room data exists
      const totalRooms = (validatedData.singleBedRooms || 0) + 
                        (validatedData.doubleBedRooms || 0) + 
                        (validatedData.familySuites || 0);

      // Update draft application
      const updated = await storage.updateApplication(id, {
        ...validatedData,
        totalRooms: totalRooms || existing.totalRooms,
      } as any);

      res.json({ 
        application: updated, 
        message: "Draft updated successfully" 
      });
    } catch (error) {
      console.error("Draft update error:", error);
      res.status(500).json({ message: "Failed to update draft" });
    }
  });
  
  // Create application (final submission)
  app.post("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Security: Whitelist only owner-submittable fields (ANNEXURE-I compliant)
      // Note: Using default (non-strict) mode to allow form to send extra fields
      // that will be ignored. Only whitelisted fields are extracted below.
      const ownerSubmittableSchema = z.object({
        // Basic property info
        propertyName: z.string(),
        category: z.enum(['diamond', 'gold', 'silver']),
        address: z.string(),
        district: z.string(),
        pincode: z.string(),
        locationType: z.enum(['mc', 'tcp', 'gp']),
        telephone: z.string().optional(),
        fax: z.string().optional(),
        
        // Owner info
        ownerName: z.string(),
        ownerMobile: z.string(),
        ownerEmail: z.string().optional(),
        ownerAadhaar: z.string(),
        
        // Room & category details
        proposedRoomRate: z.coerce.number(),
        singleBedRoomRate: z.coerce.number().optional(),
        doubleBedRoomRate: z.coerce.number().optional(),
        familySuiteRate: z.coerce.number().optional(),
        projectType: z.enum(['new_rooms', 'new_project']),
        propertyArea: z.coerce.number(),
        singleBedRooms: z.coerce.number().optional(),
        singleBedRoomSize: z.coerce.number().optional(),
        doubleBedRooms: z.coerce.number().optional(),
        doubleBedRoomSize: z.coerce.number().optional(),
        familySuites: z.coerce.number().optional(),
        familySuiteSize: z.coerce.number().optional(),
        attachedWashrooms: z.coerce.number(),
        gstin: z.string().optional(),
        
        // Distances (in km)
        distanceAirport: z.coerce.number().optional(),
        distanceRailway: z.coerce.number().optional(),
        distanceCityCenter: z.coerce.number().optional(),
        distanceShopping: z.coerce.number().optional(),
        distanceBusStand: z.coerce.number().optional(),
        
        // Public areas
        lobbyArea: z.coerce.number().optional(),
        diningArea: z.coerce.number().optional(),
        parkingArea: z.string().optional(),
        
        // Additional facilities
        ecoFriendlyFacilities: z.string().optional(),
        differentlyAbledFacilities: z.string().optional(),
        fireEquipmentDetails: z.string().optional(),
        nearestHospital: z.string().optional(),
        
        // Amenities
        amenities: z.any().optional(),
        
        // 2025 Fee Structure
        baseFee: z.coerce.number(),
        totalBeforeDiscounts: z.coerce.number().optional(),
        validityDiscount: z.coerce.number().optional(),
        femaleOwnerDiscount: z.coerce.number().optional(),
        pangiDiscount: z.coerce.number().optional(),
        totalDiscount: z.coerce.number().optional(),
        totalFee: z.coerce.number(),
        // Legacy fields
        perRoomFee: z.coerce.number().optional(),
        gstAmount: z.coerce.number().optional(),
        
        // 2025 Fields
        certificateValidityYears: z.coerce.number().optional(),
        isPangiSubDivision: z.boolean().optional(),
        ownerGender: z.enum(['male', 'female', 'other']).optional(),
        tehsil: z.string().optional(),
        
        // Coordinates (optional)
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        
        // ANNEXURE-II documents with metadata
        documents: z.array(z.object({
          filePath: z.string(),
          fileName: z.string(),
          fileSize: z.number(),
          mimeType: z.string(),
          documentType: z.string(),
        })).optional(),
      });
      
      // Validate and extract only whitelisted fields
      const validatedData = ownerSubmittableSchema.parse(req.body);
      
      // Calculate totalRooms from individual room counts
      const totalRooms = (validatedData.singleBedRooms || 0) + 
                        (validatedData.doubleBedRooms || 0) + 
                        (validatedData.familySuites || 0);

      // 2025 Compliance: Validate per-room-type rates (HP Homestay Rules 2025 - Form-A Certificate Requirement)
      // For FINAL SUBMISSION, per-room-type rates are MANDATORY for all room types with count > 0
      // This enforces ANNEXURE-I compliance for new 2025 applications
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

      // ONE-APPLICATION-PER-OWNER RULE: Check if user already has an active application
      const existingApp = await storage.getUserActiveApplication(userId);
      
      // Build payload with ONLY allowed fields (ANNEXURE-I compliant)
      const applicationData = {
        // Basic property info
        propertyName: validatedData.propertyName,
        category: validatedData.category,
        totalRooms,
        address: validatedData.address,
        district: validatedData.district,
        pincode: validatedData.pincode,
        locationType: validatedData.locationType,
        telephone: validatedData.telephone,
        fax: validatedData.fax,
        
        // Owner info
        ownerName: validatedData.ownerName,
        ownerMobile: validatedData.ownerMobile,
        ownerEmail: validatedData.ownerEmail,
        ownerAadhaar: validatedData.ownerAadhaar,
        
        // Room & category details
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
        gstin: validatedData.gstin,
        
        // Distances
        distanceAirport: validatedData.distanceAirport,
        distanceRailway: validatedData.distanceRailway,
        distanceCityCenter: validatedData.distanceCityCenter,
        distanceShopping: validatedData.distanceShopping,
        distanceBusStand: validatedData.distanceBusStand,
        
        // Public areas
        lobbyArea: validatedData.lobbyArea,
        diningArea: validatedData.diningArea,
        parkingArea: validatedData.parkingArea,
        
        // Additional facilities
        ecoFriendlyFacilities: validatedData.ecoFriendlyFacilities,
        differentlyAbledFacilities: validatedData.differentlyAbledFacilities,
        fireEquipmentDetails: validatedData.fireEquipmentDetails,
        nearestHospital: validatedData.nearestHospital,
        
        // Amenities
        amenities: validatedData.amenities,
        
        // 2025 Fee Structure (from frontend, convert to strings for DB)
        baseFee: String(validatedData.baseFee),
        totalBeforeDiscounts: validatedData.totalBeforeDiscounts ? String(validatedData.totalBeforeDiscounts) : undefined,
        validityDiscount: validatedData.validityDiscount ? String(validatedData.validityDiscount) : undefined,
        femaleOwnerDiscount: validatedData.femaleOwnerDiscount ? String(validatedData.femaleOwnerDiscount) : undefined,
        pangiDiscount: validatedData.pangiDiscount ? String(validatedData.pangiDiscount) : undefined,
        totalDiscount: validatedData.totalDiscount ? String(validatedData.totalDiscount) : undefined,
        totalFee: String(validatedData.totalFee),
        // Legacy fields
        perRoomFee: validatedData.perRoomFee ? String(validatedData.perRoomFee) : undefined,
        gstAmount: validatedData.gstAmount ? String(validatedData.gstAmount) : undefined,
        
        // 2025 Fields
        certificateValidityYears: validatedData.certificateValidityYears,
        isPangiSubDivision: validatedData.isPangiSubDivision,
        ownerGender: validatedData.ownerGender,
        tehsil: validatedData.tehsil,
        
        // Coordinates (optional)
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        
        userId,
        status: 'submitted',
        submittedAt: new Date(),
      };
      
      // ONE-APPLICATION-PER-OWNER: Update existing or create new
      let application;
      if (existingApp) {
        // Update existing application and change status to submitted
        application = await storage.updateApplication(existingApp.id, {
          ...applicationData,
          status: 'submitted',
          submittedAt: new Date(),
        } as any);
      } else {
        // Create new application only if none exists
        application = await storage.createApplication(applicationData, { trusted: true });
      }
      
      if (!application) {
        return res.status(500).json({ message: "Failed to save application" });
      }
      
      // Save documents with actual metadata if provided
      if (validatedData.documents && validatedData.documents.length > 0) {
        for (const doc of validatedData.documents) {
          await storage.createDocument({
            applicationId: application.id,
            documentType: doc.documentType,
            fileName: doc.fileName,
            filePath: doc.filePath,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType,
          });
        }
      }
      
      res.json({ application });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Application creation error:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Get user's applications
  app.get("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      let applications: Awaited<ReturnType<typeof storage.getApplicationsByUser>> = [];
      if (user?.role === 'property_owner') {
        applications = await storage.getApplicationsByUser(userId);
      } else if (user?.role === 'district_officer' && user.district) {
        applications = await storage.getApplicationsByDistrict(user.district);
      } else if (user?.role === 'state_officer' || user?.role === 'admin') {
        applications = await storage.getApplicationsByStatus('state_review');
      }
      
      res.json({ applications });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Get ALL applications for workflow monitoring (officers only)
  // RBAC: District officers/DA/DTDO see only their district, State officers see all
  app.get("/api/applications/all", requireRole('dealing_assistant', 'district_tourism_officer', 'district_officer', 'state_officer', 'admin'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      let applications: HomestayApplication[] = [];
      
      // District officers, DA, DTDO: Only see applications from their assigned district
      if (user.role === 'district_officer' || user.role === 'dealing_assistant' || user.role === 'district_tourism_officer') {
        if (!user.district) {
          return res.status(400).json({ message: "District role must have an assigned district" });
        }
        // Get all applications in their district (not just pending)
        applications = await db.select().from(homestayApplications)
          .where(eq(homestayApplications.district, user.district))
          .orderBy(desc(homestayApplications.createdAt));
      }
      // State officers and admins: See all applications
      else if (user.role === 'state_officer' || user.role === 'admin') {
        applications = await storage.getAllApplications();
      }
      
      res.json(applications);
    } catch (error) {
      console.error('[workflow-monitoring] Error fetching all applications:', error);
      res.status(500).json({ message: "Failed to fetch applications for monitoring" });
    }
  });

  // Get single application
  app.get("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Check permissions
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role === 'property_owner' && application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json({ application });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // Update application (for resubmission after corrections)
  app.patch("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      
      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Only property owner can update their own application
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Can only update if sent back for corrections or reverted to applicant by DA or DTDO
      if (application.status !== 'sent_back_for_corrections' && application.status !== 'reverted_to_applicant' && application.status !== 'reverted_by_dtdo') {
        return res.status(400).json({ message: "Application can only be updated when sent back for corrections" });
      }
      
      // Comprehensive update schema with proper validation matching insert schema
      // All fields optional since owner may only update specific fields
      const updateSchema = z.object({
        // Property Details
        propertyName: z.string().min(3, "Property name must be at least 3 characters").optional(),
        category: z.enum(['diamond', 'gold', 'silver']).optional(),
        locationType: z.enum(['mc', 'tcp', 'gp']).optional(),
        // totalRooms is derived from room counts, should not be directly updated
        
        // LGD Hierarchical Address
        district: z.string().min(2, "District is required").optional(),
        districtOther: z.string().optional().or(z.literal('')),
        tehsil: z.string().min(2, "Tehsil is required").optional(),
        tehsilOther: z.string().optional().or(z.literal('')),
        block: z.string().optional().or(z.literal('')),
        blockOther: z.string().optional().or(z.literal('')),
        gramPanchayat: z.string().optional().or(z.literal('')),
        gramPanchayatOther: z.string().optional().or(z.literal('')),
        urbanBody: z.string().optional().or(z.literal('')),
        urbanBodyOther: z.string().optional().or(z.literal('')),
        ward: z.string().optional().or(z.literal('')),
        
        // Address Details
        address: z.string().min(10, "Address must be at least 10 characters").optional(),
        pincode: z.string().regex(/^[1-9]\d{5}$/, "Invalid pincode").optional(),
        telephone: z.string().optional().or(z.literal('')),
        fax: z.string().optional().or(z.literal('')),
        latitude: z.string().optional().or(z.literal('')),
        longitude: z.string().optional().or(z.literal('')),
        
        // Owner Details
        ownerName: z.string().min(3, "Name must be at least 3 characters").optional(),
        ownerGender: z.enum(['male', 'female', 'other']).optional(),
        ownerMobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number").optional(),
        ownerEmail: z.string().email("Invalid email").optional().or(z.literal('')),
        ownerAadhaar: z.string().regex(/^\d{12}$/, "Invalid Aadhaar number").optional(),
        propertyOwnership: z.enum(['owned', 'leased']).optional(),
        
        // Room & Category Details
        projectType: z.enum(['new_rooms', 'new_project']).optional(),
        propertyArea: z.coerce.number().min(1, "Property area must be at least 1 sq meter").optional(),
        
        // Per Room Type Details (2025 Rules)
        singleBedRooms: z.coerce.number().int().min(0).optional(),
        singleBedRoomSize: z.coerce.number().min(0).optional(),
        singleBedRoomRate: z.coerce.number().min(100, "Rate must be at least ₹100").optional(),
        doubleBedRooms: z.coerce.number().int().min(0).optional(),
        doubleBedRoomSize: z.coerce.number().min(0).optional(),
        doubleBedRoomRate: z.coerce.number().min(100, "Rate must be at least ₹100").optional(),
        familySuites: z.coerce.number().int().min(0).max(3).optional(),
        familySuiteSize: z.coerce.number().min(0).optional(),
        familySuiteRate: z.coerce.number().min(100, "Rate must be at least ₹100").optional(),
        
        attachedWashrooms: z.coerce.number().int().min(0).optional(),
        gstin: z.string().optional().or(z.literal('')),
        
        // Certificate Validity & Discounts
        certificateValidityYears: z.coerce.number().int().min(1).max(3).optional(),
        isPangiSubDivision: z.boolean().optional(),
        
        // Distances from key locations (in km)
        distanceAirport: z.coerce.number().min(0).optional(),
        distanceRailway: z.coerce.number().min(0).optional(),
        distanceCityCenter: z.coerce.number().min(0).optional(),
        distanceShopping: z.coerce.number().min(0).optional(),
        distanceBusStand: z.coerce.number().min(0).optional(),
        
        // Public Areas (in sq ft)
        lobbyArea: z.coerce.number().min(0).optional(),
        diningArea: z.coerce.number().min(0).optional(),
        parkingArea: z.string().optional().or(z.literal('')),
        
        // Additional Facilities
        ecoFriendlyFacilities: z.string().optional().or(z.literal('')),
        differentlyAbledFacilities: z.string().optional().or(z.literal('')),
        fireEquipmentDetails: z.string().optional().or(z.literal('')),
        nearestHospital: z.string().optional().or(z.literal('')),
        
        // Amenities (validated JSONB structure)
        amenities: z.object({
          ac: z.boolean().optional(),
          wifi: z.boolean().optional(),
          parking: z.boolean().optional(),
          restaurant: z.boolean().optional(),
          hotWater: z.boolean().optional(),
          tv: z.boolean().optional(),
          laundry: z.boolean().optional(),
          roomService: z.boolean().optional(),
          garden: z.boolean().optional(),
          mountainView: z.boolean().optional(),
          petFriendly: z.boolean().optional(),
        }).optional(),
        
        // Rooms (legacy field - use with caution)
        rooms: z.array(z.object({
          roomType: z.string(),
          size: z.coerce.number(),
          count: z.coerce.number(),
        })).optional(),
        
        // Fee Calculation (calculated fields - typically set by server)
        baseFee: z.coerce.number().optional(),
        totalBeforeDiscounts: z.coerce.number().optional(),
        validityDiscount: z.coerce.number().optional(),
        femaleOwnerDiscount: z.coerce.number().optional(),
        pangiDiscount: z.coerce.number().optional(),
        totalDiscount: z.coerce.number().optional(),
        totalFee: z.coerce.number().optional(),
        
        // Legacy fee fields
        perRoomFee: z.coerce.number().optional(),
        gstAmount: z.coerce.number().optional(),
        
        // Documents (validated JSONB structure)
        documents: z.array(z.object({
          id: z.string(),
          name: z.string(),
          type: z.string(),
          url: z.string(),
          uploadedAt: z.string().optional(),
          required: z.boolean().optional(),
        })).optional(),
        
        // Legacy document URLs (for backward compatibility)
        ownershipProofUrl: z.string().optional(),
        aadhaarCardUrl: z.string().optional(),
        panCardUrl: z.string().optional(),
        gstCertificateUrl: z.string().optional(),
        propertyPhotosUrls: z.array(z.string()).optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update the application and change status back to submitted
      // NOTE: Clearing clarificationRequested and dtdoRemarks removes officer feedback
      // from the application record. If audit trail is required, consider logging
      // these to an application_actions table before clearing.
      const updatedApplication = await storage.updateApplication(id, {
        ...validatedData,
        status: 'submitted',
        submittedAt: new Date(),
        clarificationRequested: null, // Clear DA feedback after resubmission
        dtdoRemarks: null, // Clear DTDO feedback after resubmission
      });
      
      res.json({ application: updatedApplication });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Review application (approve/reject)
  app.post("/api/applications/:id/review", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, comments } = req.body;

      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only officers can review applications
      if (user.role !== "district_officer" && user.role !== "state_officer") {
        return res.status(403).json({ message: "Only officers can review applications" });
      }

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // District officers can only review applications in their district
      if (user.role === "district_officer" && application.district !== user.district) {
        return res.status(403).json({ message: "You can only review applications in your district" });
      }

      // Validate application is in correct status for this officer role
      if (user.role === "district_officer" && application.status !== "pending") {
        return res.status(400).json({ message: "This application is not in pending status and cannot be reviewed by district officer" });
      }
      
      if (user.role === "state_officer" && application.status !== "state_review") {
        return res.status(400).json({ message: "This application is not in state review status and cannot be reviewed by state officer" });
      }

      // Prepare update based on officer role and action
      const updateData: Partial<HomestayApplication> = {};

      if (user.role === "district_officer") {
        updateData.districtOfficerId = user.id;
        updateData.districtReviewDate = new Date();
        updateData.districtNotes = comments || null;
        
        if (action === "approve") {
          // District approval moves to state review
          updateData.status = "state_review";
          updateData.currentStage = "state";
        } else {
          // District rejection is final
          updateData.status = "rejected";
          updateData.rejectionReason = comments || "Rejected at district level";
        }
      } else if (user.role === "state_officer") {
        updateData.stateOfficerId = user.id;
        updateData.stateReviewDate = new Date();
        updateData.stateNotes = comments || null;
        
        if (action === "approve") {
          // State approval is final approval
          updateData.status = "approved";
          updateData.approvedAt = new Date();
          updateData.currentStage = "final";
        } else {
          // State rejection is final
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

  // Officer Actions - Send Back for Corrections
  app.post("/api/applications/:id/send-back", requireRole('district_officer', 'state_officer'), async (req, res) => {
    try {
      const { id } = req.params;
      const { feedback, issuesFound } = req.body;

      if (!feedback || feedback.trim().length < 10) {
        return res.status(400).json({ message: "Feedback is required (minimum 10 characters)" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.role !== "district_officer" && user.role !== "state_officer")) {
        return res.status(403).json({ message: "Only officers can send back applications" });
      }

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Update application status
      const updated = await storage.updateApplication(id, {
        status: 'sent_back_for_corrections',
        clarificationRequested: feedback,
      });

      res.json({ application: updated, message: "Application sent back to applicant" });
    } catch (error) {
      console.error("Send back error:", error);
      res.status(500).json({ message: "Failed to send back application" });
    }
  });

  // Officer Actions - Move to Site Inspection
  app.post("/api/applications/:id/move-to-inspection", requireRole('district_officer', 'state_officer'), async (req, res) => {
    try {
      const { id } = req.params;
      const { scheduledDate, notes } = req.body;

      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.role !== "district_officer" && user.role !== "state_officer")) {
        return res.status(403).json({ message: "Only officers can schedule inspections" });
      }

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Update application
      const updated = await storage.updateApplication(id, {
        status: 'site_inspection_scheduled',
        currentStage: 'site_inspection',
        siteInspectionScheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        siteInspectionOfficerId: user.id,
        siteInspectionNotes: notes,
      });

      res.json({ application: updated, message: "Site inspection scheduled" });
    } catch (error) {
      console.error("Move to inspection error:", error);
      res.status(500).json({ message: "Failed to schedule inspection" });
    }
  });

  // Officer Actions - Mark Inspection Complete with Outcome
  app.post("/api/applications/:id/complete-inspection", requireRole('district_officer', 'state_officer'), async (req, res) => {
    try {
      const { id } = req.params;
      const { outcome, findings, notes } = req.body;

      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.role !== "district_officer" && user.role !== "state_officer")) {
        return res.status(403).json({ message: "Only officers can complete inspections" });
      }

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Validate outcome
      if (!['approved', 'corrections_needed', 'rejected'].includes(outcome)) {
        return res.status(400).json({ message: "Invalid inspection outcome" });
      }

      // Validate that issuesFound is provided for corrections_needed or rejected outcomes
      if ((outcome === 'corrections_needed' || outcome === 'rejected') && 
          !findings?.issuesFound && !notes) {
        return res.status(400).json({ 
          message: "Issues description is required when sending back for corrections or rejecting an application" 
        });
      }

      // Determine next status based on outcome
      let newStatus;
      let clarificationRequested = null;
      
      switch (outcome) {
        case 'approved':
          newStatus = 'payment_pending';
          break;
        case 'corrections_needed':
          newStatus = 'sent_back_for_corrections';
          clarificationRequested = findings?.issuesFound || notes || 'Site inspection found issues that need correction';
          break;
        case 'rejected':
          newStatus = 'rejected';
          break;
        default:
          newStatus = 'inspection_completed';
      }

      // Update application with inspection results and outcome
      const updateData: any = {
        status: newStatus,
        siteInspectionCompletedDate: new Date(),
        siteInspectionOutcome: outcome,
        siteInspectionFindings: findings || {},
        siteInspectionNotes: notes,
      };

      // Add rejection reason or clarification if applicable
      if (outcome === 'rejected') {
        updateData.rejectionReason = findings?.issuesFound || notes || 'Application rejected after site inspection';
      } else if (outcome === 'corrections_needed') {
        updateData.clarificationRequested = clarificationRequested;
      }

      const updated = await storage.updateApplication(id, updateData);

      res.json({ application: updated, message: "Inspection completed successfully" });
    } catch (error) {
      console.error("Complete inspection error:", error);
      res.status(500).json({ message: "Failed to complete inspection" });
    }
  });

  // Get Application Action History (disabled - table doesn't exist yet)
  // app.get("/api/applications/:id/actions", requireRole('district_officer', 'state_officer', 'property_owner'), async (req, res) => {
  //   try {
  //     const actions = await storage.getApplicationActions(req.params.id);
  //     res.json({ actions });
  //   } catch (error) {
  //     res.status(500).json({ message: "Failed to fetch application history" });
  //   }
  // });

  // ========================================
  // DEALING ASSISTANT (DA) ROUTES
  // ========================================

  // Update DA profile
  app.patch("/api/da/profile", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { fullName, email, mobile } = req.body;

      // Validate input
      if (!fullName || fullName.trim().length < 3) {
        return res.status(400).json({ message: "Full name must be at least 3 characters" });
      }

      if (mobile && !/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: "Invalid mobile number" });
      }

      // Update user
      const updated = await storage.updateUser(userId, {
        fullName: fullName.trim(),
        email: email?.trim() || null,
        mobile: mobile.trim(),
      });

      res.json({ user: updated, message: "Profile updated successfully" });
    } catch (error) {
      console.error("[da] Failed to update profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change DA password
  app.post("/api/da/change-password", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("[da] Failed to change password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Get applications for DA (district-specific)
  app.get("/api/da/applications", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.district) {
        return res.status(400).json({ message: "DA must be assigned to a district" });
      }

      // Get all applications from this DA's district with relevant statuses
      const allApplications = await db
        .select()
        .from(homestayApplications)
        .where(eq(homestayApplications.district, user.district));

      // Filter for DA-relevant statuses: submitted, under_scrutiny, forwarded_to_dtdo, reverted_to_applicant
      const daRelevantStatuses = ['submitted', 'under_scrutiny', 'forwarded_to_dtdo', 'reverted_to_applicant'];
      const relevantApplications = allApplications.filter(app => 
        daRelevantStatuses.includes(app.status)
      );

      // Enrich with owner information
      const applicationsWithOwner = await Promise.all(
        relevantApplications.map(async (app) => {
          const owner = await storage.getUser(app.userId);
          return {
            ...app,
            ownerName: owner?.fullName || 'Unknown',
            ownerMobile: owner?.mobile || 'N/A',
          };
        })
      );

      res.json(applicationsWithOwner);
    } catch (error) {
      console.error("[da] Failed to fetch applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Get single application details for DA
  app.get("/api/da/applications/:id", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DA's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only access applications from your district" });
      }

      // Get owner information
      const owner = await storage.getUser(application.userId);
      
      // Get documents
      const documents = await storage.getDocumentsByApplication(req.params.id);

      res.json({
        application,
        owner: owner ? {
          fullName: owner.fullName,
          mobile: owner.mobile,
          email: owner.email,
        } : null,
        documents,
      });
    } catch (error) {
      console.error("[da] Failed to fetch application details:", error);
      res.status(500).json({ message: "Failed to fetch application details" });
    }
  });

  // Start scrutiny (change status to under_scrutiny)
  app.post("/api/da/applications/:id/start-scrutiny", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.status !== 'submitted') {
        return res.status(400).json({ message: "Only submitted applications can be put under scrutiny" });
      }

      await storage.updateApplication(req.params.id, { status: 'under_scrutiny' });
      
      res.json({ message: "Application is now under scrutiny" });
    } catch (error) {
      console.error("[da] Failed to start scrutiny:", error);
      res.status(500).json({ message: "Failed to start scrutiny" });
    }
  });

  // Save scrutiny progress (document verifications)
  app.post("/api/da/applications/:id/save-scrutiny", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const { verifications } = req.body;
      const userId = req.session.userId!;
      
      if (!verifications || !Array.isArray(verifications)) {
        return res.status(400).json({ message: "Invalid verification data" });
      }

      // Update each document's verification status
      for (const verification of verifications) {
        await db.update(documents)
          .set({
            verificationStatus: verification.status,
            verificationNotes: verification.notes || null,
            isVerified: verification.status === 'verified',
            verifiedBy: verification.status !== 'pending' ? userId : null,
            verificationDate: verification.status !== 'pending' ? new Date() : null,
          })
          .where(eq(documents.id, verification.documentId));
      }
      
      res.json({ message: "Scrutiny progress saved successfully" });
    } catch (error) {
      console.error("[da] Failed to save scrutiny progress:", error);
      res.status(500).json({ message: "Failed to save scrutiny progress" });
    }
  });

  // Forward to DTDO
  app.post("/api/da/applications/:id/forward-to-dtdo", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const { remarks } = req.body;
      const application = await storage.getApplication(req.params.id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.status !== 'under_scrutiny') {
        return res.status(400).json({ message: "Only applications under scrutiny can be forwarded" });
      }

      await storage.updateApplication(req.params.id, { status: 'forwarded_to_dtdo' });
      
      // TODO: Add timeline entry with remarks when timeline system is implemented
      
      res.json({ message: "Application forwarded to DTDO successfully" });
    } catch (error) {
      console.error("[da] Failed to forward to DTDO:", error);
      res.status(500).json({ message: "Failed to forward application" });
    }
  });

  // Send back to applicant
  app.post("/api/da/applications/:id/send-back", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: "Reason for sending back is required" });
      }

      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      if (application.status !== 'under_scrutiny') {
        return res.status(400).json({ message: "Only applications under scrutiny can be sent back" });
      }

      await storage.updateApplication(req.params.id, { status: 'reverted_to_applicant' });
      
      // TODO: Add timeline entry with reason when timeline system is implemented
      // TODO: Send notification to applicant
      
      res.json({ message: "Application sent back to applicant successfully" });
    } catch (error) {
      console.error("[da] Failed to send back application:", error);
      res.status(500).json({ message: "Failed to send back application" });
    }
  });

  // ========================================
  // DTDO (District Tourism Development Officer) ROUTES
  // ========================================

  // Get applications for DTDO (district-specific)
  app.get("/api/dtdo/applications", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.district) {
        return res.status(400).json({ message: "DTDO must be assigned to a district" });
      }

      // Get all applications from this DTDO's district with relevant statuses
      const allApplications = await db
        .select()
        .from(homestayApplications)
        .where(eq(homestayApplications.district, user.district));

      // Filter for DTDO-relevant statuses
      const dtdoRelevantStatuses = [
        'forwarded_to_dtdo',
        'dtdo_review',
        'inspection_scheduled',
        'inspection_under_review'
      ];
      const relevantApplications = allApplications.filter(app => 
        dtdoRelevantStatuses.includes(app.status)
      );

      // Enrich with owner and DA information
      const applicationsWithDetails = await Promise.all(
        relevantApplications.map(async (app) => {
          const owner = await storage.getUser(app.userId);
          
          // Get DA name if the application was forwarded by DA
          let daName = undefined;
          if (app.daRemarks || app.daId) {
            const da = app.daId ? await storage.getUser(app.daId) : null;
            daName = da?.fullName || 'Unknown DA';
          }

          return {
            ...app,
            ownerName: owner?.fullName || 'Unknown',
            ownerMobile: owner?.mobile || 'N/A',
            daName,
          };
        })
      );

      res.json(applicationsWithDetails);
    } catch (error) {
      console.error("[dtdo] Failed to fetch applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Get single application details for DTDO
  app.get("/api/dtdo/applications/:id", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DTDO's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only access applications from your district" });
      }

      // Get owner information
      const owner = await storage.getUser(application.userId);
      
      // Get documents
      const documents = await storage.getDocumentsByApplication(req.params.id);

      // Get DA information if available
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
          email: owner.email,
        } : null,
        documents,
        daInfo,
      });
    } catch (error) {
      console.error("[dtdo] Failed to fetch application details:", error);
      res.status(500).json({ message: "Failed to fetch application details" });
    }
  });

  // DTDO accept application (schedule inspection)
  app.post("/api/dtdo/applications/:id/accept", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const { remarks } = req.body;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DTDO's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }

      // Verify application status
      if (application.status !== 'forwarded_to_dtdo' && application.status !== 'dtdo_review') {
        return res.status(400).json({ message: "Application is not in the correct status for DTDO review" });
      }

      // Update application status to dtdo_review (intermediate state)
      // Will only move to inspection_scheduled after successful inspection scheduling
      await storage.updateApplication(req.params.id, {
        status: 'dtdo_review',
        dtdoRemarks: remarks || null,
        dtdoId: userId,
        dtdoReviewDate: new Date(),
      });

      res.json({ message: "Application accepted. Proceed to schedule inspection.", applicationId: req.params.id });
    } catch (error) {
      console.error("[dtdo] Failed to accept application:", error);
      res.status(500).json({ message: "Failed to accept application" });
    }
  });

  // DTDO reject application
  app.post("/api/dtdo/applications/:id/reject", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const { remarks } = req.body;
      
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DTDO's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }

      // Update application status to rejected
      await storage.updateApplication(req.params.id, {
        status: 'rejected',
        dtdoRemarks: remarks,
        dtdoId: userId,
        dtdoReviewDate: new Date(),
        rejectionReason: remarks,
      });

      res.json({ message: "Application rejected successfully" });
    } catch (error) {
      console.error("[dtdo] Failed to reject application:", error);
      res.status(500).json({ message: "Failed to reject application" });
    }
  });

  // DTDO revert application to applicant
  app.post("/api/dtdo/applications/:id/revert", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const { remarks } = req.body;
      
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ message: "Please specify what corrections are needed" });
      }

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      const application = await storage.getApplication(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DTDO's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }

      // Update application status to reverted_by_dtdo
      await storage.updateApplication(req.params.id, {
        status: 'reverted_by_dtdo',
        dtdoRemarks: remarks,
        dtdoId: userId,
        dtdoReviewDate: new Date(),
      });

      res.json({ message: "Application reverted to applicant successfully" });
    } catch (error) {
      console.error("[dtdo] Failed to revert application:", error);
      res.status(500).json({ message: "Failed to revert application" });
    }
  });

  // Get available DAs for DTDO's district
  app.get("/api/dtdo/available-das", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user || !user.district) {
        return res.status(400).json({ message: "DTDO must be assigned to a district" });
      }

      // Get all DAs from the same district
      const allUsers = await db
        .select()
        .from(users)
        .where(eq(users.district, user.district));

      const das = allUsers
        .filter(u => u.role === 'dealing_assistant')
        .map(da => ({
          id: da.id,
          fullName: da.fullName,
          mobile: da.mobile,
        }));

      res.json({ das });
    } catch (error) {
      console.error("[dtdo] Failed to fetch DAs:", error);
      res.status(500).json({ message: "Failed to fetch available DAs" });
    }
  });

  // Schedule inspection (create inspection order)
  app.post("/api/dtdo/schedule-inspection", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const { applicationId, inspectionDate, assignedTo, specialInstructions } = req.body;
      const userId = req.session.userId!;

      if (!applicationId || !inspectionDate || !assignedTo) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application status - should be in dtdo_review after acceptance
      if (application.status !== 'dtdo_review') {
        return res.status(400).json({ message: "Application must be accepted by DTDO before scheduling inspection" });
      }

      // Create inspection order
      const newInspectionOrder = await db
        .insert(inspectionOrders)
        .values({
          applicationId,
          scheduledBy: userId,
          scheduledDate: new Date(),
          assignedTo,
          assignedDate: new Date(),
          inspectionDate: new Date(inspectionDate),
          inspectionAddress: application.address,
          specialInstructions: specialInstructions || null,
          status: 'scheduled',
        })
        .returning();

      // Only NOW update the application status to inspection_scheduled
      await storage.updateApplication(applicationId, {
        status: 'inspection_scheduled',
      });

      res.json({ message: "Inspection scheduled successfully", inspectionOrder: newInspectionOrder[0] });
    } catch (error) {
      console.error("[dtdo] Failed to schedule inspection:", error);
      res.status(500).json({ message: "Failed to schedule inspection" });
    }
  });

  // Get inspection report for DTDO review
  app.get("/api/dtdo/inspection-report/:applicationId", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      // Get application
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DTDO's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only review applications from your district" });
      }

      // Get inspection order
      const inspectionOrder = await db
        .select()
        .from(inspectionOrders)
        .where(eq(inspectionOrders.applicationId, applicationId))
        .orderBy(desc(inspectionOrders.createdAt))
        .limit(1);

      if (inspectionOrder.length === 0) {
        return res.status(404).json({ message: "No inspection order found" });
      }

      // Get inspection report
      const report = await db
        .select()
        .from(inspectionReports)
        .where(eq(inspectionReports.inspectionOrderId, inspectionOrder[0].id))
        .limit(1);

      if (report.length === 0) {
        return res.status(404).json({ message: "Inspection report not found" });
      }

      // Get DA who submitted the report
      const da = await storage.getUser(report[0].submittedBy);

      // Get property owner
      const owner = await storage.getUser(application.userId);

      res.json({
        report: report[0],
        application,
        inspectionOrder: inspectionOrder[0],
        owner: owner ? {
          fullName: owner.fullName,
          mobile: owner.mobile,
          email: owner.email,
        } : null,
        da: da ? {
          fullName: da.fullName,
          mobile: da.mobile,
        } : null,
      });
    } catch (error) {
      console.error("[dtdo] Failed to fetch inspection report:", error);
      res.status(500).json({ message: "Failed to fetch inspection report" });
    }
  });

  // DTDO approve inspection report
  app.post("/api/dtdo/inspection-report/:applicationId/approve", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { remarks } = req.body;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DTDO's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }

      // Verify application is in inspection_under_review status
      if (application.status !== 'inspection_under_review') {
        return res.status(400).json({ 
          message: `Cannot approve inspection report. Application must be in inspection_under_review status (current: ${application.status})` 
        });
      }

      // Update application status to verified_for_payment
      await storage.updateApplication(applicationId, {
        status: 'verified_for_payment',
        districtNotes: remarks || 'Inspection report approved. Property meets all requirements.',
        districtOfficerId: userId,
        districtReviewDate: new Date(),
      });

      res.json({ message: "Inspection report approved successfully" });
    } catch (error) {
      console.error("[dtdo] Failed to approve inspection report:", error);
      res.status(500).json({ message: "Failed to approve inspection report" });
    }
  });

  // DTDO reject inspection report
  app.post("/api/dtdo/inspection-report/:applicationId/reject", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { remarks } = req.body;
      
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DTDO's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }

      // Verify application is in inspection_under_review status
      if (application.status !== 'inspection_under_review') {
        return res.status(400).json({ 
          message: `Cannot reject application. Application must be in inspection_under_review status (current: ${application.status})` 
        });
      }

      // Update application status to rejected
      await storage.updateApplication(applicationId, {
        status: 'rejected',
        rejectionReason: remarks,
        districtNotes: remarks,
        districtOfficerId: userId,
        districtReviewDate: new Date(),
      });

      res.json({ message: "Application rejected successfully" });
    } catch (error) {
      console.error("[dtdo] Failed to reject inspection report:", error);
      res.status(500).json({ message: "Failed to reject inspection report" });
    }
  });

  // DTDO raise objections on inspection report
  app.post("/api/dtdo/inspection-report/:applicationId/raise-objections", requireRole('district_tourism_officer', 'district_officer'), async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { remarks } = req.body;
      
      if (!remarks || remarks.trim().length === 0) {
        return res.status(400).json({ message: "Please specify the objections" });
      }

      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Verify application is from DTDO's district
      if (user?.district && application.district !== user.district) {
        return res.status(403).json({ message: "You can only process applications from your district" });
      }

      // Verify application is in inspection_under_review status
      if (application.status !== 'inspection_under_review') {
        return res.status(400).json({ 
          message: `Cannot raise objections. Application must be in inspection_under_review status (current: ${application.status})` 
        });
      }

      // Update application status to objection_raised
      await storage.updateApplication(applicationId, {
        status: 'objection_raised',
        clarificationRequested: remarks,
        districtNotes: remarks,
        districtOfficerId: userId,
        districtReviewDate: new Date(),
      });

      res.json({ message: "Objections raised successfully. Application will require re-inspection." });
    } catch (error) {
      console.error("[dtdo] Failed to raise objections:", error);
      res.status(500).json({ message: "Failed to raise objections" });
    }
  });

  // ====================================================================
  // DA INSPECTION ROUTES
  // ====================================================================

  // Get all inspection orders assigned to this DA
  app.get("/api/da/inspections", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Get all inspection orders assigned to this DA
      const inspectionOrdersData = await db
        .select()
        .from(inspectionOrders)
        .where(eq(inspectionOrders.assignedTo, userId))
        .orderBy(desc(inspectionOrders.createdAt));

      // Enrich with application and property details
      const enrichedOrders = await Promise.all(
        inspectionOrdersData.map(async (order) => {
          const application = await storage.getApplication(order.applicationId);
          const owner = application ? await storage.getUser(application.userId) : null;
          
          // Check if report already exists
          const existingReport = await db
            .select()
            .from(inspectionReports)
            .where(eq(inspectionReports.inspectionOrderId, order.id))
            .limit(1);

          return {
            ...order,
            application: application ? {
              id: application.id,
              applicationNumber: application.applicationNumber,
              propertyName: application.propertyName,
              category: application.category,
              status: application.status,
            } : null,
            owner: owner ? {
              fullName: owner.fullName,
              mobile: owner.mobile,
            } : null,
            reportSubmitted: existingReport.length > 0,
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      console.error("[da] Failed to fetch inspections:", error);
      res.status(500).json({ message: "Failed to fetch inspections" });
    }
  });

  // Get single inspection order details
  app.get("/api/da/inspections/:id", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const order = await db
        .select()
        .from(inspectionOrders)
        .where(eq(inspectionOrders.id, req.params.id))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ message: "Inspection order not found" });
      }

      // Verify this inspection is assigned to the logged-in DA
      if (order[0].assignedTo !== userId) {
        return res.status(403).json({ message: "You can only access inspections assigned to you" });
      }

      // Get application details
      const application = await storage.getApplication(order[0].applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Get owner details
      const owner = await storage.getUser(application.userId);

      // Get documents
      const documents = await storage.getDocumentsByApplication(application.id);

      // Check if report already submitted
      const existingReport = await db
        .select()
        .from(inspectionReports)
        .where(eq(inspectionReports.inspectionOrderId, req.params.id))
        .limit(1);

      res.json({
        order: order[0],
        application,
        owner: owner ? {
          fullName: owner.fullName,
          mobile: owner.mobile,
          email: owner.email,
        } : null,
        documents,
        reportSubmitted: existingReport.length > 0,
        existingReport: existingReport.length > 0 ? existingReport[0] : null,
      });
    } catch (error) {
      console.error("[da] Failed to fetch inspection details:", error);
      res.status(500).json({ message: "Failed to fetch inspection details" });
    }
  });

  // Submit inspection report
  app.post("/api/da/inspections/:id/submit-report", requireRole('dealing_assistant'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const orderId = req.params.id;
      
      // Validate the inspection order exists and is assigned to this DA
      const order = await db
        .select()
        .from(inspectionOrders)
        .where(eq(inspectionOrders.id, orderId))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ message: "Inspection order not found" });
      }

      if (order[0].assignedTo !== userId) {
        return res.status(403).json({ message: "You can only submit reports for inspections assigned to you" });
      }

      // Check if report already exists
      const existingReport = await db
        .select()
        .from(inspectionReports)
        .where(eq(inspectionReports.inspectionOrderId, orderId))
        .limit(1);

      if (existingReport.length > 0) {
        return res.status(400).json({ message: "Inspection report already submitted for this order" });
      }

      // Validate and prepare report data
      const reportData = {
        inspectionOrderId: orderId,
        applicationId: order[0].applicationId,
        submittedBy: userId,
        submittedDate: new Date(),
        // Convert date string to Date object
        actualInspectionDate: req.body.actualInspectionDate ? new Date(req.body.actualInspectionDate) : new Date(),
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
        recommendation: req.body.recommendation || 'approve',
        detailedFindings: req.body.detailedFindings || '',
        // Additional fields
        inspectionPhotos: req.body.inspectionPhotos || null,
        reportDocumentUrl: req.body.reportDocumentUrl || null,
      };

      // Insert inspection report
      const [newReport] = await db.insert(inspectionReports).values(reportData).returning();

      // Update inspection order status to completed
      await db.update(inspectionOrders)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(inspectionOrders.id, orderId));

      // Update application status to inspection_under_review for DTDO to review
      // According to PRD_2.0.md workflow: inspection_completed → inspection_under_review → DTDO decision
      await storage.updateApplication(order[0].applicationId, {
        status: 'inspection_under_review',
        currentStage: 'inspection_completed',
      });

      res.json({ report: newReport, message: "Inspection report submitted successfully" });
    } catch (error) {
      console.error("[da] Failed to submit inspection report:", error);
      res.status(500).json({ message: "Failed to submit inspection report" });
    }
  });

  // Document Routes
  
  // Get documents for application
  app.get("/api/applications/:id/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByApplication(req.params.id);
      res.json({ documents });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Payment Routes
  
  // Create payment
  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const payment = await storage.createPayment(req.body);
      res.json({ payment });
    } catch (error) {
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Update payment (for gateway callback)
  app.patch("/api/payments/:id", async (req, res) => {
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

  // Get payments for application
  app.get("/api/applications/:id/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByApplication(req.params.id);
      res.json({ payments });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  // Confirm payment (Officer only)
  app.post("/api/payments/:id/confirm", requireRole("district_officer", "state_officer"), async (req, res) => {
    try {
      const payment = await storage.getPaymentById(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      // Update payment status to success
      await storage.updatePayment(req.params.id, {
        paymentStatus: "success",
        completedAt: new Date(),
      });

      // Update application status to approved and generate certificate number
      const application = await storage.getApplication(payment.applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const certificateNumber = `HP-HST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
      
      await storage.updateApplication(payment.applicationId, {
        status: "approved",
        certificateNumber,
        certificateIssuedDate: new Date(),
        certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        approvedAt: new Date(),
      });

      res.json({ 
        message: "Payment confirmed and certificate issued",
        certificateNumber,
        applicationId: payment.applicationId
      });
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  // Get all pending payments (Officer only)
  app.get("/api/payments/pending", requireRole("district_officer", "state_officer"), async (req, res) => {
    try {
      const allApplications = await storage.getAllApplications();
      const pendingPaymentApps = allApplications.filter(a => a.status === 'payment_pending');
      
      const paymentsWithApps = await Promise.all(
        pendingPaymentApps.map(async (app) => {
          const payments = await storage.getPaymentsByApplication(app.id);
          return {
            application: app,
            payment: payments.find(p => p.paymentStatus === 'pending_verification') || payments[0] || null,
          };
        })
      );

      res.json({ pendingPayments: paymentsWithApps.filter(p => p.payment !== null) });
    } catch (error) {
      console.error('Pending payments fetch error:', error);
      res.status(500).json({ message: "Failed to fetch pending payments" });
    }
  });

  // Public Routes (Discovery Platform)
  
  // Get approved properties
  app.get("/api/public/properties", async (req, res) => {
    try {
      const properties = await storage.getApplicationsByStatus('approved');
      res.json({ properties });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Analytics Routes (Officers Only)
  
  // Get production portal statistics (scraped from official portal)
  app.get("/api/analytics/production-stats", requireRole("dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"), async (req, res) => {
    try {
      const stats = await storage.getLatestProductionStats();
      res.json({ stats });
    } catch (error) {
      console.error('Production stats error:', error);
      res.status(500).json({ message: "Failed to fetch production stats" });
    }
  });
  
  // Get analytics dashboard data
  app.get("/api/analytics/dashboard", requireRole("dealing_assistant", "district_tourism_officer", "district_officer", "state_officer", "admin"), async (req, res) => {
    try {
      const allApplications = await storage.getAllApplications();
      const allUsers = await storage.getAllUsers();
      
      // Calculate overview stats
      const total = allApplications.length;
      const byStatus = {
        pending: allApplications.filter(a => a.status === 'pending').length,
        district_review: allApplications.filter(a => a.status === 'district_review').length,
        state_review: allApplications.filter(a => a.status === 'state_review').length,
        approved: allApplications.filter(a => a.status === 'approved').length,
        rejected: allApplications.filter(a => a.status === 'rejected').length,
      };
      
      // Calculate category distribution
      const byCategory = {
        diamond: allApplications.filter(a => a.category === 'diamond').length,
        gold: allApplications.filter(a => a.category === 'gold').length,
        silver: allApplications.filter(a => a.category === 'silver').length,
      };
      
      // Calculate district distribution
      const districtCounts: Record<string, number> = {};
      allApplications.forEach(app => {
        districtCounts[app.district] = (districtCounts[app.district] || 0) + 1;
      });
      
      // Calculate average processing time for approved applications
      const approvedApps = allApplications.filter(a => a.status === 'approved' && a.submittedAt && a.stateReviewDate);
      const processingTimes = approvedApps.map(app => {
        const submitted = new Date(app.submittedAt!).getTime();
        const approved = new Date(app.stateReviewDate!).getTime();
        return Math.floor((approved - submitted) / (1000 * 60 * 60 * 24)); // days
      });
      const avgProcessingTime = processingTimes.length > 0
        ? Math.round(processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length)
        : 0;
      
      // Recent applications (last 10)
      const recentApplications = [...allApplications]
        .sort((a, b) => {
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 10);
      
      res.json({
        overview: {
          total,
          byStatus,
          byCategory,
          avgProcessingTime,
          totalOwners: allUsers.filter(u => u.role === 'property_owner').length,
        },
        districts: districtCounts,
        recentApplications,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Dev Console Routes (Development Only)
  // Admin seed endpoint - creates full test dataset
  // Use this to populate your database with demo data
  app.post("/admin/seed-database", async (req, res) => {
    try {
      // Check if seed data already exists
      const existingUser = await storage.getUserByMobile("9999999991");
      if (existingUser) {
        return res.json({
          message: "Seed data already exists",
          users: 3,
          properties: 5,
          note: "Database already has test accounts. Use /api/dev/clear-all first if you want to re-seed."
        });
      }

      // Create the 3 standard test users (matching seed-mock-data.ts)
      const owner = await storage.createUser({
        fullName: "Property Owner Demo",
        mobile: "9999999991",
        email: "owner@hptourism.com",
        password: "test123",
        role: "property_owner",
        district: "Shimla",
        aadhaarNumber: "123456789001",
      });

      const districtOfficer = await storage.createUser({
        fullName: "District Officer Shimla",
        mobile: "9999999992",
        email: "district@hptourism.gov.in",
        password: "test123",
        role: "district_officer",
        district: "Shimla",
        aadhaarNumber: "123456789002",
      });

      const stateOfficer = await storage.createUser({
        fullName: "State Tourism Officer",
        mobile: "9999999993",
        email: "state@hptourism.gov.in",
        password: "test123",
        role: "state_officer",
        district: "Shimla",
        aadhaarNumber: "123456789003",
      });

      // Create 5 mock homestay properties (matching seed-mock-data.ts)
      
      // 1. Mountain View Retreat - Diamond - Approved
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
          tv: true,
        },
        rooms: [
          { roomType: "Deluxe", size: 300, count: 4 },
          { roomType: "Suite", size: 450, count: 4 },
        ],
        baseFee: "5000.00",
        perRoomFee: "1000.00",
        gstAmount: "2340.00",
        totalFee: "15340.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(),
        districtNotes: "Excellent property, meets all Diamond category standards",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: new Date(),
        stateNotes: "Approved. Exemplary homestay facility",
        certificateNumber: `HP-CERT-2025-${Date.now()}`,
        certificateIssuedDate: new Date(),
        certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(),
      }, { trusted: true });

      // 2. Pine Valley Homestay - Gold - State Review
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
          garden: true,
        },
        rooms: [
          { roomType: "Standard", size: 200, count: 3 },
          { roomType: "Deluxe", size: 280, count: 2 },
        ],
        baseFee: "3000.00",
        perRoomFee: "800.00",
        gstAmount: "1260.00",
        totalFee: "8260.00",
        status: "state_review",
        currentStage: "state",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(),
        districtNotes: "Good property, forwarded to state level",
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      }, { trusted: true });

      // 3. Cedar Wood Cottage - Silver - District Review
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
          garden: true,
        },
        rooms: [
          { roomType: "Standard", size: 180, count: 3 },
        ],
        baseFee: "2000.00",
        perRoomFee: "600.00",
        gstAmount: "720.00",
        totalFee: "4720.00",
        status: "district_review",
        currentStage: "district",
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      }, { trusted: true });

      // 4. Himalayan Heritage Home - Gold - Approved
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
          roomService: true,
        },
        rooms: [
          { roomType: "Standard", size: 220, count: 4 },
          { roomType: "Deluxe", size: 300, count: 2 },
        ],
        baseFee: "3000.00",
        perRoomFee: "800.00",
        gstAmount: "1440.00",
        totalFee: "9440.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        districtNotes: "Heritage property, well maintained",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: new Date(),
        stateNotes: "Approved for Gold category",
        certificateNumber: `HP-CERT-2025-${Date.now() + 1}`,
        certificateIssuedDate: new Date(),
        certificateExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(),
      }, { trusted: true });

      // 5. Snowfall Cottage - Silver - Submitted
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
          petFriendly: true,
        },
        rooms: [
          { roomType: "Standard", size: 190, count: 4 },
        ],
        baseFee: "2000.00",
        perRoomFee: "600.00",
        gstAmount: "900.00",
        totalFee: "5900.00",
        status: "submitted",
        currentStage: "district",
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      }, { trusted: true });

      // 6. Devdar Manor - Diamond - Approved
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
          ac: true,
        },
        rooms: [
          { roomType: "Deluxe", size: 350, count: 6 },
          { roomType: "Suite", size: 500, count: 4 },
        ],
        baseFee: "5000.00",
        perRoomFee: "1000.00",
        gstAmount: "2700.00",
        totalFee: "17700.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        districtNotes: "Premium property with excellent facilities",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        stateNotes: "Outstanding property. Highly recommended",
        certificateNumber: `HP-CERT-2025-${Date.now() + 2}`,
        certificateIssuedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        certificateExpiryDate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      }, { trusted: true });

      // 7. Maple Tree Homestay - Gold - Approved
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
          mountainView: true,
        },
        rooms: [
          { roomType: "Standard", size: 240, count: 4 },
          { roomType: "Deluxe", size: 320, count: 3 },
        ],
        baseFee: "3000.00",
        perRoomFee: "800.00",
        gstAmount: "1620.00",
        totalFee: "10620.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        districtNotes: "Well-maintained property in scenic location",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        stateNotes: "Approved for Gold category",
        certificateNumber: `HP-CERT-2025-${Date.now() + 3}`,
        certificateIssuedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        certificateExpiryDate: new Date(Date.now() + 358 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      }, { trusted: true });

      // 8. Oak Ridge Villa - Silver - Approved
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
          garden: true,
        },
        rooms: [
          { roomType: "Standard", size: 200, count: 5 },
        ],
        baseFee: "2000.00",
        perRoomFee: "600.00",
        gstAmount: "900.00",
        totalFee: "5900.00",
        status: "approved",
        currentStage: "final",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        districtNotes: "Clean and comfortable property",
        stateOfficerId: stateOfficer.id,
        stateReviewDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        stateNotes: "Approved for Silver category",
        certificateNumber: `HP-CERT-2025-${Date.now() + 4}`,
        certificateIssuedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        certificateExpiryDate: new Date(Date.now() + 359 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      }, { trusted: true });

      // 9. Riverside Haven - Gold - District Review
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
          tv: true,
        },
        rooms: [
          { roomType: "Standard", size: 250, count: 4 },
          { roomType: "Deluxe", size: 320, count: 2 },
        ],
        baseFee: "3000.00",
        perRoomFee: "800.00",
        gstAmount: "1440.00",
        totalFee: "9440.00",
        status: "district_review",
        currentStage: "district",
        submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      }, { trusted: true });

      // 10. Alpine Chalet - Diamond - State Review
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
          ac: true,
        },
        rooms: [
          { roomType: "Deluxe", size: 330, count: 5 },
          { roomType: "Suite", size: 480, count: 4 },
        ],
        baseFee: "5000.00",
        perRoomFee: "1000.00",
        gstAmount: "2520.00",
        totalFee: "16520.00",
        status: "state_review",
        currentStage: "state",
        districtOfficerId: districtOfficer.id,
        districtReviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        districtNotes: "Luxury property with all modern amenities. Forwarded to state",
        submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      }, { trusted: true });

      res.json({
        success: true,
        message: "✅ Database seeded successfully with 10 properties!",
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
    } catch (error: any) {
      console.error("Seed error:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to seed database", 
        error: error.message 
      });
    }
  });

  if (process.env.NODE_ENV === "development") {
    // Get storage stats
    app.get("/api/dev/stats", async (req, res) => {
      const stats = await storage.getStats();
      res.json(stats);
    });
    
    // Get all users (for testing)
    app.get("/api/dev/users", async (req, res) => {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json({ users: usersWithoutPasswords });
    });

    // Clear all data
    app.post("/api/dev/clear-all", async (req, res) => {
      await storage.clearAll();
      res.json({ message: "All data cleared successfully" });
    });

    // Seed sample data (old endpoint for backward compatibility)
    app.post("/api/dev/seed", async (req, res) => {
      try {
        // Create sample users
        const owner = await storage.createUser({
          fullName: "Demo Property Owner",
          mobile: "9876543210",
          password: "test123",
          role: "property_owner",
          district: "Shimla",
        });

        const districtOfficer = await storage.createUser({
          fullName: "District Officer Shimla",
          mobile: "9876543211",
          password: "test123",
          role: "district_officer",
          district: "Shimla",
        });

        const stateOfficer = await storage.createUser({
          fullName: "State Tourism Officer",
          mobile: "9876543212",
          password: "test123",
          role: "state_officer",
        });

        // Create sample applications (trusted server code can set status)
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
          submittedAt: new Date(),
          districtOfficerId: districtOfficer.id,
          districtReviewDate: new Date(),
          districtNotes: "Excellent property. All criteria met.",
          stateOfficerId: stateOfficer.id,
          stateReviewDate: new Date(),
          stateNotes: "Approved for tourism operations.",
          certificateNumber: "HP-HM-2025-001",
        }, { trusted: true });

        const app2 = await storage.createApplication({
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
            hotWater: true,
          },
          status: "approved",
          submittedAt: new Date(),
          districtOfficerId: districtOfficer.id,
          districtReviewDate: new Date(),
          districtNotes: "Good property. Meets all requirements.",
          stateOfficerId: stateOfficer.id,
          stateReviewDate: new Date(),
          stateNotes: "Approved for tourism operations.",
          certificateNumber: "HP-HM-2025-002",
        }, { trusted: true });

        res.json({
          message: "Sample data created",
          users: 3,
          applications: 2,
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to seed data" });
      }
    });
  }

  // ============================================
  // Admin Routes - User Management
  // ============================================
  
  // Get all users (admin only)
  app.get("/api/admin/users", requireRole('admin'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        role, isActive, fullName, email, district, password,
        firstName, lastName, username, alternatePhone,
        designation, department, employeeId, officeAddress, officePhone
      } = req.body;
      
      // Fetch target user first to check their role
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Whitelist only safe fields for admin updates
      const updates: Partial<User> = {};
      
      // Basic profile fields
      if (fullName !== undefined && fullName !== null && fullName.trim()) {
        updates.fullName = fullName.trim();
      }
      
      // Name fields (for staff users)
      if (firstName !== undefined && firstName !== null) {
        updates.firstName = firstName.trim() || null;
      }
      if (lastName !== undefined && lastName !== null) {
        updates.lastName = lastName.trim() || null;
      }
      if (username !== undefined && username !== null) {
        updates.username = username.trim() || null;
      }
      
      // Contact fields
      if (email !== undefined && email !== null) {
        updates.email = email.trim() || null;
      }
      if (alternatePhone !== undefined && alternatePhone !== null) {
        updates.alternatePhone = alternatePhone.trim() || null;
      }
      
      // Official fields (for staff users)
      if (designation !== undefined && designation !== null) {
        updates.designation = designation.trim() || null;
      }
      if (department !== undefined && department !== null) {
        updates.department = department.trim() || null;
      }
      if (employeeId !== undefined && employeeId !== null) {
        updates.employeeId = employeeId.trim() || null;
      }
      if (district !== undefined && district !== null) {
        updates.district = district.trim() || null;
      }
      if (officeAddress !== undefined && officeAddress !== null) {
        updates.officeAddress = officeAddress.trim() || null;
      }
      if (officePhone !== undefined && officePhone !== null) {
        updates.officePhone = officePhone.trim() || null;
      }
      
      // Hash password if provided
      if (password !== undefined && password !== null && password.trim()) {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        updates.password = hashedPassword;
      }
      
      // Role updates with validation
      if (role !== undefined) {
        // Validate role is one of the allowed values
        const allowedRoles = ['property_owner', 'dealing_assistant', 'district_tourism_officer', 'district_officer', 'state_officer', 'admin'];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        updates.role = role;
      }
      
      // Active status updates
      if (isActive !== undefined) {
        updates.isActive = isActive;
      }
      
      // Prevent updates if no valid fields provided
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      // Prevent admins from changing their own role or deactivating themselves
      if (id === req.user?.id) {
        if (role && role !== req.user.role) {
          return res.status(400).json({ message: "Cannot change your own role" });
        }
        if (isActive === false) {
          return res.status(400).json({ message: "Cannot deactivate your own account" });
        }
      }
      
      // Prevent any admin from changing another admin's role or deactivating them
      if (targetUser.role === 'admin' && id !== req.user?.id) {
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

  // Toggle user status (admin only)
  app.patch("/api/admin/users/:id/status", requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      // Prevent admins from deactivating themselves
      if (id === req.user?.id && isActive === false) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }
      
      // Prevent deactivating other admin users
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.role === 'admin' && !isActive && user.id !== req.user?.id) {
        return res.status(400).json({ message: "Cannot deactivate other admin users" });
      }
      
      const updatedUser = await storage.updateUser(id, { isActive });
      res.json({ user: updatedUser });
    } catch (error) {
      console.error("Failed to update user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Create new user (admin only)
  app.post("/api/admin/users", requireRole('admin'), async (req, res) => {
    try {
      const { 
        mobile, fullName, role, district, password,
        firstName, lastName, username, email, alternatePhone,
        designation, department, employeeId, officeAddress, officePhone
      } = req.body;

      // Validate required fields based on role
      if (role !== 'property_owner') {
        // Staff users require firstName, lastName, mobile, and password
        if (!mobile || !firstName || !lastName || !password) {
          return res.status(400).json({ 
            message: "Mobile, first name, last name, and password are required for staff users" 
          });
        }
      } else {
        // Property owners require fullName, mobile, and password
        if (!mobile || !fullName || !password) {
          return res.status(400).json({ 
            message: "Mobile, full name, and password are required" 
          });
        }
      }

      // Validate mobile format
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return res.status(400).json({ message: "Invalid mobile number format" });
      }

      // Validate role
      const allowedRoles = [
        'property_owner', 
        'dealing_assistant', 
        'district_tourism_officer',
        'district_officer', 
        'state_officer', 
        'admin'
      ];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if mobile already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.mobile, mobile))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ 
          message: "A user with this mobile number already exists" 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Prepare user data with comprehensive profile fields
      const userData: any = {
        mobile,
        fullName: fullName || `${firstName} ${lastName}`, // Auto-generate for staff
        role,
        district: district?.trim() || null,
        password: hashedPassword,
        isActive: true,
      };

      // Add comprehensive profile fields for staff users
      if (role !== 'property_owner') {
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

      // Create user
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();

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

  // RESET DATABASE - Clear all test data (admin only)
  app.post("/api/admin/reset-db", requireRole('admin'), async (req, res) => {
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
      
      // Helper function to safely delete from a table (handles missing tables)
      const safeDelete = async (table: any, tableName: string) => {
        try {
          await db.delete(table);
          console.log(`[admin] ✓ Deleted all ${tableName}`);
        } catch (error: any) {
          if (error.code === '42P01') { // Table doesn't exist
            console.log(`[admin] ⊙ Skipped ${tableName} (table doesn't exist yet)`);
          } else {
            throw error; // Re-throw other errors
          }
        }
      };
      
      // Delete in correct order to respect foreign key constraints
      // Child tables first, then parent tables
      
      // 1. Inspection Reports (references inspectionOrders, homestayApplications)
      await safeDelete(inspectionReports, 'inspection reports');
      
      // 2. Inspection Orders (references homestayApplications, users)
      await safeDelete(inspectionOrders, 'inspection orders');
      
      // 3. Certificates (references homestayApplications)
      await safeDelete(certificates, 'certificates');
      
      // 4. Clarifications (references homestayApplications)
      await safeDelete(clarifications, 'clarifications');
      
      // 5. Objections (references homestayApplications)
      await safeDelete(objections, 'objections');
      
      // 6. Application Actions (references homestayApplications)
      await safeDelete(applicationActions, 'application actions');
      
      // 7. Reviews (references homestayApplications)
      await safeDelete(reviews, 'reviews');
      
      // 8. HimKosh Transactions (references payments)
      await safeDelete(himkoshTransactions, 'HimKosh transactions');
      
      // 9. Payments (references homestayApplications)
      await safeDelete(payments, 'payments');
      
      // 10. Documents (references homestayApplications)
      await safeDelete(documents, 'documents');
      
      // 11. Homestay Applications (references users)
      await safeDelete(homestayApplications, 'homestay applications');
      
      // 12. Notifications (references users)
      await safeDelete(notifications, 'notifications');
      
      // 13. Audit Logs (references users)
      await safeDelete(auditLogs, 'audit logs');
      
      // 14. Production Stats (no foreign keys)
      await safeDelete(productionStats, 'production stats');
      
      // 15. DDO Codes (optional - configuration data, not test data)
      let ddoCodesStatus = "preserved (configuration data)";
      if (!preserveDdoCodes) {
        await db.delete(ddoCodes);
        ddoCodesStatus = "deleted";
        console.log(`[admin] ✓ Deleted all DDO codes`);
      } else {
        console.log(`[admin] ⊙ Preserved DDO codes (configuration data)`);
      }
      
      // 15b. System Settings (always preserved - configuration data)
      console.log(`[admin] ⊙ Preserved system settings (configuration data)`);
      
      // 15c. LGD Master Data (optional - configuration data for Himachal Pradesh hierarchy)
      let lgdDataStatus = "preserved (configuration data)";
      if (!preserveLgdData) {
        // Delete LGD tables in reverse hierarchy (child to parent)
        await db.delete(lgdUrbanBodies);
        await db.delete(lgdGramPanchayats);
        await db.delete(lgdBlocks);
        await db.delete(lgdTehsils);
        await db.delete(lgdDistricts);
        lgdDataStatus = "deleted";
        console.log(`[admin] ✓ Deleted all LGD master data`);
      } else {
        console.log(`[admin] ⊙ Preserved LGD master data (configuration data)`);
      }
      
      // 16. Build list of roles to preserve
      const rolesToPreserve: string[] = ['admin', 'super_admin']; // Always preserve admins
      
      if (preservePropertyOwners) {
        rolesToPreserve.push('property_owner');
      }
      
      if (preserveDistrictOfficers) {
        rolesToPreserve.push('dealing_assistant', 'district_tourism_officer', 'district_officer');
      }
      
      if (preserveStateOfficers) {
        rolesToPreserve.push('state_officer');
      }
      
      console.log(`[admin] Roles to preserve:`, rolesToPreserve);
      
      // Delete user profiles for users whose roles are NOT in rolesToPreserve
      // Use a subquery to delete profiles based on user role
      const deletedProfiles = await db.delete(userProfiles)
        .where(
          sql`${userProfiles.userId} IN (SELECT id FROM ${users} WHERE ${notInArray(users.role, rolesToPreserve)})`
        )
        .returning();
      
      console.log(`[admin] ✓ Deleted ${deletedProfiles.length} user profiles for non-preserved roles`);
      
      // 17. Users (delete based on preservation settings)
      const deletedUsers = await db.delete(users)
        .where(
          notInArray(users.role, rolesToPreserve)
        )
        .returning();
      
      const preservedUsers = await db.select().from(users);
      
      // Count preserved users by role
      const preservedCounts = preservedUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`[admin] ✓ Deleted ${deletedUsers.length} users (preserved ${preservedUsers.length} accounts)`);
      
      // TODO: Delete uploaded files from object storage
      // This would require listing and deleting files from GCS bucket
      // For now, we'll just clear database records
      
      console.log("[admin] ✅ Database reset complete");
      
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
      console.error("[admin] ❌ Database reset failed:", error);
      res.status(500).json({ 
        message: "Failed to reset database",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ========================================
  // SUPER ADMIN CONSOLE ROUTES
  // ========================================

  // Get dashboard statistics for super admin
  app.get("/api/admin/dashboard/stats", requireRole('super_admin'), async (req, res) => {
    try {
      // Get all applications
      const allApplications = await db.select().from(homestayApplications);
      
      // Count by status
      const statusCounts = allApplications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get all users
      const allUsers = await db.select().from(users);
      
      // Count by role
      const propertyOwners = allUsers.filter(u => u.role === 'property_owner').length;
      const officers = allUsers.filter(u => ['dealing_assistant', 'district_tourism_officer', 'state_officer'].includes(u.role)).length;
      const admins = allUsers.filter(u => ['admin', 'super_admin'].includes(u.role)).length;

      // Get inspections
      const [allInspectionOrders, allInspectionReports] = await Promise.all([
        db.select().from(inspectionOrders),
        db.select().from(inspectionReports),
      ]);

      // Get payments
      const allPayments = await db.select().from(payments);
      const completedPayments = allPayments.filter(p => p.status === 'completed');
      const totalAmount = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      res.json({
        applications: {
          total: allApplications.length,
          pending: statusCounts['submitted'] || 0,
          underReview: statusCounts['under_review'] || 0,
          approved: statusCounts['approved'] || 0,
          rejected: statusCounts['rejected'] || 0,
          draft: statusCounts['draft'] || 0,
        },
        users: {
          total: allUsers.length,
          propertyOwners,
          officers,
          admins,
        },
        inspections: {
          scheduled: allInspectionOrders.length,
          completed: allInspectionReports.length,
          pending: allInspectionOrders.length - allInspectionReports.length,
        },
        payments: {
          total: allPayments.length,
          completed: completedPayments.length,
          pending: allPayments.length - completedPayments.length,
          totalAmount,
        },
      });
    } catch (error) {
      console.error("[admin] Failed to fetch dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Get system statistics
  app.get("/api/admin/stats", requireRole('super_admin'), async (req, res) => {
    try {
      const environment = process.env.NODE_ENV || 'development';
      const resetEnabled = environment === 'development' || environment === 'test';

      // Get counts
      const [
        applicationsCount,
        usersCount,
        documentsCount,
        paymentsCount
      ] = await Promise.all([
        db.select().from(homestayApplications).then(r => r.length),
        db.select().from(users).then(r => r.length),
        db.select().from(documents).then(r => r.length),
        db.select().from(payments).then(r => r.length),
      ]);

      // Get application status breakdown
      const applications = await db.select().from(homestayApplications);
      const byStatus = applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get user role breakdown
      const allUsers = await db.select().from(users);
      const byRole = allUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate database size (approximate)
      const dbSize = "N/A"; // PostgreSQL specific query needed
      const tables = 10; // Approximate

      res.json({
        database: {
          size: dbSize,
          tables,
        },
        applications: {
          total: applicationsCount,
          byStatus,
        },
        users: {
          total: usersCount,
          byRole,
        },
        files: {
          total: documentsCount,
          totalSize: "N/A", // Would need to calculate from storage
        },
        environment,
        resetEnabled,
      });
    } catch (error) {
      console.error("[admin] Failed to fetch stats:", error);
      res.status(500).json({ message: "Failed to fetch system statistics" });
    }
  });

  // ========================================
  // SYSTEM SETTINGS ROUTES (Admin/Super Admin)
  // ========================================

  // Get a specific system setting by key
  app.get("/api/admin/settings/:key", requireRole('admin'), async (req, res) => {
    try {
      const { key } = req.params;
      
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, key))
        .limit(1);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("[admin] Failed to fetch setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  // Update or create a system setting
  app.put("/api/admin/settings/:key", requireRole('admin'), async (req, res) => {
    try {
      const { key } = req.params;
      const { settingValue, description } = req.body;
      const userId = req.user?.id;
      
      if (!settingValue) {
        return res.status(400).json({ message: "Setting value is required" });
      }
      
      // Check if setting exists
      const [existingSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, key))
        .limit(1);
      
      if (existingSetting) {
        // Update existing setting
        const [updated] = await db
          .update(systemSettings)
          .set({
            settingValue,
            description: description || existingSetting.description,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(systemSettings.settingKey, key))
          .returning();
        
        console.log(`[admin] Updated setting: ${key}`);
        res.json(updated);
      } else {
        // Create new setting
        const [created] = await db
          .insert(systemSettings)
          .values({
            settingKey: key,
            settingValue,
            description: description || '',
            category: key.startsWith('payment_') ? 'payment' : 'general',
            updatedBy: userId,
          })
          .returning();
        
        console.log(`[admin] Created setting: ${key}`);
        res.json(created);
      }
    } catch (error) {
      console.error("[admin] Failed to update setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Get test payment mode status (specific endpoint for convenience)
  app.get("/api/admin/settings/payment/test-mode", requireRole('admin'), async (req, res) => {
    try {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, 'payment_test_mode'))
        .limit(1);
      
      if (!setting) {
        // Default: test mode disabled
        res.json({ enabled: false, isDefault: true });
      } else {
        const value = setting.settingValue as { enabled: boolean };
        res.json({ enabled: value.enabled, isDefault: false });
      }
    } catch (error) {
      console.error("[admin] Failed to fetch test payment mode:", error);
      res.status(500).json({ message: "Failed to fetch test payment mode" });
    }
  });

  // Toggle test payment mode
  app.post("/api/admin/settings/payment/test-mode/toggle", requireRole('admin'), async (req, res) => {
    try {
      const { enabled } = req.body;
      const userId = req.user?.id;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      
      // Check if setting exists
      const [existingSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, 'payment_test_mode'))
        .limit(1);
      
      if (existingSetting) {
        // Update existing
        const [updated] = await db
          .update(systemSettings)
          .set({
            settingValue: { enabled },
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(systemSettings.settingKey, 'payment_test_mode'))
          .returning();
        
        console.log(`[admin] Test payment mode ${enabled ? 'enabled' : 'disabled'}`);
        res.json(updated);
      } else {
        // Create new
        const [created] = await db
          .insert(systemSettings)
          .values({
            settingKey: 'payment_test_mode',
            settingValue: { enabled },
            description: 'When enabled, payment requests send ₹1 to gateway instead of actual amount (for testing)',
            category: 'payment',
            updatedBy: userId,
          })
          .returning();
        
        console.log(`[admin] Test payment mode ${enabled ? 'enabled' : 'disabled'}`);
        res.json(created);
      }
    } catch (error) {
      console.error("[admin] Failed to toggle test payment mode:", error);
      res.status(500).json({ message: "Failed to toggle test payment mode" });
    }
  });

  // ========================================
  // DATABASE CONSOLE ROUTES (Admin/Super Admin)
  // ========================================

  // Execute SQL query (for development/testing)
  app.post("/api/admin/db-console/execute", requireRole('admin'), async (req, res) => {
    try {
      const { query: sqlQuery } = req.body;
      
      if (!sqlQuery || typeof sqlQuery !== 'string') {
        return res.status(400).json({ message: "SQL query is required" });
      }

      // Check environment - only allow in development
      const environment = process.env.NODE_ENV || 'development';
      if (environment === 'production') {
        return res.status(403).json({ 
          message: "Database console is disabled in production for security" 
        });
      }

      const trimmedQuery = sqlQuery.trim().toLowerCase();
      
      // Detect query type
      const isSelect = trimmedQuery.startsWith('select');
      const isShow = trimmedQuery.startsWith('show');
      const isDescribe = trimmedQuery.startsWith('describe') || trimmedQuery.startsWith('\\d');
      const isExplain = trimmedQuery.startsWith('explain');
      const isReadOnly = isSelect || isShow || isDescribe || isExplain;

      console.log(`[db-console] Executing ${isReadOnly ? 'READ' : 'WRITE'} query:`, sqlQuery.substring(0, 100));

      // Execute the query
      const result = await db.execute(sql.raw(sqlQuery));
      
      // Extract rows from the result
      // db.execute returns an object with rows property for Neon driver
      let rows: any[] = [];
      if (Array.isArray(result)) {
        rows = result;
      } else if (result && (result as any).rows) {
        rows = (result as any).rows;
      } else if (result) {
        // If result is the rows directly
        rows = [result];
      }
      
      // Format response
      const response = {
        success: true,
        type: isReadOnly ? 'read' : 'write',
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

  // Get list of all tables
  app.get("/api/admin/db-console/tables", requireRole('admin'), async (req, res) => {
    try {
      const environment = process.env.NODE_ENV || 'development';
      if (environment === 'production') {
        return res.status(403).json({ 
          message: "Database console is disabled in production" 
        });
      }

      // Query to get all tables
      const result = await db.execute(sql`
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

  // Get table schema/structure
  app.get("/api/admin/db-console/table/:tableName/schema", requireRole('admin'), async (req, res) => {
    try {
      const { tableName } = req.params;
      
      const environment = process.env.NODE_ENV || 'development';
      if (environment === 'production') {
        return res.status(403).json({ 
          message: "Database console is disabled in production" 
        });
      }

      // Get column information
      const result = await db.execute(sql.raw(`
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

  // Reset operations
  app.post("/api/admin/reset/:operation", requireRole('super_admin'), async (req, res) => {
    try {
      const { operation } = req.params;
      const { confirmationText, reason } = req.body;

      // Check environment
      const environment = process.env.NODE_ENV || 'development';
      if (environment === 'production') {
        return res.status(403).json({ 
          message: "Reset operations are disabled in production" 
        });
      }

      // Validate confirmation
      const requiredText = operation === 'full' ? 'RESET' : 'DELETE';
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

      let deletedCounts: any = {};

      switch (operation) {
        case 'full':
          // Delete everything except super_admin accounts
          await db.delete(certificates);
          await db.delete(clarifications);
          await db.delete(objections);
          await db.delete(inspectionReports);
          await db.delete(inspectionOrders);
          await db.delete(documents);
          await db.delete(payments);
          await db.delete(homestayApplications);
          await db.delete(productionStats);
          await db.delete(users).where(ne(users.role, 'super_admin'));
          deletedCounts = { all: "All data except super_admin accounts" };
          break;

        case 'applications':
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

        case 'users':
          const deletedUsers = await db.delete(users).where(ne(users.role, 'super_admin'));
          deletedCounts = { users: "All non-super_admin users" };
          break;

        case 'files':
          const deletedDocs = await db.delete(documents);
          deletedCounts = { documents: "all" };
          // TODO: Delete from object storage
          break;

        case 'timeline':
          // Timeline table not yet implemented
          deletedCounts = { timeline: "not yet implemented" };
          break;

        case 'inspections':
          await db.delete(inspectionReports);
          await db.delete(inspectionOrders);
          deletedCounts = { inspections: "all orders and reports" };
          break;

        case 'objections':
          await db.delete(clarifications);
          await db.delete(objections);
          deletedCounts = { objections: "all objections and clarifications" };
          break;

        case 'payments':
          await db.delete(payments);
          deletedCounts = { payments: "all" };
          break;

        default:
          return res.status(400).json({ message: "Invalid operation" });
      }

      res.json({
        success: true,
        message: `Reset operation '${operation}' completed successfully`,
        deletedCounts,
      });
    } catch (error) {
      console.error("[super-admin] Reset failed:", error);
      res.status(500).json({ message: "Reset operation failed" });
    }
  });

  // Seed test data
  app.post("/api/admin/seed/:type", requireRole('super_admin'), async (req, res) => {
    try {
      const { type } = req.params;
      const { count = 10, scenario } = req.body;

      console.log(`[super-admin] Seeding data: ${type}, count: ${count}, scenario: ${scenario}`);

      // Get current user
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      switch (type) {
        case 'applications':
          // Generate test applications
          const createdApps = [];
          for (let i = 0; i < count; i++) {
            const app = await storage.createApplication({
              userId: currentUser.id,
              propertyName: `Test Property ${i + 1}`,
              propertyAddress: `Test Address ${i + 1}, Shimla`,
              district: 'shimla',
              pincode: '171001',
              locationType: 'mc',
              ownerName: `Test Owner ${i + 1}`,
              ownerMobile: `98765${String(i).padStart(5, '0')}`,
              ownerEmail: `test${i + 1}@example.com`,
              ownerAadhaar: `${String(i).padStart(12, '0')}`,
              category: ['diamond', 'gold', 'silver'][i % 3] as any,
              proposedRoomRate: 2000 + (i * 100),
              projectType: 'new_project',
              propertyArea: 1000,
              singleRooms: 2,
              singleRoomSize: 120,
              doubleRooms: 3,
              doubleRoomSize: 150,
              familyRooms: 1,
              familyRoomSize: 200,
              attachedWashrooms: 6,
              gstin: i % 2 === 0 ? `22AAAAA${i}111Z${i}` : undefined,
              airportDistance: 22,
              railwayDistance: 5,
              cityCenterDistance: 1,
              shoppingDistance: 0.5,
              busStandDistance: 2,
              lobbyArea: 100,
              diningArea: 80,
              parkingDescription: 'Covered parking for 5 vehicles',
              hasWifi: true,
              hasParking: true,
              hasAirConditioning: i % 2 === 0,
              hasHotWater: true,
              hasRoomService: i % 3 === 0,
              hasComplimentaryBreakfast: i % 2 === 0,
              status: 'draft',
              currentPage: 1,
              maxStepReached: 1,
            });
            createdApps.push(app);
          }
          return res.json({
            success: true,
            message: `Created ${createdApps.length} test applications`,
          });

        case 'users':
          // Generate test users for all roles
          const testUsers = [];
          const roles = ['property_owner', 'dealing_assistant', 'district_tourism_officer', 'state_officer'];
          for (const role of roles) {
            const user = await storage.createUser({
              name: `Test ${role.replace('_', ' ')}`,
              mobile: `9${role.length}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
              email: `test.${role}@example.com`,
              password: 'Test@123',
              role: role as any,
              district: role.includes('district') ? 'shimla' : undefined,
            });
            testUsers.push(user);
          }
          return res.json({
            success: true,
            message: `Created ${testUsers.length} test users (all roles)`,
          });

        case 'scenario':
          // Load predefined scenario
          // TODO: Implement scenario loading
          return res.json({
            success: true,
            message: `Scenario '${scenario}' loaded (not yet implemented)`,
          });

        default:
          return res.status(400).json({ message: "Invalid seed type" });
      }
    } catch (error) {
      console.error("[super-admin] Seed failed:", error);
      res.status(500).json({ message: "Failed to generate test data" });
    }
  });

  // LGD Master Data Import Endpoint
  app.post("/api/admin/lgd/import", requireRole('admin'), async (req, res) => {
    try {
      const { csvData, dataType } = req.body;
      
      if (!csvData || !dataType) {
        return res.status(400).json({ message: "Missing csvData or dataType" });
      }

      // Parse CSV (simple parsing - assumes well-formed CSV)
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',');
      
      let inserted = {
        districts: 0,
        tehsils: 0,
        blocks: 0,
        gramPanchayats: 0,
        urbanBodies: 0,
      };

      if (dataType === 'villages') {
        // File 2: Villages/Gram Panchayats with hierarchy
        // Headers: stateCode,stateNameEnglish,districtCode,districtNameEnglish,subdistrictCode,subdistrictNameEnglish,villageCode,villageNameEnglish,pincode
        
        const districtMap = new Map();
        const tehsilMap = new Map();
        const villages = [];

        // Parse all rows
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length < 9 || values[0] !== '2') continue; // Only HP data (stateCode = 2)

          const districtCode = values[2];
          const districtName = values[3];
          const tehsilCode = values[4];
          const tehsilName = values[5];
          const villageCode = values[6];
          const villageName = values[7];
          const pincode = values[8];

          // Collect unique districts
          if (!districtMap.has(districtCode)) {
            districtMap.set(districtCode, { code: districtCode, name: districtName });
          }

          // Collect unique tehsils
          const tehsilKey = `${districtCode}-${tehsilCode}`;
          if (!tehsilMap.has(tehsilKey)) {
            tehsilMap.set(tehsilKey, {
              code: tehsilCode,
              name: tehsilName,
              districtCode,
            });
          }

          // Collect villages
          villages.push({
            code: villageCode,
            name: villageName,
            tehsilCode,
            pincode: pincode || null,
          });
        }

        // Insert districts
        for (const [code, data] of districtMap) {
          await db.insert(lgdDistricts)
            .values({
              code: data.code,
              nameEnglish: data.name,
              isActive: true,
            })
            .onConflictDoNothing();
          inserted.districts++;
        }

        // Insert tehsils
        for (const [key, data] of tehsilMap) {
          // Get district ID
          const district = await db.query.lgdDistricts.findFirst({
            where: eq(lgdDistricts.code, data.districtCode),
          });

          if (district) {
            await db.insert(lgdTehsils)
              .values({
                code: data.code,
                nameEnglish: data.name,
                districtId: district.id,
                isActive: true,
              })
              .onConflictDoNothing();
            inserted.tehsils++;
          }
        }

        // Insert gram panchayats (villages)
        for (const village of villages) {
          // Get tehsil ID
          const tehsil = await db.query.lgdTehsils.findFirst({
            where: eq(lgdTehsils.code, village.tehsilCode),
          });

          if (tehsil) {
            await db.insert(lgdGramPanchayats)
              .values({
                code: village.code,
                nameEnglish: village.name,
                tehsilId: tehsil.id,
                pincode: village.pincode,
                isActive: true,
              })
              .onConflictDoNothing();
            inserted.gramPanchayats++;
          }
        }

      } else if (dataType === 'urbanBodies') {
        // File 1: Urban Bodies (municipalities, town panchayats)
        // Headers: stateCode,stateNameEnglish,localBodyCode,localBodyNameEnglish,localBodyTypeName,pincode

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length < 6 || values[0] !== '2') continue; // Only HP data

          const bodyCode = values[2];
          const bodyName = values[3];
          const bodyType = values[4];
          const pincode = values[5];

          await db.insert(lgdUrbanBodies)
            .values({
              code: bodyCode,
              nameEnglish: bodyName,
              type: bodyType,
              pincode: pincode || null,
              isActive: true,
            })
            .onConflictDoNothing();
          inserted.urbanBodies++;
        }
      } else {
        return res.status(400).json({ message: "Invalid dataType. Must be 'villages' or 'urbanBodies'" });
      }

      res.json({
        success: true,
        message: `Successfully imported LGD data (${dataType})`,
        inserted,
      });

    } catch (error) {
      console.error("[admin] LGD import failed:", error);
      res.status(500).json({ message: "Failed to import LGD data", error: String(error) });
    }
  });

  // HimKosh Payment Gateway Routes
  app.use("/api/himkosh", himkoshRoutes);
  console.log('[himkosh] Payment gateway routes registered');

  // Start production stats scraper (runs on boot and hourly)
  startScraperScheduler();
  console.log('[scraper] Production stats scraper initialized');

  const httpServer = createServer(app);
  return httpServer;
}
