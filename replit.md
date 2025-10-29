# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform designed to modernize tourism registration and management in Himachal Pradesh. It serves as both a public tourism discovery portal and an administrative system for operators, focusing on implementing the "Himachal Pradesh Homestay Rules 2025" with its three-tier categorization (Diamond, Gold, Silver). The platform aims to significantly reduce application processing times through automation and streamlined user experiences. Key capabilities include a Public Tourism Discovery Platform, a Smart Compliance Hub for property owners, an Analytics Dashboard for government officers, and an Admin User Management System, featuring a Workflow Monitoring Dashboard for real-time application tracking and intelligent alerting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform features a clean, professional design aligned with HP Government branding, including official logos and a consistent teal-green accent. It incorporates an accessible hero carousel compliant with WCAG standards and offers an 8-theme system with accessible color contrasts and smooth transitions. The design prioritizes clear workflows and adherence to government portal standards.

### Technical Implementations

The frontend utilizes React 18+, TypeScript, and Vite, with Shadcn/ui (Radix UI) for components, Tailwind CSS for mobile-first styling, TanStack Query for server state management, React Hook Form with Zod for form handling, and Wouter for routing. The backend is built with Node.js and Express.js in TypeScript, following a RESTful API design. Session management is handled by Express sessions with PostgreSQL storage. Role-based sidebar navigation and route guards enforce access control.

### Feature Specifications

- **Public Tourism Discovery Platform**: Allows browsing and filtering of approved homestays with detailed property pages.
- **Smart Compliance Hub**: Enables property owners to register homestays, submit applications, and track status with role-specific navigation.
- **Analytics Dashboard**: Provides government officers with insights into application trends, status distributions, category breakdowns, and processing times via Recharts.
- **Workflow Monitoring Dashboard**: Offers a real-time, visual pipeline of applications through six stages, with SLA tracking, smart notifications, bottleneck detection, and district performance analytics.
- **Multiple Payment Gateways**: Integrated payment system with five RBI-approved options:
  1. **HimKosh (HP CTP)**: Primary government payment gateway with AES-128-CBC encryption, direct integration with HP Cyber Treasury Portal
  2. **Razorpay**: Modern payment aggregator supporting 100+ payment modes (cards, UPI, net banking, wallets)
  3. **CCAvenue**: Comprehensive gateway with 200+ payment options, 18 language support, widely used by government portals
  4. **PayU**: Enterprise-grade gateway with smart routing for high success rates, 150+ payment modes
  5. **UPI QR Code**: Manual payment option via scannable QR codes for all UPI apps (hptourism.registration@sbi placeholder)
- **Role-Based Access Control**: `ProtectedRoute` component validates user roles, redirecting unauthorized users. Officer-only routes are restricted to `district_officer` and `state_officer` roles, while property owner routes are for `property_owner` roles.

### System Design Choices

- **Monorepo Structure**: Organizes `client/`, `server/`, and `shared/` for type consistency.
- **Serverless-Ready Database**: Uses Neon PostgreSQL and Drizzle ORM for type-safe, persistent data storage.
- **Component-First UI**: Leverages Shadcn/ui for rapid development and consistent user experience.
- **Shared Schema Pattern**: Ensures type safety and prevents schema drift by defining database schemas once.
- **Session-Based Authentication**: Implements PostgreSQL-backed sessions for authentication and authorization, aligning with government security policies. User roles include `property_owner`, `district_officer`, and `state_officer`.

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

### Database

- `@neondatabase/serverless`
- `drizzle-orm`
- `drizzle-kit`

### Payment Processing

- `qrcode` (UPI QR code generation)
- HimKosh CTP integration (AES-128-CBC encryption)
- Razorpay (requires API credentials)
- CCAvenue (requires merchant credentials)
- PayU (requires merchant credentials)

## Payment Gateway Integration Status

### Production Ready
- **HimKosh (HP CTP)**: Fully integrated with test mode, awaiting production credentials from NIC-HP
  - Required: Merchant Code, Department ID, Service Code, DDO Code, echallan.key file, Head of Account codes
  - Encryption: AES-128-CBC with MD5 checksums
  - Features: HIMGRN tracking, Bank CIN support, encrypted request/response storage
  - Security: Only transaction metadata stored (no banking credentials)

- **UPI QR Code**: Fully functional with scannable QR codes
  - Placeholder UPI ID: hptourism.registration@sbi (replace with official HP Tourism UPI)
  - Manual transaction ID submission and officer verification workflow

### Placeholder Pages Created (Awaiting Credentials)
- **Razorpay**: UI ready, requires Razorpay API Key & Secret
  - Supports: Credit/debit cards, UPI, net banking (58+ banks), wallets
  - Fee: 2% + GST for domestic, 3% + GST for international
  
- **CCAvenue**: UI ready, requires CCAvenue merchant credentials
  - Supports: 200+ payment options, 18 languages
  - Fee: 2% + GST, Annual maintenance: ₹1,200
  
- **PayU**: UI ready, requires PayU merchant credentials
  - Supports: 150+ payment modes, smart routing
  - Fee: 2% + GST domestic, 3% + GST international

## Data Security & Compliance

- **Transaction Data**: Only metadata stored (reference numbers, amounts, status, HIMGRN, Bank CIN)
- **No Sensitive Data**: No banking credentials, card numbers, or PINs stored in database
- **Retention**: Transaction data retained for 7-10 years for government audit requirements
- **Encryption**: All payment gateways use 128-bit SSL/TLS, PCI-DSS compliant, RBI approved