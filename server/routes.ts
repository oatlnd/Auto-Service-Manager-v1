import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type Session } from "./storage";
import { insertJobCardSchema, JOB_STATUSES, insertStaffSchema, insertAttendanceSchema, updateAttendanceSchema, USER_ROLES, WORK_SKILLS, loginSchema } from "@shared/schema";
import { z } from "zod";

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
      const parsed = insertJobCardSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const jobCard = await storage.createJobCard(parsed.data);
      res.status(201).json(jobCard);
    } catch (error) {
      console.error("Error creating job card:", error);
      res.status(500).json({ error: "Failed to create job card" });
    }
  });

  app.patch("/api/job-cards/:id", requireRole("Admin", "Manager", "Job Card"), async (req, res) => {
    try {
      const jobCard = await storage.updateJobCard(req.params.id, req.body);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
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
      const jobCard = await storage.updateJobCardStatus(req.params.id, parsed.data.status);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
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

  app.get("/api/statistics", requireAuth, async (req, res) => {
    try {
      const role = getRoleFromSession(req) || "Job Card";
      const stats = await storage.getStatistics();
      
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

  return httpServer;
}
