# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform aimed at modernizing Himachal Pradesh's tourism registration and management. It functions as both a public-facing tourism discovery portal and an administrative system for tourism operators. The platform focuses on managing various tourism registration types, particularly implementing the "Himachal Pradesh Homestay Rules 2025" with its three-tier categorization (Diamond, Gold, Silver). Its core objective is to significantly reduce application processing times through automation and streamlined user experiences. Key capabilities include a Public Tourism Discovery Platform, a Smart Compliance Hub for property owners, and an Analytics Dashboard for government officers. A notable feature is the Workflow Monitoring Dashboard, providing real-time application pipeline tracking and intelligent alerting.

## Recent Changes (October 26, 2025)

**File Metadata Capture & Grid Layout Enhancement**:
- Enhanced ObjectUploader to capture complete file metadata using File API (fileName, fileSize, mimeType, filePath)
- Fixed critical 0-byte file bug by returning UploadedFileMetadata[] array instead of string paths
- Updated backend validation schema to accept documents as metadata object array instead of nested structure
- Backend now saves actual file sizes and MIME types to documents table (e.g., "image/jpeg", "application/pdf")
- Redesigned document display with responsive 2-3 column grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Each document card displays file icon, truncated filename, document type, file size, and View button
- End-to-end testing confirms all 7 test documents saved with correct metadata and displayed in grid

**Document Upload System Complete**:
- Implemented ObjectUploader component for seamless file uploads to Replit object storage
- Component uses React refs (not IDs) to trigger file selection dialog, supporting multiple instances per page
- Uploads directly to object storage via presigned URLs from GET /api/upload-url endpoint
- Tracks upload progress and provides real-time feedback to users
- New application form now uses ObjectUploader for all document types:
  - Property Ownership Proof (required)
  - Aadhaar Card (required)
  - PAN Card (optional)
  - GST Certificate (optional)
  - Property Photos (minimum 5 required)
- Backend POST /api/applications endpoint saves document metadata to documents table
- Each document record stores: applicationId, documentType, fileName, filePath, fileSize, mimeType, uploadedAt
- Officers can view all uploaded documents on application detail page with "View" buttons to open files in new tabs
- Complete end-to-end flow: upload → object storage → database metadata → officer viewing

**Send-Back Workflow Implementation Complete**:
- Property owners can now see sent-back applications on their dashboard with a prominent red "Action Required" alert banner
- Dashboard displays a red "Sent Back" stat card showing count of applications needing attention
- Application cards show inline officer feedback and an "Update Application" button when status is "sent_back_for_corrections"
- Created new Update Application page at `/applications/:id/update` where owners can edit all fields and resubmit
- Update page displays officer feedback in a red alert, pre-populates form with existing data using useEffect hook
- Backend PATCH `/api/applications/:id` endpoint secured with role validation, only allows updates when status is "sent_back_for_corrections"
- Resubmission clears clarificationRequested field and resets status to "submitted"
- Fixed infinite re-render bug in Update page by moving form.reset() into useEffect
- Officer endpoints (send-back, move-to-inspection, complete-inspection) fixed by removing references to non-existent tables

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform uses a clean, professional design with HP Government branding, including official logos and a consistent teal-green accent. It features an accessible hero carousel with WCAG compliance and offers an 8-theme system for varied visual preferences, all with accessible color contrasts and smooth transitions. The design emphasizes clean workflows and adheres to government portal standards.

### Technical Implementations

The frontend is built with React 18+, TypeScript, and Vite, utilizing Shadcn/ui (Radix UI) for components, Tailwind CSS for mobile-first styling, TanStack Query for server state, React Hook Form with Zod for form management, and Wouter for routing. The backend uses Node.js and Express.js with TypeScript, following a RESTful API design. Session management is handled by Express sessions with PostgreSQL storage.

**Navigation Architecture**: Role-based sidebar navigation using Shadcn Sidebar component with persistent layout across protected pages. Property owners see Dashboard and New Application links; Officers see Workflow Monitoring and Analytics links. Route guards prevent unauthorized access using ProtectedRoute component with role validation.

### Feature Specifications

- **Public Tourism Discovery Platform**: Allows browsing and filtering of approved homestays with detailed property pages.
- **Smart Compliance Hub**: Enables property owners to register homestays, submit applications, and track status. Features role-specific navigation with persistent sidebar showing Dashboard and New Application links.
- **Analytics Dashboard**: Provides government officers with insights into application trends, status distributions, category breakdowns, and processing times via Recharts visualizations.
- **Workflow Monitoring Dashboard**: Offers a real-time, visual pipeline of applications through six stages, with SLA tracking, smart notifications, bottleneck detection, and district performance analytics.
- **Role-Based Access Control**: ProtectedRoute component validates user roles before rendering, redirects unauthorized users to their role-appropriate home page. Officer-only routes (/workflow-monitoring, /analytics) restricted to district_officer and state_officer roles. Property owner routes (/applications/new) restricted to property_owner role.

### System Design Choices

- **Monorepo Structure**: Organizes `client/`, `server/`, and `shared/` directories for type consistency.
- **Serverless-Ready Database**: Uses Neon PostgreSQL and Drizzle ORM for type-safe, persistent data storage, compatible with serverless deployments.
- **Component-First UI**: Leverages Shadcn/ui for rapid development, accessibility, and consistent user experience.
- **Shared Schema Pattern**: Ensures type safety and prevents schema drift by defining database schemas once in `shared/`.
- **Session-Based Authentication**: Implements PostgreSQL-backed sessions for authentication and authorization, aligning with government security policies for immediate access revocation. User roles include `property_owner`, `district_officer`, and `state_officer`.

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