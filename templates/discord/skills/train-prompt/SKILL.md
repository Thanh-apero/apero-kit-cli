---
name: train-prompt
description: Add new documents, links, or knowledge to train and expand bot capabilities
user-invocable: true
disable-model-invocation: false
metadata: {"openclaw": {"always": true}}
---

# Train Prompt - Auto Learning System

## Trigger Conditions

Activate when user:
- Says: "train", "learn", "add knowledge", "teach you"
- Provides: URL, document link, file path
- Requests: "remember this", "add this to your knowledge"
- Commands: "/train", "/learn", "/add-doc"

## Input Types Supported

1. **URLs** - Web pages, documentation, articles
2. **Files** - Markdown, PDF, text files
3. **Inline content** - Direct text/instructions
4. **GitHub repos** - Repository documentation

## Workflow

### Step 1: Detect Input Type

```
IF input contains URL → fetch_and_process_url
IF input contains file path → read_and_process_file
IF input is inline text → process_inline_content
IF input is GitHub URL → clone_and_extract_docs
```

### Step 2: Process Content

#### For URLs:
1. Fetch URL content using `web_fetch` tool
2. Extract main content (remove nav, ads, etc.)
3. Convert to markdown format
4. Identify key concepts and patterns

#### For Files:
1. Read file content
2. Parse based on file type (md, pdf, txt)
3. Extract structured information

#### For Inline Content:
1. Parse user's instructions
2. Identify intent and knowledge type
3. Structure as skill or reference

### Step 3: Generate Skill/Reference

Based on content type, create:

**A) New Skill** (if content describes a workflow/process):
```
skills/<skill-name>/
├── SKILL.md          ← Generated skill definition
└── references/
    └── source.md     ← Original content
```

**B) Reference Document** (if content is documentation):
```
skills/<parent-skill>/
└── references/
    └── <doc-name>.md ← Extracted knowledge
```

**C) Bootstrap Update** (if content is identity/rules):
```
Append to SOUL.md or AGENTS.md
```

### Step 4: Skill Generation Template

For new skills, generate:

```yaml
---
name: {extracted-name}
description: {one-line-summary}
user-invocable: true
metadata: {"openclaw": {"always": true, "source": "{original-url-or-path}"}}
---

# {Skill Title}

## Purpose
{extracted-purpose}

## Trigger Conditions
Activate when user mentions:
{extracted-keywords}

## Workflow
{extracted-steps}

## Reference
Source: {original-source}
Added: {timestamp}
```

### Step 5: Confirm & Save

1. Show preview of generated skill/reference
2. Ask user to confirm or edit
3. Save to appropriate location
4. Update skill index

## Commands

### /train <url>
Fetch and learn from a URL.

Example:
```
/train https://docs.example.com/api-guide
```

### /train:file <path>
Learn from a local file.

Example:
```
/train:file ./docs/coding-standards.md
```

### /train:inline
Learn from inline content.

Example:
```
/train:inline
When handling API errors:
1. Log the error with context
2. Return appropriate HTTP status
3. Never expose internal details
```

### /train:github <repo-url>
Extract knowledge from GitHub repository.

Example:
```
/train:github https://github.com/example/repo
```

### /train:list
Show all trained knowledge sources.

### /train:remove <skill-name>
Remove a trained skill.

## Output Format

After training:

```markdown
## Training Complete

**Source:** {url-or-path}
**Type:** {skill|reference|bootstrap}
**Location:** {saved-path}

### Generated Knowledge

**Skill:** {skill-name}
**Description:** {description}
**Triggers:** {keyword-list}

### Next Steps
- Test with: "{example-trigger}"
- Edit at: {file-path}
- View all: /train:list
```

## Storage Structure

```
.discord/
├── skills/
│   ├── trained/                    ← Auto-generated skills
│   │   ├── api-docs-example/
│   │   │   ├── SKILL.md
│   │   │   └── references/
│   │   │       └── source.md
│   │   └── coding-standards/
│   │       └── SKILL.md
│   └── train-prompt/               ← This skill
│       └── SKILL.md
├── knowledge/                      ← Reference documents
│   ├── sources.json               ← Index of all sources
│   └── docs/
│       ├── doc-001.md
│       └── doc-002.md
└── SOUL.md                        ← Updated with rules
```

## Knowledge Index (sources.json)

```json
{
  "sources": [
    {
      "id": "src-001",
      "type": "url",
      "source": "https://docs.example.com/api",
      "skill": "api-docs-example",
      "added": "2024-01-15T10:30:00Z",
      "keywords": ["api", "rest", "endpoints"]
    }
  ],
  "stats": {
    "total_skills": 5,
    "total_references": 12,
    "last_updated": "2024-01-15T10:30:00Z"
  }
}
```

## Advanced Features

### Auto-Refresh
For URLs, optionally set up periodic refresh:
```
/train <url> --refresh=daily
```

### Merge Knowledge
Combine multiple sources into one skill:
```
/train:merge skill-a skill-b --into=combined-skill
```

### Export Training
Export all trained knowledge:
```
/train:export --format=zip
```

## Security Notes

- Only fetch from trusted URLs
- Sanitize all external content
- Don't execute code from external sources
- Review generated skills before enabling

## Examples

### Example 1: Train from API Documentation
```
User: /train https://stripe.com/docs/api

Bot: Fetching Stripe API documentation...

Training Complete!

**Skill:** stripe-api
**Triggers:** "stripe", "payment", "checkout", "subscription"
**Capabilities:**
- Create payment intents
- Handle webhooks
- Manage subscriptions

Test with: "How do I create a Stripe checkout session?"
```

### Example 2: Train Custom Workflow
```
User: /train:inline
Our deployment process:
1. Run tests: npm test
2. Build: npm run build
3. Deploy staging: ./deploy.sh staging
4. Smoke test staging
5. Deploy prod: ./deploy.sh prod

Bot: Training Complete!

**Skill:** deployment-workflow
**Triggers:** "deploy", "release", "staging", "production"

Test with: "Help me deploy to staging"
```

### Example 3: Train from GitHub
```
User: /train:github https://github.com/company/styleguide

Bot: Cloning repository...
Found: README.md, CONTRIBUTING.md, docs/*.md

Training Complete!

**Skills Generated:**
1. code-style (from style-guide.md)
2. git-workflow (from CONTRIBUTING.md)
3. project-setup (from README.md)

Test with: "What's our code style for TypeScript?"
```
