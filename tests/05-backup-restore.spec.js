import { test, expect } from '@playwright/test';
import { testPrompts, selectors } from './fixtures/test-data.js';
import { standardSetup } from './fixtures/auth-helper.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Backup & Restore Tests
 * 
 * Tests for prompt history backup (export) and restore (import) functionality
 */

test.describe('Backup & Restore', () => {
  
  test.beforeEach(async ({ page }) => {
    await standardSetup(page);
  });

  test('should display backup and restore buttons in history sidebar', async ({ page }) => {
    // Backup button should be visible
    const backupButton = page.locator('button:has-text("Backup")');
    await expect(backupButton).toBeVisible();
    
    // Restore button/label should be visible
    const restoreLabel = page.locator('label:has-text("Restore")');
    await expect(restoreLabel).toBeVisible();
  });

  test('should disable backup button when history is empty', async ({ page }) => {
    // Check if backup button exists
    const backupButton = page.locator('button:has-text("Backup")');
    await expect(backupButton).toBeVisible();
    
    // If no history, button should be disabled (check for cursor-not-allowed class or disabled attribute)
    const historyCount = page.locator('span').filter({ hasText: /^\d+$/ }).first();
    const countText = await historyCount.textContent();
    
    if (countText === '0') {
      // Button should have disabled styling
      const isDisabled = await backupButton.getAttribute('disabled');
      expect(isDisabled !== null || await backupButton.evaluate(el => el.classList.contains('cursor-not-allowed'))).toBeTruthy();
    }
  });

  test('should enable backup button when history has items', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt to create history
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history to update
    await page.waitForTimeout(1000);
    
    // Backup button should be enabled
    const backupButton = page.locator('button:has-text("Backup")');
    await expect(backupButton).toBeVisible();
    
    // Should not be disabled
    const isDisabled = await backupButton.getAttribute('disabled');
    expect(isDisabled).toBeNull();
  });

  test('should download JSON file when backup is clicked', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt to create history
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history to update
    await page.waitForTimeout(1000);
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click backup button
    const backupButton = page.locator('button:has-text("Backup")');
    await backupButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename format
    expect(download.suggestedFilename()).toMatch(/prompt-history-backup-\d{4}-\d{2}-\d{2}\.json/);
  });

  test('should export valid JSON with expected structure', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt to create history
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history to update
    await page.waitForTimeout(1000);
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click backup button
    const backupButton = page.locator('button:has-text("Backup")');
    await backupButton.click();
    
    // Wait for download and save to temp file
    const download = await downloadPromise;
    const downloadPath = await download.path();
    
    // Read and parse the downloaded file
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    // Verify structure
    expect(Array.isArray(jsonData)).toBeTruthy();
    expect(jsonData.length).toBeGreaterThan(0);
    
    // Check first item has expected fields
    const firstItem = jsonData[0];
    expect(firstItem).toHaveProperty('originalText');
    expect(firstItem).toHaveProperty('finalPrompt');
    expect(firstItem).toHaveProperty('outputType');
    expect(firstItem).toHaveProperty('tone');
    expect(firstItem).toHaveProperty('format');
    expect(firstItem).toHaveProperty('signature');
  });

  test('should have file input for restore functionality', async ({ page }) => {
    // Find the hidden file input within the restore label
    const fileInput = page.locator('label:has-text("Restore") input[type="file"]');
    await expect(fileInput).toBeAttached();
    
    // Should accept JSON files
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toBe('.json');
  });

  test('should import backup file and show results', async ({ page }) => {
    // Create a mock backup file
    const mockBackupData = [
      {
        originalText: 'Test import prompt 1',
        finalPrompt: 'Expanded test prompt 1',
        outputType: 'doc',
        tone: 'professional',
        format: 'paragraph',
        length: 'medium',
        signature: 'unique-signature-test-1-' + Date.now(),
        version: 1,
        versions: [],
        createdAt: new Date().toISOString()
      },
      {
        originalText: 'Test import prompt 2',
        finalPrompt: 'Expanded test prompt 2',
        outputType: 'copy',
        tone: 'casual',
        format: 'bullets',
        length: 'short',
        signature: 'unique-signature-test-2-' + Date.now(),
        version: 1,
        versions: [],
        createdAt: new Date().toISOString()
      }
    ];
    
    // Set up dialog listener for the import result alert
    page.on('dialog', async dialog => {
      const message = dialog.message();
      // Verify the dialog shows import results
      expect(message).toContain('Import complete');
      expect(message).toMatch(/\d+ items imported/);
      await dialog.accept();
    });
    
    // Find file input and upload mock data
    const fileInput = page.locator('label:has-text("Restore") input[type="file"]');
    
    // Create a temporary file with the mock data
    const tempFilePath = path.join(__dirname, 'temp-backup.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(mockBackupData));
    
    try {
      await fileInput.setInputFiles(tempFilePath);
      
      // Wait for import to complete
      await page.waitForTimeout(2000);
      
      // Verify history count increased
      const historyCount = page.locator('span').filter({ hasText: /^\d+$/ }).first();
      const countText = await historyCount.textContent();
      expect(parseInt(countText)).toBeGreaterThanOrEqual(2);
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  test('should skip duplicate items during import', async ({ page }) => {
    const { input } = testPrompts.simple;
    
    // Generate a prompt to create history
    await page.fill(selectors.promptInput, input);
    await page.click(selectors.generateButton);
    await page.waitForSelector(selectors.promptOutput, { timeout: 15000 });
    
    // Wait for history to update
    await page.waitForTimeout(1000);
    
    // Export current history
    const downloadPromise = page.waitForEvent('download');
    const backupButton = page.locator('button:has-text("Backup")');
    await backupButton.click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    
    // Read the exported file
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const exportedData = JSON.parse(fileContent);
    const exportedCount = exportedData.length;
    
    // Set up dialog listener to capture the import result
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    // Create temp file with same content (should be duplicates)
    const tempFilePath = path.join(__dirname, 'temp-duplicate-backup.json');
    fs.writeFileSync(tempFilePath, fileContent);
    
    try {
      // Import the same backup (should skip all as duplicates)
      const fileInput = page.locator('label:has-text("Restore") input[type="file"]');
      await fileInput.setInputFiles(tempFilePath);
      
      // Wait for import
      await page.waitForTimeout(2000);
      
      // Verify dialog showed skipped items - all items should be skipped as duplicates
      expect(dialogMessage).toContain('skipped');
      // The number of skipped items should match the exported count
      expect(dialogMessage).toContain(`${exportedCount} duplicates skipped`);
      // Should show 0 items imported
      expect(dialogMessage).toContain('0 items imported');
    } finally {
      // Clean up
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  test('should handle invalid JSON file gracefully', async ({ page }) => {
    // Set up dialog listener for error alert
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    // Create invalid JSON file
    const tempFilePath = path.join(__dirname, 'temp-invalid.json');
    fs.writeFileSync(tempFilePath, 'this is not valid json {{{');
    
    try {
      const fileInput = page.locator('label:has-text("Restore") input[type="file"]');
      await fileInput.setInputFiles(tempFilePath);
      
      // Wait for error handling
      await page.waitForTimeout(1000);
      
      // Should show error message
      expect(dialogMessage).toContain('Failed to parse');
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  test('should handle non-array JSON file gracefully', async ({ page }) => {
    // Set up dialog listener
    let dialogMessage = '';
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    
    // Create JSON file with object instead of array
    const tempFilePath = path.join(__dirname, 'temp-object.json');
    fs.writeFileSync(tempFilePath, JSON.stringify({ notAnArray: true }));
    
    try {
      const fileInput = page.locator('label:has-text("Restore") input[type="file"]');
      await fileInput.setInputFiles(tempFilePath);
      
      // Wait for error handling
      await page.waitForTimeout(1000);
      
      // Should show error about invalid format
      expect(dialogMessage).toContain('Invalid backup file format');
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });

  test('should preserve original creation date in importedFrom field', async ({ page }) => {
    const originalDate = '2024-01-15T10:30:00.000Z';
    
    // Create mock backup with specific date
    const mockBackupData = [
      {
        originalText: 'Test with original date',
        finalPrompt: 'Expanded prompt',
        outputType: 'doc',
        tone: 'professional',
        format: 'paragraph',
        length: 'medium',
        signature: 'unique-date-test-' + Date.now(),
        version: 1,
        versions: [],
        createdAt: originalDate
      }
    ];
    
    // Set up dialog listener
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    const tempFilePath = path.join(__dirname, 'temp-date-backup.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(mockBackupData));
    
    try {
      const fileInput = page.locator('label:has-text("Restore") input[type="file"]');
      await fileInput.setInputFiles(tempFilePath);
      
      // Wait for import
      await page.waitForTimeout(2000);
      
      // Export to verify the importedFrom field was set
      const downloadPromise = page.waitForEvent('download');
      const backupButton = page.locator('button:has-text("Backup")');
      await backupButton.click();
      const download = await downloadPromise;
      const downloadPath = await download.path();
      
      const fileContent = fs.readFileSync(downloadPath, 'utf-8');
      const exportedData = JSON.parse(fileContent);
      
      // Find the imported item
      const importedItem = exportedData.find(item => item.originalText === 'Test with original date');
      expect(importedItem).toBeDefined();
      expect(importedItem.importedFrom).toBe(originalDate);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });
});
