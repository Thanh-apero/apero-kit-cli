---
description: 👁️ Open plan in browser for easy reading
argument-hint: [plan-path]
---

## Your mission

Open the plan preview server to view the plan in a nicely formatted web page.

## Workflow

1. **Determine plan path:**
   - If `$ARGUMENTS` provided → Use that path
   - If active plan exists in `## Plan Context` → Use that path
   - If neither → Ask user to specify a plan path

2. **Start preview server:**

   ```bash
   node .claude/scripts/plan-preview.cjs {plan-path}
   ```

3. **Inform user:**
   - Browser will open automatically
   - Server runs on `http://localhost:3456`
   - Press `Ctrl+C` in terminal to stop

## Example Usage

```
/plan:preview plans/250116-feature-auth
/plan:preview  # Uses active plan from context
```

## Notes

- The preview server renders markdown with syntax highlighting
- Navigation sidebar shows all plan files (plan.md, phases, reports)
- Server auto-detects plan structure (research/, reports/, scout/ subdirs)
- Refresh the page to see updated content
