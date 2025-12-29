import type { 
  JobCard, InsertJobCard, DailyStatistics, BayStatus, ServiceCategoryStats,
  Staff, InsertStaff, Attendance, InsertAttendance, UpdateAttendance,
  User, BAYS, JOB_STATUSES, WorkSkill,
  LoyaltyCustomer, InsertLoyaltyCustomer, PointsTransaction, InsertPointsTransaction,
  Reward, InsertReward, Redemption, InsertRedemption,
  JobCardAuditLog, JobCardImage, InsertJobCardImage
} from "@shared/schema";
import { SERVICE_TYPE_DETAILS, SERVICE_CATEGORIES, LOYALTY_TIER_THRESHOLDS, LOYALTY_TIERS, LOYALTY_TIER_MULTIPLIERS, POINTS_PER_100_LKR } from "@shared/schema";
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
  
  // Loyalty Program
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
  
  // Job Card Audit Log
  createJobCardAuditLog(jobCardId: string, actorId: string, actorName: string, action: JobCardAuditLog["action"], changes: JobCardAuditLog["changes"]): Promise<JobCardAuditLog>;
  getJobCardAuditLogs(jobCardId: string): Promise<JobCardAuditLog[]>;
  
  // Job Card Images
  getJobCardImages(jobCardId: string): Promise<JobCardImage[]>;
  getJobCardImage(id: string): Promise<JobCardImage | undefined>;
  createJobCardImage(data: InsertJobCardImage): Promise<JobCardImage>;
  deleteJobCardImage(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private jobCards: Map<string, JobCard>;
  private staff: Map<string, Staff>;
  private attendance: Map<string, Attendance>;
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private loyaltyCustomers: Map<string, LoyaltyCustomer>;
  private pointsTransactions: Map<string, PointsTransaction>;
  private rewards: Map<string, Reward>;
  private redemptions: Map<string, Redemption>;
  private jobCardAuditLogs: Map<string, JobCardAuditLog[]>;
  private jobCardImages: Map<string, JobCardImage>;
  private jobIdCounter: number;
  private staffIdCounter: number;
  private attendanceIdCounter: number;
  private userIdCounter: number;
  private loyaltyCustomerIdCounter: number;
  private transactionIdCounter: number;
  private rewardIdCounter: number;
  private redemptionIdCounter: number;
  private auditLogIdCounter: number;
  private imageIdCounter: number;

  constructor() {
    this.jobCards = new Map();
    this.staff = new Map();
    this.attendance = new Map();
    this.users = new Map();
    this.sessions = new Map();
    this.loyaltyCustomers = new Map();
    this.pointsTransactions = new Map();
    this.rewards = new Map();
    this.redemptions = new Map();
    this.jobCardAuditLogs = new Map();
    this.jobCardImages = new Map();
    this.jobIdCounter = 1;
    this.staffIdCounter = 1;
    this.attendanceIdCounter = 1;
    this.userIdCounter = 1;
    this.loyaltyCustomerIdCounter = 1;
    this.transactionIdCounter = 1;
    this.rewardIdCounter = 1;
    this.redemptionIdCounter = 1;
    this.auditLogIdCounter = 1;
    this.imageIdCounter = 1;
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleStaff: Omit<Staff, "id" | "createdAt">[] = [
      { name: "Arun Kumar", phone: "0771234567", email: "arun@hondajaffna.lk", role: "Admin", workSkills: [], isActive: true },
      { name: "Priya Shankar", phone: "0779876543", email: "priya@hondajaffna.lk", role: "Manager", workSkills: [], isActive: true },
      { name: "Ramesh Nair", phone: "0765432109", email: "ramesh@hondajaffna.lk", role: "Job Card", workSkills: [], isActive: true },
      { name: "Suresh Pillai", phone: "0778765432", email: "suresh@hondajaffna.lk", role: "Cashier", workSkills: [], isActive: true },
      { name: "Karthik Rajan", phone: "0761234567", email: "karthik@hondajaffna.lk", role: "Job Card", workSkills: [], isActive: true },
      { name: "Kannan Selvam", phone: "0771111111", email: "", role: "Technician", workSkills: ["Mechanic"], isActive: true },
      { name: "Vimal Kumar", phone: "0772222222", email: "", role: "Technician", workSkills: ["Mechanic"], isActive: true },
      { name: "Ravi Chandran", phone: "0773333333", email: "", role: "Technician", workSkills: ["Mechanic"], isActive: true },
      { name: "Senthil Murugan", phone: "0774444444", email: "", role: "Service", workSkills: ["Service"], isActive: true },
      { name: "Mani Kandan", phone: "0775555555", email: "", role: "Service", workSkills: ["Service"], isActive: true },
    ];

    sampleStaff.forEach((s) => {
      const id = `STF${String(this.staffIdCounter++).padStart(3, "0")}`;
      this.staff.set(id, { ...s, id, createdAt: new Date().toISOString() });
    });

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    
    const sampleJobs: Omit<JobCard, "id">[] = [
      {
        tagNo: "1",
        customerName: "Rajesh Kumar",
        phone: "0771234567",
        bikeModel: "Shine",
        registration: "NP-2341",
        odometer: 15420,
        serviceType: "Service with Oil Spray (Oil Change)",
        customerRequests: ["Engine Oil Change", "Washing"],
        status: "In Progress",
        assignedTo: "Kannan Selvam",
        bay: "Sudershan",
        estimatedTime: "45 mins",
        cost: 1000,
        repairDetails: "Oil change, filter replacement, chain adjustment",
        parts: ["Engine Oil", "Oil Filter"],
        advancePayment: 1000,
        remainingPayment: 0,
        paymentStatus: "Paid in Full",
        createdAt: new Date().toISOString(),
      },
      {
        tagNo: "2",
        customerName: "Priya Shankar",
        phone: "0779876543",
        bikeModel: "CB350",
        registration: "NP-5678",
        odometer: 8750,
        serviceType: "Repair",
        customerRequests: ["Brakes not effective", "Brakes making noise"],
        status: "In Progress",
        assignedTo: "Vimal Kumar",
        bay: "Vijandran",
        estimatedTime: "2 hours",
        cost: 5000,
        repairDetails: "Front brake pad replacement, disc inspection",
        advancePayment: 2500,
        remainingPayment: 2500,
        paymentStatus: "Advance Paid",
        createdAt: twoDaysAgo,
      },
      {
        tagNo: "3",
        customerName: "Anand Murthy",
        phone: "0765432109",
        bikeModel: "Unicorn",
        registration: "NP-9012",
        odometer: 22100,
        serviceType: "1st Free Service",
        customerRequests: ["Check everything & give estimate", "Tighten all bolts"],
        status: "Completed",
        assignedTo: "Ravi Chandran",
        bay: "Jayakandan",
        estimatedTime: "1 hour",
        cost: 550,
        repairDetails: "",
        advancePayment: 550,
        remainingPayment: 0,
        paymentStatus: "Paid in Full",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        tagNo: "4",
        customerName: "Suresh Pillai",
        phone: "0778765432",
        bikeModel: "Activa 6G",
        registration: "NP-3456",
        odometer: 5200,
        serviceType: "Water Wash",
        customerRequests: ["General service & wash"],
        status: "In Progress",
        assignedTo: "Ragavan",
        bay: "Wash Bay 1",
        estimatedTime: "30 mins",
        cost: 400,
        repairDetails: "",
        advancePayment: 400,
        remainingPayment: 0,
        paymentStatus: "Paid in Full",
        createdAt: threeDaysAgo,
      },
    ];

    sampleJobs.forEach((job) => {
      const id = `JC${String(this.jobIdCounter++).padStart(3, "0")}`;
      this.jobCards.set(id, { ...job, id });
      // Add sample audit log for creation
      const auditId = `AUD${String(this.auditLogIdCounter++).padStart(5, "0")}`;
      const auditLog: JobCardAuditLog = {
        id: auditId,
        jobCardId: id,
        action: "created",
        changes: [],
        actorId: "system",
        actorName: "System",
        changedAt: job.createdAt || new Date().toISOString(),
      };
      const logs = this.jobCardAuditLogs.get(id) || [];
      logs.push(auditLog);
      this.jobCardAuditLogs.set(id, logs);
    });

    const today = new Date().toISOString().split("T")[0];
    const staffIds = Array.from(this.staff.keys());
    staffIds.forEach((staffId, index) => {
      const staffMember = this.staff.get(staffId)!;
      const id = `ATT${String(this.attendanceIdCounter++).padStart(5, "0")}`;
      const statuses: ("Present" | "Late")[] = ["Present", "Present", "Present", "Late", "Present"];
      this.attendance.set(id, {
        id,
        staffId,
        staffName: staffMember.name,
        date: today,
        status: statuses[index] || "Present",
        checkInTime: index === 3 ? "09:15" : "08:30",
        checkOutTime: undefined,
        notes: index === 3 ? "Traffic delay" : undefined,
        createdAt: new Date().toISOString(),
      });
    });

    const sampleUsers: { username: string; password: string; role: string; name: string; staffId?: string }[] = [
      { username: "admin", password: "admin123", role: "Admin", name: "Arun Kumar", staffId: "STF001" },
      { username: "manager", password: "manager123", role: "Manager", name: "Priya Shankar", staffId: "STF002" },
      { username: "staff1", password: "staff123", role: "Job Card", name: "Ramesh Nair", staffId: "STF003" },
      { username: "tech1", password: "tech123", role: "Technician", name: "Kannan Selvam", staffId: "STF006" },
      { username: "service1", password: "service123", role: "Service", name: "Senthil Murugan", staffId: "STF009" },
    ];

    sampleUsers.forEach((u) => {
      const id = `USR${String(this.userIdCounter++).padStart(3, "0")}`;
      this.users.set(id, { ...u, id, staffId: u.staffId || null });
    });

    // Sample Loyalty Program Data
    const sampleLoyaltyCustomers: Omit<LoyaltyCustomer, "id" | "createdAt">[] = [
      { name: "Rajesh Kumar", phone: "0771234567", email: "rajesh@email.com", vehicleNumbers: ["NP-2341", "NP-6789"], totalPoints: 850, availablePoints: 650, tier: "Silver", totalSpent: 45000, visitCount: 8 },
      { name: "Priya Shankar", phone: "0779876543", email: "priya@email.com", vehicleNumbers: ["NP-5678"], totalPoints: 320, availablePoints: 320, tier: "Bronze", totalSpent: 18000, visitCount: 4 },
      { name: "Anand Murthy", phone: "0765432109", email: "", vehicleNumbers: ["NP-9012"], totalPoints: 1650, availablePoints: 1150, tier: "Gold", totalSpent: 92000, visitCount: 15 },
    ];

    sampleLoyaltyCustomers.forEach((c) => {
      const id = `LC${String(this.loyaltyCustomerIdCounter++).padStart(4, "0")}`;
      this.loyaltyCustomers.set(id, { ...c, id, createdAt: new Date().toISOString() });
    });

    // Sample Rewards
    const sampleRewards: Omit<Reward, "id" | "createdAt">[] = [
      { name: "10% Service Discount", description: "Get 10% off your next service", pointsCost: 200, category: "Discount", stock: undefined, isActive: true },
      { name: "Free Engine Oil Change", description: "Complimentary engine oil change (1L)", pointsCost: 500, category: "Free Service", stock: 10, isActive: true },
      { name: "Honda Branded Cap", description: "Official Honda merchandise cap", pointsCost: 150, category: "Merchandise", stock: 25, isActive: true },
      { name: "Free Full Service", description: "Complete service package free of charge", pointsCost: 1000, category: "Free Service", stock: 5, isActive: true },
      { name: "15% Repair Discount", description: "Get 15% off any repair work", pointsCost: 350, category: "Discount", stock: undefined, isActive: true },
      { name: "Honda T-Shirt", description: "Official Honda branded t-shirt", pointsCost: 300, category: "Merchandise", stock: 15, isActive: true },
    ];

    sampleRewards.forEach((r) => {
      const id = `RW${String(this.rewardIdCounter++).padStart(4, "0")}`;
      this.rewards.set(id, { ...r, id, createdAt: new Date().toISOString() });
    });

    // Sample Points Transactions
    const sampleTransactions: Omit<PointsTransaction, "id" | "createdAt">[] = [
      { customerId: "LC0001", type: "Earned", points: 100, description: "Service payment - 10,000 LKR" },
      { customerId: "LC0001", type: "Earned", points: 150, description: "Service payment - 15,000 LKR" },
      { customerId: "LC0001", type: "Redeemed", points: -200, description: "Redeemed: 10% Service Discount" },
      { customerId: "LC0001", type: "Earned", points: 200, description: "Service payment - 20,000 LKR" },
      { customerId: "LC0001", type: "Earned", points: 400, description: "Silver tier bonus" },
      { customerId: "LC0003", type: "Earned", points: 500, description: "Service payment - 50,000 LKR" },
      { customerId: "LC0003", type: "Redeemed", points: -500, description: "Redeemed: Free Engine Oil Change" },
      { customerId: "LC0003", type: "Earned", points: 1150, description: "Multiple service visits" },
    ];

    sampleTransactions.forEach((t) => {
      const id = `TXN${String(this.transactionIdCounter++).padStart(5, "0")}`;
      this.pointsTransactions.set(id, { ...t, id, createdAt: new Date().toISOString() });
    });

    // Sample Redemption (pending)
    const pendingRedemption: Omit<Redemption, "id" | "createdAt"> = {
      customerId: "LC0001",
      rewardId: "RW0001",
      rewardName: "10% Service Discount",
      pointsUsed: 200,
      status: "Pending",
    };
    const redemptionId = `RDM${String(this.redemptionIdCounter++).padStart(5, "0")}`;
    this.redemptions.set(redemptionId, { ...pendingRedemption, id: redemptionId, createdAt: new Date().toISOString() });
  }

  private generateJobId(): string {
    return `JC${String(this.jobIdCounter++).padStart(3, "0")}`;
  }

  private calculatePayment(serviceType: string, cost: number) {
    if (serviceType === "Repair") {
      return {
        advancePayment: cost * 0.5,
        remainingPayment: cost * 0.5,
        paymentStatus: "Advance Paid" as const,
      };
    }
    return {
      advancePayment: cost,
      remainingPayment: 0,
      paymentStatus: "Paid in Full" as const,
    };
  }

  async getJobCards(): Promise<JobCard[]> {
    return Array.from(this.jobCards.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getJobCard(id: string): Promise<JobCard | undefined> {
    return this.jobCards.get(id);
  }

  async getRecentJobCards(limit: number): Promise<JobCard[]> {
    const jobs = await this.getJobCards();
    return jobs.slice(0, limit);
  }

  async createJobCard(data: InsertJobCard): Promise<JobCard> {
    const id = this.generateJobId();
    const payment = this.calculatePayment(data.serviceType, data.cost);
    
    const jobCard: JobCard = {
      ...data,
      id,
      ...payment,
      parts: data.parts || [],
      createdAt: new Date().toISOString(),
    };
    
    this.jobCards.set(id, jobCard);
    return jobCard;
  }

  async updateJobCard(id: string, data: Partial<InsertJobCard>): Promise<JobCard | undefined> {
    const existing = this.jobCards.get(id);
    if (!existing) return undefined;

    let payment = {
      advancePayment: existing.advancePayment,
      remainingPayment: existing.remainingPayment,
      paymentStatus: existing.paymentStatus,
    };

    if (data.serviceType !== undefined || data.cost !== undefined) {
      const serviceType = data.serviceType ?? existing.serviceType;
      const cost = data.cost ?? existing.cost;
      payment = this.calculatePayment(serviceType, cost);
    }

    const updated: JobCard = {
      ...existing,
      ...data,
      ...payment,
    };

    this.jobCards.set(id, updated);
    return updated;
  }

  async updateJobCardStatus(id: string, status: typeof JOB_STATUSES[number]): Promise<JobCard | undefined> {
    const existing = this.jobCards.get(id);
    if (!existing) return undefined;

    const updated: JobCard = {
      ...existing,
      status,
    };

    this.jobCards.set(id, updated);
    return updated;
  }

  async deleteJobCard(id: string): Promise<boolean> {
    return this.jobCards.delete(id);
  }

  async getStatistics(date?: string): Promise<DailyStatistics> {
    const jobs = Array.from(this.jobCards.values());
    const targetDate = date ? new Date(date).toDateString() : new Date().toDateString();
    
    const dateJobs = jobs.filter(
      (job) => new Date(job.createdAt).toDateString() === targetDate
    );

    const getCategoryBreakdown = (filteredJobs: JobCard[]) => ({
      paidService: filteredJobs.filter(job => SERVICE_TYPE_DETAILS[job.serviceType]?.category === "Paid Service").length,
      freeService: filteredJobs.filter(job => SERVICE_TYPE_DETAILS[job.serviceType]?.category === "Company Free Service").length,
      repair: filteredJobs.filter(job => SERVICE_TYPE_DETAILS[job.serviceType]?.category === "Repair").length,
    });

    const pendingJobs = dateJobs.filter((job) => job.status === "Pending");
    const inProgressJobs = dateJobs.filter((job) => job.status === "In Progress");
    const oilChangeJobs = dateJobs.filter((job) => job.status === "Oil Change");
    const qualityCheckJobs = dateJobs.filter((job) => job.status === "Quality Check");
    const completedJobs = dateJobs.filter((job) => job.status === "Completed");
    const deliveredJobs = dateJobs.filter((job) => job.status === "Delivered");

    return {
      today: dateJobs.length,
      todayByCategory: getCategoryBreakdown(dateJobs),
      pending: pendingJobs.length,
      pendingByCategory: getCategoryBreakdown(pendingJobs),
      inProgress: inProgressJobs.length,
      inProgressByCategory: getCategoryBreakdown(inProgressJobs),
      oilChange: oilChangeJobs.length,
      oilChangeByCategory: getCategoryBreakdown(oilChangeJobs),
      qualityCheck: qualityCheckJobs.length,
      qualityCheckByCategory: getCategoryBreakdown(qualityCheckJobs),
      completed: completedJobs.length,
      completedByCategory: getCategoryBreakdown(completedJobs),
      delivered: deliveredJobs.length,
      deliveredByCategory: getCategoryBreakdown(deliveredJobs),
      revenue: dateJobs.filter(j => j.status === "Completed" || j.status === "Delivered").reduce((sum, job) => sum + job.cost, 0),
    };
  }

  async getStatisticsByCategory(date?: string): Promise<ServiceCategoryStats[]> {
    const jobs = Array.from(this.jobCards.values());
    const targetDate = date ? new Date(date).toDateString() : new Date().toDateString();
    
    const dateJobs = jobs.filter(
      (job) => new Date(job.createdAt).toDateString() === targetDate
    );

    return SERVICE_CATEGORIES.map((category) => {
      const categoryJobs = dateJobs.filter(
        (job) => SERVICE_TYPE_DETAILS[job.serviceType]?.category === category
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
    const bays: (typeof BAYS[number])[] = ["Wash Bay 1", "Wash Bay 2", "Sudershan", "Jayakandan", "Dharshan", "Vijandran", "Pradeepan", "Aya"];
    const washBays: (typeof BAYS[number])[] = ["Wash Bay 1", "Wash Bay 2"];
    const jobs = Array.from(this.jobCards.values());

    return bays.map((bay) => {
      const isWashBay = washBays.includes(bay);
      
      if (isWashBay) {
        const activeJobs = jobs
          .filter((job) => job.bay === bay && job.status !== "Completed" && job.status !== "Delivered")
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        
        return {
          bay,
          isOccupied: activeJobs.length > 0,
          jobCard: activeJobs[0],
          jobCards: activeJobs,
        };
      } else {
        const activeJob = jobs.find(
          (job) => job.bay === bay && job.status !== "Completed" && job.status !== "Delivered"
        );
        
        return {
          bay,
          isOccupied: !!activeJob,
          jobCard: activeJob,
        };
      }
    });
  }

  async getStaff(): Promise<Staff[]> {
    return Array.from(this.staff.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async createStaff(data: InsertStaff): Promise<Staff> {
    const id = `STF${String(this.staffIdCounter++).padStart(3, "0")}`;
    const staff: Staff = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.staff.set(id, staff);
    return staff;
  }

  async updateStaff(id: string, data: Partial<InsertStaff>): Promise<Staff | undefined> {
    const existing = this.staff.get(id);
    if (!existing) return undefined;

    const updated: Staff = {
      ...existing,
      ...data,
    };
    this.staff.set(id, updated);
    return updated;
  }

  async deleteStaff(id: string): Promise<boolean> {
    return this.staff.delete(id);
  }

  async getAttendance(date?: string): Promise<Attendance[]> {
    const records = Array.from(this.attendance.values());
    if (date) {
      return records.filter((a) => a.date === date);
    }
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getAttendanceByStaff(staffId: string): Promise<Attendance[]> {
    return Array.from(this.attendance.values())
      .filter((a) => a.staffId === staffId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getAttendanceRecord(id: string): Promise<Attendance | undefined> {
    return this.attendance.get(id);
  }

  async createAttendance(data: InsertAttendance): Promise<Attendance> {
    const id = `ATT${String(this.attendanceIdCounter++).padStart(5, "0")}`;
    const staffMember = await this.getStaffMember(data.staffId);
    
    const attendance: Attendance = {
      ...data,
      id,
      staffName: staffMember?.name || "Unknown",
      createdAt: new Date().toISOString(),
    };
    this.attendance.set(id, attendance);
    return attendance;
  }

  async updateAttendance(id: string, data: UpdateAttendance): Promise<Attendance | undefined> {
    const existing = this.attendance.get(id);
    if (!existing) return undefined;

    const updated: Attendance = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.attendance.set(id, updated);
    return updated;
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date().toISOString().split("T")[0];
    return this.getAttendance(today);
  }

  async getStaffByWorkSkill(skill: WorkSkill): Promise<Staff[]> {
    return Array.from(this.staff.values())
      .filter((s) => s.isActive && s.workSkills.includes(skill))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createSession(userId: string): Promise<Session> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    const sessionId = randomUUID();
    const { password, ...userWithoutPassword } = user;
    
    const session: Session = {
      id: sessionId,
      userId,
      user: userWithoutPassword,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    
    return session;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  // Loyalty Program Methods
  private calculateTier(totalPoints: number): typeof LOYALTY_TIERS[number] {
    if (totalPoints >= LOYALTY_TIER_THRESHOLDS.Platinum) return "Platinum";
    if (totalPoints >= LOYALTY_TIER_THRESHOLDS.Gold) return "Gold";
    if (totalPoints >= LOYALTY_TIER_THRESHOLDS.Silver) return "Silver";
    return "Bronze";
  }

  async getLoyaltyCustomers(): Promise<LoyaltyCustomer[]> {
    return Array.from(this.loyaltyCustomers.values())
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  async getLoyaltyCustomer(id: string): Promise<LoyaltyCustomer | undefined> {
    return this.loyaltyCustomers.get(id);
  }

  async getLoyaltyCustomerByPhone(phone: string): Promise<LoyaltyCustomer | undefined> {
    return Array.from(this.loyaltyCustomers.values()).find((c) => c.phone === phone);
  }

  async createLoyaltyCustomer(data: InsertLoyaltyCustomer): Promise<LoyaltyCustomer> {
    const id = `LYL${String(this.loyaltyCustomerIdCounter++).padStart(4, "0")}`;
    const customer: LoyaltyCustomer = {
      ...data,
      id,
      totalPoints: 0,
      availablePoints: 0,
      tier: "Bronze",
      totalSpent: 0,
      visitCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.loyaltyCustomers.set(id, customer);
    return customer;
  }

  async updateLoyaltyCustomer(id: string, data: Partial<InsertLoyaltyCustomer>): Promise<LoyaltyCustomer | undefined> {
    const existing = this.loyaltyCustomers.get(id);
    if (!existing) return undefined;

    const updated: LoyaltyCustomer = {
      ...existing,
      ...data,
    };
    this.loyaltyCustomers.set(id, updated);
    return updated;
  }

  async deleteLoyaltyCustomer(id: string): Promise<boolean> {
    return this.loyaltyCustomers.delete(id);
  }

  async getPointsTransactions(customerId: string): Promise<PointsTransaction[]> {
    return Array.from(this.pointsTransactions.values())
      .filter((t) => t.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createPointsTransaction(data: InsertPointsTransaction): Promise<PointsTransaction> {
    const id = `TXN${String(this.transactionIdCounter++).padStart(5, "0")}`;
    const transaction: PointsTransaction = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.pointsTransactions.set(id, transaction);
    return transaction;
  }

  async earnPoints(customerId: string, amount: number, description: string, jobCardId?: string): Promise<PointsTransaction> {
    const customer = await this.getLoyaltyCustomer(customerId);
    if (!customer) throw new Error("Customer not found");

    const tierMultiplier = LOYALTY_TIER_MULTIPLIERS[customer.tier];
    const basePoints = Math.floor((amount / 100) * POINTS_PER_100_LKR);
    const earnedPoints = Math.floor(basePoints * tierMultiplier);

    const transaction = await this.createPointsTransaction({
      customerId,
      type: "Earned",
      points: earnedPoints,
      description,
      jobCardId,
    });

    const updatedCustomer: LoyaltyCustomer = {
      ...customer,
      totalPoints: customer.totalPoints + earnedPoints,
      availablePoints: customer.availablePoints + earnedPoints,
      totalSpent: customer.totalSpent + amount,
      visitCount: customer.visitCount + 1,
      lastVisit: new Date().toISOString(),
      tier: this.calculateTier(customer.totalPoints + earnedPoints),
    };
    this.loyaltyCustomers.set(customerId, updatedCustomer);

    return transaction;
  }

  async redeemPoints(customerId: string, points: number, rewardId: string, rewardName: string): Promise<{ transaction: PointsTransaction; redemption: Redemption }> {
    const customer = await this.getLoyaltyCustomer(customerId);
    if (!customer) throw new Error("Customer not found");
    if (customer.availablePoints < points) throw new Error("Insufficient points");

    const reward = await this.getReward(rewardId);
    if (!reward) throw new Error("Reward not found");
    if (reward.stock !== undefined && reward.stock <= 0) throw new Error("Reward out of stock");

    const transaction = await this.createPointsTransaction({
      customerId,
      type: "Redeemed",
      points: -points,
      description: `Redeemed for: ${rewardName}`,
      rewardId,
    });

    const redemptionId = `RDM${String(this.redemptionIdCounter++).padStart(5, "0")}`;
    const redemption: Redemption = {
      id: redemptionId,
      customerId,
      rewardId,
      rewardName,
      pointsUsed: points,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };
    this.redemptions.set(redemptionId, redemption);

    const updatedCustomer: LoyaltyCustomer = {
      ...customer,
      availablePoints: customer.availablePoints - points,
    };
    this.loyaltyCustomers.set(customerId, updatedCustomer);

    if (reward.stock !== undefined) {
      const updatedReward: Reward = {
        ...reward,
        stock: reward.stock - 1,
      };
      this.rewards.set(rewardId, updatedReward);
    }

    return { transaction, redemption };
  }

  async getRewards(): Promise<Reward[]> {
    return Array.from(this.rewards.values())
      .sort((a, b) => a.pointsCost - b.pointsCost);
  }

  async getReward(id: string): Promise<Reward | undefined> {
    return this.rewards.get(id);
  }

  async createReward(data: InsertReward): Promise<Reward> {
    const id = `RWD${String(this.rewardIdCounter++).padStart(3, "0")}`;
    const reward: Reward = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.rewards.set(id, reward);
    return reward;
  }

  async updateReward(id: string, data: Partial<InsertReward>): Promise<Reward | undefined> {
    const existing = this.rewards.get(id);
    if (!existing) return undefined;

    const updated: Reward = {
      ...existing,
      ...data,
    };
    this.rewards.set(id, updated);
    return updated;
  }

  async deleteReward(id: string): Promise<boolean> {
    return this.rewards.delete(id);
  }

  async getRedemptions(customerId?: string): Promise<Redemption[]> {
    let redemptions = Array.from(this.redemptions.values());
    if (customerId) {
      redemptions = redemptions.filter((r) => r.customerId === customerId);
    }
    return redemptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateRedemptionStatus(id: string, status: "Pending" | "Fulfilled" | "Cancelled"): Promise<Redemption | undefined> {
    const existing = this.redemptions.get(id);
    if (!existing) return undefined;

    const updated: Redemption = {
      ...existing,
      status,
      fulfilledAt: status === "Fulfilled" ? new Date().toISOString() : existing.fulfilledAt,
    };
    this.redemptions.set(id, updated);

    if (status === "Cancelled") {
      const customer = await this.getLoyaltyCustomer(existing.customerId);
      if (customer) {
        const updatedCustomer: LoyaltyCustomer = {
          ...customer,
          availablePoints: customer.availablePoints + existing.pointsUsed,
        };
        this.loyaltyCustomers.set(existing.customerId, updatedCustomer);
      }

      const reward = await this.getReward(existing.rewardId);
      if (reward && reward.stock !== undefined) {
        const updatedReward: Reward = {
          ...reward,
          stock: reward.stock + 1,
        };
        this.rewards.set(existing.rewardId, updatedReward);
      }
    }

    return updated;
  }

  async createJobCardAuditLog(
    jobCardId: string,
    actorId: string,
    actorName: string,
    action: JobCardAuditLog["action"],
    changes: JobCardAuditLog["changes"]
  ): Promise<JobCardAuditLog> {
    const id = `AUD${String(this.auditLogIdCounter++).padStart(6, "0")}`;
    const auditLog: JobCardAuditLog = {
      id,
      jobCardId,
      actorId,
      actorName,
      action,
      changes,
      changedAt: new Date().toISOString(),
    };

    const existingLogs = this.jobCardAuditLogs.get(jobCardId) || [];
    existingLogs.push(auditLog);
    this.jobCardAuditLogs.set(jobCardId, existingLogs);

    return auditLog;
  }

  async getJobCardAuditLogs(jobCardId: string): Promise<JobCardAuditLog[]> {
    const logs = this.jobCardAuditLogs.get(jobCardId) || [];
    return logs.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }

  async getJobCardImages(jobCardId: string): Promise<JobCardImage[]> {
    const images: JobCardImage[] = [];
    this.jobCardImages.forEach((image) => {
      if (image.jobCardId === jobCardId) {
        images.push(image);
      }
    });
    return images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getJobCardImage(id: string): Promise<JobCardImage | undefined> {
    return this.jobCardImages.get(id);
  }

  async createJobCardImage(data: InsertJobCardImage): Promise<JobCardImage> {
    const id = `IMG${String(this.imageIdCounter++).padStart(6, "0")}`;
    const image: JobCardImage = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.jobCardImages.set(id, image);
    return image;
  }

  async deleteJobCardImage(id: string): Promise<boolean> {
    return this.jobCardImages.delete(id);
  }
}

export const storage = new MemStorage();
