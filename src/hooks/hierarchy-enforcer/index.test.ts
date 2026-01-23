import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { setSessionAgent, clearSessionAgent } from "../../features/claude-code-session-state"

describe("hierarchy-enforcer", () => {
  let tempDir: string
  let mockCtx: { directory: string }
  const TEST_SESSION_ID = "test-session-hierarchy"

  beforeEach(() => {
    // #given - create temp directory for test isolation
    tempDir = mkdtempSync(join(tmpdir(), "hierarchy-enforcer-test-"))
    mockCtx = { directory: tempDir }
  })

  afterEach(() => {
    clearSessionAgent(TEST_SESSION_ID)
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe("category-based competency check", () => {
    test("should inject advisory warning when delegating visual work to non-UI agent", async () => {
      // #given - set session agent to Paul (competency check only runs for Paul)
      setSessionAgent(TEST_SESSION_ID, "Paul")
      
      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)
      
      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "ultrabrain",
          prompt: "change the button css padding and border-radius"
        }
      }

      // #when
      await hook["tool.execute.before"](input, output)

      // #then - should inject advisory warning
      expect(output.args.prompt).toContain("SYSTEM ADVISORY: COMPETENCY MISMATCH")
      expect(output.args.prompt).toContain("Visual/UI")
      expect(output.args.prompt).toContain("frontend-ui-ux-engineer")
    })

    test("should NOT throw when delegating git tasks that mention UI keywords", async () => {
      // #given - set session agent to Paul
      setSessionAgent(TEST_SESSION_ID, "Paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "git-master",
          prompt: "Commit UI layout tweaks in frontend files"
        }
      }

      // #when / #then - should NOT throw
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should NOT throw when category='quick' without visual keywords", async () => {
      // #given - set session agent to Paul
      setSessionAgent(TEST_SESSION_ID, "Paul")
      
      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)
      
      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          category: "quick",
          prompt: "refactor the business logic in the service layer"
        }
      }

      // #when / #then - should NOT throw
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should ignore TDD warning block during competency scan", async () => {
      // #given - set session agent to Paul
      setSessionAgent(TEST_SESSION_ID, "Paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "Sisyphus-Junior",
          prompt: `[SYSTEM WARNING: TDD VIOLATION DETECTED]\n` +
            `You are starting implementation without a recent test run (Joshua).\n` +
            `Protocol requires a FAILING test (RED) before implementation (GREEN).\n` +
            `If this is a mistake, STOP and run tests first.\n` +
            `If you are proceeding anyway (e.g. config/docs/untestable), ignore this.\n\n` +
            "update the css layout for the page"
        }
      }

      // #when / #then - should NOT throw
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })
  })
})
