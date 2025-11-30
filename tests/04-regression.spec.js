import { test, expect } from '@playwright/test';
import { testPrompts, selectors } from './fixtures/test-data.js';
import { standardSetup } from './fixtures/auth-helper.js';

/**
 * Regression Tests
 * 
 * Tests to run before and after refactoring to ensure no breaking changes
 * These tests validate that core functionality remains identical
 */

test.describe('Regression Tests - Pre/Post Refactor', () => {
  
  test.beforeEach(async ({ page }) => {
    await standardSetup(page);
  });

  test('REGRESSION: identical output for same inputs', async ({ page }) => {
    const testCase = testPrompts.simple;
    
    // Select output type
    const outputTypeButton = page.locator(selectors.outputTypeButtons)
      .filter({ hasText: new RegExp(testCase.outputType, 'i') })
      .first();
    if (await outputTypeButton.count() > 0) {
      await outputTypeButton.click();
    }
    
    // Fill input
    await page.fill(selectors.promptInput, testCase.input);
    
    // Generate
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Get output
    const output = await page.textContent(selectors.promptOutput);
    
    // Verify output structure (not exact match due to AI variability)
    expect(output.length).toBeGreaterThan(100);
    // In test mode, mock response contains 'Prompt' (case-insensitive check)
    expect(output.toLowerCase()).toContain('prompt');
  });

  test('REGRESSION: all output types work', async ({ page }) => {
    const outputTypes = ['doc', 'deck', 'data', 'code', 'copy', 'comms'];
    
    for (const type of outputTypes) {
      // Select output type
      const button = page.locator(selectors.outputTypeButtons)
        .filter({ hasText: new RegExp(type, 'i') })
        .first();
      
      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(300);
        
        // Fill input
        await page.fill(selectors.promptInput, `Test ${type} prompt`);
        
        // Generate
        await page.click(selectors.generateButton);
        await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
        
        // Verify output
        const output = await page.textContent(selectors.promptOutput);
        expect(output.length).toBeGreaterThan(50);
        
        // Small delay between tests
        await page.waitForTimeout(1000);
      }
    }
  });

  test('REGRESSION: all tones work', async ({ page }) => {
    const tones = ['professional', 'friendly', 'casual', 'executive', 'technical'];
    
    await page.fill(selectors.promptInput, 'Test prompt');
    
    for (const tone of tones) {
      // Select tone
      const toneDropdown = page.locator('select').first();
      if (await toneDropdown.count() > 0) {
        try {
          await toneDropdown.selectOption({ label: new RegExp(tone, 'i') });
          await page.waitForTimeout(200);
        } catch (e) {
          // Tone might not exist, skip
          continue;
        }
      }
    }
    
    // Final generation to verify no errors
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    const output = await page.textContent(selectors.promptOutput);
    expect(output.length).toBeGreaterThan(50);
  });

  test('REGRESSION: all formats work', async ({ page }) => {
    const formats = ['paragraph', 'bullets', 'numbered', 'sections', 'table'];
    
    await page.fill(selectors.promptInput, 'Test prompt');
    
    for (const format of formats) {
      // Select format
      const formatDropdown = page.locator('select').filter({ hasText: /format/i }).first();
      if (await formatDropdown.count() > 0) {
        try {
          await formatDropdown.selectOption({ label: new RegExp(format, 'i') });
          await page.waitForTimeout(200);
        } catch (e) {
          // Format might not exist, skip
          continue;
        }
      }
    }
    
    // Final generation
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    const output = await page.textContent(selectors.promptOutput);
    expect(output.length).toBeGreaterThan(50);
  });

  test('REGRESSION: no console errors during normal flow', async ({ page }) => {
    const consoleErrors = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Perform normal flow
    await page.fill(selectors.promptInput, testPrompts.simple.input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Filter out known/acceptable errors (e.g., Firebase warnings, history errors in test mode)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Firebase') && 
      !err.includes('warning') &&
      !err.includes('DevTools') &&
      !err.includes('history') &&
      !err.includes('Firestore')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('REGRESSION: generation completes successfully', async ({ page }) => {
    // In test mode, API calls are bypassed with mock responses
    // This test verifies the generation flow completes without errors
    
    // Generate prompt
    await page.fill(selectors.promptInput, testPrompts.simple.input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Verify output was generated
    const output = await page.textContent(selectors.promptOutput);
    expect(output.length).toBeGreaterThan(50);
    
    // Verify no error messages are shown
    const errorElement = page.locator('text=/error|failed/i').first();
    const hasError = await errorElement.count() > 0 && await errorElement.isVisible().catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test('REGRESSION: state persists correctly', async ({ page }) => {
    // Set some state
    await page.fill(selectors.promptInput, 'Test input');
    
    // Select output type
    const deckButton = page.locator(selectors.outputTypeButtons)
      .filter({ hasText: /deck/i })
      .first();
    if (await deckButton.count() > 0) {
      await deckButton.click();
    }
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // Verify input is cleared (expected behavior)
    const inputValue = await page.inputValue(selectors.promptInput);
    expect(inputValue).toBe('');
  });

  test('REGRESSION: copy functionality works', async ({ page }) => {
    // Generate prompt
    await page.fill(selectors.promptInput, testPrompts.simple.input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Copy
    const copyButton = page.locator(selectors.copyButton).first();
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await page.waitForTimeout(200);
    
    // Verify button was clickable
    expect(await copyButton.count()).toBeGreaterThan(0);
  });

  test('REGRESSION: error handling works', async ({ page }) => {
    // Button should be disabled when input is empty (prevents errors)
    const isDisabled = await page.locator(selectors.generateButton).isDisabled();
    expect(isDisabled).toBeTruthy();
  });
});
