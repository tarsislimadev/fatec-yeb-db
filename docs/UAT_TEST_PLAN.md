# Phase 1 UAT (User Acceptance Testing) Plan

**Project:** Fatec YEB Database - Phone List System MVP  
**Date:** April 29, 2026  
**Scope:** Complete Phase 1 functionality validation  
**Duration:** 2-3 hours (manual testing) + 30 minutes (automated testing)

---

## 1. Pre-Testing Checklist

- [ ] Docker containers are running (`docker-compose ps`)
- [ ] Backend is healthy (`curl http://localhost:3000/health`)
- [ ] Frontend is accessible (`http://localhost`)
- [ ] Database is initialized (all tables exist)
- [ ] Test seed data is loaded (3 test users)
- [ ] Redis is running (`redis-cli ping`)
- [ ] Network connectivity is stable

**Seed Users Available:**
- Email: `test@example.com` | Password: `Password123!`
- Email: `bob.smith@example.com` | Password: `Password123!`
- Email: `admin@example.com` | Password: `Password123!`

---

## 2. Authentication Testing (UAT-A)

### UAT-A.1: Signup - Valid Data
**Objective:** User can create a new account  
**Steps:**
1. Navigate to `http://localhost`
2. Click "Sign Up" link
3. Enter Display Name: "UAT Test User"
4. Enter Email: `uat-user-${timestamp}@example.com`
5. Enter Password: `TestPassword123!`
6. Confirm Password: `TestPassword123!`
7. Click "Sign Up" button

**Expected Result:**
- [ ] Form validates password (min 8 chars, uppercase, number, special char)
- [ ] Success message displays
- [ ] Redirects to Home page (logged in)
- [ ] Header shows user display name
- [ ] Token persists in localStorage

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A.2: Signup - Weak Password
**Objective:** System rejects weak passwords  
**Steps:**
1. Go to signup page
2. Enter valid email and display name
3. Enter Password: `weak`
4. Click "Sign Up"

**Expected Result:**
- [ ] Error message: "Password must be at least 8 characters..."
- [ ] Form does not submit
- [ ] User stays on signup page

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A.3: Signup - Duplicate Email
**Objective:** System rejects duplicate email  
**Steps:**
1. Attempt signup with `test@example.com` (already exists)
2. Enter valid password and display name
3. Click "Sign Up"

**Expected Result:**
- [ ] Error message: "Email already in use"
- [ ] Form does not submit

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A.4: Login - Valid Credentials
**Objective:** User can login with valid email/password  
**Steps:**
1. On login page, enter Email: `test@example.com`
2. Enter Password: `Password123!`
3. Click "Sign In"

**Expected Result:**
- [ ] Redirects to home page
- [ ] Header shows logged-in user
- [ ] "Sign Out" button appears in header
- [ ] Token is set in localStorage

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A.5: Login - Invalid Password
**Objective:** System rejects invalid password  
**Steps:**
1. Enter Email: `test@example.com`
2. Enter Password: `WrongPassword123!`
3. Click "Sign In"

**Expected Result:**
- [ ] Error message: "Invalid email or password"
- [ ] Stays on login page
- [ ] No token is set

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A.6: Login - Non-existent User
**Objective:** System rejects non-existent users  
**Steps:**
1. Enter Email: `nonexistent@example.com`
2. Enter Password: `Password123!`
3. Click "Sign In"

**Expected Result:**
- [ ] Error message: "Invalid email or password" (generic message)
- [ ] Stays on login page

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A.7: Logout
**Objective:** User can logout and token is invalidated  
**Steps:**
1. Login with valid credentials
2. Click "Sign Out" in header
3. Try to refresh page and access protected routes

**Expected Result:**
- [ ] Redirects to login page
- [ ] Token is removed from localStorage
- [ ] Trying to access /phones redirects to login
- [ ] Previous JWT token no longer works (Redis blacklist)

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A.8: Password Recovery (Email)
**Objective:** User can initiate password reset  
**Steps:**
1. On login page, click "Forgot Password"
2. Enter Email: `test@example.com`
3. Click "Send Reset Link"

**Expected Result:**
- [ ] Success message: "Check your email for reset instructions"
- [ ] Backend logs reset token (check server logs)
- [ ] Email would be sent (mock/SendGrid)

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 3. Phone Management Testing (UAT-P)

### UAT-P.1: View Empty Phone List
**Objective:** List page displays correctly when no phones exist  
**Steps:**
1. Login as test user
2. Navigate to Phones page

**Expected Result:**
- [ ] Page title: "Phones"
- [ ] Empty state message or loading completes
- [ ] "Add Phone" button is visible
- [ ] Search and filter controls are available

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.2: Create Phone - Valid Data
**Objective:** User can create a new phone record  
**Steps:**
1. On Phones page, click "Add Phone"
2. E.164 Number: `+5511999887766`
3. Raw Number: `(11) 99988-7766`
4. Type: Select "mobile"
5. Click "Create"

**Expected Result:**
- [ ] Phone appears in list
- [ ] Success message displays
- [ ] E.164 format is normalized
- [ ] Status defaults to "active"
- [ ] Timestamps are recorded (created_at)

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.3: Create Phone - Invalid Format
**Objective:** System rejects invalid phone numbers  
**Steps:**
1. Click "Add Phone"
2. E.164 Number: `invalid-phone`
3. Click "Create"

**Expected Result:**
- [ ] Error message: "Invalid phone number format"
- [ ] Form does not submit
- [ ] Phone is not added

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.4: Create Duplicate Phone
**Objective:** System prevents duplicate phone numbers  
**Steps:**
1. Create phone: `+5511999887766`
2. Try to create same number again

**Expected Result:**
- [ ] Error message: "Phone number already exists"
- [ ] Duplicate is not created

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.5: Search Phones
**Objective:** User can search by phone number  
**Steps:**
1. Create multiple phones
2. In search box, enter `99988`
3. Wait for results

**Expected Result:**
- [ ] List filters to matching phones
- [ ] Partial matches work (both E.164 and raw number)
- [ ] Clear search shows all phones again

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.6: Filter Phones by Status
**Objective:** User can filter by status  
**Steps:**
1. On Phones page, open "Status" filter
2. Select "active"
3. Results update

**Expected Result:**
- [ ] Only active phones display
- [ ] Badge shows "Active" for all
- [ ] Filter shows selected value

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.7: Pagination
**Objective:** List paginates with max 10 items per page  
**Steps:**
1. Create 15+ phones
2. Default page shows max 10
3. Click "Next" button

**Expected Result:**
- [ ] Page shows 10 items max
- [ ] "Next" button appears if more items exist
- [ ] "Previous" button appears on page 2+
- [ ] Page indicator shows correct page number

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.8: View Phone Details
**Objective:** User can view phone details with owners  
**Steps:**
1. Click on a phone in list
2. View details page

**Expected Result:**
- [ ] E.164 number displays
- [ ] Raw number displays
- [ ] Type badge shows (mobile/landline)
- [ ] Status badge shows (active/inactive)
- [ ] Owners tab shows owners list (if any)
- [ ] Created/updated timestamps display

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.9: Update Phone Status
**Objective:** User can update phone status  
**Steps:**
1. On phone detail page
2. Change status: active → inactive
3. Click save/update

**Expected Result:**
- [ ] Status updates in detail view
- [ ] List view reflects new status
- [ ] Success message displays
- [ ] updated_at timestamp updates

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-P.10: Delete Phone
**Objective:** User can soft-delete a phone  
**Steps:**
1. On phone detail page
2. Click "Delete Phone"
3. Confirm deletion

**Expected Result:**
- [ ] Phone removed from list
- [ ] Redirect to list page
- [ ] Success message displays
- [ ] Phone marked deleted_at in database (soft delete)

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 4. Owner Management Testing (UAT-O)

### UAT-O.1: Add Owner to Phone
**Objective:** User can link person to phone  
**Steps:**
1. View phone detail page
2. Click "Owners" tab
3. Click "Add Owner"
4. Select a person from dropdown
5. Set confidence score: 95
6. Click "Add"

**Expected Result:**
- [ ] Owner appears in owners list
- [ ] Confidence score shows "95%"
- [ ] Success message displays
- [ ] Relation is created in database

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-O.2: Add Multiple Owners
**Objective:** Phone can have multiple owners  
**Steps:**
1. Add first owner (person A)
2. Add second owner (person B)
3. View owners list

**Expected Result:**
- [ ] Both owners appear in list
- [ ] No constraint prevents multiple owners
- [ ] Each may have different confidence score

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-O.3: Remove Owner
**Objective:** User can remove owner from phone  
**Steps:**
1. View phone detail, Owners tab
2. Find an owner
3. Click "Remove" button
4. Confirm

**Expected Result:**
- [ ] Owner removed from list
- [ ] Success message displays
- [ ] Relation deleted from database

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-O.4: Prevent Duplicate Owner Relations
**Objective:** Cannot add same person twice to same phone  
**Steps:**
1. Add person A as owner of phone X
2. Try to add person A again to same phone

**Expected Result:**
- [ ] Error message: "This person is already an owner"
- [ ] Duplicate relation not created

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 5. People Management Testing (UAT-L)

### UAT-L.1: View People List
**Objective:** User can view all people  
**Steps:**
1. Navigate to People page (if available)
2. View list

**Expected Result:**
- [ ] List displays all people
- [ ] Shows first name, last name, email
- [ ] Pagination works

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-L.2: Create Person
**Objective:** User can create new person record  
**Steps:**
1. Click "Add Person"
2. First Name: "John"
3. Last Name: "Doe"
4. Email: `john-${timestamp}@example.com`
5. Click "Create"

**Expected Result:**
- [ ] Person added to list
- [ ] Email is unique
- [ ] Success message displays

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 6. UI/UX Testing (UAT-U)

### UAT-U.1: Mobile Responsiveness
**Objective:** App works on mobile devices (375px width)  
**Steps:**
1. Open browser DevTools
2. Set viewport to 375x667 (mobile)
3. Navigate through all pages
4. Test all interactions

**Expected Result:**
- [ ] Layout stacks vertically
- [ ] Text is readable (min 14px)
- [ ] Touch targets are 44px+ (buttons)
- [ ] No horizontal scroll
- [ ] Forms are usable on mobile

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-U.2: Tablet Responsiveness
**Objective:** App works on tablets (768px width)  
**Steps:**
1. Set viewport to 768x1024
2. Navigate all pages

**Expected Result:**
- [ ] Layout adapts to tablet size
- [ ] Multi-column layout where appropriate
- [ ] All controls accessible

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-U.3: Desktop Layout
**Objective:** App works on desktop (1920px width)  
**Steps:**
1. Set viewport to 1920x1080
2. Navigate all pages

**Expected Result:**
- [ ] Full desktop layout displays
- [ ] No excessive whitespace
- [ ] All columns visible

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-U.4: Error Messages Display
**Objective:** Error messages are clear and helpful  
**Steps:**
1. Try various invalid inputs
2. Observe error messages

**Expected Result:**
- [ ] Messages are clear and actionable
- [ ] Messages auto-dismiss after 5s
- [ ] Error color contrasts meets accessibility standards

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-U.5: Loading States
**Objective:** User knows when system is processing  
**Steps:**
1. Perform slow operations (create phone, login)
2. Observe loading indicators

**Expected Result:**
- [ ] Loading spinner/message appears
- [ ] Submit button is disabled during loading
- [ ] Message clears when complete

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 7. Performance Testing (UAT-F)

### UAT-F.1: Page Load Time
**Objective:** Pages load in under 3 seconds  
**Steps:**
1. Use DevTools Network tab
2. Load each page (cold cache)
3. Note load times

**Expected Result:**
- [ ] Login page: <1s
- [ ] Phones list: <2s
- [ ] Phone detail: <2s

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-F.2: Search Performance
**Objective:** Search results update within 500ms  
**Steps:**
1. Have 100+ phones
2. Type in search box
3. Time results update

**Expected Result:**
- [ ] Results update within 500ms
- [ ] No lag or freezing
- [ ] Can cancel previous search

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 8. Security Testing (UAT-S)

### UAT-S.1: Authentication Required
**Objective:** Unauthenticated users cannot access protected routes  
**Steps:**
1. Delete JWT token from localStorage
2. Try to navigate to `/phones`
3. Try to call API directly

**Expected Result:**
- [ ] Redirect to login page
- [ ] API returns 401 Unauthorized
- [ ] No data leaks

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-S.2: Token Expiry
**Objective:** Expired tokens are rejected  
**Steps:**
1. Wait for token to expire (1 hour in test)
2. Try to perform action
3. Or manually set expired token

**Expected Result:**
- [ ] Request rejected with 401
- [ ] Redirect to login page
- [ ] Error message displayed

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-S.3: Password Hashing
**Objective:** Passwords are hashed and not stored in plain text  
**Steps:**
1. Create account
2. Check database for password field
3. Verify hash, not plaintext

**Expected Result:**
- [ ] Password is bcrypt hash (60 chars, starts with $2a$)
- [ ] Not in plaintext

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-S.4: CORS Headers
**Objective:** API correctly handles CORS  
**Steps:**
1. Open DevTools
2. Check Network tab for requests
3. Verify CORS headers present

**Expected Result:**
- [ ] `Access-Control-Allow-Origin: http://localhost`
- [ ] Credentials allowed
- [ ] No CORS errors in console

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 9. Data Integrity Testing (UAT-D)

### UAT-D.1: Soft Delete Verification
**Objective:** Deleted phones not shown but preserved in DB  
**Steps:**
1. Delete a phone
2. Check database directly

**Expected Result:**
- [ ] Phone not shown in UI
- [ ] Phone exists in database with deleted_at timestamp
- [ ] Can be recovered if needed

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-D.2: Email Uniqueness
**Objective:** Email uniqueness is enforced  
**Steps:**
1. Create account with `unique-${timestamp}@example.com`
2. Try to create second account with same email

**Expected Result:**
- [ ] First succeeds
- [ ] Second fails with "Email already in use"

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-D.3: Phone Number Normalization
**Objective:** Phone numbers normalized to E.164 format  
**Steps:**
1. Create phone with raw formats:
   - `(11) 99988-7766`
   - `11 99988-7766`
   - `+5511999887766`
2. Verify all normalize to `+5511999887766`

**Expected Result:**
- [ ] All formats normalize to E.164
- [ ] No duplicates created when same number entered differently
- [ ] Display shows both E.164 and raw formats

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 10. Browser Compatibility Testing (UAT-B)

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | Latest | [ ] Pass / [ ] Fail | |
| Firefox | Latest | [ ] Pass / [ ] Fail | |
| Safari | Latest | [ ] Pass / [ ] Fail | |
| Edge | Latest | [ ] Pass / [ ] Fail | |

**Testing Steps for Each:**
1. Login
2. Create phone
3. Search/filter
4. View details
5. Add owner
6. Logout

---

## 11. Accessibility Testing (UAT-A11Y)

### UAT-A11Y.1: Keyboard Navigation
**Objective:** All functionality accessible via keyboard  
**Steps:**
1. Use Tab key to navigate
2. Use Enter/Space to activate buttons
3. Use arrow keys for dropdowns

**Expected Result:**
- [ ] All interactive elements reachable via Tab
- [ ] Focus indicator visible
- [ ] No keyboard traps

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A11Y.2: Color Contrast
**Objective:** Text meets WCAG AA standards (4.5:1 ratio)  
**Steps:**
1. Use browser accessibility checker
2. Inspect all text/background combinations

**Expected Result:**
- [ ] All text passes WCAG AA contrast ratio
- [ ] Error messages distinguishable

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

### UAT-A11Y.3: Screen Reader
**Objective:** App usable with screen reader  
**Steps:**
1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Navigate app

**Expected Result:**
- [ ] Page structure announced correctly
- [ ] Buttons and links labeled
- [ ] Form fields have labels
- [ ] Error messages announced

**Acceptance Criteria:** ✅ Pass / ❌ Fail

---

## 12. UAT Sign-Off

### Summary

| Test Category | Passed | Failed | Notes |
|---------------|--------|--------|-------|
| Authentication | / | / | |
| Phone Management | / | / | |
| Owner Management | / | / | |
| People Management | / | / | |
| UI/UX | / | / | |
| Performance | / | / | |
| Security | / | / | |
| Data Integrity | / | / | |
| Browser Compatibility | / | / | |
| Accessibility | / | / | |

### Issues Found

| Issue ID | Severity | Description | Status |
|----------|----------|-------------|--------|
| | High/Med/Low | | Open/Closed |
| | | | |

### Sign-Off

**Tested By:** _________________ **Date:** _____________

**Test Result:**  
- [ ] **APPROVED** - System ready for production  
- [ ] **APPROVED WITH FIXES** - Minor issues logged, can proceed  
- [ ] **REJECTED** - Critical issues found, cannot proceed

**Comments:**

---

## 13. Automated Test Execution

### Backend Tests (Jest)
```bash
cd backend
npm test:ci
# Expected: 20+ tests passing
# Coverage: >70%
```

### Frontend Tests (Vitest)
```bash
cd frontend
npm run test:unit
# Expected: 10+ tests passing
```

### E2E Tests (Playwright)
```bash
cd frontend
npm run test:e2e
# Expected: 10 E2E scenarios passing
```

### Coverage Report
```bash
npm run coverage
# View: frontend/coverage/index.html
```

---

## 14. Go/No-Go Decision

### Criteria for Production Release

- [ ] All UAT tests passed
- [ ] No critical issues remaining
- [ ] Performance acceptable (page load <3s)
- [ ] Security vulnerabilities mitigated
- [ ] Documentation complete
- [ ] Stakeholder sign-off obtained

**Decision:** ____________  
**Date:** ____________  
**Approved By:** ____________

---

## 15. Post-UAT

### Documentation
- [ ] UAT report generated
- [ ] Issues logged in backlog
- [ ] Known limitations documented
- [ ] User guide prepared

### Knowledge Transfer
- [ ] Team trained on system
- [ ] Runbooks prepared for support
- [ ] Monitoring configured

### Next Steps
- [ ] Deploy to production
- [ ] Phase 2 planning begins
- [ ] Begin CNPJ enrichment feature work
