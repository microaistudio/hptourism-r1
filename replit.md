# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a comprehensive digital transformation platform for Himachal Pradesh's tourism registration and management system. The platform modernizes the legacy Netgen 2019 system by creating a dual-purpose portal: a public-facing tourism discovery platform and an administrative registration system for tourism operators.

The system handles multiple tourism registration types (homestays, hotels, guest houses, travel agencies, adventure operators, etc.) with a primary focus on implementing the **Himachal Pradesh Homestay Rules 2025**, which introduces a three-tier categorization system (Diamond, Gold, Silver). The platform aims to reduce processing time from 105 days to 7-15 days through automated workflows, intelligent validation, and streamlined user experiences.

## User Preferences

Preferred communication style: Simple, everyday language.

## Development Tools

### Dev Console (Development Mode Only)
A powerful development utility accessible via a yellow floating button in the bottom-right corner of the screen. Features:
- **Storage Statistics**: Real-time view of in-memory data counts (users, applications, documents, payments)
- **Clear All Data**: Wipes all in-memory storage with confirmation dialog - perfect for quick testing iterations
- **Seed Sample Data**: Creates 3 test users (owner, district officer, state officer) and 2 sample applications for immediate testing
- **Auto-refresh**: Statistics automatically update when dialog opens
- **Development-only**: Completely hidden in production builds (gated by `import.meta.env.MODE === "development"`)

Backend API routes (development-only, gated by `process.env.NODE_ENV === "development"`):
- `GET /api/dev/stats` - Returns current storage counts
- `POST /api/dev/clear-all` - Clears all in-memory data
- `POST /api/dev/seed` - Creates sample test data

This tool dramatically speeds up development workflow by eliminating the need to manually create test data or restart the server to reset state.

## Recent Security Enhancements (October 2025)

**Critical Security Implementation - Application Submission Workflow**

The application creation workflow has been hardened with multi-layer security to prevent privilege escalation and status manipulation:

1. **Route-Level Security** (`server/routes.ts` POST /api/applications):
   - Zod schema whitelist enforcing only owner-submittable fields (property details, owner info, fees)
   - Explicit field mapping prevents any non-whitelisted fields from reaching storage
   - Server forces `status='pending'` and `submittedAt=server timestamp`
   - Removed insecure PATCH endpoint that allowed unrestricted updates

2. **Storage-Level Security** (`server/storage.ts`):
   - Introduced trusted flag pattern: `createApplication(data, { trusted: boolean })`
   - Untrusted calls (default) always create applications with `status='draft'`
   - Only trusted server code (POST route, dev seed) can override status
   - Double security layer ensures no bypass even if route validation is circumvented

3. **Blocked Attack Vectors**:
   - ❌ Client cannot send `status='approved'` to self-approve applications
   - ❌ Client cannot inject officer IDs (`districtOfficerId`, `stateOfficerId`)
   - ❌ Client cannot forge review timestamps or notes
   - ❌ No PATCH bypass to update applications after submission
   - ❌ Storage layer rejects untrusted status overrides

4. **Form Submission Flow** (secured):
   - Frontend sends all form data including status/submittedAt
   - Route validates against whitelist, strips unknown fields
   - Route explicitly maps only allowed fields + forces status='pending' with trusted flag
   - Storage honors trusted flag and creates application with pending status
   - Application immediately visible to district officers for review

5. **Dev Tools** (development only):
   - Dev seed uses trusted flag to create test applications with custom status
   - `/api/dev/users` endpoint returns seeded credentials (without passwords)
   - Dev Console displays storage stats and allows quick data reset

**Test Credentials** (after running Dev Console → Seed Sample Data):
- Property Owner: mobile `9876543210`, password `test123`
- District Officer (Shimla): mobile `9876543211`, password `test123`
- State Officer: mobile `9876543212`, password `test123`

**UI Improvements**:
- Submit button changed from "Save as Draft" to "Submit Application" for clarity
- Removed all emojis from category badges (Diamond, Gold, Silver) per architect feedback
- Category badges now display text-only for consistency

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript, using Vite as the build tool and development server.

**UI Component System**: Shadcn/ui component library built on Radix UI primitives, providing accessible, customizable components following the "New York" style variant. The design system implements a carefully crafted color palette inspired by Himachal Pradesh's natural landscape (Forest Green, Sky Blue, Sunrise Orange) with semantic colors for different states.

**Styling Approach**: Tailwind CSS with custom design tokens defined in CSS variables, enabling theme customization and dark mode support. The configuration uses a mobile-first responsive approach with breakpoints at 768px (tablet) and 1024px (desktop).

**State Management**: TanStack Query (React Query) for server state management with custom query client configuration. Forms are handled using React Hook Form with Zod schema validation through @hookform/resolvers.

**Routing**: Wouter for lightweight client-side routing, chosen for its minimal bundle size compared to React Router.

**Design Philosophy**: The application follows a "Linear meets Airbnb meets GOV.UK" design approach - combining clean workflows, trust-building discovery features, and accessible government portal standards. The goal is to transform compliance into empowerment through clarity and visual delight.

### Backend Architecture

**Runtime**: Node.js with Express.js framework, using TypeScript for type safety across the entire stack.

**API Pattern**: RESTful API design with all routes prefixed under `/api`. The architecture supports future expansion to handle 8+ registration types (homestays, hotels, guest houses, travel agencies, adventure operators, transport operators, restaurants, skiing operators).

**Development Server**: Custom Vite integration with Express middleware mode, enabling hot module replacement (HMR) during development while serving the API and frontend from a single server.

**Session Management**: Connect-pg-simple for PostgreSQL-backed session storage, ensuring persistent authentication across server restarts.

**Storage Interface**: Abstracted storage layer with an IStorage interface pattern, currently implemented as MemStorage for development. This allows easy switching to database-backed storage (Drizzle ORM) without changing business logic.

### Data Storage Solutions

**Database**: PostgreSQL via Neon's serverless driver (@neondatabase/serverless), chosen for its serverless-friendly connection pooling and edge compatibility.

**ORM**: Drizzle ORM for type-safe database queries with schema-first design. Schema definitions live in `shared/schema.ts` for sharing between client and server.

**Migrations**: Drizzle Kit handles schema migrations with configuration pointing to the `migrations` directory and PostgreSQL dialect.

**Current Schema**: Minimal user authentication schema (users table with id, username, password) as a starting point. The system is designed to expand with tables for:
- Property registrations (homestays, hotels, etc.)
- Category criteria and fee structures
- Document uploads and verification tracking
- Application workflow states
- Officer assignments and approvals
- Public discovery listings

**Validation**: Drizzle-zod integration generates Zod schemas from database schemas, ensuring consistent validation between database constraints and runtime type checking.

### Authentication and Authorization

**Planned Implementation**: Session-based authentication using Express sessions with PostgreSQL storage. The infrastructure is in place (connect-pg-simple dependency) but not yet implemented in routes.

**User Roles** (to be implemented):
- Public users (tourists browsing verified properties)
- Property owners (submitting and managing registrations)
- Tourism officers (reviewing and approving applications)
- Government administrators (system oversight and analytics)

**Security Considerations**: Password hashing (bcrypt or similar), CSRF protection, rate limiting on API endpoints, and secure session cookies with appropriate flags.

### External Dependencies

**UI Component Libraries**:
- @radix-ui/* (18+ packages) - Accessible, unstyled component primitives
- cmdk - Command palette component
- embla-carousel-react - Touch-friendly carousel component
- lucide-react - Icon library
- recharts - Data visualization for analytics dashboards

**Form Management**:
- react-hook-form - Performant form handling
- zod - Runtime type validation and schema definition
- @hookform/resolvers - Bridge between React Hook Form and Zod

**Styling and Theming**:
- tailwindcss - Utility-first CSS framework
- class-variance-authority - Type-safe variant management
- clsx + tailwind-merge - Conditional className utilities

**Date Handling**:
- date-fns - Modern date utility library

**Development Tools**:
- @replit/vite-plugin-runtime-error-modal - Enhanced error overlays
- @replit/vite-plugin-cartographer - Code navigation
- @replit/vite-plugin-dev-banner - Development environment indicator

**Potential Future Integrations**:
- File storage service (for property photos, documents)
- Payment gateway integration (for registration fees)
- Email/SMS services (for notifications)
- Government API integrations (Fire Department NOCs, Pollution Control Board clearances)
- National Tourism Portal integration
- Mapping services (for property locations)

### Key Architectural Decisions

**Monorepo Structure**: Single repository with `client/`, `server/`, and `shared/` directories. This enables type sharing between frontend and backend while maintaining clear separation of concerns.

**Why Chosen**: Simplifies development workflow, ensures type consistency across the stack, and makes deployment easier compared to separate repositories.

**Trade-offs**: Larger codebase to navigate, but TypeScript path aliases (`@/`, `@shared/`) mitigate this. Build process is more complex but handled automatically by Vite + ESBuild.

**Serverless-Ready Database**: Neon PostgreSQL with WebSocket connections instead of traditional connection pooling.

**Why Chosen**: Enables deployment to serverless platforms (Vercel, Railway, Replit) without connection limit issues. Supports edge deployments for global performance.

**Alternatives Considered**: Traditional PostgreSQL with PgBouncer would work for dedicated servers but adds operational complexity.

**Pros**: Auto-scaling, lower operational overhead, better cold-start performance. **Cons**: Vendor lock-in to Neon, potential latency on first connection.

**Component-First UI Development**: Extensive use of pre-built Shadcn/ui components rather than custom implementations.

**Why Chosen**: Accelerates development, ensures accessibility compliance (WCAG AA), provides consistent UX patterns, and allows customization through composition rather than forking.

**Trade-offs**: Larger initial bundle size, but tree-shaking and code splitting minimize impact. Learning curve for Radix UI patterns.

**Shared Schema Pattern**: Database schemas defined once in `shared/` and used by both client (for form validation) and server (for database operations).

**Why Chosen**: Single source of truth eliminates schema drift, TypeScript ensures compile-time safety, Zod provides runtime validation.

**Implementation**: Drizzle schema definitions → Drizzle-zod generates Zod schemas → React Hook Form uses Zod for validation → Server validates against same schemas.

**Session-Based Auth over JWT**: PostgreSQL-backed sessions rather than stateless JWT tokens.

**Rationale**: Government system requires audit trails and ability to revoke access immediately. Sessions provide server-side control, simpler security model for multi-role system, and better alignment with traditional government IT security policies.

**Alternatives Considered**: JWTs would enable stateless scaling but sacrifice revocation capability and increase token size with role-based permissions.