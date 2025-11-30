/**
 * Test Data Fixtures
 * 
 * Reusable test data for Playwright tests
 */

export const testPrompts = {
  simple: {
    input: "Write a blog post about AI",
    outputType: "copy",
    tone: "professional",
    style: "direct",
    format: "sections",
    length: "medium"
  },
  
  deck: {
    input: "Create investor pitch deck for AI startup",
    outputType: "deck",
    tone: "executive",
    style: "persuasive",
    format: "bullets",
    length: "medium"
  },
  
  technical: {
    input: "API documentation for authentication endpoints",
    outputType: "data",
    tone: "technical",
    style: "analytical",
    format: "table",
    length: "long"
  },
  
  code: {
    input: "React component for user profile card",
    outputType: "code",
    tone: "technical",
    style: "instructional",
    format: "sections",
    length: "medium"
  },
  
  document: {
    input: "Requirements document for mobile app",
    outputType: "doc",
    tone: "professional",
    style: "analytical",
    format: "sections",
    length: "long"
  }
};

export const selectors = {
  // Input
  promptInput: 'textarea[placeholder*="describe what you need"]',
  generateButton: 'button:has-text("Generate Prompt")',
  
  // Output
  promptOutput: '[data-testid="prompt-output"], .prompt-output',
  copyButton: 'button:has-text("Copy")',
  
  // Controls
  outputTypeButtons: '[data-testid="output-type-selector"] button',
  toneDropdown: 'select[aria-label="Tone"], button:has-text("Tone")',
  styleDropdown: 'select[aria-label="Style"], button:has-text("Style")',
  formatDropdown: 'select[aria-label="Format"], button:has-text("Format")',
  lengthDropdown: 'select[aria-label="Length"], button:has-text("Length")',
  
  // Auth
  signInButton: 'button:has-text("Sign in with Google")',
  signOutButton: 'button:has-text("Sign Out")',
  userAvatar: '[data-testid="user-avatar"]',
  
  // History
  historyPanel: '[data-testid="history-panel"]',
  historyItem: '[data-testid="history-item"]',
  clearHistoryButton: 'button:has-text("Clear History")',
  
  // UI Controls
  darkModeToggle: 'button[aria-label="Toggle dark mode"]',
  settingsButton: 'button[aria-label="Settings"]',
  
  // Templates
  templateSelector: '[data-testid="template-selector"]',
  templateCard: '[data-testid="template-card"]',
};

export const expectedOutputPatterns = {
  simple: /blog post|content|article/i,
  deck: /slide|presentation|pitch/i,
  technical: /API|endpoint|authentication/i,
  code: /component|React|function/i,
  document: /requirements|specification|document/i,
};
