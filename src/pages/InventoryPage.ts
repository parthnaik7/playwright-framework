/**
 * @file src/pages/InventoryPage.ts
 * @description Page Object for the SauceDemo product inventory screen.
 */

import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from './base/BasePage';
import { HeaderComponent } from '../components/HeaderComponent';
import type { SortOption } from '../types/index';

/** Maps the friendly sort key to the value attribute in the <select> dropdown. */
const SORT_VALUE_MAP: Record<SortOption, string> = {
  az: 'az',
  za: 'za',
  lohi: 'lohi',
  hilo: 'hilo',
};

export class InventoryPage extends BasePage {
  protected readonly path = '/inventory.html';

  // ─── Locators ─────────────────────────────────────────────────────────────

  private readonly pageTitle = this.page.locator('.title');
  private readonly sortDropdown = this.page.locator('[data-test="product-sort-container"]');
  private readonly inventoryList = this.page.locator('.inventory_list');
  private readonly inventoryItems = this.page.locator('.inventory_item');
  private readonly productNames = this.page.locator('.inventory_item_name');
  private readonly productPrices = this.page.locator('.inventory_item_price');

  // ─── Components ────────────────────────────────────────────────────────────

  public readonly header: HeaderComponent;

  public constructor(page: Page) {
    super(page);
    // Component injection — Header is shared across multiple page objects (DRY)
    this.header = new HeaderComponent(page);
  }

  // ─── Template Method ──────────────────────────────────────────────────────

  public async isLoaded(): Promise<boolean> {
    return this.inventoryList.isVisible();
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  /** Returns the locator for the "Add to cart" button of a specific product by name. */
  public getAddToCartButton(productName: string): Locator {
    return this.page
      .locator('.inventory_item')
      .filter({ hasText: productName })
      .locator('[data-test^="add-to-cart"]');
  }

  /** Returns the locator for the "Remove" button of a specific product by name. */
  public getRemoveButton(productName: string): Locator {
    return this.page
      .locator('.inventory_item')
      .filter({ hasText: productName })
      .locator('[data-test^="remove"]');
  }

  /**
   * Adds a product to the cart by name and waits for the cart badge to update.
   */
  public async addProductToCart(productName: string): Promise<void> {
    this.log.step(`Adding product to cart: "${productName}"`);
    const btn = this.getAddToCartButton(productName);
    await this.assertVisible(btn, `Add to cart button for "${productName}"`);
    await this.click(btn);
  }

  /** Adds multiple products by name in sequence. */
  public async addProductsToCart(productNames: string[]): Promise<void> {
    for (const name of productNames) {
      await this.addProductToCart(name);
    }
  }

  /** Removes a specific product from the cart while on the inventory page. */
  public async removeProductFromCart(productName: string): Promise<void> {
    this.log.step(`Removing product from cart: "${productName}"`);
    await this.click(this.getRemoveButton(productName));
  }

  /** Opens the product detail page by clicking on the product name link. */
  public async openProductDetail(productName: string): Promise<void> {
    this.log.step(`Opening product detail: "${productName}"`);
    await this.page.locator('.inventory_item_name').filter({ hasText: productName }).click();
  }

  /** Sorts the inventory using the dropdown. */
  public async sortBy(option: SortOption): Promise<void> {
    this.log.step(`Sorting inventory by: ${option}`);
    await this.selectOption(this.sortDropdown, SORT_VALUE_MAP[option]);
  }

  // ─── Read helpers ──────────────────────────────────────────────────────────

  public async getProductCount(): Promise<number> {
    return this.getCount(this.inventoryItems);
  }

  public async getAllProductNames(): Promise<string[]> {
    return this.productNames.allTextContents();
  }

  public async getAllProductPrices(): Promise<number[]> {
    const rawPrices = await this.productPrices.allTextContents();
    return rawPrices.map((p) => parseFloat(p.replace('$', '')));
  }

  // ─── Assertions ───────────────────────────────────────────────────────────

  public async assertOnInventoryPage(): Promise<void> {
    this.log.step('Asserting inventory page is loaded');
    await this.assertVisible(this.inventoryList);
    await expect(this.pageTitle).toHaveText('Products');
    await this.assertUrl('/inventory.html');
  }

  public async assertProductVisible(productName: string): Promise<void> {
    const item = this.page.locator('.inventory_item_name').filter({ hasText: productName });
    await this.assertVisible(item, `Product "${productName}" should be visible`);
  }

  public async assertCartBadgeCount(expected: number): Promise<void> {
    await this.header.assertCartBadgeCount(expected);
  }

  public async assertAddToCartButtonVisible(productName: string): Promise<void> {
    await this.assertVisible(
      this.getAddToCartButton(productName),
      `"Add to cart" button for "${productName}" should be visible`,
    );
  }

  public async assertRemoveButtonVisible(productName: string): Promise<void> {
    await this.assertVisible(
      this.getRemoveButton(productName),
      `"Remove" button for "${productName}" should be visible`,
    );
  }

  public async assertProductsSortedAZ(): Promise<void> {
    this.log.step('Asserting products sorted A→Z');
    const names = await this.getAllProductNames();
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  }

  public async assertProductsSortedByPriceAsc(): Promise<void> {
    this.log.step('Asserting products sorted by price ascending');
    const prices = await this.getAllProductPrices();
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  }
}
