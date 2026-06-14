/**
 * @file src/components/FooterComponent.ts
 * @description Reusable component for the SauceDemo site footer.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { Logger } from '../utils/Logger';

export class FooterComponent {
  private readonly page: Page;
  private readonly log: Logger;

  // ─── Locators ─────────────────────────────────────────────────────────────

  private readonly footer = this.page.locator('.footer');
  private readonly copyText = this.page.locator('.footer_copy');
  private readonly twitterLink = this.page.locator('[data-test="social-twitter"]');
  private readonly facebookLink = this.page.locator('[data-test="social-facebook"]');
  private readonly linkedinLink = this.page.locator('[data-test="social-linkedin"]');

  public constructor(page: Page) {
    this.page = page;
    this.log = Logger.forContext('FooterComponent');
  }

  // ─── Read helpers ─────────────────────────────────────────────────────────

  public async getCopyText(): Promise<string> {
    const text = await this.copyText.textContent();
    return text?.trim() ?? '';
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  public async assertFooterVisible(): Promise<void> {
    this.log.step('Asserting footer is visible');
    await expect(this.footer).toBeVisible();
  }

  public async assertCopyTextContains(expected: string): Promise<void> {
    await expect(this.copyText).toContainText(expected);
  }

  public async assertSocialLinksPresent(): Promise<void> {
    this.log.step('Asserting social links are present');
    await expect(this.twitterLink).toBeVisible();
    await expect(this.facebookLink).toBeVisible();
    await expect(this.linkedinLink).toBeVisible();
  }

  public async assertTwitterLinkHref(expected: string): Promise<void> {
    await expect(this.twitterLink).toHaveAttribute('href', expected);
  }
}
