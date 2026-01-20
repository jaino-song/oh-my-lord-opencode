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
    test("should throw COMPETENCY VIOLATION when category='quick' with visual keywords", async () => {
      // #given - set session agent to Paul (competency check only runs for Paul)
      setSessionAgent(TEST_SESSION_ID, "Paul")
      
      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)
      
      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          category: "quick",
          prompt: "change the button css padding and border-radius"
        }
      }

      // #when / #then - should throw competency violation
      await expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow(/COMPETENCY VIOLATION/)
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
  })
})
