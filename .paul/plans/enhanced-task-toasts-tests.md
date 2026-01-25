# Test Specifications: Enhanced Task Toast Notifications

## Overview

TDD test specifications for the enhanced task toast feature. Tests should be written BEFORE implementation (RED phase).

## Unit Tests

### 1. `src/features/task-toast-manager/types.test.ts` (NEW)

```typescript
describe("TrackedTask type", () => {
  test("should accept optional tokens field", () => {
    const task: TrackedTask = {
      id: "test-1",
      description: "Test task",
      agent: "explore",
      status: "running",
      startedAt: new Date(),
      isBackground: true,
      tokens: { input: 1000, output: 500 }  // Optional field
    }
    expect(task.tokens?.input).toBe(1000)
  })

  test("should accept optional result field", () => {
    const task: TrackedTask = {
      id: "test-1",
      description: "Test task",
      agent: "explore",
      status: "completed",
      startedAt: new Date(),
      isBackground: true,
      result: "Task completed successfully"
    }
    expect(task.result).toBe("Task completed successfully")
  })

  test("should work without optional fields", () => {
    const task: TrackedTask = {
      id: "test-1",
      description: "Test task",
      agent: "explore",
      status: "running",
      startedAt: new Date(),
      isBackground: true
    }
    expect(task.tokens).toBeUndefined()
    expect(task.result).toBeUndefined()
  })
})
```

### 2. `src/features/task-toast-manager/token-utils.test.ts` (NEW)

```typescript
describe("getSessionTokenUsage", () => {
  test("should return token totals from session messages", async () => {
    // #given - mock client with messages containing tokens
    const mockClient = {
      session: {
        messages: mock(() => Promise.resolve({
          data: [
            { info: { role: "user" } },
            { info: { role: "assistant", tokens: { input: 500, output: 200, cache: { read: 100 } } } },
            { info: { role: "assistant", tokens: { input: 800, output: 300, cache: { read: 50 } } } }
          ]
        }))
      }
    }

    // #when
    const result = await getSessionTokenUsage(mockClient, "session-123")

    // #then - should sum all assistant message tokens
    expect(result).toEqual({
      input: 1450,  // (500+100) + (800+50)
      output: 500   // 200 + 300
    })
  })

  test("should return null on API error", async () => {
    // #given - mock client that throws
    const mockClient = {
      session: {
        messages: mock(() => Promise.reject(new Error("API error")))
      }
    }

    // #when
    const result = await getSessionTokenUsage(mockClient, "session-123")

    // #then
    expect(result).toBeNull()
  })

  test("should return null when no assistant messages", async () => {
    // #given
    const mockClient = {
      session: {
        messages: mock(() => Promise.resolve({ data: [{ info: { role: "user" } }] }))
      }
    }

    // #when
    const result = await getSessionTokenUsage(mockClient, "session-123")

    // #then
    expect(result).toBeNull()
  })

  test("should handle missing tokens gracefully", async () => {
    // #given - assistant message without tokens
    const mockClient = {
      session: {
        messages: mock(() => Promise.resolve({
          data: [{ info: { role: "assistant" } }]  // No tokens field
        }))
      }
    }

    // #when
    const result = await getSessionTokenUsage(mockClient, "session-123")

    // #then
    expect(result).toEqual({ input: 0, output: 0 })
  })
})
```

### 3. `src/features/task-toast-manager/manager.test.ts` (UPDATE existing)

```typescript
describe("showTaskListToast - new format", () => {
  test("should show [TASK STARTED] title for background task", () => {
    // #given
    const task = {
      id: "task-1",
      description: "Research patterns",
      agent: "explore",
      isBackground: true
    }

    // #when
    toastManager.addTask(task)

    // #then
    expect(mockClient.tui.showToast).toHaveBeenCalled()
    const call = mockClient.tui.showToast.mock.calls[0][0]
    expect(call.body.title).toContain("[TASK STARTED]")
    expect(call.body.message).toContain("Task: Research patterns")
    expect(call.body.message).toContain("Agent: explore")
  })

  test("should show [TASK STARTED] title for sync task", () => {
    // #given
    const task = {
      id: "task-1",
      description: "Quick fix",
      agent: "Sisyphus-Junior",
      isBackground: false
    }

    // #when
    toastManager.addTask(task)

    // #then
    const call = mockClient.tui.showToast.mock.calls[0][0]
    expect(call.body.title).toContain("[TASK STARTED]")
  })
})

describe("showCompletionToast - new format", () => {
  test("should show [TASK COMPLETED] with full info", () => {
    // #given - add task first
    toastManager.addTask({
      id: "task-1",
      description: "Find bugs",
      agent: "explore",
      isBackground: true
    })

    // #when
    toastManager.showCompletionToast({
      id: "task-1",
      description: "Find bugs",
      agent: "explore",
      duration: "45s",
      tokens: { input: 5000, output: 1200 },
      result: "Found 3 potential issues in the codebase"
    })

    // #then
    const calls = mockClient.tui.showToast.mock.calls
    const completionCall = calls[calls.length - 1][0]
    expect(completionCall.body.title).toContain("[TASK COMPLETED]")
    expect(completionCall.body.message).toContain("Task: Find bugs")
    expect(completionCall.body.message).toContain("Agent: explore")
    expect(completionCall.body.message).toContain("Duration: 45s")
    expect(completionCall.body.message).toContain("5000")  // input tokens
    expect(completionCall.body.message).toContain("1200")  // output tokens
    expect(completionCall.body.message).toContain("Found 3 potential")
  })

  test("should handle missing tokens gracefully", () => {
    // #given
    toastManager.addTask({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      isBackground: true
    })

    // #when - no tokens provided
    toastManager.showCompletionToast({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      duration: "30s"
    })

    // #then - should not crash, should not show "undefined"
    const calls = mockClient.tui.showToast.mock.calls
    const completionCall = calls[calls.length - 1][0]
    expect(completionCall.body.message).not.toContain("undefined")
    expect(completionCall.body.message).not.toContain("Tokens:")
  })

  test("should handle missing result gracefully", () => {
    // #given
    toastManager.addTask({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      isBackground: true
    })

    // #when - no result provided
    toastManager.showCompletionToast({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      duration: "30s",
      tokens: { input: 1000, output: 500 }
    })

    // #then
    const calls = mockClient.tui.showToast.mock.calls
    const completionCall = calls[calls.length - 1][0]
    expect(completionCall.body.message).not.toContain("Report:")
  })

  test("should truncate long result", () => {
    // #given
    const longResult = "A".repeat(500)  // 500 chars

    toastManager.addTask({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      isBackground: true
    })

    // #when
    toastManager.showCompletionToast({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      duration: "30s",
      result: longResult
    })

    // #then - should be truncated
    const calls = mockClient.tui.showToast.mock.calls
    const completionCall = calls[calls.length - 1][0]
    expect(completionCall.body.message.length).toBeLessThan(400)
    expect(completionCall.body.message).toContain("...")
  })
})
```

### 4. `src/features/task-toast-manager/manager.test.ts` (UPDATE - Progress Toast)

```typescript
describe("showProgressToast", () => {
  test("should show [TASK IN PROGRESS] with agent response", () => {
    // #given
    toastManager.addTask({
      id: "task-1",
      description: "Research patterns",
      agent: "explore",
      isBackground: true
    })

    // #when
    toastManager.showProgressToast({
      id: "task-1",
      description: "Research patterns",
      agent: "explore",
      progress: "Found 5 files matching the pattern. Analyzing dependencies...",
      toolCalls: 3,
      elapsed: "45s"
    })

    // #then
    const calls = mockClient.tui.showToast.mock.calls
    const progressCall = calls[calls.length - 1][0]
    expect(progressCall.body.title).toContain("[TASK IN PROGRESS]")
    expect(progressCall.body.message).toContain("Task: Research patterns")
    expect(progressCall.body.message).toContain("Agent: explore")
    expect(progressCall.body.message).toContain("45s")
    expect(progressCall.body.message).toContain("3 tools")
    expect(progressCall.body.message).toContain("Found 5 files")
  })

  test("should truncate long progress text", () => {
    // #given
    const longProgress = "A".repeat(500)

    toastManager.addTask({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      isBackground: true
    })

    // #when
    toastManager.showProgressToast({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      progress: longProgress,
      elapsed: "30s"
    })

    // #then
    const calls = mockClient.tui.showToast.mock.calls
    const progressCall = calls[calls.length - 1][0]
    expect(progressCall.body.message.length).toBeLessThan(350)
    expect(progressCall.body.message).toContain("...")
  })

  test("should use shorter duration for progress toast", () => {
    // #given
    toastManager.addTask({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      isBackground: true
    })

    // #when
    toastManager.showProgressToast({
      id: "task-1",
      description: "Test task",
      agent: "explore",
      progress: "Working...",
      elapsed: "10s"
    })

    // #then
    const calls = mockClient.tui.showToast.mock.calls
    const progressCall = calls[calls.length - 1][0]
    expect(progressCall.body.duration).toBeLessThanOrEqual(3000)
  })
})
```

## Integration Test Scenarios

### Manual Verification Checklist

1. **Background Task Flow**
   - [ ] Start background task → Toast shows "[TASK STARTED]" with task name and agent
   - [ ] **While running** → Progress toast shows "[TASK IN PROGRESS]" with agent's response
   - [ ] Progress toast shows every ~10 seconds with updated content
   - [ ] Task completes → Toast shows "[TASK COMPLETED]" with tokens and report
   - [ ] Verify tokens are accurate (compare with session info)

2. **Sync Task Flow (Bug Fix Verification)**
   - [ ] Start sync task (`run_in_background=false`) → Toast shows "[TASK STARTED]"
   - [ ] **No progress toast** for sync tasks (they block, so no polling)
   - [ ] Task completes → **Toast MUST show** "[TASK COMPLETED]" (this was the bug)
   - [ ] Verify tokens displayed

3. **Resume Task Flow (Bug Fix Verification)**
   - [ ] Resume existing session → Toast shows "[TASK STARTED]"
   - [ ] Task completes → **Toast MUST show** "[TASK COMPLETED]" (this was the bug)

4. **Progress Toast Specific**
   - [ ] Progress shows agent's actual response text (not tool names)
   - [ ] Progress is throttled (max 1 per 10 seconds)
   - [ ] Progress toast has shorter duration (~2-3s)
   - [ ] Progress text is truncated if too long

5. **Error Handling**
   - [ ] Token fetch fails → Toast still shows (without tokens)
   - [ ] Result is null → Toast still shows (without report)

6. **Edge Cases**
   - [ ] Very long task description → Truncated properly
   - [ ] Very long result → Truncated with "..."
   - [ ] Zero tokens → Shows "0" not empty
   - [ ] Multiple tasks complete simultaneously → Each gets a toast
   - [ ] Multiple background tasks → Each gets progress toasts independently

## Test Coverage Requirements

| Component | Coverage Target |
|-----------|-----------------|
| `token-utils.ts` | 100% |
| `manager.ts` (new code) | 90%+ |
| `types.ts` | N/A (types only) |

## RED Phase Checklist

Before implementation, verify these tests FAIL:
- [ ] `showCompletionToast` with new signature - FAILS (signature mismatch)
- [ ] New toast format assertions - FAILS (old format)
- [ ] `getSessionTokenUsage` tests - FAILS (function doesn't exist)
- [ ] Sync task completion toast - FAILS (not implemented)
