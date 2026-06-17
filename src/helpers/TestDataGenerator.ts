/**
 * @file src/helpers/TestDataGenerator.ts
 * @description Generates realistic fake test data using @faker-js/faker.
 *
 * Design:
 *  - Static factory methods — no mutable state, easy to parallelise (SRP).
 *  - All returned objects satisfy the interfaces in src/types/index.ts (LSP).
 *  - Optional `seed` parameter ensures reproducible data for snapshot tests.
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import type { ITestUser, IAddress, IProduct, IOrderDetails } from '../types/index';

export class TestDataGenerator {
  // ─── Seed control ─────────────────────────────────────────────────────────

  /**
   * Set a numeric seed for deterministic data generation.
   * Useful when a test failure must be reproduced with the same data.
   */
  public static seed(value: number): void {
    faker.seed(value);
  }

  // ─── User data ─────────────────────────────────────────────────────────────

  /**
   * Generates a complete test user profile.
   * Username/password are kept simple for readability in test output.
   */
  public static generateUser(): ITestUser {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      username: String(faker.internet.username({ firstName, lastName })).toLowerCase(),
      password: faker.internet.password({ length: 12, memorable: true }),
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      postalCode: faker.location.zipCode(),
    };
  }

  /**
   * Generates a billing address (used in checkout forms).
   */
  public static generateAddress(): IAddress {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      postalCode: faker.location.zipCode(),
    };
  }

  /**
   * Generates a random array of addresses (useful for parameterised tests).
   */
  public static generateAddresses(count: number): IAddress[] {
    return Array.from({ length: count }, () => this.generateAddress());
  }

  // ─── Product data ─────────────────────────────────────────────────────────

  /**
   * Generates a fake product — used for mock API responses and snapshot data.
   */
  public static generateProduct(overrides: Partial<IProduct> = {}): IProduct {
    return {
      id: uuidv4(),
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price({ min: 1, max: 200 })),
      imageUrl: faker.image.url({ width: 300, height: 300 }),
      ...overrides,
    };
  }

  public static generateProducts(count: number): IProduct[] {
    return Array.from({ length: count }, () => this.generateProduct());
  }

  // ─── Order data ────────────────────────────────────────────────────────────

  public static generateOrderDetails(itemCount = 2): IOrderDetails {
    const items = this.generateProducts(itemCount);
    const total = items.reduce((sum, p) => sum + p.price, 0);

    return {
      customer: this.generateAddress(),
      items,
      total: parseFloat(total.toFixed(2)),
    };
  }

  // ─── Primitive helpers ─────────────────────────────────────────────────────

  public static randomEmail(): string {
    return faker.internet.email().toLowerCase();
  }

  public static randomPhoneNumber(): string {
    return faker.phone.number({ style: 'national' });
  }

  public static randomSentence(wordCount = 8): string {
    return faker.lorem.sentence(wordCount);
  }

  public static randomInt(min: number, max: number): number {
    return faker.number.int({ min, max });
  }

  public static randomBoolean(): boolean {
    return faker.datatype.boolean();
  }

  /**
   * Picks a random item from an array — handy for selecting random products.
   */
  public static pickRandom<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    const index = faker.number.int({ min: 0, max: array.length - 1 });
    return array[index] as T;
  }

  public static pickMultiple<T>(array: T[], count: number): T[] {
    return faker.helpers.arrayElements(array, count);
  }

  // ─── Timestamps ────────────────────────────────────────────────────────────

  public static pastDate(years = 1): Date {
    return faker.date.past({ years });
  }

  public static futureDate(years = 1): Date {
    return faker.date.future({ years });
  }

  public static formattedDate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0] ?? '';
  }
}
