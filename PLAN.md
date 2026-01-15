# PLAN: Agent Kit CLI Tool

> Plan chi tiết cho việc xây dựng CLI tool để scaffold AI agent projects

---

## 1. Tổng Quan

### Mục tiêu
Tạo một CLI tool giống như `ck init` của ClaudeKit, cho phép:
- Khởi tạo project mới với kit được chọn sẵn
- Thêm agents/skills/commands riêng lẻ
- **Update/sync từ source khi có bản mới**
- Publish lên npm để chia sẻ

### Cách sử dụng

```bash
# Cài đặt
npm install -g agent-kit-cli

# Hoặc chạy trực tiếp
npx agent-kit-cli init my-app --kit engineer

# Lệnh ngắn
ak init my-app --kit engineer
ak add skill:databases
ak list skills
ak update --source ~/AGENTS.md
```

---

## 2. Các Lệnh CLI

### 2.1 `ak init [project-name]`

**Mục đích:** Tạo project mới với kit được chọn

**Options:**
| Flag | Mô tả |
|------|-------|
| `-k, --kit <type>` | Loại kit: engineer, researcher, designer, minimal, full, custom |
| `-s, --source <path>` | Đường dẫn tới thư mục source (mặc định: tìm trong templates/) |
| `-f, --force` | Ghi đè nếu thư mục đã tồn tại |

**Flow:**
```
1. Hỏi project name (nếu không có)
2. Hỏi chọn kit (nếu không có --kit)
3. Nếu kit=custom → hiện menu chọn agents/skills/commands
4. Copy files từ source → project/.claude/
5. Tạo file cấu hình (settings.json, .env.example)
6. Hiển thị kết quả
```

**Output structure:**
```
my-app/
├── .claude/
│   ├── agents/          # Agents theo kit
│   ├── commands/        # Commands theo kit
│   ├── skills/          # Skills theo kit
│   ├── router/          # Nếu kit có router
│   ├── hooks/           # Nếu kit có hooks
│   ├── settings.json
│   └── README.md
├── AGENTS.md            # Core ruleset (copy từ source)
└── .ak-config.json      # Config cho update sau này
```

---

### 2.2 `ak add <type>:<name>`

**Mục đích:** Thêm agent/skill/command vào project hiện có

**Syntax:**
```bash
ak add skill:databases           # Thêm skill databases
ak add agent:debugger            # Thêm agent debugger
ak add command:fix/ci            # Thêm command fix/ci
ak add workflow:bug-fixing       # Thêm workflow
```

**Flow:**
```
1. Kiểm tra đang ở trong project (có .claude/ hoặc .ak-config.json)
2. Parse type và name từ argument
3. Copy từ source → project
4. Cập nhật .ak-config.json
```

---

### 2.3 `ak list [type]`

**Mục đích:** Liệt kê các items có sẵn

**Syntax:**
```bash
ak list              # List tất cả
ak list kits         # List các kits
ak list agents       # List agents có sẵn
ak list skills       # List skills
ak list commands     # List commands
```

**Output example:**
```
Available Kits:
  🛠️  engineer    - Full-stack development kit
  🔬  researcher  - Research and analysis kit
  🎨  designer    - UI/UX design kit
  📦  minimal     - Lightweight essential kit
  🚀  full        - Complete kit with everything

Available Skills (65):
  ├── frontend-development
  ├── backend-development
  ├── databases
  └── ...
```

---

### 2.4 `ak update` ⭐ NEW

**Mục đích:** Sync/update từ source templates mới

**Syntax:**
```bash
ak update                           # Update từ source đã config
ak update --source ~/AGENTS.md      # Update từ source mới
ak update --skills                  # Chỉ update skills
ak update --agents                  # Chỉ update agents
ak update --all                     # Update tất cả
ak update --force                   # Không hỏi confirm
```

**Flow:**
```
1. Đọc .ak-config.json để lấy source path và kit đã dùng
2. So sánh files (modified time hoặc hash)
3. Hiển thị những gì sẽ được update
4. Hỏi confirm (trừ khi --force)
5. Copy files mới từ source
6. Cập nhật .ak-config.json
```

**Use cases:**
- Bạn pull repo AGENTS.md mới về → chạy `ak update` để đồng bộ
- Bạn muốn thêm skill mới từ source → `ak update --skills`
- Team share source qua git → mỗi người `ak update` khi có thay đổi

---

## 3. Config Files

### 3.1 `.ak-config.json` (trong mỗi project)

```json
{
  "version": "1.0.0",
  "createdAt": "2024-01-15T10:00:00Z",
  "kit": "engineer",
  "source": "/Users/you/AGENTS.md",
  "installed": {
    "agents": ["planner", "debugger", "fullstack-developer"],
    "commands": ["plan", "code", "fix"],
    "skills": ["frontend-development", "databases"],
    "workflows": ["feature-development"]
  },
  "lastUpdate": "2024-01-15T10:00:00Z"
}
```

### 3.2 `~/.ak-cli.json` (global config)

```json
{
  "defaultSource": "/Users/you/AGENTS.md",
  "defaultKit": "engineer",
  "autoUpdate": false
}
```

---

## 4. Các Kits Có Sẵn

| Kit | Agents | Commands | Skills | Router | Hooks |
|-----|--------|----------|--------|--------|-------|
| **engineer** | 7 | 17 | 7 | ✅ | ✅ |
| **researcher** | 6 | 10 | 4 | ✅ | ❌ |
| **designer** | 3 | 5 | 3 | ❌ | ✅ |
| **minimal** | 2 | 3 | 2 | ❌ | ❌ |
| **full** | ALL | ALL | ALL | ✅ | ✅ |
| **custom** | Tự chọn | Tự chọn | Tự chọn | Tự chọn | Tự chọn |

---

## 5. Cấu Trúc Source Code

```
agent-kit-cli/
├── bin/
│   └── ak.js              # CLI entry point (#!/usr/bin/env node)
├── src/
│   ├── commands/
│   │   ├── init.js        # ak init
│   │   ├── add.js         # ak add
│   │   ├── list.js        # ak list
│   │   └── update.js      # ak update ⭐
│   ├── kits/
│   │   └── index.js       # Kit definitions
│   ├── utils/
│   │   ├── paths.js       # Path helpers
│   │   ├── copy.js        # File copy logic
│   │   ├── prompts.js     # Interactive prompts
│   │   ├── config.js      # Config management
│   │   └── diff.js        # Compare files for update ⭐
│   └── index.js           # Main exports
├── templates/             # Fallback templates (optional)
│   └── base/
├── package.json
├── README.md
├── LICENSE
└── PLAN.md                # This file
```

---

## 6. Tính Năng Đặc Biệt

### 6.1 Multi-Source Support
```bash
ak init my-app --source ~/AGENTS.md --kit engineer
ak init my-app --source ~/other-agents --kit custom
```

### 6.2 Interactive Mode
```
$ ak init my-app

? Select a kit: (Use arrow keys)
❯ 🛠️  engineer    - Full-stack development
  🔬  researcher  - Research and analysis
  🎨  designer    - UI/UX design
  📦  minimal     - Lightweight
  🚀  full        - Everything
  🔧  custom      - Pick your own

? Select agents: (Press <space> to select)
❯ ◯ planner
  ◉ debugger
  ◯ fullstack-developer
  ...
```

### 6.3 Smart Update
```bash
$ ak update

Checking for updates from /Users/you/AGENTS.md...

Changes detected:
  📝 Modified: skills/databases/SKILL.md
  ➕ New: skills/ai-security/
  ➕ New: commands/security.md

? Apply these updates? (Y/n)
```

### 6.4 Publish to NPM

```bash
# Sau khi hoàn thành
cd agent-kit-cli
npm publish

# Người khác cài đặt
npm install -g agent-kit-cli
ak init my-project --kit engineer
```

---

## 7. Workflow Sử Dụng

### Scenario 1: Tạo project mới
```bash
cd ~/projects
ak init my-api --kit engineer
cd my-api
# Start coding with Claude Code
```

### Scenario 2: Thêm skill vào project
```bash
cd my-api
ak add skill:databases
ak add skill:devops
```

### Scenario 3: Update khi có source mới
```bash
# Bạn pull repo AGENTS.md mới
cd ~/AGENTS.md
git pull

# Về project và update
cd ~/projects/my-api
ak update
```

### Scenario 4: Share cho team
```bash
# Publish lên npm
npm publish

# Team member cài
npm install -g agent-kit-cli
ak init --source https://github.com/team/agents.git
```

---

## 8. Tiến Độ Thực Hiện

| Task | Status | Priority |
|------|--------|----------|
| Cấu trúc project | ✅ Done | P0 |
| Kit definitions | ✅ Done | P0 |
| `ak init` command | 🔄 In Progress | P0 |
| `ak list` command | ⏳ Pending | P0 |
| `ak add` command | ⏳ Pending | P1 |
| `ak update` command | ⏳ Pending | P1 |
| Interactive prompts | ⏳ Pending | P1 |
| Config management | ⏳ Pending | P1 |
| README.md | ⏳ Pending | P2 |
| npm publish prep | ⏳ Pending | P2 |

---

## 9. Câu Hỏi Cho Bạn

1. **Source mặc định**: CLI nên tìm source ở đâu?
   - [ ] Yêu cầu --source mỗi lần
   - [ ] Lưu global config ~/.ak-cli.json
   - [ ] Tìm trong parent directories

2. **Output folder**: Tạo `.claude/` hay folder khác?
   - [ ] `.claude/` (cho Claude Code)
   - [ ] `.opencode/` (cho OpenCode)
   - [ ] `.agent/` (generic)
   - [ ] Cho chọn

3. **Update strategy**: Khi update, làm gì với local changes?
   - [ ] Backup rồi overwrite
   - [ ] Merge (phức tạp)
   - [ ] Chỉ update unchanged files

---

**Bạn xem plan này và cho tôi biết:**
- Có tính năng nào cần thêm/bớt?
- Trả lời các câu hỏi ở Section 9
- Tôi sẽ tiếp tục implement!
