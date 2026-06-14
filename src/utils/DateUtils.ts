/**
 * @file src/utils/DateUtils.ts
 * @description Date/time helpers for consistent formatting and comparison across tests.
 *
 * Design:
 *  - Pure static methods — no state, no side effects (SRP).
 *  - All formatting is locale-agnostic (ISO 8601) by default so test logs are
 *    consistent across CI runners in different timezones.
 */

export class DateUtils {
  // ─── Formatting ──────────────────────────────────────────────────────────

  /** ISO 8601 UTC string — safe for filenames and log correlation. */
  public static toISOString(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Returns a compact timestamp suitable for use in filenames.
   * e.g. "2024-06-15_14-32-07"
   */
  public static toFilenameSafeTimestamp(date: Date = new Date()): string {
    return date
      .toISOString()
      .replace('T', '_')
      .replace(/:/g, '-')
      .split('.')[0] ?? '';
  }

  /**
   * Formats a date as YYYY-MM-DD (UI date input format).
   */
  public static toDateInputFormat(date: Date = new Date()): string {
    return date.toISOString().split('T')[0] ?? '';
  }

  /**
   * Returns a human-readable display date.
   * e.g. "June 15, 2024"
   */
  public static toDisplayDate(date: Date = new Date(), locale = 'en-US'): string {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Returns time portion as HH:MM:SS string.
   */
  public static toTimeString(date: Date = new Date()): string {
    return date.toTimeString().split(' ')[0] ?? '';
  }

  // ─── Arithmetic ───────────────────────────────────────────────────────────

  public static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  public static subtractDays(date: Date, days: number): Date {
    return DateUtils.addDays(date, -days);
  }

  public static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /** Returns the number of calendar days between two dates (absolute). */
  public static daysBetween(from: Date, to: Date): number {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.abs(Math.round((to.getTime() - from.getTime()) / MS_PER_DAY));
  }

  // ─── Comparison helpers ───────────────────────────────────────────────────

  public static isBefore(date: Date, reference: Date): boolean {
    return date.getTime() < reference.getTime();
  }

  public static isAfter(date: Date, reference: Date): boolean {
    return date.getTime() > reference.getTime();
  }

  public static isSameDay(a: Date, b: Date): boolean {
    return DateUtils.toDateInputFormat(a) === DateUtils.toDateInputFormat(b);
  }

  public static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  // ─── Parsing helpers ──────────────────────────────────────────────────────

  /**
   * Parses a date string and returns a `Date`.
   * Throws a descriptive error if parsing fails (better DX than `new Date(invalid)`).
   */
  public static parseStrict(value: string): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`DateUtils.parseStrict: Cannot parse "${value}" as a valid date.`);
    }
    return date;
  }

  // ─── Run timing ───────────────────────────────────────────────────────────

  /**
   * Returns a high-resolution start mark; call `elapsed(mark)` to get duration ms.
   * Useful for measuring test-step performance.
   */
  public static startTimer(): number {
    return Date.now();
  }

  public static elapsedMs(startMs: number): number {
    return Date.now() - startMs;
  }

  public static elapsedSeconds(startMs: number): number {
    return Math.round(DateUtils.elapsedMs(startMs) / 1000);
  }
}
