# Phone List System - Backend API

Node.js + Express REST API for managing phone numbers with relationships, authentication, and compliance.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your database, Redis, and OAuth credentials:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/phone_list
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-min-32-chars
FRONTEND_URL=http://localhost:5173
```

4. Initialize the database:
```bash
npm run migrate
```

5. (Optional) Seed test data:
```bash
npm run seed
```

## Running the Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

Server runs on port 3000 by default. Health check: `GET /health`

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Create account
- `POST /api/v1/auth/signin` - Login
- `POST /api/v1/auth/signout` - Logout
- `POST /api/v1/auth/password/forgot` - Request reset email
- `POST /api/v1/auth/password/reset` - Reset password

### Phone Management
- `GET /api/v1/phones` - List phones (paginated, filterable)
- `POST /api/v1/phones` - Create phone
- `GET /api/v1/phones/:id` - Get phone with relations
- `PATCH /api/v1/phones/:id` - Update phone
- `DELETE /api/v1/phones/:id` - Delete phone
- `POST /api/v1/phones/:id/enrich` - Trigger CNPJ enrichment job for a phone

### Phone Owners
- `POST /api/v1/phones/:id/owners` - Add owner
- `DELETE /api/v1/phones/:id/owners/:relationId` - Remove owner
- `PATCH /api/v1/phones/:id/owners/:relationId` - Update relation

## Architecture

### Layers
- **Controllers**: Request handling and validation
- **Services**: Business logic (auth, phone validation)
- **Database**: PostgreSQL with connection pooling
- **Middleware**: Auth, error handling, CORS
- **Utilities**: JWT, response formatting, phone validation

### Key Features
- JWT authentication with token expiration
- Password hashing with bcrypt
- Account lockout (5 failed attempts → 15 min lock)
- Single-use password reset tokens
- Phone validation and E.164 normalization
- Standardized API responses with error codes
- Redis token blacklisting on logout
 - Full phone metadata (type, country code)

## Database Schema

12 tables:
- `app_users` - User accounts with auth status
- `auth_identities` - OAuth provider connections
- `password_reset_tokens` - Single-use reset tokens
- `phones` - Phone numbers with metadata
- `people`, `businesses`, `departments` - Owner entities
- `phone_owners` - Phone-to-owner relationships (timebound)
- `phone_sources` - Where the phone was discovered
- `contact_attempts` - Call/SMS/email history

## Testing

```bash
npm test
```

## Linting

```bash
npm run lint
```

## Environment Variables

See `.env.example` for all required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Signing key for JWT (min 32 chars)
- `JWT_EXPIRATION` - Token TTL (default 1h)
- `FRONTEND_URL` - CORS origin
- `GOOGLE_CLIENT_ID/SECRET` - OAuth (optional)
- `MICROSOFT_CLIENT_ID/SECRET` - OAuth (optional)
- `SENDGRID_API_KEY` - Email service (optional)

## Error Handling

All errors return standardized format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {...},
    "request_id": "uuid",
    "timestamp": "ISO8601"
  }
}
```

Error codes:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `BUSINESS_RULE_VIOLATION` (422)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens signed with HS256
- Account lockout after failed attempts
- Reset tokens with SHA256 hashing
- SQL injection prevention via parameterized queries
- CORS configured for frontend origin
- Token blacklisting on logout via Redis
