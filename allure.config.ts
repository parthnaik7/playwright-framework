/**
 * @file allure.config.ts
 * @description Allure configuration for categories, severities, and custom labels.
 *
 * This file is read by the Allure CLI when generating the HTML report.
 * `allure generate --config allure.config.ts` picks it up automatically
 * when using allure-playwright v3+.
 *
 * Categories allow Allure to classify failures into meaningful groups:
 *  - "Product defects"   — assertion failures (the app is broken)
 *  - "Test defects"      — infrastructure/selector failures (test needs fixing)
 *  - "Timeouts"          — slow network or CI resource issues
 */

export default {
  categories: [
    {
      name: '🐛 Product Defects',
      messageRegex: '.*AssertionError.*',
      matchedStatuses: ['failed'],
    },
    {
      name: '🔧 Test Defects',
      messageRegex: '.*(TimeoutError|Error: locator|strict mode violation).*',
      matchedStatuses: ['failed', 'broken'],
    },
    {
      name: '⏱️ Timeouts',
      messageRegex: '.*Timeout.*exceeded.*',
      matchedStatuses: ['failed', 'broken'],
    },
    {
      name: '🚫 Navigation Errors',
      messageRegex: '.*(net::ERR_|Navigation timeout).*',
      matchedStatuses: ['failed', 'broken'],
    },
    {
      name: '✅ Passed',
      matchedStatuses: ['passed'],
    },
    {
      name: '⏭️ Skipped',
      matchedStatuses: ['skipped'],
    },
  ],
};
