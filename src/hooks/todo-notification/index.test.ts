import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("todo-notification", () => {
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
  const TEST_SESSION_ID = "test-session-todo"

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "todo-notification-test-"))
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
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe("todo notification deduplication", () => {
    test("should notify once for the same completed todo across repeated calls", async () => {
      // #given
      const { createTodoNotificationHook, clearNotifiedTodos } = await import("./index")
      clearNotifiedTodos(TEST_SESSION_ID)
      const hook = createTodoNotificationHook(mockCtx as any)
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

      // #when
      await hook["tool.execute.before"](input, output)
      await hook["tool.execute.before"](input, output)

      // #then
      expect(showToastSpy).toHaveBeenCalledTimes(1)
      expect(promptSpy).toHaveBeenCalledTimes(1)
    })

    test("should notify separately for distinct completed todo IDs", async () => {
      // #given
      const { createTodoNotificationHook, clearNotifiedTodos } = await import("./index")
      clearNotifiedTodos(TEST_SESSION_ID)
      const hook = createTodoNotificationHook(mockCtx as any)
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

      // #when
      await hook["tool.execute.before"](input, outputFirst)
      await hook["tool.execute.before"](input, outputSecond)

      // #then
      expect(showToastSpy).toHaveBeenCalledTimes(2)
      expect(promptSpy).toHaveBeenCalledTimes(2)
    })
  })
})
