# Logogear Internal Portal

A secure, SSO-enabled internal web portal for Logogear employees to access internal tools and systems with centralized file processing capabilities.

## Features

- **Single Sign-On (SSO)** - OIDC/SAML integration with enterprise identity providers
- **Role-Based Access Control** - Granular permissions for applications and features
- **Application Catalog** - Centralized access to internal tools with SSO token passing
- **File Processing System** - Replace Excel macro workflows with server-side processing
- **Comprehensive Audit Logging** - Track all user actions and system events
- **Admin Console** - Manage applications, roles, and system configuration
- **Responsive Design** - Modern React frontend with mobile support

## Architecture

- **Backend**: Node.js/Express with TypeScript
- **Frontend**: React with TypeScript and Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Sessions**: Redis
- **File Storage**: Local/S3/Azure Blob/GCS support
- **Authentication**: Passport.js with OIDC/SAML strategies

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd logogear-internal-portal
```

2. Install dependencies:
```bash
npm install
cd frontend && npm install && cd ..
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npm run migrate
npm run db:seed
```

5. Start the development servers:
```bash
npm run dev
```

The backend will run on http://localhost:3006 and the frontend on http://localhost:3001.

## Environment Configuration

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for session encryption
- `JWT_SECRET` - Secret key for JWT token signing

### SSO Configuration

#### OIDC (OpenID Connect)
```env
OIDC_ISSUER_URL=https://your-idp.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_CALLBACK_URL=http://localhost:3000/auth/callback
```

#### SAML
```env
SAML_ENTRY_POINT=https://your-idp.com/saml/sso
SAML_ISSUER=logogear-portal
SAML_CALLBACK_URL=http://localhost:3000/auth/saml/callback
SAML_CERT="-----BEGIN CERTIFICATE-----\nYour IdP Certificate\n-----END CERTIFICATE-----"
```

### File Storage Configuration

#### Local Storage (Default)
```env
STORAGE_TYPE=local
STORAGE_BASE_PATH=./uploads
```

#### AWS S3
```env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=logogear-portal-files
```

## Development

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
```

### Database Operations
```bash
npm run migrate         # Run database migrations
npm run db:seed         # Seed database with initial data
```

### Building for Production
```bash
npm run build           # Build both backend and frontend
npm start               # Start production server
```

## API Documentation

### Authentication Endpoints
- `GET /auth/login` - Initiate SSO login
- `GET /auth/callback` - SSO callback handler
- `POST /auth/logout` - Logout and session cleanup

### Application Management
- `GET /api/applications` - List available applications
- `POST /api/applications` - Create new application (admin)
- `PUT /api/applications/:id` - Update application (admin)
- `DELETE /api/applications/:id` - Delete application (admin)

### File Processing
- `POST /api/files/upload` - Upload files to Datafiles area
- `POST /api/files/:id/process` - Trigger processing job
- `GET /api/jobs/:id/status` - Get job status
- `GET /api/files/processed` - List processed files

### User Management
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user preferences
- `GET /api/users/:id/roles` - Get user roles (admin)
- `POST /api/users/:id/roles` - Assign roles (admin)

## Security Features

- **HTTPS Enforcement** - All traffic encrypted in production
- **CSRF Protection** - Cross-site request forgery prevention
- **Rate Limiting** - API request throttling
- **Input Validation** - Zod schema validation
- **SQL Injection Prevention** - Prisma ORM parameterized queries
- **XSS Protection** - Content Security Policy headers
- **Session Security** - HttpOnly, Secure, SameSite cookies

## Monitoring and Logging

- **Structured Logging** - Winston with JSON format
- **Audit Trail** - All user actions logged
- **Health Checks** - `/health` endpoint for monitoring
- **Error Tracking** - Comprehensive error logging
- **Performance Metrics** - Request timing and database query logging

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## License

This project is proprietary software owned by Logogear. All rights reserved.

## Support

For technical support or questions, contact the IT team at it-support@logogear.co.in