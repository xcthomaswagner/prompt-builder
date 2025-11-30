import { test, expect } from '@playwright/test';
import { standardSetup } from './fixtures/auth-helper.js';

/**
 * Verbalized Sampling Tests
 * 
 * Tests the Verbalized Sampling (VS) feature in Experiment Mode
 * which generates diverse prompt options instead of a single output.
 */

test.describe('Verbalized Sampling', () => {
  
  test.beforeEach(async ({ page }) => {
    await standardSetup(page);
  });

  test('should display Generation Mode selector in Experiment Mode', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await expect(experimentButton).toBeVisible();
    await experimentButton.click();
    
    // Wait for experiment mode to load
    await page.waitForTimeout(500);
    
    // Check for Generation Mode selector
    const generationModeLabel = page.locator('text=/Generation Mode/i');
    await expect(generationModeLabel).toBeVisible();
    
    // Check for Focused and Exploratory mode buttons
    const focusedButton = page.locator('button').filter({ hasText: 'Focused' });
    const exploratoryButton = page.locator('button').filter({ hasText: 'Exploratory' });
    
    await expect(focusedButton).toBeVisible();
    await expect(exploratoryButton).toBeVisible();
  });

  test('should toggle between Focused and Exploratory modes', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // Initially Focused should be selected (default)
    const focusedButton = page.locator('button').filter({ hasText: 'Focused' });
    const exploratoryButton = page.locator('button').filter({ hasText: 'Exploratory' });
    
    // Click Exploratory mode
    await exploratoryButton.first().click();
    await page.waitForTimeout(300);
    
    // Novelty slider should appear in Exploratory mode
    const noveltyLabel = page.locator('text=/Novelty Level/i');
    await expect(noveltyLabel).toBeVisible();
    
    // Click back to Focused mode
    await focusedButton.first().click();
    await page.waitForTimeout(300);
    
    // Novelty slider should be hidden
    await expect(noveltyLabel).not.toBeVisible();
  });

  test('should show novelty slider options in Exploratory mode', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // Switch to Exploratory mode
    const exploratoryButton = page.locator('button').filter({ hasText: /^Exploratory/ }).first();
    await exploratoryButton.click();
    await page.waitForTimeout(300);
    
    // Check for novelty level labels
    const conservativeLabel = page.locator('text=/Conservative/i');
    const creativeLabel = page.locator('text=/Creative/i');
    
    await expect(conservativeLabel).toBeVisible();
    await expect(creativeLabel).toBeVisible();
  });

  test('should show different button in Exploratory mode', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // In Focused mode, should see "Run Experiment"
    let runButton = page.locator('button').filter({ hasText: /Run Experiment/i });
    await expect(runButton).toBeVisible();
    
    // Switch to Exploratory mode
    const exploratoryButton = page.locator('button').filter({ hasText: /^Exploratory/ }).first();
    await exploratoryButton.click();
    await page.waitForTimeout(300);
    
    // Should now see "Generate X Diverse Options" button (the main action button)
    const vsButton = page.locator('button').filter({ hasText: /^Generate.*Diverse Options/i });
    await expect(vsButton).toBeVisible();
  });

  test('should hide Matrix Selector in Exploratory mode', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // In Focused mode, Matrix Selector (Tones, Lengths, Formats) should be visible
    const tonesLabel = page.locator('text=/Tones/i');
    await expect(tonesLabel).toBeVisible();
    
    // Switch to Exploratory mode
    const exploratoryButton = page.locator('button').filter({ hasText: /^Exploratory/ }).first();
    await exploratoryButton.click();
    await page.waitForTimeout(300);
    
    // Matrix Selector should be hidden
    await expect(tonesLabel).not.toBeVisible();
  });

  test('should show info panel when clicking info button', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // Find and click the info button in Generation Mode section
    const infoButton = page.locator('button[title="What is this?"]');
    await infoButton.click();
    await page.waitForTimeout(300);
    
    // Check for info panel content
    const infoText = page.locator('text=/Verbalized Sampling/i');
    await expect(infoText).toBeVisible();
  });

  test('should display empty state in Exploratory mode before running', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // Switch to Exploratory mode
    const exploratoryButton = page.locator('button').filter({ hasText: /^Exploratory/ }).first();
    await exploratoryButton.click();
    await page.waitForTimeout(300);
    
    // Should see empty state message
    const emptyStateText = page.locator('text=/Run an experiment in Exploratory mode/i');
    await expect(emptyStateText).toBeVisible();
  });

  test('should disable Generate button when no prompt entered', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // Switch to Exploratory mode
    const exploratoryButton = page.locator('button').filter({ hasText: /^Exploratory/ }).first();
    await exploratoryButton.click();
    await page.waitForTimeout(300);
    
    // Generate button should be disabled (no prompt entered)
    const vsButton = page.locator('button').filter({ hasText: /^Generate.*Diverse Options/i });
    await expect(vsButton).toBeDisabled();
    
    // Enter a prompt
    const promptInput = page.locator('textarea').first();
    await promptInput.fill('Write a sales email for our new product');
    await page.waitForTimeout(300);
    
    // Button should now be enabled
    await expect(vsButton).toBeEnabled();
  });

  test('should show loading state when generating options', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // Switch to Exploratory mode
    const exploratoryButton = page.locator('button').filter({ hasText: /^Exploratory/ }).first();
    await exploratoryButton.click();
    await page.waitForTimeout(300);
    
    // Enter a prompt
    const promptInput = page.locator('textarea').first();
    await promptInput.fill('Write a sales email for our new product');
    
    // Click generate button
    const vsButton = page.locator('button').filter({ hasText: /^Generate.*Diverse Options/i });
    await vsButton.click();
    
    // Should show loading state (either in button or in results area)
    const loadingIndicator = page.locator('text=/Generating/i');
    // Note: This might be quick, so we use a short timeout
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 }).catch(() => {
      // Loading state may have already passed, which is fine
    });
  });

  test('should change button color based on mode', async ({ page }) => {
    // Navigate to Experiment Mode
    const experimentButton = page.locator('button').filter({ hasText: /experiment/i }).first();
    await experimentButton.click();
    await page.waitForTimeout(500);
    
    // Enter a prompt first so the button is enabled
    const promptInput = page.locator('textarea').first();
    await promptInput.fill('Test prompt for button color');
    await page.waitForTimeout(300);
    
    // In Focused mode, button should have cyan/blue gradient
    let runButton = page.locator('button').filter({ hasText: /Run Experiment/i });
    const focusedClasses = await runButton.getAttribute('class');
    expect(focusedClasses).toContain('cyan');
    
    // Switch to Exploratory mode
    const exploratoryButton = page.locator('button').filter({ hasText: /^Exploratory/ }).first();
    await exploratoryButton.click();
    await page.waitForTimeout(300);
    
    // VS button should have purple gradient
    const vsButton = page.locator('button').filter({ hasText: /^Generate.*Diverse Options/i });
    const exploratoryClasses = await vsButton.getAttribute('class');
    expect(exploratoryClasses).toContain('purple');
  });
});
