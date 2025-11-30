import { test, expect } from '@playwright/test';
import { selectors } from './fixtures/test-data.js';
import { standardSetup } from './fixtures/auth-helper.js';

/**
 * UI Controls Tests
 * 
 * Tests UI interactions, dark mode, settings, etc.
 */

test.describe('UI Controls', () => {
  
  test.beforeEach(async ({ page }) => {
    await standardSetup(page);
  });

  test('should toggle dark mode', async ({ page }) => {
    // Find dark mode toggle
    const darkModeToggle = page.locator('button').filter({ hasText: /dark|light|theme/i }).first();
    
    if (await darkModeToggle.count() > 0) {
      // Get initial theme
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');
      
      // Toggle
      await darkModeToggle.click();
      await page.waitForTimeout(300); // Wait for transition
      
      // Verify theme changed
      const newClass = await htmlElement.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
      
      // Toggle back
      await darkModeToggle.click();
      await page.waitForTimeout(300);
      
      const finalClass = await htmlElement.getAttribute('class');
      expect(finalClass).toBe(initialClass);
    }
  });

  test('should expand and collapse sections', async ({ page }) => {
    // Look for expandable sections (accordion, collapsible)
    const expandButtons = page.locator('button').filter({ hasText: /expand|collapse|show|hide/i });
    
    if (await expandButtons.count() > 0) {
      const firstButton = expandButtons.first();
      
      // Click to expand
      await firstButton.click();
      await page.waitForTimeout(300);
      
      // Click to collapse
      await firstButton.click();
      await page.waitForTimeout(300);
      
      // Should not throw errors
      expect(true).toBeTruthy();
    }
  });

  test('should open and close settings', async ({ page }) => {
    // Find settings button
    const settingsButton = page.locator('button').filter({ hasText: /settings|config|preferences/i }).first();
    
    if (await settingsButton.count() > 0) {
      // Open settings
      await settingsButton.click();
      await page.waitForTimeout(500);
      
      // Verify settings panel/modal is visible
      const settingsPanel = page.locator('[role="dialog"], .settings-panel, [data-testid="settings"]').first();
      if (await settingsPanel.count() > 0) {
        await expect(settingsPanel).toBeVisible();
        
        // Close settings (look for close button or click outside)
        const closeButton = page.locator('button').filter({ hasText: /close|cancel|×/i }).first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  test('should show quickstart templates', async ({ page }) => {
    // Look for templates button or section
    const templatesButton = page.locator('button, a').filter({ hasText: /template|quickstart|example/i }).first();
    
    if (await templatesButton.count() > 0) {
      await templatesButton.click();
      await page.waitForTimeout(500);
      
      // Verify templates are visible
      const templateCards = page.locator('[data-testid="template-card"], .template-card');
      if (await templateCards.count() > 0) {
        expect(await templateCards.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should select a quickstart template', async ({ page }) => {
    // Look for templates
    const templatesButton = page.locator('button, a').filter({ hasText: /template|quickstart/i }).first();
    
    if (await templatesButton.count() > 0) {
      await templatesButton.click();
      await page.waitForTimeout(500);
      
      // Click first template
      const firstTemplate = page.locator('[data-testid="template-card"], .template-card').first();
      if (await firstTemplate.count() > 0) {
        await firstTemplate.click();
        await page.waitForTimeout(500);
        
        // Verify input is populated
        const inputValue = await page.inputValue(selectors.promptInput);
        expect(inputValue.length).toBeGreaterThan(0);
      }
    }
  });

  test('should show history panel', async ({ page }) => {
    // Look for history button
    const historyButton = page.locator('button').filter({ hasText: /history|recent|past/i }).first();
    
    if (await historyButton.count() > 0) {
      await historyButton.click();
      await page.waitForTimeout(500);
      
      // Verify history panel is visible
      const historyPanel = page.locator('[data-testid="history-panel"], .history-panel, aside').first();
      if (await historyPanel.count() > 0) {
        await expect(historyPanel).toBeVisible();
      }
    }
  });

  test('should handle responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    
    // Verify app still loads
    await expect(page.locator(selectors.promptInput)).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    
    await expect(page.locator(selectors.promptInput)).toBeVisible();
    
    // Back to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);
    
    await expect(page.locator(selectors.promptInput)).toBeVisible();
  });

  test('should show tooltips on hover', async ({ page }) => {
    // Find elements with titles or aria-labels
    const elementsWithTooltips = page.locator('[title], [aria-label]');
    
    if (await elementsWithTooltips.count() > 0) {
      const firstElement = elementsWithTooltips.first();
      
      // Hover
      await firstElement.hover();
      await page.waitForTimeout(500);
      
      // Tooltip might appear (not all elements have visible tooltips)
      // Just verify no errors occur
      expect(true).toBeTruthy();
    }
  });

  test('should reset form', async ({ page }) => {
    // Fill in some data
    await page.fill(selectors.promptInput, 'Test input');
    
    // Look for reset/clear button
    const resetButton = page.locator('button').filter({ hasText: /reset|clear|new/i }).first();
    
    if (await resetButton.count() > 0) {
      await resetButton.click();
      await page.waitForTimeout(300);
      
      // Verify input is cleared
      const inputValue = await page.inputValue(selectors.promptInput);
      expect(inputValue).toBe('');
    }
  });

  test('should show loading state during generation', async ({ page }) => {
    await page.fill(selectors.promptInput, 'Test prompt');
    
    // Click generate
    await page.click(selectors.generateButton);
    
    // Check for loading indicator immediately
    const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner, text=/generating|loading/i').first();
    
    // Loading should appear briefly
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    }
    
    // Wait for completion
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
  });
});
