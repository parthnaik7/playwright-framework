/**
 * @file tests/saucedemo/cart.spec.ts
 * @description Shopping cart test suite for SauceDemo.
 *
 * Covers:
 *  - Adding a single product to cart                   @smoke @regression
 *  - Adding multiple products                          @regression
 *  - Removing a product from inventory page            @regression
 *  - Removing a product from the cart page             @regression
 *  - Cart badge count accuracy                         @regression
 *  - Persisting cart between navigation               @regression
 *  - Cart page content verification                   @regression
 *  - Inventory sort functionality                      @regression
 *
 * All tests use `authenticatedPage` fixture — login is handled automatically.
 */

import { test, expect } from '../../src/fixtures/test-fixtures';
import { InventoryPage } from '../../src/pages/InventoryPage';
import { CartPage } from '../../src/pages/CartPage';
import { Logger } from '../../src/utils/Logger';

const log = Logger.forContext('CartSpec');

// ─── Product names used across tests (DRY) ───────────────────────────────────
const PRODUCTS = {
  BACKPACK: 'Sauce Labs Backpack',
  BIKE_LIGHT: 'Sauce Labs Bike Light',
  BOLT_SHIRT: 'Sauce Labs Bolt T-Shirt',
  FLEECE_JACKET: 'Sauce Labs Fleece Jacket',
  ONESIE: 'Sauce Labs Onesie',
  RED_SHIRT: 'Test.allTheThings() T-Shirt (Red)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Add to Cart tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Add to Cart', () => {
  let inventoryPage: InventoryPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    inventoryPage = new InventoryPage(authenticatedPage);
    // Reset cart state via the menu to ensure clean slate
    await inventoryPage.header.resetAppState();
    // Verify we're on inventory
    await inventoryPage.assertOnInventoryPage();
  });

  test(
    'should add a single product to cart and update badge @smoke @regression',
    async () => {
      log.step('Adding single product to cart');
      await inventoryPage.addProductToCart(PRODUCTS.BACKPACK);

      // Cart badge should update to 1
      await inventoryPage.assertCartBadgeCount(1);

      // The button text should change to "Remove"
      await inventoryPage.assertRemoveButtonVisible(PRODUCTS.BACKPACK);
      log.info('✅ Cart badge updated to 1 after adding one product');
    },
  );

  test(
    'should add multiple products and show correct badge count @regression',
    async () => {
      const productsToAdd = [PRODUCTS.BACKPACK, PRODUCTS.BIKE_LIGHT, PRODUCTS.BOLT_SHIRT];

      log.step(`Adding ${productsToAdd.length} products to cart`);
      await inventoryPage.addProductsToCart(productsToAdd);

      await inventoryPage.assertCartBadgeCount(productsToAdd.length);
      log.info(`✅ Cart badge shows ${productsToAdd.length} after adding ${productsToAdd.length} products`);
    },
  );

  test(
    'should allow adding all 6 products to cart @regression',
    async () => {
      const allProducts = Object.values(PRODUCTS);
      log.step('Adding all products to cart');

      for (const product of allProducts) {
        await inventoryPage.addProductToCart(product);
      }

      await inventoryPage.assertCartBadgeCount(allProducts.length);
      expect(allProducts.length).toBe(6);
    },
  );

  test(
    'should remove a product from the inventory page @regression',
    async () => {
      // Add first, then remove
      await inventoryPage.addProductToCart(PRODUCTS.BACKPACK);
      await inventoryPage.assertCartBadgeCount(1);

      log.step('Removing product from inventory page');
      await inventoryPage.removeProductFromCart(PRODUCTS.BACKPACK);

      // Badge should disappear (count = 0 = hidden)
      await inventoryPage.assertCartBadgeCount(0);

      // "Add to cart" button should be visible again
      await inventoryPage.assertAddToCartButtonVisible(PRODUCTS.BACKPACK);
      log.info('✅ Product removed from cart, badge hidden, button reset');
    },
  );

  test(
    'should add two products then remove one and badge reflects correct count @regression',
    async () => {
      await inventoryPage.addProductsToCart([PRODUCTS.BACKPACK, PRODUCTS.BIKE_LIGHT]);
      await inventoryPage.assertCartBadgeCount(2);

      await inventoryPage.removeProductFromCart(PRODUCTS.BACKPACK);
      await inventoryPage.assertCartBadgeCount(1);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Cart Page tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Cart Page', () => {
  let inventoryPage: InventoryPage;
  let cartPage: CartPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    inventoryPage = new InventoryPage(authenticatedPage);
    cartPage = new CartPage(authenticatedPage);
    // Reset state and go to inventory
    await inventoryPage.header.resetAppState();
    await inventoryPage.assertOnInventoryPage();
  });

  test(
    'should navigate to cart page and display added items @smoke @regression',
    async () => {
      const productsToAdd = [PRODUCTS.BACKPACK, PRODUCTS.BIKE_LIGHT];

      log.step('Adding products and navigating to cart');
      await inventoryPage.addProductsToCart(productsToAdd);
      await inventoryPage.header.goToCart();

      await cartPage.assertOnCartPage();
      await cartPage.assertCartItemCount(productsToAdd.length);

      for (const product of productsToAdd) {
        await cartPage.assertItemInCart(product);
      }
      log.info('✅ All added items visible in cart page');
    },
  );

  test(
    'should show an empty cart when no items added @regression',
    async () => {
      log.step('Navigating to cart with no items');
      await inventoryPage.header.goToCart();
      await cartPage.assertOnCartPage();
      await cartPage.assertCartIsEmpty();
      log.info('✅ Empty cart confirmed');
    },
  );

  test(
    'should remove an item from the cart page @regression',
    async () => {
      await inventoryPage.addProductsToCart([PRODUCTS.BACKPACK, PRODUCTS.BIKE_LIGHT]);
      await inventoryPage.header.goToCart();
      await cartPage.assertCartItemCount(2);

      log.step('Removing one item from cart page');
      await cartPage.removeItem(PRODUCTS.BACKPACK);

      await cartPage.assertCartItemCount(1);
      await cartPage.assertItemNotInCart(PRODUCTS.BACKPACK);
      await cartPage.assertItemInCart(PRODUCTS.BIKE_LIGHT);
      log.info('✅ Item removed from cart, remaining item still present');
    },
  );

  test(
    'should persist cart items when navigating back to inventory @regression',
    async () => {
      await inventoryPage.addProductToCart(PRODUCTS.BACKPACK);
      await inventoryPage.assertCartBadgeCount(1);

      // Go to cart, then continue shopping
      await inventoryPage.header.goToCart();
      await cartPage.continueShopping();

      // Cart badge should still show 1
      await inventoryPage.assertOnInventoryPage();
      await inventoryPage.assertCartBadgeCount(1);
      log.info('✅ Cart persisted after navigating back to inventory');
    },
  );

  test(
    'should display correct item names and prices in cart @regression',
    async () => {
      await inventoryPage.addProductsToCart([PRODUCTS.BACKPACK, PRODUCTS.BIKE_LIGHT]);
      await inventoryPage.header.goToCart();
      await cartPage.assertOnCartPage();

      const names = await cartPage.getCartItemNames();
      expect(names).toContain(PRODUCTS.BACKPACK);
      expect(names).toContain(PRODUCTS.BIKE_LIGHT);

      const prices = await cartPage.getCartItemPrices();
      expect(prices.length).toBe(2);
      prices.forEach((price) => expect(price).toBeGreaterThan(0));
      log.info('✅ Cart item names and prices verified');
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Inventory sort tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Inventory Sort', () => {
  let inventoryPage: InventoryPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    inventoryPage = new InventoryPage(authenticatedPage);
    await inventoryPage.assertOnInventoryPage();
  });

  test(
    'should sort products A to Z by default @regression',
    async () => {
      log.step('Verifying default A→Z sort');
      await inventoryPage.assertProductsSortedAZ();
    },
  );

  test(
    'should sort products by price low to high @regression',
    async () => {
      log.step('Sorting by price low→high');
      await inventoryPage.sortBy('lohi');
      await inventoryPage.assertProductsSortedByPriceAsc();
      log.info('✅ Products sorted by price ascending');
    },
  );

  test(
    'should sort products Z to A @regression',
    async () => {
      log.step('Sorting Z→A');
      await inventoryPage.sortBy('za');
      const names = await inventoryPage.getAllProductNames();
      const reverseSorted = [...names].sort((a, b) => b.localeCompare(a));
      expect(names).toEqual(reverseSorted);
      log.info('✅ Products sorted Z→A');
    },
  );

  test(
    'should sort products by price high to low @regression',
    async () => {
      log.step('Sorting by price high→low');
      await inventoryPage.sortBy('hilo');
      const prices = await inventoryPage.getAllProductPrices();
      const sortedDesc = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sortedDesc);
      log.info('✅ Products sorted by price descending');
    },
  );
});
