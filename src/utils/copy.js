import fs from 'fs-extra';
import { join, basename } from 'path';

/**
 * Copy specific items from source to destination
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyItems(items, type, sourceDir, destDir, mergeMode = false) {
  const typeDir = join(sourceDir, type);
  const destTypeDir = join(destDir, type);

  if (!fs.existsSync(typeDir)) {
    return { copied: [], skipped: items, errors: [] };
  }

  await fs.ensureDir(destTypeDir);

  const copied = [];
  const skipped = [];
  const errors = [];

  for (const item of items) {
    try {
      // Handle nested paths like "plan/parallel"
      const itemPath = join(typeDir, item);
      const itemPathMd = itemPath + '.md';

      let srcPath;
      if (fs.existsSync(itemPath)) {
        srcPath = itemPath;
      } else if (fs.existsSync(itemPathMd)) {
        srcPath = itemPathMd;
      } else {
        skipped.push(item);
        continue;
      }

      // Determine destination path
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        await fs.copy(srcPath, join(destTypeDir, item), { overwrite: !mergeMode });
      } else {
        // Preserve directory structure for nested items
        const destPath = srcPath.endsWith('.md')
          ? join(destTypeDir, item + '.md')
          : join(destTypeDir, item);
        await fs.ensureDir(join(destTypeDir, item.split('/').slice(0, -1).join('/')));
        await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      }

      copied.push(item);
    } catch (err) {
      errors.push({ item, error: err.message });
    }
  }

  return { copied, skipped, errors };
}

/**
 * Copy all items of a type
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyAllOfType(type, sourceDir, destDir, mergeMode = false) {
  const typeDir = join(sourceDir, type);
  const destTypeDir = join(destDir, type);

  if (!fs.existsSync(typeDir)) {
    return { success: false, error: `${type} directory not found` };
  }

  try {
    await fs.copy(typeDir, destTypeDir, { overwrite: !mergeMode });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy router directory
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyRouter(sourceDir, destDir, mergeMode = false) {
  const routerDir = join(sourceDir, 'router');

  if (!fs.existsSync(routerDir)) {
    return { success: false, error: 'Router directory not found' };
  }

  try {
    await fs.copy(routerDir, join(destDir, 'router'), { overwrite: !mergeMode });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy hooks directory
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyHooks(sourceDir, destDir, mergeMode = false) {
  const hooksDir = join(sourceDir, 'hooks');

  if (!fs.existsSync(hooksDir)) {
    return { success: false, error: 'Hooks directory not found' };
  }

  try {
    await fs.copy(hooksDir, join(destDir, 'hooks'), { overwrite: !mergeMode });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy workflows directory
 */
export async function copyWorkflows(items, sourceDir, destDir) {
  if (items === 'all') {
    return copyAllOfType('workflows', sourceDir, destDir);
  }
  return copyItems(items, 'workflows', sourceDir, destDir);
}

/**
 * Copy base files (README, settings, etc.)
 * @param {boolean} mergeMode - If true, skip existing files
 */
export async function copyBaseFiles(sourceDir, destDir, mergeMode = false) {
  const baseFiles = ['README.md', 'settings.json', '.env.example'];
  const copied = [];

  for (const file of baseFiles) {
    const srcPath = join(sourceDir, file);
    const destPath = join(destDir, file);

    // Skip if merge mode and file exists
    if (mergeMode && fs.existsSync(destPath)) {
      continue;
    }

    if (fs.existsSync(srcPath)) {
      await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      copied.push(file);
    }
  }

  return copied;
}

/**
 * Copy AGENTS.md to project root
 * @param {boolean} mergeMode - If true, skip if file exists
 */
export async function copyAgentsMd(agentsMdPath, projectDir, mergeMode = false) {
  if (!agentsMdPath || !fs.existsSync(agentsMdPath)) {
    return false;
  }

  const destPath = join(projectDir, 'AGENTS.md');

  // Skip if merge mode and file exists
  if (mergeMode && fs.existsSync(destPath)) {
    return false;
  }

  await fs.copy(agentsMdPath, destPath, { overwrite: !mergeMode });
  return true;
}

/**
 * List available items of a type
 */
export function listAvailable(type, sourceDir) {
  const typeDir = join(sourceDir, type);

  if (!fs.existsSync(typeDir)) {
    return [];
  }

  const items = fs.readdirSync(typeDir);
  return items.map(item => {
    const itemPath = join(typeDir, item);
    const isDir = fs.statSync(itemPath).isDirectory();
    const name = item.replace(/\.md$/, '');
    return { name, isDir, path: itemPath };
  });
}

/**
 * Copy only unchanged files (for update)
 */
export async function copyUnchangedOnly(sourceDir, destDir, unchangedFiles) {
  const copied = [];
  const skipped = [];

  for (const file of unchangedFiles) {
    const srcPath = join(sourceDir, file);
    const destPath = join(destDir, file);

    if (fs.existsSync(srcPath)) {
      await fs.ensureDir(join(destDir, file.split('/').slice(0, -1).join('/')));
      await fs.copy(srcPath, destPath, { overwrite: true });
      copied.push(file);
    } else {
      skipped.push(file);
    }
  }

  return { copied, skipped };
}
