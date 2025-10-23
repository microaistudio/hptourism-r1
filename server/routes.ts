import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { insertUserSchema, type User, type HomestayApplication } from "@shared/schema";
import { z } from "zod";

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
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "hp-tourism-secret-dev-only",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message, errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
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
      if (!user || user.password !== password) {
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
  
  // Create application
  app.post("/api/applications", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Security: Whitelist only owner-submittable fields
      // Note: Using default (non-strict) mode to allow form to send extra fields
      // that will be ignored. Only whitelisted fields are extracted below.
      const ownerSubmittableSchema = z.object({
        propertyName: z.string(),
        category: z.string(),
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
        userId,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      }, { trusted: true });
      
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
      if (user?.role === 'owner') {
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
      
      if (user?.role === 'owner' && application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json({ application });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch application" });
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

  // Dev Console Routes (Development Only)
  if (process.env.NODE_ENV === "development") {
    // Get storage stats
    app.get("/api/dev/stats", (req, res) => {
      const stats = storage.getStats();
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
    app.post("/api/dev/clear-all", (req, res) => {
      storage.clearAll();
      res.json({ message: "All data cleared successfully" });
    });

    // Seed sample data
    app.post("/api/dev/seed", async (req, res) => {
      try {
        // Create sample users
        const owner = await storage.createUser({
          fullName: "Demo Property Owner",
          mobile: "9876543210",
          password: "test123",
          role: "owner",
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
        await storage.createApplication({
          userId: owner.id,
          propertyName: "Mountain View Homestay",
          address: "Near Mall Road, Shimla",
          district: "Shimla",
          pincode: "171001",
          ownerName: owner.fullName,
          ownerMobile: owner.mobile,
          ownerAadhaar: "123456789012",
          totalRooms: 5,
          category: "gold",
          baseFee: "3000",
          perRoomFee: "300",
          gstAmount: "1080",
          totalFee: "7080",
          status: "pending",
          submittedAt: new Date().toISOString(),
        }, { trusted: true });

        await storage.createApplication({
          userId: owner.id,
          propertyName: "Valley Retreat",
          address: "Lower Bazaar, Shimla",
          district: "Shimla",
          pincode: "171003",
          ownerName: owner.fullName,
          ownerMobile: owner.mobile,
          ownerAadhaar: "123456789012",
          totalRooms: 3,
          category: "silver",
          baseFee: "2000",
          perRoomFee: "200",
          gstAmount: "792",
          totalFee: "3392",
          status: "pending",
          submittedAt: new Date().toISOString(),
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

  const httpServer = createServer(app);
  return httpServer;
}
