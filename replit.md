# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform for modernizing tourism registration and management in Himachal Pradesh. It functions as a public tourism discovery portal and an administrative system for operators, specifically implementing the "Himachal Pradesh Homestay Rules 2025" with a three-tier categorization (Diamond, Gold, Silver). The platform's primary goal is to significantly reduce application processing times through automation and streamlined user experiences. Key features include a Public Tourism Discovery Platform, a Smart Compliance Hub for property owners, an Analytics Dashboard for government officers, an Admin User Management System, and a Workflow Monitoring Dashboard for real-time application tracking and intelligent alerting. This project aims to provide a robust, scalable, and user-friendly solution, enhancing both visitor experience and administrative efficiency in the state's tourism sector.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform features a clean, professional design aligned with HP Government branding, utilizing a consistent teal-green accent. It incorporates an accessible hero carousel compliant with WCAG standards and offers an 8-theme system with accessible color contrasts. The design prioritizes clear workflows, adherence to government portal standards, and a mobile-first approach with intuitive user interfaces for all roles.

### Technical Implementations

The frontend is built with React 18+, TypeScript, and Vite, leveraging Shadcn/ui (Radix UI) for components, Tailwind CSS for mobile-first styling, TanStack Query for server state management, React Hook Form with Zod for robust form handling, and Wouter for efficient routing. The backend uses Node.js and Express.js in TypeScript, following a RESTful API design. Session management is handled by Express sessions with PostgreSQL storage, and role-based navigation and route guards enforce access control.

### Security and Authentication

- **Public Registration Security**: Public registration endpoint (`/api/auth/register`) strictly enforces property owner role creation only. The role parameter is forced to "property_owner" before schema validation, preventing role escalation attacks even through direct API calls.
- **Password Security**: Single-layer bcrypt hashing (10 salt rounds) applied in route handlers before storage. DbStorage layer accepts pre-hashed passwords to prevent double-hashing bugs. All password comparisons use bcrypt.compare() for secure authentication.
- **Admin-Only User Creation**: All government officials (Dealing Assistant, District Officer, State Officer, Admin) must be created exclusively through the admin interface (`/api/admin/users`) by existing admins or super_admins. This endpoint is protected by role-based middleware and uses direct database insertion with bcrypt password hashing.
- **Defense in Depth**: Both frontend (hardcoded role) and backend (forced role) enforce property owner registration, ensuring security even if frontend is bypassed.

### Feature Specifications

- **Public Tourism Discovery Platform**: Enables browsing and filtering of approved homestays.
- **Smart Compliance Hub**: Facilitates homestay registration, application submission, and status tracking for property owners, including a draft save & resume functionality.
- **ANNEXURE-I Compliant Registration Form**: A comprehensive multi-step form implementing HP Homestay Rules 2025, covering property details, owner information, room details & category, distances & public areas, ANNEXURE-II documents, and amenities & summary, with district-based distance auto-population, location-based fee calculation, and conditional GSTIN validation.
- **Analytics Dashboard**: Provides government officers with insights into application trends, status distributions, and processing times.
- **Workflow Monitoring Dashboard**: Offers a real-time, visual pipeline of applications through six stages, with SLA tracking and bottleneck detection.
- **Multiple Payment Gateways**: Integrated payment system with HimKosh (HP CTP), Razorpay, CCAvenue, PayU, and UPI QR Code options, including a `Test Payment Mode` for development.
- **Production-Level Role-Based Access Control (RBAC)**: Comprehensive RBAC with distinct roles (Property Owner, District Officer, State Officer, Admin, `super_admin`).
- **Dealing Assistant (DA) Workflow**: Includes a DA Dashboard with district-specific application queues, an enhanced document scrutiny interface, verification checklists, and secure API routes for managing application review, forwarding, and inspection order management with ANNEXURE-III compliant report submission.
- **ANNEXURE-III Inspection Checklist System**: A comprehensive field inspection reporting system implementing official HP Homestay Rules 2025, with dual-section compliance tracking (18 mandatory, 18 desirable points), real-time compliance monitoring, and structured data storage.
- **District Tourism Development Officer (DTDO) Workflow**: Complete workflow including DTDO Dashboard, application review interface with accept/reject/revert options, inspection scheduling system, and post-inspection report review workflow (Approve, Reject, Raise Objections) implementing `PRD_2.0.md` state machine.
- **Admin Database Reset with Granular Preservation**: Flexible database reset for testing, allowing preservation of specific data types (Admin accounts, DDO codes, LGD Master Data, user roles) with detailed statistics.
- **LGD Master Data Integration**: Comprehensive Local Government Directory tables for Himachal Pradesh's 5-tier administrative hierarchy (Districts → Tehsils/Sub-Divisions → Development Blocks → Gram Panchayats / Urban Bodies), including "Other" custom fields for specifying unlisted locations.
- **Database Console (Admin Tool)**: Interactive SQL console for development with query execution, pre-made templates, table browser, and results formatting (development-only).
- **LGD Master Data Import Tool**: Admin interface for importing official Local Government Directory data via CSV, with separate workflows for Villages/Hierarchy and Urban Bodies, including CSV parsing, validation, hierarchical data population, and import statistics.
- **Admin User Creation System**: Dialog-based interface for administrators to create new users with various roles (Property Owner, Dealing Assistant, District Tourism Officer, District Officer, State Officer, Admin) directly from the admin interface, with bcrypt password hashing, role-based validation, and conditional district assignment.

### System Design Choices

- **Monorepo Structure**: Organizes `client/`, `server/`, and `shared/` for type consistency and code management.
- **Serverless-Ready Database**: Utilizes Neon PostgreSQL and Drizzle ORM for type-safe and scalable data storage.
- **Component-First UI**: Leverages Shadcn/ui for rapid and consistent UI development.
- **Shared Schema Pattern**: Ensures type safety and prevents schema drift across frontend and backend.
- **Session-Based Authentication**: Implements PostgreSQL-backed sessions for authentication, with future plans for Mobile OTP and LDAP/Active Directory integration.
- **Query Cache Management**: TanStack Query cache is automatically invalidated on logout.
- **Role-Specific APIs**: Backend endpoints filter data based on user role and district assignment.
- **Frontend Route Guards**: `ProtectedRoute` component validates user roles and redirects unauthorized access.

### Official 2025 Policy Compliance

The platform implements the **Himachal Pradesh Home Stay Rules, 2025** (Official Gazette Notification TSM-F(10)-10/2003-VI, dated June 25, 2025). Key policy requirements include:
- **Room Specification**: Mandatory collection of room breakdown (Single, Double, Family suites) with capacity limits (max 6 rooms OR 12 single beds equivalent) and specific room size requirements.
- **Fee Structure (GST Included)**: Tiered fee structure (Diamond, Gold, Silver) based on night rates and location (MC, TCP, GP).
- **Discount System**: 10% for 3-year lump sum, 5% for female property owners, 50% for Pangi sub-division; discounts stack in a specific order.
- **GSTIN Requirements**: Mandatory for Diamond & Gold, exempt for Silver.
- **Certificate Validity**: User selects 1 or 3 years; renewal fee equals registration fee.
- **Processing Timeline**: 60-day processing window with automatic approval if not processed.

## External Dependencies

- **UI Component Libraries**: `@radix-ui/*`, `cmdk`, `embla-carousel-react`, `lucide-react`, `recharts`
- **Form Management**: `react-hook-form`, `zod`, `@hookform/resolvers`
- **Styling and Theming**: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Date Handling**: `date-fns`
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Payment Processing**: `qrcode`, HimKosh CTP, Razorpay, CCAvenue, PayU.