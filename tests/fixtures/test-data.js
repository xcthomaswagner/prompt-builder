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
    outputType: "code",
    tone: "technical",
    style: "instructional",
    format: "sections",
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
  promptInput: 'textarea[placeholder*="Make me a deck"]',
  generateButton: 'button:has-text("Generate Expanded Prompt")',
  
  // Output
  promptOutput: 'pre, code, .output-text',
  copyButton: 'button:has-text("Copy")',
  
  // Controls - Output Type buttons (Doc, Deck, Data, Code, Copy, Comms)
  outputTypeButtons: 'button:has-text("Doc"), button:has-text("Deck"), button:has-text("Data"), button:has-text("Code"), button:has-text("Copy"), button:has-text("Comms")',
  toneDropdown: 'select',
  styleDropdown: 'select',
  formatDropdown: 'select',
  lengthDropdown: 'select',
  
  // Auth
  signInButton: 'button:has-text("Sign in")',
  signOutButton: 'button:has-text("Sign Out")',
  userAvatar: 'img[alt*="avatar"], button:has-text("Sign")',
  
  // History
  historyButton: 'button:has-text("History")',
  historyPanel: 'aside, [role="complementary"]',
  historyItem: '.history-item, li',
  clearHistoryButton: 'button:has-text("Clear")',
  
  // UI Controls
  darkModeToggle: 'button:has-text("Dark"), button:has-text("Light")',
  settingsButton: 'button:has-text("Settings")',
  
  // Templates
  templateButton: 'button:has-text("Templates"), button:has-text("Quick")',
  templateCard: 'button, .template',
};

export const expectedOutputPatterns = {
  simple: /blog post|content|article/i,
  deck: /slide|presentation|pitch/i,
  technical: /API|endpoint|authentication/i,
  code: /component|React|function/i,
  document: /requirements|specification|document/i,
};
