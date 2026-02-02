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
      expect(output.args.prompt).toContain("ADVISORY")
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
    test("should allow delegating to 'timothy' when 'Timothy (Implementation Plan Reviewer)' is in allowed list", async () => {
      // #given - set session agent to Paul (has Timothy in allowed list)
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

      // #when / #then - should NOT throw (short name should match full name)
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
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
  })

  describe("todo notification deduplication", () => {
    test("should notify once for the same completed todo across repeated calls", async () => {
      // #given - hook with spies and repeated completed todo
      const { createHierarchyEnforcerHook, clearNotifiedTodos } = await import("./index")
      clearNotifiedTodos(TEST_SESSION_ID)
      const hook = createHierarchyEnforcerHook(mockCtx as any)
      const showToastSpy = spyOn(mockCtx.client.tui, "showToast").mockResolvedValue(undefined)
      const promptSpy = spyOn(mockCtx.client.session, "prompt").mockResolvedValue(undefined)

      const input = { tool: "todowrite", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const output = {
        args: {
          todos: [
            { id: "todo-1", content: "Finish dedup logic", status: "completed" }
          ]
        }
      }

      // #when - same completed todo is reported twice
      await hook["tool.execute.before"](input, output)
      await hook["tool.execute.before"](input, output)

      // #then - only one notification should be sent
      expect(showToastSpy).toHaveBeenCalledTimes(1)
      expect(promptSpy).toHaveBeenCalledTimes(1)
    })

    test("should notify separately for distinct completed todo IDs", async () => {
      // #given - hook with spies and two completed todos
      const { createHierarchyEnforcerHook, clearNotifiedTodos } = await import("./index")
      clearNotifiedTodos(TEST_SESSION_ID)
      const hook = createHierarchyEnforcerHook(mockCtx as any)
      const showToastSpy = spyOn(mockCtx.client.tui, "showToast").mockResolvedValue(undefined)
      const promptSpy = spyOn(mockCtx.client.session, "prompt").mockResolvedValue(undefined)

      const input = { tool: "todowrite", sessionID: TEST_SESSION_ID, callID: "test-call" }
      const outputFirst = {
        args: {
          todos: [
            { id: "todo-1", content: "Finish dedup logic", status: "completed" }
          ]
        }
      }
      const outputSecond = {
        args: {
          todos: [
            { id: "todo-2", content: "Add second notification", status: "completed" }
          ]
        }
      }

      // #when - two distinct completed todo IDs are reported
      await hook["tool.execute.before"](input, outputFirst)
      await hook["tool.execute.before"](input, outputSecond)

      // #then - both notifications should be sent
      expect(showToastSpy).toHaveBeenCalledTimes(2)
      expect(promptSpy).toHaveBeenCalledTimes(2)
    })
  })
})
