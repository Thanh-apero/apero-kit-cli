import fs from 'fs-extra';
import { join, dirname } from 'path';
import type {
  ITargetAdapter,
  TargetConfig,
  TargetFeatures,
  CopyResult,
  InstallItems
} from './types.js';

/**
 * Abstract base adapter with common functionality
 */
export abstract class BaseTargetAdapter implements ITargetAdapter {
  abstract readonly config: TargetConfig;

  supports(feature: keyof TargetFeatures): boolean {
    return this.config.features[feature];
  }

  getSupportedFeatures(): (keyof TargetFeatures)[] {
    return Object.entries(this.config.features)
      .filter(([_, supported]) => supported)
      .map(([feature]) => feature as keyof TargetFeatures);
  }

  filterInstallItems(items: InstallItems): InstallItems {
    return {
      agents: this.supports('agents') ? items.agents : [],
      skills: this.supports('skills') ? items.skills : [],
      commands: this.supports('commands') ? items.commands : [],
      workflows: this.supports('workflows') ? items.workflows : [],
      includeRouter: this.supports('router') && items.includeRouter,
      includeHooks: this.supports('hooks') && items.includeHooks
    };
  }

  /**
   * Default: not supported - override in subclass if needed
   */
  async copyWorkflows(
    _items: string[] | 'all',
    _sourceDir: string,
    _targetDir: string,
    _mergeMode: boolean
  ): Promise<CopyResult> {
    return { copied: [], skipped: [], errors: [] };
  }

  async copyRouter(
    _sourceDir: string,
    _targetDir: string,
    _mergeMode: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Router not supported by this target' };
  }

  async copyHooks(
    _sourceDir: string,
    _targetDir: string,
    _mergeMode: boolean
  ): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Hooks not supported by this target' };
  }

  async copyExtras(
    _sourceDir: string,
    _targetDir: string,
    _mergeMode: boolean
  ): Promise<string[]> {
    return [];
  }

  // Abstract methods - must be implemented by each adapter
  abstract copyAgents(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult>;

  abstract copySkills(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult>;

  abstract copyCommands(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult>;

  abstract copyBaseFiles(
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]>;

  // Helper methods for common operations
  protected async copyDirectory(
    dirName: string,
    sourceDir: string,
    destDir: string,
    mergeMode: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const srcPath = join(sourceDir, dirName);

    if (!fs.existsSync(srcPath)) {
      return { success: false, error: `${dirName} directory not found` };
    }

    try {
      await fs.copy(srcPath, join(destDir, dirName), { overwrite: !mergeMode });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  protected async copyFile(
    srcPath: string,
    destPath: string,
    mergeMode: boolean
  ): Promise<boolean> {
    if (mergeMode && fs.existsSync(destPath)) {
      return false;
    }

    if (fs.existsSync(srcPath)) {
      await fs.ensureDir(dirname(destPath));
      await fs.copy(srcPath, destPath, { overwrite: !mergeMode });
      return true;
    }

    return false;
  }

  protected async listItems(typeDir: string, extension?: string): Promise<string[]> {
    if (!fs.existsSync(typeDir)) {
      return [];
    }

    const entries = fs.readdirSync(typeDir);
    return entries
      .filter(e => {
        if (extension) {
          return e.endsWith(extension) && e !== 'README.md';
        }
        return e !== 'README.md';
      })
      .map(e => extension ? e.replace(extension, '') : e);
  }

  protected getItemList(items: string[] | 'all', typeDir: string, extension?: string): string[] {
    if (items === 'all') {
      return this.listItemsSync(typeDir, extension);
    }
    return items;
  }

  private listItemsSync(typeDir: string, extension?: string): string[] {
    if (!fs.existsSync(typeDir)) {
      return [];
    }

    const entries = fs.readdirSync(typeDir);
    let result = entries.filter(e => e !== 'README.md');

    if (extension) {
      result = result.filter(e => e.endsWith(extension)).map(e => e.replace(extension, ''));
    }

    // Remove duplicates (file.md and file/ both become 'file')
    return [...new Set(result.map(e => e.replace(/\.md$/, '')))];
  }
}
