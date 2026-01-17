# STEERING_REPOSITORY_STRUCTURE

**Document Type:** Company Governance Standard  
**Version:** 1.0  
**Effective Date:** 2026-01-13  
**Authority:** Principal Architect  
**Scope:** All source code repositories and project organization

## Purpose

This document establishes mandatory standards for repository structure, naming conventions, and ownership to ensure consistency, maintainability, and efficient collaboration across all Logogear development projects.

## Scope

This standard applies to:
- All Git repositories (GitHub, GitLab, etc.)
- Monorepo and multi-repo architectures
- Open source and proprietary projects
- Documentation repositories
- Infrastructure as Code repositories

## Mandatory Standards

### Repository Naming Convention
```
# Format: {organization}-{project-type}-{descriptive-name}
logogear-portal-internal          # Internal web portal
logogear-api-customer-service     # Customer service API
logogear-lib-shared-components    # Shared component library
logogear-infra-aws-deployment     # AWS infrastructure code
logogear-docs-engineering-guides  # Engineering documentation
```

### Standard Repository Structure
```
project-root/
├── .github/                    # GitHub-specific files
│   ├── workflows/             # CI/CD workflows
│   ├── ISSUE_TEMPLATE/        # Issue templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS             # Code ownership
├── .kiro/                     # Kiro IDE configuration
│   ├── steering/              # Company steering documents
│   ├── specs/                 # Feature specifications
│   ├── hooks/                 # Development hooks
│   └── settings/              # IDE settings
├── backend/                   # Backend application (if applicable)
│   ├── src/                   # Source code
│   ├── tests/                 # Test files
│   ├── docs/                  # API documentation
│   ├── package.json           # Dependencies
│   └── tsconfig.json          # TypeScript config
├── frontend/                  # Frontend application (if applicable)
│   ├── src/                   # Source code
│   ├── public/                # Static assets
│   ├── tests/                 # Test files
│   ├── package.json           # Dependencies
│   └── vite.config.ts         # Build configuration
├── database/                  # Database schemas and migrations
│   ├── migrations/            # Database migrations
│   ├── seeds/                 # Seed data
│   └── schema.prisma          # Database schema
├── deployment/                # Deployment configurations
│   ├── docker/                # Docker files
│   ├── kubernetes/            # K8s manifests
│   ├── scripts/               # Deployment scripts
│   └── environments/          # Environment configs
├── docs/                      # Project documentation
│   ├── api/                   # API documentation
│   ├── architecture/          # Architecture diagrams
│   ├── deployment/            # Deployment guides
│   └── user/                  # User documentation
├── scripts/                   # Utility scripts
│   ├── setup/                 # Setup scripts
│   ├── build/                 # Build scripts
│   └── maintenance/           # Maintenance scripts
├── tests/                     # Integration and E2E tests
│   ├── integration/           # Integration tests
│   ├── e2e/                   # End-to-end tests
│   └── fixtures/              # Test fixtures
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── .gitattributes             # Git attributes
├── README.md                  # Project overview
├── CHANGELOG.md               # Version history
├── CONTRIBUTING.md            # Contribution guidelines
├── LICENSE                    # License information
├── package.json               # Root package configuration
└── docker-compose.yml         # Local development setup
```

### File Naming Conventions

#### Source Code Files
- **TypeScript/JavaScript:** camelCase for files, PascalCase for classes/components
  ```
  userService.ts              # Service files
  UserProfile.tsx             # React components
  authMiddleware.ts           # Middleware files
  databaseConnection.ts       # Utility files
  ```

- **Configuration Files:** kebab-case with descriptive names
  ```
  docker-compose.yml          # Docker configuration
  nginx.prod.conf             # Production nginx config
  jest.config.js              # Test configuration
  tailwind.config.js          # Styling configuration
  ```

- **Documentation Files:** UPPERCASE for root-level, kebab-case for nested
  ```
  README.md                   # Root documentation
  CONTRIBUTING.md             # Contribution guide
  CHANGELOG.md                # Version history
  docs/api-reference.md       # Nested documentation
  docs/deployment-guide.md    # Deployment documentation
  ```

#### Directory Naming
- **kebab-case** for all directories
- Descriptive names that indicate purpose
- Consistent naming across projects

```
user-management/            # Feature directories
file-processing/            # Business domain directories
shared-components/          # Shared code directories
integration-tests/          # Test directories
deployment-scripts/         # Script directories
```

### Mandatory Root Files

#### README.md Template
```markdown
# Project Name

Brief description of the project and its purpose.

## Features

- Key feature 1
- Key feature 2
- Key feature 3

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### Installation
```bash
# Clone repository
git clone <repository-url>
cd project-name

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start development
npm run dev
```

## Architecture

Brief overview of system architecture.

## Development

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:e2e            # Run end-to-end tests
```

### Building for Production
```bash
npm run build               # Build application
npm start                   # Start production server
```

## Deployment

Link to deployment documentation in docs/ directory.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

This project is proprietary software owned by Logogear Solutions LLP.
```

#### CONTRIBUTING.md Template
```markdown
# Contributing Guidelines

## Development Setup

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Code Standards

- Follow TypeScript strict mode
- Use ESLint and Prettier for formatting
- Write tests for new functionality
- Update documentation as needed

## Pull Request Process

1. Ensure all tests pass
2. Update README.md if needed
3. Add entry to CHANGELOG.md
4. Request review from code owners
5. Address review feedback

## Code Review Checklist

- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance impact considered
```

#### .gitignore Template
```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary files
tmp/
temp/
*.tmp

# Database
*.sqlite
*.db

# Uploads and generated files
uploads/
output/
generated/
```

### Branch Naming Convention
```
# Feature branches
feature/user-authentication
feature/file-processing-api
feature/dashboard-redesign

# Bug fix branches
bugfix/login-validation-error
bugfix/memory-leak-fix
bugfix/cors-configuration

# Hotfix branches
hotfix/security-vulnerability
hotfix/production-crash-fix

# Release branches
release/v1.2.0
release/v2.0.0-beta

# Maintenance branches
maintenance/dependency-updates
maintenance/documentation-update
```

### Commit Message Convention
```
# Format: type(scope): description

feat(auth): add JWT token refresh mechanism
fix(api): resolve database connection timeout
docs(readme): update installation instructions
style(frontend): apply consistent code formatting
refactor(services): extract common validation logic
test(auth): add unit tests for login flow
chore(deps): update dependencies to latest versions

# Breaking changes
feat(api)!: change user authentication endpoint structure

BREAKING CHANGE: The /auth/login endpoint now returns different response format
```

## Ownership and Responsibility

### CODEOWNERS File
```
# Global owners
* @logogear-solutions/engineering-leads

# Backend code
/backend/ @logogear-solutions/backend-team
/database/ @logogear-solutions/backend-team

# Frontend code
/frontend/ @logogear-solutions/frontend-team

# Infrastructure
/deployment/ @logogear-solutions/devops-team
/scripts/ @logogear-solutions/devops-team

# Documentation
/docs/ @logogear-solutions/tech-writers

# Configuration
/.github/ @logogear-solutions/engineering-leads
/.kiro/ @logogear-solutions/engineering-leads
```

### Team Responsibilities
- **Engineering Leads:** Overall architecture, standards compliance, security review
- **Backend Team:** API development, database design, business logic
- **Frontend Team:** User interface, user experience, client-side logic
- **DevOps Team:** Infrastructure, deployment, monitoring, security
- **QA Team:** Test strategy, quality assurance, automation
- **Tech Writers:** Documentation, user guides, API documentation

## Recommended Practices

### Repository Organization
- Use monorepo structure for related services
- Separate repositories for independent services
- Create template repositories for common project types
- Implement consistent CI/CD across repositories

### Documentation Strategy
- Keep README.md concise and actionable
- Maintain comprehensive documentation in docs/ directory
- Use inline code comments for complex business logic
- Generate API documentation from code annotations

### Version Control Best Practices
- Use semantic versioning (SemVer) for releases
- Tag releases with proper version numbers
- Maintain CHANGELOG.md with release notes
- Use protected branches for main/master
- Require pull request reviews for all changes

### Security Considerations
- Never commit secrets or sensitive data
- Use .gitignore to exclude sensitive files
- Implement branch protection rules
- Enable security scanning and dependency checks
- Regular security audits of repository access

## Prohibited Practices

### Repository Anti-patterns
- **PROHIBITED:** Committing secrets, API keys, or passwords
- **PROHIBITED:** Large binary files without Git LFS
- **PROHIBITED:** Inconsistent directory structures across projects
- **PROHIBITED:** Missing or outdated documentation
- **PROHIBITED:** Unclear or non-descriptive commit messages
- **PROHIBITED:** Direct commits to main/master branch
- **PROHIBITED:** Mixing unrelated changes in single commits

### Naming Violations
- **PROHIBITED:** Special characters in file/directory names
- **PROHIBITED:** Spaces in file/directory names
- **PROHIBITED:** Inconsistent naming conventions within project
- **PROHIBITED:** Abbreviations without clear meaning
- **PROHIBITED:** Non-English names for shared repositories

## Compliance Requirements

### Repository Setup Checklist
- [ ] Repository name follows naming convention
- [ ] Standard directory structure implemented
- [ ] README.md created with project overview
- [ ] CONTRIBUTING.md with development guidelines
- [ ] .gitignore configured for project type
- [ ] CODEOWNERS file configured
- [ ] Branch protection rules enabled
- [ ] CI/CD workflows configured
- [ ] Security scanning enabled
- [ ] License file included

### Maintenance Requirements
- [ ] Regular dependency updates
- [ ] Documentation kept current
- [ ] CHANGELOG.md updated with releases
- [ ] Dead code removed regularly
- [ ] Security vulnerabilities addressed promptly
- [ ] Performance monitoring implemented
- [ ] Backup and recovery procedures documented

## Enforcement

Violations of this standard will result in:
1. **Repository Audit:** Non-compliant repositories subject to audit
2. **Access Restriction:** Repositories may have access restricted until compliant
3. **Code Review Rejection:** Non-compliant changes will not be merged
4. **Training Requirements:** Teams must complete training for repeated violations

## Document Control

- **Next Review Date:** 2026-07-13
- **Document Owner:** Principal Architect
- **Approval Authority:** CTO
- **Distribution:** All development teams, DevOps teams, project managers