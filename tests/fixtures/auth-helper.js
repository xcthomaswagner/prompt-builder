/**
 * Authentication Helper for Tests
 * 
 * Provides utilities to bypass Firebase authentication in E2E tests
 */

/**
 * Set up test authentication by injecting a test user into localStorage
 * Call this in beforeEach hooks before navigating to the app
 */
export async function setupTestAuth(page) {
  await page.addInitScript(() => {
    const testUser = {
      uid: 'test-user-123',
      email: 'test@playwright.test',
      displayName: 'Playwright Test User',
      photoURL: null
    };
    localStorage.setItem('playwright_test_user', JSON.stringify(testUser));
  });
}

/**
 * Standard beforeEach setup for all tests
 * Sets up auth and navigates to the app
 */
export async function standardSetup(page) {
  await setupTestAuth(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}
