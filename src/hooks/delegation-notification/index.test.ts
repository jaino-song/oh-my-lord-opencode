import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("delegation-notification", () => {
  let tempDir: string
  let mockCtx: {
    directory: string
    client: {
      tui: { showToast: ReturnType<typeof mock> }
      session: { prompt: ReturnType<typeof mock> }
    }
  }
  const TEST_SESSION_ID = "test-session-delegation"

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "delegation-notification-test-"))
    mkdirSync(join(tempDir, ".paul"), { recursive: true })
    writeFileSync(join(tempDir, ".paul", "approval_state.json"), JSON.stringify({ approvals: [] }))
    
    mockCtx = {
      directory: tempDir,
      client: {
        tui: { showToast: mock(() => Promise.resolve()) },
        session: { prompt: mock(() => Promise.resolve()) }
      }
    }
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe("Joshua (Test Runner) notifications", () => {
    test("should show success toast and record approval when tests pass", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-1" }
      const output = {
        args: { subagent_type: "Joshua (Test Runner)" },
        output: "✓ 5 tests passed\nAll tests passing"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      expect(mockCtx.client.tui.showToast).toHaveBeenCalledTimes(1)
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Joshua")
      expect(toastCall.body.title).toContain("Passed")
      expect(toastCall.body.variant).toBe("success")
    })

    test("should show error toast when tests fail", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-2" }
      const output = {
        args: { subagent_type: "joshua" },
        output: "✗ 2 tests failed\nError: expected true but got false"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      expect(mockCtx.client.tui.showToast).toHaveBeenCalledTimes(1)
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Joshua")
      expect(toastCall.body.title).toContain("Failed")
      expect(toastCall.body.variant).toBe("error")
    })

    test("should extract test count from output", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-3" }
      const output = {
        args: { subagent_type: "joshua" },
        output: "10 tests passed successfully"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.message).toContain("10")
    })
  })

  describe("Timothy (Plan Reviewer) notifications", () => {
    test("should show success toast when plan is approved", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-4" }
      const output = {
        args: { subagent_type: "timothy" },
        output: "Plan review: APPROVED\nLGTM - no issues found"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      expect(mockCtx.client.tui.showToast).toHaveBeenCalledTimes(1)
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Timothy")
      expect(toastCall.body.title).toContain("Approved")
      expect(toastCall.body.variant).toBe("success")
    })

    test("should show warning toast when issues found", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-5" }
      const output = {
        args: { subagent_type: "Timothy (Implementation Plan Reviewer)" },
        output: "Found 3 issues to address"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Timothy")
      expect(toastCall.body.message).toContain("3")
      expect(toastCall.body.variant).toBe("warning")
    })
  })

  describe("Thomas (TDD Plan Consultant) notifications", () => {
    test("should show success toast when spec is approved", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-6" }
      const output = {
        args: { subagent_type: "thomas" },
        output: "Test spec approved and valid"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Thomas")
      expect(toastCall.body.title).toContain("Approved")
      expect(toastCall.body.variant).toBe("success")
    })
  })

  describe("Solomon (TDD Planner) notifications", () => {
    test("should show info toast with test count", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-7" }
      const output = {
        args: { subagent_type: "solomon" },
        output: "Created 8 test cases for the feature"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Solomon")
      expect(toastCall.body.message).toContain("8")
    })
  })

  describe("Nathan (Request Analyst) notifications", () => {
    test("should extract complexity from analysis", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-8" }
      const output = {
        args: { subagent_type: "nathan" },
        output: "Analysis complete\nComplexity: HIGH\nScope: Multi-file refactoring"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Nathan")
      expect(toastCall.body.message).toContain("HIGH")
    })
  })

  describe("Implementation agents (Paul-Junior, frontend-ui-ux, ultrabrain)", () => {
    test("should show success toast on completion", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-9" }
      const output = {
        args: { subagent_type: "Paul-Junior" },
        output: "✅ Implementation complete\nAll changes applied successfully"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Paul-Junior")
      expect(toastCall.body.variant).toBe("success")
    })

    test("should show error toast on failure", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-10" }
      const output = {
        args: { subagent_type: "frontend-ui-ux-engineer" },
        output: "❌ Error: Cannot find module './Button'\nTask: implementing component"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("failed")
      expect(toastCall.body.variant).toBe("error")
    })

    test("should detect error even without emoji", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-11" }
      const output = {
        args: { subagent_type: "ultrabrain" },
        output: "Error: TypeError thrown during execution"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.variant).toBe("error")
    })
  })

  describe("git-master notifications", () => {
    test("should show commit hash on successful commit", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-12" }
      const output = {
        args: { subagent_type: "git-master" },
        output: "Commit: abc1234\nMessage: feat: add new feature"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Git Commit")
      expect(toastCall.body.message).toContain("abc1234")
    })

    test("should show push notification", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-13" }
      const output = {
        args: { subagent_type: "git-master" },
        output: "Successfully pushed to origin/main"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Git Push")
    })
  })

  describe("explore/librarian notifications", () => {
    test("should show file count when found", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-14" }
      const output = {
        args: { subagent_type: "explore" },
        output: "Found 15 files matching pattern"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.message).toContain("15")
    })
  })

  describe("background task notifications", () => {
    test("should inject notification for background tasks", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-15" }
      const output = {
        args: { subagent_type: "explore", run_in_background: true },
        output: "Found 5 files"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      expect(mockCtx.client.session.prompt).toHaveBeenCalledTimes(1)
    })

    test("should NOT inject notification for foreground tasks", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-16" }
      const output = {
        args: { subagent_type: "explore", run_in_background: false },
        output: "Found 5 files"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      expect(mockCtx.client.session.prompt).not.toHaveBeenCalled()
    })
  })

  describe("generic fallback agent notifications", () => {
    test("should show success for unknown agent with success indicators", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-17" }
      const output = {
        args: { subagent_type: "custom-agent" },
        output: "✅ Task completed successfully"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.variant).toBe("success")
    })

    test("should show error for unknown agent with error indicators", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-18" }
      const output = {
        args: { subagent_type: "custom-agent" },
        output: "❌ Error: Something went wrong"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.variant).toBe("error")
    })
  })

  describe("approval recording", () => {
    test("should record Joshua approval on test pass", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const { loadApprovalState } = await import("../hierarchy-enforcer/approval-state")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-19" }
      const output = {
        args: { subagent_type: "joshua" },
        output: "All tests passed"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const state = loadApprovalState(tempDir)
      expect(state.approvals.length).toBeGreaterThan(0)
      expect(state.approvals.some(a => a.approver === "Joshua")).toBe(true)
    })

    test("should record Timothy approval on plan approval", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const { loadApprovalState } = await import("../hierarchy-enforcer/approval-state")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-20" }
      const output = {
        args: { subagent_type: "timothy" },
        output: "Plan APPROVED - looks good"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const state = loadApprovalState(tempDir)
      expect(state.approvals.some(a => a.approver === "Timothy")).toBe(true)
    })

    test("should record Thomas approval on spec approval", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const { loadApprovalState } = await import("../hierarchy-enforcer/approval-state")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-21" }
      const output = {
        args: { subagent_type: "thomas" },
        output: "Test spec is valid and approved"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const state = loadApprovalState(tempDir)
      expect(state.approvals.some(a => a.approver === "Thomas")).toBe(true)
    })

    test("should record Elijah approval on verify-plan VERIFIED verdict", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const { loadApprovalState } = await import("../hierarchy-enforcer/approval-state")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-21b" }
      const output = {
        args: { subagent_type: "elijah" },
        output: "--verify-plan .paul/plans/feature.md\n\n## Elijah Post-Implementation Verification\n\n### Verdict: VERIFIED"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const state = loadApprovalState(tempDir)
      expect(state.approvals.some(a => a.approver === "Elijah" && a.status === "approved")).toBe(true)
    })

    test("should record Elijah rejection on verify-plan CONCERNS_REMAIN verdict", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const { loadApprovalState } = await import("../hierarchy-enforcer/approval-state")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-21c" }
      const output = {
        args: { subagent_type: "Elijah (Deep Reasoning Advisor)" },
        output: "## Elijah Post-Implementation Verification\n\n### Verdict: CONCERNS_REMAIN"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const state = loadApprovalState(tempDir)
      expect(state.approvals.some(a => a.approver === "Elijah" && a.status === "rejected")).toBe(true)
    })
  })

  describe("edge cases", () => {
    test("should not crash on non-delegate_task tools", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "read", sessionID: TEST_SESSION_ID, callID: "call-22" }
      const output = { args: {}, output: "file contents" }

      // #when / #then
      await hook["tool.execute.after"](input, output)
      expect(mockCtx.client.tui.showToast).not.toHaveBeenCalled()
    })

    test("should extract agent from arrow notation in output", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-23" }
      const output = {
        args: {},
        output: "Paul → Joshua\nAll tests passed"
      }

      // #when
      await hook["tool.execute.after"](input, output)

      // #then
      const toastCall = mockCtx.client.tui.showToast.mock.calls[0][0]
      expect(toastCall.body.title).toContain("Joshua")
    })

    test("should handle empty output gracefully", async () => {
      // #given
      const { createDelegationNotificationHook } = await import("./index")
      const hook = createDelegationNotificationHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "call-24" }
      const output = { args: { subagent_type: "explore" }, output: "" }

      // #when / #then
      await hook["tool.execute.after"](input, output)
    })
  })
})
