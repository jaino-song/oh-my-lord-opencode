import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { setSessionAgent, clearSessionAgent } from "../../features/claude-code-session-state"

describe("hierarchy-enforcer", () => {
  let tempDir: string
  let mockCtx: { 
    directory: string
    client: {
      tui: {
        showToast: () => Promise<void>
      }
      session: {
        prompt: () => Promise<void>
      }
    }
  }
  const TEST_SESSION_ID = "test-session-hierarchy"

  beforeEach(() => {
    // #given - create temp directory for test isolation
    tempDir = mkdtempSync(join(tmpdir(), "hierarchy-enforcer-test-"))
    mockCtx = { 
      directory: tempDir,
      client: {
        tui: {
          showToast: async () => {}
        },
        session: {
          prompt: async () => {}
        }
      }
    }
  })

  afterEach(() => {
    clearSessionAgent(TEST_SESSION_ID)
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe("category-based competency check", () => {
    test("should show toast warning when delegating visual work to non-UI agent", async () => {
      // #given - set session agent to Paul (competency check only runs for Paul)
      setSessionAgent(TEST_SESSION_ID, "Paul")
      
      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)
      
      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "Paul-Junior",
          prompt: "change the button css padding and border-radius"
        }
      }

      // #when - should not throw, just show toast warning
      await hook["tool.execute.before"](input, output)

      // #then - delegation proceeds (no throw), toast shown via client
      expect(output.args.prompt).toBe("change the button css padding and border-radius")
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
      return expect(
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
      return expect(
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
           subagent_type: "Paul-Junior",
          prompt: `[SYSTEM WARNING: TDD VIOLATION DETECTED]\n` +
            `You are starting implementation without a recent test run (Joshua).\n` +
            `Protocol requires a FAILING test (RED) before implementation (GREEN).\n` +
            `If this is a mistake, STOP and run tests first.\n` +
            `If you are proceeding anyway (e.g. config/docs/untestable), ignore this.\n\n` +
            "update the css layout for the page"
        }
      }

      // #when / #then - should NOT throw
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })
  })

  describe("agent name matching", () => {
    test("should block delegating to 'timothy' (Timothy is disabled)", async () => {
      // #given - set session agent to Paul (Timothy was removed from allowed list)
      setSessionAgent(TEST_SESSION_ID, "Paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "timothy",
          prompt: "review this implementation plan"
        }
      }

      // #when / #then - should throw (Timothy is disabled)
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("HIERARCHY VIOLATION")
    })

    test("should allow delegating to 'ezra' when 'ezra (plan reviewer)' is in allowed list", async () => {
      // #given - set session agent to planner-paul (has ezra in allowed list)
      setSessionAgent(TEST_SESSION_ID, "planner-paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "ezra",
          prompt: "review this plan"
        }
      }

      // #when / #then - should NOT throw (short name should match full name)
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should block delegating to unauthorized agent", async () => {
      // #given - set session agent to planner-paul
      setSessionAgent(TEST_SESSION_ID, "planner-paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "ultrabrain",
          prompt: "implement this feature"
        }
      }

      // #when / #then - should throw (ultrabrain not in planner-paul's allowed list)
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("HIERARCHY VIOLATION")
    })

    test("should NOT allow 'paul-junior' to match 'paul' in allowed list (substring false positive)", async () => {
      // #given - set session agent to planner-paul (has 'paul' but NOT 'paul-junior')
      setSessionAgent(TEST_SESSION_ID, "planner-paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "Paul-Junior",
          prompt: "implement this feature"
        }
      }

      // #when / #then - should throw (paul-junior should NOT match 'paul')
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("HIERARCHY VIOLATION")
    })

    test("should allow Paul to delegate to Paul-Junior", async () => {
      // #given
      setSessionAgent(TEST_SESSION_ID, "Paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "Paul-Junior",
          prompt: "implement the business logic"
        }
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should allow worker-paul to delegate to explore", async () => {
      // #given
      setSessionAgent(TEST_SESSION_ID, "worker-paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "explore",
          prompt: "find all files"
        }
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should block worker-paul from delegating to Paul-Junior (requires --override)", async () => {
      // #given
      setSessionAgent(TEST_SESSION_ID, "worker-paul")

      const { createHierarchyEnforcerHook } = await import("./index")
      const hook = createHierarchyEnforcerHook(mockCtx as any)

      const input = { tool: "delegate_task", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          subagent_type: "Paul-Junior",
          prompt: "implement feature"
        }
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("HIERARCHY VIOLATION")
    })
  })

  describe("stripAllSystemInjections", () => {
    test("should strip TDD warnings from text", async () => {
      // #given
      const { stripAllSystemInjections } = await import("./index")
      const text = `[SYSTEM WARNING: TDD VIOLATION DETECTED]
Some warning text here

Actual prompt content`

      // #when
      const result = stripAllSystemInjections(text)

      // #then
      expect(result).toBe("Actual prompt content")
      expect(result).not.toContain("TDD VIOLATION")
    })

    test("should strip advisory warnings from text", async () => {
      // #given
      const { stripAllSystemInjections } = await import("./index")
      const text = `[ADVISORY: Visual/UI task → consider frontend-ui-ux-engineer]

Actual prompt content`

      // #when
      const result = stripAllSystemInjections(text)

      // #then
      expect(result).toBe("Actual prompt content")
      expect(result).not.toContain("ADVISORY")
    })

    test("should strip TDD hints from text", async () => {
      // #given
      const { stripAllSystemInjections } = await import("./index")
      const text = `[TDD: No recent test run. Run tests first if needed.]

Actual prompt content`

      // #when
      const result = stripAllSystemInjections(text)

      // #then
      expect(result).toBe("Actual prompt content")
      expect(result).not.toContain("TDD:")
    })

    test("should strip MANDATORY suffix", async () => {
      // #given
      const { stripAllSystemInjections } = await import("./index")
      const text = `Actual content here

---

**MANDATORY: Some system reminder**`

      // #when
      const result = stripAllSystemInjections(text)

      // #then
      expect(result).toBe("Actual content here")
      expect(result).not.toContain("MANDATORY")
    })
  })
})
