# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform designed to modernize Himachal Pradesh's tourism registration and management. It serves as both a public-facing tourism discovery platform and an administrative system for tourism operators. The platform manages various tourism registration types, with a key focus on implementing the "Himachal Pradesh Homestay Rules 2025" and its three-tier categorization (Diamond, Gold, Silver). The primary goal is to significantly reduce application processing times through automation and streamlined user experiences.

## Current Status (October 2025)

Three core pillars have been implemented:

1. **Public Tourism Discovery Platform** - Allows tourists to browse and discover approved homestay properties with advanced search, filtering by district/category/amenities, and detailed property pages with government certification information.

2. **Smart Compliance Hub** - Property owners can register homestays, submit applications with required documents, and track application status through district and state review workflows.

3. **Analytics Dashboard** - Government officers (district and state level) can access comprehensive analytics including application statistics, status distributions, category breakdowns, district-wise data, processing time metrics, and recent application tracking.

### Recent Enhancements (October 24, 2025)

**Clean Professional Redesign**: Complete homepage redesign matching production quality:
- Clean white background with HP Government teal-green accents
- Simplified hero section with clear messaging
- Key Features section with 4 service cards
- 2025 Homestay Categories (Diamond, Gold, Silver)
- Minimal shadows and borders for modern, professional appearance
- Professional footer with government branding

**Experimental Multi-Theme System**: Three dramatically different themes for testing:
- **Classic Portal** (Default): Clean professional design matching production - white background, teal-green accents, minimal styling
- **Modern Bold** (Experimental): Dark dramatic theme - nearly black background, electric blue accents, neon glow effects, perfect for dark mode testing
- **Vibrant HP** (Experimental): Colorful energetic theme - multi-color gradients (purple/orange/teal), playful hover effects with rotation and glow

**Technical Features**:
- Theme switcher dropdown in header with localStorage persistence
- Smooth CSS transitions (0.3s ease) for seamless theme changes
- Theme-specific visual effects and gradients
- Dark mode support via Modern Bold theme
- Accessible color contrasts in all themes

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses React 18+ with TypeScript and Vite. It leverages Shadcn/ui (built on Radix UI) for components, Tailwind CSS for styling with a mobile-first responsive approach, TanStack Query for server state, React Hook Form with Zod for forms, and Wouter for routing. The design philosophy blends clean workflows with accessible government portal standards.

### Backend

The backend is built with Node.js and Express.js, using TypeScript. It follows a RESTful API design. The development server integrates Vite with Express middleware for HMR. Session management uses Connect-pg-simple for PostgreSQL-backed storage. An abstracted `IStorage` interface allows for flexible data storage implementations. The system now uses PostgreSQL with Drizzle ORM (DbStorage) for persistent data storage in both development and production, with MemStorage available as a fallback for testing via environment variable.

### Data Storage

The project uses PostgreSQL via Neon's serverless driver and Drizzle ORM for type-safe queries. Schema definitions are shared between client and server for consistency, with Drizzle Kit handling schema synchronization. The database includes tables for users, homestay applications, documents, payments, notifications, reviews, and audit logs. All data persists across server restarts. User passwords are securely hashed with bcrypt. The DbStorage class implements the IStorage interface using Drizzle ORM, providing efficient database queries including COUNT operations for statistics. Drizzle-zod generates Zod schemas for consistent validation.

### Authentication and Authorization

The system plans to implement session-based authentication using Express sessions with PostgreSQL storage to allow for immediate access revocation and align with government IT security policies. User roles will include public tourists, property owners, tourism officers, and government administrators.

### Key Architectural Decisions

- **Monorepo Structure**: A single repository with `client/`, `server/`, and `shared/` directories for type consistency and streamlined development.
- **Serverless-Ready Database**: Neon PostgreSQL with WebSocket connections for deployment to serverless platforms.
- **Component-First UI Development**: Extensive use of Shadcn/ui for accelerated development, accessibility, and consistent UX.
- **Shared Schema Pattern**: Database schemas defined once in `shared/` and used by both client and server to prevent schema drift and ensure type safety.
- **Session-Based Auth over JWT**: PostgreSQL-backed sessions for better control over access revocation and alignment with government security policies.

## Feature Documentation

### Analytics Dashboard

The Analytics Dashboard provides government officers with comprehensive insights into homestay application trends and processing metrics.

**Access Control:**
- Restricted to district_officer and state_officer roles only
- Accessed via "Analytics" button in the dashboard header
- Frontend route: `/analytics`
- Backend endpoint: `GET /api/analytics/dashboard`

**Analytics Data:**
The dashboard displays the following metrics:

1. **Overview Statistics**
   - Total applications submitted
   - Approved applications count
   - Average processing time (days from submission to state approval)
   - Total registered property owners

2. **Status Distribution**
   - Pie chart showing applications by status (pending, district_review, state_review, approved, rejected)
   - Visual breakdown of workflow stages

3. **Category Breakdown**
   - Bar chart of Diamond/Gold/Silver categorization
   - Helps track market positioning trends

4. **District Analytics**
   - Horizontal bar chart of top 10 districts by application volume
   - Geographic distribution insights

5. **Recent Applications**
   - Last 10 submitted applications
   - Quick overview with property name, district, status, and submission date

**Processing Time Calculation:**
- Measured in days between `submittedAt` and `stateReviewDate` for approved applications
- Helps track progress toward 7-15 day processing target
- Excludes pending/in-review applications from average

**Technical Implementation:**
- Backend uses `getAllApplications()` storage method for aggregation
- Frontend uses Recharts library for visualizations
- Real-time data refresh on page load
- Responsive layout with mobile-first design

## External Dependencies

### UI Component Libraries

- `@radix-ui/*`
- `cmdk`
- `embla-carousel-react`
- `lucide-react`
- `recharts`

### Form Management

- `react-hook-form`
- `zod`
- `@hookform/resolvers`

### Styling and Theming

- `tailwindcss`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`

### Date Handling

- `date-fns`

### Development Tools

- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`

### Database

- `@neondatabase/serverless`
- `drizzle-orm`
- `drizzle-kit`