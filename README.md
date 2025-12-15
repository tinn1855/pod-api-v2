# POD Management API v2

A comprehensive backend API for POD (Project/Organization/Department) Management System built with NestJS, featuring secure authentication, role-based access control (RBAC), and user management.

## 🚀 Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Authorization**: Role-Based Access Control (RBAC) with Permissions
- **Validation**: class-validator & class-transformer
- **Documentation**: Swagger/OpenAPI
- **Email**: Nodemailer (SMTP)
- **Password Hashing**: bcrypt

## ✨ Key Features

### 🔐 Authentication & Authorization

- **JWT-based Authentication**: Secure token-based authentication
- **Dual Token System**:
  - **Access Tokens**: Normal authentication tokens for API access
  - **Temporary Tokens**: Short-lived tokens (5-10 minutes) for forced password changes
- **Role-Based Access Control (RBAC)**: Fine-grained permission system
- **Permission Guards**: Endpoint-level permission checking
- **Public Routes**: Support for public endpoints (login, verify-email, etc.)

### 👥 User Management

- **Automatic Password Generation**: System generates cryptographically secure random passwords (16 characters)
- **Email Verification**: Users must verify their email before first login
- **Forced Password Change**: New users must change password on first login
- **User Status Management**: PENDING → ACTIVE workflow
- **Soft Delete**: Users are soft-deleted (not permanently removed)
- **Team Assignment**: Users can be assigned to teams
- **Role Assignment**: Users are assigned roles with specific permissions

### 🔒 Security Features

- **Cryptographically Secure Passwords**: Uses `crypto.randomBytes()` for password generation (not `Math.random()`)
- **Password Strength Requirements**: 
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Password Hashing**: All passwords are hashed using bcrypt (10 rounds)
- **Email Verification Tokens**: Secure random tokens with 24-hour expiration
- **Token Expiration**: Configurable token expiration times
- **Never Expose Passwords**: Passwords are never returned in API responses

### 📧 Email Service

- **Verification Emails**: Sends email verification links with temporary passwords
- **SMTP Configuration**: Supports Gmail, Outlook, Mailtrap, and other SMTP services
- **HTML Email Templates**: Beautiful, responsive email templates
- **Error Handling**: Graceful error handling for email failures

### 🎯 Core Modules

- **Users**: Complete user CRUD operations
- **Roles**: Role management with permission assignment
- **Permissions**: Permission management
- **Teams**: Team/organization management
- **Auth**: Authentication and authorization flows

## 📋 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login (returns access token or temp token if password change required) | No |
| POST | `/auth/verify-email` | Verify email address with token | No |
| POST | `/auth/change-password` | Change password (accepts both temp and access tokens) | Yes (Token) |
| POST | `/auth/logout` | User logout | Yes |

### Users (`/users`)

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| POST | `/users` | Create new user (auto-generates password) | `USER_CREATE` |
| GET | `/users` | Get list of users (with pagination & filters) | - |
| GET | `/users/:id` | Get user by ID | - |
| PATCH | `/users/:id` | Update user information | - |
| DELETE | `/users/:id` | Delete user (soft delete) | - |

### Roles (`/roles`)

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| POST | `/roles` | Create new role | `ROLE_CREATE` |
| GET | `/roles` | Get list of roles | `ROLE_READ` |
| GET | `/roles/:id` | Get role by ID | `ROLE_READ` |
| PATCH | `/roles/:id` | Update role | `ROLE_UPDATE` |
| PATCH | `/roles/:id/permissions` | Assign permissions to role | `ROLE_UPDATE` |
| DELETE | `/roles/:id` | Delete role | `ROLE_DELETE` |

### Teams (`/teams`)

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| POST | `/teams` | Create new team | `TEAM_CREATE` |
| GET | `/teams` | Get list of teams | `TEAM_READ` |
| GET | `/teams/:id` | Get team by ID | `TEAM_READ` |
| PATCH | `/teams/:id` | Update team | `TEAM_UPDATE` |
| DELETE | `/teams/:id` | Delete team | `TEAM_DELETE` |

### Permissions (`/permissions`)

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| GET | `/permissions` | Get list of permissions | `PERMISSION_READ` |
| GET | `/permissions/:id` | Get permission by ID | `PERMISSION_READ` |

### Health Check (`/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check endpoint | No |

## 🔄 User Registration & Login Flow

### 1. Admin Creates User

```
POST /users
Body: { name, email, roleId, teamId }
```

**System Actions:**
- Generates cryptographically secure random password (16 chars)
- Hashes password using bcrypt
- Generates email verification token
- Sets `status = PENDING`, `emailVerified = false`, `mustChangePassword = true`
- Sends verification email with temporary password and verification link
- **Password is NEVER returned in response**

### 2. User Verifies Email

```
POST /auth/verify-email
Body: { verificationToken }
```

**System Actions:**
- Validates token and expiration
- Sets `emailVerified = true`
- Sets `verificationToken = null`, `tokenExpiry = null`
- Sets `status = ACTIVE`
- **Does NOT change `mustChangePassword`**

### 3. First Login

```
POST /auth/login
Body: { email, password } // password = temporary password from email
```

**System Actions:**
- Validates credentials
- **Rejects if `emailVerified = false`**
- If `mustChangePassword = true`:
  - Returns `LoginRequirePasswordChangeDto` with `tempToken` (short-lived, 5-10 minutes)
  - **Does NOT issue access token**
- If `mustChangePassword = false`:
  - Returns `AuthResponseDto` with `accessToken` and `refreshToken`

### 4. Force Change Password

```
POST /auth/change-password
Headers: { Authorization: Bearer <tempToken> }
Body: { newPassword }
```

**System Actions:**
- Validates password strength
- Hashes new password
- Updates user: `password`, `mustChangePassword = false`, `status = ACTIVE`
- Issues new `accessToken` and `refreshToken`

## 🔐 Security Rules

1. **Password Generation**: 
   - System generates all passwords (never accepts from client)
   - Uses `crypto.randomBytes()` for cryptographically secure randomness
   - Passwords meet strength requirements (uppercase, lowercase, number, special char)

2. **Email Verification**:
   - Required before login
   - Token expires in 24 hours
   - Does NOT automatically change `mustChangePassword`

3. **Password Change**:
   - Required on first login if `mustChangePassword = true`
   - Uses temporary token (short-lived) for forced changes
   - Uses access token for normal password changes
   - Unified endpoint accepts both token types

4. **Role Restrictions**:
   - Only `SUPER_ADMIN` can assign `ADMIN` role
   - `ADMIN` can only create users within their own team
   - Super Admin cannot be deleted or have role changed

5. **Token Security**:
   - Temporary tokens can only access `/auth/change-password`
   - Access tokens required for all other authenticated endpoints
   - Permissions require access tokens (not temp tokens)

## 🛠️ Project Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
$ pnpm install

# Copy environment file
$ cp .env.example .env

# Configure environment variables (see below)
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pod_db?schema=public"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_TEMP_EXPIRES_IN="10m"
JWT_REFRESH_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Application
PORT=3000
APP_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="your-email@gmail.com"
```

### Database Setup

```bash
# Generate Prisma Client
$ pnpm prisma generate

# Run migrations
$ pnpm prisma migrate dev

# Seed database (creates Super Admin, roles, permissions)
$ pnpm prisma db seed
```

### Running the Application

```bash
# Development mode
$ pnpm run start:dev

# Production mode
$ pnpm run build
$ pnpm run start:prod
```

## 📚 API Documentation

Once the application is running, access Swagger documentation at:

```
http://localhost:3000/api
```

The Swagger UI provides:
- Complete API documentation
- Interactive API testing
- Request/response schemas
- Authentication testing

## 🏗️ Architecture

### Project Structure

```
src/
├── auth/              # Authentication & Authorization
│   ├── guards/        # Auth guards (JWT, Permissions, Change Password)
│   ├── strategies/    # Passport strategies (Access, Temp, Change Password)
│   └── dto/          # Auth DTOs
├── users/            # User management
├── roles/            # Role management
├── teams/            # Team management
├── permissions/      # Permission management
├── common/           # Shared utilities
│   ├── decorators/   # Custom decorators (@Public, @Permissions)
│   ├── services/     # Shared services (Email)
│   └── validators/   # Custom validators
└── prisma/           # Prisma service
```

### Design Principles

- **SOLID Principles**: Clean, maintainable code
- **DRY (Don't Repeat Yourself)**: Reusable components
- **Thin Controllers**: Business logic in services
- **DTO Validation**: All inputs validated with class-validator
- **Type Safety**: Full TypeScript support with Prisma types
- **Transaction Safety**: Prisma transactions for data integrity

## 🧪 Testing

```bash
# Unit tests
$ pnpm run test

# E2E tests
$ pnpm run test:e2e

# Test coverage
$ pnpm run test:cov
```

## 📝 Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Type Safety**: Prisma-generated types throughout

## 🚨 Important Notes

1. **Production Deployment**:
   - Change all default secrets
   - Use strong JWT secrets
   - Configure proper SMTP settings
   - Set up proper CORS policies
   - Use HTTPS in production

2. **Database**:
   - Never reset or re-seed production database
   - All migrations are safe and reversible
   - Use transactions for multi-table operations

3. **Security**:
   - Passwords are never returned in API responses
   - Temporary passwords are only sent via email
   - Email verification is required before login
   - Password change is forced on first login

## 📄 License

This project is [MIT licensed](LICENSE).

## 🤝 Contributing

This is an internal project. For questions or issues, please contact the development team.
