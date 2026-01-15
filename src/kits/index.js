// Kit definitions - what each kit includes

export const KITS = {
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
      'git-manager',
      'database-admin'
    ],
    commands: [
      'plan', 'plan/parallel', 'plan/fast', 'plan/hard',
      'code', 'code/auto', 'code/parallel',
      'fix', 'fix/test', 'fix/types', 'fix/fast', 'fix/ci',
      'test', 'test/ui',
      'review', 'review/codebase',
      'scout', 'build', 'lint'
    ],
    skills: [
      'frontend-development',
      'backend-development',
      'databases',
      'debugging',
      'code-review',
      'planning',
      'problem-solving'
    ],
    workflows: ['feature-development', 'bug-fixing'],
    includeRouter: true,
    includeHooks: true
  },

  researcher: {
    name: 'researcher',
    description: 'Research and analysis kit for exploring codebases',
    emoji: '🔬',
    color: 'green',
    agents: [
      'researcher',
      'scout',
      'scout-external',
      'brainstormer',
      'docs-manager',
      'planner'
    ],
    commands: [
      'scout', 'scout/ext',
      'investigate', 'brainstorm',
      'docs', 'docs/init', 'docs/update', 'docs/summarize',
      'plan', 'ask', 'context'
    ],
    skills: [
      'research',
      'planning-with-files',
      'documentation',
      'project-index'
    ],
    workflows: [],
    includeRouter: true,
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
    commands: [
      'code', 'fix', 'fix/ui', 'test/ui', 'review'
    ],
    skills: [
      'ui-ux-pro-max',
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
    commands: ['plan', 'fix', 'code'],
    skills: ['planning', 'debugging'],
    workflows: [],
    includeRouter: false,
    includeHooks: false
  },

  full: {
    name: 'full',
    description: 'Complete kit with ALL agents, commands, and skills',
    emoji: '🚀',
    color: 'cyan',
    agents: 'all',
    commands: 'all',
    skills: 'all',
    workflows: 'all',
    includeRouter: true,
    includeHooks: true
  }
};

export const getKit = (name) => KITS[name] || null;
export const getKitNames = () => Object.keys(KITS);
export const getKitList = () => Object.values(KITS);
