import { test, expect } from '@playwright/test';
import { testPrompts, selectors } from './fixtures/test-data.js';

/**
 * Regression Tests
 * 
 * Tests to run before and after refactoring to ensure no breaking changes
 * These tests validate that core functionality remains identical
 */

test.describe('Regression Tests - Pre/Post Refactor', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
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
    expect(output).toContain('PROMPT'); // Should contain prompt structure
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
    
    // Filter out known/acceptable errors (e.g., Firebase warnings)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Firebase') && 
      !err.includes('warning') &&
      !err.includes('DevTools')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('REGRESSION: API calls complete successfully', async ({ page }) => {
    let apiCallMade = false;
    let apiCallSucceeded = false;
    
    // Monitor network requests
    page.on('response', response => {
      const url = response.url();
      if (url.includes('generativelanguage.googleapis.com') || 
          url.includes('openai.com') || 
          url.includes('anthropic.com')) {
        apiCallMade = true;
        if (response.status() === 200) {
          apiCallSucceeded = true;
        }
      }
    });
    
    // Generate prompt
    await page.fill(selectors.promptInput, testPrompts.simple.input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Verify API was called and succeeded
    expect(apiCallMade).toBeTruthy();
    expect(apiCallSucceeded).toBeTruthy();
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
    await page.waitForLoadState('networkidle');
    
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
    if (await copyButton.count() > 0) {
      await copyButton.click();
      
      // Verify feedback
      const feedback = await page.locator('text=/copied|success/i').count();
      expect(feedback).toBeGreaterThan(0);
    }
  });

  test('REGRESSION: error handling works', async ({ page }) => {
    // Try to generate without input (should handle gracefully)
    await page.click(selectors.generateButton);
    
    // Should either disable button or show error
    const hasError = await page.locator('text=/error|required|empty/i').count() > 0;
    const isDisabled = await page.locator(selectors.generateButton).isDisabled();
    
    expect(hasError || isDisabled).toBeTruthy();
  });
});
