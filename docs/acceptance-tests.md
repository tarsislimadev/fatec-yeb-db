# User Acceptance Test Plan

**Phase:** Phase 1 MVP Foundation  
**Test Environment:** Staging (production-like)  
**Duration:** 1 week UAT before Phase 1 release

## Test Scenarios

### 1. Authentication & User Management

#### 1.1 Signup Flow
**Given:** New user on signup page  
**When:** User enters email, password, and display name  
**Then:** User is created, auto-logged in, redirected to phone list  
**Acceptance:** User can immediately view empty phone list

**Given:** User with duplicate email  
**When:** User attempts signup with existing email  
**Then:** Error message "Email already registered"  
**Acceptance:** No account created, form cleared

**Given:** User on signup form  
**When:** User enters weak password (< 8 chars)  
**Then:** Error message "Password must be at least 8 characters"  
**Acceptance:** Form prevents submission

---

#### 1.2 Signin Flow
**Given:** Registered user on login page  
**When:** User enters correct email and password  
**Then:** User is logged in, JWT token stored, redirected to phone list  
**Acceptance:** All API calls use Bearer token

**Given:** User with wrong password  
**When:** User enters 5 incorrect passwords in 5 minutes  
**Then:** Account is locked, error message "Too many attempts, account locked for 15 minutes"  
**Acceptance:** Login blocked until time expires or admin unlock

**Given:** Locked-out user after 15 minutes  
**When:** User attempts login again  
**Then:** Login succeeds with correct password  
**Acceptance:** Lockout auto-expires

---

#### 1.3 Password Recovery
**Given:** User on forgot password page  
**When:** User enters registered email  
**Then:** Email sent with reset token link, message "Check your email"  
**Acceptance:** User receives email within 30 seconds

**Given:** User clicks reset link in email  
**When:** User enters new password  
**Then:** Password is reset, user redirected to login  
**Acceptance:** Old password no longer works, new password logs in

**Given:** User received reset token  
**When:** User waits 61 minutes and clicks link  
**Then:** Error "Token expired, request new reset"  
**Acceptance:** Old token is invalid

**Given:** User with reset token  
**When:** User clicks link, uses token once, then clicks again  
**Then:** Second click shows "Token already used"  
**Acceptance:** Tokens are single-use

---

#### 1.4 Google OAuth Signup/Signin
**Given:** User on login page  
**When:** User clicks "Sign in with Google"  
**Then:** Redirects to Google consent screen  
**Acceptance:** Proper OAuth flow initiated

**Given:** User authorizes Google consent  
**When:** Redirect returns with authorization code  
**Then:** New account created if email not registered, logged in  
**Acceptance:** User sees phone list immediately

**Given:** User already signed up with Google  
**When:** User clicks "Sign in with Google" again  
**Then:** Existing account linked (no duplicate)  
**Acceptance:** Same user ID returned

---

#### 1.5 Microsoft OAuth Signup/Signin
**Given:** User on login page  
**When:** User clicks "Sign in with Outlook"  
**Then:** Redirects to Microsoft consent screen  
**Acceptance:** Proper OAuth flow initiated

**Given:** User authorizes Microsoft consent  
**When:** Redirect returns with authorization code  
**Then:** New account created if email not registered, logged in  
**Acceptance:** User sees phone list immediately

---

### 2. Phone CRUD Operations

#### 2.1 Create Phone
**Given:** Logged-in user on phone list  
**When:** User clicks "Add Phone" and enters "+55119876543210"  
**Then:** Phone created, appears in list with status "active"  
**Acceptance:** Phone object returned with UUID, timestamps

**Given:** User on create phone form  
**When:** User enters malformed number (e.g., "123")  
**Then:** Error "Invalid phone format, use E.164 format (+55...)"  
**Acceptance:** Form validation occurs client-side and server-side

**Given:** User with existing phone "+55119876543210"  
**When:** User attempts to create same number again  
**Then:** Error "Phone number already exists"  
**Acceptance:** Duplicate prevention works

**Given:** User creating phone  
**When:** User provides Idempotency-Key header and request fails  
**Then:** Retry with same Idempotency-Key returns same result  
**Acceptance:** Safe idempotent operation

---

#### 2.2 List Phones
**Given:** User with 150 phone records  
**When:** User views phone list (page 1)  
**Then:** First 20 phones shown, pagination shows "Page 1 of 8"  
**Acceptance:** Correct page_size=20, total_items=150, total_pages=8

**Given:** User on phone list  
**When:** User clicks page 2  
**Then:** Next 20 phones shown (items 21-40)  
**Acceptance:** Pagination works correctly

**Given:** User on phone list  
**When:** User enters search term "986" in search box  
**Then:** Only phones matching e164_number or raw_number shown  
**Acceptance:** Search filters results

**Given:** User on phone list  
**When:** User filters by status="active"  
**Then:** Only active phones shown  
**Acceptance:** Filter reduces result set

**Given:** User on phone list  
**When:** User sorts by "last_seen_at" descending  
**Then:** Most recently seen phones appear first  
**Acceptance:** Sort order applied

---

#### 2.3 View Phone Details
**Given:** User on phone list  
**When:** User clicks on a phone  
**Then:** Detailed view shows all phone fields, owners, channels, consents  
**Acceptance:** Complete phone object rendered with relations

**Given:** Phone detail page open  
**When:** Phone has 3 owners  
**Then:** All 3 owners displayed with relation_label and confidence_score  
**Acceptance:** Relations load correctly

**Given:** Phone detail page  
**When:** Phone has channel types: call, whatsapp, telegram  
**Then:** All enabled channels shown with toggle controls  
**Acceptance:** Channels array populated

---

#### 2.4 Update Phone
**Given:** Phone detail page  
**When:** User changes type from "mobile" to "landline"  
**Then:** Phone updated, detail page refreshes  
**Acceptance:** PATCH request succeeds, updated_at timestamp changes

**Given:** Phone detail page  
**When:** User changes status to "inactive"  
**Then:** Phone marked inactive, icon changes in list  
**Acceptance:** Status filter excludes inactive phones from default list

---

#### 2.5 Delete Phone
**Given:** Phone with no active owners/relations  
**When:** User clicks "Delete" button  
**Then:** Phone removed from list after confirmation  
**Acceptance:** 204 No Content response, phone unavailable

**Given:** Phone with 2 active owner relations  
**When:** User attempts to delete  
**Then:** Error "Cannot delete phone with active relations (2)"  
**Acceptance:** Business rule prevents deletion

---

### 3. Phone Owner Relations

#### 3.1 Add Owner to Phone
**Given:** Phone detail page  
**When:** User clicks "Add Owner" and selects a person  
**Then:** Owner relation created with relation_label and confidence_score  
**Acceptance:** Relation appears in owners list immediately

**Given:** Add owner dialog  
**When:** User searches for person "John"  
**Then:** Matching people listed (name, email, role)  
**Acceptance:** Search autocomplete works

**Given:** Owner dialog  
**When:** User adds relation_label "personal" and confidence 95  
**Then:** Relation saved with those values  
**Acceptance:** All fields persisted

**Given:** Existing relation: phone→person "personal"  
**When:** User adds same relation again  
**Then:** Error "Relation already exists"  
**Acceptance:** Duplicate relations prevented

---

#### 3.2 Update Owner Relation
**Given:** Phone with owner relation  
**When:** User changes relation_label from "personal" to "work"  
**Then:** Relation updated  
**Acceptance:** Change visible immediately

**Given:** Owner relation  
**When:** User changes end_date to "2026-04-01"  
**Then:** Relation marked as inactive (end_date set)  
**Acceptance:** Historical record preserved

---

#### 3.3 Remove Owner Relation
**Given:** Phone with 3 owners  
**When:** User clicks "Remove" on one owner  
**Then:** Relation deleted, owners count decreases to 2  
**Acceptance:** Owner removed, others unaffected

---

### 4. Phone Channels

#### 4.1 View Available Channels
**Given:** Phone detail page  
**When:** Page loads  
**Then:** Available channels shown: call, whatsapp, telegram, sms  
**Acceptance:** All channel types displayed

**Given:** Phone with channels: call enabled, whatsapp disabled  
**When:** Page loads  
**Then:** Toggles show current enabled states  
**Acceptance:** UI reflects database state

---

#### 4.2 Enable/Disable Channel
**Given:** Phone with whatsapp disabled  
**When:** User toggles whatsapp to enabled  
**Then:** Channel enabled, toggle switches  
**Acceptance:** Change persisted to database

---

### 5. Phone Consents & Suppression

#### 5.1 View Consent Status
**Given:** Phone detail page  
**When:** Page loads  
**Then:** Consent types (marketing, transactional) shown with status  
**Acceptance:** Status shows granted/revoked/unknown

---

#### 5.2 Update Consent
**Given:** Phone with marketing consent="unknown"  
**When:** User sets marketing consent to "granted"  
**Then:** Consent updated with recorded_at timestamp  
**Acceptance:** Change visible, timestamp recorded

**Given:** Phone with marketing consent="granted"  
**When:** User revokes consent  
**Then:** Status changes to "revoked", recorded_at updated  
**Acceptance:** History preserved (no hard-delete)

---

### 6. UI/UX Standards

#### 6.1 Navigation & Layout
**Given:** Logged-in user on any page  
**When:** Page loads  
**Then:** Header shows user name, signout button, navigation  
**Acceptance:** Consistent layout across all pages

---

#### 6.2 Form Validation
**Given:** Any form (signup, phone create, owner add)  
**When:** User submits invalid data  
**Then:** Client-side validation shows error inline  
**Acceptance:** Prevents unnecessary API calls

**Given:** Form with client-side error  
**When:** User corrects field  
**Then:** Error clears  
**Acceptance:** Real-time feedback

---

#### 6.3 Loading & Error States
**Given:** Phone list loading  
**When:** API request in progress  
**Then:** Loading spinner shown  
**Acceptance:** User knows action is in progress

**Given:** API returns 500 error  
**When:** Page loads  
**Then:** User sees "Something went wrong" message with request_id  
**Acceptance:** Error gracefully handled, request_id for support

---

#### 6.4 Responsive Design
**Given:** Phone list on mobile (375px width)  
**When:** Page loads  
**Then:** Layout adapts, no horizontal scroll  
**Acceptance:** Mobile-friendly responsive design

**Given:** Phone detail page on tablet (768px)  
**When:** Page loads  
**Then:** Two-column layout optimal for tablet  
**Acceptance:** Tablet layout optimized

---

### 7. Session & Security

#### 7.1 Session Timeout
**Given:** User logged in  
**When:** 30 minutes of inactivity pass  
**Then:** Next API call returns 401, user redirected to login  
**Acceptance:** Expired token handled gracefully

---

#### 7.2 CSRF Protection
**Given:** User on create phone form  
**When:** Form submits  
**Then:** CSRF token included in request  
**Acceptance:** POST requests protected

---

#### 7.3 Token in LocalStorage
**Given:** User signs in  
**When:** Page refreshes  
**Then:** Token persists, user remains logged in  
**Acceptance:** Token stored securely in localStorage

**Given:** User signs out  
**When:** Signout completes  
**Then:** Token cleared, user redirected to login  
**Acceptance:** Clean logout

---

### 8. Data Consistency

#### 8.1 Concurrent Updates
**Given:** Two browser tabs with same phone open  
**When:** Tab 1 updates phone status, Tab 2 updates type  
**Then:** Both changes persist (optimistic concurrency)  
**Acceptance:** No data loss (last-write-wins acceptable for MVP)

---

#### 8.2 Data Integrity
**Given:** Phone with multiple relations  
**When:** Phone deleted  
**Then:** All related records deleted (cascading delete)  
**Acceptance:** No orphaned records

---

### 9. Performance

#### 9.1 List Load Time
**Given:** Phone list with 150 items  
**When:** Page loads first 20 items  
**Then:** Load time < 2 seconds  
**Acceptance:** Acceptable performance

#### 9.2 Search Response
**Given:** User searches 150-item list  
**When:** User types search term  
**Then:** Results filtered within < 500ms  
**Acceptance:** Search feels responsive

---

## Test Execution Plan

### Week 1 (UAT Phase)

**Day 1-2: Authentication**
- Test all signup/signin flows
- Test OAuth integrations (Google, Microsoft)
- Test password recovery
- Verify lockout mechanism

**Day 3: Phone CRUD**
- Test create, read, list, update, delete
- Test search, filter, pagination
- Test validation errors

**Day 4: Relations & Metadata**
- Test owner creation/deletion
- Test channel enablement
- Test consent management
- Test source tracking

**Day 5: UI/UX & Security**
- Test responsive design
- Test session timeout
- Test error messages
- Test loading states

**Day 6-7: Regression & Edge Cases**
- Retest critical paths
- Test data consistency
- Performance testing
- Accessibility check (WCAG 2.1 AA)

---

## Pass/Fail Criteria

**PASS:** All scenarios execute successfully with no data loss or security issues  
**FAIL:** Any scenario fails or user cannot complete intended workflow  
**DEFER:** Known limitation or Phase 2 feature (documented)

---

## Regression Test Suite

After Phase 1, run regression tests on:
1. All authentication flows
2. Phone CRUD operations (create, read, list, update, delete)
3. Owner relation management
4. Search and filtering
5. Session/logout
6. Error handling (test 5 error codes)

