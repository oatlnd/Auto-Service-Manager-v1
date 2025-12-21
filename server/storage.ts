import type { JobCard, InsertJobCard, DailyStatistics, BayStatus, BAYS, JOB_STATUSES } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getJobCards(): Promise<JobCard[]>;
  getJobCard(id: string): Promise<JobCard | undefined>;
  getRecentJobCards(limit: number): Promise<JobCard[]>;
  createJobCard(data: InsertJobCard): Promise<JobCard>;
  updateJobCard(id: string, data: Partial<InsertJobCard>): Promise<JobCard | undefined>;
  updateJobCardStatus(id: string, status: typeof JOB_STATUSES[number]): Promise<JobCard | undefined>;
  deleteJobCard(id: string): Promise<boolean>;
  getStatistics(): Promise<DailyStatistics>;
  getBayStatus(): Promise<BayStatus[]>;
}

export class MemStorage implements IStorage {
  private jobCards: Map<string, JobCard>;
  private jobIdCounter: number;

  constructor() {
    this.jobCards = new Map();
    this.jobIdCounter = 1;
    this.initializeSampleData();
  }

  private initializeSampleData() {
    const sampleJobs: Omit<JobCard, "id">[] = [
      {
        customerName: "Rajesh Kumar",
        phone: "0771234567",
        bikeModel: "Shine",
        registration: "NP-2341",
        odometer: 15420,
        serviceType: "Regular Service",
        status: "In Progress",
        assignedTo: "Technician 1",
        bay: "Bay 1",
        estimatedTime: "45 mins",
        cost: 3500,
        repairDetails: "Oil change, filter replacement, chain adjustment",
        advancePayment: 3500,
        remainingPayment: 0,
        paymentStatus: "Paid in Full",
        createdAt: new Date().toISOString(),
      },
      {
        customerName: "Priya Shankar",
        phone: "0779876543",
        bikeModel: "CB350",
        registration: "NP-5678",
        odometer: 8750,
        serviceType: "Repair",
        status: "Quality Check",
        assignedTo: "Senior Technician",
        bay: "Bay 4",
        estimatedTime: "2 hours",
        cost: 12500,
        repairDetails: "Front brake pad replacement, disc inspection",
        advancePayment: 6250,
        remainingPayment: 6250,
        paymentStatus: "Advance Paid",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        customerName: "Anand Murthy",
        phone: "0765432109",
        bikeModel: "Unicorn",
        registration: "NP-9012",
        odometer: 22100,
        serviceType: "Regular Service",
        status: "Completed",
        assignedTo: "Technician 2",
        bay: "Bay 2",
        estimatedTime: "1 hour",
        cost: 4200,
        repairDetails: "",
        advancePayment: 4200,
        remainingPayment: 0,
        paymentStatus: "Paid in Full",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];

    sampleJobs.forEach((job) => {
      const id = `JC${String(this.jobIdCounter++).padStart(3, "0")}`;
      this.jobCards.set(id, { ...job, id });
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
    const bays: (typeof BAYS[number])[] = ["Bay 1", "Bay 2", "Bay 3", "Bay 4", "Bay 5"];
    const jobs = Array.from(this.jobCards.values());

    return bays.map((bay) => {
      const activeJob = jobs.find(
        (job) => job.bay === bay && job.status !== "Completed"
      );
      
      return {
        bay,
        isOccupied: !!activeJob,
        jobCard: activeJob,
      };
    });
  }
}

export const storage = new MemStorage();
