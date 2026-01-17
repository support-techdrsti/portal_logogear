# Logogear Internal Portal - Design Document

## Overview

The Logogear Internal Portal is a modern, secure web application that serves as a centralized gateway for employee access to internal tools and systems. Built on a microservices architecture with SSO integration, the portal provides role-based access control, comprehensive audit logging, and a centralized file processing system that replaces traditional Excel macro workflows.

The system architecture emphasizes security, scalability, and maintainability while providing seamless integration with existing identity providers and internal applications like the PIM system.

## Architecture

### High-Level Architecture

The portal follows a three-tier architecture with clear separation of concerns:

**Presentation Layer:**
- Modern responsive web application (React/Vue.js)
- Progressive Web App (PWA) capabilities for offline access
- Mobile-responsive design for tablet and smartphone access

**Application Layer:**
- RESTful API backend (Node.js/Express or Python/FastAPI)
- Authentication middleware for SSO integration
- Authorization middleware for RBAC enforcement
- Background job processing system (Redis Queue/Celery)

**Data Layer:**
- Primary database (PostgreSQL) for user data, roles, and audit logs
- Object storage (AWS S3/Azure Blob) for file processing workflows
- Redis cache for session management and job queuing

### Security Architecture

**Authentication Flow:**
1. User accesses portal → Redirect to IdP (OIDC/SAML)
2. IdP authenticates user → Returns JWT/SAML assertion
3. Portal validates token → Creates secure session
4. Subsequent requests use session cookies (httpOnly, secure)

**Authorization Model:**
- Role-Based Access Control (RBAC) with hierarchical permissions
- JWT tokens carry user identity and basic role information
- Fine-grained permissions stored in portal database
- Real-time permission evaluation for each request

## Components and Interfaces

### Core Components

**Authentication Service**
- Handles OIDC/SAML integration with configurable IdP
- Manages JWT token validation and refresh
- Implements session lifecycle management
- Supports single logout functionality

**Authorization Service**
- Enforces role-based access control
- Manages permission inheritance and delegation
- Provides real-time authorization decisions
- Integrates with audit logging for access tracking

**Application Catalog Service**
- Manages internal application registry
- Handles SSO token passing to integrated applications
- Provides application discovery and categorization
- Supports environment-specific application instances

**File Processing Service**
- Manages upload/download operations for Datafiles, Bluedart, and DC areas
- Orchestrates background processing jobs
- Implements business logic migration from Excel macros
- Provides job status tracking and error handling

**User Management Service**
- Synchronizes user data from IdP
- Manages user preferences and profile information
- Handles role assignments and permission mapping
- Provides user activity tracking

**Audit Service**
- Captures all user actions and system events
- Implements tamper-proof logging mechanisms
- Provides search and filtering capabilities
- Supports compliance reporting requirements

### External Interfaces

**Identity Provider Integration**
- OIDC/SAML 2.0 protocols for authentication
- User attribute synchronization (name, email, department, roles)
- Group membership mapping to portal roles
- Single logout support

**PIM Application Integration**
- SSO token passing for seamless authentication
- Deep-linking support for specific PIM functions
- Environment-specific endpoints (Production, Staging)
- Role-based feature visibility

**Object Storage Integration**
- File upload/download operations
- Hierarchical storage organization (Datafiles/Bluedart/DC)
- Metadata management and file versioning
- Secure access control and encryption

## Data Models

### Core Entities

**User Entity**
```
User {
  id: UUID (Primary Key)
  external_id: String (IdP subject identifier)
  email: String (Unique)
  name: String
  department: String
  status: Enum (ACTIVE, INACTIVE, SUSPENDED)
  preferences: JSON (timezone, language, theme)
  last_login: Timestamp
  created_at: Timestamp
  updated_at: Timestamp
}
```

**Role Entity**
```
Role {
  id: UUID (Primary Key)
  name: String (Unique)
  description: String
  is_system_role: Boolean
  created_at: Timestamp
  updated_at: Timestamp
}
```

**Application Entity**
```
Application {
  id: UUID (Primary Key)
  name: String
  code: String (Unique identifier)
  description: Text
  category: Enum (OPERATIONS, SALES, TECH, ADMIN)
  url: String (SSO launch URL)
  environment: Enum (PRODUCTION, STAGING, DEVELOPMENT)
  is_active: Boolean
  sso_config: JSON (SSO parameters)
  created_at: Timestamp
  updated_at: Timestamp
}
```

**File Processing Entities**
```
StorageLocation {
  id: UUID (Primary Key)
  name: Enum (DATAFILES, BLUEDART, DC)
  description: String
  base_path: String
  is_active: Boolean
}

DataFile {
  id: UUID (Primary Key)
  original_filename: String
  stored_path: String
  uploaded_by: UUID (Foreign Key → User.id)
  template_type: String (Optional)
  file_size: Integer
  mime_type: String
  status: Enum (READY, PROCESSING, PROCESSED, FAILED)
  uploaded_at: Timestamp
}

ProcessingJob {
  id: UUID (Primary Key)
  datafile_id: UUID (Foreign Key → DataFile.id)
  job_type: Enum (BLUEDART, DC)
  triggered_by: UUID (Foreign Key → User.id)
  status: Enum (PENDING, RUNNING, SUCCEEDED, FAILED)
  started_at: Timestamp
  completed_at: Timestamp (Nullable)
  error_log: Text (Nullable)
  processing_config: JSON
}

ProcessedFile {
  id: UUID (Primary Key)
  processing_job_id: UUID (Foreign Key → ProcessingJob.id)
  output_filename: String
  stored_path: String
  file_size: Integer
  created_at: Timestamp
}
```

### Relationship Models

**UserRole (Many-to-Many)**
```
UserRole {
  id: UUID (Primary Key)
  user_id: UUID (Foreign Key → User.id)
  role_id: UUID (Foreign Key → Role.id)
  assigned_by: UUID (Foreign Key → User.id)
  assigned_at: Timestamp
}
```

**ApplicationPermission**
```
ApplicationPermission {
  id: UUID (Primary Key)
  application_id: UUID (Foreign Key → Application.id)
  role_id: UUID (Foreign Key → Role.id)
  permission_level: Enum (VIEW, EDIT, ADMIN)
  created_at: Timestamp
}
```

**AuditLog**
```
AuditLog {
  id: UUID (Primary Key)
  user_id: UUID (Foreign Key → User.id, Nullable)
  event_type: Enum (LOGIN_SUCCESS, LOGIN_FAILURE, APP_LAUNCH, ROLE_CHANGE, FILE_UPLOAD, JOB_TRIGGER)
  resource_type: String (Optional)
  resource_id: UUID (Optional)
  details: JSON
  ip_address: String
  user_agent: String
  created_at: Timestamp
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication and Session Management Properties

**Property 1: Unauthenticated access redirects to IdP**
*For any* unauthenticated user accessing the portal, the system should redirect to the configured Identity Provider for authentication
**Validates: Requirements 1.1**

**Property 2: Valid authentication creates secure sessions**
*For any* valid IdP authentication response, the portal should create a secure session with proper JWT/SAML token handling
**Validates: Requirements 1.2**

**Property 3: SSO context preservation**
*For any* authenticated user launching an integrated application, the portal should pass SSO context without requiring re-authentication
**Validates: Requirements 1.3**

**Property 4: Logout session invalidation**
*For any* user logout action, the portal should invalidate the session and support single logout across integrated applications
**Validates: Requirements 1.4**

**Property 5: Authentication failure logging**
*For any* authentication failure, the portal should log the failure event and display appropriate error messages
**Validates: Requirements 1.5**

### Dashboard and User Interface Properties

**Property 6: Personalized welcome display**
*For any* successfully authenticated user, the dashboard should display a welcome section containing user name, role, and department information
**Validates: Requirements 2.1**

**Property 7: Permission-based quick links**
*For any* user dashboard load, the system should display quick links only to applications the user has permission to access
**Validates: Requirements 2.2**

**Property 8: System notification display**
*For any* existing system notifications, the dashboard should display alerts for maintenance windows, new features, and system updates
**Validates: Requirements 2.3**

**Property 9: Recent applications tracking**
*For any* user application access, the portal should update and maintain the recently accessed applications list
**Validates: Requirements 2.4**

**Property 10: Role-based content filtering**
*For any* dashboard content display, the system should filter information based on the user's assigned roles
**Validates: Requirements 2.5**

### Application Catalog Properties

**Property 11: Permission-based application visibility**
*For any* user accessing the applications hub, the system should display only applications the user has permission to access
**Validates: Requirements 3.1**

**Property 12: Complete application information display**
*For any* displayed application, the system should show name, description, category, and environment tags
**Validates: Requirements 3.2**

**Property 13: SSO-enabled application launch**
*For any* application launch by an authenticated user, the system should open the application in a new tab with proper SSO context
**Validates: Requirements 3.3**

**Property 14: Application categorization**
*For any* application catalog display, applications should be organized by categories (Operations, Sales, Tech, Admin)
**Validates: Requirements 3.4**

**Property 15: Environment distinction**
*For any* applications with multiple environments, the system should clearly distinguish between Production, UAT, and Development instances
**Validates: Requirements 3.5**

### PIM Integration Properties

**Property 16: Role-based PIM action visibility**
*For any* user with PIM permissions, the system should display role-appropriate quick actions (Search Product, Create Product, Bulk Upload)
**Validates: Requirements 4.2**

**Property 17: PIM deep-linking with SSO**
*For any* PIM action launch, the system should deep-link into the PIM application with proper SSO authentication
**Validates: Requirements 4.3**

**Property 18: PIM permission-based filtering**
*For any* PIM functionality display, the system should filter available actions based on the user's role permissions
**Validates: Requirements 4.4**

**Property 19: PIM environment access links**
*For any* available PIM environments, the system should provide separate access links for Production and Staging environments
**Validates: Requirements 4.5**

### User Profile and Preferences Properties

**Property 20: Complete profile information display**
*For any* user profile access, the system should display user information retrieved from the IdP including name, email, department, and role
**Validates: Requirements 5.1**

**Property 21: Role and permission visibility**
*For any* profile settings view, the system should show assigned roles and permissions within the portal and integrated applications
**Validates: Requirements 5.2**

**Property 22: Preference configuration capability**
*For any* user preference modification, the system should allow configuration of time zone, language, UI theme, and notification preferences
**Validates: Requirements 5.3**

**Property 23: Security information transparency**
*For any* security information display, the system should show last login time and recent activity
**Validates: Requirements 5.4**

**Property 24: Preference persistence round-trip**
*For any* user preference changes, saving and retrieving preferences should preserve the configured values
**Validates: Requirements 5.5**

### Administrative Properties

**Property 25: Admin access control**
*For any* admin console access attempt, the system should verify admin role permissions before granting access
**Validates: Requirements 6.1**

**Property 26: Application management capabilities**
*For any* admin managing applications, the system should allow adding, editing, and removing applications including SSO parameter configuration
**Validates: Requirements 6.2**

**Property 27: Application configuration completeness**
*For any* application configuration, the system should enable setting of deep links, environment tags, and access requirements
**Validates: Requirements 6.3**

**Property 28: Application configuration validation**
*For any* application modification, the system should validate configuration parameters and update the application catalog
**Validates: Requirements 6.4**

**Property 29: Real-time application updates**
*For any* application changes saved by admins, the system should immediately reflect updates in the user-facing application hub
**Validates: Requirements 6.5**

**Property 30: Role management operations**
*For any* admin managing roles, the system should allow creation, modification, and deletion of role definitions
**Validates: Requirements 7.1**

**Property 31: Permission assignment functionality**
*For any* permission assignment, the system should enable mapping of roles to specific applications and permission levels
**Validates: Requirements 7.2**

**Property 32: Admin role preservation**
*For any* role modification attempt, the system should validate that at least one admin role exists before allowing changes
**Validates: Requirements 7.3**

**Property 33: Real-time permission updates**
*For any* user permission updates, the system should immediately apply changes to user access without requiring re-login
**Validates: Requirements 7.4**

**Property 34: Role mapping visibility**
*For any* role information display, the system should show clear mapping between roles, users, and application permissions
**Validates: Requirements 7.5**

### Audit and Logging Properties

**Property 35: Comprehensive action logging**
*For any* user actions (login attempts, application launches, permission changes), the system should generate appropriate audit logs
**Validates: Requirements 8.1**

**Property 36: Complete audit log information**
*For any* audit event, the system should record user identity, timestamp, IP address, user agent, and event details
**Validates: Requirements 8.2**

**Property 37: Audit log query capabilities**
*For any* admin viewing audit logs, the system should provide filtering and search capabilities by user, event type, and time range
**Validates: Requirements 8.3**

**Property 38: Audit log immutability**
*For any* audit log entries, non-admin users should be unable to modify existing audit logs
**Validates: Requirements 8.4**

**Property 39: Sensitive data masking**
*For any* audit information display, the system should mask sensitive data while maintaining investigative value
**Validates: Requirements 8.5**

### System Configuration Properties

**Property 40: SSO configuration capability**
*For any* SSO configuration by admins, the system should allow setting of IdP connection parameters and authentication protocols
**Validates: Requirements 9.1**

**Property 41: Branding customization**
*For any* branding updates, the system should enable customization of logos, colors, and themes aligned with corporate identity
**Validates: Requirements 9.2**

**Property 42: Configuration parameter validation**
*For any* system settings changes, the system should validate configuration parameters before applying changes
**Validates: Requirements 9.3**

**Property 43: Hot configuration updates**
*For any* configuration updates, the system should apply changes without requiring system restart where possible
**Validates: Requirements 9.4**

**Property 44: Configuration documentation and feedback**
*For any* configuration option display, the system should provide clear documentation and validation feedback
**Validates: Requirements 9.5**

### File Processing Properties

**Property 45: File upload with metadata tracking**
*For any* user file upload, the system should store files in the Datafiles storage area with complete metadata tracking
**Validates: Requirements 10.1**

**Property 46: Template type specification**
*For any* file upload, the system should allow users to specify template types for different processing logic variants
**Validates: Requirements 10.2**

**Property 47: File validation and metadata storage**
*For any* uploaded file, the system should validate file formats and store upload metadata in the database
**Validates: Requirements 10.3**

**Property 48: Processing option availability**
*For any* eligible files, the system should display available Bluedart and DC processing buttons based on file eligibility
**Validates: Requirements 10.4**

**Property 49: Asynchronous job creation**
*For any* processing trigger, the system should create asynchronous processing jobs without blocking the user interface
**Validates: Requirements 10.5**

**Property 50: Real-time job status display**
*For any* running processing jobs, the system should display real-time status updates including Pending, Running, Succeeded, and Failed states
**Validates: Requirements 11.1**

**Property 51: Successful processing output handling**
*For any* successfully completed processing, the system should store output files in appropriate Bluedart or DC storage areas
**Validates: Requirements 11.2**

**Property 52: Processing failure error handling**
*For any* processing failures, the system should display error messages and logs to help users understand and resolve issues
**Validates: Requirements 11.3**

**Property 53: Processed file metadata display**
*For any* processed file viewing, the system should show originating input file, processing time, triggering user, and job status
**Validates: Requirements 11.4**

**Property 54: Output file download capability**
*For any* files in Bluedart and DC storage locations, the system should provide download capabilities for authorized users
**Validates: Requirements 11.5**

**Property 55: Storage location management**
*For any* storage configuration by admins, the system should allow definition and management of Datafiles, Bluedart, and DC storage locations
**Validates: Requirements 12.1**

**Property 56: Processing logic configuration**
*For any* processing logic management, the system should enable admins to configure template types and associated business rules
**Validates: Requirements 12.2**

**Property 57: System health monitoring**
*For any* system monitoring by admins, the system should provide processing job statistics and failure analysis
**Validates: Requirements 12.3**

**Property 58: Storage configuration validation**
*For any* storage area modifications, the system should validate storage configurations and update system settings
**Validates: Requirements 12.4**

**Property 59: Processing rule backward compatibility**
*For any* processing rule changes, the system should ensure backward compatibility with existing uploaded files
**Validates: Requirements 12.5**

### Help and Documentation Properties

**Property 60: Documentation link functionality**
*For any* documentation needs, the system should provide functional links to internal documentation systems and support resources
**Validates: Requirements 13.2**

**Property 61: Help content organization**
*For any* help content display, the system should organize information by topic and user role relevance
**Validates: Requirements 13.4**

**Property 62: Support resource usage tracking**
*For any* support resource access, the system should track usage for continuous improvement of help content
**Validates: Requirements 13.5**

## Error Handling

### Authentication Errors
- Invalid IdP responses should result in clear error messages and audit log entries
- Network failures during SSO should provide fallback mechanisms and user guidance
- Token expiration should trigger automatic refresh or re-authentication flows

### Authorization Errors
- Insufficient permissions should result in HTTP 403 responses with clear messaging
- Role changes should be applied immediately without requiring user session restart
- Permission inheritance conflicts should be resolved using explicit role hierarchy

### File Processing Errors
- Invalid file formats should be rejected with specific validation error messages
- Processing job failures should be logged with detailed error information and recovery suggestions
- Storage quota exceeded should trigger admin notifications and user guidance

### System Configuration Errors
- Invalid SSO configuration should prevent system startup with clear diagnostic messages
- Database connection failures should trigger circuit breaker patterns and graceful degradation
- Missing required environment variables should be detected at startup with helpful error messages

## Testing Strategy

### Unit Testing Approach
The system will implement comprehensive unit tests using Jest (for Node.js) or pytest (for Python) to verify:
- Individual component functionality and business logic
- Error handling and edge cases for each service
- Database operations and data validation
- API endpoint behavior and response formatting

Unit tests will focus on:
- Authentication service token validation and session management
- Authorization service permission evaluation logic
- File processing service upload/download operations
- User management service profile and preference handling
- Audit service log generation and querying

### Property-Based Testing Approach
The system will implement property-based testing using fast-check (for JavaScript) or Hypothesis (for Python) with a minimum of 100 iterations per property test to verify universal correctness properties.

Each property-based test will:
- Be tagged with a comment explicitly referencing the correctness property from this design document
- Use the format: **Feature: logogear-internal-portal, Property {number}: {property_text}**
- Generate diverse test inputs to validate behavior across the entire input space
- Focus on invariants, round-trip properties, and metamorphic relationships

Property-based tests will cover:
- Authentication flows with various IdP response formats
- Permission evaluation with different role combinations
- File processing workflows with diverse file types and sizes
- User interface rendering with various user profiles and permissions
- Audit logging with different event types and user contexts

### Integration Testing
- End-to-end SSO flows with mock IdP services
- Database transaction integrity across service boundaries
- File processing pipeline from upload through completion
- Real-time notification and status update mechanisms

### Security Testing
- Penetration testing for authentication bypass attempts
- Authorization testing with privilege escalation scenarios
- Input validation testing with malicious payloads
- Session management testing for security vulnerabilities

The dual testing approach ensures both concrete functionality verification through unit tests and universal correctness validation through property-based testing, providing comprehensive coverage for the portal's complex authentication, authorization, and file processing workflows.