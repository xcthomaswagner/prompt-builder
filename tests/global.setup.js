import { test as setup } from '@playwright/test';

/**
 * Global Setup for All Tests
 * 
 * This runs once before all tests to set up authentication state.
 * We use localStorage to bypass Firebase authentication for E2E tests.
 */

setup('setup test user', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Set test user in localStorage
  await page.evaluate(() => {
    const testUser = {
      uid: 'test-user-123',
      email: 'test@playwright.test',
      displayName: 'Playwright Test User',
      photoURL: null
    };
    localStorage.setItem('playwright_test_user', JSON.stringify(testUser));
  });
  
  // Reload to apply the auth state
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  console.log('✅ Test user authenticated via localStorage');
});
