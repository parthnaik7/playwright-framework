/**
 * @file src/components/ModalComponent.ts
 * @description Generic modal/dialog component wrapper.
 *
 * Design:
 *  - Accepts a `Page` + a root selector so any modal on any site can use it.
 *  - The `root` locator scopes all child locators, preventing false matches when
 *    multiple dialogs could be present (Liskov: any modal can use this contract).
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';
import { Logger } from '../utils/Logger';
import { WaitUtils } from '../utils/WaitUtils';

export class ModalComponent {
  private readonly page: Page;
  private readonly log: Logger;
  private readonly root: Locator;

  public constructor(page: Page, rootSelector = '[role="dialog"]') {
    this.page = page;
    this.root = page.locator(rootSelector);
    this.log = Logger.forContext('ModalComponent');
  }

  // ─── Scoped helpers ───────────────────────────────────────────────────────

  /** Returns a locator scoped within the modal root. */
  public within(selector: string): Locator {
    return this.root.locator(selector);
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  public async waitForOpen(timeout = 5_000): Promise<void> {
    this.log.debug('Waiting for modal to open');
    await this.root.waitFor({ state: 'visible', timeout });
  }

  public async waitForClose(timeout = 5_000): Promise<void> {
    this.log.debug('Waiting for modal to close');
    await this.root.waitFor({ state: 'hidden', timeout });
  }

  public async clickButton(label: string): Promise<void> {
    this.log.step(`Clicking modal button: "${label}"`);
    const btn = this.root.getByRole('button', { name: label });
    await WaitUtils.waitForClickable(btn);
    await btn.click();
  }

  public async close(): Promise<void> {
    this.log.step('Closing modal');
    // Attempt generic close strategies in order
    const closeBtn = this.root.locator('[aria-label="Close"], .modal-close, .btn-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Fallback: press Escape
      await this.page.keyboard.press('Escape');
    }
    await this.waitForClose();
  }

  // ─── Read helpers ─────────────────────────────────────────────────────────

  public async getTitle(): Promise<string> {
    const heading = this.root.locator('h1, h2, h3, [class*="title"], [class*="header"]').first();
    return (await heading.textContent())?.trim() ?? '';
  }

  public async getBodyText(): Promise<string> {
    return (await this.root.textContent())?.trim() ?? '';
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  public async assertOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  public async assertClosed(): Promise<void> {
    await expect(this.root).toBeHidden();
  }

  public async assertTitleContains(expected: string): Promise<void> {
    const heading = this.root.locator('h1, h2, h3, [class*="title"]').first();
    await expect(heading).toContainText(expected);
  }

  public async assertContainsText(expected: string): Promise<void> {
    await expect(this.root).toContainText(expected);
  }
}
