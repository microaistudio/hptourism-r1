import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { insertUserSchema, type User, type HomestayApplication } from "@shared/schema";
import { z } from "zod";
import { startScraperScheduler } from "./scraper";
import { ObjectStorageService } from "./objectStorage";

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

// Auth middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Role-based middleware
export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
      const rawData = {
        ...req.body,
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
      
      // For demo: simple password (in production, use bcrypt)
      const user = await storage.createUser(data);
      
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
  
  // Create application
  app.post("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Security: Whitelist only owner-submittable fields
      // Note: Using default (non-strict) mode to allow form to send extra fields
      // that will be ignored. Only whitelisted fields are extracted below.
      const ownerSubmittableSchema = z.object({
        propertyName: z.string(),
        category: z.enum(['diamond', 'gold', 'silver']),
        totalRooms: z.coerce.number(),
        address: z.string(),
        district: z.string(),
        pincode: z.string(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        ownerName: z.string(),
        ownerMobile: z.string(),
        ownerEmail: z.string().optional(),
        ownerAadhaar: z.string(),
        amenities: z.any().optional(),
        rooms: z.any().optional(),
        baseFee: z.string(),
        perRoomFee: z.string(),
        gstAmount: z.string(),
        totalFee: z.string(),
        // Document URLs (legacy)
        ownershipProofUrl: z.string().optional(),
        aadhaarCardUrl: z.string().optional(),
        panCardUrl: z.string().optional(),
        gstCertificateUrl: z.string().optional(),
        propertyPhotosUrls: z.array(z.string()).optional(),
        // New documents structure with metadata
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
      
      // Build payload with ONLY allowed fields (double security layer)
      // Pass trusted flag to allow server-controlled status override
      const application = await storage.createApplication({
        propertyName: validatedData.propertyName,
        category: validatedData.category,
        totalRooms: validatedData.totalRooms,
        address: validatedData.address,
        district: validatedData.district,
        pincode: validatedData.pincode,
        ownerName: validatedData.ownerName,
        ownerMobile: validatedData.ownerMobile,
        ownerEmail: validatedData.ownerEmail,
        ownerAadhaar: validatedData.ownerAadhaar,
        amenities: validatedData.amenities,
        rooms: validatedData.rooms,
        baseFee: validatedData.baseFee,
        perRoomFee: validatedData.perRoomFee,
        gstAmount: validatedData.gstAmount,
        totalFee: validatedData.totalFee,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        ownershipProofUrl: validatedData.ownershipProofUrl,
        aadhaarCardUrl: validatedData.aadhaarCardUrl,
        panCardUrl: validatedData.panCardUrl,
        gstCertificateUrl: validatedData.gstCertificateUrl,
        propertyPhotosUrls: validatedData.propertyPhotosUrls,
        userId,
        status: 'submitted',
        submittedAt: new Date(),
      }, { trusted: true });
      
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
        return res.status(400).json({ message: error.errors[0].message });
      }
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
  app.get("/api/applications/all", requireRole('district_officer', 'state_officer', 'admin'), async (req, res) => {
    try {
      const applications = await storage.getAllApplications();
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
      
      // Can only update if sent back for corrections
      if (application.status !== 'sent_back_for_corrections') {
        return res.status(400).json({ message: "Application can only be updated when sent back for corrections" });
      }
      
      // Use same schema as create, but make all fields optional
      const updateSchema = z.object({
        propertyName: z.string().optional(),
        category: z.enum(['diamond', 'gold', 'silver']).optional(),
        totalRooms: z.coerce.number().optional(),
        address: z.string().optional(),
        district: z.string().optional(),
        pincode: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        ownerName: z.string().optional(),
        ownerMobile: z.string().optional(),
        ownerEmail: z.string().optional(),
        ownerAadhaar: z.string().optional(),
        amenities: z.any().optional(),
        rooms: z.any().optional(),
        baseFee: z.string().optional(),
        perRoomFee: z.string().optional(),
        gstAmount: z.string().optional(),
        totalFee: z.string().optional(),
        ownershipProofUrl: z.string().optional(),
        aadhaarCardUrl: z.string().optional(),
        panCardUrl: z.string().optional(),
        gstCertificateUrl: z.string().optional(),
        propertyPhotosUrls: z.array(z.string()).optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      // Update the application and change status back to submitted
      const updatedApplication = await storage.updateApplication(id, {
        ...validatedData,
        status: 'submitted',
        submittedAt: new Date(),
        clarificationRequested: null, // Clear feedback after resubmission
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
        status: 'inspection_scheduled',
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

  // Officer Actions - Mark Inspection Complete
  app.post("/api/applications/:id/complete-inspection", requireRole('district_officer', 'state_officer'), async (req, res) => {
    try {
      const { id } = req.params;
      const { findings, notes } = req.body;

      const user = await storage.getUser(req.session.userId!);
      if (!user || (user.role !== "district_officer" && user.role !== "state_officer")) {
        return res.status(403).json({ message: "Only officers can complete inspections" });
      }

      const application = await storage.getApplication(id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Update application
      const updated = await storage.updateApplication(id, {
        status: 'inspection_completed',
        siteInspectionCompletedDate: new Date(),
        siteInspectionFindings: findings || {},
        siteInspectionNotes: notes,
      });

      res.json({ application: updated, message: "Inspection marked as complete" });
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
  app.get("/api/analytics/production-stats", requireRole("district_officer", "state_officer"), async (req, res) => {
    try {
      const stats = await storage.getLatestProductionStats();
      res.json({ stats });
    } catch (error) {
      console.error('Production stats error:', error);
      res.status(500).json({ message: "Failed to fetch production stats" });
    }
  });
  
  // Get analytics dashboard data
  app.get("/api/analytics/dashboard", requireRole("district_officer", "state_officer"), async (req, res) => {
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

  // Start production stats scraper (runs on boot and hourly)
  startScraperScheduler();
  console.log('[scraper] Production stats scraper initialized');

  const httpServer = createServer(app);
  return httpServer;
}
