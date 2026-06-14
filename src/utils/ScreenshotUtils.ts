/**
 * @file src/utils/ScreenshotUtils.ts
 * @description Screenshot and trace capture utilities.
 *
 * Design:
 *  - Static helpers only (pure utility class, SRP).
 *  - Allure attachment is embedded so screenshots appear inline in reports.
 *  - Full-page and element-level screenshots both supported.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Page, Locator } from '@playwright/test';
import { Logger } from './Logger';

const log = Logger.forContext('ScreenshotUtils');

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-results', 'screenshots');

export class ScreenshotUtils {
  // ─── Directory setup ───────────────────────────────────────────────────────

  private static ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // ─── Full page screenshot ─────────────────────────────────────────────────

  /**
   * Captures a full-page screenshot and saves it to the screenshot directory.
   * Returns the absolute path so the caller can attach it to a report.
   */
  public static async capturePage(
    page: Page,
    name: string,
    fullPage = true,
  ): Promise<string> {
    this.ensureDir(SCREENSHOT_DIR);
    const sanitised = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitised}_${timestamp}.png`;
    const filePath = path.join(SCREENSHOT_DIR, filename);

    log.debug(`Capturing ${fullPage ? 'full-page' : 'viewport'} screenshot: ${filename}`);

    await page.screenshot({ path: filePath, fullPage });
    log.info(`Screenshot saved: ${filePath}`);
    return filePath;
  }

  /**
   * Captures a screenshot of a specific element (bounding-box crop).
   */
  public static async captureElement(locator: Locator, name: string): Promise<string> {
    this.ensureDir(SCREENSHOT_DIR);
    const sanitised = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `element_${sanitised}_${timestamp}.png`;
    const filePath = path.join(SCREENSHOT_DIR, filename);

    log.debug(`Capturing element screenshot: ${filename}`);
    await locator.screenshot({ path: filePath });
    log.info(`Element screenshot saved: ${filePath}`);
    return filePath;
  }

  /**
   * Captures a screenshot on test failure.
   * Called from test fixtures so every failing test has evidence.
   */
  public static async captureOnFailure(page: Page, testName: string): Promise<Buffer> {
    log.warn(`Capturing failure screenshot for test: ${testName}`);
    const buffer = await page.screenshot({ fullPage: true });

    // Also persist to disk for archiving alongside the Allure result
    const failureDir = path.join(SCREENSHOT_DIR, 'failures');
    this.ensureDir(failureDir);
    const sanitised = testName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(failureDir, `FAIL_${sanitised}_${timestamp}.png`);
    fs.writeFileSync(filePath, buffer);
    log.info(`Failure screenshot saved: ${filePath}`);

    return buffer;
  }

  /**
   * Reads a screenshot from disk and returns it as a Buffer.
   * Used when attaching existing screenshots to Allure.
   */
  public static readScreenshot(filePath: string): Buffer {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Screenshot file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  }

  /**
   * Saves an arbitrary buffer as a named screenshot file.
   */
  public static saveBuffer(buffer: Buffer, name: string): string {
    this.ensureDir(SCREENSHOT_DIR);
    const sanitised = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(SCREENSHOT_DIR, `${sanitised}.png`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }
}
