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
- **Dealing Assistant (DA) Workflow**: Includes a DA Dashboard with district-specific application queues, an enhanced document scrutiny interface with split-screen view, verification checklists, and secure, role-based backend API routes for managing application review and forwarding processes. This also encompasses inspection order management, allowing DAs to view assigned inspections and submit detailed reports.

### System Design Choices

- **Monorepo Structure**: Organizes `client/`, `server/`, and `shared/` for enhanced type consistency and code management.
- **Serverless-Ready Database**: Utilizes Neon PostgreSQL and Drizzle ORM for type-safe and scalable data storage.
- **Component-First UI**: Leverages Shadcn/ui for rapid and consistent UI development.
- **Shared Schema Pattern**: Ensures type safety and prevents schema drift across frontend and backend.
- **Session-Based Authentication**: Implements PostgreSQL-backed sessions for authentication, with future plans for Mobile OTP and LDAP/Active Directory integration.
- **Query Cache Management**: TanStack Query cache is automatically invalidated on logout to maintain data integrity.
- **Role-Specific APIs**: Backend endpoints are designed to filter data based on user role and district assignment, ensuring secure and relevant data access.
- **Frontend Route Guards**: `ProtectedRoute` component validates user roles and redirects unauthorized access, enhancing security and user experience.

## External Dependencies

- **UI Component Libraries**: `@radix-ui/*`, `cmdk`, `embla-carousel-react`, `lucide-react`, `recharts`
- **Form Management**: `react-hook-form`, `zod`, `@hookform/resolvers`
- **Styling and Theming**: `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Date Handling**: `date-fns`
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Payment Processing**: `qrcode` (for UPI QR generation), HimKosh CTP, Razorpay, CCAvenue, PayU.