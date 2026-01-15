import { createHash } from 'crypto';
import fs from 'fs-extra';
import { join, relative } from 'path';

/**
 * Calculate MD5 hash of a file
 */
export function hashFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath);
  return createHash('md5').update(content).digest('hex');
}

/**
 * Calculate hashes for all files in a directory
 */
export async function hashDirectory(dirPath, baseDir = dirPath) {
  const hashes = {};

  if (!fs.existsSync(dirPath)) {
    return hashes;
  }

  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = join(dirPath, item.name);
    const relativePath = relative(baseDir, itemPath);

    if (item.isDirectory()) {
      const subHashes = await hashDirectory(itemPath, baseDir);
      Object.assign(hashes, subHashes);
    } else if (item.isFile()) {
      hashes[relativePath] = hashFile(itemPath);
    }
  }

  return hashes;
}

/**
 * Compare two hash maps and return differences
 */
export function compareHashes(original, current) {
  const result = {
    unchanged: [],
    modified: [],
    added: [],
    deleted: []
  };

  // Check original files
  for (const [path, hash] of Object.entries(original)) {
    if (current[path] === undefined) {
      result.deleted.push(path);
    } else if (current[path] !== hash) {
      result.modified.push(path);
    } else {
      result.unchanged.push(path);
    }
  }

  // Check for new files
  for (const path of Object.keys(current)) {
    if (original[path] === undefined) {
      result.added.push(path);
    }
  }

  return result;
}
