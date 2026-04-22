# Changelog

All notable changes to the Phone List System project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-22

### Added

#### Authentication
- User signup with email and password
- User signin with email and password
- Password reset via email token
- Account lockout after 5 failed attempts (15-minute lockout)
- JWT token-based authentication (1-hour expiration)
- Token blacklisting on logout via Redis

#### Phone Management
- Create phone numbers with E.164 format validation
- List phones with pagination (configurable page size, max 100)
- Search phones by e164_number or raw_number
- Filter phones by status (active/inactive) and type (mobile/landline/whatsapp)
- View phone details with owners, channels, and consents
- Update phone type and status
- Soft delete phones (mark inactive instead of removing)

#### Phone Relationships
- Add person/business/department as phone owner
- Remove phone owners
- Update owner relation with custom labels and confidence scores
- Timebound owner relations with start/end dates

#### Phone Metadata
- Automatic channel creation (SMS, WhatsApp, Telegram, Signal)
- Channel enable/disable toggling
- Consent management (Marketing, SMS, Call)
- Consent status tracking (granted/revoked/unknown)
- Source tracking for where phone was discovered
- Contact attempt logging

#### Frontend
- React-based single-page application with Vite
- Responsive design with Tailwind CSS
- Client-side state management with Zustand
- API integration with Axios
- Protected routes with automatic 401 redirect to login
- Login page with "forgot password" link
- Signup page with password strength requirements
- Password reset request flow
- Phone list page with pagination, search, and filters
- Phone detail page with tabbed interface
- Form validation and error handling
- Loading states and user feedback

#### Backend
- Express.js REST API with 17 endpoints
- PostgreSQL database with 12 tables
- Redis caching for token blacklist
- Comprehensive error handling with 8 error codes
- Standardized API response format
- Request ID tracking for debugging
- CORS configuration for frontend integration
- Connection pooling for database efficiency
- bcrypt password hashing (10 rounds)
- libphonenumber-js for phone validation

#### Infrastructure
- Docker containerization for all services
- Docker Compose orchestration (PostgreSQL, Redis, Backend, Frontend)
- Nginx configuration for SPA routing and API proxying
- Database migration script
- Database seeding script with test data
- Jest test framework setup
- Integration test examples

#### Documentation
- Comprehensive README with quick start guide
- Backend API documentation (17 endpoints)
- Database schema documentation
- Deployment guide for Docker, Linux, and cloud platforms
- Contributing guide with code style and workflow
- Quick start guide with 5-minute setup
- API response format documentation
- Error code reference

### Technical Details

#### Database Schema (12 Tables)
- `app_users` - User accounts with authentication status
- `auth_identities` - OAuth provider connections (for Phase 2)
- `password_reset_tokens` - Single-use password reset tokens
- `phones` - Phone numbers with metadata
- `people` - Person entity for ownership
- `businesses` - Business entity for ownership
- `departments` - Department entity for ownership
- `phone_owners` - Timebound phone-to-owner relationships
- `phone_channels` - Communication channels (SMS, WhatsApp, etc.)
- `phone_consents` - Privacy and marketing consents
- `phone_sources` - Where phone numbers came from
- `contact_attempts` - Call, SMS, email history

#### API Endpoints (17 Total)
**Authentication (5):**
- POST /auth/signup
- POST /auth/signin
- POST /auth/signout
- POST /auth/password/forgot
- POST /auth/password/reset

**Phone Management (7):**
- GET /phones (with pagination, search, filters)
- POST /phones
- GET /phones/:id
- PATCH /phones/:id
- DELETE /phones/:id
- POST /phones/:id/owners
- DELETE /phones/:id/owners/:relationId

**Phone Relationships (5):**
- POST /phones/:id/owners (add owner)
- DELETE /phones/:id/owners/:relationId (remove owner)
- PATCH /phones/:id/owners/:relationId (update owner relation)

#### Frontend Pages (6)
- LoginPage - Email/password authentication
- SignupPage - Account creation with validation
- ForgotPasswordPage - Password reset request
- PhonesPage - Phone list with CRUD operations
- PhoneDetailPage - Phone details with relationship management
- LogoutPage - Secure logout handler

#### Error Codes (8)
- VALIDATION_ERROR (400)
- UNAUTHORIZED (401)
- FORBIDDEN (403)
- NOT_FOUND (404)
- CONFLICT (409)
- BUSINESS_RULE_VIOLATION (422)
- RATE_LIMITED (429)
- INTERNAL_ERROR (500)

### Dependencies

#### Backend (23 Production)
- express 4.18.2
- pg 8.10.0 (PostgreSQL)
- redis 4.6.0 (Caching)
- bcryptjs 2.4.3 (Password hashing)
- jsonwebtoken 9.0.0 (JWT)
- libphonenumber-js 1.10.24 (Phone validation)
- dotenv 16.0.3 (Environment)
- cors 2.8.5 (CORS handling)
- express-validator 7.0.0 (Input validation)
- uuid 9.0.0 (ID generation)
- nodemailer 6.9.1 (Email - optional)
- axios 1.4.0 (HTTP client)
- And more...

#### Frontend (5 Production)
- react 18.2.0
- react-dom 18.2.0
- react-router-dom 6.12.0
- axios 1.4.0
- zustand 4.3.7

### Fixed

- Initial release - no fixes

### Security

- Passwords hashed with bcrypt (10 rounds, slow hash)
- JWT tokens signed with HS256
- Account lockout mechanism (5 failed attempts)
- Single-use password reset tokens with SHA256 hashing
- Token blacklisting on logout
- CORS configured for frontend origin only
- SQL injection prevention via parameterized queries
- XSS protection via React auto-escaping
- CSRF tokens ready for Phase 2

---

## [Unreleased]

### Planned for Phase 2

#### Authentication
- [ ] Google OAuth integration
- [ ] Microsoft OAuth integration
- [ ] Email verification for new accounts
- [ ] Multi-factor authentication (2FA)
- [ ] API key authentication for integrations
- [ ] Session management and device tracking

#### Phone Management
- [ ] Bulk phone import (CSV/Excel)
- [ ] Bulk operations (update, delete, export)
- [ ] Phone number enrichment (provider, region)
- [ ] Call/SMS history and analytics
- [ ] Advanced search with saved filters
- [ ] Phone validation with real-time feedback

#### Relationships
- [ ] Advanced owner search and autocomplete
- [ ] Batch relationship updates
- [ ] Relationship history and audit trail

#### Frontend
- [ ] Admin dashboard
- [ ] User profile management
- [ ] Organization/team support
- [ ] Role-based access control (RBAC)
- [ ] Advanced filtering and saved searches
- [ ] Export to CSV/PDF
- [ ] Mobile responsive improvements

#### Backend
- [ ] GraphQL API alongside REST
- [ ] Webhooks for external integrations
- [ ] Rate limiting per user/IP
- [ ] Audit logging
- [ ] Soft delete recovery
- [ ] Data export functionality

#### Infrastructure
- [ ] Kubernetes deployment configs
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing in CI/CD
- [ ] Performance monitoring (APM)
- [ ] Log aggregation (ELK/Loki)
- [ ] Multi-region replication

#### Documentation
- [ ] API client libraries (JS, Python, Go)
- [ ] Webhook documentation
- [ ] Deployment on AWS, GCP, Heroku
- [ ] Plugin/extension development guide
- [ ] Video tutorials

---

## Version Tags

- **1.0.0** - MVP Release (April 22, 2026)
  - Core phone management system
  - User authentication
  - Basic relationships

---

## Contributing

To help improve the changelog, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for new backwards-compatible features
- PATCH version for backwards-compatible bug fixes

---

Generated: 2026-04-22
