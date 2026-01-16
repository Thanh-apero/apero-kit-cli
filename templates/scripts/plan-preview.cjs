#!/usr/bin/env node
/**
 * Plan Preview Server with Edit Support
 *
 * Usage: node .claude/scripts/plan-preview.cjs <plan-path> [--port=3456]
 *
 * Opens a local web server to preview and edit plans with:
 * - Rendered markdown with syntax highlighting
 * - Navigation sidebar for phases
 * - Edit mode with live preview
 * - Auto-save functionality
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

// Markdown to HTML - Uses marked.js on client-side for full GFM support
// Server just passes raw markdown, client renders with marked.js
function markdownToHtml(md, forEditor = false) {
  // For editor preview pane, we'll render client-side with marked.js
  // For static preview, we embed raw markdown and render on page load
  const encodedMd = encodeURIComponent(md);
  return `<div class="markdown-body" data-markdown="${encodedMd}"><noscript>${escapeHtml(md)}</noscript><div class="loading">Loading...</div></div>`;
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

// Generate HTML page with edit support
function generatePage(files, currentFile, mode = 'preview') {
  const file = files.find(f => f.name === currentFile) || files[0];
  const content = file ? fs.readFileSync(file.path, 'utf-8') : '# No plan found';
  const htmlContent = markdownToHtml(content);
  const isEditMode = mode === 'edit';
  const currentFileName = currentFile || files[0]?.name || '';

  const nav = files.map(f => {
    const isActive = f.name === (currentFile || files[0]?.name);
    const icon = f.isMain ? '📋' : f.isPhase ? '📌' : f.category === 'research' ? '🔬' : f.category === 'reports' ? '📄' : '📝';
    return `<a href="?file=${encodeURIComponent(f.name)}&mode=${mode}" class="${isActive ? 'active' : ''}">${icon} ${f.name}</a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan Preview - ${path.basename(fullPlanPath)}</title>

  <!-- marked.js - Markdown Parser -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

  <!-- Prism.js - Syntax Highlighting -->
  <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markdown.min.js"></script>

  <style>
    :root {
      --bg: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --border: #30363d;
      --code-bg: #1f2428;
      --success: #3fb950;
      --warning: #d29922;
      --error: #f85149;
      --gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gradient-2: linear-gradient(135deg, #3fb950 0%, #2ea043 100%);
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

    /* Mode Toggle */
    .mode-toggle {
      display: flex;
      background: var(--bg-tertiary);
      border-radius: 20px;
      padding: 4px;
      margin-bottom: 20px;
    }

    .mode-toggle a {
      flex: 1;
      text-align: center;
      padding: 8px 16px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.3s ease;
      margin: 0;
    }

    .mode-toggle a.active {
      background: var(--gradient-1);
      color: white;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }

    .mode-toggle a:not(.active) {
      background: transparent;
      color: var(--text-muted);
    }

    .mode-toggle a:not(.active):hover {
      color: var(--text);
      background: var(--border);
    }

    /* Main content */
    .main {
      flex: 1;
      margin-left: 280px;
      padding: 40px 60px;
      max-width: 100%;
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

    /* Editor */
    .editor-container {
      display: ${isEditMode ? 'flex' : 'none'};
      gap: 20px;
      height: calc(100vh - 200px);
    }

    .editor-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .editor-pane h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .editor {
      flex: 1;
      width: 100%;
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      color: var(--text);
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 14px;
      line-height: 1.6;
      resize: none;
      outline: none;
    }

    .editor:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.1);
    }

    .preview-pane {
      flex: 1;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      overflow-y: auto;
    }

    .preview-content {
      display: ${isEditMode ? 'none' : 'block'};
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      align-items: center;
    }

    .save-btn {
      background: var(--gradient-2);
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .save-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(63, 185, 80, 0.3);
    }

    .save-btn:active {
      transform: translateY(0);
    }

    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .status {
      font-size: 13px;
      color: var(--text-muted);
      margin-left: auto;
    }

    .status.saved {
      color: var(--success);
    }

    .status.saving {
      color: var(--warning);
    }

    .status.error {
      color: var(--error);
    }

    /* Keyboard shortcut hint */
    .shortcut {
      font-size: 11px;
      color: var(--text-muted);
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 8px;
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

    /* GitHub-style Markdown Body */
    .markdown-body {
      line-height: 1.7;
    }

    .markdown-body .loading {
      color: var(--text-muted);
      font-style: italic;
    }

    .markdown-body h1 {
      font-size: 2em;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3em;
      margin: 24px 0 16px;
    }

    .markdown-body h2 {
      font-size: 1.5em;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.3em;
      margin: 24px 0 16px;
    }

    .markdown-body h3 {
      font-size: 1.25em;
      margin: 24px 0 16px;
    }

    .markdown-body h4 {
      font-size: 1em;
      margin: 24px 0 16px;
    }

    .markdown-body p {
      margin: 0 0 16px;
    }

    .markdown-body ul, .markdown-body ol {
      margin: 0 0 16px;
      padding-left: 2em;
    }

    .markdown-body li {
      margin: 4px 0;
    }

    .markdown-body li > p {
      margin: 0;
    }

    /* Task Lists */
    .markdown-body input[type="checkbox"] {
      margin-right: 8px;
      vertical-align: middle;
    }

    .markdown-body li.task-list-item {
      list-style: none;
      margin-left: -1.5em;
    }

    /* Tables - GitHub style */
    .markdown-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      display: block;
      overflow-x: auto;
    }

    .markdown-body thead {
      background: var(--bg-tertiary);
    }

    .markdown-body th, .markdown-body td {
      padding: 12px 16px;
      border: 1px solid var(--border);
      text-align: left;
    }

    .markdown-body th {
      font-weight: 600;
    }

    .markdown-body tbody tr:nth-child(even) {
      background: var(--bg-secondary);
    }

    .markdown-body tbody tr:hover {
      background: rgba(88, 166, 255, 0.05);
    }

    /* Code blocks with Prism */
    .markdown-body pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      margin: 16px 0;
    }

    .markdown-body pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: 13px;
      color: var(--text);
    }

    .markdown-body code {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 85%;
      background: var(--code-bg);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      color: var(--accent);
    }

    /* Blockquotes */
    .markdown-body blockquote {
      border-left: 4px solid var(--accent);
      padding: 0 16px;
      margin: 16px 0;
      color: var(--text-muted);
    }

    .markdown-body blockquote > :first-child {
      margin-top: 0;
    }

    .markdown-body blockquote > :last-child {
      margin-bottom: 0;
    }

    /* Images */
    .markdown-body img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }

    /* Horizontal Rule */
    .markdown-body hr {
      border: none;
      border-top: 2px solid var(--border);
      margin: 32px 0;
    }

    /* Links */
    .markdown-body a {
      color: var(--accent);
      text-decoration: none;
    }

    .markdown-body a:hover {
      text-decoration: underline;
    }

    /* Strikethrough */
    .markdown-body del {
      color: var(--text-muted);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar { width: 100%; height: auto; position: relative; }
      .main { margin-left: 0; padding: 20px; }
      body { flex-direction: column; }
      .editor-container { flex-direction: column; height: auto; }
      .editor { min-height: 300px; }
      .preview-pane { min-height: 300px; }
    }

    /* Print styles */
    @media print {
      .sidebar, .toolbar, .mode-toggle, .footer { display: none !important; }
      .main { margin-left: 0; padding: 20px; }
      body { background: white; color: black; }
      .markdown-body pre { border: 1px solid #ddd; background: #f5f5f5; }
      .markdown-body code { background: #f5f5f5; color: #333; }
      .markdown-body a { color: #0366d6; }
    }
  </style>
</head>
<body>
  <nav class="sidebar">
    <h2>📁 ${path.basename(fullPlanPath)}</h2>

    <div class="mode-toggle">
      <a href="?file=${encodeURIComponent(currentFileName)}&mode=preview" class="${!isEditMode ? 'active' : ''}">👁️ Preview</a>
      <a href="?file=${encodeURIComponent(currentFileName)}&mode=edit" class="${isEditMode ? 'active' : ''}">✏️ Edit</a>
    </div>

    ${nav}
  </nav>

  <main class="main">
    ${isEditMode ? `
    <div class="toolbar">
      <button class="save-btn" onclick="saveFile()" id="saveBtn">
        💾 Save
        <span class="shortcut">⌘S</span>
      </button>
      <span class="status" id="status">Ready to edit</span>
    </div>

    <div class="editor-container">
      <div class="editor-pane">
        <h3>📝 Markdown Editor</h3>
        <textarea class="editor" id="editor" spellcheck="false">${escapeHtml(content)}</textarea>
      </div>
      <div class="editor-pane">
        <h3>👁️ Live Preview</h3>
        <div class="preview-pane" id="preview">${htmlContent}</div>
      </div>
    </div>
    ` : `
    <article class="preview-content">
      ${htmlContent}
    </article>
    `}

    <footer class="footer">
      <span>Plan Preview Server • Press <kbd>Ctrl+C</kbd> in terminal to stop</span>
      <span><a href="javascript:location.reload()">↻ Refresh</a></span>
    </footer>
  </main>

  <script>
    const currentFile = '${escapeHtml(currentFileName)}';
    let originalContent = '';
    let hasChanges = false;

    ${isEditMode ? `
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const status = document.getElementById('status');
    const saveBtn = document.getElementById('saveBtn');

    originalContent = editor.value;

    // Configure marked.js for GitHub Flavored Markdown
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });

    // Custom renderer for syntax highlighting with Prism
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
      const lang = language || '';
      const validLang = Prism.languages[lang] ? lang : 'plaintext';
      let highlighted;
      try {
        highlighted = Prism.languages[validLang]
          ? Prism.highlight(code, Prism.languages[validLang], validLang)
          : code;
      } catch (e) {
        highlighted = code;
      }
      return '<pre class="language-' + validLang + '"><code class="language-' + validLang + '">' + highlighted + '</code></pre>';
    };
    marked.setOptions({ renderer });

    // Render markdown with marked.js
    function renderMarkdown(md) {
      return marked.parse(md);
    }

    // Live preview update
    let updateTimeout;
    editor.addEventListener('input', () => {
      hasChanges = editor.value !== originalContent;
      updateStatus();

      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        preview.innerHTML = renderMarkdown(editor.value);
        // Re-run Prism highlighting for any code blocks
        Prism.highlightAllUnder(preview);
      }, 150);
    });

    // Initial render
    preview.innerHTML = renderMarkdown(editor.value);
    Prism.highlightAllUnder(preview);

    // Update status indicator
    function updateStatus() {
      if (hasChanges) {
        status.textContent = '● Unsaved changes';
        status.className = 'status';
      } else {
        status.textContent = '✓ Saved';
        status.className = 'status saved';
      }
    }

    // Save file
    async function saveFile() {
      if (!hasChanges) return;

      saveBtn.disabled = true;
      status.textContent = 'Saving...';
      status.className = 'status saving';

      try {
        const response = await fetch('/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: currentFile,
            content: editor.value
          })
        });

        const result = await response.json();

        if (result.success) {
          originalContent = editor.value;
          hasChanges = false;
          status.textContent = '✓ Saved successfully';
          status.className = 'status saved';

          setTimeout(() => {
            if (!hasChanges) {
              status.textContent = '✓ Saved';
            }
          }, 2000);
        } else {
          throw new Error(result.error || 'Save failed');
        }
      } catch (err) {
        status.textContent = '✗ ' + err.message;
        status.className = 'status error';
      } finally {
        saveBtn.disabled = false;
      }
    }

    // Keyboard shortcut: Cmd/Ctrl + S to save
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    });

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    ` : `
    // Preview mode: Render markdown on page load
    document.addEventListener('DOMContentLoaded', () => {
      // Configure marked.js
      marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: true,
        mangle: false
      });

      // Custom renderer for syntax highlighting with Prism
      const renderer = new marked.Renderer();
      renderer.code = function(code, language) {
        const lang = language || '';
        const validLang = Prism.languages[lang] ? lang : 'plaintext';
        let highlighted;
        try {
          highlighted = Prism.languages[validLang]
            ? Prism.highlight(code, Prism.languages[validLang], validLang)
            : code;
        } catch (e) {
          highlighted = code;
        }
        return '<pre class="language-' + validLang + '"><code class="language-' + validLang + '">' + highlighted + '</code></pre>';
      };
      marked.setOptions({ renderer });

      // Find all markdown bodies and render them
      document.querySelectorAll('.markdown-body[data-markdown]').forEach(el => {
        const rawMd = decodeURIComponent(el.dataset.markdown);
        el.innerHTML = marked.parse(rawMd);
        Prism.highlightAllUnder(el);
      });
    });
    `}
  </script>
</body>
</html>`;
}

// Create HTTP server with save endpoint
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Handle save endpoint
  if (req.method === 'POST' && url.pathname === '/save') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { file, content } = JSON.parse(body);
        const files = getPlanFiles(fullPlanPath);
        const targetFile = files.find(f => f.name === file);

        if (!targetFile) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'File not found' }));
          return;
        }

        // Write file
        fs.writeFileSync(targetFile.path, content, 'utf-8');
        console.log(`💾 Saved: ${file}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Handle GET requests
  const currentFile = url.searchParams.get('file');
  const mode = url.searchParams.get('mode') || 'preview';

  const files = getPlanFiles(fullPlanPath);
  const html = generatePage(files, currentFile, mode);

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n📋 Plan Preview Server (with Edit Support)`);
  console.log(`   Plan: ${planPath}`);
  console.log(`   URL:  ${url}`);
  console.log(`\n   Features:`);
  console.log(`   • Preview mode: View rendered markdown`);
  console.log(`   • Edit mode: Edit with live preview`);
  console.log(`   • Save: Cmd/Ctrl+S or click Save button`);
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
