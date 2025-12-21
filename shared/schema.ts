import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("Job Card"),
  staffId: text("staffId"),
  name: text("name").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  staffId: true,
  name: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

export const SERVICE_TYPES = ["Regular Service", "Repair", "Premium Service"] as const;
export const JOB_STATUSES = ["Pending", "In Progress", "Quality Check", "Completed"] as const;
export const BAYS = ["Bay 1", "Bay 2", "Bay 3", "Bay 4", "Bay 5", "Wash Bay"] as const;
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

export const USER_ROLES = ["Admin", "Manager", "Job Card", "Technician", "Service"] as const;
export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Leave"] as const;

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

export const staffSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const insertStaffSchema = staffSchema.omit({ id: true, createdAt: true });

export type Staff = z.infer<typeof staffSchema>;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export const attendanceSchema = z.object({
  id: z.string(),
  staffId: z.string(),
  staffName: z.string(),
  date: z.string(),
  status: z.enum(ATTENDANCE_STATUSES),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const insertAttendanceSchema = z.object({
  staffId: z.string(),
  date: z.string(),
  status: z.enum(ATTENDANCE_STATUSES),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAttendanceSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  notes: z.string().optional(),
});

export type Attendance = z.infer<typeof attendanceSchema>;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type UpdateAttendance = z.infer<typeof updateAttendanceSchema>;

export const technicianSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  specialization: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const insertTechnicianSchema = technicianSchema.omit({ id: true, createdAt: true });

export type Technician = z.infer<typeof technicianSchema>;
export type InsertTechnician = z.infer<typeof insertTechnicianSchema>;
