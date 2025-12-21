# Honda Service Center Management System

## Overview

A full-stack web application for managing a Honda motorcycle service center in Jaffna, Sri Lanka. The system handles daily operations including job card management, service bay monitoring, and reporting for a team of 12 staff members managing approximately 45 bikes per day (36 regular services + 9 repairs).

The application follows Material Design principles adapted for the automotive service industry, with Honda branding (Red #CC0000, Black #000000) throughout. It features a collapsible sidebar navigation, modal-based forms, and color-coded status indicators for efficient workflow management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using functional components and hooks
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with CSS variables for theming
- **Component Library**: shadcn/ui (Radix UI primitives) with New York style variant
- **Icons**: Lucide React icons
- **Build Tool**: Vite with HMR support

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API with `/api` prefix
- **Build**: esbuild for production bundling with selective dependency bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration
- **Current Storage**: In-memory storage implementation (MemStorage class)
- **Database Ready**: PostgreSQL schema defined, ready for database provisioning

### Key Design Patterns
- **Shared Types**: Schema definitions in `/shared/schema.ts` used by both client and server
- **Path Aliases**: `@/` for client source, `@shared/` for shared modules
- **API Client**: Centralized fetch wrapper with error handling in `queryClient.ts`
- **Component Organization**: Reusable UI components in `components/ui/`, feature components at component root

### Application Structure
```
client/src/
├── components/      # UI components (shadcn/ui + custom)
├── pages/          # Route components (Dashboard, JobCards, ServiceBays, Reports)
├── hooks/          # Custom React hooks
├── lib/            # Utilities and API client

server/
├── index.ts        # Express app setup
├── routes.ts       # API route definitions
├── storage.ts      # Data access layer
├── vite.ts         # Vite dev server integration

shared/
├── schema.ts       # Database schema + Zod validation + TypeScript types
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires DATABASE_URL environment variable)
- **Drizzle Kit**: Database migrations via `npm run db:push`

### UI Framework
- **Radix UI**: Headless component primitives (dialog, select, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-styled component system built on Radix
- **Tailwind CSS**: Utility-first CSS framework

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

### December 2025
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
- Statistics cards: Today's Jobs, Completed, In Progress, Today's Revenue
- Recent job cards list (last 5)
- Service bay status with utilization percentage

### Job Cards (/job-cards)
- Full CRUD operations with modal forms
- Search by customer name, registration, or job ID
- Filter by status (Pending, In Progress, Quality Check, Completed)
- Payment calculation based on service type
- Quick status update buttons

### Service Bays (/service-bays)
- 5 bay cards showing occupancy status
- Active/Available counts with utilization percentage
- Detailed view of occupied bays with job information

### Reports (/reports)
- Overview metrics: Total Jobs, Completed, Revenue, Average Job Value
- Service type distribution with progress bars
- Status overview with color-coded indicators
- Top bike models and technician performance