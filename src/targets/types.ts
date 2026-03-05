/**
 * Supported component types across all targets
 */
export type ComponentType = 'agents' | 'skills' | 'commands' | 'workflows' | 'router' | 'hooks' | 'memory' | 'scripts' | 'output-styles';

/**
 * Feature support for a target
 */
export interface TargetFeatures {
  agents: boolean;
  skills: boolean;
  commands: boolean;
  workflows: boolean;
  router: boolean;
  hooks: boolean;
  memory: boolean;
  scripts: boolean;
  'output-styles': boolean;
}

/**
 * Copy result from adapter operations
 */
export interface CopyResult {
  copied: string[];
  skipped: string[];
  errors: Array<{ item: string; error: string }>;
}

/**
 * Items to install from kit
 */
export interface InstallItems {
  agents: string[] | 'all';
  skills: string[] | 'all';
  commands: string[] | 'all';
  workflows: string[] | 'all';
  includeRouter: boolean;
  includeHooks: boolean;
}

/**
 * Target adapter configuration
 */
export interface TargetConfig {
  name: string;
  displayName: string;
  directory: string;
  features: TargetFeatures;
}

/**
 * Target adapter interface - each target implements this
 */
export interface ITargetAdapter {
  readonly config: TargetConfig;

  /**
   * Check if target supports a feature
   */
  supports(feature: keyof TargetFeatures): boolean;

  /**
   * Get supported features list
   */
  getSupportedFeatures(): (keyof TargetFeatures)[];

  /**
   * Copy agents from source to target directory
   */
  copyAgents(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult>;

  /**
   * Copy skills from source to target directory
   */
  copySkills(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult>;

  /**
   * Copy commands from source to target directory
   */
  copyCommands(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult>;

  /**
   * Copy workflows (if supported)
   */
  copyWorkflows(
    items: string[] | 'all',
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<CopyResult>;

  /**
   * Copy router (if supported)
   */
  copyRouter(
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Copy hooks (if supported)
   */
  copyHooks(
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Copy extra directories (memory, scripts, output-styles)
   */
  copyExtras(
    sourceDir: string,
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]>;

  /**
   * Copy base files (README, settings, etc.)
   */
  copyBaseFiles(
    targetDir: string,
    mergeMode: boolean
  ): Promise<string[]>;

  /**
   * Filter install items based on target capabilities
   */
  filterInstallItems(items: InstallItems): InstallItems;
}
