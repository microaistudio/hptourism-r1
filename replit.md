# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform aimed at modernizing tourism registration and management in Himachal Pradesh. It serves as a public tourism discovery portal and an administrative system for operators, focusing on implementing the "Himachal Pradesh Homestay Rules 2025" with a three-tier categorization (Diamond, Gold, Silver). The platform's core purpose is to significantly reduce application processing times through automation and streamlined user experiences. Key capabilities include a Public Tourism Discovery Platform, a Smart Compliance Hub for property owners, an Analytics Dashboard for government officers, an Admin User Management System, and a Workflow Monitoring Dashboard for real-time application tracking and intelligent alerting. The project aims to provide a robust, scalable, and user-friendly solution for the state's tourism sector, enhancing both visitor experience and administrative efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform features a clean, professional design aligned with HP Government branding, utilizing a consistent teal-green accent. It incorporates an accessible hero carousel compliant with WCAG standards and offers an 8-theme system with accessible color contrasts. The design prioritizes clear workflows and adherence to government portal standards, with a focus on mobile-first design and intuitive user interfaces for various roles including property owners, district officers, and state officers.

### Technical Implementations

The frontend is built with React 18+, TypeScript, and Vite, utilizing Shadcn/ui (Radix UI) for components, Tailwind CSS for mobile-first styling, TanStack Query for server state management, React Hook Form with Zod for robust form handling, and Wouter for efficient routing. The backend is developed using Node.js and Express.js in TypeScript, adhering to a RESTful API design. Session management is handled by Express sessions with PostgreSQL storage. Role-based sidebar navigation and route guards are implemented to enforce access control.

### Feature Specifications

- **Public Tourism Discovery Platform**: Enables browsing and filtering of approved homestays.
- **Smart Compliance Hub**: Facilitates homestay registration, application submission, and status tracking for property owners.
- **Draft Save & Resume Functionality**: Allows applicants to save and resume applications at any stage.
- **Interactive Multi-Step Stepper**: Provides a visual progress indicator with per-step completion tracking and validation for the ANNEXURE-I Compliant Registration Form.
- **ANNEXURE-I Compliant Registration Form**: A comprehensive multi-step form implementing HP Homestay Rules 2025, covering property details, owner information, room details & category, distances & public areas, ANNEXURE-II documents, and amenities & summary. Includes district-based distance auto-population, location-based fee calculation, and conditional GSTIN validation.
- **Analytics Dashboard**: Offers government officers insights into application trends, status distributions, and processing times.
- **Workflow Monitoring Dashboard**: Provides a real-time, visual pipeline of applications through six stages, with SLA tracking and bottleneck detection.
- **Multiple Payment Gateways**: Integrated payment system with HimKosh (HP CTP), Razorpay, CCAvenue, PayU, and UPI QR Code options.
- **Production-Level Role-Based Access Control (RBAC)**: Comprehensive RBAC with distinct roles: Property Owner, District Officer, State Officer, and Admin, including a `super_admin` role for system-wide control.
- **Dealing Assistant (DA) Workflow**: Includes a DA Dashboard with district-specific application queues, an enhanced document scrutiny interface with split-screen view, verification checklists, and secure, role-based backend API routes for managing application review and forwarding processes. This also encompasses inspection order management, allowing DAs to view assigned inspections and submit detailed ANNEXURE-III compliant reports.
- **ANNEXURE-III Inspection Checklist System**: Comprehensive field inspection reporting system implementing official HP Homestay Rules 2025 requirements:
  - **Dual-Section Compliance Tracking**: Organized in 2 tabs - Section A (18 mandatory requirements) and Section B (18 desirable amenities)
  - **Real-Time Compliance Monitoring**: Live percentage calculation showing compliance level for each section as checkpoints are verified
  - **Section A - Mandatory (18 Points)**: Application form verification, document checklist, payment facilities, property maintenance, room standards, kitchen hygiene, water & waste facilities, energy efficiency, safety equipment, guest registers, CCTV surveillance, and medical facility information
  - **Section B - Desirable (18 Points)**: Parking facilities, attached bathrooms, hot water, dining areas, storage solutions, furniture standards, laundry services, refrigerator, lobby lounge, heating/cooling, security guard, luggage assistance, safe storage, Himachali handicrafts promotion, and rainwater harvesting
  - **Structured Data Storage**: JSONB-based storage for checklist data enabling flexible querying and compliance analytics
  - **Legacy Compatibility**: Maintains backward compatibility with existing inspection report fields while adding comprehensive ANNEXURE-III compliance tracking
- **District Tourism Development Officer (DTDO) Workflow**: Complete workflow implementation including:
  - **DTDO Dashboard**: Shows applications forwarded by DA with status-based tabs (Forwarded, Under Review, Inspection Scheduled, Reports Received)
  - **Application Review Interface**: View application details and DA remarks, with three decision options: Accept (schedule inspection), Reject (with reasons), or Revert to applicant
  - **Inspection Scheduling System**: After accepting, DTDO can schedule inspections by selecting date/time, assigning to a DA from the same district, and adding special instructions
  - **Post-Inspection Report Review**: Complete DTDO inspection report review workflow implementing PRD_2.0.md state machine:
    - **Status Flow**: DA submits report → `inspection_under_review` → DTDO reviews → `verified_for_payment`/`rejected`/`objection_raised`
    - **Inspection Review Page**: Comprehensive review interface displaying ANNEXURE-III compliance data, DA findings, property details, and owner information
    - **Three Decision Actions**: Approve (verified_for_payment), Reject (rejected), Raise Objections (objection_raised for re-inspection)
    - **Status Guards**: All DTDO decision endpoints enforce status validation to prevent out-of-order state transitions
    - **Data Persistence**: DTDO decisions stored in `districtOfficerId`, `districtNotes`, `districtReviewDate` fields with proper audit trail
  - **DTDO Profile Page**: View/edit profile and change password
  - **Critical Workflow Fix**: Status transitions use intermediate `dtdo_review` state after acceptance, only moving to `inspection_scheduled` after successful inspection order creation, preventing orphaned records and workflow breakage
  - **District-Based Filtering**: All DTDO endpoints enforce district-level access control, ensuring officers only see applications from their assigned district
- **Admin Database Reset with Granular Preservation**: Flexible database reset functionality for testing and development:
  - **Always Preserved**: Admin and Super Admin accounts (hardcoded)
  - **Optional Preservation**: DDO codes (configuration data), Property Owners, District Officers (DA, DTDO), State Officers
  - **Role-Based Deletion**: Uses SQL subquery to delete user profiles based on role, ensuring no orphaned records
  - **Detailed Statistics**: Returns comprehensive preservation statistics including byRole counts
  - **UI Feedback**: Admin console displays detailed preservation information in success toast
- **Test Payment Mode**: System-wide testing feature for payment gateway integration:
  - **Dual-Mode Operation**: Calculates actual fees but sends ₹1 to HimKosh gateway when test mode is enabled
  - **System Settings Table**: JSONB-based storage for configuration including test_payment_mode flag
  - **Admin Controls**: Toggle accessible in Super Admin console
  - **Transparent Testing**: Allows full workflow testing without processing real payments

### System Design Choices

- **Monorepo Structure**: Organizes `client/`, `server/`, and `shared/` for enhanced type consistency and code management.
- **Serverless-Ready Database**: Utilizes Neon PostgreSQL and Drizzle ORM for type-safe and scalable data storage.
- **Component-First UI**: Leverages Shadcn/ui for rapid and consistent UI development.
- **Shared Schema Pattern**: Ensures type safety and prevents schema drift across frontend and backend.
- **Session-Based Authentication**: Implements PostgreSQL-backed sessions for authentication, with future plans for Mobile OTP and LDAP/Active Directory integration.
- **Query Cache Management**: TanStack Query cache is automatically invalidated on logout to maintain data integrity.
- **Role-Specific APIs**: Backend endpoints are designed to filter data based on user role and district assignment, ensuring secure and relevant data access.
- **Frontend Route Guards**: `ProtectedRoute` component validates user roles and redirects unauthorized access, enhancing security and user experience.

## Official 2025 Policy Compliance

**Reference Document:** `docs/PRD_2025_Policy_Update.md`

The platform implements the **Himachal Pradesh Home Stay Rules, 2025** (Official Gazette Notification TSM-F(10)-10/2003-VI, dated June 25, 2025), which repealed the HP Homestay Scheme 2008.

### Critical 2025 Policy Requirements

**Room Specification (MANDATORY):**
- Applications MUST collect breakdown: Single bed rooms, Double bed rooms, Family suites
- Capacity limits: Maximum 6 rooms OR 12 single beds equivalent
- Family suites: 4 beds each, maximum 3 suites allowed
- Room sizes: New construction (Double: 120 sq ft, Single: 100 sq ft) vs Existing (Double: 100 sq ft, Single: 80 sq ft)

**Fee Structure (GST Included):**
- Diamond (>₹10k/night): MC ₹18k, TCP ₹12k, GP ₹10k
- Gold (₹3k-₹10k/night): MC ₹12k, TCP ₹8k, GP ₹6k
- Silver (<₹3k/night): MC ₹8k, TCP ₹5k, GP ₹3k

**Discount System:**
- 10% discount for 3-year lump sum payment
- Additional 5% discount for female property owners
- 50% discount for Pangi sub-division (Chamba district)
- Discounts stack in order: Pangi → 3-year → Female

**GSTIN Requirements:**
- Diamond & Gold: Mandatory (ANNEXURE-I Section 12)
- Silver: Exempt

**Certificate Validity:**
- User selects 1 year OR 3 years at application time
- Renewal fee = Registration fee (same amount)

**Processing Timeline:**
- 60-day processing window with automatic approval if not processed
- Re-registration required when changing room count

## External Dependencies

- **UI Component Libraries**: `@radix-ui/*`, `cmdk`, `embla-carousel-react`, `lucide-react`, `recharts`
- **Form Management**: `react-hook-form`, `zod`, `@hookform/resolvers`
- **Styling and Theming**: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Date Handling**: `date-fns`
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Payment Processing**: `qrcode` (for UPI QR generation), HimKosh CTP, Razorpay, CCAvenue, PayU.