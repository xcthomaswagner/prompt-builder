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
    // Mock a logged-in user
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null
    };
    
    // Store in localStorage (simplified mock)
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
  });
  
  // For now, we'll skip actual Firebase auth and test in anonymous mode
  // The app should still render the main UI even without full auth
  
  // Save storage state
  await page.context().storageState({ path: authFile });
});
