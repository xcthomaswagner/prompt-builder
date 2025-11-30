# Playwright Test Suite

Comprehensive end-to-end tests for the Intelligent Prompt Builder.

## 📋 Test Coverage

### 01-core-prompt-building.spec.js
- ✅ Application loads successfully
- ✅ Generate simple prompt
- ✅ Change output types (Doc, Deck, Data, Code, Copy, Comms)
- ✅ Change tone, style, format, length
- ✅ Error handling for empty input
- ✅ Copy prompt to clipboard
- ✅ Multiple consecutive generations
- ✅ Token count estimation

### 02-ui-controls.spec.js
- ✅ Toggle dark mode
- ✅ Expand/collapse sections
- ✅ Open/close settings
- ✅ Show quickstart templates
- ✅ Select template
- ✅ Show history panel
- ✅ Responsive layout (mobile, tablet, desktop)
- ✅ Tooltips on hover
- ✅ Reset form
- ✅ Loading state during generation

### 03-history-management.spec.js
- ✅ Save prompt to history
- ✅ Load prompt from history
- ✅ Delete individual history item
- ✅ Clear all history
- ✅ Persist history across reloads
- ✅ Empty state when no history
- ✅ History item metadata (timestamps)

### 04-regression.spec.js
- ✅ Identical output for same inputs
- ✅ All output types work
- ✅ All tones work
- ✅ All formats work
- ✅ No console errors during normal flow
- ✅ API calls complete successfully
- ✅ State persists correctly
- ✅ Copy functionality works
- ✅ Error handling works

## 🚀 Running Tests

### Install Playwright
```bash
npm install -D @playwright/test
npx playwright install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npx playwright test tests/01-core-prompt-building.spec.js
```

### Run Tests in UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Run Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### Run Only Regression Tests
```bash
npx playwright test tests/04-regression.spec.js
```

## 📊 View Test Results

### HTML Report
```bash
npx playwright show-report
```

### Generate Report
```bash
npx playwright test --reporter=html
```

## 🔧 Configuration

Edit `playwright.config.js` to:
- Change base URL
- Add more browsers (Firefox, Safari)
- Adjust timeouts
- Configure screenshots/videos
- Set up CI/CD integration

## 🎯 Pre-Refactor Baseline

Before refactoring, run:
```bash
npm test
```

Save the results:
```bash
npx playwright test --reporter=json > test-results/baseline.json
```

## ✅ Post-Refactor Verification

After refactoring, run:
```bash
npm test
```

Compare results:
```bash
npx playwright test --reporter=json > test-results/post-refactor.json
```

All tests should pass with similar execution times.

## 🚨 What to Watch For

### Critical Failures
- ❌ Application doesn't load
- ❌ Generate button doesn't work
- ❌ API calls fail
- ❌ Console errors appear
- ❌ Output is empty or malformed

### Acceptable Differences
- ✅ Slight timing variations
- ✅ Different AI output (content varies)
- ✅ Minor UI layout shifts
- ✅ Firebase warnings (non-critical)

## 🔍 Debugging Failed Tests

### 1. Run in headed mode
```bash
npx playwright test --headed --project=chromium
```

### 2. Use debug mode
```bash
npx playwright test --debug
```

### 3. Check screenshots
Failed tests automatically capture screenshots in `test-results/`

### 4. Check videos
Videos are saved for failed tests in `test-results/`

### 5. Check traces
```bash
npx playwright show-trace test-results/.../trace.zip
```

## 📝 Adding New Tests

1. Create new spec file in `tests/`
2. Import fixtures from `tests/fixtures/test-data.js`
3. Follow existing test patterns
4. Run tests to verify
5. Commit with descriptive message

## 🤝 CI/CD Integration

### GitHub Actions Example
```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)
