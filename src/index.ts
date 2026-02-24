#!/usr/bin/env node
import cac from 'cac';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pc from 'picocolors';
import { registerCommands } from './cli/command-registry.js';
import { getCachedVersionNoFetch, isNewerVersion } from './utils/version-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

const cli = cac('ak');
registerCommands(cli);
cli.help();
cli.version(getVersion());
cli.parse();

// Non-blocking update check (cache-only, no network)
try {
  const version = getVersion();
  const cachedLatest = getCachedVersionNoFetch();
  if (cachedLatest && isNewerVersion(version, cachedLatest)) {
    console.log(pc.yellow(`\n  Update available: v${version} → v${cachedLatest}`));
    console.log(pc.gray('  Run "ak update-cli" to update\n'));
  }
} catch { /* silent */ }
