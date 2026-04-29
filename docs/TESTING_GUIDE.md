# Phase 1 Testing Guide

Comprehensive guide for running all Phase 1 tests (unit, integration, E2E, and UAT).

---

## Quick Start

Run all tests with one command:

```bash
# Run all tests
npm run test:all

# Or individually:
cd backend && npm run test:ci          # Backend tests
cd frontend && npm run test:unit       # Frontend unit tests
cd frontend && npm run test:e2e        # Frontend E2E tests
```

---

## 1. Backend Testing

### Setup
```bash
cd backend
npm install
```

### Unit Tests
Tests for utility functions (phone validation, auth, responses).

```bash
npm test
```

**Files Tested:**
- `src/utils/__tests__/phone.test.js` - Phone normalization & validation
- `src/utils/__tests__/auth.test.js` - Password validation, JWT generation

---

### Integration Tests
Full API endpoint testing with supertest.

```bash
npm run test:ci
```

**Files Tested:**
- `src/__tests__/integration.test.js` - All 17 API endpoints

**Test Coverage:**
- ✅ Authentication (signup, signin, signout, password recovery)
- ✅ Phones CRUD (create, read, list, update, delete)
- ✅ Search & filtering
- ✅ Pagination
- ✅ People management
- ✅ Owner relations
- ✅ Authorization & token validation
- ✅ Error handling

**Expected Output:**
```
PASS  src/__tests__/integration.test.js
  Phone List API - Full Integration Tests
    1. Authentication - Signup & Signin
      ✓ POST /auth/signup - Should create new account
      ✓ POST /auth/signup - Should reject duplicate email
      ✓ POST /auth/signin - Should login with valid credentials
      ...
    7. Error Handling
      ✓ GET /health - Server healthy
      ✓ GET /nonexistent - Should return 404

Test Suites: 1 passed, 1 total
Tests:       35 passed, 35 total
```

### Coverage Report
```bash
npm run test:ci
# View: backend/coverage/lcov-report/index.html
```

---

## 2. Frontend Testing

### Setup
```bash
cd frontend
npm install
npm install -D @testing-library/react @testing-library/jest-dom vitest
```

### Unit Tests
Component-level tests.

```bash
npm run test:unit
```

**Files Tested:**
- `tests/unit/SessionsNewPage.test.jsx` - Login form
- `tests/unit/PhonesPage.test.jsx` - Phone list

**Test Coverage:**
- Form rendering
- User input handling
- Error messages
- Navigation
- Loading states

**Expected Output:**
```
PASS  tests/unit/SessionsNewPage.test.jsx
  SessionsNewPage (Login)
    ✓ should render login form
    ✓ should submit login form with valid data
    ✓ should display error message on failed login
    ✓ should have link to signup page (4 ms)

PASS  tests/unit/PhonesPage.test.jsx
  PhonesPage
    ✓ should render phone list
    ✓ should show loading state
    ✓ should display error message
    ...

Tests:  8 passed, 8 total
```

---

## 3. E2E Testing

### Setup
```bash
cd frontend
npm install -D @playwright/test
npx playwright install
```

### Running E2E Tests
```bash
# Make sure containers are running first
docker-compose up -d --build

# Run E2E tests
npm run test:e2e
```

**Test Scenarios (10 tests):**

| Scenario | What It Tests | Duration |
|----------|---------------|----------|
| E2.1 | User signup with valid credentials | 10s |
| E2.2 | User login with valid credentials | 10s |
| E2.3 | Create a phone record | 15s |
| E2.4 | View phone details | 10s |
| E2.5 | Search phones by number | 10s |
| E2.6 | Filter phones by status | 10s |
| E2.7 | Add owner to phone | 15s |
| E2.8 | Delete a phone | 15s |
| E2.9 | User logout | 10s |
| E2.10 | Mobile responsive layout | 15s |

**Expected Output:**
```
Running 10 tests using 1 worker
[chromium] › tests/e2e/phone-list.spec.js
  ✓ E2.1 User can signup with valid credentials (8s)
  ✓ E2.2 User can login with valid credentials (7s)
  ✓ E2.3 User can create a phone (12s)
  ✓ E2.4 User can view phone details (9s)
  ...
  ✓ E2.10 Layout is responsive on mobile (14s)

10 passed (2m 15s)
```

### Debugging Failed E2E Tests
```bash
# Run with debug mode
npm run test:e2e -- --debug

# Run specific test
npm run test:e2e -- --grep "E2.3"

# Run with headed browser (see what's happening)
npm run test:e2e -- --headed

# Generate traces on failure
npm run test:e2e -- --trace on
```

---

## 4. Manual UAT Testing

For comprehensive testing without automation.

### Pre-requisites
- [ ] Containers running (`docker-compose ps`)
- [ ] Backend healthy (`curl http://localhost:3000/health`)
- [ ] Frontend accessible (`http://localhost`)
- [ ] Test users seeded:
  - `test@example.com` / `Password123!`
  - `bob.smith@example.com` / `Password123!`

### UAT Checklist
Use the comprehensive UAT Test Plan: [docs/UAT_TEST_PLAN.md](UAT_TEST_PLAN.md)

**Time Required:** ~2 hours for thorough manual testing

**Test Categories:**
1. Authentication (A) - 8 scenarios
2. Phone Management (P) - 10 scenarios
3. Owner Management (O) - 4 scenarios
4. People Management (L) - 2 scenarios
5. UI/UX (U) - 5 scenarios
6. Performance (F) - 2 scenarios
7. Security (S) - 4 scenarios
8. Data Integrity (D) - 3 scenarios
9. Browser Compatibility (B) - 4 browsers
10. Accessibility (A11Y) - 3 scenarios

---

## 5. Running Tests in CI/CD

### GitHub Actions Example
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14-alpine
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci && npm run test:ci

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci && npm run test:unit

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: docker-compose up -d --build
      - run: cd frontend && npm ci && npm run test:e2e
```

---

## 6. Test Results & Reporting

### Generate Test Report
```bash
# Backend coverage
cd backend && npm run test:ci

# View report
open backend/coverage/lcov-report/index.html
```

### Create HTML Test Report
```bash
# Install test reporter
npm install -g mochawsome

# Run with reporter
npm run test:ci -- --reporter html
```

### Test Metrics
- **Total Tests:** 50+
- **Backend:** 35 integration tests
- **Frontend:** 8 unit tests
- **E2E:** 10 scenarios
- **Target Coverage:** >70%

---

## 7. Troubleshooting Tests

### Database Connection Issues
```bash
# Check database is running
docker-compose ps | grep postgres

# Reset database
docker-compose down -v
docker-compose up -d --build
```

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5432
lsof -ti:5432 | xargs kill -9
```

### Authentication Failures
```bash
# Verify test user exists
docker-compose exec postgres psql -U phone_user -d phone_list \
  -c "SELECT email, display_name FROM app_users;"

# Check password hash
docker-compose exec postgres psql -U phone_user -d phone_list \
  -c "SELECT email, password_hash FROM app_users WHERE email='test@example.com';"
```

### E2E Tests Timing Out
```bash
# Increase timeout
npm run test:e2e -- --timeout 60000

# Run with debug
npm run test:e2e -- --debug
```

---

## 8. Test Files Location

```
backend/
├── jest.config.js
├── src/
│   ├── __tests__/
│   │   └── integration.test.js      (35 tests)
│   └── utils/
│       └── __tests__/
│           ├── auth.test.js         (9 tests)
│           └── phone.test.js        (7 tests)
└── package.json (test scripts)

frontend/
├── vitest.config.js (if using Vitest)
├── tests/
│   ├── unit/
│   │   ├── SessionsNewPage.test.jsx (4 tests)
│   │   └── PhonesPage.test.jsx      (8 tests)
│   └── e2e/
│       └── phone-list.spec.js       (10 scenarios)
└── vite.config.js (with test config)
```

---

## 9. Test Maintenance

### Adding New Tests
1. Follow existing test patterns
2. Use descriptive test names
3. Include comments for complex assertions
4. Update coverage expectations
5. Run full suite before committing

### Updating Tests After Code Changes
1. Identify affected test files
2. Update test expectations
3. Verify all tests pass
4. Check coverage remains >70%

### Debugging Test Failures
```bash
# Run single test file
npm test -- integration.test.js

# Run with verbose output
npm test -- --verbose

# Run in watch mode
npm test -- --watch
```

---

## 10. Test Success Criteria

### Phase 1 Testing is Complete When:

- ✅ All 35 backend integration tests pass
- ✅ All 8 frontend unit tests pass
- ✅ All 10 E2E scenarios pass
- ✅ Code coverage >70%
- ✅ Manual UAT checklist completed (40+ scenarios)
- ✅ No critical bugs found
- ✅ Performance benchmarks met (<3s load time)
- ✅ Security validation passed
- ✅ Cross-browser testing completed
- ✅ Accessibility requirements met

**Estimated Total Testing Time:** 4-5 hours (manual + automated)

---

## 11. Next Steps

After Phase 1 testing completes:

1. **Generate UAT Report** - Document results in [docs/UAT_TEST_PLAN.md](UAT_TEST_PLAN.md)
2. **Log Issues** - Create GitHub issues for any bugs found
3. **Fix Critical Bugs** - Resolve before production release
4. **Get Sign-Off** - Stakeholder approval for production deployment
5. **Deploy to Production** (Optional Azure deployment guide: [AZURE_DEPLOYMENT_CHECKLIST.md](/AZURE_DEPLOYMENT_CHECKLIST.md))
6. **Begin Phase 2** - Start CNPJ enrichment feature development

---

## 12. Reference Links

- [Backend Jest Configuration](backend/jest.config.js)
- [Frontend Vite Config](frontend/vite.config.js)
- [E2E Playwright Config](frontend/playwright.config.js)
- [Integration Test File](backend/src/__tests__/integration.test.js)
- [UAT Test Plan](docs/UAT_TEST_PLAN.md)
- [API Specification](docs/api-spec.md)
