/**
 * @file src/pages/CheckoutPage.ts
 * @description Page Object covering all three steps of the SauceDemo checkout flow.
 *
 * Design: SauceDemo checkout spans three URLs:
 *   Step 1 — /checkout-step-one.html   (customer info form)
 *   Step 2 — /checkout-step-two.html   (order overview)
 *   Complete — /checkout-complete.html  (confirmation)
 *
 * Rather than creating three separate page classes (which would fragment the flow),
 * a single CheckoutPage exposes step-specific methods. Each method logs its step
 * name so Allure can group them under a "Checkout" feature story.
 */

import { expect, type Page } from '@playwright/test';
import { BasePage } from './base/BasePage';
import type { IAddress } from '../types/index';

export class CheckoutPage extends BasePage {
  // Path points to step one; other steps are navigated to programmatically
  protected readonly path = '/checkout-step-one.html';

  // ─── Step 1 locators ──────────────────────────────────────────────────────

  private readonly firstNameInput = this.page.locator('[data-test="firstName"]');
  private readonly lastNameInput = this.page.locator('[data-test="lastName"]');
  private readonly postalCodeInput = this.page.locator('[data-test="postalCode"]');
  private readonly continueButton = this.page.locator('[data-test="continue"]');
  private readonly cancelButton = this.page.locator('[data-test="cancel"]');
  private readonly errorMessage = this.page.locator('[data-test="error"]');

  // ─── Step 2 locators ──────────────────────────────────────────────────────

  private readonly summaryItems = this.page.locator('.cart_item');
  private readonly itemTotal = this.page.locator('.summary_subtotal_label');
  private readonly taxLabel = this.page.locator('.summary_tax_label');
  private readonly totalLabel = this.page.locator('.summary_total_label');
  private readonly finishButton = this.page.locator('[data-test="finish"]');
  private readonly summaryBackButton = this.page.locator('[data-test="cancel"]');

  // ─── Confirmation locators ────────────────────────────────────────────────

  private readonly confirmationHeader = this.page.locator('.complete-header');
  private readonly confirmationText = this.page.locator('.complete-text');
  private readonly backHomeButton = this.page.locator('[data-test="back-to-products"]');
  private readonly ponyExpressImage = this.page.locator('.pony_express');

  public constructor(page: Page) {
    super(page);
  }

  // ─── Template Method ──────────────────────────────────────────────────────

  public async isLoaded(): Promise<boolean> {
    // True if any step of checkout is visible
    return (
      (await this.firstNameInput.isVisible()) ||
      (await this.finishButton.isVisible()) ||
      (await this.confirmationHeader.isVisible())
    );
  }

  // ─── Step 1 Actions ───────────────────────────────────────────────────────

  /** Fills in the customer information form. */
  public async fillCustomerInfo(address: IAddress): Promise<void> {
    this.log.step('Filling customer information');
    await this.fill(this.firstNameInput, address.firstName);
    await this.fill(this.lastNameInput, address.lastName);
    await this.fill(this.postalCodeInput, address.postalCode);
  }

  /** Continues to the order overview screen. */
  public async continueToOverview(): Promise<void> {
    this.log.step('Continuing to order overview');
    await this.click(this.continueButton);
  }

  /** Full step-1 flow: fill info then continue. */
  public async completeCustomerInfo(address: IAddress): Promise<void> {
    await this.fillCustomerInfo(address);
    await this.continueToOverview();
  }

  /** Cancels the checkout and returns to the cart. */
  public async cancel(): Promise<void> {
    this.log.step('Cancelling checkout');
    await this.click(this.cancelButton);
  }

  // ─── Step 2 Actions ───────────────────────────────────────────────────────

  /** Clicks "Finish" to complete the order. */
  public async finishOrder(): Promise<void> {
    this.log.step('Finishing order');
    await this.click(this.finishButton);
  }

  /** Clicks "Cancel" on the overview to go back to inventory. */
  public async cancelFromOverview(): Promise<void> {
    this.log.step('Cancelling from overview');
    await this.click(this.summaryBackButton);
  }

  // ─── Step 3 Actions ───────────────────────────────────────────────────────

  /** Returns to the products page from the confirmation screen. */
  public async backToProducts(): Promise<void> {
    this.log.step('Returning to products from confirmation');
    await this.click(this.backHomeButton);
  }

  // ─── Read helpers ──────────────────────────────────────────────────────────

  public async getItemTotal(): Promise<number> {
    const raw = await this.getText(this.itemTotal);
    return parseFloat(raw.replace(/[^0-9.]/g, ''));
  }

  public async getTaxAmount(): Promise<number> {
    const raw = await this.getText(this.taxLabel);
    return parseFloat(raw.replace(/[^0-9.]/g, ''));
  }

  public async getOrderTotal(): Promise<number> {
    const raw = await this.getText(this.totalLabel);
    return parseFloat(raw.replace(/[^0-9.]/g, ''));
  }

  public async getSummaryItemCount(): Promise<number> {
    return this.getCount(this.summaryItems);
  }

  public async getErrorText(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  public async assertOnStepOne(): Promise<void> {
    this.log.step('Asserting on checkout step one');
    await this.assertVisible(this.firstNameInput);
    await this.assertUrl('/checkout-step-one.html');
  }

  public async assertOnStepTwo(): Promise<void> {
    this.log.step('Asserting on checkout step two');
    await this.assertVisible(this.finishButton);
    await this.assertUrl('/checkout-step-two.html');
  }

  public async assertOrderComplete(): Promise<void> {
    this.log.step('Asserting order is complete');
    await this.assertUrl('/checkout-complete.html');
    await this.assertVisible(this.confirmationHeader);
    await expect(this.confirmationHeader).toHaveText('Thank you for your order!');
    await this.assertVisible(this.ponyExpressImage);
  }

  public async assertErrorVisible(expectedText?: string): Promise<void> {
    await this.assertVisible(this.errorMessage);
    if (expectedText) {
      await this.assertContainsText(this.errorMessage, expectedText);
    }
  }

  public async assertSummaryItemCount(expected: number): Promise<void> {
    await this.assertCount(this.summaryItems, expected);
  }

  /** Asserts that item total + tax ≈ order total (floating point safe). */
  public async assertTotalsAreCorrect(): Promise<void> {
    this.log.step('Asserting order totals are mathematically correct');
    const itemTotal = await this.getItemTotal();
    const tax = await this.getTaxAmount();
    const orderTotal = await this.getOrderTotal();
    const expected = parseFloat((itemTotal + tax).toFixed(2));
    expect(orderTotal).toBeCloseTo(expected, 1);
  }
}
