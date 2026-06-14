/**
 * @file src/pages/CartPage.ts
 * @description Page Object for the SauceDemo shopping cart screen.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './base/BasePage';
import { HeaderComponent } from '../components/HeaderComponent';

export class CartPage extends BasePage {
  protected readonly path = '/cart.html';

  // ─── Locators ─────────────────────────────────────────────────────────────

  private readonly cartList = this.page.locator('.cart_list');
  private readonly cartItems = this.page.locator('.cart_item');
  private readonly cartItemNames = this.page.locator('.inventory_item_name');
  private readonly cartItemPrices = this.page.locator('.inventory_item_price');
  private readonly checkoutButton = this.page.locator('[data-test="checkout"]');
  private readonly continueShoppingButton = this.page.locator('[data-test="continue-shopping"]');
  private readonly pageTitle = this.page.locator('.title');

  public readonly header: HeaderComponent;

  public constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
  }

  // ─── Template Method ──────────────────────────────────────────────────────

  public async isLoaded(): Promise<boolean> {
    return this.cartList.isVisible();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /** Removes an item from the cart by product name. */
  public async removeItem(productName: string): Promise<void> {
    this.log.step(`Removing item from cart: "${productName}"`);
    const removeBtn = this.cartItems
      .filter({ hasText: productName })
      .locator('[data-test^="remove"]');
    await this.click(removeBtn);
  }

  /** Proceeds to the checkout information page. */
  public async proceedToCheckout(): Promise<void> {
    this.log.step('Proceeding to checkout');
    await this.click(this.checkoutButton);
  }

  /** Returns to the inventory / shopping page. */
  public async continueShopping(): Promise<void> {
    this.log.step('Continuing shopping');
    await this.click(this.continueShoppingButton);
  }

  // ─── Read helpers ──────────────────────────────────────────────────────────

  public async getCartItemCount(): Promise<number> {
    return this.getCount(this.cartItems);
  }

  public async getCartItemNames(): Promise<string[]> {
    return this.cartItemNames.allTextContents();
  }

  public async getCartItemPrices(): Promise<number[]> {
    const rawPrices = await this.cartItemPrices.allTextContents();
    return rawPrices.map((p) => parseFloat(p.replace('$', '')));
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  public async assertOnCartPage(): Promise<void> {
    this.log.step('Asserting cart page is loaded');
    await this.assertVisible(this.cartList);
    await expect(this.pageTitle).toHaveText('Your Cart');
    await this.assertUrl('/cart.html');
  }

  public async assertItemInCart(productName: string): Promise<void> {
    const item = this.cartItems.filter({ hasText: productName });
    await this.assertVisible(item, `"${productName}" should be in cart`);
  }

  public async assertItemNotInCart(productName: string): Promise<void> {
    const item = this.cartItems.filter({ hasText: productName });
    await this.assertHidden(item);
  }

  public async assertCartItemCount(expected: number): Promise<void> {
    await this.assertCount(this.cartItems, expected);
  }

  public async assertCartIsEmpty(): Promise<void> {
    await this.assertCount(this.cartItems, 0);
  }

  public async assertCheckoutButtonVisible(): Promise<void> {
    await this.assertVisible(this.checkoutButton, 'Checkout button should be visible');
  }
}
