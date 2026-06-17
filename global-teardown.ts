/**
 * @file global-teardown.ts
 * @description Runs ONCE after the entire test suite completes.
 *
 * Responsibilities:
 *  - Print a concise run summary to the console.
 *  - Clean up temporary auth session files (optional — disable in CI for caching).
 *  - Record the run end time in the manifest.
 *
 * Playwright executes this file via `globalTeardown` in playwright.config.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './src/utils/Logger';

const log = Logger.forContext('GlobalTeardown');

function globalTeardown(): void {
  log.info('═══════════════════════════════════════════════════════');
  log.info('  🏁 PLAYWRIGHT FRAMEWORK — GLOBAL TEARDOWN');
  log.info('═══════════════════════════════════════════════════════');

  // ── Update run manifest with end time ────────────────────────────────────
  const manifestPath = path.resolve(process.cwd(), 'test-results', 'run-manifest.json');

  if (fs.existsSync(manifestPath)) {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    manifest['finishedAt'] = new Date().toISOString();

    const start = new Date(manifest['startedAt'] as string).getTime();
    const end = new Date(manifest['finishedAt'] as string).getTime();
    manifest['durationSeconds'] = Math.round((end - start) / 1000);

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    log.info(`Run duration: ${String(manifest['durationSeconds'])}s`);
  }

  // ── Optional: clean up auth state files ─────────────────────────────────
  // Comment out this block if you want to cache sessions between runs (e.g., CI).
  const authDir = path.resolve(process.cwd(), 'test-results', 'auth');
  if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir);
    for (const file of files) {
      fs.unlinkSync(path.join(authDir, file));
    }
    log.debug(`Cleaned ${files.length} auth state file(s)`);
  }

  log.info('  ✅ GLOBAL TEARDOWN COMPLETE');
  log.info('═══════════════════════════════════════════════════════');
}

export default globalTeardown;
