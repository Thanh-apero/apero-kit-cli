#!/usr/bin/env node
/**
 * Plan Preview Server
 *
 * Usage: node .claude/scripts/plan-preview.cjs <plan-path> [--port=3456]
 *
 * Opens a local web server to preview plans with:
 * - Rendered markdown with syntax highlighting
 * - Navigation sidebar for phases
 * - Auto-refresh on file changes
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const planPath = process.argv[2];
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const PORT = portArg ? parseInt(portArg.split('=')[1]) : 3456;

if (!planPath) {
  console.error('Error: Plan path required');
  console.log('Usage: node .claude/scripts/plan-preview.cjs <plan-path>');
  console.log('Example: node .claude/scripts/plan-preview.cjs plans/251207-feature');
  process.exit(1);
}

const fullPlanPath = path.resolve(process.cwd(), planPath);
if (!fs.existsSync(fullPlanPath)) {
  console.error(`Error: Plan directory not found: ${fullPlanPath}`);
  process.exit(1);
}

// Simple markdown to HTML converter
function markdownToHtml(md) {
  return md
    // Code blocks with language
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const langClass = lang ? `language-${lang}` : '';
      return `<pre class="${langClass}"><code>${escapeHtml(code.trim())}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Lists
    .replace(/^\s*[-*] (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)\n(?!<li>)/g, '$1</ul>\n')
    .replace(/(?<!<\/li>\n)(<li>)/g, '<ul>$1')
    // Numbered lists
    .replace(/^\s*\d+\. (.*$)/gm, '<li class="numbered">$1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    // Horizontal rules
    .replace(/^---+$/gm, '<hr>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Tables (simple)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c.trim()))) return ''; // Skip separator
      const tag = 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Get all markdown files in plan directory
function getPlanFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isFile() && item.name.endsWith('.md')) {
      files.push({
        name: item.name,
        path: path.join(dir, item.name),
        isMain: item.name === 'plan.md',
        isPhase: item.name.startsWith('phase-')
      });
    } else if (item.isDirectory()) {
      // Include reports, research, scout subdirs
      const subFiles = getPlanFiles(path.join(dir, item.name));
      files.push(...subFiles.map(f => ({
        ...f,
        name: `${item.name}/${f.name}`,
        category: item.name
      })));
    }
  }

  return files.sort((a, b) => {
    if (a.isMain) return -1;
    if (b.isMain) return 1;
    if (a.isPhase && !b.isPhase) return -1;
    if (!a.isPhase && b.isPhase) return 1;
    return a.name.localeCompare(b.name);
  });
}

// Generate HTML page
function generatePage(files, currentFile) {
  const file = files.find(f => f.name === currentFile) || files[0];
  const content = file ? fs.readFileSync(file.path, 'utf-8') : '# No plan found';
  const htmlContent = markdownToHtml(content);

  const nav = files.map(f => {
    const isActive = f.name === (currentFile || files[0]?.name);
    const icon = f.isMain ? '📋' : f.isPhase ? '📌' : f.category === 'research' ? '🔬' : f.category === 'reports' ? '📄' : '📝';
    return `<a href="?file=${encodeURIComponent(f.name)}" class="${isActive ? 'active' : ''}">${icon} ${f.name}</a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Preview - ${path.basename(fullPlanPath)}</title>
  <style>
    :root {
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --border: #30363d;
      --code-bg: #1f2428;
      --success: #3fb950;
      --warning: #d29922;
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
      width: 280px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 20px;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
    }

    .sidebar h2 {
      color: var(--text);
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .sidebar a {
      display: block;
      color: var(--text-muted);
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 4px;
      transition: all 0.2s;
    }

    .sidebar a:hover {
      background: var(--border);
      color: var(--text);
    }

    .sidebar a.active {
      background: rgba(88, 166, 255, 0.15);
      color: var(--accent);
    }

    /* Main content */
    .main {
      flex: 1;
      margin-left: 280px;
      padding: 40px 60px;
      max-width: 900px;
    }

    .main h1 {
      font-size: 32px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }

    .main h2 {
      font-size: 24px;
      margin: 32px 0 16px;
      color: var(--text);
    }

    .main h3 {
      font-size: 18px;
      margin: 24px 0 12px;
      color: var(--text);
    }

    .main p {
      margin-bottom: 16px;
    }

    .main ul, .main ol {
      margin: 16px 0;
      padding-left: 24px;
    }

    .main li {
      margin-bottom: 8px;
    }

    .main a {
      color: var(--accent);
    }

    .main blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 16px;
      margin: 16px 0;
      color: var(--text-muted);
    }

    .main hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 32px 0;
    }

    /* Code */
    pre {
      background: var(--code-bg);
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
      background: var(--code-bg);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--accent);
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }

    th, td {
      padding: 12px;
      border: 1px solid var(--border);
      text-align: left;
    }

    th {
      background: var(--bg-secondary);
    }

    /* Status badges */
    .status-pending { color: var(--warning); }
    .status-completed { color: var(--success); }

    /* Footer */
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 12px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar { width: 100%; height: auto; position: relative; }
      .main { margin-left: 0; padding: 20px; }
      body { flex-direction: column; }
    }
  </style>
</head>
<body>
  <nav class="sidebar">
    <h2>📁 ${path.basename(fullPlanPath)}</h2>
    ${nav}
  </nav>
  <main class="main">
    <article>
      ${htmlContent}
    </article>
    <footer class="footer">
      <p>Plan Preview Server • <a href="javascript:location.reload()">↻ Refresh</a></p>
    </footer>
  </main>
  <script>
    // Auto-refresh every 5 seconds (optional)
    // setTimeout(() => location.reload(), 5000);
  </script>
</body>
</html>`;
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const currentFile = url.searchParams.get('file');

  const files = getPlanFiles(fullPlanPath);
  const html = generatePage(files, currentFile);

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n📋 Plan Preview Server`);
  console.log(`   Plan: ${planPath}`);
  console.log(`   URL:  ${url}`);
  console.log(`\n   Press Ctrl+C to stop\n`);

  // Open browser
  const openCommand = process.platform === 'darwin' ? 'open' :
                      process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCommand} ${url}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Server stopped');
  process.exit(0);
});
