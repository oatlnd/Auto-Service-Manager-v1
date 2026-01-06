import { db } from "./db";
import { 
  users, staff, attendance, jobCards, jobCardAuditLogs, 
  loyaltyCustomers, pointsTransactions, rewards, redemptions, partsCatalog 
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Check if already seeded by checking for users
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already seeded. Skipping...");
    return;
  }

  // Sample Staff
  const sampleStaff = [
    { name: "Arun Kumar", phone: "0771234567", email: "arun@hondajaffna.lk", role: "Admin", workSkills: [] as string[], isActive: true },
    { name: "Priya Shankar", phone: "0779876543", email: "priya@hondajaffna.lk", role: "Manager", workSkills: [] as string[], isActive: true },
    { name: "Ramesh Nair", phone: "0765432109", email: "ramesh@hondajaffna.lk", role: "Job Card", workSkills: [] as string[], isActive: true },
    { name: "Suresh Pillai", phone: "0778765432", email: "suresh@hondajaffna.lk", role: "Cashier", workSkills: [] as string[], isActive: true },
    { name: "Karthik Rajan", phone: "0761234567", email: "karthik@hondajaffna.lk", role: "Job Card", workSkills: [] as string[], isActive: true },
    { name: "Kannan Selvam", phone: "0771111111", email: "", role: "Technician", workSkills: ["Mechanic"], isActive: true },
    { name: "Vimal Kumar", phone: "0772222222", email: "", role: "Technician", workSkills: ["Mechanic"], isActive: true },
    { name: "Ravi Chandran", phone: "0773333333", email: "", role: "Technician", workSkills: ["Mechanic"], isActive: true },
    { name: "Ragavan", phone: "0776666666", email: "", role: "Technician", workSkills: ["Mechanic"], isActive: true },
    { name: "Senthil Murugan", phone: "0774444444", email: "", role: "Service", workSkills: ["Service"], isActive: true },
    { name: "Mani Kandan", phone: "0775555555", email: "", role: "Service", workSkills: ["Service"], isActive: true },
  ];

  const insertedStaff = await db.insert(staff).values(sampleStaff).returning();
  console.log(`Inserted ${insertedStaff.length} staff members`);

  // Sample Users (linked to staff)
  const sampleUsers = [
    { username: "admin", password: "admin123", role: "Admin", name: "Arun Kumar", staffId: insertedStaff[0].id },
    { username: "manager", password: "manager123", role: "Manager", name: "Priya Shankar", staffId: insertedStaff[1].id },
    { username: "staff1", password: "staff123", role: "Job Card", name: "Ramesh Nair", staffId: insertedStaff[2].id },
    { username: "tech1", password: "tech123", role: "Technician", name: "Kannan Selvam", staffId: insertedStaff[5].id },
    { username: "service1", password: "service123", role: "Service", name: "Senthil Murugan", staffId: insertedStaff[9].id },
  ];

  const insertedUsers = await db.insert(users).values(sampleUsers).returning();
  console.log(`Inserted ${insertedUsers.length} users`);

  // Sample Job Cards
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  
  const sampleJobCards = [
    {
      jobCode: "JB1000",
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
      parts: [
        { name: "Engine Oil", date: new Date().toISOString().split('T')[0], amount: 250 },
        { name: "Oil Filter", date: new Date().toISOString().split('T')[0], amount: 150 },
      ],
      partsTotal: 400,
    },
    {
      jobCode: "JB1001",
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
      parts: [
        { name: "Brake Pads", date: twoDaysAgo.toISOString().split('T')[0], amount: 1500 },
      ],
      partsTotal: 1500,
    },
    {
      jobCode: "JB1002",
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
      parts: [] as any[],
      partsTotal: 0,
    },
    {
      jobCode: "JB1003",
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
      parts: [] as any[],
      partsTotal: 0,
    },
  ];

  const insertedJobCards = await db.insert(jobCards).values(sampleJobCards).returning();
  console.log(`Inserted ${insertedJobCards.length} job cards`);

  // Add audit logs for created job cards
  for (const jobCard of insertedJobCards) {
    await db.insert(jobCardAuditLogs).values({
      jobCardId: jobCard.id,
      action: "created",
      changes: [],
      actorId: "system",
      actorName: "System",
    });
  }
  console.log("Added audit logs for job cards");

  // Sample Attendance for today
  const today = new Date().toISOString().split("T")[0];
  const attendanceData = insertedStaff.map((s, index) => ({
    staffId: s.id,
    staffName: s.name,
    date: today,
    status: index === 3 ? "Late" : "Present",
    checkInTime: index === 3 ? "09:15" : "08:30",
    notes: index === 3 ? "Traffic delay" : null,
  }));

  const insertedAttendance = await db.insert(attendance).values(attendanceData).returning();
  console.log(`Inserted ${insertedAttendance.length} attendance records`);

  // Sample Loyalty Customers
  const sampleLoyaltyCustomers = [
    { name: "Rajesh Kumar", phone: "0771234567", email: "rajesh@email.com", vehicleNumbers: ["NP-2341", "NP-6789"], totalPoints: 850, availablePoints: 650, tier: "Silver", totalSpent: 45000, visitCount: 8 },
    { name: "Priya Shankar", phone: "0779876543", email: "priya@email.com", vehicleNumbers: ["NP-5678"], totalPoints: 320, availablePoints: 320, tier: "Bronze", totalSpent: 18000, visitCount: 4 },
    { name: "Anand Murthy", phone: "0765432109", email: "", vehicleNumbers: ["NP-9012"], totalPoints: 1650, availablePoints: 1150, tier: "Gold", totalSpent: 92000, visitCount: 15 },
  ];

  const insertedLoyaltyCustomers = await db.insert(loyaltyCustomers).values(sampleLoyaltyCustomers).returning();
  console.log(`Inserted ${insertedLoyaltyCustomers.length} loyalty customers`);

  // Sample Rewards
  const sampleRewards = [
    { name: "10% Service Discount", description: "Get 10% off your next service", pointsCost: 200, category: "Discount", stock: null, isActive: true },
    { name: "Free Engine Oil Change", description: "Complimentary engine oil change (1L)", pointsCost: 500, category: "Free Service", stock: 10, isActive: true },
    { name: "Honda Branded Cap", description: "Official Honda merchandise cap", pointsCost: 150, category: "Merchandise", stock: 25, isActive: true },
    { name: "Free Full Service", description: "Complete service package free of charge", pointsCost: 1000, category: "Free Service", stock: 5, isActive: true },
    { name: "15% Repair Discount", description: "Get 15% off any repair work", pointsCost: 350, category: "Discount", stock: null, isActive: true },
    { name: "Honda T-Shirt", description: "Official Honda branded t-shirt", pointsCost: 300, category: "Merchandise", stock: 15, isActive: true },
  ];

  const insertedRewards = await db.insert(rewards).values(sampleRewards).returning();
  console.log(`Inserted ${insertedRewards.length} rewards`);

  // Sample Points Transactions
  const sampleTransactions = [
    { customerId: insertedLoyaltyCustomers[0].id, type: "Earned", points: 100, description: "Service payment - 10,000 LKR" },
    { customerId: insertedLoyaltyCustomers[0].id, type: "Earned", points: 150, description: "Service payment - 15,000 LKR" },
    { customerId: insertedLoyaltyCustomers[0].id, type: "Redeemed", points: -200, description: "Redeemed: 10% Service Discount" },
    { customerId: insertedLoyaltyCustomers[0].id, type: "Earned", points: 200, description: "Service payment - 20,000 LKR" },
    { customerId: insertedLoyaltyCustomers[0].id, type: "Earned", points: 400, description: "Silver tier bonus" },
    { customerId: insertedLoyaltyCustomers[2].id, type: "Earned", points: 500, description: "Service payment - 50,000 LKR" },
    { customerId: insertedLoyaltyCustomers[2].id, type: "Redeemed", points: -500, description: "Redeemed: Free Engine Oil Change" },
    { customerId: insertedLoyaltyCustomers[2].id, type: "Earned", points: 1150, description: "Multiple service visits" },
  ];

  await db.insert(pointsTransactions).values(sampleTransactions);
  console.log(`Inserted ${sampleTransactions.length} transactions`);

  // Sample Redemption (pending)
  await db.insert(redemptions).values({
    customerId: insertedLoyaltyCustomers[0].id,
    rewardId: insertedRewards[0].id,
    rewardName: "10% Service Discount",
    pointsUsed: 200,
    status: "Pending",
  });
  console.log("Inserted sample redemption");

  // Sample Parts Catalog
  const sampleParts = [
    { partNumber: "EO-001", name: "Engine Oil 10W-30 (1L)", price: 850, isActive: true },
    { partNumber: "EO-002", name: "Engine Oil 10W-40 (1L)", price: 950, isActive: true },
    { partNumber: "EO-003", name: "Engine Oil 20W-50 (1L)", price: 750, isActive: true },
    { partNumber: "OF-001", name: "Oil Filter", price: 350, isActive: true },
    { partNumber: "AF-001", name: "Air Filter", price: 450, isActive: true },
    { partNumber: "SP-001", name: "Spark Plug NGK", price: 280, isActive: true },
    { partNumber: "SP-002", name: "Spark Plug Iridium", price: 550, isActive: true },
    { partNumber: "BP-001", name: "Brake Pad Front", price: 1200, isActive: true },
    { partNumber: "BP-002", name: "Brake Pad Rear", price: 1100, isActive: true },
    { partNumber: "CL-001", name: "Clutch Cable", price: 650, isActive: true },
    { partNumber: "AC-001", name: "Accelerator Cable", price: 550, isActive: true },
    { partNumber: "CH-001", name: "Chain Kit", price: 2500, isActive: true },
    { partNumber: "BT-001", name: "Battery 12V 5Ah", price: 3500, isActive: true },
    { partNumber: "BT-002", name: "Battery 12V 7Ah", price: 4200, isActive: true },
    { partNumber: "DB-001", name: "Drive Belt", price: 1800, isActive: true },
    { partNumber: "TB-001", name: "Tube Front", price: 450, isActive: true },
    { partNumber: "TB-002", name: "Tube Rear", price: 500, isActive: true },
    { partNumber: "TR-001", name: "Tyre Front", price: 3200, isActive: true },
    { partNumber: "TR-002", name: "Tyre Rear", price: 3500, isActive: true },
  ];

  await db.insert(partsCatalog).values(sampleParts);
  console.log(`Inserted ${sampleParts.length} parts catalog items`);

  console.log("Database seeding completed successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
