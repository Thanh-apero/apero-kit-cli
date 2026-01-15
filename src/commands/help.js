import http from 'http';
import { join } from 'path';
import { exec } from 'child_process';
import fs from 'fs-extra';
import chalk from 'chalk';
import { CLI_ROOT, TEMPLATES_DIR, resolveSource } from '../utils/paths.js';

const PORT = 3457;

// Bilingual content
const i18n = {
  en: {
    title: 'Apero Kit CLI',
    subtitle: 'Scaffold AI agent projects with pre-configured kits for Claude Code',
    overview: 'Overview',
    quickstart: 'Quick Start',
    agents: 'Agents',
    commands: 'Commands',
    skills: 'Skills',
    hooks: 'Hooks',
    workflows: 'Workflows',
    resources: 'Resources',
    github: 'GitHub',
    npm: 'npm Package',

    // Overview
    whatIs: 'What is Apero Kit?',
    whatIsDesc: 'Apero Kit CLI helps you quickly set up an AI agent project with pre-configured components:',
    agentsDesc: 'AI "experts" with distinct roles: debugger, planner, developer, reviewer...',
    commandsDesc: 'Execution commands like /fix, /code, /plan, /test with multiple variants',
    skillsDesc: 'Deep knowledge bases for frontend, backend, database, devops...',
    hooksDesc: 'Automation scripts that run on events: format code, check security...',
    folderStructure: 'Folder Structure',
    howItWorks: 'How It Works',
    tip: 'Tip',
    tipText: 'Use the left menu to learn more about each component.',

    // Quick Start
    installation: 'Installation',
    createProject: 'Create New Project',
    availableKits: 'Available Kits',
    commonCommands: 'Common Commands',
    existingProject: 'Existing Project',
    done: 'Done',
    doneText: 'You are ready to use Claude Code with pre-configured agents and commands.',

    // Agents
    agentsTitle: '18 AI experts with distinct roles',
    agentWhat: 'What is an Agent?',
    agentWhatDesc: 'An Agent is a "persona" that the AI will embody, with specialized expertise and working methods.',
    development: 'Development',
    researchSearch: 'Research & Search',
    designContent: 'Design & Content',
    managementSupport: 'Management & Support',
    fileFormat: 'Agent File Format',
    usage: 'Usage',

    // Commands
    commandsTitle: '96+ execution commands with multiple variants',
    commandWhat: 'What is a Command?',
    commandWhatDesc: 'A Command is a pre-defined "workflow" for each type of task.',
    fixCommands: 'Fix Commands',
    planCommands: 'Plan Commands',
    codeCommands: 'Code Commands',
    otherCommands: 'Other Commands',

    // Skills
    skillsTitle: '57 deep knowledge bases',
    skillWhat: 'What is a Skill?',
    skillWhatDesc: 'A Skill is a "knowledge package" loaded on-demand for specific domains.',
    frontend: 'Frontend',
    backend: 'Backend',
    devops: 'DevOps',
    testingDebug: 'Testing & Debug',
    documentation: 'Documentation',

    // Hooks
    hooksTitle: '15+ automation scripts',
    hookWhat: 'What is a Hook?',
    hookWhatDesc: 'A Hook is a script that runs automatically when an event occurs (edit file, start session, etc.)',
    hookTypes: 'Hook Types',
    notificationHooks: 'Notification Hooks',
    securityHooks: 'Security Hooks',

    // Workflows
    workflowsTitle: 'Multi-step collaboration processes',
    workflowWhat: 'What is a Workflow?',
    workflowWhatDesc: 'A Workflow is a multi-step process with coordination between agents.',
    primaryWorkflow: 'Primary Workflow',
    keyPrinciples: 'Key Principles',

    // Usage examples
    example: 'Example',
    output: 'Output',
    when: 'When to use',
    result: 'Result'
  },
  vi: {
    title: 'Apero Kit CLI',
    subtitle: 'Công cụ tạo dự án AI agent với các kit đã cấu hình sẵn cho Claude Code',
    overview: 'Tổng quan',
    quickstart: 'Bắt đầu nhanh',
    agents: 'Agents',
    commands: 'Commands',
    skills: 'Skills',
    hooks: 'Hooks',
    workflows: 'Workflows',
    resources: 'Tài nguyên',
    github: 'GitHub',
    npm: 'npm Package',

    // Overview
    whatIs: 'Apero Kit là gì?',
    whatIsDesc: 'Apero Kit CLI giúp bạn nhanh chóng thiết lập một dự án AI agent với các thành phần đã được cấu hình sẵn:',
    agentsDesc: 'Các "chuyên gia AI" với vai trò riêng biệt: debugger, planner, developer, reviewer...',
    commandsDesc: 'Các lệnh thực thi như /fix, /code, /plan, /test với nhiều biến thể',
    skillsDesc: 'Kho kiến thức chuyên sâu về frontend, backend, database, devops...',
    hooksDesc: 'Scripts tự động chạy khi có sự kiện: format code, check security...',
    folderStructure: 'Cấu trúc thư mục',
    howItWorks: 'Cách hoạt động',
    tip: 'Mẹo',
    tipText: 'Sử dụng menu bên trái để tìm hiểu chi tiết về từng thành phần.',

    // Quick Start
    installation: 'Cài đặt',
    createProject: 'Tạo project mới',
    availableKits: 'Các kit có sẵn',
    commonCommands: 'Các lệnh thường dùng',
    existingProject: 'Project có sẵn',
    done: 'Xong',
    doneText: 'Bạn đã sẵn sàng sử dụng Claude Code với các agents và commands đã được cấu hình.',

    // Agents
    agentsTitle: '18 chuyên gia AI với vai trò riêng biệt',
    agentWhat: 'Agent là gì?',
    agentWhatDesc: 'Agent là một "persona" mà AI sẽ đóng vai, với chuyên môn và phương pháp làm việc riêng.',
    development: 'Phát triển',
    researchSearch: 'Nghiên cứu & Tìm kiếm',
    designContent: 'Thiết kế & Nội dung',
    managementSupport: 'Quản lý & Hỗ trợ',
    fileFormat: 'Định dạng file Agent',
    usage: 'Cách dùng',

    // Commands
    commandsTitle: '96+ lệnh thực thi với nhiều biến thể',
    commandWhat: 'Command là gì?',
    commandWhatDesc: 'Command là các "workflow" được định nghĩa sẵn cho từng loại task.',
    fixCommands: 'Lệnh Fix',
    planCommands: 'Lệnh Plan',
    codeCommands: 'Lệnh Code',
    otherCommands: 'Lệnh khác',

    // Skills
    skillsTitle: '57 kho kiến thức chuyên sâu',
    skillWhat: 'Skill là gì?',
    skillWhatDesc: 'Skill là các "knowledge package" được load khi cần cho từng domain cụ thể.',
    frontend: 'Frontend',
    backend: 'Backend',
    devops: 'DevOps',
    testingDebug: 'Testing & Debug',
    documentation: 'Tài liệu',

    // Hooks
    hooksTitle: '15+ automation scripts',
    hookWhat: 'Hook là gì?',
    hookWhatDesc: 'Hook là scripts tự động chạy khi có sự kiện (edit file, start session, etc.)',
    hookTypes: 'Các loại Hook',
    notificationHooks: 'Hook thông báo',
    securityHooks: 'Hook bảo mật',

    // Workflows
    workflowsTitle: 'Quy trình nhiều bước với sự phối hợp',
    workflowWhat: 'Workflow là gì?',
    workflowWhatDesc: 'Workflow là quy trình nhiều bước với sự phối hợp giữa các agents.',
    primaryWorkflow: 'Quy trình chính',
    keyPrinciples: 'Nguyên tắc chính',

    // Usage examples
    example: 'Ví dụ',
    output: 'Kết quả',
    when: 'Khi nào dùng',
    result: 'Kết quả'
  }
};

/**
 * Generate help page HTML
 */
function generateHelpPage(section = 'overview', lang = 'vi', source) {
  const t = i18n[lang] || i18n.vi;

  const sections = {
    overview: generateOverview(t, lang),
    quickstart: generateQuickstartSection(t, lang),
    agents: generateAgentsSection(t, lang),
    commands: generateCommandsSection(t, lang),
    skills: generateSkillsSection(t, lang),
    hooks: generateHooksSection(t, lang),
    workflows: generateWorkflowsSection(t, lang)
  };

  const content = sections[section] || sections.overview;
  const nav = generateNav(section, t, lang);

  return `<!DOCTYPE html>
<html lang="${lang}">
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
      --gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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

    /* Language Toggle */
    .lang-toggle {
      display: flex;
      align-items: center;
      background: var(--bg-tertiary);
      border-radius: 20px;
      padding: 4px;
      margin: 16px 20px;
      border: 1px solid var(--border);
    }

    .lang-toggle a {
      padding: 6px 16px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
      color: var(--text-muted);
    }

    .lang-toggle a:hover {
      color: var(--text);
    }

    .lang-toggle a.active {
      background: var(--gradient-1);
      color: white;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }

    /* Sidebar */
    .sidebar {
      width: 280px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      padding: 24px 0;
    }

    .logo {
      padding: 0 20px 20px;
      border-bottom: 1px solid var(--border);
    }

    .logo h1 {
      font-size: 22px;
      color: var(--accent);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo p {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 6px;
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
      padding: 12px 8px 8px;
      margin-bottom: 4px;
    }

    .nav-section a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      color: var(--text-muted);
      text-decoration: none;
      border-radius: 8px;
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
      font-weight: 500;
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
      margin-left: 280px;
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
      margin: 36px 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .main h3 {
      font-size: 17px;
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
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin: 20px 0;
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
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .card h4 {
      font-size: 15px;
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
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 11px;
      margin-top: 12px;
      color: var(--accent);
    }

    /* Code blocks */
    pre {
      background: var(--bg-tertiary);
      padding: 16px 20px;
      border-radius: 10px;
      overflow-x: auto;
      margin: 16px 0;
      border: 1px solid var(--border);
    }

    code {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Fira Code', monospace;
      font-size: 13px;
    }

    code.inline {
      background: var(--bg-tertiary);
      padding: 2px 8px;
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
      border-radius: 10px;
      margin: 20px 0;
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

    .alert strong {
      color: var(--text);
    }

    /* Stats */
    .stats {
      display: flex;
      gap: 32px;
      margin: 28px 0;
      flex-wrap: wrap;
    }

    .stat {
      text-align: center;
      background: var(--bg-secondary);
      padding: 20px 28px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .stat .number {
      font-size: 36px;
      font-weight: bold;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat .label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-top: 4px;
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
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
    }

    .flow-arrow {
      color: var(--accent);
      font-size: 20px;
    }

    /* Example box */
    .example-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin: 20px 0;
      overflow: hidden;
    }

    .example-box .example-header {
      background: var(--bg-tertiary);
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }

    .example-box .example-content {
      padding: 16px;
    }

    .example-box pre {
      margin: 0;
      background: transparent;
      border: none;
      padding: 0;
    }

    .example-box .example-output {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px dashed var(--border);
    }

    .example-box .example-output-label {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
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
      .stats { justify-content: center; }
    }
  </style>
</head>
<body>
  ${nav}
  <main class="main">
    ${content}
    <footer class="footer">
      <span>Apero Kit CLI v1.4.1</span>
      <span>Press Ctrl+C to close • <a href="https://github.com/Thanh-apero/apero-kit-cli" target="_blank">GitHub</a></span>
    </footer>
  </main>
</body>
</html>`;
}

function generateNav(activeSection, t, lang) {
  const otherLang = lang === 'vi' ? 'en' : 'vi';

  const sections = [
    { id: 'overview', icon: '🏠', label: t.overview },
    { id: 'quickstart', icon: '🚀', label: t.quickstart },
    { id: 'agents', icon: '🤖', label: t.agents, badge: '18' },
    { id: 'commands', icon: '📋', label: t.commands, badge: '96+' },
    { id: 'skills', icon: '📚', label: t.skills, badge: '57' },
    { id: 'hooks', icon: '⚡', label: t.hooks, badge: '15+' },
    { id: 'workflows', icon: '🔄', label: t.workflows, badge: '4' }
  ];

  return `
  <nav class="sidebar">
    <div class="logo">
      <h1>🎯 Apero Kit</h1>
      <p>AI Agent Scaffolding Tool</p>
    </div>

    <div class="lang-toggle">
      <a href="?section=${activeSection}&lang=vi" class="${lang === 'vi' ? 'active' : ''}">VI</a>
      <a href="?section=${activeSection}&lang=en" class="${lang === 'en' ? 'active' : ''}">EN</a>
    </div>

    <div class="nav-section">
      <h3>Documentation</h3>
      ${sections.map(s => `
        <a href="?section=${s.id}&lang=${lang}" class="${activeSection === s.id ? 'active' : ''}">
          <span class="icon">${s.icon}</span>
          <span>${s.label}</span>
          ${s.badge ? `<span class="badge">${s.badge}</span>` : ''}
        </a>
      `).join('')}
    </div>
    <div class="nav-section">
      <h3>${t.resources}</h3>
      <a href="https://github.com/Thanh-apero/apero-kit-cli" target="_blank">
        <span class="icon">📦</span>
        <span>${t.github}</span>
      </a>
      <a href="https://www.npmjs.com/package/apero-kit-cli" target="_blank">
        <span class="icon">📥</span>
        <span>${t.npm}</span>
      </a>
    </div>
  </nav>`;
}

function generateOverview(t, lang) {
  const isVi = lang === 'vi';
  return `
    <h1><span class="emoji">🎯</span> ${t.title}</h1>
    <p class="subtitle">${t.subtitle}</p>

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

    <h2>🧩 ${t.whatIs}</h2>
    <p>${t.whatIsDesc}</p>

    <div class="cards">
      <div class="card">
        <h4>🤖 Agents</h4>
        <p>${t.agentsDesc}</p>
        <span class="tag">18 agents</span>
      </div>
      <div class="card">
        <h4>📋 Commands</h4>
        <p>${t.commandsDesc}</p>
        <span class="tag">96+ commands</span>
      </div>
      <div class="card">
        <h4>📚 Skills</h4>
        <p>${t.skillsDesc}</p>
        <span class="tag">57 skills</span>
      </div>
      <div class="card">
        <h4>⚡ Hooks</h4>
        <p>${t.hooksDesc}</p>
        <span class="tag">15+ hooks</span>
      </div>
    </div>

    <h2>🏗️ ${t.folderStructure}</h2>
    <pre><code>.claude/
├── agents/      # 🤖 ${isVi ? 'Các chuyên gia AI' : 'AI expert roles'} (debugger, planner, developer...)
├── commands/    # 📋 ${isVi ? 'Các lệnh workflow' : 'Task workflows'} (/fix, /code, /plan...)
├── skills/      # 📚 ${isVi ? 'Kho kiến thức' : 'Knowledge bases'} (frontend, backend, database...)
├── hooks/       # ⚡ ${isVi ? 'Scripts tự động' : 'Automation scripts'}
├── router/      # 🧭 ${isVi ? 'Bộ điều hướng' : 'Decision engine'}
├── workflows/   # 🔄 ${isVi ? 'Quy trình nhiều bước' : 'Multi-step processes'}
└── settings.json</code></pre>

    <h2>🔄 ${t.howItWorks}</h2>
    <div class="flow">
      <div class="flow-item">📝 ${isVi ? 'Yêu cầu' : 'Request'}</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">🧭 Router</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">🤖 Agent</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">📋 Command</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">📚 Skills</div>
      <span class="flow-arrow">→</span>
      <div class="flow-item">✅ ${isVi ? 'Kết quả' : 'Result'}</div>
    </div>

    <div class="alert alert-info">
      <strong>💡 ${t.tip}:</strong> ${t.tipText}
    </div>
  `;
}

function generateQuickstartSection(t, lang) {
  const isVi = lang === 'vi';
  return `
    <h1><span class="emoji">🚀</span> ${t.quickstart}</h1>
    <p class="subtitle">${isVi ? 'Bắt đầu trong 2 phút' : 'Get started in 2 minutes'}</p>

    <h2>📥 ${t.installation}</h2>
    <div class="example-box">
      <div class="example-header">${isVi ? 'Cài đặt global' : 'Install globally'}</div>
      <div class="example-content">
        <pre><code>npm install -g apero-kit-cli</code></pre>
      </div>
    </div>

    <h2>🎯 ${t.createProject}</h2>

    <div class="example-box">
      <div class="example-header">${t.example} 1: ${isVi ? 'Tạo project mới' : 'Create new project'}</div>
      <div class="example-content">
        <pre><code># ${isVi ? 'Tạo project với kit engineer (đầy đủ nhất)' : 'Create project with engineer kit (most complete)'}
ak init my-app --kit engineer

# ${isVi ? 'Hoặc chế độ interactive' : 'Or interactive mode'}
ak init my-app</code></pre>
        <div class="example-output">
          <div class="example-output-label">${t.output}:</div>
          <pre><code>✔ Project created successfully!

Next steps:
  cd my-app
  # Start coding with Claude Code</code></pre>
        </div>
      </div>
    </div>

    <div class="example-box">
      <div class="example-header">${t.example} 2: ${isVi ? 'Init trong folder hiện tại' : 'Init in current folder'}</div>
      <div class="example-content">
        <pre><code>cd my-existing-project
ak init</code></pre>
        <div class="example-output">
          <div class="example-output-label">${isVi ? 'Nếu .claude/ đã tồn tại' : 'If .claude/ already exists'}:</div>
          <pre><code>? .claude/ already exists. What do you want to do?
  🔄 Override - ${isVi ? 'Thay thế toàn bộ' : 'Replace all files'}
  📦 Merge - ${isVi ? 'Chỉ thêm file thiếu' : 'Only add missing files'}
  ⏭️  Skip - ${isVi ? 'Không làm gì' : 'Do nothing'}</code></pre>
        </div>
      </div>
    </div>

    <h2>📦 ${t.availableKits}</h2>
    <table>
      <tr>
        <th>Kit</th>
        <th>Description</th>
        <th>${isVi ? 'Phù hợp với' : 'Best for'}</th>
      </tr>
      <tr>
        <td><strong>🛠️ engineer</strong></td>
        <td>Full-stack development</td>
        <td>${isVi ? 'Web apps, APIs, full projects' : 'Web apps, APIs, full projects'}</td>
      </tr>
      <tr>
        <td><strong>🔬 researcher</strong></td>
        <td>${isVi ? 'Nghiên cứu & phân tích' : 'Research & analysis'}</td>
        <td>${isVi ? 'Khám phá code, tài liệu' : 'Code exploration, documentation'}</td>
      </tr>
      <tr>
        <td><strong>🎨 designer</strong></td>
        <td>UI/UX design</td>
        <td>Frontend, design systems</td>
      </tr>
      <tr>
        <td><strong>📦 minimal</strong></td>
        <td>${isVi ? 'Tối giản' : 'Lightweight'}</td>
        <td>${isVi ? 'Dự án nhỏ, task nhanh' : 'Small projects, quick tasks'}</td>
      </tr>
      <tr>
        <td><strong>🚀 full</strong></td>
        <td>${isVi ? 'Đầy đủ tất cả' : 'Everything included'}</td>
        <td>Enterprise, complex projects</td>
      </tr>
    </table>

    <h2>💻 ${t.commonCommands}</h2>
    <div class="example-box">
      <div class="example-header">${isVi ? 'Các lệnh hay dùng' : 'Frequently used commands'}</div>
      <div class="example-content">
        <pre><code># ${isVi ? 'Xem trạng thái project' : 'Check project status'}
ak status

# ${isVi ? 'Thêm components' : 'Add more components'}
ak add skill:databases      # ${isVi ? 'Thêm skill databases' : 'Add databases skill'}
ak add agent:debugger       # ${isVi ? 'Thêm agent debugger' : 'Add debugger agent'}
ak add command:fix/ui       # ${isVi ? 'Thêm command fix/ui' : 'Add fix/ui command'}

# ${isVi ? 'Cập nhật từ source' : 'Update from source'}
ak update

# ${isVi ? 'Xem danh sách có sẵn' : 'List available items'}
ak list agents
ak list skills
ak list commands

# ${isVi ? 'Kiểm tra sức khỏe project' : 'Health check'}
ak doctor

# ${isVi ? 'Mở help trong browser' : 'Open help in browser'}
ak help</code></pre>
      </div>
    </div>

    <div class="alert alert-success">
      <strong>✅ ${t.done}!</strong> ${t.doneText}
    </div>
  `;
}

function generateAgentsSection(t, lang) {
  const isVi = lang === 'vi';

  const agents = {
    development: [
      { name: 'debugger', emoji: '🔍', desc: isVi ? 'Điều tra lỗi, phân tích logs, trace bugs' : 'Investigate issues, analyze logs, trace bugs' },
      { name: 'planner', emoji: '📐', desc: isVi ? 'Lên kế hoạch implementation, thiết kế kiến trúc' : 'Create implementation plans, architecture design' },
      { name: 'fullstack-developer', emoji: '💻', desc: isVi ? 'Viết code với file ownership chặt chẽ' : 'Execute code with strict file ownership' },
      { name: 'code-reviewer', emoji: '👀', desc: isVi ? 'Review chất lượng code và standards' : 'Review code quality and standards' },
      { name: 'tester', emoji: '🧪', desc: isVi ? 'Viết tests đầy đủ' : 'Write comprehensive tests' }
    ],
    research: [
      { name: 'scout', emoji: '🔎', desc: isVi ? 'Tìm kiếm trong codebase với pattern matching' : 'Search codebase with pattern matching' },
      { name: 'scout-external', emoji: '🌐', desc: isVi ? 'Tìm kiếm docs và APIs bên ngoài' : 'Search external docs and APIs' },
      { name: 'researcher', emoji: '🔬', desc: isVi ? 'Nghiên cứu công nghệ và giải pháp' : 'Research technologies and solutions' }
    ],
    design: [
      { name: 'ui-ux-designer', emoji: '🎨', desc: isVi ? 'Thiết kế giao diện và trải nghiệm người dùng' : 'Design interfaces and user experiences' },
      { name: 'copywriter', emoji: '✍️', desc: isVi ? 'Viết content marketing và kỹ thuật' : 'Write marketing and technical copy' },
      { name: 'brainstormer', emoji: '💡', desc: isVi ? 'Tạo ý tưởng sáng tạo' : 'Generate creative ideas' }
    ],
    management: [
      { name: 'git-manager', emoji: '📦', desc: isVi ? 'Quản lý version control, commits, PRs' : 'Manage version control, commits, PRs' },
      { name: 'database-admin', emoji: '🗄️', desc: isVi ? 'Quản lý databases và queries' : 'Manage databases and queries' },
      { name: 'docs-manager', emoji: '📝', desc: isVi ? 'Viết và duy trì documentation' : 'Write and maintain documentation' },
      { name: 'project-manager', emoji: '📊', desc: isVi ? 'Theo dõi tiến độ' : 'Track progress and timelines' }
    ]
  };

  return `
    <h1><span class="emoji">🤖</span> Agents</h1>
    <p class="subtitle">${t.agentsTitle}</p>

    <div class="alert alert-info">
      <strong>💡 ${t.agentWhat}</strong> ${t.agentWhatDesc}
    </div>

    <h2>🔧 ${t.development}</h2>
    <div class="cards">
      ${agents.development.map(a => `
        <div class="card">
          <h4>${a.emoji} ${a.name}</h4>
          <p>${a.desc}</p>
        </div>
      `).join('')}
    </div>

    <h2>🔍 ${t.researchSearch}</h2>
    <div class="cards">
      ${agents.research.map(a => `
        <div class="card">
          <h4>${a.emoji} ${a.name}</h4>
          <p>${a.desc}</p>
        </div>
      `).join('')}
    </div>

    <h2>🎨 ${t.designContent}</h2>
    <div class="cards">
      ${agents.design.map(a => `
        <div class="card">
          <h4>${a.emoji} ${a.name}</h4>
          <p>${a.desc}</p>
        </div>
      `).join('')}
    </div>

    <h2>📊 ${t.managementSupport}</h2>
    <div class="cards">
      ${agents.management.map(a => `
        <div class="card">
          <h4>${a.emoji} ${a.name}</h4>
          <p>${a.desc}</p>
        </div>
      `).join('')}
    </div>

    <h2>📝 ${t.usage}</h2>
    <div class="example-box">
      <div class="example-header">${isVi ? 'Agents được tự động chọn dựa trên yêu cầu' : 'Agents are auto-selected based on request'}</div>
      <div class="example-content">
        <pre><code># ${isVi ? 'Khi bạn nói' : 'When you say'}: "Fix this bug in the login"
# → Router ${isVi ? 'chọn' : 'selects'}: debugger agent + /fix command

# ${isVi ? 'Khi bạn nói' : 'When you say'}: "Plan a new authentication feature"
# → Router ${isVi ? 'chọn' : 'selects'}: planner agent + /plan command

# ${isVi ? 'Khi bạn nói' : 'When you say'}: "Make this UI more beautiful"
# → Router ${isVi ? 'chọn' : 'selects'}: ui-ux-designer agent + ui-ux-pro-max skill</code></pre>
      </div>
    </div>

    <h2>📄 ${t.fileFormat}</h2>
    <div class="example-box">
      <div class="example-header">agents/debugger.md</div>
      <div class="example-content">
        <pre><code>---
name: debugger
description: ${isVi ? 'Điều tra lỗi, phân tích logs' : 'Investigate issues, analyze logs'}
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
      </div>
    </div>
  `;
}

function generateCommandsSection(t, lang) {
  const isVi = lang === 'vi';

  const commandGroups = [
    {
      name: t.fixCommands,
      icon: '🔧',
      commands: [
        { name: '/fix', desc: isVi ? 'Routing thông minh đến lệnh fix phù hợp' : 'Intelligent routing to specialized fix' },
        { name: '/fix:fast', desc: isVi ? 'Sửa nhanh cho lỗi đơn giản' : 'Quick fixes for simple issues' },
        { name: '/fix:hard', desc: isVi ? 'Debug phức tạp với research' : 'Complex debugging with research' },
        { name: '/fix:ui', desc: isVi ? 'Lỗi UI/layout' : 'UI/layout issues' },
        { name: '/fix:test', desc: isVi ? 'Sửa test failing' : 'Failing test fixes' },
        { name: '/fix:types', desc: isVi ? 'Lỗi TypeScript' : 'TypeScript errors' },
        { name: '/fix:ci', desc: isVi ? 'Lỗi CI/CD pipeline' : 'CI/CD pipeline issues' }
      ]
    },
    {
      name: t.planCommands,
      icon: '📐',
      commands: [
        { name: '/plan', desc: isVi ? 'Routing thông minh cho planning' : 'Intelligent plan routing' },
        { name: '/plan:fast', desc: isVi ? 'Lên kế hoạch nhanh không research' : 'Quick planning without research' },
        { name: '/plan:hard', desc: isVi ? 'Research đầy đủ + planning' : 'Full research + planning' },
        { name: '/plan:parallel', desc: isVi ? 'Planning song song nhiều track' : 'Multi-track parallel planning' },
        { name: '/plan:preview', desc: isVi ? 'Mở plan trong browser' : 'Open plan in browser' }
      ]
    },
    {
      name: t.codeCommands,
      icon: '💻',
      commands: [
        { name: '/code', desc: isVi ? 'Implementation chuẩn với tests' : 'Standard implementation with tests' },
        { name: '/code:auto', desc: isVi ? 'Tự động generate code' : 'Automated code generation' },
        { name: '/code:no-test', desc: isVi ? 'Prototype nhanh không tests' : 'Quick prototyping without tests' }
      ]
    },
    {
      name: t.otherCommands,
      icon: '⚡',
      commands: [
        { name: '/test', desc: isVi ? 'Chạy tests' : 'Run tests' },
        { name: '/review', desc: 'Code review' },
        { name: '/scout', desc: isVi ? 'Tìm kiếm codebase' : 'Search codebase' },
        { name: '/debug', desc: isVi ? 'Điều tra sâu' : 'Deep investigation' },
        { name: '/brainstorm', desc: isVi ? 'Tạo ý tưởng' : 'Generate ideas' }
      ]
    }
  ];

  return `
    <h1><span class="emoji">📋</span> Commands</h1>
    <p class="subtitle">${t.commandsTitle}</p>

    <div class="alert alert-info">
      <strong>💡 ${t.commandWhat}</strong> ${t.commandWhatDesc}
    </div>

    <h2>📝 ${t.usage}</h2>
    <div class="example-box">
      <div class="example-header">${isVi ? 'Cách sử dụng commands trong Claude Code' : 'How to use commands in Claude Code'}</div>
      <div class="example-content">
        <pre><code># ${isVi ? 'Trong Claude Code, gõ' : 'In Claude Code, type'}:
/fix ${isVi ? 'lỗi login không hoạt động' : 'login is not working'}
/plan:fast ${isVi ? 'thêm tính năng dark mode' : 'add dark mode feature'}
/code ${isVi ? 'implement theo plan trên' : 'implement the plan above'}
/test ${isVi ? 'chạy tất cả tests' : 'run all tests'}</code></pre>
      </div>
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

    <h2>🎯 ${t.example}</h2>
    <div class="example-box">
      <div class="example-header">${isVi ? 'Ví dụ workflow hoàn chỉnh' : 'Example complete workflow'}</div>
      <div class="example-content">
        <pre><code># 1. ${isVi ? 'Lên kế hoạch tính năng mới' : 'Plan new feature'}
/plan:hard ${isVi ? 'Thêm hệ thống authentication với OAuth' : 'Add authentication system with OAuth'}

# 2. ${isVi ? 'Xem plan trong browser' : 'View plan in browser'}
/plan:preview

# 3. ${isVi ? 'Implement theo plan' : 'Implement the plan'}
/code ${isVi ? 'implement phase 1 của plan' : 'implement phase 1 of the plan'}

# 4. ${isVi ? 'Fix nếu có lỗi' : 'Fix if there are bugs'}
/fix:hard ${isVi ? 'lỗi OAuth callback' : 'OAuth callback error'}

# 5. ${isVi ? 'Chạy tests' : 'Run tests'}
/test</code></pre>
      </div>
    </div>
  `;
}

function generateSkillsSection(t, lang) {
  const isVi = lang === 'vi';

  const skillCategories = [
    {
      name: t.frontend,
      icon: '🎨',
      skills: [
        { name: 'frontend-development', desc: isVi ? 'React, TypeScript, best practices' : 'React, TypeScript, best practices' },
        { name: 'ui-ux-pro-max', desc: isVi ? '50 styles, 21 palettes, 50 font pairings' : '50 styles, 21 palettes, 50 font pairings' },
        { name: 'ui-styling', desc: 'Tailwind CSS + shadcn/ui' },
        { name: 'mobile-development', desc: 'React Native, Flutter, SwiftUI' }
      ]
    },
    {
      name: t.backend,
      icon: '⚙️',
      skills: [
        { name: 'backend-development', desc: 'Node.js, Python, Go, Rust APIs' },
        { name: 'databases', desc: 'PostgreSQL, MongoDB, optimization' },
        { name: 'better-auth', desc: 'OAuth2, 2FA, sessions' }
      ]
    },
    {
      name: t.devops,
      icon: '🚀',
      skills: [
        { name: 'devops', desc: 'Cloudflare, Docker, GCP' },
        { name: 'mcp-builder', desc: isVi ? 'Xây dựng MCP servers' : 'Build MCP servers' },
        { name: 'media-processing', desc: 'FFmpeg, ImageMagick' }
      ]
    },
    {
      name: t.testingDebug,
      icon: '🧪',
      skills: [
        { name: 'debugging', desc: isVi ? '4-phase debugging framework' : '4-phase debugging framework' },
        { name: 'chrome-devtools', desc: 'Puppeteer, CDP' },
        { name: 'test-generation', desc: 'BDD, Given/When/Then' }
      ]
    }
  ];

  return `
    <h1><span class="emoji">📚</span> Skills</h1>
    <p class="subtitle">${t.skillsTitle}</p>

    <div class="alert alert-info">
      <strong>💡 ${t.skillWhat}</strong> ${t.skillWhatDesc}
    </div>

    <h2>📝 ${t.usage}</h2>
    <div class="example-box">
      <div class="example-header">${isVi ? 'Skills được tự động load khi cần' : 'Skills are auto-loaded when needed'}</div>
      <div class="example-content">
        <pre><code># ${isVi ? 'Thêm skill vào project' : 'Add skill to project'}
ak add skill:databases
ak add skill:frontend-development
ak add skill:devops

# ${isVi ? 'Xem skills có sẵn' : 'List available skills'}
ak list skills</code></pre>
      </div>
    </div>

    ${skillCategories.map(cat => `
      <h2>${cat.icon} ${cat.name}</h2>
      <div class="cards">
        ${cat.skills.map(s => `
          <div class="card">
            <h4>${s.name}</h4>
            <p>${s.desc}</p>
          </div>
        `).join('')}
      </div>
    `).join('')}

    <h2>🎯 ${t.example}</h2>
    <div class="example-box">
      <div class="example-header">${isVi ? 'Skill được load tự động dựa trên context' : 'Skills are auto-loaded based on context'}</div>
      <div class="example-content">
        <pre><code># ${isVi ? 'Khi bạn nói' : 'When you say'}: "Make this button more beautiful"
# → ${isVi ? 'Skill được load' : 'Skills loaded'}: ui-ux-pro-max, ui-styling

# ${isVi ? 'Khi bạn nói' : 'When you say'}: "Optimize database query"
# → ${isVi ? 'Skill được load' : 'Skills loaded'}: databases, arch-performance-optimization

# ${isVi ? 'Khi bạn nói' : 'When you say'}: "Deploy to Cloudflare"
# → ${isVi ? 'Skill được load' : 'Skills loaded'}: devops</code></pre>
      </div>
    </div>
  `;
}

function generateHooksSection(t, lang) {
  const isVi = lang === 'vi';

  return `
    <h1><span class="emoji">⚡</span> Hooks</h1>
    <p class="subtitle">${t.hooksTitle}</p>

    <div class="alert alert-info">
      <strong>💡 ${t.hookWhat}</strong> ${t.hookWhatDesc}
    </div>

    <h2>📋 ${t.hookTypes}</h2>
    <table>
      <tr>
        <th>Hook</th>
        <th>Trigger</th>
        <th>${isVi ? 'Mục đích' : 'Purpose'}</th>
      </tr>
      <tr>
        <td><code>session-init</code></td>
        <td>${isVi ? 'Bắt đầu session' : 'Session start'}</td>
        <td>${isVi ? 'Load config, detect project' : 'Load config, detect project'}</td>
      </tr>
      <tr>
        <td><code>session-end</code></td>
        <td>${isVi ? 'Kết thúc session' : 'Session end'}</td>
        <td>${isVi ? 'Log session, cleanup' : 'Log session, cleanup'}</td>
      </tr>
      <tr>
        <td><code>post-edit-prettier</code></td>
        <td>${isVi ? 'Sau khi edit' : 'After edit'}</td>
        <td>${isVi ? 'Tự động format code' : 'Auto-format code'}</td>
      </tr>
      <tr>
        <td><code>privacy-block</code></td>
        <td>${isVi ? 'Truy cập file' : 'File access'}</td>
        <td>${isVi ? 'Chặn file nhạy cảm' : 'Block sensitive files'}</td>
      </tr>
      <tr>
        <td><code>scout-block</code></td>
        <td>${isVi ? 'Truy cập thư mục' : 'Directory access'}</td>
        <td>${isVi ? 'Chặn đường dẫn cấm' : 'Block forbidden paths'}</td>
      </tr>
    </table>

    <h2>🔔 ${t.notificationHooks}</h2>
    <p>${isVi ? 'Gửi thông báo qua các kênh:' : 'Send notifications via channels:'}</p>
    <ul>
      <li><strong>Slack</strong> - Workspace notifications</li>
      <li><strong>Discord</strong> - Channel webhooks</li>
      <li><strong>Telegram</strong> - Bot messages</li>
    </ul>

    <h2>🛡️ ${t.securityHooks}</h2>
    <div class="example-box">
      <div class="example-header">${isVi ? 'Hooks bảo mật tự động chạy' : 'Security hooks run automatically'}</div>
      <div class="example-content">
        <pre><code># privacy-block.cjs ${isVi ? 'chặn truy cập' : 'blocks access to'}:
.env
.env.local
credentials.json
secrets/

# scout-block.cjs ${isVi ? 'chặn traversal' : 'blocks traversal'}:
../../../etc/passwd
/Users/private/
node_modules/ ${isVi ? '(quá lớn)' : '(too large)'}</code></pre>
      </div>
    </div>
  `;
}

function generateWorkflowsSection(t, lang) {
  const isVi = lang === 'vi';

  return `
    <h1><span class="emoji">🔄</span> Workflows</h1>
    <p class="subtitle">${t.workflowsTitle}</p>

    <div class="alert alert-info">
      <strong>💡 ${t.workflowWhat}</strong> ${t.workflowWhatDesc}
    </div>

    <h2>📋 ${t.primaryWorkflow}</h2>
    <p>${isVi ? 'Quy trình phát triển feature đầy đủ:' : 'Complete feature development process:'}</p>

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
      <li><strong>Agent:</strong> <code>planner</code></li>
      <li>${isVi ? 'Phân tích yêu cầu' : 'Analyze requirements'}</li>
      <li>${isVi ? 'Tạo implementation plan' : 'Create implementation plan'}</li>
      <li>${isVi ? 'Định nghĩa success criteria' : 'Define success criteria'}</li>
    </ul>

    <h3>Phase 2: Implementation</h3>
    <ul>
      <li><strong>Agent:</strong> <code>fullstack-developer</code></li>
      <li>${isVi ? 'Viết code theo plan' : 'Write code following plan'}</li>
      <li>Self-review</li>
      <li>${isVi ? 'Viết unit tests' : 'Write unit tests'}</li>
    </ul>

    <h3>Phase 3: Testing</h3>
    <ul>
      <li><strong>Agent:</strong> <code>tester</code></li>
      <li>${isVi ? 'Chạy full test suite' : 'Run full test suite'}</li>
      <li>${isVi ? 'Test edge cases' : 'Test edge cases'}</li>
      <li>${isVi ? 'Báo cáo kết quả' : 'Report status'}</li>
    </ul>

    <h3>Phase 4: Review</h3>
    <ul>
      <li><strong>Agent:</strong> <code>code-reviewer</code></li>
      <li>${isVi ? 'Kiểm tra chất lượng code' : 'Check code quality'}</li>
      <li>Security review</li>
      <li>Performance analysis</li>
    </ul>

    <h3>Phase 5: Documentation</h3>
    <ul>
      <li><strong>Agent:</strong> <code>docs-manager</code></li>
      <li>${isVi ? 'Cập nhật documentation' : 'Update documentation'}</li>
      <li>Changelog entry</li>
      <li>Release notes</li>
    </ul>

    <h2>🎯 ${t.keyPrinciples}</h2>
    <ul>
      <li><strong>${isVi ? 'Clarify First' : 'Clarify First'}</strong> - ${isVi ? 'Hỏi rõ yêu cầu trước khi làm' : 'Ask for clarification before starting'}</li>
      <li><strong>${isVi ? 'Minimum Viable' : 'Minimum Viable'}</strong> - ${isVi ? 'Chỉ làm những gì cần thiết' : 'Only do what is necessary'}</li>
      <li><strong>${isVi ? 'Reuse Before Write' : 'Reuse Before Write'}</strong> - ${isVi ? 'Tái sử dụng code có sẵn' : 'Reuse existing code'}</li>
      <li><strong>File < 300 LOC</strong> - ${isVi ? 'Giữ file nhỏ' : 'Keep files small'}</li>
      <li><strong>${isVi ? 'Config from Env' : 'Config from Env'}</strong> - ${isVi ? 'Không hardcode secrets' : 'Never hardcode secrets'}</li>
    </ul>

    <div class="example-box">
      <div class="example-header">${t.example}</div>
      <div class="example-content">
        <pre><code># ${isVi ? 'Workflow hoàn chỉnh cho feature mới' : 'Complete workflow for new feature'}

# 1. Planning
/plan:hard ${isVi ? 'Thêm tính năng dark mode cho app' : 'Add dark mode feature to app'}

# 2. ${isVi ? 'Xem và approve plan' : 'Review and approve plan'}
/plan:preview

# 3. Implementation
/code ${isVi ? 'implement phase 1 - tạo theme context' : 'implement phase 1 - create theme context'}
/code ${isVi ? 'implement phase 2 - update components' : 'implement phase 2 - update components'}

# 4. Testing
/test

# 5. Review
/review ${isVi ? 'review code vừa viết' : 'review the code written'}

# 6. ${isVi ? 'Commit và push' : 'Commit and push'}
# (${isVi ? 'git-manager agent tự động handle' : 'git-manager agent handles automatically'})</code></pre>
      </div>
    </div>
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
    const lang = url.searchParams.get('lang') || 'vi';

    const html = generateHelpPage(section, lang, source);
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
