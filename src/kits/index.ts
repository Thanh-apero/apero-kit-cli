/**
 * Kit Definitions
 *
 * Kits are predefined sets of agents, skills, and configurations.
 * Note: CK-Internal structure no longer has commands/workflows directories.
 * Commands are now defined within skills (slash commands in SKILL.md).
 */

export interface Kit {
  name: string;
  description: string;
  emoji: string;
  color: string;
  agents: string[] | 'all';
  commands: string[] | 'all';     // Legacy - empty for CK-Internal
  skills: string[] | 'all';
  workflows: string[] | 'all';    // Legacy - empty for CK-Internal
  includeRouter: boolean;
  includeHooks: boolean;
}

export const KITS: Record<string, Kit> = {
  engineer: {
    name: 'engineer',
    description: 'Full-stack development kit for building applications',
    emoji: '🛠️',
    color: 'blue',
    agents: [
      'planner',
      'debugger',
      'fullstack-developer',
      'tester',
      'code-reviewer',
      'git-manager'
    ],
    commands: [],
    skills: [
      'frontend-development',
      'backend-development',
      'databases',
      'debug',
      'code-review',
      'fix',
      'cook'
    ],
    workflows: [],
    includeRouter: false,
    includeHooks: true
  },

  researcher: {
    name: 'researcher',
    description: 'Research and analysis kit for exploring codebases',
    emoji: '🔬',
    color: 'green',
    agents: [
      'researcher',
      'brainstormer',
      'docs-manager',
      'planner'
    ],
    commands: [],
    skills: [
      'ask',
      'brainstorm',
      'docs',
      'find-skills'
    ],
    workflows: [],
    includeRouter: false,
    includeHooks: false
  },

  designer: {
    name: 'designer',
    description: 'UI/UX design and frontend development kit',
    emoji: '🎨',
    color: 'magenta',
    agents: [
      'ui-ux-designer',
      'fullstack-developer',
      'code-reviewer'
    ],
    commands: [],
    skills: [
      'ui-styling',
      'frontend-development',
      'frontend-design'
    ],
    workflows: [],
    includeRouter: false,
    includeHooks: true
  },

  minimal: {
    name: 'minimal',
    description: 'Lightweight kit with essential agents only',
    emoji: '📦',
    color: 'yellow',
    agents: ['planner', 'debugger'],
    commands: [],
    skills: ['fix', 'cook'],
    workflows: [],
    includeRouter: false,
    includeHooks: false
  },

  full: {
    name: 'full',
    description: 'Complete kit with ALL agents and skills',
    emoji: '🚀',
    color: 'cyan',
    agents: 'all',
    commands: [],
    skills: 'all',
    workflows: [],
    includeRouter: false,
    includeHooks: true
  }
};

export const getKit = (name: string): Kit | null => KITS[name] || null;
export const getKitNames = (): string[] => Object.keys(KITS);
export const getKitList = (): Kit[] => Object.values(KITS);
