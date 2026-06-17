/**
 * @file src/pages/base/BasePage.ts
 * @description Abstract base class for all Page Objects.
 *
 * Design decisions:
 *  - Abstract class (cannot be instantiated directly) enforces the Template Method
 *    pattern: subclasses must implement `url` and `isLoaded()`.
 *  - All low-level Playwright interactions (click, fill, getText…) are encapsulated
 *    here so page classes stay readable and declarative (DRY / SRP).
 *  - Logger is per-class so log output identifies which page emitted the message.
 *  - `waitForPageLoad()` is the single entry point after any navigation —
 *    no page class calls `waitForLoadState` directly.
 */

import { expect, type Page, type Locator, type BrowserContext } from '@playwright/test';
import { Logger } from '../../utils/Logger';
import { WaitUtils } from '../../utils/WaitUtils';
import { ScreenshotUtils } from '../../utils/ScreenshotUtils';
import { envManager } from '../../helpers/EnvironmentManager';

export abstract class BasePage {
  protected readonly page: Page;
  protected readonly context: BrowserContext;
  protected readonly log: Logger;

  /** Relative path appended to baseUrl for direct navigation. */
  protected abstract readonly path: string;

  public constructor(page: Page) {
    this.page = page;
    this.context = page.context();
    // Each subclass automatically gets a logger tagged with its own name
    this.log = Logger.forContext(this.constructor.name);
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  /** Navigate directly to this page's URL. */
  public async navigate(): Promise<void> {
    const url = `${envManager.getBaseUrl()}${this.path}`;
    this.log.step(`Navigating to ${url}`);
    await this.page.goto(url, {
      timeout: envManager.getConfig().timeouts.navigation,
      waitUntil: 'domcontentloaded',
    });
    await this.waitForPageLoad();
  }

  /**
   * Waits until the page is considered "loaded".
   * Subclasses may override to add page-specific idle conditions.
   */
  public async waitForPageLoad(): Promise<void> {
    await WaitUtils.waitForDOMContentLoaded(this.page);
  }

  /**
   * Template method — subclasses implement their specific ready-check
   * (e.g., wait for a heading or a landmark element).
   */
  public abstract isLoaded(): Promise<boolean>;

  /** Assert that the page is loaded — throws if the check fails. */
  public async assertLoaded(): Promise<void> {
    const loaded = await this.isLoaded();
    this.log.assertion(`${this.constructor.name} is loaded`, loaded);
    expect(loaded, `${this.constructor.name} should be loaded`).toBe(true);
  }

  // ─── URL helpers ───────────────────────────────────────────────────────────

  public getCurrentUrl(): string {
    return this.page.url();
  }

  public async assertUrl(expectedPath: string): Promise<void> {
    const expected = `${envManager.getBaseUrl()}${expectedPath}`;
    this.log.debug(`Asserting URL: ${expected}`);
    await expect(this.page).toHaveURL(expected, {
      timeout: envManager.getConfig().timeouts.expect,
    });
  }

  public async assertUrlContains(partial: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(partial));
  }

  // ─── Interaction helpers ───────────────────────────────────────────────────

  protected async click(locator: Locator, options?: { timeout?: number }): Promise<void> {
    this.log.debug('Clicking element');
    await WaitUtils.waitForClickable(locator, options?.timeout);
    await locator.click();
  }

  protected async fill(
    locator: Locator,
    value: string,
    options?: { clearFirst?: boolean },
  ): Promise<void> {
    this.log.debug(`Filling element with value (length: ${value.length})`);
    await WaitUtils.waitForClickable(locator);
    if (options?.clearFirst !== false) {
      await locator.clear();
    }
    await locator.fill(value);
  }

  protected async selectOption(locator: Locator, value: string): Promise<void> {
    this.log.debug(`Selecting option: ${value}`);
    await locator.selectOption(value);
  }

  protected async check(locator: Locator): Promise<void> {
    this.log.debug('Checking checkbox/radio');
    await locator.check();
  }

  protected async hover(locator: Locator): Promise<void> {
    this.log.debug('Hovering element');
    await locator.hover();
  }

  // ─── Read helpers ──────────────────────────────────────────────────────────

  protected async getText(locator: Locator): Promise<string> {
    const text = await locator.textContent();
    return text?.trim() ?? '';
  }

  protected async getInputValue(locator: Locator): Promise<string> {
    return locator.inputValue();
  }

  protected async getCount(locator: Locator): Promise<number> {
    return locator.count();
  }

  protected async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  protected async isEnabled(locator: Locator): Promise<boolean> {
    return locator.isEnabled();
  }

  // ─── Assertion helpers ─────────────────────────────────────────────────────

  public async assertTitle(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(expected);
  }

  public async assertVisible(locator: Locator, message?: string): Promise<void> {
    await expect(locator, message).toBeVisible({
      timeout: envManager.getConfig().timeouts.expect,
    });
  }

  public async assertHidden(locator: Locator): Promise<void> {
    await expect(locator).toBeHidden();
  }

  public async assertText(locator: Locator, expected: string | RegExp): Promise<void> {
    await expect(locator).toHaveText(expected, {
      timeout: envManager.getConfig().timeouts.expect,
    });
  }

  public async assertContainsText(locator: Locator, expected: string): Promise<void> {
    await expect(locator).toContainText(expected, {
      timeout: envManager.getConfig().timeouts.expect,
    });
  }

  public async assertCount(locator: Locator, expected: number): Promise<void> {
    await expect(locator).toHaveCount(expected, {
      timeout: envManager.getConfig().timeouts.expect,
    });
  }

  // ─── Screenshot ────────────────────────────────────────────────────────────

  public async screenshot(name?: string): Promise<string> {
    const label = name ?? `${this.constructor.name}_${Date.now()}`;
    return ScreenshotUtils.capturePage(this.page, label);
  }

  // ─── Keyboard / Browser ────────────────────────────────────────────────────

  public async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  public async reload(): Promise<void> {
    this.log.debug('Reloading page');
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitForPageLoad();
  }

  public async goBack(): Promise<void> {
    this.log.debug('Navigating back');
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  public async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  public async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }
}
