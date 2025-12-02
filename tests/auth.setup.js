import { test as setup } from '@playwright/test';

/**
 * Authentication Setup for Tests
 * 
 * This file handles authentication before running tests.
 * Since the app requires Firebase auth, we'll mock the user state in localStorage.
 */

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page, context }) => {
  // Navigate to the app
  await page.goto('/');
  
  // Mock authenticated user in localStorage
  // Firebase stores auth state in localStorage/indexedDB
  await context.addInitScript(() => {
    // Mock a logged-in user for tests that require auth
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null
    };
    
    // Store in localStorage for app to detect authenticated state
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
  });
  
  // Wait a moment for the mock to be applied
  await page.waitForTimeout(100);
  
  // Save storage state for other tests to use
  await page.context().storageState({ path: authFile });
});
