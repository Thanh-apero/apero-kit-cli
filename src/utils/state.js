import fs from 'fs-extra';
import { join } from 'path';
import { hashDirectory } from './hash.js';

const STATE_DIR = '.ak';
const STATE_FILE = 'state.json';

/**
 * Get state file path
 */
export function getStatePath(projectDir) {
  return join(projectDir, STATE_DIR, STATE_FILE);
}

/**
 * Load state from .ak/state.json
 */
export async function loadState(projectDir) {
  const statePath = getStatePath(projectDir);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return await fs.readJson(statePath);
  } catch {
    return null;
  }
}

/**
 * Save state to .ak/state.json
 */
export async function saveState(projectDir, state) {
  const stateDir = join(projectDir, STATE_DIR);
  const statePath = join(stateDir, STATE_FILE);

  await fs.ensureDir(stateDir);
  await fs.writeJson(statePath, state, { spaces: 2 });
}

/**
 * Create initial state after init
 */
export async function createInitialState(projectDir, options) {
  const { kit, source, target, installed } = options;

  // Calculate hashes of all installed files
  const targetDir = join(projectDir, target);
  const hashes = await hashDirectory(targetDir);

  const state = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    kit,
    source,
    target,
    installed,
    originalHashes: hashes
  };

  await saveState(projectDir, state);
  return state;
}

/**
 * Update state after update command
 */
export async function updateState(projectDir, updates) {
  const state = await loadState(projectDir);

  if (!state) {
    throw new Error('No state found. Is this an ak project?');
  }

  const targetDir = join(projectDir, state.target || '.claude');
  const newHashes = await hashDirectory(targetDir);

  const updatedState = {
    ...state,
    ...updates,
    lastUpdate: new Date().toISOString(),
    originalHashes: newHashes
  };

  await saveState(projectDir, updatedState);
  return updatedState;
}

/**
 * Get file status (unchanged, modified, added, deleted)
 */
export async function getFileStatuses(projectDir) {
  const state = await loadState(projectDir);

  if (!state) {
    return { error: 'No state found' };
  }

  const targetDir = join(projectDir, state.target || '.claude');
  const currentHashes = await hashDirectory(targetDir);
  const originalHashes = state.originalHashes || {};

  const statuses = {
    unchanged: [],
    modified: [],
    added: [],
    deleted: []
  };

  // Check original files
  for (const [path, hash] of Object.entries(originalHashes)) {
    if (currentHashes[path] === undefined) {
      statuses.deleted.push(path);
    } else if (currentHashes[path] !== hash) {
      statuses.modified.push(path);
    } else {
      statuses.unchanged.push(path);
    }
  }

  // Check for new files
  for (const path of Object.keys(currentHashes)) {
    if (originalHashes[path] === undefined) {
      statuses.added.push(path);
    }
  }

  return {
    state,
    statuses,
    targetDir
  };
}
