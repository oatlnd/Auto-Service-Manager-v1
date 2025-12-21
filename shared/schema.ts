import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const SERVICE_TYPES = ["Regular Service", "Repair", "Premium Service"] as const;
export const JOB_STATUSES = ["Pending", "In Progress", "Quality Check", "Completed"] as const;
export const BAYS = ["Bay 1", "Bay 2", "Bay 3", "Bay 4", "Bay 5"] as const;
export const TECHNICIANS = ["Technician 1", "Technician 2", "Technician 3", "Technician 4", "Senior Technician"] as const;

export const HONDA_MODELS = [
  "CB350",
  "CB350RS",
  "H'ness CB350",
  "CB500X",
  "Shine",
  "Shine 100",
  "SP 125",
  "SP 160",
  "Unicorn",
  "Hornet 2.0",
  "X-Blade",
  "Livo",
  "Dream",
  "CD 110 Dream",
  "Activa 6G",
  "Activa 125",
  "Dio",
  "Grazia",
] as const;

export const jobCardSchema = z.object({
  id: z.string(),
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  bikeModel: z.enum(HONDA_MODELS),
  registration: z.string().min(1, "Registration number is required"),
  odometer: z.number().min(0, "Odometer reading must be positive"),
  serviceType: z.enum(SERVICE_TYPES),
  status: z.enum(JOB_STATUSES),
  assignedTo: z.enum(TECHNICIANS),
  bay: z.enum(BAYS),
  estimatedTime: z.string(),
  cost: z.number().min(0, "Cost must be positive"),
  repairDetails: z.string().optional(),
  advancePayment: z.number(),
  remainingPayment: z.number(),
  paymentStatus: z.enum(["Paid in Full", "Advance Paid"]),
  createdAt: z.string(),
});

export const insertJobCardSchema = jobCardSchema.omit({ id: true, advancePayment: true, remainingPayment: true, paymentStatus: true, createdAt: true });

export type JobCard = z.infer<typeof jobCardSchema>;
export type InsertJobCard = z.infer<typeof insertJobCardSchema>;

export interface DailyStatistics {
  today: number;
  completed: number;
  inProgress: number;
  pending: number;
  revenue: number;
}

export interface BayStatus {
  bay: typeof BAYS[number];
  isOccupied: boolean;
  jobCard?: JobCard;
}
