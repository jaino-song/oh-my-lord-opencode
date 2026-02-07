import { describe, test, expect } from "bun:test"
import { DELEGATE_TASK_DESCRIPTION } from "./constants"

describe("delegate_task", () => {
  describe("DELEGATE_TASK_DESCRIPTION", () => {
    test("documents subagent_type parameter", () => {
      expect(DELEGATE_TASK_DESCRIPTION).toContain("subagent_type")
    })

    test("documents run_in_background parameter", () => {
      expect(DELEGATE_TASK_DESCRIPTION).toContain("run_in_background")
    })

    test("documents skills parameter", () => {
      expect(DELEGATE_TASK_DESCRIPTION).toContain("skills")
    })
  })

  describe("subagent_type parameter", () => {
    test("requires subagent_type when not resuming", async () => {
      const { createDelegateTask } = require("./tools")
      
      const mockManager = { launch: async () => ({}) }
      const mockClient = {
        app: { agents: async () => ({ data: [] }) },
        config: { get: async () => ({}) },
        session: {
          create: async () => ({ data: { id: "test-session" } }),
          prompt: async () => ({ data: {} }),
          messages: async () => ({ data: [] }),
        },
      }
      
      const tool = createDelegateTask({
        manager: mockManager,
        client: mockClient,
      })
      
      const toolContext = {
        sessionID: "parent-session",
        messageID: "parent-message",
        agent: "Paul",
        abort: new AbortController().signal,
      }
      
      const result = await tool.execute(
        {
          description: "Test task",
          prompt: "Do something",
          run_in_background: false,
          skills: null,
        },
        toolContext
      )
      
      expect(result).toContain("subagent_type")
      expect(result).toContain("cannot be empty")
    })

    test("accepts valid subagent_type", async () => {
      const { createDelegateTask } = require("./tools")
      let launchInput: any
      
      const mockManager = {
        launch: async (input: any) => {
          launchInput = input
          return {
            id: "task-1",
            sessionID: "session-1",
            description: "Test task",
            agent: input.agent,
            status: "running",
          }
        },
      }
      
      const mockClient = {
        app: { 
          agents: async () => ({ 
            data: [
              { name: "elijah", mode: "subagent" },
              { name: "Paul", mode: "primary" },
            ] 
          }) 
        },
        config: { get: async () => ({}) },
        session: {
          create: async () => ({ data: { id: "test-session" } }),
          prompt: async () => ({ data: {} }),
          messages: async () => ({ data: [] }),
        },
      }
      
      const tool = createDelegateTask({
        manager: mockManager,
        client: mockClient,
      })
      
      const toolContext = {
        sessionID: "parent-session",
        messageID: "parent-message",
        agent: "Paul",
        abort: new AbortController().signal,
      }
      
      await tool.execute(
        {
          description: "Test task",
          prompt: "Do something",
          subagent_type: "elijah",
          run_in_background: true,
          skills: null,
        },
        toolContext
      )
      
      expect(launchInput.agent).toBe("elijah")
    })

    test("blocks explore/librarian and redirects to call_paul_agent", async () => {
      const { createDelegateTask } = require("./tools")
      
      const mockManager = { launch: async () => ({}) }
      const mockClient = {
        app: { 
          agents: async () => ({ 
            data: [
              { name: "explore", mode: "subagent" },
              { name: "librarian", mode: "subagent" },
            ] 
          }) 
        },
        config: { get: async () => ({}) },
        session: {
          create: async () => ({ data: { id: "test-session" } }),
          prompt: async () => ({ data: {} }),
          messages: async () => ({ data: [] }),
        },
      }
      
      const tool = createDelegateTask({
        manager: mockManager,
        client: mockClient,
      })
      
      const toolContext = {
        sessionID: "parent-session",
        messageID: "parent-message",
        agent: "Paul",
        abort: new AbortController().signal,
      }
      
      const result = await tool.execute(
        {
          description: "Test task",
          prompt: "Do something",
          subagent_type: "explore",
          run_in_background: true,
          skills: null,
        },
        toolContext
      )
      
      expect(result).toContain("Cannot use delegate_task")
      expect(result).toContain("call_paul_agent")
    })
  })
})
