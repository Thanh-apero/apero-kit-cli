#!/usr/bin/env node
import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPO_URL = 'https://github.com/Thanhnguyen6702/CK-Internal.git';
const TMP_DIR = join(ROOT, '.tmp-ck-clone');
const TEMPLATES_DIR = join(ROOT, 'templates');
const COMPONENTS = ['agents', 'commands', 'skills', 'workflows', 'hooks', 'router'];

console.log('Fetching templates from CK-Internal...');

// Clone
if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
execSync(`git clone --depth 1 "${REPO_URL}" "${TMP_DIR}"`, { stdio: 'inherit' });

// Clear existing templates
if (existsSync(TEMPLATES_DIR)) rmSync(TEMPLATES_DIR, { recursive: true, force: true });
mkdirSync(TEMPLATES_DIR, { recursive: true });

// Copy .claude/ components
const claudeDir = join(TMP_DIR, '.claude');
for (const comp of COMPONENTS) {
  const src = join(claudeDir, comp);
  if (existsSync(src)) {
    cpSync(src, join(TEMPLATES_DIR, comp), { recursive: true });
    console.log(`  ✓ ${comp}/`);
  }
}

// Copy base files from .claude/
const baseFilesFromClaude = ['settings.json', 'README.md'];
for (const f of baseFilesFromClaude) {
  const src = join(claudeDir, f);
  if (existsSync(src)) cpSync(src, join(TEMPLATES_DIR, f));
}

// Copy AGENTS.md from root
const agentsMd = join(TMP_DIR, 'AGENTS.md');
if (existsSync(agentsMd)) {
  cpSync(agentsMd, join(TEMPLATES_DIR, 'AGENTS.md'));
  console.log('  ✓ AGENTS.md');
}

// Cleanup
rmSync(TMP_DIR, { recursive: true, force: true });
console.log('✓ Templates fetched successfully');
