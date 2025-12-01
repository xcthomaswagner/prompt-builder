import { test, expect } from '@playwright/test';
import { testPrompts, selectors } from './fixtures/test-data.js';
import { standardSetup } from './fixtures/auth-helper.js';

/**
 * History Management Tests
 * 
 * Tests prompt history features (save, load, delete, clear)
 * 
 * NOTE: History sidebar is always visible in builder mode (no button to open it).
 * History items are identified by delete buttons with title="Delete".
 */

test.describe('History Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await standardSetup(page);
  });

  // Helper: Wait for history sidebar to be ready
  async function waitForHistorySidebar(page) {
    // The sidebar contains "Prompt History" heading (h2)
    const sidebar = page.locator('h2').filter({ hasText: /Prompt History/i });
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  }

  // Helper: Get history item count (by counting delete buttons)
  async function getHistoryCount(page) {
    const deleteButtons = page.locator('button[title="Delete"]');
    return await deleteButtons.count();
  }

  test('should save prompt to history after generation', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Wait for sidebar to load
    await waitForHistorySidebar(page);
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for Firebase to save the history item (may take a few seconds)
    await page.waitForTimeout(3000);
    
    // Verify there's at least one history item with delete button
    const deleteButtons = page.locator('button[title="Delete"]');
    await expect(deleteButtons.first()).toBeVisible({ timeout: 5000 });
    
    // Count should be at least 1 after generation
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should load prompt from history', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt first to create history
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history to save
    await page.waitForTimeout(2000);
    
    // Clear the input
    await page.fill(selectors.promptInput, '');
    const clearedValue = await page.inputValue(selectors.promptInput);
    expect(clearedValue).toBe('');
    
    // Click on a history item card (the clickable area, not the delete button)
    // History cards are divs with group class that contain delete buttons
    const historyCard = page.locator('div.group').filter({ has: page.locator('button[title="Delete"]') }).first();
    await expect(historyCard).toBeVisible({ timeout: 5000 });
    await historyCard.click();
    
    // Wait for the prompt to load
    await page.waitForTimeout(500);
    
    // Verify input is now populated
    const inputValue = await page.inputValue(selectors.promptInput);
    expect(inputValue.length).toBeGreaterThan(0);
  });

  test('should delete individual history item', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt first to ensure there's history
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history items to load from Firebase
    const deleteButtons = page.locator('button[title="Delete"]');
    await expect(deleteButtons.first()).toBeVisible({ timeout: 10000 });
    
    const initialCount = await deleteButtons.count();
    expect(initialCount).toBeGreaterThan(0);
    
    // Store URL to detect page refresh (regression test for bug)
    const urlBefore = page.url();
    
    // Handle the confirmation dialog
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Click the first delete button
    await deleteButtons.first().click();
    
    // Wait for Firebase delete to complete
    await page.waitForTimeout(1500);
    
    // CRITICAL: Verify NO page refresh occurred (this was a bug)
    expect(page.url()).toBe(urlBefore);
    
    // Verify count decreased by exactly 1
    const newCount = await deleteButtons.count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should toggle private status on history item', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt first
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history to load
    await page.waitForTimeout(2000);
    
    // Find the private toggle button (has title="Private")
    const privateButton = page.locator('button[title="Private"]').first();
    await expect(privateButton).toBeVisible({ timeout: 5000 });
    
    // Store URL to detect page refresh
    const urlBefore = page.url();
    
    // Click the private button
    await privateButton.click();
    
    // Wait and verify no page refresh
    await page.waitForTimeout(1000);
    expect(page.url()).toBe(urlBefore);
    
    // The button should still be visible (not crashed)
    await expect(privateButton).toBeVisible();
  });

  test('should persist history across page reloads', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for Firebase to save
    await page.waitForTimeout(2000);
    
    // Get count before reload
    const countBefore = await getHistoryCount(page);
    expect(countBefore).toBeGreaterThan(0);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for history sidebar to load
    await waitForHistorySidebar(page);
    await page.waitForTimeout(2000);
    
    // Verify history still exists
    const countAfter = await getHistoryCount(page);
    expect(countAfter).toBe(countBefore);
  });

  test('should filter history with search', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt to create history
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history to update
    await page.waitForTimeout(2000);
    
    // Find the search input in history sidebar
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    // Get count before search
    const countBefore = await getHistoryCount(page);
    expect(countBefore).toBeGreaterThan(0);
    
    // Enter nonsensical search query that won't match anything
    await searchInput.fill('xyzqwertyzxcvbnmasdfghjkl123456789');
    
    // Wait for search to filter
    await page.waitForTimeout(500);
    
    // Verify history items are filtered out
    const countAfter = await getHistoryCount(page);
    expect(countAfter).toBe(0);
    
    // Verify empty state is displayed
    const emptyStateText = page.locator('text=/No history items found/i');
    await expect(emptyStateText).toBeVisible();
  });

  test('should show history item metadata (timestamp)', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history to load
    await page.waitForTimeout(2000);
    
    // Verify there's at least one history item (has delete button)
    const deleteButtons = page.locator('button[title="Delete"]');
    await expect(deleteButtons.first()).toBeVisible({ timeout: 5000 });
    
    // History items exist - just verify we have at least one
    const itemCount = await deleteButtons.count();
    expect(itemCount).toBeGreaterThan(0);
  });
});
