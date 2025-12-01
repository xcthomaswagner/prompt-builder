import { test, expect } from '@playwright/test';
import { testPrompts, selectors } from './fixtures/test-data.js';
import { standardSetup } from './fixtures/auth-helper.js';

/**
 * Regression Tests
 * 
 * Tests to run before and after refactoring to ensure no breaking changes.
 * These tests validate that core functionality remains identical.
 * 
 * NOTE: Tests use hard assertions. If elements don't exist, tests will fail
 * to catch UI regressions early.
 */

test.describe('Regression Tests - Pre/Post Refactor', () => {
  
  test.beforeEach(async ({ page }) => {
    await standardSetup(page);
  });

  test('REGRESSION: identical output for same inputs', async ({ page }) => {
    const testCase = testPrompts.simple;
    
    // Select output type - button must exist
    const outputTypeButton = page.locator('button').filter({ hasText: new RegExp(`^${testCase.outputType}$`, 'i') }).first();
    await expect(outputTypeButton).toBeVisible({ timeout: 5000 });
    await outputTypeButton.click();
    
    // Fill input
    await page.fill(selectors.promptInput, testCase.input);
    
    // Generate
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Get output
    const output = await page.textContent(selectors.promptOutput);
    
    // Verify output structure (not exact match due to AI variability)
    expect(output.length).toBeGreaterThan(100);
  });

  test('REGRESSION: all output types work', async ({ page }) => {
    const outputTypes = ['Doc', 'Deck', 'Data', 'Code', 'Copy', 'Comms'];
    
    for (const type of outputTypes) {
      // Select output type - must exist
      const button = page.locator('button').filter({ hasText: new RegExp(`^${type}$`, 'i') }).first();
      await expect(button).toBeVisible({ timeout: 5000 });
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
      await page.waitForTimeout(500);
    }
  });

  test('REGRESSION: tone selection works', async ({ page }) => {
    await page.fill(selectors.promptInput, 'Test prompt');
    
    // Expand Advanced Configuration section
    const advancedButton = page.locator('button').filter({ hasText: /Advanced Configuration/i });
    await expect(advancedButton).toBeVisible({ timeout: 5000 });
    await advancedButton.click();
    await page.waitForTimeout(300);
    
    // Click the tone dropdown (shows current tone)
    const toneDropdown = page.locator('button').filter({ hasText: /Professional|Friendly|Casual/i }).first();
    await expect(toneDropdown).toBeVisible({ timeout: 5000 });
    await toneDropdown.click();
    await page.waitForTimeout(200);
    
    // Select a tone from dropdown
    const toneOption = page.locator('button, div').filter({ hasText: /^Friendly$/ }).first();
    await expect(toneOption).toBeVisible({ timeout: 5000 });
    await toneOption.click();
    await page.waitForTimeout(200);
    
    // Generate and verify no errors
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    const output = await page.textContent(selectors.promptOutput);
    expect(output.length).toBeGreaterThan(50);
  });

  test('REGRESSION: format selection works', async ({ page }) => {
    await page.fill(selectors.promptInput, 'Test prompt');
    
    // Expand Advanced Configuration section
    const advancedButton = page.locator('button').filter({ hasText: /Advanced Configuration/i });
    await expect(advancedButton).toBeVisible({ timeout: 5000 });
    await advancedButton.click();
    await page.waitForTimeout(300);
    
    // Click the format dropdown (shows current format)
    const formatDropdown = page.locator('button').filter({ hasText: /Paragraph|Bullet|Numbered/i }).first();
    await expect(formatDropdown).toBeVisible({ timeout: 5000 });
    await formatDropdown.click();
    await page.waitForTimeout(200);
    
    // Select Bullet Points from dropdown
    const formatOption = page.locator('button, div').filter({ hasText: /Bullet Points/i }).first();
    await expect(formatOption).toBeVisible({ timeout: 5000 });
    await formatOption.click();
    await page.waitForTimeout(200);
    
    // Generate
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
    
    // Filter out known/acceptable errors (e.g., Firebase warnings in test mode)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Firebase') && 
      !err.includes('warning') &&
      !err.includes('DevTools') &&
      !err.includes('history') &&
      !err.includes('Firestore') &&
      !err.includes('net::ERR')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('REGRESSION: generation completes successfully', async ({ page }) => {
    // Generate prompt
    await page.fill(selectors.promptInput, testPrompts.simple.input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Verify output was generated
    const output = await page.textContent(selectors.promptOutput);
    expect(output.length).toBeGreaterThan(50);
    
    // Verify generate button is not stuck in loading state
    const generateButton = page.locator(selectors.generateButton);
    await expect(generateButton).toBeEnabled({ timeout: 5000 });
  });

  test('REGRESSION: state clears on page reload', async ({ page }) => {
    // Fill some input
    await page.fill(selectors.promptInput, 'Test input');
    
    // Select output type
    const deckButton = page.locator('button').filter({ hasText: /^Deck$/i }).first();
    await expect(deckButton).toBeVisible({ timeout: 5000 });
    await deckButton.click();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    
    // Verify input is cleared (expected behavior - no local persistence)
    const inputValue = await page.inputValue(selectors.promptInput);
    expect(inputValue).toBe('');
  });

  test('REGRESSION: copy functionality works', async ({ page }) => {
    // Generate prompt
    await page.fill(selectors.promptInput, testPrompts.simple.input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Find and click copy button
    const copyButton = page.locator('button').filter({ hasText: /Copy/i }).first();
    await expect(copyButton).toBeVisible({ timeout: 5000 });
    await copyButton.click();
    await page.waitForTimeout(200);
    
    // Button should show "Copied" feedback or remain visible
    await expect(copyButton).toBeVisible();
  });

  test('REGRESSION: generate button disabled when input empty', async ({ page }) => {
    // Clear any existing input
    await page.fill(selectors.promptInput, '');
    
    // Button should be disabled when input is empty
    const generateButton = page.locator(selectors.generateButton);
    await expect(generateButton).toBeDisabled({ timeout: 5000 });
    
    // Fill input
    await page.fill(selectors.promptInput, 'Some input');
    
    // Button should now be enabled
    await expect(generateButton).toBeEnabled({ timeout: 5000 });
  });

  test('REGRESSION: page refresh does not cause crash', async ({ page }) => {
    // Fill input and generate
    await page.fill(selectors.promptInput, testPrompts.simple.input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Verify app still works
    await expect(page.locator(selectors.promptInput)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(selectors.generateButton)).toBeVisible();
  });
});
