/**
 * @file tests/saucedemo/checkout.spec.ts
 * @description End-to-end checkout flow test suite for SauceDemo.
 *
 * Covers:
 *  - Full happy-path checkout flow (add → cart → info → overview → complete) @smoke
 *  - Checkout with multiple products                    @regression
 *  - Validation: empty first name                      @regression
 *  - Validation: empty last name                       @regression
 *  - Validation: empty postal code                     @regression
 *  - Cancel from step 1 returns to cart                @regression
 *  - Cancel from step 2 returns to inventory           @regression
 *  - Order total calculation is mathematically correct @regression
 *  - Back-to-products after completion                 @regression
 *
 * Uses `TestDataGenerator` for realistic checkout addresses — no hard-coded strings.
 */

import type { Page } from '@playwright/test';
import { test, expect } from '../../src/fixtures/test-fixtures';
import { InventoryPage } from '../../src/pages/InventoryPage';
import { CartPage } from '../../src/pages/CartPage';
import { CheckoutPage } from '../../src/pages/CheckoutPage';
import { TestDataGenerator } from '../../src/helpers/TestDataGenerator';
import { Logger } from '../../src/utils/Logger';

const log = Logger.forContext('CheckoutSpec');

// ─── Shared product selection (DRY) ──────────────────────────────────────────
const PRODUCTS = {
  BACKPACK: 'Sauce Labs Backpack',
  BIKE_LIGHT: 'Sauce Labs Bike Light',
  BOLT_SHIRT: 'Sauce Labs Bolt T-Shirt',
} as const;

// ─── Helper: perform UI login and reach inventory ──────────────────────────────

async function reachInventory(
  page: Page,
): Promise<InventoryPage> {
  const inventoryPage = new InventoryPage(page);
  await inventoryPage.header.resetAppState();
  await inventoryPage.assertOnInventoryPage();
  return inventoryPage;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full checkout flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Checkout Flow', () => {
  test(
    'should complete a full checkout with a single product @smoke @regression',
    async ({ authenticatedPage }) => {
      const inventoryPage = await reachInventory(authenticatedPage);
      const cartPage = new CartPage(authenticatedPage);
      const checkoutPage = new CheckoutPage(authenticatedPage);
      const address = TestDataGenerator.generateAddress();

      // ── Step 1: Add product to cart ──────────────────────────────────────
      log.step('Step 1: Add product to cart');
      await inventoryPage.addProductToCart(PRODUCTS.BACKPACK);
      await inventoryPage.assertCartBadgeCount(1);

      // ── Step 2: Navigate to cart ─────────────────────────────────────────
      log.step('Step 2: Navigate to cart');
      await inventoryPage.header.goToCart();
      await cartPage.assertOnCartPage();
      await cartPage.assertItemInCart(PRODUCTS.BACKPACK);
      await cartPage.assertCartItemCount(1);
      await cartPage.assertCheckoutButtonVisible();

      // ── Step 3: Proceed to checkout info ─────────────────────────────────
      log.step('Step 3: Proceed to checkout step 1');
      await cartPage.proceedToCheckout();
      await checkoutPage.assertOnStepOne();

      // ── Step 4: Fill customer information ────────────────────────────────
      log.step('Step 4: Fill customer information');
      log.debug('Using generated address', { address });
      await checkoutPage.completeCustomerInfo(address);

      // ── Step 5: Verify order overview ────────────────────────────────────
      log.step('Step 5: Verify order overview');
      await checkoutPage.assertOnStepTwo();
      await checkoutPage.assertSummaryItemCount(1);
      await checkoutPage.assertTotalsAreCorrect();

      const orderTotal = await checkoutPage.getOrderTotal();
      expect(orderTotal, 'Order total should be positive').toBeGreaterThan(0);
      log.info(`Order total: $${orderTotal}`);

      // ── Step 6: Finish the order ─────────────────────────────────────────
      log.step('Step 6: Finish the order');
      await checkoutPage.finishOrder();

      // ── Step 7: Verify confirmation ──────────────────────────────────────
      log.step('Step 7: Verify order confirmation');
      await checkoutPage.assertOrderComplete();
      log.info('✅ Full checkout flow completed successfully');
    },
  );

  test(
    'should complete checkout with multiple products and verify totals @regression',
    async ({ authenticatedPage }) => {
      const inventoryPage = await reachInventory(authenticatedPage);
      const cartPage = new CartPage(authenticatedPage);
      const checkoutPage = new CheckoutPage(authenticatedPage);
      const address = TestDataGenerator.generateAddress();
      const products = [PRODUCTS.BACKPACK, PRODUCTS.BIKE_LIGHT, PRODUCTS.BOLT_SHIRT];

      // Add all products
      log.step(`Adding ${products.length} products to cart`);
      await inventoryPage.addProductsToCart(products);
      await inventoryPage.assertCartBadgeCount(products.length);

      // Navigate through checkout
      await inventoryPage.header.goToCart();
      await cartPage.assertCartItemCount(products.length);

      await cartPage.proceedToCheckout();
      await checkoutPage.assertOnStepOne();
      await checkoutPage.completeCustomerInfo(address);

      // Verify overview shows all items
      await checkoutPage.assertOnStepTwo();
      await checkoutPage.assertSummaryItemCount(products.length);

      // Verify totals are mathematically correct
      await checkoutPage.assertTotalsAreCorrect();

      const itemTotal = await checkoutPage.getItemTotal();
      const tax = await checkoutPage.getTaxAmount();
      const orderTotal = await checkoutPage.getOrderTotal();

      log.info(`Item total: $${itemTotal} | Tax: $${tax} | Order total: $${orderTotal}`);
      expect(orderTotal).toBeCloseTo(itemTotal + tax, 1);

      await checkoutPage.finishOrder();
      await checkoutPage.assertOrderComplete();
      log.info('✅ Multi-product checkout completed with verified totals');
    },
  );

  test(
    'should navigate back to products page after completing order @regression',
    async ({ authenticatedPage }) => {
      const inventoryPage = await reachInventory(authenticatedPage);
      const cartPage = new CartPage(authenticatedPage);
      const checkoutPage = new CheckoutPage(authenticatedPage);
      const address = TestDataGenerator.generateAddress();

      await inventoryPage.addProductToCart(PRODUCTS.BACKPACK);
      await inventoryPage.header.goToCart();
      await cartPage.proceedToCheckout();
      await checkoutPage.completeCustomerInfo(address);
      await checkoutPage.finishOrder();
      await checkoutPage.assertOrderComplete();

      // Click "Back Home"
      log.step('Navigating back to products from confirmation');
      await checkoutPage.backToProducts();

      await inventoryPage.assertOnInventoryPage();
      // Cart should be empty after order is complete
      await inventoryPage.assertCartBadgeCount(0);
      log.info('✅ Returned to inventory with cleared cart after order');
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Checkout form validation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Checkout Validation', () => {
  let checkoutPage: CheckoutPage;
  let cartPage: CartPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    const inventoryPage = await reachInventory(authenticatedPage);
    cartPage = new CartPage(authenticatedPage);
    checkoutPage = new CheckoutPage(authenticatedPage);

    // Add one item and reach checkout step 1
    await inventoryPage.addProductToCart(PRODUCTS.BACKPACK);
    await inventoryPage.header.goToCart();
    await cartPage.proceedToCheckout();
    await checkoutPage.assertOnStepOne();
  });

  test(
    'should show error when First Name is missing @regression',
    async () => {
      log.step('Submitting checkout without first name');
      const address = TestDataGenerator.generateAddress();
      // Fill last name and postal code but NOT first name
      await checkoutPage.fillCustomerInfo({
        firstName: '',
        lastName: address.lastName,
        postalCode: address.postalCode,
      });
      await checkoutPage.continueToOverview();

      await checkoutPage.assertErrorVisible('First Name is required');
      // Should remain on step 1
      await checkoutPage.assertOnStepOne();
    },
  );

  test(
    'should show error when Last Name is missing @regression',
    async () => {
      log.step('Submitting checkout without last name');
      const address = TestDataGenerator.generateAddress();
      await checkoutPage.fillCustomerInfo({
        firstName: address.firstName,
        lastName: '',
        postalCode: address.postalCode,
      });
      await checkoutPage.continueToOverview();

      await checkoutPage.assertErrorVisible('Last Name is required');
      await checkoutPage.assertOnStepOne();
    },
  );

  test(
    'should show error when Postal Code is missing @regression',
    async () => {
      log.step('Submitting checkout without postal code');
      const address = TestDataGenerator.generateAddress();
      await checkoutPage.fillCustomerInfo({
        firstName: address.firstName,
        lastName: address.lastName,
        postalCode: '',
      });
      await checkoutPage.continueToOverview();

      await checkoutPage.assertErrorVisible('Postal Code is required');
      await checkoutPage.assertOnStepOne();
    },
  );

  test(
    'should show error when all fields are empty @regression',
    async () => {
      log.step('Submitting empty checkout form');
      await checkoutPage.fillCustomerInfo({ firstName: '', lastName: '', postalCode: '' });
      await checkoutPage.continueToOverview();
      await checkoutPage.assertErrorVisible('First Name is required');
      await checkoutPage.assertOnStepOne();
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Checkout cancellation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('SauceDemo — Checkout Cancellation', () => {
  test(
    'should cancel from step 1 and return to cart @regression',
    async ({ authenticatedPage }) => {
      const inventoryPage = await reachInventory(authenticatedPage);
      const cartPage = new CartPage(authenticatedPage);
      const checkoutPage = new CheckoutPage(authenticatedPage);

      await inventoryPage.addProductToCart(PRODUCTS.BACKPACK);
      await inventoryPage.header.goToCart();
      await cartPage.proceedToCheckout();
      await checkoutPage.assertOnStepOne();

      log.step('Cancelling from checkout step 1');
      await checkoutPage.cancel();

      // Should return to cart with item still present
      await cartPage.assertOnCartPage();
      await cartPage.assertItemInCart(PRODUCTS.BACKPACK);
      log.info('✅ Cancel from step 1 returned to cart with items intact');
    },
  );

  test(
    'should cancel from step 2 (overview) and return to inventory @regression',
    async ({ authenticatedPage }) => {
      const inventoryPage = await reachInventory(authenticatedPage);
      const cartPage = new CartPage(authenticatedPage);
      const checkoutPage = new CheckoutPage(authenticatedPage);
      const address = TestDataGenerator.generateAddress();

      await inventoryPage.addProductToCart(PRODUCTS.BACKPACK);
      await inventoryPage.header.goToCart();
      await cartPage.proceedToCheckout();
      await checkoutPage.completeCustomerInfo(address);
      await checkoutPage.assertOnStepTwo();

      log.step('Cancelling from checkout step 2');
      await checkoutPage.cancelFromOverview();

      // SauceDemo cancel from step 2 goes to inventory
      await inventoryPage.assertOnInventoryPage();
      // Cart badge should still show 1
      await inventoryPage.assertCartBadgeCount(1);
      log.info('✅ Cancel from step 2 returned to inventory with cart preserved');
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Parameterised checkout — multiple users / address combinations
// ─────────────────────────────────────────────────────────────────────────────

const checkoutAddresses = TestDataGenerator.generateAddresses(3);

for (const [index, address] of checkoutAddresses.entries()) {
  test(
    `should complete checkout with generated address #${index + 1} @regression`,
    async ({ authenticatedPage }) => {
      const inventoryPage = await reachInventory(authenticatedPage);
      const cartPage = new CartPage(authenticatedPage);
      const checkoutPage = new CheckoutPage(authenticatedPage);

      log.debug(`Running checkout with address #${index + 1}`, { address });

      await inventoryPage.addProductToCart(PRODUCTS.BIKE_LIGHT);
      await inventoryPage.header.goToCart();
      await cartPage.proceedToCheckout();
      await checkoutPage.completeCustomerInfo(address);
      await checkoutPage.assertOnStepTwo();
      await checkoutPage.finishOrder();
      await checkoutPage.assertOrderComplete();

      log.info(`✅ Checkout #${index + 1} completed for ${address.firstName} ${address.lastName}`);
    },
  );
}
