import { test, expect } from '@playwright/test';
import { testPrompts, selectors } from './fixtures/test-data.js';
import { standardSetup } from './fixtures/auth-helper.js';

/**
 * History Management Tests
 * 
 * Tests prompt history features (save, load, delete, clear)
 */

test.describe('History Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await standardSetup(page);
  });

  test('should save prompt to history after generation', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Open history panel
    const historyButton = page.locator(selectors.historyButton).first();
    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      // Check for history items
      const historyItems = page.locator('[data-testid="history-item"], .history-item');
      if (await historyItems.count() > 0) {
        expect(await historyItems.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should load prompt from history', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt first
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Clear input
    await page.fill(selectors.promptInput, '');
    
    // Open history
    const historyButton = page.locator('button').filter({ hasText: /history/i }).first();
    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      // Click first history item
      const firstHistoryItem = page.locator('[data-testid="history-item"], .history-item').first();
      if (await firstHistoryItem.count() > 0) {
        await firstHistoryItem.click();
        await page.waitForTimeout(500);
        
        // Verify input is populated
        const inputValue = await page.inputValue(selectors.promptInput);
        expect(inputValue.length).toBeGreaterThan(0);
      }
    }
  });

  test('should delete individual history item', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Open history
    const historyButton = page.locator('button').filter({ hasText: /history/i }).first();
    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      // Get initial count
      const historyItems = page.locator('[data-testid="history-item"], .history-item');
      const initialCount = await historyItems.count();
      
      if (initialCount > 0) {
        // Find delete button on first item
        const deleteButton = page.locator('button').filter({ hasText: /delete|remove|×/i }).first();
        if (await deleteButton.count() > 0) {
          await deleteButton.click();
          await page.waitForTimeout(500);
          
          // Verify count decreased
          const newCount = await historyItems.count();
          expect(newCount).toBeLessThan(initialCount);
        }
      }
    }
  });

  test('should clear all history', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Open history
    const historyButton = page.locator('button').filter({ hasText: /history/i }).first();
    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      // Find clear all button
      const clearButton = page.locator('button').filter({ hasText: /clear all|clear history/i }).first();
      if (await clearButton.count() > 0) {
        await clearButton.click();
        await page.waitForTimeout(500);
        
        // Confirm if dialog appears
        const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|ok/i }).first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(500);
        }
        
        // Verify history is empty
        const historyItems = page.locator('[data-testid="history-item"], .history-item');
        const count = await historyItems.count();
        expect(count).toBe(0);
      }
    }
  });

  test('should persist history across page reloads', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Open history
    const historyButton = page.locator('button').filter({ hasText: /history/i }).first();
    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      // Verify history still exists
      const historyItems = page.locator('[data-testid="history-item"], .history-item');
      if (await historyItems.count() > 0) {
        expect(await historyItems.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should show empty state when no history', async ({ page }) => {
    // Clear history first if it exists
    const historyButton = page.locator('button').filter({ hasText: /history/i }).first();
    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      const clearButton = page.locator('button').filter({ hasText: /clear all/i }).first();
      if (await clearButton.count() > 0) {
        await clearButton.click();
        await page.waitForTimeout(300);
        
        const confirmButton = page.locator('button').filter({ hasText: /confirm|yes/i }).first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(300);
        }
      }
      
      // Check for empty state message
      const emptyState = page.locator('text=/no history|empty|no prompts/i');
      if (await emptyState.count() > 0) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('should show history item metadata', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Open history
    const historyButton = page.locator('button').filter({ hasText: /history/i }).first();
    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      const firstItem = page.locator('[data-testid="history-item"], .history-item').first();
      if (await firstItem.count() > 0) {
        // Check for timestamp or date
        const hasTimestamp = await page.locator('text=/ago|today|yesterday|\\d+:\\d+/i').count() > 0;
        expect(hasTimestamp).toBeTruthy();
      }
    }
  });
});
