# Implementation Plan: Parallel Safety Enforcer Hook

## Context

### Problem
When Paul delegates multiple tasks in parallel (via `run_in_background=true`), there's no mechanism to prevent two agents from modifying the same file simultaneously, leading to:
- Race conditions
- Lost changes
- Corrupted code

### Solution
Create a hook that tracks pending file modifications and blocks parallel tasks that would conflict.

---

## Objectives & Deliverables

### Core Objective
Prevent file conflicts during parallel agent delegation.

### Concrete Deliverables
1. `src/hooks/parallel-safety-enforcer/index.ts` - Main hook
2. `src/hooks/parallel-safety-enforcer/constants.ts` - Configuration
3. `src/hooks/parallel-safety-enforcer/file-tracker.ts` - File tracking logic
4. `src/hooks/parallel-safety-enforcer/index.test.ts` - Tests
5. Updated `src/hooks/index.ts` - Export new hook

### Must Have
- Block parallel tasks targeting same file
- Track files per parent session
- Clear tracking on task completion
- Allow sequential execution of conflicting tasks

### Must NOT Have
- Breaking changes to existing hooks
- Performance degradation for non-parallel tasks
- False positives blocking unrelated tasks

---

## Task Flow

```
1. Create constants.ts (config, patterns)
       ↓
2. Create file-tracker.ts (state management)
       ↓
3. Create index.ts (hook logic)
       ↓
4. Create index.test.ts (tests)
       ↓
5. Register in hooks/index.ts
       ↓
6. Run tests & verify
```

---

## TODOs

### Task 1: Create constants.ts
**What to do:**
```typescript
// src/hooks/parallel-safety-enforcer/constants.ts
export const HOOK_NAME = "parallel-safety-enforcer"

// File path extraction patterns
export const FILE_PATH_PATTERNS = [
  /(?:modify|edit|update|change|create|write)\s+[`"']?([^\s`"']+\.\w+)[`"']?/gi,
  /(?:file|path):\s*[`"']?([^\s`"']+\.\w+)[`"']?/gi,
  /src\/[^\s`"']+\.\w+/g,
  /\.paul\/[^\s`"']+\.md/g,
  /\.sisyphus\/[^\s`"']+\.md/g,
]

// Tools that can run in background
export const BACKGROUND_CAPABLE_TOOLS = ["delegate_task", "task"]

// Maximum parallel tasks per session (additional safety limit)
export const MAX_PARALLEL_TASKS = 3
```

**Acceptance Criteria:**
- Constants exported and importable
- Patterns match common file references in prompts

---

### Task 2: Create file-tracker.ts
**What to do:**
```typescript
// src/hooks/parallel-safety-enforcer/file-tracker.ts
import { FILE_PATH_PATTERNS } from "./constants"

interface PendingTask {
  taskId: string
  files: Set<string>
  startTime: number
}

// Track pending files per parent session
const pendingBySession = new Map<string, Map<string, PendingTask>>()

export function extractFilesFromPrompt(prompt: string): string[] {
  const files = new Set<string>()
  for (const pattern of FILE_PATH_PATTERNS) {
    const matches = prompt.matchAll(new RegExp(pattern))
    for (const match of matches) {
      const file = match[1] || match[0]
      if (file && !file.includes('*')) { // Skip glob patterns
        files.add(normalizeFilePath(file))
      }
    }
  }
  return Array.from(files)
}

function normalizeFilePath(filePath: string): string {
  return filePath.toLowerCase().replace(/\\/g, '/')
}

export function checkFileConflicts(
  parentSessionID: string,
  files: string[]
): { hasConflict: boolean; conflictingFile?: string; conflictingTaskId?: string } {
  const sessionTasks = pendingBySession.get(parentSessionID)
  if (!sessionTasks) {
    return { hasConflict: false }
  }

  for (const file of files) {
    const normalized = normalizeFilePath(file)
    for (const [taskId, task] of sessionTasks) {
      if (task.files.has(normalized)) {
        return { 
          hasConflict: true, 
          conflictingFile: file, 
          conflictingTaskId: taskId 
        }
      }
    }
  }
  return { hasConflict: false }
}

export function registerPendingFiles(
  parentSessionID: string,
  taskId: string,
  files: string[]
): void {
  if (!pendingBySession.has(parentSessionID)) {
    pendingBySession.set(parentSessionID, new Map())
  }
  const sessionTasks = pendingBySession.get(parentSessionID)!
  sessionTasks.set(taskId, {
    taskId,
    files: new Set(files.map(normalizeFilePath)),
    startTime: Date.now(),
  })
}

export function clearPendingFiles(
  parentSessionID: string,
  taskId: string
): void {
  const sessionTasks = pendingBySession.get(parentSessionID)
  if (sessionTasks) {
    sessionTasks.delete(taskId)
    if (sessionTasks.size === 0) {
      pendingBySession.delete(parentSessionID)
    }
  }
}

export function getPendingTaskCount(parentSessionID: string): number {
  return pendingBySession.get(parentSessionID)?.size ?? 0
}

export function clearSessionState(parentSessionID: string): void {
  pendingBySession.delete(parentSessionID)
}

// For testing
export function _resetState(): void {
  pendingBySession.clear()
}
```

**Acceptance Criteria:**
- Extracts file paths from natural language prompts
- Detects conflicts between pending tasks
- Properly clears state on completion

---

### Task 3: Create index.ts (main hook)
**What to do:**
```typescript
// src/hooks/parallel-safety-enforcer/index.ts
import type { PluginInput } from "@opencode-ai/plugin"
import { 
  HOOK_NAME, 
  BACKGROUND_CAPABLE_TOOLS, 
  MAX_PARALLEL_TASKS 
} from "./constants"
import {
  extractFilesFromPrompt,
  checkFileConflicts,
  registerPendingFiles,
  clearPendingFiles,
  getPendingTaskCount,
} from "./file-tracker"
import { log } from "../../shared/logger"

export * from "./constants"
export * from "./file-tracker"

// Map callID to taskId for cleanup
const callToTaskMap = new Map<string, { parentSessionID: string; taskId: string }>()

export function createParallelSafetyEnforcerHook(ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      if (!BACKGROUND_CAPABLE_TOOLS.includes(input.tool)) {
        return
      }

      const isBackground = output.args.run_in_background === true
      if (!isBackground) {
        return
      }

      const prompt = (output.args.prompt as string) || ""
      const parentSessionID = input.sessionID
      const taskId = `task_${input.callID}`

      // Check max parallel limit
      const pendingCount = getPendingTaskCount(parentSessionID)
      if (pendingCount >= MAX_PARALLEL_TASKS) {
        log(`[${HOOK_NAME}] BLOCKED: Max parallel tasks (${MAX_PARALLEL_TASKS}) reached`, {
          sessionID: parentSessionID,
          pendingCount,
        })
        throw new Error(
          `[${HOOK_NAME}] PARALLEL LIMIT: Maximum ${MAX_PARALLEL_TASKS} parallel tasks allowed.\n` +
          `Currently ${pendingCount} tasks pending. Wait for some to complete or run sequentially.`
        )
      }

      // Extract and check files
      const files = extractFilesFromPrompt(prompt)
      if (files.length === 0) {
        // No files detected - allow but warn
        log(`[${HOOK_NAME}] Warning: No files detected in prompt, allowing parallel execution`, {
          sessionID: parentSessionID,
          taskId,
        })
        return
      }

      const conflict = checkFileConflicts(parentSessionID, files)
      if (conflict.hasConflict) {
        log(`[${HOOK_NAME}] BLOCKED: File conflict detected`, {
          sessionID: parentSessionID,
          conflictingFile: conflict.conflictingFile,
          conflictingTaskId: conflict.conflictingTaskId,
        })
        throw new Error(
          `[${HOOK_NAME}] FILE CONFLICT: Cannot run parallel task.\n` +
          `File '${conflict.conflictingFile}' is already being modified by task '${conflict.conflictingTaskId}'.\n` +
          `Options:\n` +
          `1. Wait for the other task to complete\n` +
          `2. Run this task with run_in_background=false (sequential)\n` +
          `3. Modify a different file`
        )
      }

      // Register files as pending
      registerPendingFiles(parentSessionID, taskId, files)
      callToTaskMap.set(input.callID, { parentSessionID, taskId })

      log(`[${HOOK_NAME}] Registered parallel task`, {
        sessionID: parentSessionID,
        taskId,
        files,
      })
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { output?: string; error?: Error }
    ): Promise<void> => {
      const mapping = callToTaskMap.get(input.callID)
      if (mapping) {
        clearPendingFiles(mapping.parentSessionID, mapping.taskId)
        callToTaskMap.delete(input.callID)
        log(`[${HOOK_NAME}] Cleared pending files for task`, {
          taskId: mapping.taskId,
        })
      }
    },
  }
}
```

**Acceptance Criteria:**
- Blocks parallel tasks with file conflicts
- Enforces max parallel task limit (3)
- Clears state after task completion
- Provides clear error messages with options

---

### Task 4: Create index.test.ts
**What to do:**
```typescript
// src/hooks/parallel-safety-enforcer/index.test.ts
import { describe, test, expect, beforeEach } from "bun:test"
import {
  extractFilesFromPrompt,
  checkFileConflicts,
  registerPendingFiles,
  clearPendingFiles,
  _resetState,
} from "./file-tracker"

describe("parallel-safety-enforcer", () => {
  beforeEach(() => {
    _resetState()
  })

  describe("extractFilesFromPrompt", () => {
    test("should extract file paths from natural language", () => {
      const prompt = "Edit src/hooks/test.ts to add the new function"
      const files = extractFilesFromPrompt(prompt)
      expect(files).toContain("src/hooks/test.ts")
    })

    test("should extract multiple files", () => {
      const prompt = "Modify src/a.ts and src/b.ts"
      const files = extractFilesFromPrompt(prompt)
      expect(files.length).toBe(2)
    })

    test("should handle quoted paths", () => {
      const prompt = 'Update file: "src/components/Button.tsx"'
      const files = extractFilesFromPrompt(prompt)
      expect(files).toContain("src/components/button.tsx")
    })
  })

  describe("checkFileConflicts", () => {
    test("should detect conflict when same file is pending", () => {
      registerPendingFiles("session-1", "task-1", ["src/test.ts"])
      const result = checkFileConflicts("session-1", ["src/test.ts"])
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingFile).toBe("src/test.ts")
    })

    test("should not detect conflict for different files", () => {
      registerPendingFiles("session-1", "task-1", ["src/a.ts"])
      const result = checkFileConflicts("session-1", ["src/b.ts"])
      expect(result.hasConflict).toBe(false)
    })

    test("should not detect conflict across different sessions", () => {
      registerPendingFiles("session-1", "task-1", ["src/test.ts"])
      const result = checkFileConflicts("session-2", ["src/test.ts"])
      expect(result.hasConflict).toBe(false)
    })
  })

  describe("clearPendingFiles", () => {
    test("should clear files after task completion", () => {
      registerPendingFiles("session-1", "task-1", ["src/test.ts"])
      clearPendingFiles("session-1", "task-1")
      const result = checkFileConflicts("session-1", ["src/test.ts"])
      expect(result.hasConflict).toBe(false)
    })
  })
})
```

**Acceptance Criteria:**
- All tests pass
- Covers file extraction, conflict detection, cleanup

---

### Task 5: Register hook in hooks/index.ts
**What to do:**
- Import `createParallelSafetyEnforcerHook` from `./parallel-safety-enforcer`
- Add to the hooks array/object where other hooks are registered

**Acceptance Criteria:**
- Hook is loaded on startup
- No import errors

---

### Task 6: Run tests & verify
**What to do:**
```bash
bun test src/hooks/parallel-safety-enforcer/
bun run typecheck
bun run build
```

**Acceptance Criteria:**
- All tests pass
- No type errors
- Build succeeds

---

## Parallelization

```
Task 1 (constants) ──┐
                     ├── Task 3 (index.ts) ── Task 5 (register) ── Task 6 (verify)
Task 2 (tracker)  ───┘
                     │
Task 4 (tests) ──────┘
```

Tasks 1, 2, 4 can run in parallel. Tasks 3, 5, 6 are sequential.

---

## Verification Checklist

- [ ] Hook blocks parallel tasks with same file
- [ ] Hook allows parallel tasks with different files
- [ ] Hook enforces max 3 parallel tasks
- [ ] Hook clears state on task completion
- [ ] Error messages are clear and actionable
- [ ] All tests pass
- [ ] No type errors
- [ ] Build succeeds
