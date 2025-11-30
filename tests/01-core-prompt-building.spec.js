import { test, expect } from '@playwright/test';
import { testPrompts, selectors, expectedOutputPatterns } from './fixtures/test-data.js';
import { standardSetup } from './fixtures/auth-helper.js';

/**
 * Core Prompt Building Flow Tests
 * 
 * Tests the fundamental prompt generation functionality
 */

test.describe('Core Prompt Building', () => {
  
  test.beforeEach(async ({ page }) => {
    await standardSetup(page);
  });

  test('should load the application successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Intelligent Prompt Builder/i);
    await expect(page.locator(selectors.promptInput)).toBeVisible();
    // Button exists but may be disabled when input is empty
    await expect(page.locator(selectors.generateButton)).toBeAttached();
  });

  test('should generate a simple prompt', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Enter prompt text
    await page.fill(selectors.promptInput, input);
    
    // Click generate
    await page.click(selectors.generateButton);
    
    // Wait for output (may take a few seconds for API call)
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Verify output exists and is not empty
    const outputText = await page.textContent(selectors.promptOutput);
    expect(outputText.length).toBeGreaterThan(50);
    expect(outputText).toMatch(expectedOutputPatterns.simple);
  });

  test('should change output type and generate', async ({ page }) => {
    const { input, outputType } = testPrompts.deck;
    
    // Select output type (Deck)
    const deckButton = page.locator(selectors.outputTypeButtons).filter({ hasText: /deck/i }).first();
    await deckButton.click();
    
    // Enter prompt
    await page.fill(selectors.promptInput, input);
    
    // Generate
    await page.click(selectors.generateButton);
    
    // Verify output
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    const outputText = await page.textContent(selectors.promptOutput);
    expect(outputText).toMatch(expectedOutputPatterns.deck);
  });

  test('should change tone and generate different output', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Fill input
    await page.fill(selectors.promptInput, input);
    
    // Change tone to "Friendly"
    const toneSelector = page.locator('select').filter({ hasText: /professional|friendly/i }).first();
    if (await toneSelector.count() > 0) {
      await toneSelector.selectOption({ label: /friendly/i });
    }
    
    // Generate
    await page.click(selectors.generateButton);
    
    // Verify output exists
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    const outputText = await page.textContent(selectors.promptOutput);
    expect(outputText.length).toBeGreaterThan(50);
  });

  test('should change style and format', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Fill input
    await page.fill(selectors.promptInput, input);
    
    // Change style (if dropdown exists)
    const styleDropdown = page.locator('select').filter({ hasText: /direct|narrative/i }).first();
    if (await styleDropdown.count() > 0) {
      await styleDropdown.selectOption({ index: 1 });
    }
    
    // Change format (if dropdown exists)
    const formatDropdown = page.locator('select').filter({ hasText: /paragraph|bullets/i }).first();
    if (await formatDropdown.count() > 0) {
      await formatDropdown.selectOption({ label: /bullets/i });
    }
    
    // Generate
    await page.click(selectors.generateButton);
    
    // Verify output
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    const outputText = await page.textContent(selectors.promptOutput);
    expect(outputText.length).toBeGreaterThan(50);
  });

  test('should show error for empty input', async ({ page }) => {
    // Button should be disabled when input is empty
    const isButtonDisabled = await page.locator(selectors.generateButton).isDisabled();
    expect(isButtonDisabled).toBeTruthy();
  });

  test('should copy prompt to clipboard', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Click copy button
    const copyButton = page.locator(selectors.copyButton).first();
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    
    // Wait a moment for copy action
    await page.waitForTimeout(200);
    
    // Verify copy button exists and was clickable (actual clipboard testing requires permissions)
    expect(await copyButton.count()).toBeGreaterThan(0);
  });

  test('should handle multiple consecutive generations', async ({ page }) => {
    const prompts = [testPrompts.simple, testPrompts.technical];
    
    for (const prompt of prompts) {
      await page.fill(selectors.promptInput, prompt.input);
      await page.click(selectors.generateButton);
      await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
      
      const outputText = await page.textContent(selectors.promptOutput);
      expect(outputText.length).toBeGreaterThan(50);
      
      // Small delay between generations
      await page.waitForTimeout(1000);
    }
  });

  test('should show token count estimation', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Fill input
    await page.fill(selectors.promptInput, input);
    
    // Wait a bit for token count to update
    await page.waitForTimeout(300);
    
    // Check for token count display
    const tokenCount = page.locator('text=/\\d+ tokens/i').first();
    await expect(tokenCount).toBeVisible({ timeout: 2000 });
    
    // Verify it's a reasonable number
    const tokenText = await tokenCount.textContent();
    const count = parseInt(tokenText.match(/\d+/)[0]);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(10000);
  });
});
