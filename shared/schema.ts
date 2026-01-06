import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("Job Card"),
  staffId: text("staff_id"),
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

// Staff table
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  role: text("role").notNull(),
  workSkills: text("work_skills").array().default(sql`ARRAY[]::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStaffDbSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });
export type InsertStaffDb = z.infer<typeof insertStaffDbSchema>;

// Attendance table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull(),
  staffName: text("staff_name").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull(),
  checkInTime: text("check_in_time"),
  checkOutTime: text("check_out_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertAttendanceDbSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true, updatedAt: true });

// Job Cards table
export const jobCards = pgTable("job_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tagNo: text("tag_no"),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  bikeModel: text("bike_model").notNull(),
  registration: text("registration").notNull(),
  odometer: integer("odometer").notNull(),
  serviceType: text("service_type").notNull(),
  customerRequests: text("customer_requests").array().default(sql`ARRAY[]::text[]`),
  status: text("status").notNull().default("Pending"),
  assignedTo: text("assigned_to"),
  bay: text("bay"),
  estimatedTime: text("estimated_time").notNull(),
  cost: integer("cost").notNull().default(0),
  repairDetails: text("repair_details"),
  parts: json("parts").$type<Array<{ partNumber?: string; name: string; date: string; amount: number }>>().default([]),
  partsTotal: integer("parts_total").default(0),
  nextServiceDate: text("next_service_date"),
  nextServiceKm: integer("next_service_km"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobCardDbSchema = createInsertSchema(jobCards).omit({ id: true, createdAt: true });

// Job Card Audit Logs table
export const jobCardAuditLogs = pgTable("job_card_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobCardId: varchar("job_card_id").notNull(),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  changes: json("changes").$type<Array<{ field: string; oldValue: any; newValue: any }>>().default([]),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

// Job Card Images table
export const jobCardImages = pgTable("job_card_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobCardId: varchar("job_card_id").notNull(),
  objectPath: text("object_path").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedByName: text("uploaded_by_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobCardImageDbSchema = createInsertSchema(jobCardImages).omit({ id: true, createdAt: true });

// Parts Catalog table
export const partsCatalog = pgTable("parts_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partNumber: text("part_number").notNull().unique(),
  name: text("name").notNull(),
  price: integer("price").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPartsCatalogDbSchema = createInsertSchema(partsCatalog).omit({ id: true, createdAt: true });

// Loyalty Customers table
export const loyaltyCustomers = pgTable("loyalty_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  vehicleNumbers: text("vehicle_numbers").array().default(sql`ARRAY[]::text[]`),
  totalPoints: integer("total_points").notNull().default(0),
  availablePoints: integer("available_points").notNull().default(0),
  tier: text("tier").notNull().default("Bronze"),
  totalSpent: integer("total_spent").notNull().default(0),
  visitCount: integer("visit_count").notNull().default(0),
  lastVisit: timestamp("last_visit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoyaltyCustomerDbSchema = createInsertSchema(loyaltyCustomers).omit({
  id: true,
  totalPoints: true,
  availablePoints: true,
  tier: true,
  totalSpent: true,
  visitCount: true,
  lastVisit: true,
  createdAt: true,
});

// Points Transactions table
export const pointsTransactions = pgTable("points_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  jobCardId: varchar("job_card_id"),
  rewardId: varchar("reward_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPointsTransactionDbSchema = createInsertSchema(pointsTransactions).omit({ id: true, createdAt: true });

// Rewards table
export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointsCost: integer("points_cost").notNull(),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  stock: integer("stock"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRewardDbSchema = createInsertSchema(rewards).omit({ id: true, createdAt: true });

// Redemptions table
export const redemptions = pgTable("redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  rewardId: varchar("reward_id").notNull(),
  rewardName: text("reward_name").notNull(),
  pointsUsed: integer("points_used").notNull(),
  status: text("status").notNull().default("Pending"),
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRedemptionDbSchema = createInsertSchema(redemptions).omit({ id: true, fulfilledAt: true, createdAt: true });

// System Logs table
export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: text("level").notNull(),
  source: text("source").notNull(),
  message: text("message").notNull(),
  endpoint: text("endpoint"),
  method: text("method"),
  userId: text("user_id"),
  userName: text("user_name"),
  statusCode: integer("status_code"),
  context: json("context").$type<Record<string, any>>(),
  stack: text("stack"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSystemLogDbSchema = createInsertSchema(systemLogs).omit({ id: true, createdAt: true });

// Sessions table
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Constants
export const SERVICE_CATEGORIES = ["Paid Service", "Repair", "Company Free Service"] as const;

export const SERVICE_TYPES = [
  "Service with Oil Spray (Oil Change)",
  "Oil Spray",
  "Service with Oil Spray",
  "Water Wash",
  "Service Only",
  "Oil Change Charge",
  "Engine Work",
  "Waste Oil",
  "Mechanic Service",
  "Repair",
  "2nd Free Service",
  "1st Free Service",
] as const;

export const SERVICE_TYPE_DETAILS: Record<typeof SERVICE_TYPES[number], { category: typeof SERVICE_CATEGORIES[number]; price: number }> = {
  "Service with Oil Spray (Oil Change)": { category: "Paid Service", price: 1000 },
  "Oil Spray": { category: "Paid Service", price: 200 },
  "Service with Oil Spray": { category: "Paid Service", price: 900 },
  "Water Wash": { category: "Paid Service", price: 400 },
  "Service Only": { category: "Paid Service", price: 700 },
  "Oil Change Charge": { category: "Repair", price: 0 },
  "Engine Work": { category: "Repair", price: 0 },
  "Waste Oil": { category: "Repair", price: 0 },
  "Mechanic Service": { category: "Repair", price: 0 },
  "Repair": { category: "Repair", price: 0 },
  "2nd Free Service": { category: "Company Free Service", price: 550 },
  "1st Free Service": { category: "Company Free Service", price: 550 },
};

export const JOB_STATUSES = ["Pending", "In Progress", "Oil Change", "Quality Check", "Completed", "Delivered"] as const;
export const SERVICE_STATUSES = ["Pending", "In Progress", "Oil Change", "Quality Check", "Completed", "Delivered"] as const;
export const REPAIR_STATUSES = ["Pending", "In Progress", "Quality Check", "Completed", "Delivered"] as const;

export function getStatusesForCategory(category: typeof SERVICE_CATEGORIES[number]): readonly string[] {
  if (category === "Repair") {
    return REPAIR_STATUSES;
  }
  return SERVICE_STATUSES;
}

export const BAYS = ["Wash Bay 1", "Wash Bay 2", "Sudershan", "Jayakandan", "Dharshan", "Vijandran", "Pradeepan", "Aya"] as const;
export const WASH_BAYS = ["Wash Bay 1", "Wash Bay 2"] as const;
export const TECHNICIAN_BAYS = ["Sudershan", "Jayakandan", "Dharshan", "Vijandran", "Pradeepan", "Aya"] as const;

export const BIKE_MODELS = [
  "Activa 125",
  "Activa 6G",
  "Bajaj",
  "CB350",
  "CB350RS",
  "CB500X",
  "CD 110 Dream",
  "Dio",
  "Dream",
  "Grazia",
  "H'ness CB350",
  "Hero",
  "Hornet 2.0",
  "Livo",
  "Other",
  "Shine",
  "Shine 100",
  "SP 125",
  "SP 160",
  "Suzuki",
  "TVS",
  "Unicorn",
  "X-Blade",
  "Yamaha",
] as const;

export const USER_ROLES = ["Admin", "Manager", "Job Card", "Technician", "Service", "Cashier"] as const;
export const WORK_SKILLS = ["Mechanic", "Service"] as const;
export const ATTENDANCE_STATUSES = ["Present", "Absent", "Late", "Leave"] as const;

export type WorkSkill = typeof WORK_SKILLS[number];

export const CUSTOMER_REQUESTS = [
  "Engine Oil Change",
  "Washing",
  "Air Cleaner",
  "Spark Plug",
  "Battery",
  "Drive Belt",
  "Brack Front/Rear",
  "Cable",
  "Carburetor",
  "Cup Set",
  "Suspension Front/Rear"
] as const;

// Zod schemas for validation (used by frontend and API)
export const jobCardSchema = z.object({
  id: z.string(),
  tagNo: z.string().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  bikeModel: z.enum(BIKE_MODELS),
  registration: z.string().min(1, "Registration number is required"),
  odometer: z.number().min(0, "Odometer reading must be positive"),
  serviceType: z.enum(SERVICE_TYPES),
  customerRequests: z.array(z.string()).optional().nullable(),
  status: z.enum(JOB_STATUSES),
  assignedTo: z.string().optional().nullable(),
  bay: z.enum(BAYS).optional().nullable(),
  estimatedTime: z.string(),
  cost: z.number().min(0, "Cost must be positive"),
  repairDetails: z.string().optional().nullable(),
  parts: z.array(z.object({
    partNumber: z.string().optional(),
    name: z.string(),
    date: z.string(),
    amount: z.number(),
  })).optional().nullable(),
  partsTotal: z.number().optional().nullable(),
  nextServiceDate: z.string().optional().nullable(),
  nextServiceKm: z.number().optional().nullable(),
  createdAt: z.string(),
});

export const insertJobCardSchema = jobCardSchema.omit({ id: true, createdAt: true });

export type JobCard = z.infer<typeof jobCardSchema>;
export type InsertJobCard = z.infer<typeof insertJobCardSchema>;

export const jobCardAuditLogSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.enum(["created", "updated", "status_changed", "assignment_changed", "parts_updated", "printed", "image_added", "image_deleted"]),
  changes: z.array(z.object({
    field: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
  })),
  changedAt: z.string(),
});

export type JobCardAuditLog = z.infer<typeof jobCardAuditLogSchema>;

export const jobCardImageSchema = z.object({
  id: z.string(),
  jobCardId: z.string(),
  objectPath: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  uploadedBy: z.string(),
  uploadedByName: z.string(),
  createdAt: z.string(),
});

export const insertJobCardImageSchema = jobCardImageSchema.omit({ id: true, createdAt: true });

export type JobCardImage = z.infer<typeof jobCardImageSchema>;
export type InsertJobCardImage = z.infer<typeof insertJobCardImageSchema>;

export const partsCatalogSchema = z.object({
  id: z.string(),
  partNumber: z.string().min(1, "Part number is required"),
  name: z.string().min(1, "Part name is required"),
  price: z.number().min(0, "Price must be positive"),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
});

export const insertPartsCatalogSchema = partsCatalogSchema.omit({ id: true, createdAt: true });

export type PartsCatalog = z.infer<typeof partsCatalogSchema>;
export type InsertPartsCatalog = z.infer<typeof insertPartsCatalogSchema>;

export interface CategoryBreakdown {
  paidService: number;
  freeService: number;
  repair: number;
}

export interface DailyStatistics {
  today: number;
  todayByCategory: CategoryBreakdown;
  completed: number;
  completedByCategory: CategoryBreakdown;
  inProgress: number;
  inProgressByCategory: CategoryBreakdown;
  pending: number;
  pendingByCategory: CategoryBreakdown;
  oilChange: number;
  oilChangeByCategory: CategoryBreakdown;
  qualityCheck: number;
  qualityCheckByCategory: CategoryBreakdown;
  delivered: number;
  deliveredByCategory: CategoryBreakdown;
  revenue: number;
}

export interface ServiceCategoryStats {
  category: typeof SERVICE_CATEGORIES[number];
  total: number;
  completed: number;
  inProgress: number;
}

export interface BayStatus {
  bay: typeof BAYS[number];
  isOccupied: boolean;
  jobCard?: JobCard;
  jobCards?: JobCard[];
}

export const staffSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  role: z.enum(USER_ROLES),
  workSkills: z.array(z.enum(WORK_SKILLS)).default([]),
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
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional().nullable(),
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

// Loyalty Program
export const LOYALTY_TIERS = ["Bronze", "Silver", "Gold", "Platinum"] as const;
export const POINTS_TRANSACTION_TYPES = ["Earned", "Redeemed", "Expired", "Adjusted"] as const;

export const LOYALTY_TIER_THRESHOLDS = {
  Bronze: 0,
  Silver: 500,
  Gold: 1500,
  Platinum: 3000,
} as const;

export const LOYALTY_TIER_MULTIPLIERS = {
  Bronze: 1,
  Silver: 1.25,
  Gold: 1.5,
  Platinum: 2,
} as const;

export const POINTS_PER_100_LKR = 1;

export const loyaltyCustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  vehicleNumbers: z.array(z.string()).optional().nullable(),
  totalPoints: z.number().default(0),
  availablePoints: z.number().default(0),
  tier: z.enum(LOYALTY_TIERS).default("Bronze"),
  totalSpent: z.number().default(0),
  visitCount: z.number().default(0),
  lastVisit: z.string().optional().nullable(),
  createdAt: z.string(),
});

export const insertLoyaltyCustomerSchema = loyaltyCustomerSchema.omit({ 
  id: true, 
  totalPoints: true, 
  availablePoints: true, 
  tier: true, 
  totalSpent: true, 
  visitCount: true, 
  lastVisit: true,
  createdAt: true 
});

export type LoyaltyCustomer = z.infer<typeof loyaltyCustomerSchema>;
export type InsertLoyaltyCustomer = z.infer<typeof insertLoyaltyCustomerSchema>;

export const pointsTransactionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  type: z.enum(POINTS_TRANSACTION_TYPES),
  points: z.number(),
  description: z.string(),
  jobCardId: z.string().optional().nullable(),
  rewardId: z.string().optional().nullable(),
  createdAt: z.string(),
});

export const insertPointsTransactionSchema = pointsTransactionSchema.omit({ id: true, createdAt: true });

export type PointsTransaction = z.infer<typeof pointsTransactionSchema>;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;

export const rewardSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Reward name is required"),
  description: z.string(),
  pointsCost: z.number().min(1, "Points cost must be at least 1"),
  category: z.enum(["Discount", "Free Service", "Merchandise", "Special"]),
  isActive: z.boolean().default(true),
  stock: z.number().optional().nullable(),
  createdAt: z.string(),
});

export const insertRewardSchema = rewardSchema.omit({ id: true, createdAt: true });

export type Reward = z.infer<typeof rewardSchema>;
export type InsertReward = z.infer<typeof insertRewardSchema>;

export const redemptionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  rewardId: z.string(),
  rewardName: z.string(),
  pointsUsed: z.number(),
  status: z.enum(["Pending", "Fulfilled", "Cancelled"]),
  fulfilledAt: z.string().optional().nullable(),
  createdAt: z.string(),
});

export const insertRedemptionSchema = redemptionSchema.omit({ id: true, fulfilledAt: true, createdAt: true });

export type Redemption = z.infer<typeof redemptionSchema>;
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;

// System Logs
export const LOG_LEVELS = ["info", "warn", "error"] as const;
export const LOG_SOURCES = ["api", "frontend", "system"] as const;

export const systemLogSchema = z.object({
  id: z.string(),
  level: z.enum(LOG_LEVELS),
  source: z.enum(LOG_SOURCES),
  message: z.string(),
  endpoint: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  userName: z.string().optional().nullable(),
  statusCode: z.number().optional().nullable(),
  context: z.record(z.any()).optional().nullable(),
  stack: z.string().optional().nullable(),
  createdAt: z.string(),
});

export const insertSystemLogSchema = systemLogSchema.omit({ id: true, createdAt: true });

export type SystemLog = z.infer<typeof systemLogSchema>;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
