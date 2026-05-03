# Phase 1: MVP Foundation Implementation

**Duration:** 3 weeks  
**Status:** Ready to Start  
**Exit Criteria:** Users manage phone lifecycle end to end in UI

## Overview

Phase 1 builds the complete MVP with authentication, phone CRUD, relations management, and a working web interface. This phase outputs a functional system that can be UAT tested against acceptance criteria defined in Phase 0.

---

## Implementation Tasks

### Week 1: Project Setup & Authentication

#### Task 1.1: Project Structure & Database
**Scope:**
- Initialize backend project (Node.js/Express or Python/FastAPI)
- Set up PostgreSQL database
- Create migration system
- Apply schema-draft.md migrations

**Acceptance:**
- Database initialized with all 12 tables
- All constraints and indexes in place
- Migrations version-controlled
- Seeded with OAuth provider credentials

**Estimated:** 1 day

---

#### Task 1.2: Email Service Integration
**Scope:**
- Set up SMTP provider (SendGrid, Mailgun, AWS SES)
- Create email templates for password reset
- Implement email sending service
- Add retry logic for failed sends

**Acceptance:**
- Password reset emails sent within 30 seconds
- HTML and plain-text versions
- Unsubscribe link present
- Deliverability > 95%

**Estimated:** 1 day

---

#### Task 1.3: Authentication Infrastructure
**Scope:**
- Implement JWT token generation/validation
- Create session management
- Add password hashing (bcrypt)
- Implement account lockout (5 failed attempts)

**Acceptance:**
- Tokens valid for 1 hour
- Refresh token support
- Lockout enforced
- Tokens reject after expiration

**Estimated:** 1 day

---

#### Task 1.4: Local Auth Signup & Signin
**Scope:**
- POST /auth/signup endpoint
- POST /auth/signin endpoint
- Email validation
- Password strength requirements

**Acceptance:**
- Signup creates user with hashed password
- Signin validates credentials
- Error responses match API spec
- Tests pass (unit + integration)

**Estimated:** 1 day

---

#### Task 1.5: Password Recovery
**Scope:**
- POST /auth/password/forgot endpoint
- POST /auth/password/reset endpoint
- Single-use token generation
- Token expiration (1 hour)

**Acceptance:**
- Token sent via email
- Token validates correctly
- Token expired after 1 hour
- Token single-use enforced
- Password updated successfully

**Estimated:** 1 day

---

#### Task 1.6: Google OAuth Integration
**Scope:**
- Register app with Google Cloud
- Implement GET /auth/oauth/google/start
- Implement GET /auth/oauth/google/callback
- Link existing users by email
- Create new users on first OAuth

**Acceptance:**
- Consent screen redirects correctly
- Callback returns auth code
- Account created or linked
- JWT token returned
- Subsequent OAuth logins reuse account

**Estimated:** 1.5 days

---

#### Task 1.7: Microsoft OAuth Integration
**Scope:**
- Register app with Microsoft Entra ID
- Implement GET /auth/oauth/microsoft/start
- Implement GET /auth/oauth/microsoft/callback
- Link existing users by email
- Create new users on first OAuth

**Acceptance:**
- Consent screen redirects correctly
- Callback returns auth code
- Account created or linked
- JWT token returned
- Subsequent OAuth logins reuse account

**Estimated:** 1.5 days

---

#### Task 1.8: Signout Endpoint
**Scope:**
- POST /auth/signout endpoint
- Token blacklist management
- Session cleanup

**Acceptance:**
- Token invalidated after signout
- Blacklist prevents token reuse
- Cleanup removes expired tokens
- Response is 204 No Content

**Estimated:** 0.5 days

---

### Week 2: Phone CRUD & Relations

#### Task 2.1: Phone Normalization
**Scope:**
- E.164 format validation
- Phone number parsing (raw → e164, country_code, national_number)
- Use libphonenumber library

**Acceptance:**
- Accepts +55 11 98765-4321 → +55119876543210
- Rejects invalid formats
- Country code detected correctly
- Unique constraint enforced

**Estimated:** 0.5 days

---

#### Task 2.2: Phone CRUD Endpoints
**Scope:**
- POST /phones (create)
- GET /phones (list with pagination)
- GET /phones/{id} (detail)
- PATCH /phones/{id} (update)
- DELETE /phones/{id} (soft delete)

**Acceptance:**
- All endpoints return correct status codes
- Pagination works (20 per page, max 100)
- Timestamps in ISO 8601 UTC
- Error responses match spec
- Soft delete marks as inactive, doesn't remove

**Estimated:** 2 days

---

#### Task 2.3: Phone Search & Filtering
**Scope:**
- Search by e164_number or raw_number
- Filter by status, type
- Sort by created_at, last_seen_at
- Combine multiple filters

**Acceptance:**
- Search term fuzzy-matches
- Filters reduce result set correctly
- Sort order applied (asc/desc)
- Combined filters work together
- Indexes used for performance

**Estimated:** 1 day

---

#### Task 2.4: Phone Owner Relations
**Scope:**
- POST /phones/{id}/owners (add relation)
- DELETE /phones/{id}/owners/{relationId} (remove relation)
- GET /phones/{id} includes owners array
- Prevent duplicate active relations

**Acceptance:**
- Relations created with confidence_score
- Relation_label stored correctly
- Start/end dates tracked
- Cannot create duplicate active relations
- Deletion removes relation without cascading

**Estimated:** 1 day

---

---

#### Task 2.5: Phone Sources & Metadata
**Scope:**
- Store source metadata (name, url, collector, collected_at)
- Link to phone creation/enrichment events
- Include sources in phone detail response

**Acceptance:**
- Source tracked on phone create
- Collector types: manual, import, crawler
- Source URL optional
- Sources array in phone detail

**Estimated:** 0.5 days

---

### Week 3: Frontend & Polish

#### Task 3.1: Frontend Project Setup
**Scope:**
- Initialize React/Vue/Svelte project
- Set up routing (React Router)
- Set up state management (Redux/Vuex/Pinia)
- Set up build and dev server

**Acceptance:**
- Dev server runs on localhost:3000
- Builds to production bundle
- Environment variables configurable
- API base URL configurable

**Estimated:** 0.5 days

---

#### Task 3.2: Login Page
**Scope:**
- Login form with email and password
- Email validation
- Password input (masked)
- Links: signup, forgot password
- OAuth buttons: Google, Microsoft

**Acceptance:**
- Form submits to /auth/signin
- Success redirects to /phones
- Error shows message (invalid credentials)
- OAuth buttons redirect correctly
- Form has CSRF token

**Estimated:** 1 day

---

#### Task 3.3: Signup Page
**Scope:**
- Signup form with email, password, display_name
- Password strength indicator
- Confirm password field
- Link: back to login
- OAuth buttons: Google, Microsoft

**Acceptance:**
- Form submits to /auth/signup
- Password strength validated (8+ chars, 1 uppercase, 1 number, 1 symbol)
- Success auto-logs in, redirects to /phones
- Error shows message (email exists, weak password)
- OAuth buttons work

**Estimated:** 1 day

---

#### Task 3.4: Forgot Password Flow
**Scope:**
- Forgot password page (email input)
- Email sent confirmation page
- Reset password page (token from email)
- New password form

**Acceptance:**
- Forgot email endpoint called
- Confirmation message shown
- Reset link works from email
- New password accepted
- Redirect to login after reset

**Estimated:** 1 day

---

#### Task 3.5: Phone List Page
**Scope:**
- Display phones in table/list format
- Pagination controls (prev, next, page number)
- Search box for phone number
- Filter dropdowns (status, type)
- Sort controls
- "Add Phone" button
- Click phone → detail page

**Acceptance:**
- List loads with first 20 phones
- Pagination shows correct page/total
- Search filters in real-time
- Filters reduce result set
- Sort changes order
- "Add Phone" modal opens
- Click phone opens detail view

**Estimated:** 2 days

---

#### Task 3.6: Phone Detail Page
**Scope:**
- Display all phone fields
- Tab view for Owners, Channels, Consents, Sources
- Edit button on each field
- Add Owner button
- Add Source button
- Delete button

**Acceptance:**
- All phone fields visible
- Tabs switch between relations
- Edit inline or modal
- Add operations open forms
- Delete with confirmation
- Back link to list

**Estimated:** 2 days

---

#### Task 3.7: Create Phone Form
**Scope:**
- Modal/page with form inputs
- Phone number input with validation
- Type dropdown (mobile, landline, whatsapp, unknown)
- Submit button
- Cancel button

**Acceptance:**
- Form validates format before submit
- Submit calls POST /phones
- Success closes form, phone added to list
- Error shows message
- Cancel closes without saving

**Estimated:** 1 day

---

#### Task 3.8: Owner Management UI
**Scope:**
- Owners table in detail page tab
- Add Owner button → form with person search
- Delete Owner button per row
- Display relation_label, confidence_score

**Acceptance:**
- Owners list shows all relations
- Add opens autocomplete search form
- Search finds people by name
- Create relation with label/score
- Delete removes from table
- Updates persist to API

**Estimated:** 1.5 days

---

#### Task 3.9: Channel & Consent Management UI
**Scope:**
- Channels tab with toggles for each type
- Consents tab with status dropdowns
- Sources tab (read-only) showing provenance

**Acceptance:**
- Channel toggles enable/disable
- Consent status updates on select
- Sources display chronologically
- All changes persist to API

**Estimated:** 1 day

---

#### Task 3.10: Navigation & Layout
**Scope:**
- Header with user menu
- Signout button
- Logo/title
- Responsive navigation
- Footer with version

**Acceptance:**
- User name displayed in header
- Signout button logs out
- Navigation consistent across pages
- Mobile responsive
- Accessibility WCAG 2.1 AA

**Estimated:** 1 day

---

#### Task 3.11: Error Handling & Loading States
**Scope:**
- Error boundary component
- Loading spinner for async operations
- Toast/snackbar for notifications
- 401 redirect to login
- Request ID in error messages

**Acceptance:**
- API errors show user-friendly messages
- Loading spinner shown during requests
- Success/error toasts appear
- 401 redirects to login
- Request ID visible for support

**Estimated:** 1 day

---

#### Task 3.12: Testing & QA
**Scope:**
- Unit tests for components (50%+ coverage)
- Integration tests for API calls
- E2E tests for critical paths
- Manual UAT against acceptance criteria

**Acceptance:**
- Tests pass locally and in CI/CD
- Coverage report generated
- UAT checklist completed
- No critical bugs found

**Estimated:** 2 days

---

#### Task 3.13: Deployment & Documentation
**Scope:**
- Docker containerization
- Environment setup (staging/prod)
- CI/CD pipeline (GitHub Actions)
- Deployment documentation
- README with setup instructions

**Acceptance:**
- App builds and runs in Docker
- Staging deployment automated
- README has setup steps
- API documented (Swagger/Postman)
- Runbook available

**Estimated:** 1 day

---

## Team Allocation (Estimated)

| Role | Tasks | Days |
|------|-------|------|
| Backend Engineer | 1.1-1.8, 2.1-2.7 | 14 days |
| Frontend Engineer | 3.1-3.13 | 16 days |
| QA / Full-Stack | Testing, UAT prep | 5 days |
| DevOps | 3.13, CI/CD setup | 3 days |

---

## Daily Standup Topics

1. Blocker identification
2. Integration points (API contracts)
3. Test data needs
4. UAT readiness progress

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Scope creep | Strict Phase 0 freeze, defer Phase 2+ features |
| Database migration issues | Automated migrations, test restore procedures |
| OAuth provider delays | Fallback to local auth for testing |
| Performance issues | Query profiling, index optimization early |
| UAT failures | Daily builds, pre-UAT smoke tests |

---

## Success Metrics

✅ All 42 acceptance test scenarios pass  
✅ Zero critical/high bugs reported  
✅ Load testing: list page < 2s, search < 500ms  
✅ 404 Rate: < 0.1% of requests  
✅ API uptime: 99.5% during UAT  
✅ Code coverage: 60%+ unit tests  

---

## Phase 1 Exit Criteria

1. ✅ All endpoints implemented and tested
2. ✅ Frontend pages complete and responsive
3. ✅ Authentication flows working (local + OAuth)
4. ✅ Phone CRUD operations end-to-end
5. ✅ Owner relations management
6. ✅ All acceptance tests passing
7. ✅ Zero critical bugs
8. ✅ Staging environment deployed
9. ✅ UAT checklist signed off
10. ✅ Documentation complete

---

**When all criteria met → Ready for Phase 2**
