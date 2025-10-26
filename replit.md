# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform aimed at modernizing Himachal Pradesh's tourism registration and management. It functions as both a public-facing tourism discovery portal and an administrative system for tourism operators. The platform focuses on managing various tourism registration types, particularly implementing the "Himachal Pradesh Homestay Rules 2025" with its three-tier categorization (Diamond, Gold, Silver). Its core objective is to significantly reduce application processing times through automation and streamlined user experiences. Key capabilities include a Public Tourism Discovery Platform, a Smart Compliance Hub for property owners, and an Analytics Dashboard for government officers. A notable feature is the Workflow Monitoring Dashboard, providing real-time application pipeline tracking and intelligent alerting.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform uses a clean, professional design with HP Government branding, including official logos and a consistent teal-green accent. It features an accessible hero carousel with WCAG compliance and offers an 8-theme system for varied visual preferences, all with accessible color contrasts and smooth transitions. The design emphasizes clean workflows and adheres to government portal standards.

### Technical Implementations

The frontend is built with React 18+, TypeScript, and Vite, utilizing Shadcn/ui (Radix UI) for components, Tailwind CSS for mobile-first styling, TanStack Query for server state, React Hook Form with Zod for form management, and Wouter for routing. The backend uses Node.js and Express.js with TypeScript, following a RESTful API design. Session management is handled by Express sessions with PostgreSQL storage.

### Feature Specifications

- **Public Tourism Discovery Platform**: Allows browsing and filtering of approved homestays with detailed property pages.
- **Smart Compliance Hub**: Enables property owners to register homestays, submit applications, and track status.
- **Analytics Dashboard**: Provides government officers with insights into application trends, status distributions, category breakdowns, and processing times via Recharts visualizations.
- **Workflow Monitoring Dashboard**: Offers a real-time, visual pipeline of applications through six stages, with SLA tracking, smart notifications, bottleneck detection, and district performance analytics.

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