import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type Session } from "./storage";
import { insertJobCardSchema, JOB_STATUSES, insertStaffSchema, insertAttendanceSchema, updateAttendanceSchema, USER_ROLES, WORK_SKILLS, loginSchema, insertLoyaltyCustomerSchema, insertRewardSchema, insertJobCardImageSchema, insertPartsCatalogSchema, JobCard } from "@shared/schema";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import PDFDocument from "pdfkit";

declare global {
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

async function getSessionFromRequest(req: Request): Promise<Session | undefined> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  
  const sessionId = authHeader.slice(7);
  return storage.getSession(sessionId);
}

function getRoleFromSession(req: Request): string | null {
  if (req.session) {
    return req.session.user.role;
  }
  return null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const role = req.session.user.role;
    if (allowedRoles.includes(role)) {
      next();
    } else {
      res.status(403).json({ error: "Access denied" });
    }
  };
}

function canViewRevenue(role: string): boolean {
  return role === "Admin" || role === "Manager";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  registerObjectStorageRoutes(app);
  
  app.use(async (req, res, next) => {
    req.session = await getSessionFromRequest(req);
    next();
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid credentials format" });
      }

      const { username, password } = parsed.data;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const session = await storage.createSession(user.id);
      res.json({ 
        token: session.id,
        user: session.user
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const sessionId = authHeader.slice(7);
        await storage.deleteSession(sessionId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.session.user);
  });

  app.get("/api/job-cards", requireAuth, async (req, res) => {
    try {
      const role = getRoleFromSession(req) || "Job Card";
      const jobCards = await storage.getJobCards();
      
      if (!canViewRevenue(role)) {
        const sanitized = jobCards.map(({ cost, advancePayment, remainingPayment, ...rest }) => rest);
        return res.json(sanitized);
      }
      
      res.json(jobCards);
    } catch (error) {
      console.error("Error fetching job cards:", error);
      res.status(500).json({ error: "Failed to fetch job cards" });
    }
  });

  app.get("/api/job-cards/recent", requireAuth, async (req, res) => {
    try {
      const role = getRoleFromSession(req) || "Job Card";
      const limit = parseInt(req.query.limit as string) || 5;
      const jobCards = await storage.getRecentJobCards(limit);
      
      if (!canViewRevenue(role)) {
        const sanitized = jobCards.map(({ cost, advancePayment, remainingPayment, ...rest }) => rest);
        return res.json(sanitized);
      }
      
      res.json(jobCards);
    } catch (error) {
      console.error("Error fetching recent job cards:", error);
      res.status(500).json({ error: "Failed to fetch recent job cards" });
    }
  });

  app.get("/api/job-cards/:id", requireAuth, async (req, res) => {
    try {
      const role = getRoleFromSession(req) || "Job Card";
      const jobCard = await storage.getJobCard(req.params.id);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }
      
      if (!canViewRevenue(role)) {
        const { cost, advancePayment, remainingPayment, ...sanitized } = jobCard;
        return res.json(sanitized);
      }
      
      res.json(jobCard);
    } catch (error) {
      console.error("Error fetching job card:", error);
      res.status(500).json({ error: "Failed to fetch job card" });
    }
  });

  app.post("/api/job-cards", requireRole("Admin", "Manager", "Job Card"), async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.bay === "") body.bay = undefined;
      if (body.assignedTo === "") body.assignedTo = undefined;
      
      const parsed = insertJobCardSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const jobCard = await storage.createJobCard(parsed.data);

      if (req.session) {
        await storage.createJobCardAuditLog(
          jobCard.id,
          req.session.user.id || "unknown",
          req.session.user.name || req.session.user.username,
          "created",
          [{ field: "jobCard", oldValue: null, newValue: "Created" }]
        );
      }

      res.status(201).json(jobCard);
    } catch (error) {
      console.error("Error creating job card:", error);
      res.status(500).json({ error: "Failed to create job card" });
    }
  });

  app.patch("/api/job-cards/:id", requireRole("Admin", "Manager", "Job Card"), async (req, res) => {
    try {
      const existingJobCard = await storage.getJobCard(req.params.id);
      if (!existingJobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }

      const jobCard = await storage.updateJobCard(req.params.id, req.body);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }

      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      const fieldsToTrack = [
        "customerName", "phone", "bikeModel", "registration", "odometer",
        "serviceType", "status", "assignedTo", "bay", "estimatedTime",
        "cost", "repairDetails", "tagNo", "customerRequests", "parts"
      ];

      for (const field of fieldsToTrack) {
        const oldVal = (existingJobCard as any)[field];
        const newVal = (jobCard as any)[field];
        
        if (Array.isArray(oldVal) && Array.isArray(newVal)) {
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ field, oldValue: oldVal, newValue: newVal });
          }
        } else if (oldVal !== newVal) {
          changes.push({ field, oldValue: oldVal ?? null, newValue: newVal ?? null });
        }
      }

      if (changes.length > 0 && req.session) {
        await storage.createJobCardAuditLog(
          req.params.id,
          req.session.user.id || "unknown",
          req.session.user.name || req.session.user.username,
          "updated",
          changes
        );
      }

      res.json(jobCard);
    } catch (error) {
      console.error("Error updating job card:", error);
      res.status(500).json({ error: "Failed to update job card" });
    }
  });

  app.patch("/api/job-cards/:id/status", requireAuth, async (req, res) => {
    try {
      const statusSchema = z.object({
        status: z.enum(JOB_STATUSES),
      });
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const existingJobCard = await storage.getJobCard(req.params.id);
      if (!existingJobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }

      const oldStatus = existingJobCard.status;
      const jobCard = await storage.updateJobCardStatus(req.params.id, parsed.data.status);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }

      if (oldStatus !== parsed.data.status && req.session) {
        await storage.createJobCardAuditLog(
          req.params.id,
          req.session.user.id || "unknown",
          req.session.user.name || req.session.user.username,
          "status_changed",
          [{ field: "status", oldValue: oldStatus, newValue: parsed.data.status }]
        );
      }

      res.json(jobCard);
    } catch (error) {
      console.error("Error updating job card status:", error);
      res.status(500).json({ error: "Failed to update job card status" });
    }
  });

  app.delete("/api/job-cards/:id", requireRole("Admin", "Manager", "Job Card"), async (req, res) => {
    try {
      const deleted = await storage.deleteJobCard(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Job card not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting job card:", error);
      res.status(500).json({ error: "Failed to delete job card" });
    }
  });

  app.get("/api/job-cards/:id/audit", requireAuth, async (req, res) => {
    try {
      const auditLogs = await storage.getJobCardAuditLogs(req.params.id);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching job card audit logs:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  app.post("/api/job-cards/:id/print", requireAuth, async (req, res) => {
    try {
      const jobCard = await storage.getJobCard(req.params.id);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }
      
      const user = req.session?.user;
      if (user) {
        await storage.createJobCardAuditLog(
          req.params.id,
          user.id,
          user.name || user.username,
          "printed",
          []
        );
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording print action:", error);
      res.status(500).json({ error: "Failed to record print action" });
    }
  });

  // Job Card Images
  app.get("/api/job-cards/:id/images", requireRole("Admin", "Manager", "Job Card", "Technician", "Service"), async (req, res) => {
    try {
      const images = await storage.getJobCardImages(req.params.id);
      res.json(images);
    } catch (error) {
      console.error("Error fetching job card images:", error);
      res.status(500).json({ error: "Failed to fetch images" });
    }
  });

  app.post("/api/job-cards/:id/images", requireRole("Admin", "Manager", "Job Card"), async (req, res) => {
    try {
      const jobCard = await storage.getJobCard(req.params.id);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }

      const { objectPath, filename, mimeType, size } = req.body;
      
      if (!objectPath || !filename || !mimeType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedMimeTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." });
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (size && size > maxSize) {
        return res.status(400).json({ error: "File size exceeds 5MB limit" });
      }

      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const image = await storage.createJobCardImage({
        jobCardId: req.params.id,
        objectPath,
        filename,
        mimeType,
        size: size || 0,
        uploadedBy: user.id,
        uploadedByName: user.name || user.username,
      });

      await storage.createJobCardAuditLog(
        req.params.id,
        user.id,
        user.name || user.username,
        "image_added",
        [{ field: "image", oldValue: null, newValue: filename }]
      );

      res.json(image);
    } catch (error) {
      console.error("Error creating job card image:", error);
      res.status(500).json({ error: "Failed to create image" });
    }
  });

  app.delete("/api/job-cards/:id/images/:imageId", requireRole("Admin", "Manager", "Job Card"), async (req, res) => {
    try {
      const image = await storage.getJobCardImage(req.params.imageId);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      if (image.jobCardId !== req.params.id) {
        return res.status(400).json({ error: "Image does not belong to this job card" });
      }

      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const success = await storage.deleteJobCardImage(req.params.imageId);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete image" });
      }

      await storage.createJobCardAuditLog(
        req.params.id,
        user.id,
        user.name || user.username,
        "image_deleted",
        [{ field: "image", oldValue: image.filename, newValue: null }]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting job card image:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  // Parts Catalog Routes
  // GET is available to all authenticated users (for dropdown in job cards)
  app.get("/api/parts-catalog", requireAuth, async (req, res) => {
    try {
      const parts = await storage.getPartsCatalog();
      res.json(parts);
    } catch (error) {
      console.error("Error fetching parts catalog:", error);
      res.status(500).json({ error: "Failed to fetch parts catalog" });
    }
  });

  app.get("/api/parts-catalog/:id", requireAuth, async (req, res) => {
    try {
      const part = await storage.getPartsCatalogItem(req.params.id);
      if (!part) {
        return res.status(404).json({ error: "Part not found" });
      }
      res.json(part);
    } catch (error) {
      console.error("Error fetching part:", error);
      res.status(500).json({ error: "Failed to fetch part" });
    }
  });

  app.post("/api/parts-catalog", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const parsed = insertPartsCatalogSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid part data", details: parsed.error.errors });
      }

      // Check if part number already exists
      const existing = await storage.getPartByNumber(parsed.data.partNumber);
      if (existing) {
        return res.status(409).json({ error: "Part number already exists" });
      }

      const part = await storage.createPartsCatalogItem(parsed.data);
      res.status(201).json(part);
    } catch (error) {
      console.error("Error creating part:", error);
      res.status(500).json({ error: "Failed to create part" });
    }
  });

  app.patch("/api/parts-catalog/:id", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const parsed = insertPartsCatalogSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid part data", details: parsed.error.errors });
      }

      // If updating part number, check for conflicts
      if (parsed.data.partNumber) {
        const existing = await storage.getPartByNumber(parsed.data.partNumber);
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ error: "Part number already exists" });
        }
      }

      const part = await storage.updatePartsCatalogItem(req.params.id, parsed.data);
      if (!part) {
        return res.status(404).json({ error: "Part not found" });
      }

      res.json(part);
    } catch (error) {
      console.error("Error updating part:", error);
      res.status(500).json({ error: "Failed to update part" });
    }
  });

  app.delete("/api/parts-catalog/:id", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const success = await storage.deletePartsCatalogItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Part not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting part:", error);
      res.status(500).json({ error: "Failed to delete part" });
    }
  });

  app.get("/api/statistics", requireAuth, async (req, res) => {
    try {
      const role = getRoleFromSession(req) || "Job Card";
      const date = req.query.date as string | undefined;
      const stats = await storage.getStatistics(date);
      
      if (!canViewRevenue(role)) {
        const { revenue, ...sanitized } = stats;
        return res.json(sanitized);
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  app.get("/api/statistics/by-category", requireAuth, async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const categoryStats = await storage.getStatisticsByCategory(date);
      res.json(categoryStats);
    } catch (error) {
      console.error("Error fetching statistics by category:", error);
      res.status(500).json({ error: "Failed to fetch statistics by category" });
    }
  });

  // Job Cards Report by Date Range
  app.get("/api/reports/job-cards", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const fromDate = req.query.from as string;
      const toDate = req.query.to as string;
      
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: "Both 'from' and 'to' dates are required" });
      }
      
      const jobCards = await storage.getJobCardsByDateRange(fromDate, toDate);
      res.json(jobCards);
    } catch (error) {
      console.error("Error fetching job cards report:", error);
      res.status(500).json({ error: "Failed to fetch job cards report" });
    }
  });

  // Export Job Cards Report as CSV
  app.get("/api/reports/job-cards.csv", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const fromDate = req.query.from as string;
      const toDate = req.query.to as string;
      
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: "Both 'from' and 'to' dates are required" });
      }
      
      const jobCards = await storage.getJobCardsByDateRange(fromDate, toDate);
      
      const csvHeader = "Job ID,Tag No,Date,Customer Name,Phone,Bike Model,Registration,Odometer,Service Type,Status,Bay,Technician,Cost,Parts Total,Total,Customer Requests,Repair Details\n";
      const csvRows = jobCards.map((job: JobCard) => {
        const partsTotal = job.partsTotal || 0;
        const total = (job.cost || 0) + partsTotal;
        const createdDate = new Date(job.createdAt).toLocaleDateString('en-GB');
        const customerRequests = (job.customerRequests || []).join('; ');
        const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
        
        return [
          job.id,
          job.tagNo || '',
          createdDate,
          escapeCsv(job.customerName),
          job.phone,
          job.bikeModel,
          job.registration,
          job.odometer || 0,
          escapeCsv(job.serviceType),
          job.status,
          job.bay || '',
          job.assignedTo || '',
          job.cost || 0,
          partsTotal,
          total,
          escapeCsv(customerRequests),
          escapeCsv(job.repairDetails || '')
        ].join(',');
      }).join('\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="job-cards-report-${fromDate}-to-${toDate}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting job cards CSV:", error);
      res.status(500).json({ error: "Failed to export job cards report" });
    }
  });

  // Export Job Cards Report as PDF
  app.get("/api/reports/job-cards.pdf", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const fromDate = req.query.from as string;
      const toDate = req.query.to as string;
      
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: "Both 'from' and 'to' dates are required" });
      }
      
      const jobCards = await storage.getJobCardsByDateRange(fromDate, toDate);
      
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="job-cards-report-${fromDate}-to-${toDate}.pdf"`);
      
      doc.pipe(res);
      
      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('Ratnam Service Station', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text('Job Cards Report', { align: 'center' });
      doc.fontSize(10).text(`Date Range: ${new Date(fromDate).toLocaleDateString('en-GB')} to ${new Date(toDate).toLocaleDateString('en-GB')}`, { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}`, { align: 'center' });
      doc.moveDown();
      
      // Summary
      const totalJobs = jobCards.length;
      const completedJobs = jobCards.filter((j: JobCard) => j.status === 'Completed' || j.status === 'Delivered').length;
      const totalRevenue = jobCards.reduce((sum: number, j: JobCard) => sum + (j.cost || 0) + (j.partsTotal || 0), 0);
      
      doc.fontSize(10).font('Helvetica-Bold').text(`Summary: ${totalJobs} Jobs | ${completedJobs} Completed | Total Revenue: Rs. ${totalRevenue.toLocaleString()}`);
      doc.moveDown();
      
      // Table Header
      const tableTop = doc.y;
      const colWidths = [50, 25, 55, 100, 70, 60, 55, 50, 50, 50, 70];
      const headers = ['Job ID', 'Tag', 'Date', 'Customer', 'Bike Model', 'Reg No', 'Status', 'Bay', 'Cost', 'Parts', 'Total'];
      
      let xPos = 30;
      doc.fontSize(8).font('Helvetica-Bold');
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });
      
      doc.moveTo(30, tableTop + 12).lineTo(780, tableTop + 12).stroke();
      
      // Table Rows
      let yPos = tableTop + 16;
      doc.font('Helvetica').fontSize(7);
      
      for (const job of jobCards) {
        if (yPos > 550) {
          doc.addPage();
          yPos = 30;
        }
        
        const partsTotal = job.partsTotal || 0;
        const total = (job.cost || 0) + partsTotal;
        const createdDate = new Date(job.createdAt).toLocaleDateString('en-GB');
        
        xPos = 30;
        const rowData = [
          job.id,
          job.tagNo || '-',
          createdDate,
          job.customerName.substring(0, 18),
          job.bikeModel.substring(0, 12),
          job.registration,
          job.status,
          (job.bay || '-').substring(0, 8),
          `Rs.${(job.cost || 0).toLocaleString()}`,
          `Rs.${partsTotal.toLocaleString()}`,
          `Rs.${total.toLocaleString()}`
        ];
        
        rowData.forEach((data, i) => {
          doc.text(String(data), xPos, yPos, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });
        
        yPos += 12;
      }
      
      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').text(`Total Records: ${totalJobs}`, { align: 'right' });
      
      doc.end();
    } catch (error) {
      console.error("Error exporting job cards PDF:", error);
      res.status(500).json({ error: "Failed to export job cards report" });
    }
  });

  app.get("/api/bays/status", requireAuth, async (req, res) => {
    try {
      const bayStatus = await storage.getBayStatus();
      res.json(bayStatus);
    } catch (error) {
      console.error("Error fetching bay status:", error);
      res.status(500).json({ error: "Failed to fetch bay status" });
    }
  });

  app.get("/api/staff", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const staff = await storage.getStaff();
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  app.get("/api/staff/technical", requireAuth, async (req, res) => {
    try {
      const staff = await storage.getTechnicalStaff();
      res.json(staff);
    } catch (error) {
      console.error("Error fetching technical staff:", error);
      res.status(500).json({ error: "Failed to fetch technical staff" });
    }
  });

  app.get("/api/staff/by-skill/:skill", requireAuth, async (req, res) => {
    try {
      const skill = req.params.skill as "Mechanic" | "Service";
      if (!WORK_SKILLS.includes(skill)) {
        return res.status(400).json({ error: "Invalid work skill" });
      }
      const staff = await storage.getStaffByWorkSkill(skill);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff by skill:", error);
      res.status(500).json({ error: "Failed to fetch staff by skill" });
    }
  });

  app.get("/api/staff/:id", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const staff = await storage.getStaffMember(req.params.id);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff member:", error);
      res.status(500).json({ error: "Failed to fetch staff member" });
    }
  });

  app.post("/api/staff", requireRole("Admin"), async (req, res) => {
    try {
      const parsed = insertStaffSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const staff = await storage.createStaff(parsed.data);
      res.status(201).json(staff);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(500).json({ error: "Failed to create staff member" });
    }
  });

  app.patch("/api/staff/:id", requireRole("Admin"), async (req, res) => {
    try {
      const staff = await storage.updateStaff(req.params.id, req.body);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staff);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ error: "Failed to update staff member" });
    }
  });

  app.delete("/api/staff/:id", requireRole("Admin"), async (req, res) => {
    try {
      const deleted = await storage.deleteStaff(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(500).json({ error: "Failed to delete staff member" });
    }
  });

  app.get("/api/attendance", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const attendance = await storage.getAttendance(date);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.get("/api/attendance/today", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const attendance = await storage.getTodayAttendance();
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      res.status(500).json({ error: "Failed to fetch today's attendance" });
    }
  });

  app.post("/api/attendance", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const parsed = insertAttendanceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const attendance = await storage.createAttendance(parsed.data);
      res.status(201).json(attendance);
    } catch (error) {
      console.error("Error creating attendance:", error);
      res.status(500).json({ error: "Failed to create attendance record" });
    }
  });

  app.patch("/api/attendance/:id", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const role = getRoleFromSession(req) || "Job Card";
      
      const record = await storage.getAttendanceRecord(req.params.id);
      
      if (!record) {
        return res.status(404).json({ error: "Attendance record not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      const isHistorical = record.date !== today;

      if (isHistorical && role !== "Admin") {
        return res.status(403).json({ error: "Only Admin can modify previous day attendance" });
      }

      const parsed = updateAttendanceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }

      const updated = await storage.updateAttendance(req.params.id, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ error: "Failed to update attendance record" });
    }
  });

  app.get("/api/roles", requireAuth, (req, res) => {
    res.json(USER_ROLES);
  });

  app.get("/api/work-skills", requireAuth, (req, res) => {
    res.json(WORK_SKILLS);
  });

  // Loyalty Program Routes
  app.get("/api/loyalty/customers", requireAuth, async (req, res) => {
    try {
      const customers = await storage.getLoyaltyCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching loyalty customers:", error);
      res.status(500).json({ error: "Failed to fetch loyalty customers" });
    }
  });

  app.get("/api/loyalty/customers/:id", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getLoyaltyCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching loyalty customer:", error);
      res.status(500).json({ error: "Failed to fetch loyalty customer" });
    }
  });

  app.get("/api/loyalty/customers/phone/:phone", requireAuth, async (req, res) => {
    try {
      const customer = await storage.getLoyaltyCustomerByPhone(req.params.phone);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching loyalty customer by phone:", error);
      res.status(500).json({ error: "Failed to fetch loyalty customer" });
    }
  });

  app.post("/api/loyalty/customers", requireAuth, async (req, res) => {
    try {
      const parsed = insertLoyaltyCustomerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      
      const existing = await storage.getLoyaltyCustomerByPhone(parsed.data.phone);
      if (existing) {
        return res.status(409).json({ error: "Customer with this phone already exists" });
      }
      
      const customer = await storage.createLoyaltyCustomer(parsed.data);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating loyalty customer:", error);
      res.status(500).json({ error: "Failed to create loyalty customer" });
    }
  });

  app.patch("/api/loyalty/customers/:id", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const parsed = insertLoyaltyCustomerSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const customer = await storage.updateLoyaltyCustomer(req.params.id, parsed.data);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating loyalty customer:", error);
      res.status(500).json({ error: "Failed to update loyalty customer" });
    }
  });

  app.delete("/api/loyalty/customers/:id", requireRole("Admin"), async (req, res) => {
    try {
      const success = await storage.deleteLoyaltyCustomer(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting loyalty customer:", error);
      res.status(500).json({ error: "Failed to delete loyalty customer" });
    }
  });

  app.get("/api/loyalty/customers/:id/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getPointsTransactions(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching points transactions:", error);
      res.status(500).json({ error: "Failed to fetch points transactions" });
    }
  });

  app.post("/api/loyalty/customers/:id/earn", requireAuth, async (req, res) => {
    try {
      const { amount, description, jobCardId } = req.body;
      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }
      const transaction = await storage.earnPoints(req.params.id, amount, description || "Service completed", jobCardId);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error earning points:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to earn points" });
    }
  });

  app.post("/api/loyalty/customers/:id/redeem", requireAuth, async (req, res) => {
    try {
      const { rewardId } = req.body;
      if (!rewardId) {
        return res.status(400).json({ error: "Reward ID is required" });
      }
      const reward = await storage.getReward(rewardId);
      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }
      const result = await storage.redeemPoints(req.params.id, reward.pointsCost, rewardId, reward.name);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error redeeming points:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to redeem points" });
    }
  });

  app.get("/api/loyalty/rewards", requireAuth, async (req, res) => {
    try {
      const rewards = await storage.getRewards();
      res.json(rewards);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  app.get("/api/loyalty/rewards/:id", requireAuth, async (req, res) => {
    try {
      const reward = await storage.getReward(req.params.id);
      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }
      res.json(reward);
    } catch (error) {
      console.error("Error fetching reward:", error);
      res.status(500).json({ error: "Failed to fetch reward" });
    }
  });

  app.post("/api/loyalty/rewards", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const parsed = insertRewardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const reward = await storage.createReward(parsed.data);
      res.status(201).json(reward);
    } catch (error) {
      console.error("Error creating reward:", error);
      res.status(500).json({ error: "Failed to create reward" });
    }
  });

  app.patch("/api/loyalty/rewards/:id", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const parsed = insertRewardSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const reward = await storage.updateReward(req.params.id, parsed.data);
      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }
      res.json(reward);
    } catch (error) {
      console.error("Error updating reward:", error);
      res.status(500).json({ error: "Failed to update reward" });
    }
  });

  app.delete("/api/loyalty/rewards/:id", requireRole("Admin"), async (req, res) => {
    try {
      const success = await storage.deleteReward(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Reward not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting reward:", error);
      res.status(500).json({ error: "Failed to delete reward" });
    }
  });

  app.get("/api/loyalty/redemptions", requireAuth, async (req, res) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const redemptions = await storage.getRedemptions(customerId);
      res.json(redemptions);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      res.status(500).json({ error: "Failed to fetch redemptions" });
    }
  });

  app.patch("/api/loyalty/redemptions/:id/status", requireRole("Admin", "Manager"), async (req, res) => {
    try {
      const { status } = req.body;
      if (!["Pending", "Fulfilled", "Cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const redemption = await storage.updateRedemptionStatus(req.params.id, status);
      if (!redemption) {
        return res.status(404).json({ error: "Redemption not found" });
      }
      res.json(redemption);
    } catch (error) {
      console.error("Error updating redemption status:", error);
      res.status(500).json({ error: "Failed to update redemption status" });
    }
  });

  return httpServer;
}
