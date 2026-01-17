# STEERING_WEBSITE_STANDARD

**Document Type:** Company Governance Standard  
**Version:** 1.0  
**Effective Date:** 2026-01-13  
**Authority:** Principal Architect  
**Scope:** All frontend web applications and user interfaces

## Purpose

This document establishes mandatory standards for frontend web application development across all Logogear projects to ensure consistency, maintainability, and performance.

## Scope

This standard applies to:
- All React-based web applications
- Internal portals and dashboards
- Customer-facing web interfaces
- Progressive web applications (PWAs)

## Mandatory Standards

### Project Structure
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (buttons, inputs)
│   │   └── layout/         # Layout components (header, sidebar)
│   ├── pages/              # Route-level page components
│   ├── store/              # State management (Zustand/Redux)
│   ├── utils/              # Utility functions and helpers
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── assets/             # Static assets (images, fonts)
├── public/                 # Public static files
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── vite.config.ts          # Build tool configuration
```

### Naming Conventions
- **Components:** PascalCase (e.g., `UserProfile.tsx`, `DataTable.tsx`)
- **Files:** kebab-case for non-components (e.g., `api-client.ts`, `auth-utils.ts`)
- **Directories:** kebab-case (e.g., `user-management/`, `file-processing/`)
- **CSS Classes:** Tailwind utility classes preferred, custom classes in kebab-case
- **Constants:** UPPER_SNAKE_CASE (e.g., `API_BASE_URL`, `MAX_FILE_SIZE`)

### Technology Stack Requirements
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite (mandatory for new projects)
- **Styling:** Tailwind CSS 3+ (mandatory)
- **State Management:** Zustand (preferred) or Redux Toolkit
- **Routing:** React Router v6+
- **HTTP Client:** Axios or native fetch with proper error handling
- **Form Handling:** React Hook Form with Zod validation

### Component Standards
- All components MUST be functional components with hooks
- Components MUST have TypeScript interfaces for props
- Components MUST be exported as default exports
- Reusable components MUST be documented with JSDoc comments
- Components MUST handle loading and error states appropriately

### Accessibility Requirements
- All interactive elements MUST have proper ARIA labels
- Color contrast MUST meet WCAG 2.1 AA standards (4.5:1 minimum)
- All forms MUST have proper labels and error messages
- Keyboard navigation MUST be fully functional
- Screen reader compatibility MUST be tested

### Performance Standards
- Initial page load MUST be under 3 seconds on 3G networks
- Largest Contentful Paint (LCP) MUST be under 2.5 seconds
- First Input Delay (FID) MUST be under 100ms
- Cumulative Layout Shift (CLS) MUST be under 0.1
- Bundle size MUST be optimized with code splitting

## Recommended Practices

### Code Organization
- Group related components in feature-based directories
- Use custom hooks for complex state logic
- Implement proper error boundaries
- Use React.memo() for expensive components
- Implement proper loading states with skeleton screens

### Testing Strategy
- Unit tests for utility functions and custom hooks
- Component testing with React Testing Library
- Integration tests for critical user flows
- Visual regression testing for UI components
- Accessibility testing with axe-core

### Development Workflow
- Use ESLint and Prettier for code formatting
- Implement pre-commit hooks with Husky
- Use Storybook for component documentation
- Implement proper TypeScript strict mode
- Use environment-specific configuration files

## Prohibited Practices

### Anti-patterns
- **PROHIBITED:** Class components (use functional components only)
- **PROHIBITED:** Inline styles (use Tailwind classes or CSS modules)
- **PROHIBITED:** Direct DOM manipulation (use React refs when necessary)
- **PROHIBITED:** Global CSS without scoping (use Tailwind or CSS modules)
- **PROHIBITED:** Hardcoded API endpoints (use environment variables)
- **PROHIBITED:** Unhandled promise rejections in async operations
- **PROHIBITED:** Missing error boundaries in production applications
- **PROHIBITED:** Accessibility violations (automated testing required)

### Security Violations
- **PROHIBITED:** Storing sensitive data in localStorage without encryption
- **PROHIBITED:** Exposing API keys or secrets in frontend code
- **PROHIBITED:** Missing input sanitization for user-generated content
- **PROHIBITED:** Insecure HTTP requests in production environments

## Compliance Requirements

### Code Review Checklist
- [ ] TypeScript strict mode enabled with no `any` types
- [ ] All components have proper prop interfaces
- [ ] Error handling implemented for all async operations
- [ ] Accessibility requirements met (ARIA labels, keyboard navigation)
- [ ] Performance budgets respected (bundle size, load times)
- [ ] Security best practices followed (no exposed secrets)
- [ ] Responsive design implemented for mobile devices
- [ ] Cross-browser compatibility tested (Chrome, Firefox, Safari, Edge)

### Deployment Requirements
- Production builds MUST be optimized and minified
- Source maps MUST be generated for debugging
- Environment variables MUST be properly configured
- HTTPS MUST be enforced in production
- Content Security Policy (CSP) headers MUST be implemented
- Performance monitoring MUST be integrated

## Enforcement

Violations of this standard will result in:
1. **Code Review Rejection:** Non-compliant code will not be merged
2. **Architecture Review:** Major violations require architecture team review
3. **Training Requirements:** Teams must complete training for repeated violations
4. **Project Audit:** Projects may be subject to comprehensive compliance audits

## Document Control

- **Next Review Date:** 2026-07-13
- **Document Owner:** Principal Architect
- **Approval Authority:** CTO
- **Distribution:** All development teams, project managers, QA teams