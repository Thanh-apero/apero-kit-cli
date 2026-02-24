import fs from 'fs-extra';
import { join } from 'path';
import { hashDirectory } from './hash.js';

const STATE_DIR = '.ak';
const STATE_FILE = 'state.json';

export interface ProjectState {
  version: string;
  createdAt: string;
  lastUpdate: string;
  kit: string;
  source: string;
  target: string;
  targets?: string[]; // Multiple CLI targets (claude, gemini)
  installed: {
    agents?: string[];
    skills?: string[];
    commands?: string[];
    workflows?: string[];
    router?: boolean;
    hooks?: boolean;
  };
  originalHashes: Record<string, string>;
}

/**
 * Get state file path
 */
export function getStatePath(projectDir: string): string {
  return join(projectDir, STATE_DIR, STATE_FILE);
}

/**
 * Load state from .ak/state.json
 */
export async function loadState(projectDir: string): Promise<ProjectState | null> {
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
export async function saveState(projectDir: string, state: ProjectState): Promise<void> {
  const stateDir = join(projectDir, STATE_DIR);
  const statePath = join(stateDir, STATE_FILE);

  await fs.ensureDir(stateDir);
  await fs.writeJson(statePath, state, { spaces: 2 });
}

export interface CreateStateOptions {
  kit: string;
  source: string;
  target: string;
  targets?: string[];
  installed: ProjectState['installed'];
}

/**
 * Create initial state after init
 */
export async function createInitialState(projectDir: string, options: CreateStateOptions): Promise<ProjectState> {
  const { kit, source, target, targets, installed } = options;

  // Calculate hashes for all target directories
  const allHashes: Record<string, string> = {};
  const targetList = targets || [target.replace('.', '')]; // fallback to single target

  for (const t of targetList) {
    const targetDirName = t.startsWith('.') ? t : `.${t}`;
    const targetDir = join(projectDir, targetDirName);
    if (fs.existsSync(targetDir)) {
      const hashes = await hashDirectory(targetDir);
      // Prefix hashes with target name for uniqueness
      for (const [path, hash] of Object.entries(hashes)) {
        allHashes[`${targetDirName}/${path}`] = hash;
      }
    }
  }

  const state: ProjectState = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    kit,
    source,
    target,
    targets,
    installed,
    originalHashes: allHashes
  };

  await saveState(projectDir, state);
  return state;
}

/**
 * Update state after update command
 */
export async function updateState(projectDir: string, updates: Partial<ProjectState>): Promise<ProjectState> {
  const state = await loadState(projectDir);

  if (!state) {
    throw new Error('No state found. Is this an ak project?');
  }

  const targetDir = join(projectDir, state.target || '.claude');
  const newHashes = await hashDirectory(targetDir);

  const updatedState: ProjectState = {
    ...state,
    ...updates,
    lastUpdate: new Date().toISOString(),
    originalHashes: newHashes
  };

  await saveState(projectDir, updatedState);
  return updatedState;
}

export interface FileStatuses {
  state: ProjectState;
  statuses: {
    unchanged: string[];
    modified: string[];
    added: string[];
    deleted: string[];
  };
  targetDir: string;
}

export interface FileStatusError {
  error: string;
}

/**
 * Get file status (unchanged, modified, added, deleted)
 */
export async function getFileStatuses(projectDir: string): Promise<FileStatuses | FileStatusError> {
  const state = await loadState(projectDir);

  if (!state) {
    return { error: 'No state found' };
  }

  const targetDir = join(projectDir, state.target || '.claude');
  const currentHashes = await hashDirectory(targetDir);
  const originalHashes = state.originalHashes || {};

  const statuses = {
    unchanged: [] as string[],
    modified: [] as string[],
    added: [] as string[],
    deleted: [] as string[]
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
