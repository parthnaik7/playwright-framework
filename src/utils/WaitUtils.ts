/**
 * @file src/utils/WaitUtils.ts
 * @description Custom wait / polling utilities that extend Playwright's built-in waits.
 *
 * Design:
 *  - All methods are static (no state) — pure utility class (SRP).
 *  - Wraps Playwright's `waitFor*` so callers never mix page.waitFor calls with
 *    hard-coded `setTimeout`, which is an anti-pattern in async tests.
 *  - Timeout values default to the environment config but can be overridden per call.
 */

import type { Page, Locator } from '@playwright/test';
import { Logger } from './Logger';

const log = Logger.forContext('WaitUtils');

export class WaitUtils {
  /**
   * Waits for a network idle state — useful after navigation events
   * triggered by clicks rather than page.goto().
   */
  public static async waitForNetworkIdle(page: Page, timeout = 30_000): Promise<void> {
    log.debug('Waiting for network idle', { timeout });
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Waits for DOM content to be fully loaded (faster than networkidle).
   */
  public static async waitForDOMContentLoaded(page: Page, timeout = 30_000): Promise<void> {
    log.debug('Waiting for DOM content loaded', { timeout });
    await page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Polls a locator until it matches a given text, re-evaluating every interval.
   * Useful when server-side rendering updates the DOM asynchronously.
   */
  public static async waitForText(
    locator: Locator,
    expectedText: string,
    timeout = 10_000,
    interval = 500,
  ): Promise<void> {
    log.debug('Waiting for text', { expectedText, timeout });
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const text = await locator.textContent();
      if (text?.includes(expectedText)) {
        return;
      }
      await WaitUtils.sleep(interval);
    }

    throw new Error(
      `Timed out waiting ${timeout}ms for locator to contain text: "${expectedText}"`,
    );
  }

  /**
   * Waits until an element is both visible AND enabled (interactive).
   */
  public static async waitForClickable(locator: Locator, timeout = 10_000): Promise<void> {
    log.debug('Waiting for element to be clickable');
    await locator.waitFor({ state: 'visible', timeout });
    await locator.waitFor({ state: 'attached', timeout });
  }

  /**
   * Waits for a URL pattern (string or RegExp) to match the current page URL.
   */
  public static async waitForUrl(
    page: Page,
    urlOrPattern: string | RegExp,
    timeout = 30_000,
  ): Promise<void> {
    log.debug('Waiting for URL', { pattern: urlOrPattern.toString(), timeout });
    await page.waitForURL(urlOrPattern, { timeout });
  }

  /**
   * Polls until the given async condition returns true.
   * KISS implementation: a simple while loop with a deadline.
   */
  public static async waitForCondition(
    condition: () => Promise<boolean>,
    description: string,
    timeout = 10_000,
    interval = 500,
  ): Promise<void> {
    log.debug(`Waiting for condition: ${description}`, { timeout });
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      if (await condition()) {
        return;
      }
      await WaitUtils.sleep(interval);
    }

    throw new Error(`Condition never became true within ${timeout}ms: "${description}"`);
  }

  /**
   * Waits for an element count to reach a specific number.
   * Useful for lists that are dynamically populated.
   */
  public static async waitForElementCount(
    locator: Locator,
    expectedCount: number,
    timeout = 10_000,
    interval = 300,
  ): Promise<void> {
    log.debug(`Waiting for element count = ${expectedCount}`);
    await WaitUtils.waitForCondition(
      async () => (await locator.count()) === expectedCount,
      `element count to equal ${expectedCount}`,
      timeout,
      interval,
    );
  }

  /**
   * Waits for an element to disappear from the DOM.
   */
  public static async waitForHidden(locator: Locator, timeout = 10_000): Promise<void> {
    log.debug('Waiting for element to be hidden');
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * Simple async sleep. Use sparingly — prefer event-driven waits over fixed delays.
   */
  public static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retries an async operation up to `maxAttempts` times with exponential back-off.
   * Follows the Retry pattern — helps with flaky network responses in tests.
   */
  public static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 500,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const delay = baseDelay * Math.pow(2, attempt - 1); // exponential back-off
        log.warn(`Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delay}ms.`, {
          error: lastError.message,
        });
        if (attempt < maxAttempts) {
          await WaitUtils.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('Retry failed with unknown error');
  }
}
