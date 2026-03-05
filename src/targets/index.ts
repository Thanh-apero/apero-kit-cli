/**
 * Target Registry - Central registry for all supported CLI targets
 */

import type { ITargetAdapter, TargetFeatures } from './types.js';
import { ClaudeAdapter } from './claude-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';
import { DiscordAdapter } from './discord-adapter.js';

export type { ITargetAdapter, TargetConfig, TargetFeatures, CopyResult, InstallItems } from './types.js';
export { ClaudeAdapter } from './claude-adapter.js';
export { GeminiAdapter } from './gemini-adapter.js';
export { DiscordAdapter } from './discord-adapter.js';

/**
 * Supported target names
 */
export type TargetName = 'claude' | 'gemini' | 'discord';

/**
 * Target registry - singleton instances
 */
const adapters: Record<TargetName, ITargetAdapter> = {
  claude: new ClaudeAdapter(),
  gemini: new GeminiAdapter(),
  discord: new DiscordAdapter()
};

/**
 * Get adapter for a target
 */
export function getAdapter(target: TargetName): ITargetAdapter {
  const adapter = adapters[target];
  if (!adapter) {
    throw new Error(`Unknown target: ${target}. Available: ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): Record<TargetName, ITargetAdapter> {
  return { ...adapters };
}

/**
 * Get list of supported target names
 */
export function getSupportedTargets(): TargetName[] {
  return Object.keys(adapters) as TargetName[];
}

/**
 * Check if a target is supported
 */
export function isValidTarget(target: string): target is TargetName {
  return target in adapters;
}

/**
 * Get target directory name
 */
export function getTargetDirectory(target: TargetName): string {
  return adapters[target].config.directory;
}

/**
 * Get target display name
 */
export function getTargetDisplayName(target: TargetName): string {
  return adapters[target].config.displayName;
}

/**
 * Get feature support matrix for all targets
 */
export function getFeatureMatrix(): Record<TargetName, TargetFeatures> {
  const matrix: Record<string, TargetFeatures> = {};
  for (const [name, adapter] of Object.entries(adapters)) {
    matrix[name] = adapter.config.features;
  }
  return matrix as Record<TargetName, TargetFeatures>;
}

/**
 * Check if a feature is supported by a target
 */
export function targetSupports(target: TargetName, feature: keyof TargetFeatures): boolean {
  return adapters[target].supports(feature);
}

/**
 * Get targets that support a specific feature
 */
export function getTargetsWithFeature(feature: keyof TargetFeatures): TargetName[] {
  return Object.entries(adapters)
    .filter(([_, adapter]) => adapter.supports(feature))
    .map(([name]) => name as TargetName);
}
