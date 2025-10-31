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
- **ANNEXURE-I Compliant Registration Form**: Complete 6-page multi-step form implementing HP Homestay Rules 2025:
  - **Page 1 - Property Details** (7 fields): Property name, address, district, pincode, location type (MC/TCP/GP), telephone, fax
  - **Page 2 - Owner Information** (4 fields): Owner name, mobile, email, Aadhaar (auto-filled from user account)
  - **Page 3 - Room Details & Category** (9 fields): Category (Diamond/Gold/Silver), proposed room rate, project type, property area, single/double/family rooms with sizes, attached washrooms, GSTIN (conditional: mandatory for Diamond/Gold, optional for Silver)
  - **Page 4 - Distances & Public Areas** (8 fields): 5 auto-filled distance fields (airport, railway, city center, shopping, bus stand) based on district with manual override, 3 public areas (lobby, dining, parking description)
  - **Page 5 - ANNEXURE-II Documents** (6 mandatory + photos): Revenue papers, affidavit under Section 29, undertaking in Form-C, register for verification, bill book, property photos (minimum 2)
  - **Page 6 - Amenities & Summary**: Wi-Fi, parking, air conditioning, hot water, room service, complimentary breakfast, additional facilities (eco-friendly, differently-abled, fire equipment, nearest hospital), dynamic fee summary with category badge and GST calculation
  - **Key Features**: District-based distance auto-population (15 districts), location-based fee calculation (MC/TCP/GP rates + 18% GST), conditional GSTIN validation, room count totals, maximum 12 beds validation, step-by-step validation blocking navigation until mandatory fields completed
- **Analytics Dashboard**: Provides government officers with insights into application trends, status distributions, category breakdowns, and processing times via Recharts.
- **Workflow Monitoring Dashboard**: Offers a real-time, visual pipeline of applications through six stages, with SLA tracking, smart notifications, bottleneck detection, and district performance analytics.
- **Multiple Payment Gateways**: Integrated payment system with five RBI-approved options:
  1. **HimKosh (HP CTP)**: Primary government payment gateway with AES-128-CBC encryption, direct integration with HP Cyber Treasury Portal
  2. **Razorpay**: Modern payment aggregator supporting 100+ payment modes (cards, UPI, net banking, wallets)
  3. **CCAvenue**: Comprehensive gateway with 200+ payment options, 18 language support, widely used by government portals
  4. **PayU**: Enterprise-grade gateway with smart routing for high success rates, 150+ payment modes
  5. **UPI QR Code**: Manual payment option via scannable QR codes for all UPI apps (hptourism.registration@sbi placeholder)
- **Production-Level Role-Based Access Control (RBAC)**: Comprehensive RBAC system with 4 distinct roles, each with specific permissions and UI/UX:
  - **Property Owner** (`property_owner`): Register homestays, submit applications, track status, update sent-back applications, make payments, download certificates
  - **District Officer** (`district_officer`): Review applications from assigned district only, approve/reject/send back, schedule inspections, verify payments, access analytics
  - **State Officer** (`state_officer`): Final approval authority, review all applications statewide, access comprehensive analytics, schedule inspections
  - **Admin** (`admin`): User management, role assignment, system configuration, full platform access

### System Design Choices

- **Monorepo Structure**: Organizes `client/`, `server/`, and `shared/` for type consistency.
- **Serverless-Ready Database**: Uses Neon PostgreSQL and Drizzle ORM for type-safe, persistent data storage.
- **Component-First UI**: Leverages Shadcn/ui for rapid development and consistent user experience.
- **Shared Schema Pattern**: Ensures type safety and prevents schema drift by defining database schemas once.
- **Session-Based Authentication**: Implements PostgreSQL-backed sessions for authentication and authorization, aligning with government security policies
  - **Current**: Password-based login (bcrypt hashing, 10 salt rounds)
  - **Planned**: Mobile OTP via NIC SMS Gateway for property owners, HP Government LDAP/Active Directory integration for officers
- **Query Cache Management**: TanStack Query cache automatically clears on logout to prevent role-switching bugs
- **Role-Specific APIs**: Backend endpoints filter data based on user role and district assignment
- **Frontend Route Guards**: `ProtectedRoute` component validates roles and redirects unauthorized access

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
- **HimKosh (HP CTP)**: Fully integrated with district-wise DDO routing, encryption logic implemented
  - **Production Credentials Configured**: DEPT_ID=CTO00-068, MERCHANT_CODE=HIMKOSH230, SERVICE_CODE=TSM, HEAD=1452-00-800-01
  - **District-wise DDO Routing**: Automatic DDO selection based on homestay district (15 districts seeded via server/seed.ts)
  - **DDO Mapping Examples**: Kullu → KLU00-532, Shimla → SML00-532, Chamba → CHM00-532
  - **Integration Status**: 
    - ✅ Auto-redirect to HimKosh portal working
    - ✅ Checksum calculation verified against eChallanED.dll (includes Service_code + return_url)
    - ✅ Date format corrected to DD-MM-YYYY (per government standard)
    - ✅ Encryption verified matching eChallanED.dll (RijndaelManaged/AES-128-CBC, MD5CryptoServiceProvider, ASCIIEncoding, PKCS7)
    - ✅ echallan.key file received and configured (32 bytes: 16-byte key + 16-byte IV)
    - ✅ Successfully POST encrypted data to HimKosh and reach payment form endpoint
    - ⏳ **BLOCKED: Awaiting return_url whitelist from NIC-HP**
  - **Reference Files Received from HP Government**:
    - `Dummy Code.txt`: C# code showing exact checksum format and integration flow
    - `eChallanED.dll`: .NET encryption library analyzed via `strings` command to verify algorithm match
  - **Checksum String Format** (verified from eChallanED.dll):
    ```
    DeptID=XXX|DeptRefNo=XXX|TotalAmount=XXX|TenderBy=XXX|AppRefNo=XXX|
    Head1=XXX|Amount1=XXX|Head2=XXX|Amount2=XXX|Ddo=XXX|
    PeriodFrom=DD-MM-YYYY|PeriodTo=DD-MM-YYYY|Service_code=XXX|return_url=XXX
    ```
  - **CRITICAL DISCOVERY - return_url Security Whitelist**:
    - The `return_url` field is NOT just for checksum integrity - it's a **security access control mechanism**
    - HimKosh server validates return_url against a merchant-specific whitelist after decryption
    - **Security Flow**: Decrypt request → Extract return_url → Check whitelist → If not whitelisted → Show blank payment form
    - **Current Blocker**: `https://osipl.dev/api/himkosh/callback` not yet whitelisted for MERCHANT_CODE: HIMKOSH230
    - **Required Action**: NIC-HP must whitelist development URL for testing: `https://osipl.dev/api/himkosh/callback`
    - **Production URL** (to be whitelisted later): `https://eservices.himachaltourism.gov.in/api/himkosh/callback`
  - **Encryption Implementation** (100% verified against DLL):
    - Algorithm: RijndaelManaged (AES-128-CBC mode)
    - Checksum: MD5CryptoServiceProvider (UPPERCASE hex output)
    - Encoding: ASCIIEncoding
    - Padding: PKCS7
    - Implementation: `server/himkosh/crypto.ts`
  - **Features**: HIMGRN tracking, Bank CIN support, encrypted request/response storage, district-specific revenue routing
  - **Security**: Only transaction metadata stored (no banking credentials)
  - **Deployment**: Published to https://osipl.dev/ for development testing
  - **Next Step**: Contact NIC-HP (dto-cyt-hp@nic.in) to whitelist return_url

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

## Database Seeding & Initialization

The system uses an idempotent seed script (`server/seed.ts`) that:
1. Creates the default admin user (Mobile: 9999999999, Password: admin123)
2. Seeds all 15 district DDO codes for district-wise payment routing
3. Can be safely rerun without duplicating data

**Run seed script manually**: `npx tsx server/seed.ts`

**DDO Codes by District** (15 total):
- Chamba: CHM00-532, Bharmour: CHM01-001
- Shimla: SML00-532, Shimla (Central): CTO00-068
- Kullu: KLU04-532, Kullu (Dhalpur): KLU00-532
- Kangra: KNG00-532, Kinnaur: KNR00-031
- Lahaul: LHL00-017, Lahaul-Spiti (Kaza): KZA00-011
- Mandi: MDI00-532, Pangi: PNG00-003
- Sirmour: SMR00-055, Solan: SOL00-046
- Hamirpur: HMR00-053

Each homestay payment automatically routes to the correct district DDO for revenue collection.