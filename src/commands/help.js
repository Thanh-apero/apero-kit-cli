import http from 'http';
import { join } from 'path';
import { exec } from 'child_process';
import fs from 'fs-extra';
import chalk from 'chalk';
import { CLI_ROOT, TEMPLATES_DIR, resolveSource } from '../utils/paths.js';

const PORT = 3457;

/**
 * Generate help page HTML
 */
function generateHelpPage(section = 'overview', source) {
  const sections = {
    overview: generateOverview(source),
    agents: generateAgentsSection(source),
    commands: generateCommandsSection(source),
    skills: generateSkillsSection(source),
    hooks: generateHooksSection(source),
    workflows: generateWorkflowsSection(source),
    quickstart: generateQuickstartSection()
  };

  const content = sections[section] || sections.overview;
  const nav = generateNav(section);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apero Kit CLI - Help</title>
  <style>
    :root {
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --accent-hover: #79b8ff;
      --border: #30363d;
      --success: #3fb950;
      --warning: #d29922;
      --error: #f85149;
      --purple: #a371f7;
      --pink: #db61a2;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      padding: 24px 0;
    }

    .logo {
      padding: 0 20px 24px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }

    .logo h1 {
      font-size: 20px;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo p {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .nav-section {
      padding: 0 12px;
      margin-bottom: 24px;
    }

    .nav-section h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      padding: 0 8px;
      margin-bottom: 8px;
    }

    .nav-section a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      color: var(--text-muted);
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.15s;
    }

    .nav-section a:hover {
      background: var(--bg-tertiary);
      color: var(--text);
    }

    .nav-section a.active {
      background: rgba(88, 166, 255, 0.15);
      color: var(--accent);
    }

    .nav-section a .icon {
      font-size: 18px;
      width: 24px;
      text-align: center;
    }

    .nav-section a .badge {
      margin-left: auto;
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Main content */
    .main {
      flex: 1;
      margin-left: 260px;
      padding: 40px 60px;
      max-width: 1000px;
    }

    .main h1 {
      font-size: 32px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .main h1 .emoji {
      font-size: 36px;
    }

    .main .subtitle {
      color: var(--text-muted);
      font-size: 16px;
      margin-bottom: 32px;
    }

    .main h2 {
      font-size: 22px;
      margin: 32px 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .main h3 {
      font-size: 18px;
      margin: 24px 0 12px;
      color: var(--text);
    }

    .main p {
      margin-bottom: 16px;
      color: var(--text-muted);
    }

    /* Cards */
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }

    .card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }

    .card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }

    .card h4 {
      font-size: 16px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card p {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }

    .card .tag {
      display: inline-block;
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      margin-top: 12px;
      color: var(--text-muted);
    }

    /* Code blocks */
    pre {
      background: var(--bg-tertiary);
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
      border: 1px solid var(--border);
    }

    code {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 13px;
    }

    code.inline {
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--accent);
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 14px;
    }

    th, td {
      padding: 12px 16px;
      border: 1px solid var(--border);
      text-align: left;
    }

    th {
      background: var(--bg-secondary);
      font-weight: 600;
    }

    tr:hover td {
      background: var(--bg-secondary);
    }

    /* Lists */
    ul, ol {
      margin: 16px 0;
      padding-left: 24px;
    }

    li {
      margin-bottom: 8px;
      color: var(--text-muted);
    }

    li strong {
      color: var(--text);
    }

    /* Alert boxes */
    .alert {
      padding: 16px 20px;
      border-radius: 8px;
      margin: 16px 0;
      border-left: 4px solid;
    }

    .alert-info {
      background: rgba(88, 166, 255, 0.1);
      border-color: var(--accent);
    }

    .alert-success {
      background: rgba(63, 185, 80, 0.1);
      border-color: var(--success);
    }

    .alert-warning {
      background: rgba(210, 153, 34, 0.1);
      border-color: var(--warning);
    }

    /* Stats */
    .stats {
      display: flex;
      gap: 24px;
      margin: 24px 0;
    }

    .stat {
      text-align: center;
    }

    .stat .number {
      font-size: 36px;
      font-weight: bold;
      color: var(--accent);
    }

    .stat .label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    /* Flow diagram */
    .flow {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0;
      flex-wrap: wrap;
    }

    .flow-item {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
    }

    .flow-arrow {
      color: var(--accent);
      font-size: 20px;
    }

    /* Footer */
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 12px;
      display: flex;
      justify-content: space-between;
    }

    .footer a {
      color: var(--accent);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar { width: 100%; height: auto; position: relative; }
      .main { margin-left: 0; padding: 20px; }
      body { flex-direction: column; }
      .cards { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  ${nav}
  <main class="main">
    ${content}
    <footer class="footer">
      <span>Apero Kit CLI v1.4.0</span>
      <span>Press Ctrl+C to close • <a href="https://github.com/Thanh-apero/apero-kit-cli" target="_blank">GitHub</a></span>
    </footer>
  </main>
</body>
</html>`;
}

function generateNav(activeSection) {
  const sections = [
    { id: 'overview', icon: '🏠', label: 'Overview' },
    { id: 'quickstart', icon: '🚀', label: 'Quick Start' },
    { id: 'agents', icon: '🤖', label: 'Agents', badge: '18' },
    { id: 'commands', icon: '📋', label: 'Commands', badge: '96+' },
    { id: 'skills', icon: '📚', label: 'Skills', badge: '57' },
    { id: 'hooks', icon: '⚡', label: 'Hooks', badge: '15+' },
    { id: 'workflows', icon: '🔄', label: 'Workflows', badge: '4' }
  ];

  return `
  <nav class="sidebar">
    <div class="logo">
      <h1>🎯 Apero Kit</h1>
      <p>AI Agent Scaffolding Tool</p>
    </div>
    <div class="nav-section">
      <h3>Documentation</h3>
      ${sections.map(s => `
        <a href="?section=${s.id}" class="${activeSection === s.id ? 'active' : ''}">
          <span class="icon">${s.icon}</span>
          <span>${s.label}</span>
          ${s.badge ? `<span class="badge">${s.badge}</span>` : ''}
        </a>
      `).join('')}
    </div>
    <div class="nav-section">
      <h3>Resources</h3>
      <a href="https://github.com/Thanh-apero/apero-kit-cli" target="_blank">
        <span class="icon">📦</span>
        <span>GitHub</span>
      </a>
      <a href="https://www.npmjs.com/package/apero-kit-cli" target="_blank">
        <span class="icon">📥</span>
        <span>npm Package</span>
      </a>
    </div>
  </nav>`;
}

function generateOverview(source) {
  return `
    <h1><span class="emoji">🎯</span> Apero Kit CLI</h1>
    <p class="subtitle">Scaffold AI agent projects with pre-configured kits for Claude Code</p>

    <div class="stats">
      <div class="stat">
        <div class="number">18</div>
        <div class="label">Agents</div>
      </div>
      <div class="stat">
        <div class="number">96+</div>
        <div class="label">Commands</div>
      </div>
      <div class="stat">
        <div class="number">57</div>
        <div class="label">Skills</div>
      </div>
      <div class="stat">
        <div class="number">5</div>
        <div class="label">Kits</div>
      </div>
    </div>

    <h2>🧩 What is Apero Kit?</h2>
    <p>Apero Kit CLI giúp bạn nhanh chóng thiết lập một dự án AI agent với các thành phần đã được cấu hình sẵn:</p>

    <div class="cards">
      <div class="card">
        <h4>🤖 Agents</h4>
        <p>Các "chuyên gia AI" với vai trò riêng biệt: debugger, planner, developer, reviewer...</p>
        <span class="tag">18 agents</span>
      </div>
      <div class="card">
        <h4>📋 Commands</h4>
        <p>Các lệnh thực thi như /fix, /code, /plan, /test với nhiều biến thể</p>
        <span class="tag">96+ commands</span>
      </div>
      <div class="card">
        <h4>📚 Skills</h4>
        <p>Kho kiến thức chuyên sâu về frontend, backend, database, devops...</p>
        <span class="tag">57 skills</span>
      </div>
      <div class="card">
        <h4>⚡ Hooks</h4>
        <p>Scripts tự động chạy khi có sự kiện: format code, check security...</p>
        <span class="tag">15+ hooks</span>
      </div>
    </div>

    <h2>🏗️ Folder Structure</h2>
    <pre><code>.claude/
├── agents/      # 🤖 AI expert roles (debugger, planner, developer...)
├── commands/    # 📋 Task workflows (/fix, /code, /plan...)
├── skills/      # 📚 Knowledge bases (frontend, backend, database...)
├── hooks/       # ⚡ Automation scripts
├── router/      # 🧭 Decision engine
├── workflows/   # 🔄 Multi-step processes
└── settings.json</code></pre>

    <h2>🔄 How It Works</h2>
    <div class="flow">
      <div class="flow-item">📝 User Request</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">🧭 Router</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">🤖 Agent</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">📋 Command</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">📚 Skills</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">✅ Result</div>
    </div>

    <div class="alert alert-info">
      <strong>💡 Tip:</strong> Sử dụng menu bên trái để tìm hiểu chi tiết về từng thành phần.
    </div>
  `;
}

function generateQuickstartSection() {
  return `
    <h1><span class="emoji">🚀</span> Quick Start</h1>
    <p class="subtitle">Bắt đầu trong 2 phút</p>

    <h2>📥 Installation</h2>
    <pre><code>npm install -g apero-kit-cli</code></pre>

    <h2>🎯 Create New Project</h2>
    <pre><code># Tạo project mới với kit engineer
ak init my-app --kit engineer

# Hoặc init trong folder hiện tại
cd my-project
ak init</code></pre>

    <h2>📦 Available Kits</h2>
    <table>
      <tr>
        <th>Kit</th>
        <th>Description</th>
        <th>Best For</th>
      </tr>
      <tr>
        <td><strong>🛠️ engineer</strong></td>
        <td>Full-stack development</td>
        <td>Web apps, APIs, full projects</td>
      </tr>
      <tr>
        <td><strong>🔬 researcher</strong></td>
        <td>Research & analysis</td>
        <td>Code exploration, documentation</td>
      </tr>
      <tr>
        <td><strong>🎨 designer</strong></td>
        <td>UI/UX design</td>
        <td>Frontend, design systems</td>
      </tr>
      <tr>
        <td><strong>📦 minimal</strong></td>
        <td>Lightweight essentials</td>
        <td>Small projects, quick tasks</td>
      </tr>
      <tr>
        <td><strong>🚀 full</strong></td>
        <td>Everything included</td>
        <td>Enterprise, complex projects</td>
      </tr>
    </table>

    <h2>💻 Common Commands</h2>
    <pre><code># Check project status
ak status

# Add more components
ak add skill:databases
ak add agent:debugger
ak add command:fix/ui

# Update from source
ak update

# List available items
ak list agents
ak list skills
ak list commands

# Health check
ak doctor</code></pre>

    <h2>🎮 Existing Project</h2>
    <pre><code>cd existing-project
ak init

# CLI will detect .claude/ and ask:
# 🔄 Override - Replace all files
# 📦 Merge - Only add missing files
# ⏭️  Skip - Do nothing</code></pre>

    <div class="alert alert-success">
      <strong>✅ Done!</strong> Bạn đã sẵn sàng sử dụng Claude Code với các agents và commands đã được cấu hình.
    </div>
  `;
}

function generateAgentsSection(source) {
  const agents = [
    { name: 'debugger', emoji: '🔍', desc: 'Investigate issues, analyze logs, trace bugs' },
    { name: 'planner', emoji: '📐', desc: 'Create implementation plans, architecture design' },
    { name: 'fullstack-developer', emoji: '💻', desc: 'Execute code with strict file ownership' },
    { name: 'code-reviewer', emoji: '👀', desc: 'Review code quality and standards' },
    { name: 'tester', emoji: '🧪', desc: 'Write comprehensive tests' },
    { name: 'scout', emoji: '🔎', desc: 'Search codebase with pattern matching' },
    { name: 'scout-external', emoji: '🌐', desc: 'Search external docs and APIs' },
    { name: 'researcher', emoji: '🔬', desc: 'Research technologies and solutions' },
    { name: 'ui-ux-designer', emoji: '🎨', desc: 'Design interfaces and user experiences' },
    { name: 'database-admin', emoji: '🗄️', desc: 'Manage databases and queries' },
    { name: 'git-manager', emoji: '📦', desc: 'Manage version control, commits, PRs' },
    { name: 'docs-manager', emoji: '📝', desc: 'Write and maintain documentation' },
    { name: 'project-manager', emoji: '📊', desc: 'Track progress and timelines' },
    { name: 'brainstormer', emoji: '💡', desc: 'Generate creative ideas' },
    { name: 'copywriter', emoji: '✍️', desc: 'Write marketing and technical copy' },
    { name: 'mcp-manager', emoji: '🔧', desc: 'Manage MCP tools and integrations' },
    { name: 'journal-writer', emoji: '📓', desc: 'Log progress and notes' },
    { name: 'code-simplifier', emoji: '✂️', desc: 'Simplify and refactor code' }
  ];

  return `
    <h1><span class="emoji">🤖</span> Agents</h1>
    <p class="subtitle">18 chuyên gia AI với vai trò riêng biệt</p>

    <div class="alert alert-info">
      <strong>💡 Agent là gì?</strong> Agent là một "persona" mà AI sẽ đóng vai, với chuyên môn và phương pháp làm việc riêng.
    </div>

    <h2>📋 Agent Categories</h2>

    <h3>🔧 Development</h3>
    <div class="cards">
      ${agents.slice(0, 5).map(a => `
        <div class="card">
          <h4>${a.emoji} ${a.name}</h4>
          <p>${a.desc}</p>
        </div>
      `).join('')}
    </div>

    <h3>🔍 Research & Search</h3>
    <div class="cards">
      ${agents.slice(5, 8).map(a => `
        <div class="card">
          <h4>${a.emoji} ${a.name}</h4>
          <p>${a.desc}</p>
        </div>
      `).join('')}
    </div>

    <h3>🎨 Design & Content</h3>
    <div class="cards">
      ${agents.slice(8, 11).map(a => `
        <div class="card">
          <h4>${a.emoji} ${a.name}</h4>
          <p>${a.desc}</p>
        </div>
      `).join('')}
    </div>

    <h3>📊 Management & Support</h3>
    <div class="cards">
      ${agents.slice(11).map(a => `
        <div class="card">
          <h4>${a.emoji} ${a.name}</h4>
          <p>${a.desc}</p>
        </div>
      `).join('')}
    </div>

    <h2>📄 Agent File Format</h2>
    <pre><code>---
name: debugger
description: Investigate issues, analyze logs
model: inherit
---

# Debugger Agent

## Core Competencies
- Root cause analysis
- Log investigation
- Performance profiling

## Investigation Methodology
1. Reproduce the issue
2. Analyze error messages
3. Trace the call stack
4. Identify root cause</code></pre>
  `;
}

function generateCommandsSection(source) {
  const commandGroups = [
    {
      name: 'Fix Commands',
      icon: '🔧',
      commands: [
        { name: '/fix', desc: 'Intelligent routing to specialized fix' },
        { name: '/fix:fast', desc: 'Quick fixes for simple issues' },
        { name: '/fix:hard', desc: 'Complex debugging with research' },
        { name: '/fix:ui', desc: 'UI/layout issues' },
        { name: '/fix:test', desc: 'Failing test fixes' },
        { name: '/fix:types', desc: 'TypeScript errors' },
        { name: '/fix:ci', desc: 'CI/CD pipeline issues' }
      ]
    },
    {
      name: 'Plan Commands',
      icon: '📐',
      commands: [
        { name: '/plan', desc: 'Intelligent plan routing' },
        { name: '/plan:fast', desc: 'Quick planning without research' },
        { name: '/plan:hard', desc: 'Full research + planning' },
        { name: '/plan:parallel', desc: 'Multi-track parallel planning' },
        { name: '/plan:validate', desc: 'Verify existing plans' },
        { name: '/plan:preview', desc: 'Open plan in browser' }
      ]
    },
    {
      name: 'Code Commands',
      icon: '💻',
      commands: [
        { name: '/code', desc: 'Standard implementation with tests' },
        { name: '/code:auto', desc: 'Automated code generation' },
        { name: '/code:no-test', desc: 'Quick prototyping without tests' },
        { name: '/code:parallel', desc: 'Parallel implementation' }
      ]
    },
    {
      name: 'Other Commands',
      icon: '⚡',
      commands: [
        { name: '/test', desc: 'Run tests' },
        { name: '/review', desc: 'Code review' },
        { name: '/scout', desc: 'Search codebase' },
        { name: '/debug', desc: 'Deep investigation' },
        { name: '/brainstorm', desc: 'Generate ideas' },
        { name: '/docs', desc: 'Documentation' }
      ]
    }
  ];

  return `
    <h1><span class="emoji">📋</span> Commands</h1>
    <p class="subtitle">96+ lệnh thực thi với nhiều biến thể</p>

    <div class="alert alert-info">
      <strong>💡 Command là gì?</strong> Command là các "workflow" được định nghĩa sẵn cho từng loại task.
    </div>

    ${commandGroups.map(group => `
      <h2>${group.icon} ${group.name}</h2>
      <table>
        <tr>
          <th>Command</th>
          <th>Description</th>
        </tr>
        ${group.commands.map(c => `
          <tr>
            <td><code>${c.name}</code></td>
            <td>${c.desc}</td>
          </tr>
        `).join('')}
      </table>
    `).join('')}

    <h2>📄 Command File Format</h2>
    <pre><code>---
description: ⚡⚡ Quick fix for simple issues
argument-hint: [issue]
---

## Workflow
1. Analyze the issue
2. Identify root cause
3. Apply fix
4. Verify solution

## When to Use
- Simple bug fixes
- Typo corrections
- Minor logic errors</code></pre>
  `;
}

function generateSkillsSection(source) {
  const skillCategories = [
    {
      name: 'Frontend',
      icon: '🎨',
      skills: ['frontend-development', 'ui-ux-pro-max', 'ui-styling', 'frontend-design-pro', 'mobile-development']
    },
    {
      name: 'Backend',
      icon: '⚙️',
      skills: ['backend-development', 'databases', 'better-auth', 'payment-integration']
    },
    {
      name: 'DevOps',
      icon: '🚀',
      skills: ['devops', 'media-processing', 'mcp-builder', 'mcp-management']
    },
    {
      name: 'Testing & Debug',
      icon: '🧪',
      skills: ['debugging', 'bug-diagnosis', 'test-generation', 'chrome-devtools']
    },
    {
      name: 'Documentation',
      icon: '📝',
      skills: ['documentation', 'planning', 'readme-improvement', 'project-index']
    }
  ];

  return `
    <h1><span class="emoji">📚</span> Skills</h1>
    <p class="subtitle">57 kho kiến thức chuyên sâu</p>

    <div class="alert alert-info">
      <strong>💡 Skill là gì?</strong> Skill là các "knowledge package" được load khi cần cho từng domain cụ thể.
    </div>

    ${skillCategories.map(cat => `
      <h2>${cat.icon} ${cat.name}</h2>
      <div class="cards">
        ${cat.skills.map(s => `
          <div class="card">
            <h4>${s}</h4>
            <p>Specialized knowledge for ${s.replace(/-/g, ' ')}</p>
          </div>
        `).join('')}
      </div>
    `).join('')}

    <h2>📄 Skill File Format</h2>
    <pre><code>---
name: backend-development
description: Build robust backend systems
---

# Backend Development Skill

## Core Concepts
- API design patterns
- Database optimization
- Authentication strategies

## Technology Guides
### Node.js
- Express/NestJS patterns
- Middleware architecture

### Python
- FastAPI/Django patterns
- ORM best practices</code></pre>
  `;
}

function generateHooksSection(source) {
  return `
    <h1><span class="emoji">⚡</span> Hooks</h1>
    <p class="subtitle">15+ automation scripts</p>

    <div class="alert alert-info">
      <strong>💡 Hook là gì?</strong> Hook là scripts tự động chạy khi có sự kiện (edit file, start session, etc.)
    </div>

    <h2>📋 Hook Types</h2>
    <table>
      <tr>
        <th>Hook</th>
        <th>Trigger</th>
        <th>Purpose</th>
      </tr>
      <tr>
        <td><code>session-init</code></td>
        <td>Session start</td>
        <td>Load config, detect project</td>
      </tr>
      <tr>
        <td><code>session-end</code></td>
        <td>Session end</td>
        <td>Log session, cleanup</td>
      </tr>
      <tr>
        <td><code>post-edit-prettier</code></td>
        <td>After edit</td>
        <td>Auto-format code</td>
      </tr>
      <tr>
        <td><code>privacy-block</code></td>
        <td>File access</td>
        <td>Block sensitive files</td>
      </tr>
      <tr>
        <td><code>scout-block</code></td>
        <td>Directory access</td>
        <td>Block forbidden paths</td>
      </tr>
      <tr>
        <td><code>dev-rules-reminder</code></td>
        <td>Code review</td>
        <td>Enforce coding standards</td>
      </tr>
    </table>

    <h2>🔔 Notification Hooks</h2>
    <p>Gửi thông báo qua các kênh:</p>
    <ul>
      <li><strong>Slack</strong> - Workspace notifications</li>
      <li><strong>Discord</strong> - Channel webhooks</li>
      <li><strong>Telegram</strong> - Bot messages</li>
    </ul>

    <h2>🛡️ Security Hooks</h2>
    <ul>
      <li><strong>privacy-block</strong> - Chặn truy cập .env, credentials</li>
      <li><strong>scout-block</strong> - Chặn traversal ngoài project</li>
    </ul>
  `;
}

function generateWorkflowsSection(source) {
  return `
    <h1><span class="emoji">🔄</span> Workflows</h1>
    <p class="subtitle">Multi-step collaboration processes</p>

    <div class="alert alert-info">
      <strong>💡 Workflow là gì?</strong> Workflow là quy trình nhiều bước với sự phối hợp giữa các agents.
    </div>

    <h2>📋 Primary Workflow</h2>
    <p>Quy trình phát triển feature đầy đủ:</p>

    <div class="flow">
      <div class="flow-item">📐 Planning</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">💻 Implementation</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">🧪 Testing</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">👀 Review</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">📝 Documentation</div>
    </div>

    <h3>Phase 1: Planning</h3>
    <ul>
      <li>Agent: <code>planner</code></li>
      <li>Analyze requirements</li>
      <li>Create implementation plan</li>
      <li>Define success criteria</li>
    </ul>

    <h3>Phase 2: Implementation</h3>
    <ul>
      <li>Agent: <code>fullstack-developer</code></li>
      <li>Write code following plan</li>
      <li>Self-review</li>
      <li>Write unit tests</li>
    </ul>

    <h3>Phase 3: Testing</h3>
    <ul>
      <li>Agent: <code>tester</code></li>
      <li>Run full test suite</li>
      <li>Test edge cases</li>
      <li>Report status</li>
    </ul>

    <h3>Phase 4: Review</h3>
    <ul>
      <li>Agent: <code>code-reviewer</code></li>
      <li>Check code quality</li>
      <li>Security review</li>
      <li>Performance analysis</li>
    </ul>

    <h3>Phase 5: Documentation</h3>
    <ul>
      <li>Agent: <code>docs-manager</code></li>
      <li>Update documentation</li>
      <li>Changelog entry</li>
      <li>Release notes</li>
    </ul>

    <h2>🎯 Key Principles</h2>
    <ul>
      <li><strong>Clarify First</strong> - Hỏi rõ yêu cầu trước khi làm</li>
      <li><strong>Minimum Viable</strong> - Chỉ làm những gì cần thiết</li>
      <li><strong>Reuse Before Write</strong> - Tái sử dụng code có sẵn</li>
      <li><strong>File < 300 LOC</strong> - Giữ file nhỏ</li>
      <li><strong>Config from Env</strong> - Không hardcode secrets</li>
    </ul>
  `;
}

/**
 * Help command - open browser with interactive documentation
 */
export async function helpCommand(options) {
  const source = resolveSource(options.source);

  console.log(chalk.cyan('\n📚 Starting help server...\n'));

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const section = url.searchParams.get('section') || 'overview';

    const html = generateHelpPage(section, source);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(chalk.green(`   Help server running at: ${url}`));
    console.log(chalk.gray('   Press Ctrl+C to stop\n'));

    // Open browser
    const openCommand = process.platform === 'darwin' ? 'open' :
                        process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${openCommand} ${url}`);
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Help server stopped'));
    process.exit(0);
  });
}
