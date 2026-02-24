---
name: auto-intent-router
description: Automatically detects user intent and routes to appropriate skill without manual commands
user-invocable: false
disable-model-invocation: false
metadata: {"openclaw": {"always": true, "priority": 1}}
---

# Auto Intent Router

## Purpose

This skill runs on EVERY message to detect user intent and automatically activate the appropriate skill. Users don't need to type commands like `/plan` or `/brainstorm` - the bot understands natural language.

## Priority

This skill has highest priority (runs first) to route messages before other processing.

## Intent Detection Matrix

| Intent | Keywords/Patterns | Activated Skill |
|--------|-------------------|-----------------|
| **PLANNING** | plan, design, architect, implement, create, build feature | `planning`, `plan-fast`, `plan-hard` |
| **BRAINSTORMING** | brainstorm, ideas, options, alternatives, think about, explore | `brainstorm` |
| **DEBUGGING** | fix, debug, error, broken, bug, issue, not working, crash | `debugging`, `fix-fast`, `fix-hard` |
| **CODE REVIEW** | review, check my code, look at this, audit, examine | `code-review` |
| **CODING** | code, implement, write, develop, create function | `code`, `cook` |
| **TESTING** | test, unit test, spec, coverage, jest, vitest | `testing` |
| **DATABASE** | database, schema, migration, query, sql, table | `database` |
| **API DESIGN** | api, endpoint, rest, graphql, route | `api-design` |
| **DOCUMENTATION** | document, docs, readme, explain, describe | `documentation` |
| **DEPLOYMENT** | deploy, release, staging, production, ci/cd | `deployment` |
| **TRAINING** | train, learn, teach, add knowledge, remember | `train-prompt` |
| **SCOUTING** | find, search, where is, locate, explore codebase | `scout` |

## Detection Algorithm

```
1. EXTRACT keywords from user message
2. MATCH against intent patterns
3. CALCULATE confidence score for each intent
4. IF confidence > 0.7:
     ACTIVATE corresponding skill
   ELSE IF multiple intents detected:
     ASK user for clarification
   ELSE:
     PROCEED with general response
```

## Confidence Scoring

```
score = (keyword_matches * 0.4) + (pattern_matches * 0.3) + (context_relevance * 0.3)

- keyword_matches: Number of intent keywords found
- pattern_matches: Regex patterns matched
- context_relevance: Based on conversation history
```

## Workflow

### Step 1: Parse Message

Extract:
- Primary keywords
- Question type (how, what, why, can you)
- Code references (file paths, function names)
- URLs or links

### Step 2: Intent Classification

For each potential intent:
1. Count keyword matches
2. Check pattern matches
3. Consider conversation context
4. Calculate confidence score

### Step 3: Route or Clarify

**High Confidence (>0.7):**
```
Silently activate the matched skill.
User sees natural response, not "Activating planning skill..."
```

**Medium Confidence (0.4-0.7):**
```
"I think you want to [intent]. Should I:
A) Create a plan for this
B) Brainstorm alternatives first
C) Just help directly"
```

**Low Confidence (<0.4):**
```
Respond naturally without special skill activation.
```

## Examples

### Example 1: Planning Intent
```
User: "I need to add user authentication to the app"

[Intent Detection]
Keywords: "add", "authentication", "app"
Pattern: "I need to" + feature description
Confidence: PLANNING = 0.85

[Action]
Activate: planning skill
Response: "I'll help you plan the authentication system..."
```

### Example 2: Debugging Intent
```
User: "The login button isn't working anymore"

[Intent Detection]
Keywords: "isn't working"
Pattern: [component] + "not working"
Confidence: DEBUGGING = 0.9

[Action]
Activate: debugging skill
Response: "Let me investigate the login button issue..."
```

### Example 3: Ambiguous Intent
```
User: "Can you help with the API?"

[Intent Detection]
Keywords: "API"
Confidence: API_DESIGN = 0.5, DEBUGGING = 0.4

[Action]
Clarify: "I can help with the API. Do you want to:
A) Design new endpoints
B) Fix an existing issue
C) Review the current implementation"
```

### Example 4: Training Intent
```
User: "Learn this documentation: https://docs.stripe.com/api"

[Intent Detection]
Keywords: "learn", URL present
Confidence: TRAINING = 0.95

[Action]
Activate: train-prompt skill
Response: "I'll learn from the Stripe API documentation..."
```

## Context Awareness

The router considers conversation history:

- If previous message was about planning → lower threshold for planning-related follow-ups
- If user just shared code → debugging/review more likely
- If discussing architecture → planning/design more likely

## Override Behavior

Users can still use explicit commands to override:
- `/plan` - Force planning mode
- `/brainstorm` - Force brainstorming mode
- `/fix` - Force debugging mode

Explicit commands bypass intent detection.

## Configuration

Skills can declare their trigger conditions in their SKILL.md frontmatter:

```yaml
metadata: {
  "openclaw": {
    "triggers": {
      "keywords": ["plan", "design", "architect"],
      "patterns": ["how should I", "best way to"],
      "confidence_boost": 0.1
    }
  }
}
```

## Performance Notes

- Intent detection runs in <50ms
- Only loads full skill content after routing
- Caches recent intent classifications
- Batches multiple skill reads when needed
