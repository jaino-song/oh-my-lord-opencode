import { describe, expect, test, mock } from "bun:test"
import { createBackgroundOutput } from "./tools"
import type { BackgroundTask } from "../../features/background-agent"

function createCompletedTask(overrides?: Partial<BackgroundTask>): BackgroundTask {
  return {
    id: "bg_task_1",
    sessionID: "ses_task_1",
    parentSessionID: "ses_parent_1",
    parentMessageID: "msg_parent_1",
    description: "background test task",
    prompt: "test prompt",
    agent: "explore",
    status: "completed",
    startedAt: new Date("2026-01-01T00:00:00.000Z"),
    completedAt: new Date("2026-01-01T00:00:02.000Z"),
    ...overrides,
  }
}

describe("background_output", () => {
  test("should return completed output repeatedly without consuming it", async () => {
    // #given
    const task = createCompletedTask()
    const messagesMock = mock(async () => ({
      data: [
        {
          info: { role: "assistant", time: "2026-01-01T00:00:01.000Z" },
          parts: [{ type: "text", text: "Scout result: found 12 files" }],
        },
      ],
    }))

    const manager = {
      getTask: () => task,
    }

    const client = {
      session: {
        messages: messagesMock,
      },
    }

    const tool = createBackgroundOutput(manager as any, client as any)
    const toolContext = {
      sessionID: "ses_parent_1",
      messageID: "msg_parent_1",
      agent: "Paul",
      abort: new AbortController().signal,
    }

    // #when
    const first = await tool.execute({ task_id: task.id }, toolContext)
    const second = await tool.execute({ task_id: task.id }, toolContext)

    // #then
    expect(first).toContain("Scout result: found 12 files")
    expect(second).toContain("Scout result: found 12 files")
    expect(second).not.toContain("No new output since last check")
    expect(messagesMock).toHaveBeenCalledTimes(1)
  })

  test("should use cached task result when available", async () => {
    // #given
    const cachedOutput = "Task Result\n\nCached output body"
    const task = createCompletedTask({ result: cachedOutput })
    const messagesMock = mock(async () => ({ error: "session unavailable" }))

    const manager = {
      getTask: () => task,
    }

    const client = {
      session: {
        messages: messagesMock,
      },
    }

    const tool = createBackgroundOutput(manager as any, client as any)
    const toolContext = {
      sessionID: "ses_parent_1",
      messageID: "msg_parent_1",
      agent: "Paul",
      abort: new AbortController().signal,
    }

    // #when
    const output = await tool.execute({ task_id: task.id }, toolContext)

    // #then
    expect(output).toBe(cachedOutput)
    expect(messagesMock).toHaveBeenCalledTimes(0)
  })
})
