# Ratnam Service Station Management System

## Overview

A full-stack web application for managing Ratnam Service Station, a Honda motorcycle service center in Jaffna, Sri Lanka. The system handles daily operations including job card management, service bay monitoring, reporting, staff management, and attendance tracking for a team of 12 staff members managing approximately 45 bikes per day (36 regular services + 9 repairs).

The application follows Material Design principles adapted for the automotive service industry, with Honda branding (Red #CC0000, Black #000000) throughout. It features a collapsible sidebar navigation, modal-based forms, color-coded status indicators, and role-based access control for efficient workflow management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using functional components and hooks
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack React Query for server state and caching
- **Role Management**: UserRoleContext for client-side role-based access control
- **Styling**: Tailwind CSS with CSS variables for theming
- **Component Library**: shadcn/ui (Radix UI primitives) with New York style variant
- **Icons**: Lucide React icons
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API with `/api` prefix
- **Role Validation**: X-User-Role header for role-based access control
- **Build**: esbuild for production bundling with selective dependency bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration
- **Current Storage**: In-memory storage implementation (MemStorage class)
- **Database Ready**: PostgreSQL schema defined, ready for database provisioning

### Key Design Patterns
- **Shared Types**: Schema definitions in `/shared/schema.ts` used by both client and server
- **Path Aliases**: `@/` for client source, `@shared/` for shared modules
- **API Client**: Centralized fetch wrapper with error handling and role headers in `queryClient.ts`
- **Component Organization**: Reusable UI components in `components/ui/`, feature components at component root
- **Role-Based Access**: UserRoleContext provides canViewRevenue, isAdmin, isManager flags

### Application Structure
```
client/src/
├── components/      # UI components (shadcn/ui + custom)
│   ├── role-selector.tsx  # Role switching dropdown in header
│   └── app-sidebar.tsx    # Navigation with role-based menu sections
├── contexts/        # React contexts for global state
│   └── UserRoleContext.tsx  # Role management context
├── pages/           # Route components
│   ├── dashboard.tsx        # Main dashboard with statistics
│   ├── job-cards.tsx        # Job card CRUD
│   ├── service-bays.tsx     # Bay status monitoring
│   ├── reports.tsx          # Analytics and reports
│   ├── staff-management.tsx # Staff CRUD with work skills (Admin only)
│   └── attendance.tsx       # Attendance tracking
├── hooks/           # Custom React hooks
├── lib/             # Utilities and API client

server/
├── index.ts        # Express app setup
├── routes.ts       # API route definitions with role middleware
├── storage.ts      # Data access layer with Staff and Attendance
├── vite.ts         # Vite dev server integration

shared/
├── schema.ts       # Database schema + Zod validation + TypeScript types
                    # Includes Staff with work skills, Attendance, USER_ROLES, WORK_SKILLS, ATTENDANCE_STATUSES, BAYS
```

## Role-Based Access Control

### User Roles
- **Admin**: Full access to all features including staff management, attendance modification for any day, and revenue/cost visibility
- **Manager**: Access to staff viewing, attendance management for current day, and revenue/cost visibility
- **Job Card**: Basic access to job cards and service bays only (no revenue/cost visibility, no admin section)
- **Technician**: Limited access to job cards (Pending/In Progress only) and all service bays. Can change job status and mark as complete.
- **Service**: Limited access to job cards (Pending/In Progress, Wash Bay only) and Wash Bay only. Can change job status and mark as complete.

### Access Matrix
| Feature | Admin | Manager | Job Card | Technician | Service |
|---------|-------|---------|----------|------------|---------|
| Dashboard | Full | Full | No revenue | Hidden | Hidden |
| Job Cards | Full + costs | Full + costs | No costs | Pending/In Progress only | Wash Bay jobs only |
| Service Bays | Full | Full | Full | Full | Wash Bay only |
| Reports | Full | Full | No revenue/avg | Hidden | Hidden |
| Staff Management | CRUD | View only | Hidden | Hidden | Hidden |
| Attendance | Full + history edit | Today only | Hidden | Hidden | Hidden |

### Demo Accounts
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| manager | manager123 | Manager |
| staff1 | staff123 | Job Card |
| tech1 | tech123 | Technician |
| service1 | service123 | Service |

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires DATABASE_URL environment variable)
- **Drizzle Kit**: Database migrations via `npm run db:push`

### UI Framework
- **Radix UI**: Headless component primitives (dialog, select, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-styled component system built on Radix
- **Tailwind CSS**: Utility-first CSS framework
- **date-fns**: Date formatting and manipulation

### State & Data
- **TanStack React Query**: Server state management with caching
- **Zod**: Runtime type validation for API requests/responses

### Development
- **Vite**: Development server with HMR
- **tsx**: TypeScript execution for development
- **esbuild**: Production build bundling

### Session Management
- **connect-pg-simple**: PostgreSQL session store (available but not currently active)
- **express-session**: Session middleware support

## Recent Changes

### December 25, 2025
- Consolidated Staff and Technicians into unified Staff Management system
- Added work skills (Mechanic, Service) to Staff for flexible assignment
- Added "Cashier" role to USER_ROLES
- Removed separate Technicians page and integrated into Staff Management
- Job card technician assignment now uses staff members with "Mechanic" work skill
- Updated sidebar to remove Technicians page
- API: Added /api/staff/by-skill/:skill endpoint, removed /api/technicians endpoints
- Sample data includes 10 staff members: 5 administrative + 5 technical with work skills

### December 21, 2025
- Added Staff Management page with full CRUD operations (Admin only)
- Implemented Attendance tracking with today's marking and historical view
- Created role-based access control using UserRoleContext and X-User-Role header
- Added role selector dropdown in header for switching between Admin/Manager/Job Card roles
- Updated sidebar with Admin section containing Staff Management and Attendance pages
- Applied role-based visibility restrictions:
  - Revenue/cost hidden from Job Card role on Dashboard, Reports, and Job Cards pages
  - Admin section hidden from Job Card role
  - Historical attendance modification restricted to Admin only
- Sample data includes staff members with today's attendance records
- Added "Wash Bay" as the 6th service bay to the system (BAYS enum updated)

### December 2025 (Initial)
- Implemented complete Honda Service Center Management System MVP
- Created Dashboard with real-time statistics, recent job cards, and bay status monitoring
- Built Job Cards page with full CRUD functionality, search/filter, and status updates
- Implemented Service Bays monitoring page showing 5 bay cards with occupancy status
- Created Reports & Analytics page with service type distribution, status overview, and technician performance
- Added collapsible sidebar navigation with Honda branding
- Implemented payment policy logic (100% for Regular/Premium Service, 50% advance for Repairs)
- Sample data initialization with 3 job cards for demonstration

## Core Features

### Dashboard (/)
- Statistics cards: Today's Jobs, Completed, In Progress, Today's Revenue (Admin/Manager only)
- Recent job cards list (last 5)
- Service bay status with utilization percentage

### Job Cards (/job-cards)
- Full CRUD operations with modal forms
- Search by customer name, registration, or job ID
- Filter by status (Pending, In Progress, Quality Check, Completed)
- Payment calculation based on service type
- Cost column visible to Admin/Manager only
- Quick status update buttons

### Service Bays (/service-bays)
- 6 bay cards showing occupancy status (including Wash Bay)
- Active/Available counts with utilization percentage
- Detailed view of occupied bays with job information

### Reports (/reports)
- Overview metrics: Total Jobs, Completed, Revenue (Admin/Manager), Avg Value (Admin/Manager)
- Service type distribution with progress bars
- Status overview with color-coded indicators
- Top bike models and technician performance

### Staff Management (/staff) - Admin Section
- Staff directory with role badges and active status
- Add/Edit/Delete staff members (Admin only)
- View staff list (Admin and Manager)
- Contact information and role assignment

### Attendance (/attendance) - Admin Section
- Real-time clock display with current date
- Today's attendance marking with status buttons (Present, Absent, Late, Leave)
- Check-in/Check-out time tracking
- Historical attendance view with date picker
- Edit attendance records (today for Manager, any day for Admin)
- Attendance summary cards (Present, Absent, On Leave, Total)

### Technicians (/technicians) - Admin Section
- Technician directory with active/inactive status
- Add/Edit/Delete technicians (Admin only)
- View technician list (Admin and Manager)
- Contact information and specialization tracking
- Active/Inactive/Total summary cards
