import { test, expect } from '@playwright/test';

test.describe('Phone List System E2E Tests', () => {
  const BASE_URL = 'http://localhost';
  const TEST_USER_EMAIL = 'test@example.com';
  const TEST_USER_PASSWORD = 'Password123!';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
  });

  test('E2.1 User can signup with valid credentials', async ({ page }) => {
    // Navigate to signup
    await page.click('a:has-text("Sign Up")');
    await expect(page).toHaveURL(/\/signup/);

    // Fill signup form
    await page.fill('input[name="display_name"]', 'E2E Test User');
    await page.fill('input[type="email"]', `e2etest-${Date.now()}@example.com`);
    await page.fill('input[type="password"]:first-of-type', 'TestPassword123!');
    await page.fill('input[type="password"]:last-of-type', 'TestPassword123!');

    // Submit form
    await page.click('button:has-text("Sign Up")');

    // Should redirect to phone list
    await expect(page).toHaveURL(/\/phones/);
    await expect(page.locator('text=Phones')).toBeVisible();
  });

  test('E2.2 User can login with valid credentials', async ({ page }) => {
    // Already on login page
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);

    // Submit form
    await page.click('button:has-text("Sign In")');

    // Should redirect to phone list
    await expect(page).toHaveURL(/\/phones/);
  });

  test('E2.3 User can create a phone', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Wait for redirect
    await expect(page).toHaveURL(/\/phones/);

    // Click add phone button
    await page.click('button:has-text("Add Phone")');

    // Fill phone form
    const phoneNumber = `+5511${Date.now() % 1000000000}`;
    await page.fill('input[name="e164_number"]', phoneNumber);
    await page.fill('input[name="raw_number"]', '(11) 9999-8888');
    await page.selectOption('select[name="phone_type"]', 'mobile');

    // Submit form
    await page.click('button:has-text("Create")');

    // Verify phone appears in list
    await expect(page.locator(`text=${phoneNumber}`)).toBeVisible();
  });

  test('E2.4 User can view phone details', async ({ page }) => {
    // Login and navigate to phones
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Click on first phone
    const firstPhone = page.locator('[data-testid="phone-card"]').first();
    await firstPhone.click();

    // Should show phone details
    await expect(page.locator('text=Phone Details')).toBeVisible();
    await expect(page.locator('text=E.164')).toBeVisible();
  });

  test('E2.5 User can search phones', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Search for phone
    await page.fill('input[placeholder*="Search"]', '9999');

    // Wait for results
    await page.waitForTimeout(500);

    // Should show filtered results
    const cards = page.locator('[data-testid="phone-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('E2.6 User can filter phones by status', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Change status filter
    await page.selectOption('select[name*="status"]', 'active');

    // Wait for results
    await page.waitForTimeout(500);

    // Verify results are filtered
    const statusBadges = page.locator('span:has-text("Active")');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('E2.7 User can add owner to phone', async ({ page }) => {
    // Login and navigate to phone detail
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Open phone detail
    const firstPhone = page.locator('[data-testid="phone-card"]').first();
    await firstPhone.click();

    // Click on Owners tab
    await page.click('button:has-text("Owners")');

    // Click Add Owner button
    await page.click('button:has-text("Add Owner")');

    // Select a person
    await page.selectOption('select[name="owner_id"]', { index: 0 });

    // Set confidence score
    await page.fill('input[type="range"]', '95');

    // Submit
    await page.click('button:has-text("Add")');

    // Verify owner was added
    await expect(page.locator('text=Owner added')).toBeVisible();
  });

  test('E2.8 User can delete a phone', async ({ page }) => {
    // Login and create a phone
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Open first phone
    const firstPhone = page.locator('[data-testid="phone-card"]').first();
    const phoneText = await firstPhone.textContent();
    await firstPhone.click();

    // Click delete button
    await page.click('button:has-text("Delete")');

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Should return to list
    await expect(page).toHaveURL(/\/phones/);

    // Phone should not be in list
    await expect(page.locator(`text=${phoneText}`)).not.toBeVisible();
  });

  test('E2.9 User can logout', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login|signin/);
  });

  test('E2.10 Layout is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button:has-text("Sign In")');

    // Verify mobile layout works
    const phoneList = page.locator('[data-testid="phone-list"]');
    await expect(phoneList).toBeVisible();

    // Cards should stack vertically
    const cards = page.locator('[data-testid="phone-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});
