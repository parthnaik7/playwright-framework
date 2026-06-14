# 🎭 Playwright TypeScript Automation Framework

A production-ready, scalable test automation framework built with **Playwright + TypeScript**, following **SOLID**, **DRY**, and **KISS** principles, **Page Object Model (POM)**, and clean architecture patterns.

---

## 📁 Project Structure

```
playwright-framework/
├── .github/
│   └── workflows/
│       └── playwright.yml          # CI/CD pipeline (GitHub Actions)
├── src/
│   ├── config/                     # (reserved for advanced config modules)
│   ├── fixtures/
│   │   └── test-fixtures.ts        # Custom Playwright fixtures (DI container)
│   ├── pages/
│   │   ├── base/
│   │   │   └── BasePage.ts         # Abstract base — shared page actions
│   │   ├── LoginPage.ts
│   │   ├── InventoryPage.ts
│   │   ├── CartPage.ts
│   │   └── CheckoutPage.ts
│   ├── components/
│   │   ├── HeaderComponent.ts      # Shared header (burger menu, cart icon)
│   │   ├── FooterComponent.ts      # Shared footer (social links, copy)
│   │   └── ModalComponent.ts       # Generic modal/dialog wrapper
│   ├── utils/
│   │   ├── Logger.ts               # Winston structured logger
│   │   ├── WaitUtils.ts            # Custom wait/poll/retry utilities
│   │   └── ScreenshotUtils.ts      # Screenshot + failure capture
│   ├── services/
│   │   ├── ApiClient.ts            # Typed HTTP client (Playwright APIRequest)
│   │   └── AuthService.ts          # Auth session management
│   ├── helpers/
│   │   ├── EnvironmentManager.ts   # Singleton env config loader (dotenv)
│   │   └── TestDataGenerator.ts    # Faker-powered test data factory
│   └── types/
│       └── index.ts                # All shared TypeScript interfaces & types
├── tests/
│   └── saucedemo/
│       ├── login.spec.ts           # Login + logout tests
│       ├── cart.spec.ts            # Cart + inventory sort tests
│       └── checkout.spec.ts        # Full E2E checkout flow tests
├── .env.example                    # Environment variable template
├── .env.dev                        # Dev environment values
├── .env.qa                         # QA environment values
├── .env.prod                       # Prod environment values
├── .eslintrc.json                  # ESLint rules (strict TypeScript)
├── .prettierrc                     # Prettier formatting rules
├── .gitignore
├── global-setup.ts                 # Runs once before all tests
├── global-teardown.ts              # Runs once after all tests
├── playwright.config.ts            # Master Playwright configuration
├── tsconfig.json                   # TypeScript strict config
└── package.json                    # Scripts + dependencies
```

---

## ⚡ Quick Start

### 1. Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |
| Git | 2.x |

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd playwright-framework
npm install
npx playwright install          # Install all browsers
# Or install just one browser:
npx playwright install chromium
```

### 3. Configure Environment

```bash
# Copy the template and edit values
cp .env.example .env.dev

# The .env.dev file already has SauceDemo defaults:
# BASE_URL=https://www.saucedemo.com
# STANDARD_USER=standard_user
# STANDARD_PASSWORD=secret_sauce
```

### 4. Run Tests

```bash
# Run all tests (uses .env.dev by default)
npm test

# Run against a specific environment
npm run test:qa
npm run test:prod

# Run specific suite
npm run test:login
npm run test:cart
npm run test:checkout

# Run tests with browser UI visible
npm run test:headed

# Run in Playwright debug mode (step through)
npm run test:debug

# Run Playwright's interactive UI mode
npm run test:ui

# Run only smoke tests
npm test -- --grep @smoke

# Run only regression tests
npm test -- --grep @regression

# Run on a specific browser
npm test -- --project=firefox
npm test -- --project=webkit
npm test -- --project=mobile-chrome
```

---

## 📊 Reporting

### Playwright HTML Report

```bash
# Generate and open
npm run report:playwright
# Opens at: http://localhost:9323
```

### Allure Report (Rich Interactive)

```bash
# Prerequisites — install Allure CLI:
npm install -g allure-commandline

# Generate report from results
npm run report:allure:generate

# Open in browser
npm run report:allure:open

# Serve in one command
npm run report:allure:serve
```

**Allure includes:**
- Test timeline with pass/fail/skip breakdown
- Step-by-step execution traces
- Screenshots embedded inline for failures
- Video attachments (when `ENABLE_VIDEO=true`)
- Environment widget (shows env, browser, Node version)
- History trends across runs (when configured with CI artifact storage)

---

## 🏗️ Architecture & Design Principles

### SOLID in Practice

| Principle | Implementation |
|-----------|---------------|
| **S**ingle Responsibility | Each class has one job: `LoginPage` handles login UI; `Logger` handles logging; `EnvironmentManager` handles config loading |
| **O**pen/Closed | `BasePage` is open for extension (any page extends it) but closed for modification — new pages add behaviour without touching the base |
| **L**iskov Substitution | Any `BasePage` subclass can be used where `BasePage` is expected — they all honour the `isLoaded()` + `navigate()` contract |
| **I**nterface Segregation | `IUserCredentials`, `IAddress`, `IProduct` are narrow interfaces; pages only depend on what they need |
| **D**ependency Inversion | `ApiClient` receives `APIRequestContext` from Playwright (injected via fixtures), not created internally |

### DRY in Practice
- `BasePage` centralises all Playwright interactions (click, fill, getText, assertions)
- `HeaderComponent` is shared by `InventoryPage` and `CartPage` — no duplicated locators
- `TestDataGenerator` provides all fake data — no inline `faker.X.Y()` calls in tests
- Credentials come from `EnvironmentManager` — one source of truth

### KISS in Practice
- `WaitUtils.waitForCondition()` is a dead-simple polling loop — no complex state machines
- Tests read as plain English: `loginPage.login(creds)` → `inventoryPage.assertOnInventoryPage()`
- `EnvironmentManager` exposes a single `getConfig()` object — no magic strings anywhere

---

## 🧩 Key Concepts

### Custom Fixtures (`src/fixtures/test-fixtures.ts`)

Fixtures replace `beforeEach` boilerplate. Tests declare only what they need:

```typescript
// ✅ With fixtures — clean and injected
test('add to cart', async ({ authenticatedPage, inventoryPage }) => {
  await inventoryPage.addProductToCart('Sauce Labs Backpack');
});

// ❌ Without fixtures — repetitive setup in every test
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('#username', 'standard_user');
  // ... 10 more lines
});
```

### Page Objects

```typescript
// ✅ Page Object pattern — locators + actions in one place
class LoginPage extends BasePage {
  readonly usernameInput = this.page.locator('[data-test="username"]');

  async login(credentials: IUserCredentials): Promise<void> {
    await this.fill(this.usernameInput, credentials.username);
    // ...
  }
}

// ✅ In tests — simple, readable, maintainable
await loginPage.login({ username: 'standard_user', password: 'secret_sauce' });
```

### Environment Management

```bash
# Switch environments with a single flag
APP_ENV=qa npm test        # → loads .env.qa
APP_ENV=prod npm test      # → loads .env.prod
npm run test:dev           # → loads .env.dev
```

### Logger with Context

```typescript
// Each class gets a tagged logger
const log = Logger.forContext('CheckoutPage');
log.step('Filling customer info');     // → [CheckoutPage] ▶ STEP: Filling customer info
log.error('Payment failed', error);   // → [CheckoutPage] ERROR Payment failed
```

---

## 🔧 Development

### Linting & Formatting

```bash
npm run lint          # Check ESLint rules
npm run lint:fix      # Auto-fix ESLint violations
npm run format        # Format with Prettier
npm run format:check  # Check formatting without writing
```

### Generate Locators Interactively

```bash
npm run codegen
# Opens a browser where you click elements and Playwright generates selectors
```

### Clean All Artifacts

```bash
npm run clean
# Removes: test-results/, allure-results/, allure-report/, playwright-report/
```

---

## 🧪 Adding a New Test

### 1. Create a page object (if needed)

```typescript
// src/pages/MyNewPage.ts
export class MyNewPage extends BasePage {
  protected readonly path = '/my-page';

  readonly myButton = this.page.locator('[data-test="my-btn"]');

  public async isLoaded(): Promise<boolean> {
    return this.myButton.isVisible();
  }

  public async clickMyButton(): Promise<void> {
    this.log.step('Clicking my button');
    await this.click(this.myButton);
  }
}
```

### 2. Add a fixture (if needed)

```typescript
// In src/fixtures/test-fixtures.ts — add to PageFixtures type:
myNewPage: MyNewPage;

// And the fixture implementation:
myNewPage: async ({ page }, use) => {
  await use(new MyNewPage(page));
},
```

### 3. Write the test

```typescript
// tests/myfeature/my-feature.spec.ts
import { test, expect } from '../../src/fixtures/test-fixtures';

test.describe('My Feature', () => {
  test('should do something useful @smoke', async ({ myNewPage }) => {
    await myNewPage.navigate();
    await myNewPage.clickMyButton();
    await myNewPage.assertUrl('/expected-path');
  });
});
```

---

## 🌐 Adding a New Environment

```bash
# 1. Create the env file
cp .env.example .env.staging

# 2. Edit .env.staging with staging values
APP_ENV=staging
BASE_URL=https://staging.myapp.com
# ...

# 3. Update EnvironmentManager.ts — add 'staging' to the Environment type
# src/types/index.ts:
export type Environment = 'dev' | 'qa' | 'prod' | 'staging';

# 4. Run
APP_ENV=staging npm test
```

---

## 📦 Dependencies Overview

| Package | Purpose |
|---------|---------|
| `@playwright/test` | Core browser automation + test runner |
| `allure-playwright` | Allure reporter integration |
| `winston` | Structured logging (Console + File transports) |
| `@faker-js/faker` | Realistic test data generation |
| `dotenv` | Environment variable loading |
| `uuid` | Unique ID generation for test data |
| `cross-env` | Cross-platform `APP_ENV=qa npm test` |
| `typescript` | Type safety across the entire framework |
| `eslint` + `prettier` | Code quality enforcement |

---

## 🚀 CI/CD (GitHub Actions)

The `.github/workflows/playwright.yml` pipeline:

1. **Lint job** — ESLint + Prettier check on every push/PR
2. **Test matrix** — Runs on Chromium, Firefox, and WebKit in parallel
3. **Allure report job** — Merges results from all browsers and generates a combined report
4. **Artifacts** — HTML report, Allure results, and failure screenshots are uploaded and retained for 14 days

```bash
# Trigger manually from GitHub Actions UI:
# workflow_dispatch → choose environment (dev/qa/prod) + browser
```

---

## 🔐 Security Notes

- **Never commit `.env.dev`, `.env.qa`, or `.env.prod`** — they are in `.gitignore`
- **Use GitHub Secrets** for credentials in CI (see `playwright.yml` — `secrets.STANDARD_PASSWORD`)
- `storageState` JSON files under `test-results/auth/` contain session cookies — they are cleaned up by `global-teardown.ts`

---

## 📄 License

MIT — free to use, modify, and distribute.
