# HP Tourism Digital Ecosystem

## Overview

The HP Tourism Digital Ecosystem is a digital transformation platform designed to modernize Himachal Pradesh's tourism registration and management. It serves as both a public-facing tourism discovery platform and an administrative system for tourism operators. The platform manages various tourism registration types, with a key focus on implementing the "Himachal Pradesh Homestay Rules 2025" and its three-tier categorization (Diamond, Gold, Silver). The primary goal is to significantly reduce application processing times through automation and streamlined user experiences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend uses React 18+ with TypeScript and Vite. It leverages Shadcn/ui (built on Radix UI) for components, Tailwind CSS for styling with a mobile-first responsive approach, TanStack Query for server state, React Hook Form with Zod for forms, and Wouter for routing. The design philosophy blends clean workflows with accessible government portal standards.

### Backend

The backend is built with Node.js and Express.js, using TypeScript. It follows a RESTful API design. The development server integrates Vite with Express middleware for HMR. Session management will use Connect-pg-simple for PostgreSQL-backed storage. An abstracted `IStorage` interface allows for flexible data storage implementations, currently MemStorage for development, with Drizzle ORM planned for production.

### Data Storage

The project uses PostgreSQL via Neon's serverless driver and Drizzle ORM for type-safe queries. Schema definitions are shared between client and server for consistency, with Drizzle Kit handling migrations. The current schema includes user authentication and is designed to expand for property registrations, application workflows, and public listings. Drizzle-zod generates Zod schemas for consistent validation.

### Authentication and Authorization

The system plans to implement session-based authentication using Express sessions with PostgreSQL storage to allow for immediate access revocation and align with government IT security policies. User roles will include public tourists, property owners, tourism officers, and government administrators.

### Key Architectural Decisions

- **Monorepo Structure**: A single repository with `client/`, `server/`, and `shared/` directories for type consistency and streamlined development.
- **Serverless-Ready Database**: Neon PostgreSQL with WebSocket connections for deployment to serverless platforms.
- **Component-First UI Development**: Extensive use of Shadcn/ui for accelerated development, accessibility, and consistent UX.
- **Shared Schema Pattern**: Database schemas defined once in `shared/` and used by both client and server to prevent schema drift and ensure type safety.
- **Session-Based Auth over JWT**: PostgreSQL-backed sessions for better control over access revocation and alignment with government security policies.

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

### Development Tools

- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`

### Database

- `@neondatabase/serverless`
- `drizzle-orm`
- `drizzle-kit`