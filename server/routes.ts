import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertJobCardSchema, JOB_STATUSES } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/job-cards", async (req, res) => {
    try {
      const jobCards = await storage.getJobCards();
      res.json(jobCards);
    } catch (error) {
      console.error("Error fetching job cards:", error);
      res.status(500).json({ error: "Failed to fetch job cards" });
    }
  });

  app.get("/api/job-cards/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const jobCards = await storage.getRecentJobCards(limit);
      res.json(jobCards);
    } catch (error) {
      console.error("Error fetching recent job cards:", error);
      res.status(500).json({ error: "Failed to fetch recent job cards" });
    }
  });

  app.get("/api/job-cards/:id", async (req, res) => {
    try {
      const jobCard = await storage.getJobCard(req.params.id);
      if (!jobCard) {
        return res.status(404).json({ error: "Job card not found" });
      }
      res.json(jobCard);
    } catch (error) {
      console.error("Error fetching job card:", error);
      res.status(500).json({ error: "Failed to fetch job card" });
    }
  });

  app.post("/api/job-cards", async (req, res) => {
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

  app.patch("/api/job-cards/:id", async (req, res) => {
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

  app.patch("/api/job-cards/:id/status", async (req, res) => {
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

  app.delete("/api/job-cards/:id", async (req, res) => {
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

  app.get("/api/statistics", async (req, res) => {
    try {
      const stats = await storage.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  app.get("/api/bays/status", async (req, res) => {
    try {
      const bayStatus = await storage.getBayStatus();
      res.json(bayStatus);
    } catch (error) {
      console.error("Error fetching bay status:", error);
      res.status(500).json({ error: "Failed to fetch bay status" });
    }
  });

  return httpServer;
}
