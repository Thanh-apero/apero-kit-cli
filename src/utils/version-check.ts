import { join } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

const CACHE_DIR = join(homedir(), '.thanh-kit');
const CACHE_FILE = join(CACHE_DIR, 'version-check.json');
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface VersionCache {
  version: string;
  timestamp: number;
}

/**
 * Get latest version from npm, with 7-day cache
 */
export function getCachedLatestVersion(): string | null {
  // Try cache first
  try {
    if (existsSync(CACHE_FILE)) {
      const cache: VersionCache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
      if (Date.now() - cache.timestamp < CACHE_TTL) {
        return cache.version;
      }
    }
  } catch { /* ignore corrupt cache */ }

  // Fetch fresh from npm
  try {
    const version = execSync('npm view thanh-kit version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // Save to cache
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ version, timestamp: Date.now() } satisfies VersionCache));

    return version;
  } catch {
    return null; // offline or error
  }
}

/**
 * Read cache only (no network). For non-blocking startup check.
 */
export function getCachedVersionNoFetch(): string | null {
  try {
    if (existsSync(CACHE_FILE)) {
      const cache: VersionCache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
      return cache.version;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Compare semver: returns true if latest > current
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const c = current.replace(/^v/, '').split('.').map(Number);
  const l = latest.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}
