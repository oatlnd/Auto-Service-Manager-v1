import { 
  JobCard, InsertJobCard, DailyStatistics, BayStatus, ServiceCategoryStats,
  Staff, InsertStaff, Attendance, InsertAttendance, UpdateAttendance,
  User, BAYS, JOB_STATUSES, WorkSkill,
  LoyaltyCustomer, InsertLoyaltyCustomer, PointsTransaction, InsertPointsTransaction,
  Reward, InsertReward, Redemption, InsertRedemption,
  JobCardAuditLog, JobCardImage, InsertJobCardImage,
  PartsCatalog, InsertPartsCatalog,
  SystemLog, InsertSystemLog, LOG_LEVELS, LOG_SOURCES,
  SmsTemplate, InsertSmsTemplate,
  SERVICE_TYPE_DETAILS, SERVICE_CATEGORIES, LOYALTY_TIER_THRESHOLDS, LOYALTY_TIERS, LOYALTY_TIER_MULTIPLIERS, POINTS_PER_100_LKR,
  users, staff as staffTable, attendance as attendanceTable, jobCards as jobCardsTable,
  jobCardAuditLogs as auditLogsTable, jobCardImages as imagesTable, partsCatalog as partsCatalogTable,
  loyaltyCustomers as loyaltyCustomersTable, pointsTransactions as transactionsTable,
  rewards as rewardsTable, redemptions as redemptionsTable, systemLogs as systemLogsTable,
  sessions as sessionsTable, smsTemplates as smsTemplatesTable
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface Session {
  id: string;
  userId: string;
  user: Omit<User, "password">;
  expiresAt: Date;
}

export interface IStorage {
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  createSession(userId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  deleteSession(sessionId: string): Promise<boolean>;
  
  getJobCards(): Promise<JobCard[]>;
  getJobCardsByDateRange(fromDate: string, toDate: string): Promise<JobCard[]>;
  getJobCard(id: string): Promise<JobCard | undefined>;
  getRecentJobCards(limit: number): Promise<JobCard[]>;
  createJobCard(data: InsertJobCard): Promise<JobCard>;
  updateJobCard(id: string, data: Partial<InsertJobCard>): Promise<JobCard | undefined>;
  updateJobCardStatus(id: string, status: typeof JOB_STATUSES[number]): Promise<JobCard | undefined>;
  deleteJobCard(id: string): Promise<boolean>;
  getStatistics(date?: string): Promise<DailyStatistics>;
  getStatisticsByCategory(date?: string): Promise<ServiceCategoryStats[]>;
  getBayStatus(): Promise<BayStatus[]>;
  
  getStaff(): Promise<Staff[]>;
  getStaffMember(id: string): Promise<Staff | undefined>;
  createStaff(data: InsertStaff): Promise<Staff>;
  updateStaff(id: string, data: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaff(id: string): Promise<boolean>;
  
  getAttendance(date?: string): Promise<Attendance[]>;
  getAttendanceByStaff(staffId: string): Promise<Attendance[]>;
  getAttendanceRecord(id: string): Promise<Attendance | undefined>;
  createAttendance(data: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, data: UpdateAttendance): Promise<Attendance | undefined>;
  getTodayAttendance(): Promise<Attendance[]>;
  
  getStaffByWorkSkill(skill: WorkSkill): Promise<Staff[]>;
  getTechnicalStaff(): Promise<Staff[]>;
  
  getLoyaltyCustomers(): Promise<LoyaltyCustomer[]>;
  getLoyaltyCustomer(id: string): Promise<LoyaltyCustomer | undefined>;
  getLoyaltyCustomerByPhone(phone: string): Promise<LoyaltyCustomer | undefined>;
  createLoyaltyCustomer(data: InsertLoyaltyCustomer): Promise<LoyaltyCustomer>;
  updateLoyaltyCustomer(id: string, data: Partial<InsertLoyaltyCustomer>): Promise<LoyaltyCustomer | undefined>;
  deleteLoyaltyCustomer(id: string): Promise<boolean>;
  
  getPointsTransactions(customerId: string): Promise<PointsTransaction[]>;
  createPointsTransaction(data: InsertPointsTransaction): Promise<PointsTransaction>;
  earnPoints(customerId: string, amount: number, description: string, jobCardId?: string): Promise<PointsTransaction>;
  redeemPoints(customerId: string, points: number, rewardId: string, rewardName: string): Promise<{ transaction: PointsTransaction; redemption: Redemption }>;
  
  getRewards(): Promise<Reward[]>;
  getReward(id: string): Promise<Reward | undefined>;
  createReward(data: InsertReward): Promise<Reward>;
  updateReward(id: string, data: Partial<InsertReward>): Promise<Reward | undefined>;
  deleteReward(id: string): Promise<boolean>;
  
  getRedemptions(customerId?: string): Promise<Redemption[]>;
  updateRedemptionStatus(id: string, status: "Pending" | "Fulfilled" | "Cancelled"): Promise<Redemption | undefined>;
  
  createJobCardAuditLog(jobCardId: string, actorId: string, actorName: string, action: JobCardAuditLog["action"], changes: JobCardAuditLog["changes"]): Promise<JobCardAuditLog>;
  getJobCardAuditLogs(jobCardId: string): Promise<JobCardAuditLog[]>;
  
  getJobCardImages(jobCardId: string): Promise<JobCardImage[]>;
  getJobCardImage(id: string): Promise<JobCardImage | undefined>;
  createJobCardImage(data: InsertJobCardImage): Promise<JobCardImage>;
  deleteJobCardImage(id: string): Promise<boolean>;
  
  getPartsCatalog(): Promise<PartsCatalog[]>;
  getPartsCatalogItem(id: string): Promise<PartsCatalog | undefined>;
  getPartByNumber(partNumber: string): Promise<PartsCatalog | undefined>;
  createPartsCatalogItem(data: InsertPartsCatalog): Promise<PartsCatalog>;
  updatePartsCatalogItem(id: string, data: Partial<InsertPartsCatalog>): Promise<PartsCatalog | undefined>;
  deletePartsCatalogItem(id: string): Promise<boolean>;
  
  getSystemLogs(filters?: {
    level?: typeof LOG_LEVELS[number];
    source?: typeof LOG_SOURCES[number];
    fromDate?: string;
    toDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SystemLog[]; total: number }>;
  getSystemLog(id: string): Promise<SystemLog | undefined>;
  createSystemLog(data: InsertSystemLog): Promise<SystemLog>;
  deleteSystemLog(id: string): Promise<boolean>;
  clearOldLogs(daysOld: number): Promise<number>;
  
  getSmsTemplates(): Promise<SmsTemplate[]>;
  getSmsTemplate(id: string): Promise<SmsTemplate | undefined>;
  createSmsTemplate(data: InsertSmsTemplate): Promise<SmsTemplate>;
  updateSmsTemplate(id: string, data: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined>;
  deleteSmsTemplate(id: string): Promise<boolean>;
}

function toJobCard(row: any): JobCard {
  return {
    id: row.id,
    jobCode: row.jobCode,
    tagNo: row.tagNo,
    customerName: row.customerName,
    phone: row.phone,
    bikeModel: row.bikeModel,
    registration: row.registration,
    odometer: row.odometer,
    serviceType: row.serviceType,
    customerRequests: row.customerRequests || [],
    status: row.status,
    assignedTo: row.assignedTo,
    bay: row.bay,
    estimatedTime: row.estimatedTime,
    cost: row.cost,
    repairDetails: row.repairDetails,
    parts: row.parts || [],
    partsTotal: row.partsTotal || 0,
    nextServiceDate: row.nextServiceDate,
    nextServiceKm: row.nextServiceKm,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function toStaff(row: any): Staff {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    role: row.role,
    workSkills: row.workSkills || [],
    isActive: row.isActive,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function toAttendance(row: any): Attendance {
  return {
    id: row.id,
    staffId: row.staffId,
    staffName: row.staffName,
    date: row.date,
    status: row.status,
    checkInTime: row.checkInTime,
    checkOutTime: row.checkOutTime,
    notes: row.notes,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

function toLoyaltyCustomer(row: any): LoyaltyCustomer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    vehicleNumbers: row.vehicleNumbers || [],
    totalPoints: row.totalPoints,
    availablePoints: row.availablePoints,
    tier: row.tier,
    totalSpent: row.totalSpent,
    visitCount: row.visitCount,
    lastVisit: row.lastVisit instanceof Date ? row.lastVisit.toISOString() : row.lastVisit,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function toPointsTransaction(row: any): PointsTransaction {
  return {
    id: row.id,
    customerId: row.customerId,
    type: row.type,
    points: row.points,
    description: row.description,
    jobCardId: row.jobCardId,
    rewardId: row.rewardId,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function toReward(row: any): Reward {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    pointsCost: row.pointsCost,
    category: row.category,
    isActive: row.isActive,
    stock: row.stock,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function toRedemption(row: any): Redemption {
  return {
    id: row.id,
    customerId: row.customerId,
    rewardId: row.rewardId,
    rewardName: row.rewardName,
    pointsUsed: row.pointsUsed,
    status: row.status,
    fulfilledAt: row.fulfilledAt instanceof Date ? row.fulfilledAt.toISOString() : row.fulfilledAt,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function toAuditLog(row: any): JobCardAuditLog {
  return {
    id: row.id,
    jobCardId: row.jobCardId,
    actorId: row.actorId,
    actorName: row.actorName,
    action: row.action,
    changes: row.changes || [],
    changedAt: row.changedAt instanceof Date ? row.changedAt.toISOString() : row.changedAt,
  };
}

function toJobCardImage(row: any): JobCardImage {
  return {
    id: row.id,
    jobCardId: row.jobCardId,
    objectPath: row.objectPath,
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    uploadedBy: row.uploadedBy,
    uploadedByName: row.uploadedByName,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function toPartsCatalog(row: any): PartsCatalog {
  return {
    id: row.id,
    partNumber: row.partNumber,
    name: row.name,
    price: row.price,
    isActive: row.isActive,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

function toSystemLog(row: any): SystemLog {
  return {
    id: row.id,
    level: row.level,
    source: row.source,
    message: row.message,
    endpoint: row.endpoint,
    method: row.method,
    userId: row.userId,
    userName: row.userName,
    statusCode: row.statusCode,
    context: row.context,
    stack: row.stack,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

export class DatabaseStorage implements IStorage {
  private calculatePartsTotal(parts: Array<{ name: string; date: string; amount: number }> | undefined | null): number {
    if (!parts || parts.length === 0) return 0;
    return parts.reduce((sum, part) => sum + (part.amount || 0), 0);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createSession(userId: string): Promise<Session> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(sessionsTable).values({
      id: sessionId,
      userId,
      expiresAt,
    });

    const { password, ...userWithoutPassword } = user;
    return {
      id: sessionId,
      userId,
      user: userWithoutPassword,
      expiresAt,
    };
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) await this.deleteSession(sessionId);
      return undefined;
    }

    const user = await this.getUserById(session.userId);
    if (!user) return undefined;

    const { password, ...userWithoutPassword } = user;
    return {
      id: session.id,
      userId: session.userId,
      user: userWithoutPassword,
      expiresAt: new Date(session.expiresAt),
    };
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    return true;
  }

  async getJobCards(): Promise<JobCard[]> {
    const rows = await db.select().from(jobCardsTable).orderBy(desc(jobCardsTable.createdAt));
    return rows.map(toJobCard);
  }

  async getJobCardsByDateRange(fromDate: string, toDate: string): Promise<JobCard[]> {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const rows = await db.select().from(jobCardsTable)
      .where(and(
        gte(jobCardsTable.createdAt, from),
        lte(jobCardsTable.createdAt, to)
      ))
      .orderBy(desc(jobCardsTable.createdAt));
    return rows.map(toJobCard);
  }

  async getJobCard(id: string): Promise<JobCard | undefined> {
    const [row] = await db.select().from(jobCardsTable).where(eq(jobCardsTable.id, id));
    return row ? toJobCard(row) : undefined;
  }

  async getRecentJobCards(limit: number): Promise<JobCard[]> {
    const rows = await db.select().from(jobCardsTable).orderBy(desc(jobCardsTable.createdAt)).limit(limit);
    return rows.map(toJobCard);
  }

  async createJobCard(data: InsertJobCard): Promise<JobCard> {
    const parts = data.parts || [];
    const partsTotal = this.calculatePartsTotal(parts);
    
    // Generate next job code (JB1000, JB1001, etc.)
    const [maxResult] = await db.select({ 
      maxCode: sql<string>`MAX(job_code)` 
    }).from(jobCardsTable);
    
    let nextNumber = 1000; // Starting number
    if (maxResult?.maxCode) {
      const currentNumber = parseInt(maxResult.maxCode.replace('JB', ''), 10);
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }
    const jobCode = `JB${nextNumber}`;
    
    const [row] = await db.insert(jobCardsTable).values({
      jobCode,
      tagNo: data.tagNo,
      customerName: data.customerName,
      phone: data.phone,
      bikeModel: data.bikeModel,
      registration: data.registration,
      odometer: data.odometer,
      serviceType: data.serviceType,
      customerRequests: data.customerRequests || [],
      status: data.status,
      assignedTo: data.assignedTo,
      bay: data.bay,
      estimatedTime: data.estimatedTime,
      cost: data.cost,
      repairDetails: data.repairDetails,
      parts,
      partsTotal,
      nextServiceDate: data.nextServiceDate,
      nextServiceKm: data.nextServiceKm,
    }).returning();
    
    return toJobCard(row);
  }

  async updateJobCard(id: string, data: Partial<InsertJobCard>): Promise<JobCard | undefined> {
    const existing = await this.getJobCard(id);
    if (!existing) return undefined;

    const parts = data.parts !== undefined ? data.parts : existing.parts;
    const partsTotal = this.calculatePartsTotal(parts);

    const [row] = await db.update(jobCardsTable)
      .set({
        ...data,
        parts,
        partsTotal,
      })
      .where(eq(jobCardsTable.id, id))
      .returning();

    return row ? toJobCard(row) : undefined;
  }

  async updateJobCardStatus(id: string, status: typeof JOB_STATUSES[number]): Promise<JobCard | undefined> {
    const [row] = await db.update(jobCardsTable)
      .set({ status })
      .where(eq(jobCardsTable.id, id))
      .returning();
    return row ? toJobCard(row) : undefined;
  }

  async deleteJobCard(id: string): Promise<boolean> {
    await db.delete(jobCardsTable).where(eq(jobCardsTable.id, id));
    return true;
  }

  async getStatistics(date?: string): Promise<DailyStatistics> {
    const jobs = await this.getJobCards();
    const targetDate = date ? new Date(date).toDateString() : new Date().toDateString();
    
    const dateJobs = jobs.filter(
      (job) => new Date(job.createdAt).toDateString() === targetDate
    );

    const getCategoryBreakdown = (filteredJobs: JobCard[]) => ({
      paidService: filteredJobs.filter(job => SERVICE_TYPE_DETAILS[job.serviceType as keyof typeof SERVICE_TYPE_DETAILS]?.category === "Paid Service").length,
      freeService: filteredJobs.filter(job => SERVICE_TYPE_DETAILS[job.serviceType as keyof typeof SERVICE_TYPE_DETAILS]?.category === "Company Free Service").length,
      repair: filteredJobs.filter(job => SERVICE_TYPE_DETAILS[job.serviceType as keyof typeof SERVICE_TYPE_DETAILS]?.category === "Repair").length,
    });

    const pendingJobs = dateJobs.filter((job) => job.status === "Pending");
    const inProgressJobs = dateJobs.filter((job) => job.status === "In Progress");
    const oilChangeJobs = dateJobs.filter((job) => job.status === "Oil Change");
    const qualityCheckJobs = dateJobs.filter((job) => job.status === "Quality Check");
    const completedJobs = dateJobs.filter((job) => job.status === "Completed");
    const deliveredJobs = dateJobs.filter((job) => job.status === "Delivered");
    
    const revenue = dateJobs.reduce((sum, job) => {
      const serviceCost = job.cost || 0;
      const partsTotal = job.partsTotal || 0;
      return sum + serviceCost + partsTotal;
    }, 0);

    return {
      today: dateJobs.length,
      todayByCategory: getCategoryBreakdown(dateJobs),
      completed: completedJobs.length,
      completedByCategory: getCategoryBreakdown(completedJobs),
      inProgress: inProgressJobs.length,
      inProgressByCategory: getCategoryBreakdown(inProgressJobs),
      pending: pendingJobs.length,
      pendingByCategory: getCategoryBreakdown(pendingJobs),
      oilChange: oilChangeJobs.length,
      oilChangeByCategory: getCategoryBreakdown(oilChangeJobs),
      qualityCheck: qualityCheckJobs.length,
      qualityCheckByCategory: getCategoryBreakdown(qualityCheckJobs),
      delivered: deliveredJobs.length,
      deliveredByCategory: getCategoryBreakdown(deliveredJobs),
      revenue,
    };
  }

  async getStatisticsByCategory(date?: string): Promise<ServiceCategoryStats[]> {
    const jobs = await this.getJobCards();
    const targetDate = date ? new Date(date).toDateString() : new Date().toDateString();
    
    const dateJobs = jobs.filter(
      (job) => new Date(job.createdAt).toDateString() === targetDate
    );

    return SERVICE_CATEGORIES.map((category) => {
      const categoryJobs = dateJobs.filter(
        (job) => SERVICE_TYPE_DETAILS[job.serviceType as keyof typeof SERVICE_TYPE_DETAILS]?.category === category
      );
      return {
        category,
        total: categoryJobs.length,
        completed: categoryJobs.filter((job) => job.status === "Completed" || job.status === "Delivered").length,
        inProgress: categoryJobs.filter((job) => job.status === "In Progress" || job.status === "Oil Change" || job.status === "Quality Check").length,
      };
    });
  }

  async getBayStatus(): Promise<BayStatus[]> {
    const jobs = await this.getJobCards();
    const activeJobs = jobs.filter(
      (job) => job.status !== "Completed" && job.status !== "Delivered"
    );

    return BAYS.map((bay) => {
      const bayJobs = activeJobs.filter((job) => job.bay === bay);
      return {
        bay,
        isOccupied: bayJobs.length > 0,
        jobCard: bayJobs[0],
        jobCards: bayJobs,
      };
    });
  }

  async getStaff(): Promise<Staff[]> {
    const rows = await db.select().from(staffTable).orderBy(staffTable.name);
    return rows.map(toStaff);
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    const [row] = await db.select().from(staffTable).where(eq(staffTable.id, id));
    return row ? toStaff(row) : undefined;
  }

  async createStaff(data: InsertStaff): Promise<Staff> {
    const [row] = await db.insert(staffTable).values({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      role: data.role,
      workSkills: data.workSkills || [],
      isActive: data.isActive,
    }).returning();
    return toStaff(row);
  }

  async updateStaff(id: string, data: Partial<InsertStaff>): Promise<Staff | undefined> {
    const [row] = await db.update(staffTable)
      .set(data)
      .where(eq(staffTable.id, id))
      .returning();
    return row ? toStaff(row) : undefined;
  }

  async deleteStaff(id: string): Promise<boolean> {
    await db.delete(staffTable).where(eq(staffTable.id, id));
    return true;
  }

  async getStaffByWorkSkill(skill: WorkSkill): Promise<Staff[]> {
    const allStaff = await this.getStaff();
    return allStaff.filter(s => s.isActive && s.workSkills.includes(skill));
  }

  async getTechnicalStaff(): Promise<Staff[]> {
    const allStaff = await this.getStaff();
    return allStaff.filter(s => s.isActive && s.workSkills.length > 0);
  }

  async getAttendance(date?: string): Promise<Attendance[]> {
    if (date) {
      const rows = await db.select().from(attendanceTable).where(eq(attendanceTable.date, date));
      return rows.map(toAttendance);
    }
    const rows = await db.select().from(attendanceTable).orderBy(desc(attendanceTable.createdAt));
    return rows.map(toAttendance);
  }

  async getAttendanceByStaff(staffId: string): Promise<Attendance[]> {
    const rows = await db.select().from(attendanceTable)
      .where(eq(attendanceTable.staffId, staffId))
      .orderBy(desc(attendanceTable.date));
    return rows.map(toAttendance);
  }

  async getAttendanceRecord(id: string): Promise<Attendance | undefined> {
    const [row] = await db.select().from(attendanceTable).where(eq(attendanceTable.id, id));
    return row ? toAttendance(row) : undefined;
  }

  async createAttendance(data: InsertAttendance): Promise<Attendance> {
    const staffMember = await this.getStaffMember(data.staffId);
    const staffName = staffMember?.name || "Unknown";

    const [row] = await db.insert(attendanceTable).values({
      staffId: data.staffId,
      staffName,
      date: data.date,
      status: data.status,
      checkInTime: data.checkInTime,
      checkOutTime: data.checkOutTime,
      notes: data.notes,
    }).returning();
    return toAttendance(row);
  }

  async updateAttendance(id: string, data: UpdateAttendance): Promise<Attendance | undefined> {
    const [row] = await db.update(attendanceTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(attendanceTable.id, id))
      .returning();
    return row ? toAttendance(row) : undefined;
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date().toISOString().split("T")[0];
    return this.getAttendance(today);
  }

  async getLoyaltyCustomers(): Promise<LoyaltyCustomer[]> {
    const rows = await db.select().from(loyaltyCustomersTable).orderBy(loyaltyCustomersTable.name);
    return rows.map(toLoyaltyCustomer);
  }

  async getLoyaltyCustomer(id: string): Promise<LoyaltyCustomer | undefined> {
    const [row] = await db.select().from(loyaltyCustomersTable).where(eq(loyaltyCustomersTable.id, id));
    return row ? toLoyaltyCustomer(row) : undefined;
  }

  async getLoyaltyCustomerByPhone(phone: string): Promise<LoyaltyCustomer | undefined> {
    const [row] = await db.select().from(loyaltyCustomersTable).where(eq(loyaltyCustomersTable.phone, phone));
    return row ? toLoyaltyCustomer(row) : undefined;
  }

  async createLoyaltyCustomer(data: InsertLoyaltyCustomer): Promise<LoyaltyCustomer> {
    const [row] = await db.insert(loyaltyCustomersTable).values({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      vehicleNumbers: data.vehicleNumbers || [],
    }).returning();
    return toLoyaltyCustomer(row);
  }

  async updateLoyaltyCustomer(id: string, data: Partial<InsertLoyaltyCustomer>): Promise<LoyaltyCustomer | undefined> {
    const [row] = await db.update(loyaltyCustomersTable)
      .set(data)
      .where(eq(loyaltyCustomersTable.id, id))
      .returning();
    return row ? toLoyaltyCustomer(row) : undefined;
  }

  async deleteLoyaltyCustomer(id: string): Promise<boolean> {
    await db.delete(loyaltyCustomersTable).where(eq(loyaltyCustomersTable.id, id));
    return true;
  }

  async getPointsTransactions(customerId: string): Promise<PointsTransaction[]> {
    const rows = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.customerId, customerId))
      .orderBy(desc(transactionsTable.createdAt));
    return rows.map(toPointsTransaction);
  }

  async createPointsTransaction(data: InsertPointsTransaction): Promise<PointsTransaction> {
    const [row] = await db.insert(transactionsTable).values(data).returning();
    return toPointsTransaction(row);
  }

  async earnPoints(customerId: string, amount: number, description: string, jobCardId?: string): Promise<PointsTransaction> {
    const customer = await this.getLoyaltyCustomer(customerId);
    if (!customer) throw new Error("Customer not found");

    const basePoints = Math.floor(amount / 100) * POINTS_PER_100_LKR;
    const multiplier = LOYALTY_TIER_MULTIPLIERS[customer.tier as keyof typeof LOYALTY_TIER_MULTIPLIERS] || 1;
    const earnedPoints = Math.floor(basePoints * multiplier);

    const transaction = await this.createPointsTransaction({
      customerId,
      type: "Earned",
      points: earnedPoints,
      description,
      jobCardId,
    });

    const newTotalPoints = customer.totalPoints + earnedPoints;
    const newAvailablePoints = customer.availablePoints + earnedPoints;
    const newTotalSpent = customer.totalSpent + amount;
    const newVisitCount = customer.visitCount + 1;

    let newTier = customer.tier;
    for (const tier of [...LOYALTY_TIERS].reverse()) {
      if (newTotalPoints >= LOYALTY_TIER_THRESHOLDS[tier]) {
        newTier = tier;
        break;
      }
    }

    await db.update(loyaltyCustomersTable)
      .set({
        totalPoints: newTotalPoints,
        availablePoints: newAvailablePoints,
        totalSpent: newTotalSpent,
        visitCount: newVisitCount,
        tier: newTier,
        lastVisit: new Date(),
      })
      .where(eq(loyaltyCustomersTable.id, customerId));

    return transaction;
  }

  async redeemPoints(customerId: string, points: number, rewardId: string, rewardName: string): Promise<{ transaction: PointsTransaction; redemption: Redemption }> {
    const customer = await this.getLoyaltyCustomer(customerId);
    if (!customer) throw new Error("Customer not found");
    if (customer.availablePoints < points) throw new Error("Insufficient points");

    const transaction = await this.createPointsTransaction({
      customerId,
      type: "Redeemed",
      points: -points,
      description: `Redeemed: ${rewardName}`,
      rewardId,
    });

    const [redemptionRow] = await db.insert(redemptionsTable).values({
      customerId,
      rewardId,
      rewardName,
      pointsUsed: points,
      status: "Pending",
    }).returning();

    await db.update(loyaltyCustomersTable)
      .set({
        availablePoints: customer.availablePoints - points,
      })
      .where(eq(loyaltyCustomersTable.id, customerId));

    return {
      transaction,
      redemption: toRedemption(redemptionRow),
    };
  }

  async getRewards(): Promise<Reward[]> {
    const rows = await db.select().from(rewardsTable).orderBy(rewardsTable.pointsCost);
    return rows.map(toReward);
  }

  async getReward(id: string): Promise<Reward | undefined> {
    const [row] = await db.select().from(rewardsTable).where(eq(rewardsTable.id, id));
    return row ? toReward(row) : undefined;
  }

  async createReward(data: InsertReward): Promise<Reward> {
    const [row] = await db.insert(rewardsTable).values(data).returning();
    return toReward(row);
  }

  async updateReward(id: string, data: Partial<InsertReward>): Promise<Reward | undefined> {
    const [row] = await db.update(rewardsTable)
      .set(data)
      .where(eq(rewardsTable.id, id))
      .returning();
    return row ? toReward(row) : undefined;
  }

  async deleteReward(id: string): Promise<boolean> {
    await db.delete(rewardsTable).where(eq(rewardsTable.id, id));
    return true;
  }

  async getRedemptions(customerId?: string): Promise<Redemption[]> {
    if (customerId) {
      const rows = await db.select().from(redemptionsTable)
        .where(eq(redemptionsTable.customerId, customerId))
        .orderBy(desc(redemptionsTable.createdAt));
      return rows.map(toRedemption);
    }
    const rows = await db.select().from(redemptionsTable).orderBy(desc(redemptionsTable.createdAt));
    return rows.map(toRedemption);
  }

  async updateRedemptionStatus(id: string, status: "Pending" | "Fulfilled" | "Cancelled"): Promise<Redemption | undefined> {
    const [row] = await db.update(redemptionsTable)
      .set({
        status,
        fulfilledAt: status === "Fulfilled" ? new Date() : null,
      })
      .where(eq(redemptionsTable.id, id))
      .returning();
    return row ? toRedemption(row) : undefined;
  }

  async createJobCardAuditLog(jobCardId: string, actorId: string, actorName: string, action: JobCardAuditLog["action"], changes: JobCardAuditLog["changes"]): Promise<JobCardAuditLog> {
    const [row] = await db.insert(auditLogsTable).values({
      jobCardId,
      actorId,
      actorName,
      action,
      changes,
    }).returning();
    return toAuditLog(row);
  }

  async getJobCardAuditLogs(jobCardId: string): Promise<JobCardAuditLog[]> {
    const rows = await db.select().from(auditLogsTable)
      .where(eq(auditLogsTable.jobCardId, jobCardId))
      .orderBy(desc(auditLogsTable.changedAt));
    return rows.map(toAuditLog);
  }

  async getJobCardImages(jobCardId: string): Promise<JobCardImage[]> {
    const rows = await db.select().from(imagesTable)
      .where(eq(imagesTable.jobCardId, jobCardId))
      .orderBy(desc(imagesTable.createdAt));
    return rows.map(toJobCardImage);
  }

  async getJobCardImage(id: string): Promise<JobCardImage | undefined> {
    const [row] = await db.select().from(imagesTable).where(eq(imagesTable.id, id));
    return row ? toJobCardImage(row) : undefined;
  }

  async createJobCardImage(data: InsertJobCardImage): Promise<JobCardImage> {
    const [row] = await db.insert(imagesTable).values(data).returning();
    return toJobCardImage(row);
  }

  async deleteJobCardImage(id: string): Promise<boolean> {
    await db.delete(imagesTable).where(eq(imagesTable.id, id));
    return true;
  }

  async getPartsCatalog(): Promise<PartsCatalog[]> {
    const rows = await db.select().from(partsCatalogTable)
      .where(eq(partsCatalogTable.isActive, true))
      .orderBy(partsCatalogTable.partNumber);
    return rows.map(toPartsCatalog);
  }

  async getPartsCatalogItem(id: string): Promise<PartsCatalog | undefined> {
    const [row] = await db.select().from(partsCatalogTable).where(eq(partsCatalogTable.id, id));
    return row ? toPartsCatalog(row) : undefined;
  }

  async getPartByNumber(partNumber: string): Promise<PartsCatalog | undefined> {
    const [row] = await db.select().from(partsCatalogTable).where(eq(partsCatalogTable.partNumber, partNumber));
    return row ? toPartsCatalog(row) : undefined;
  }

  async createPartsCatalogItem(data: InsertPartsCatalog): Promise<PartsCatalog> {
    const [row] = await db.insert(partsCatalogTable).values({
      partNumber: data.partNumber,
      name: data.name,
      price: data.price,
      isActive: data.isActive ?? true,
    }).returning();
    return toPartsCatalog(row);
  }

  async updatePartsCatalogItem(id: string, data: Partial<InsertPartsCatalog>): Promise<PartsCatalog | undefined> {
    const [row] = await db.update(partsCatalogTable)
      .set(data)
      .where(eq(partsCatalogTable.id, id))
      .returning();
    return row ? toPartsCatalog(row) : undefined;
  }

  async deletePartsCatalogItem(id: string): Promise<boolean> {
    await db.update(partsCatalogTable)
      .set({ isActive: false })
      .where(eq(partsCatalogTable.id, id));
    return true;
  }

  async getSystemLogs(filters?: {
    level?: typeof LOG_LEVELS[number];
    source?: typeof LOG_SOURCES[number];
    fromDate?: string;
    toDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SystemLog[]; total: number }> {
    const conditions = [];
    
    if (filters?.level) {
      conditions.push(eq(systemLogsTable.level, filters.level));
    }
    if (filters?.source) {
      conditions.push(eq(systemLogsTable.source, filters.source));
    }
    if (filters?.fromDate) {
      conditions.push(gte(systemLogsTable.createdAt, new Date(filters.fromDate)));
    }
    if (filters?.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(systemLogsTable.createdAt, toDate));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(systemLogsTable.message, `%${filters.search}%`),
          ilike(systemLogsTable.endpoint, `%${filters.search}%`),
          ilike(systemLogsTable.userName, `%${filters.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allLogs = await db.select().from(systemLogsTable)
      .where(whereClause)
      .orderBy(desc(systemLogsTable.createdAt));

    const total = allLogs.length;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const paginatedLogs = allLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs.map(toSystemLog),
      total,
    };
  }

  async getSystemLog(id: string): Promise<SystemLog | undefined> {
    const [row] = await db.select().from(systemLogsTable).where(eq(systemLogsTable.id, id));
    return row ? toSystemLog(row) : undefined;
  }

  async createSystemLog(data: InsertSystemLog): Promise<SystemLog> {
    const [row] = await db.insert(systemLogsTable).values(data).returning();
    return toSystemLog(row);
  }

  async deleteSystemLog(id: string): Promise<boolean> {
    await db.delete(systemLogsTable).where(eq(systemLogsTable.id, id));
    return true;
  }

  async clearOldLogs(daysOld: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const oldLogs = await db.select({ id: systemLogsTable.id }).from(systemLogsTable)
      .where(lte(systemLogsTable.createdAt, cutoffDate));
    
    if (oldLogs.length > 0) {
      await db.delete(systemLogsTable).where(lte(systemLogsTable.createdAt, cutoffDate));
    }
    
    return oldLogs.length;
  }

  async getSmsTemplates(): Promise<SmsTemplate[]> {
    const rows = await db.select().from(smsTemplatesTable)
      .where(eq(smsTemplatesTable.isActive, true))
      .orderBy(desc(smsTemplatesTable.isDefault), smsTemplatesTable.name);
    return rows;
  }

  async getSmsTemplate(id: string): Promise<SmsTemplate | undefined> {
    const [row] = await db.select().from(smsTemplatesTable).where(eq(smsTemplatesTable.id, id));
    return row || undefined;
  }

  async createSmsTemplate(data: InsertSmsTemplate): Promise<SmsTemplate> {
    const [row] = await db.insert(smsTemplatesTable).values(data).returning();
    return row;
  }

  async updateSmsTemplate(id: string, data: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined> {
    const [row] = await db.update(smsTemplatesTable)
      .set(data)
      .where(eq(smsTemplatesTable.id, id))
      .returning();
    return row || undefined;
  }

  async deleteSmsTemplate(id: string): Promise<boolean> {
    await db.update(smsTemplatesTable)
      .set({ isActive: false })
      .where(eq(smsTemplatesTable.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
