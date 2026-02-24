# apero-kit-cli: Claude Code Features Inventory

**Date:** 2026-01-17 | **Total Features:** 93 commands, 59 skills, 17 agents, 15 hooks, 10 scripts

---

## 1. Commands (93 total)

Commands = step-by-step workflows for specific tasks. Organized by category:

| Category | Command | Description |
|----------|---------|-------------|
| **Fix (8)** | `/fix` | Standard bug fix workflow |
| | `/fix/fast` | Quick fix for simple issues |
| | `/fix/hard` | Complex bug investigation |
| | `/fix/ui` | UI/layout fixes |
| | `/fix/test` | Fix failing tests |
| | `/fix/types` | TypeScript type errors |
| | `/fix/ci` | CI/CD pipeline fixes |
| | `/fix/logs` | Fix based on log analysis |
| **Plan (9)** | `/plan` | Standard planning |
| | `/plan/fast` | Quick plan for small tasks |
| | `/plan/hard` | Complex system design |
| | `/plan/two` | Two-phase planning |
| | `/plan/validate` | Validate existing plan |
| | `/plan/parallel` | Multiple parallel plans |
| | `/plan/archive` | Archive completed plans |
| | `/plan/ci` | CI-focused planning |
| | `/plan/cro` | Conversion rate optimization |
| **Code (4)** | `/code` | Standard coding with tests |
| | `/code/auto` | Auto-generate code |
| | `/code/no-test` | Quick prototype, no tests |
| | `/code/parallel` | Parallel implementation |
| **Cook (7)** | `/cook` | Follow recipe workflow |
| | `/cook/fast` | Fast recipe execution |
| | `/cook/hard` | Complex recipe |
| | `/cook/parallel` | Parallel cooking |
| | `/cook/auto` | Auto cooking mode |
| | `/cook/auto/fast` | Fast auto cooking |
| | `/cook/auto/parallel` | Parallel auto cooking |
| **Design (6)** | `/design/fast` | Quick mockup |
| | `/design/good` | Production-ready UI |
| | `/design/screenshot` | Code from screenshot |
| | `/design/video` | Code from video |
| | `/design/3d` | Three.js/3D design |
| | `/design/describe` | Describe existing design |
| **Git (4)** | `/git/cm` | Commit changes |
| | `/git/pr` | Create pull request |
| | `/git/merge` | Merge branches |
| | `/git/cp` | Cherry-pick commits |
| **Docs (3)** | `/docs/init` | Initialize documentation |
| | `/docs/update` | Update docs |
| | `/docs/summarize` | Summarize docs |
| **Review (3)** | `/review` | General review |
| | `/review/codebase` | Full codebase review |
| | `/review/post-task` | Post-task review |
| **Skill (6)** | `/skill/add` | Add new skill |
| | `/skill/create` | Create skill |
| | `/skill/optimize` | Optimize skill |
| | `/skill/optimize/auto` | Auto-optimize |
| | `/skill/fix-logs` | Fix skill logs |
| | `/skill/plan` | Plan skill changes |
| **Content (4)** | `/content/fast` | Quick content |
| | `/content/good` | Quality content |
| | `/content/cro` | CRO content |
| | `/content/enhance` | Enhance content |
| **Bootstrap (4)** | `/bootstrap` | Project setup |
| | `/bootstrap/auto` | Auto bootstrap |
| | `/bootstrap/auto/fast` | Fast auto |
| | `/bootstrap/auto/parallel` | Parallel auto |
| **Integrate (2)** | `/integrate/sepay` | SePay integration |
| | `/integrate/polar` | Polar integration |
| **Other (33)** | `/test`, `/test/ui` | Testing |
| | `/build` | Build project |
| | `/debug` | Deep debugging |
| | `/scout`, `/scout/ext` | Internal/external search |
| | `/brainstorm` | Ideation |
| | `/pr` | Pull request |
| | `/context` | Context management |
| | `/investigate` | Investigation |
| | `/checkpoint` | Save checkpoint |
| | `/compact` | Compact operations |
| | `/release-notes` | Generate release notes |
| | `/review-changes` | Review changes |
| | `/journal` | Work journal |
| | `/kanban` | Task board |
| | `/lint` | Linting |
| | `/preview` | Preview changes |
| | `/performance` | Performance analysis |
| | `/migration` | Data migration |
| | `/db-migrate` | Database migration |
| | `/generate-dto` | Generate DTOs |
| | `/create-feature` | End-to-end feature |
| | `/code-simplifier` | Simplify code |
| | `/use-mcp` | Use MCP tools |
| | `/worktree` | Git worktree |
| | `/security` | Security check |
| | `/ask` | Q&A |
| | `/watzup` | Status check |
| | `/ck-help` | Help |
| | `/coding-level` | Set coding level |
| | `/feature` | Feature workflow |
| | `/fix-issue` | Fix GitHub issue |

---

## 2. Skills (59 total)

Skills = specialized knowledge modules. Key files in `templates/skills/*/SKILL.md`

| Category | Skill | Description |
|----------|-------|-------------|
| **UI/Design (8)** | ui-ux-pro-max | 50 styles, 21 palettes, 50 fonts |
| | frontend-design | Production UI design |
| | frontend-design-pro | Real photos integration |
| | frontend-development | React/TypeScript patterns |
| | ui-styling | Tailwind, shadcn/ui |
| | threejs | Three.js 3D development |
| | web-frameworks | Next.js, Turborepo |
| | webapp-testing | Playwright testing |
| **Backend (4)** | backend-development | Node, Python, Go, Rust |
| | databases | MongoDB, PostgreSQL |
| | better-auth | OAuth2, 2FA, sessions |
| | payment-integration | SePay, Polar |
| **Debug/Test (5)** | debugging | 4-step debug framework |
| | bug-diagnosis | Bug analysis workflow |
| | test-generation | BDD test templates |
| | tasks-test-generation | xUnit, Jest |
| | chrome-devtools | Puppeteer, CDP |
| **Architecture (3)** | arch-performance-optimization | Performance tuning |
| | arch-security-review | OWASP, security |
| | arch-cross-service-integration | Service integration |
| **Docs/Plan (7)** | documentation | 4-phase docs framework |
| | tasks-documentation | API docs templates |
| | feature-docs | Feature documentation |
| | readme-improvement | README best practices |
| | planning | Technical planning |
| | plan-analysis | Plan evaluation |
| | project-index | Structure indexing |
| **AI (3)** | ai-multimodal | Audio, video, image |
| | ai-artist | Prompt engineering |
| | google-adk-python | Google ADK |
| **DevOps (7)** | devops | Cloudflare, Docker, GCP |
| | mcp-builder | MCP server creation |
| | mcp-management | MCP tool management |
| | repomix | Codebase packaging |
| | package-upgrade | Dependency upgrade |
| | media-processing | FFmpeg, ImageMagick |
| | docs-seeker | Documentation search |
| **Review (4)** | code-review | Code review checklist |
| | dual-pass-review | Two-pass review |
| | tasks-code-review | PR review |
| | tasks-spec-update | Spec sync |
| **Research (5)** | research | Research framework |
| | problem-solving | 6 problem techniques |
| | sequential-thinking | Structured thinking |
| | feature-investigation | Code flow tracing |
| | branch-comparison | Git diff analysis |
| **Mobile/Commerce (2)** | mobile-development | RN, Flutter, Swift |
| | shopify | Shopify APIs, themes |
| **Skill Mgmt (3)** | skill-creator | Skill templates |
| | skill-share | Slack sharing |
| | claude-code | Claude Code docs |
| **Documents (4)** | docx | Word documents |
| | pdf | PDF processing |
| | pptx | PowerPoint |
| | xlsx | Excel |
| **Other (4)** | domain-name-brainstormer | Domain generation |
| | developer-growth-analysis | Growth insights |
| | planning-with-files | Manus-style planning |
| | template-skill | Skill template |

---

## 3. Agents (17 total)

Agents = expert personas for specific roles. Files in `templates/agents/*.md`

| Category | Agent | Role |
|----------|-------|------|
| **Dev (3)** | fullstack-developer | Code, components, features |
| | code-reviewer | Review, refactor suggestions |
| | tester | Test automation |
| **Debug (3)** | debugger | Bug hunting |
| | scout | Internal code search |
| | scout-external | External docs search |
| **Planning (3)** | planner | Architecture design |
| | project-manager | Progress tracking |
| | researcher | Tech research |
| **Design (3)** | ui-ux-designer | UI/UX design |
| | copywriter | Content writing |
| | brainstormer | Ideation |
| **Support (5)** | git-manager | Git operations |
| | database-admin | DB management |
| | docs-manager | Documentation |
| | mcp-manager | MCP tools |
| | journal-writer | Work logging |

---

## 4. Hooks (15 total)

Hooks = event-triggered automation. Files in `templates/hooks/*.cjs`

| Type | Hook | Trigger |
|------|------|---------|
| **Init (2)** | session-init.cjs | Session start |
| | subagent-init.cjs | Subagent launch |
| **Edit (2)** | post-edit-prettier.cjs | After file edit |
| | write-compact-marker.cjs | On file write |
| **Review (3)** | post-task-review.cjs | Task completion |
| | workflow-router.cjs | Workflow selection |
| | dev-rules-reminder.cjs | During coding |
| **Security (2)** | privacy-block.cjs | Data access |
| | scout-block.cjs | Search filtering |
| **Context (4)** | backend-csharp-context.cjs | C# work |
| | frontend-typescript-context.cjs | TS work |
| | design-system-context.cjs | UI design |
| | scss-styling-context.cjs | SCSS work |
| **Notify (2)** | notify-waiting.js | AI waiting |
| | session-end.cjs | Session end |

---

## 5. Scripts (10 total)

Scripts = utility tools. Files in `templates/scripts/`

| Script | Purpose | Language |
|--------|---------|----------|
| scan_skills.py | Scan skills directory | Python |
| scan_commands.py | Scan commands directory | Python |
| generate_catalogs.py | Generate skill/command catalogs | Python |
| worktree.cjs | Git worktree management | Node.js |
| set-active-plan.cjs | Set current active plan | Node.js |
| plan-preview.cjs | Preview plan | Node.js |
| resolve_env.py | Environment variable resolution | Python |
| ck-help.py | Command help system | Python |
| win_compat.py | Windows compatibility | Python |
| requirements.txt | Python dependencies | - |

---

## Summary

| Category | Count | Key Pattern |
|----------|-------|-------------|
| Commands | 93 | `/category/variant` structure |
| Skills | 59 | `SKILL.md` + `references/` |
| Agents | 17 | Role-based personas |
| Hooks | 15 | Event-driven `.cjs` files |
| Scripts | 10 | Python + Node.js utilities |

**Total features: 194**
