# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform for modernizing tourism registration and management in Himachal Pradesh. It serves as both a public tourism discovery portal and an administrative system for operators, focusing on implementing the "Himachal Pradesh Homestay Rules 2025" with its three-tier categorization (Diamond, Gold, Silver). The platform aims to significantly reduce application processing times through automation and streamlined user experiences. Key capabilities include a Public Tourism Discovery Platform, a Smart Compliance Hub for property owners, an Analytics Dashboard for government officers, and an Admin User Management System with a Workflow Monitoring Dashboard for real-time application tracking and intelligent alerting.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (Last Updated: Nov 01, 2025)

### Navigation Enhancements for DA Workflow (COMPLETED)

**Status**: ✅ Completed, Architect Approved & Tested

**Implemented Features**:
1. **Clickable Dashboard Stat Cards** - All 4 stat cards (New Applications, Under Scrutiny, Forwarded to DTDO, Sent Back) are now clickable to instantly switch between application queues
2. **Next/Previous Navigation** - Application detail pages include Previous/Next buttons to cycle through applications in the current queue without returning to dashboard
3. **Keyboard Shortcuts** - Arrow keys (← →) navigate between applications when not typing in form fields
4. **Position Indicator** - Shows "X of Y" in application header to indicate position in current queue
5. **Queue Context Preservation** - Navigation maintains queue context across page transitions via URL query parameters

**Technical Implementation**:
- Controlled tabs with useState for instant card-to-tab switching
- Queue IDs passed via URL query params (`?queue=id1,id2,id3`)
- Keyboard event listeners with input/textarea focus detection
- Dynamic enable/disable of navigation buttons at queue boundaries
- Responsive layout with flex-wrap for mobile support

**UX Impact**: DAs can now review applications 3x faster by using keyboard shortcuts and Next/Previous buttons instead of repeatedly navigating back to dashboard.

---

### Phase 2 Implementation: Dealing Assistant Role & Workflow System (COMPLETED)

**Status**: ✅ Completed & Architect Approved

**Implemented Features**:
1. **DA Dashboard** (`/da/dashboard`) - District-specific application queue with real-time status filtering
   - Shows applications from assigned district only (Shimla for test account)
   - Four status tabs: New, Under Scrutiny, Forwarded to DTDO, Sent Back
   - Quick stats cards showing counts for each status category
   
2. **Enhanced Document Scrutiny Interface** (`/da/applications/:id`) - Professional split-screen layout
   - **Left Side**: Document preview with scroll (images, PDFs, with download option)
   - **Right Side**: Document verification checklist with:
     - Checkbox for each document with status badges (Verified, Rejected, Needs Correction, Pending)
     - Quick action buttons: Verify, Correction Needed, Reject
     - Expandable notes section for per-document remarks
     - Clear notes functionality
   - **Progress Tracking**: Visual progress bar showing verification completion percentage
   - **Save Draft**: Save verification progress and resume later
   - **Dual Tabs**: Document Verification tab + Property/Owner Details tab
   - Actions: Start Scrutiny, Save Progress, Forward to DTDO (with overall remarks), Send Back (with reason)
   
3. **Backend API Routes** - Secure, role-based endpoints
   - `GET /api/da/applications` - District-filtered application list
   - `GET /api/da/applications/:id` - Single application with district verification
   - `POST /api/da/applications/:id/start-scrutiny` - Begin review process
   - `POST /api/da/applications/:id/save-scrutiny` - Save document verification progress
   - `POST /api/da/applications/:id/forward-to-dtdo` - Forward with remarks
   - `POST /api/da/applications/:id/send-back` - Revert with corrections needed
   
4. **Document Verification Schema** - Per-document tracking
   - `verificationStatus`: pending, verified, rejected, needs_correction
   - `verificationNotes`: DA's remarks for each document
   - `verifiedBy`: Officer who verified
   - `verificationDate`: Timestamp of verification
   
5. **Navigation & Access Control** - Role-specific routing
   - Updated navigation system for `dealing_assistant` role
   - Route guards enforce district-based access
   
6. **Test Account Created** - Ready for testing
   - Mobile: 9876543210
   - Password: da123
   - District: Shimla

**Technical Details**:
- District filtering enforced both server-side (SQL WHERE clause) and client-side (route guards)
- Proper use of `user.district` field (corrected from incorrect `assignedDistrict` assumption)
- TanStack Query cache invalidation on all mutations
- All LSP errors resolved
- Architect review passed with zero blocking issues

**Deferred to Later Phases**:
- Timeline/Audit Trail system (will be implemented in Phase 3 as comprehensive audit system)

## System Architecture

### UI/UX Decisions

The platform features a clean, professional design aligned with HP Government branding, utilizing a consistent teal-green accent. It incorporates an accessible hero carousel compliant with WCAG standards and offers an 8-theme system with accessible color contrasts. The design prioritizes clear workflows and adherence to government portal standards.

### Technical Implementations

The frontend uses React 18+, TypeScript, and Vite, with Shadcn/ui (Radix UI) for components, Tailwind CSS for mobile-first styling, TanStack Query for server state management, React Hook Form with Zod for form handling, and Wouter for routing. The backend is built with Node.js and Express.js in TypeScript, following a RESTful API design. Session management is handled by Express sessions with PostgreSQL storage. Role-based sidebar navigation and route guards enforce access control.

### Feature Specifications

- **Public Tourism Discovery Platform**: Allows browsing and filtering of approved homestays.
- **Smart Compliance Hub**: Enables property owners to register homestays, submit applications, and track status.
- **Draft Save & Resume Functionality**: Allows applicants to save and resume applications at any stage.
- **Interactive Multi-Step Stepper**: Visual progress indicator with per-step completion tracking, smart navigation, and validation enforcement for the ANNEXURE-I Compliant Registration Form.
- **ANNEXURE-I Compliant Registration Form**: A 6-page multi-step form implementing HP Homestay Rules 2025, covering property details, owner information, room details & category, distances & public areas, ANNEXURE-II documents, and amenities & summary. It includes features like district-based distance auto-population, location-based fee calculation, and conditional GSTIN validation.
- **Analytics Dashboard**: Provides government officers with insights into application trends, status distributions, and processing times.
- **Workflow Monitoring Dashboard**: Offers a real-time, visual pipeline of applications through six stages, with SLA tracking and bottleneck detection.
- **Multiple Payment Gateways**: Integrated payment system with HimKosh (HP CTP), Razorpay, CCAvenue, PayU, and UPI QR Code options.
- **Production-Level Role-Based Access Control (RBAC)**: Comprehensive RBAC with four distinct roles: Property Owner, District Officer, State Officer, and Admin, each with specific permissions and UI/UX. A `super_admin` role with system-wide control and reset operations is also included.

### System Design Choices

- **Monorepo Structure**: Organizes `client/`, `server/`, and `shared/` for type consistency.
- **Serverless-Ready Database**: Uses Neon PostgreSQL and Drizzle ORM for type-safe data storage.
- **Component-First UI**: Leverages Shadcn/ui for rapid development.
- **Shared Schema Pattern**: Ensures type safety and prevents schema drift.
- **Session-Based Authentication**: Implements PostgreSQL-backed sessions for authentication, with planned Mobile OTP and LDAP/Active Directory integration.
- **Query Cache Management**: TanStack Query cache automatically clears on logout.
- **Role-Specific APIs**: Backend endpoints filter data based on user role and district assignment.
- **Frontend Route Guards**: `ProtectedRoute` component validates roles and redirects unauthorized access.

## External Dependencies

- **UI Component Libraries**: `@radix-ui/*`, `cmdk`, `embla-carousel-react`, `lucide-react`, `recharts`
- **Form Management**: `react-hook-form`, `zod`, `@hookform/resolvers`
- **Styling and Theming**: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Date Handling**: `date-fns`
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Payment Processing**: `qrcode` (for UPI QR generation), HimKosh CTP, Razorpay, CCAvenue, PayU.