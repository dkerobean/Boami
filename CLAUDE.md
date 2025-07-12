# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start the development server (Next.js)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Overview

Boami is an e-commerce management platform built with Next.js 14, TypeScript, and Material-UI. It provides comprehensive product management, order tracking, customer relationship management, and analytics capabilities.

## Architecture

### Tech Stack
- **Framework**: Next.js 14.2.7 with App Router
- **Language**: TypeScript 5.3.3
- **UI Library**: Material-UI v5 with Emotion styling
- **State Management**: Redux Toolkit with Redux Persist
- **Charts**: ApexCharts with react-apexcharts
- **Forms**: Formik with Yup validation
- **Data Tables**: TanStack React Table v8
- **Internationalization**: i18next with react-i18next

### Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (DashboardLayout)/        # Dashboard layout group
│   │   ├── apps/                 # Application pages (blog, calendar, ecommerce, etc.)
│   │   ├── charts/               # Chart components and pages
│   │   ├── dashboards/           # Dashboard pages (ecommerce, modern)
│   │   ├── forms/                # Form components and validation
│   │   ├── layout/               # Layout components (headers, sidebars, navigation)
│   │   ├── react-tables/         # React Table implementations
│   │   ├── tables/               # Basic table components
│   │   ├── ui-components/        # Reusable UI components
│   │   └── widgets/              # Dashboard widgets
│   ├── api/                      # API routes and mock data
│   ├── auth/                     # Authentication pages and forms
│   ├── components/               # Shared components organized by feature
│   ├── context/                  # React contexts (Invoice, Kanban)
│   └── frontend-pages/           # Public-facing pages
├── store/                        # Redux store configuration
│   ├── apps/                     # Feature-specific slices
│   └── customizer/               # Theme and layout customization
└── utils/                        # Utilities and theme configuration
    ├── languages/                # i18n translation files
    └── theme/                    # MUI theme configuration
```

### Key Features
- **Multi-layout Support**: Vertical sidebar and horizontal navigation layouts
- **Dark/Light Theme**: Complete theme switching with customizer
- **RTL Support**: Right-to-left language support
- **Responsive Design**: Mobile-first approach with MUI breakpoints
- **Component Library**: Extensive UI component collection
- **Mock Data**: Complete API simulation for development

### Layout System
The app uses a layout group `(DashboardLayout)` with configurable:
- Sidebar collapsed/expanded states
- Horizontal vs vertical navigation
- Theme customization (colors, typography, spacing)
- Layout modes (boxed, full-width)

### State Management
- Redux Toolkit for global state
- Redux Persist for state persistence
- Feature-specific slices for apps (blog, chat, ecommerce, etc.)
- Customizer slice for theme/layout preferences

### Component Patterns
- Shared components in `/components` organized by feature area
- Page-specific components co-located with their pages
- Custom MUI theme components with consistent styling
- Responsive design using MUI's sx prop and breakpoint system

### Development Notes
- Uses strict TypeScript configuration
- Path aliases configured: `@/*` maps to `src/*`
- Mock API data in `/api` folder for development
- No test framework currently configured
- ESLint configured with Next.js rules

## Project-Specific Development Rules

### 🔄 Project Awareness & Context
- Always read CLAUDE.md at the start of a new conversation to understand the project's architecture, goals, style, and constraints
- Use consistent naming conventions, file structure, and architecture patterns as described in this document
- Follow Next.js App Router conventions and MongoDB best practices
- Use environment variables for all database connections and sensitive configuration

### 🧱 Code Structure & Modularity
- Never create a React component file longer than 300 lines. If approaching this limit, refactor by splitting into smaller components or custom hooks
- Never create an API route file longer than 200 lines. Split large routes into separate handler functions or middleware
- Organize code into clearly separated modules, grouped by feature or responsibility:
  - `components/` - Reusable UI components
  - `app/api/` - API routes with clear resource-based naming
  - `lib/` - Utility functions and database connections
  - `models/` - MongoDB schemas and data models
  - `types/` - TypeScript type definitions
- Use clear, consistent imports (prefer absolute imports with `@/` alias)
- Use `.env.local` for environment variables and provide `.env.example` template

### 🗄️ Database & API Guidelines
- Use Mongoose for MongoDB operations with proper schema definitions
- Always define TypeScript interfaces that match Mongoose schemas
- API routes should follow RESTful conventions (`GET /api/users`, `POST /api/users`, etc.)
- Use proper HTTP status codes and error handling in all API routes
- Implement database connection pooling and proper connection management
- Always validate request data using Yup or similar validation library
- Use transactions for operations that modify multiple collections

### 🧪 Testing & Reliability
- Always create tests for new API routes using Jest and Supertest
- Create component tests using Jest and React Testing Library for complex components
- Tests should live in `__tests__/` folders or `.test.ts/.test.tsx` files alongside the code
- Include at least:
  - 1 test for expected use case
  - 1 edge case test
  - 1 error handling test
- Mock database operations in tests using jest.mock() or test database
- Test database operations with a separate test database

### ✅ Task Completion
- Update README.md when new features are added, dependencies change, or setup steps are modified
- Document new API endpoints in API documentation
- Update environment variable documentation when new config is added
- Add new sub-tasks or TODOs discovered during development

### 📎 Style & Conventions
- Use TypeScript as the primary language with strict type checking
- Follow React and Next.js best practices and conventions
- Use Prettier for code formatting and ESLint for code quality
- Component naming: PascalCase for components, camelCase for functions and variables
- Use descriptive names for MongoDB collections and fields (camelCase for fields)
- Write JSDoc comments for complex functions and all API route handlers:
```typescript
/**
 * Creates a new user in the database
 * @param userData - User data to create
 * @returns Promise<User> - Created user object
 * @throws {ValidationError} When user data is invalid
 */
```
- Use proper TypeScript types for all function parameters and return values
- Prefer async/await over Promise chains
- Use Material-UI components consistently with the established theme

### 📚 Documentation & Explainability
- Update README.md when new features are added or setup steps change
- Document all API endpoints with request/response examples
- Comment non-obvious code and ensure everything is understandable to a mid-level developer
- When writing complex logic, add inline `// Reason:` comments explaining the why, not just the what
- Maintain up-to-date environment variable documentation
- Document database schema changes and migration requirements

### 🧠 AI Behavior Rules
- Never assume missing context about database structure or API contracts
- Always verify MongoDB collection names and schema structure before writing queries
- Never hallucinate Next.js APIs or MongoDB methods – only use documented, verified approaches
- Always confirm file paths and import statements exist before referencing them
- Never delete or overwrite existing database schemas without explicit instruction
- Ask for clarification when database operations involve data migration or breaking changes
- Always use proper error handling for database operations and API routes
- Verify environment variables are properly configured before implementing features that depend on them