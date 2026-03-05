# Refactor CLI Target Architecture

## Status: COMPLETED

## Problem Statement

Khi chạy `ak init` và chọn target "gemini" hoặc "discord", CLI vẫn tải các files ở định dạng Claude (`.claude/`) thay vì chỉ tải files phù hợp với target đã chọn.

**Root Causes:**
1. Kit definitions target-agnostic - không phân biệt target
2. Source luôn resolve tới Claude templates
3. Claude-only features (router, hooks, workflows) vẫn defined trong all kits
4. Logic xử lý target nằm rải rác trong `copy.ts` và `init.ts`

## Proposed Architecture

### 1. Target Adapter Pattern

```
src/targets/
├── index.ts              # Target registry
├── base-adapter.ts       # Abstract base class
├── claude-adapter.ts     # Claude Code adapter
├── gemini-adapter.ts     # Gemini CLI adapter
└── discord-adapter.ts    # Discord/OpenClaw adapter
```

Mỗi adapter định nghĩa:
- `name`: Target identifier
- `displayName`: Tên hiển thị
- `directory`: Output directory (`.claude`, `.gemini`, `.discord`)
- `supports`: Features được hỗ trợ (agents, skills, commands, workflows, router, hooks)
- `convert()`: Convert format từ source
- `copyBaseFiles()`: Copy target-specific base files

### 2. Feature Support Matrix

| Feature    | Claude | Gemini | Discord |
|------------|--------|--------|---------|
| agents     | ✓      | ✓      | ✓       |
| skills     | ✓      | ✓      | ✓       |
| commands   | ✓      | ✓ TOML | ✓ JSON5 |
| workflows  | ✓      | ✗      | ✗       |
| router     | ✓      | ✗      | ✗       |
| hooks      | ✓      | ✗      | ✗       |
| memory     | ✓      | ✗      | ✗       |
| scripts    | ✓      | ✗      | ✗       |

### 3. Kit Filtering

Kit sẽ được filter dựa trên target capabilities:
- Nếu kit có `includeRouter: true` nhưng target không support → skip
- Nếu kit có workflows nhưng target không support → skip workflows

### 4. New Init Flow

```
1. Select target(s)
2. Load target adapter(s)
3. Select kit
4. Filter kit features by target capabilities
5. For each target:
   a. Validate kit features against target
   b. Use adapter to copy/convert files
   c. Create target-specific state
```

## Implementation Plan

### Phase 1: Create Target Infrastructure

1. **Create `src/targets/types.ts`** - Define interfaces
2. **Create `src/targets/base-adapter.ts`** - Abstract base
3. **Create adapters** - claude, gemini, discord
4. **Create `src/targets/index.ts`** - Registry

### Phase 2: Refactor Copy Logic

1. Move conversion functions to adapters
2. Remove duplicate code from `copy.ts`
3. Each adapter implements its own copy methods

### Phase 3: Update Init Command

1. Use adapter pattern in init
2. Filter kit by target capabilities
3. Show target-specific messages

### Phase 4: Update Kits

1. Remove features not universally supported from default values
2. Add target compatibility metadata

## File Changes

### New Files
- `src/targets/types.ts`
- `src/targets/base-adapter.ts`
- `src/targets/claude-adapter.ts`
- `src/targets/gemini-adapter.ts`
- `src/targets/discord-adapter.ts`
- `src/targets/index.ts`

### Modified Files
- `src/commands/init.ts` - Use adapters
- `src/kits/index.ts` - Add target compatibility
- `src/utils/copy.ts` - Simplify, move logic to adapters

### Deleted/Deprecated
- Target-specific functions in `copy.ts` → moved to adapters

## Benefits

1. **Extensibility** - Add new target = create new adapter
2. **Separation of Concerns** - Each target's logic isolated
3. **Type Safety** - Clear interfaces for capabilities
4. **Maintainability** - Changes to one target don't affect others
5. **Clarity** - Easy to see what each target supports
