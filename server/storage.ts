import type { 
  JobCard, InsertJobCard, DailyStatistics, BayStatus, 
  Staff, InsertStaff, Attendance, InsertAttendance, UpdateAttendance,
  User, BAYS, JOB_STATUSES, WorkSkill 
} from "@shared/schema";
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
  getStatistics(): Promise<DailyStatistics>;
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
}

export class MemStorage implements IStorage {
  private jobCards: Map<string, JobCard>;
  private staff: Map<string, Staff>;
  private attendance: Map<string, Attendance>;
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private jobIdCounter: number;
  private staffIdCounter: number;
  private attendanceIdCounter: number;
  private userIdCounter: number;

  constructor() {
    this.jobCards = new Map();
    this.staff = new Map();
    this.attendance = new Map();
    this.users = new Map();
    this.sessions = new Map();
    this.jobIdCounter = 1;
    this.staffIdCounter = 1;
    this.attendanceIdCounter = 1;
    this.userIdCounter = 1;
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
        bikeModel: "Honda - Shine",
        registration: "NP-2341",
        odometer: 15420,
        serviceType: "Service with Oil Spray (Oil Change)",
        status: "In Progress",
        assignedTo: "Kannan Selvam",
        bay: "Sudershan",
        estimatedTime: "45 mins",
        cost: 1000,
        repairDetails: "Oil change, filter replacement, chain adjustment",
        advancePayment: 1000,
        remainingPayment: 0,
        paymentStatus: "Paid in Full",
        createdAt: new Date().toISOString(),
      },
      {
        tagNo: "2",
        customerName: "Priya Shankar",
        phone: "0779876543",
        bikeModel: "Honda - CB350",
        registration: "NP-5678",
        odometer: 8750,
        serviceType: "Repair",
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
        bikeModel: "Honda - Unicorn",
        registration: "NP-9012",
        odometer: 22100,
        serviceType: "1st Free Service",
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
        bikeModel: "Honda - Activa 6G",
        registration: "NP-3456",
        odometer: 5200,
        serviceType: "Water Wash",
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

  async getStatistics(): Promise<DailyStatistics> {
    const jobs = Array.from(this.jobCards.values());
    const today = new Date().toDateString();
    
    const todayJobs = jobs.filter(
      (job) => new Date(job.createdAt).toDateString() === today
    );

    return {
      today: todayJobs.length,
      completed: jobs.filter((job) => job.status === "Completed").length,
      inProgress: jobs.filter((job) => job.status === "In Progress").length,
      pending: jobs.filter((job) => job.status === "Pending").length,
      revenue: jobs
        .filter((job) => job.status === "Completed")
        .reduce((sum, job) => sum + job.cost, 0),
    };
  }

  async getBayStatus(): Promise<BayStatus[]> {
    const bays: (typeof BAYS[number])[] = ["Wash Bay 1", "Wash Bay 2", "Sudershan", "Jayakandan", "Dharshan", "Vijandran", "Pradeepan", "Aya"];
    const washBays: (typeof BAYS[number])[] = ["Wash Bay 1", "Wash Bay 2"];
    const jobs = Array.from(this.jobCards.values());

    return bays.map((bay) => {
      const isWashBay = washBays.includes(bay);
      
      if (isWashBay) {
        const activeJobs = jobs
          .filter((job) => job.bay === bay && job.status !== "Completed")
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
          (job) => job.bay === bay && job.status !== "Completed"
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
}

export const storage = new MemStorage();
