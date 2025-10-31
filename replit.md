# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform for modernizing tourism registration and management in Himachal Pradesh. It serves as both a public tourism discovery portal and an administrative system for operators, focusing on implementing the "Himachal Pradesh Homestay Rules 2025" with its three-tier categorization (Diamond, Gold, Silver). The platform aims to significantly reduce application processing times through automation and streamlined user experiences. Key capabilities include a Public Tourism Discovery Platform, a Smart Compliance Hub for property owners, an Analytics Dashboard for government officers, and an Admin User Management System with a Workflow Monitoring Dashboard for real-time application tracking and intelligent alerting.

## User Preferences

Preferred communication style: Simple, everyday language.

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