# Phone List System - MVP

A complete full-stack application for managing phone numbers with relationships to people, businesses, and departments. Built with Node.js/Express backend and React/Vite frontend.

**Status**: MVP Implementation Complete ✅

## Quick Start with Docker

```bash
# Build and run the entire stack (PostgreSQL, Redis, Backend, Frontend)
docker-compose up

# Frontend: http://localhost
# Backend API: http://localhost:3000/api
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

## Manual Development Setup

### Backend

```bash
cd backend
npm install

# Configure .env with database and Redis URLs
cp .env.example .env

# Initialize database
npm run migrate

# Start development server (port 3000)
npm run dev
```

### Frontend

```bash
cd frontend
npm install

# Start development server (port 5173)
npm run dev
```

## Project Structure

```
.
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── db/               # Database & Redis connections
│   │   ├── controllers/       # Request handlers (auth, phones, owners)
│   │   ├── middleware/        # Auth, error handling, CORS
│   │   ├── routes/            # Route definitions
│   │   ├── services/          # Business logic
│   │   ├── utils/             # JWT, validation, response formatting
│   │   └── server.js          # Express app
│   ├── package.json
│   ├── .env.example
│   ├── Dockerfile
│   └── README.md
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── components/        # UI components (Button, Input, Card, etc)
│   │   ├── pages/             # Page components (Login, Signup, Phones, etc)
│   │   ├── services/          # API client with Axios
│   │   ├── store/             # Zustand state management
│   │   ├── App.jsx            # Router & routes
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Tailwind styles
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── README.md
│
├── docs/                       # Project documentation
│   ├── discovery_model.md      # User stories & requirements
│   ├── contracts.md            # API contract & error handling
│   ├── schema-draft.md         # Database schema design
│   ├── api-spec.md             # Full API specification
│   ├── acceptance-tests.md     # Test scenarios
│   └── phase-1-implementation.md  # Implementation plan
│
└── docker-compose.yml         # Full stack orchestration
```

## Architecture

### Backend API (17 Endpoints)

#### Authentication (5 endpoints)
- `POST /auth/signup` - Create account with password strength validation
- `POST /auth/signin` - Login with account lockout (5 attempts → 15 min)
- `POST /auth/signout` - Logout & token blacklist
- `POST /auth/password/forgot` - Email reset token
- `POST /auth/password/reset` - Reset password with single-use token

#### Phone Management (12 endpoints)
- `GET /phones` - List with pagination, search, filtering
- `POST /phones` - Create with E.164 validation
- `GET /phones/:id` - Get with owners, channels, consents
- `PATCH /phones/:id` - Update type/status
- `DELETE /phones/:id` - Soft delete
- `POST /phones/:id/owners` - Add person/business/department owner
- `DELETE /phones/:id/owners/:relationId` - Remove owner
- `PATCH /phones/:id/owners/:relationId` - Update relation

### Frontend Pages (6 pages)

- **LoginPage** - Email/password signin with forgot password link
- **SignupPage** - Account creation with password strength requirements
- **ForgotPasswordPage** - Request password reset email
- **PhonesPage** - List phones with pagination, search, filters; create new phone
- **PhoneDetailPage** - View/edit phone details; manage owners, channels, consents
- **LogoutPage** - Sign out and redirect to login

## Database Schema

12 tables with proper constraints and indexes:

```
phones (primary entity)
├── e164_number (UNIQUE) - International format
├── raw_number - Display format
├── type - mobile/landline/whatsapp
├── status - active/inactive
├── country_code, national_number - Parsed from libphonenumber
├── channels[] - SMS, WhatsApp, Telegram, etc (auto-created)
├── consents[] - Marketing, SMS, etc (auto-created)
└── owners[] - Timebound relations to people/businesses/departments

app_users (auth)
├── email (UNIQUE)
├── password_hash (bcrypt)
├── status - active/suspended
├── failed_login_attempts
├── locked_until - Account lockout timestamp
└── auth_identities[] - OAuth providers

people, businesses, departments (owner types)
└── Can own multiple phones via timebound phone_owners relations
```

## Key Features

### Authentication
- JWT tokens with configurable expiration (default 1 hour)
- Bcrypt password hashing (10 rounds)
- Account lockout: 5 failed attempts → 15 minute lock
- Single-use password reset tokens (SHA256)
- Token blacklisting on logout via Redis

### Phone Management
- E.164 format validation via libphonenumber-js
- Automatic phone number parsing (country code, national number, type)
- Soft deletes (marked inactive, not removed)
- Composite unique constraints for active relations only
- Auto-creation of default channels and consents

### API Design
- Standardized response format with metadata
- Error codes mapping to HTTP status (VALIDATION_ERROR→400, CONFLICT→409, etc)
- Request ID tracking for debugging
- Pagination with configurable page size (max 100)
- Search and filtering on phone endpoints

### State Management
- Zustand stores for auth and phone state
- Automatic token injection in API requests
- 401 redirect to login on auth errors

## Development Workflow

### Local Development
1. Start PostgreSQL and Redis (or use Docker)
2. Run backend: `cd backend && npm run dev`
3. Run frontend: `cd frontend && npm run dev`
4. Access at http://localhost:5173

### Docker Development
```bash
docker-compose up
# Backend on localhost:3000
# Frontend on localhost:80
```

### Testing
```bash
# Backend
cd backend
npm test

# Frontend (to be added)
cd frontend
npm test
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/phone_list
REDIS_URL=redis://localhost:6379
JWT_SECRET=min-32-characters-random-string
JWT_EXPIRATION=1h
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3000

# Optional OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Optional Email
SENDGRID_API_KEY=
```

## API Response Format

### Success
```json
{
  "data": {...},
  "meta": {
    "page": 1,
    "page_size": 20,
    "total_items": 100,
    "total_pages": 5
  }
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone format",
    "details": {...},
    "request_id": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| VALIDATION_ERROR | 400 | Invalid input |
| UNAUTHORIZED | 401 | Missing/invalid auth |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Duplicate resource |
| BUSINESS_RULE_VIOLATION | 422 | Logic violation |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Next Steps (Phase 2)

- [ ] OAuth integration (Google, Microsoft)
- [ ] Email verification for signup
- [ ] Profile management
- [ ] Advanced search & filtering
- [ ] Bulk operations (import/export)
- [ ] Audit logging
- [ ] Admin dashboard
- [ ] Analytics & reporting

## Security Considerations

- All passwords hashed with bcrypt (10 rounds)
- JWT tokens signed with HS256
- CORS configured for frontend origin only
- SQL injection prevention via parameterized queries
- Account lockout after failed attempts
- Reset tokens require UUID + timestamp validation
- Soft deletes preserve data integrity
- Redis token blacklist for logout security

## Performance

- PostgreSQL connection pooling (min 2, max 10)
- Composite indexes on frequently searched fields
- Pagination limits to prevent large result sets
- Redis caching for token blacklist
- Gzip compression in production

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) (to be created)

## License

See [LICENSE](./LICENSE)

## Support

For issues and questions, please open a GitHub issue.
