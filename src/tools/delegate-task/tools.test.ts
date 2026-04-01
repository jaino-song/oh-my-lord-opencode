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

    test("blocks Paul from manually delegating EXEC:: phase tasks", async () => {
      const { createDelegateTask } = require("./tools")

      const mockManager = { launch: async () => ({}) }
      const mockClient = {
        app: {
          agents: async () => ({
            data: [{ name: "Paul-Junior", mode: "subagent" }],
          }),
        },
        config: { get: async () => ({}) },
        session: {
          todo: async () => ({
            data: [
              {
                id: "phase",
                content: "EXEC:: [P2] === PHASE 2: Implement API (Sequential) ===",
                status: "pending",
                priority: "high",
              },
              {
                id: "task",
                content: "EXEC:: [P2.1] Implement login endpoint (Agent: Paul-Junior)",
                status: "pending",
                priority: "high",
              },
            ],
          }),
          create: async () => ({ data: { id: "test-session" } }),
          prompt: async () => ({ data: {} }),
          messages: async () => ({ data: [] }),
        },
      }

      const tool = createDelegateTask({
        manager: mockManager,
        client: mockClient,
        directory: "/tmp",
      })

      const toolContext = {
        sessionID: "parent-session",
        messageID: "parent-message",
        agent: "Paul",
        abort: new AbortController().signal,
      }

      const result = await tool.execute(
        {
          description: "Manual phase execution",
          prompt: "Execute task [P2.1]: implement login endpoint",
          subagent_type: "Paul-Junior",
          run_in_background: true,
          skills: null,
        },
        toolContext
      )

      expect(result).toContain("Plan-phase task delegation blocked")
      expect(result).toContain("execute_phase({ phase: 2 })")
    })

    test("handles this-bound session.todo safely in EXEC phase guard", async () => {
      const { createDelegateTask } = require("./tools")

      const mockManager = { launch: async () => ({}) }
      const session = {
        _client: { ok: true },
        async todo(this: { _client?: unknown }) {
          if (!this?._client) {
            throw new TypeError("undefined is not an object (evaluating 'this._client')")
          }

          return {
            data: [
              {
                id: "phase",
                content: "EXEC:: [P4] === PHASE 4: Verify (Sequential) ===",
                status: "pending",
                priority: "high",
              },
              {
                id: "task",
                content: "EXEC:: [P4.1] Validate release readiness (Agent: Joshua)",
                status: "pending",
                priority: "high",
              },
            ],
          }
        },
        create: async () => ({ data: { id: "test-session" } }),
        prompt: async () => ({ data: {} }),
        messages: async () => ({ data: [] }),
      }

      const mockClient = {
        app: {
          agents: async () => ({
            data: [{ name: "Paul-Junior", mode: "subagent" }],
          }),
        },
        config: { get: async () => ({}) },
        session,
      }

      const tool = createDelegateTask({
        manager: mockManager,
        client: mockClient,
        directory: "/tmp",
      })

      const toolContext = {
        sessionID: "parent-session",
        messageID: "parent-message",
        agent: "Paul",
        abort: new AbortController().signal,
      }

      const result = await tool.execute(
        {
          description: "Manual phase execution",
          prompt: "Execute task [P4.1]: validate release readiness",
          subagent_type: "Paul-Junior",
          run_in_background: true,
          skills: null,
        },
        toolContext
      )

      expect(result).toContain("Plan-phase task delegation blocked")
      expect(result).toContain("execute_phase({ phase: 4 })")
    })

    test("allows resume delegation while EXEC:: phase is active", async () => {
      const { createDelegateTask } = require("./tools")

      const mockManager = {
        findBySession: () => ({ id: "task-1" }),
        resume: async () => ({
          id: "task-1",
          sessionID: "ses_resume_1",
          description: "Resume task",
          agent: "Paul-Junior",
          status: "running",
        }),
      }

      const mockClient = {
        app: {
          agents: async () => ({
            data: [{ name: "Paul-Junior", mode: "subagent" }],
          }),
        },
        config: { get: async () => ({}) },
        session: {
          todo: async () => ({
            data: [
              {
                id: "phase",
                content: "EXEC:: [P3] === PHASE 3: Verify (Sequential) ===",
                status: "pending",
                priority: "high",
              },
              {
                id: "task",
                content: "EXEC:: [P3.1] Run verification checks (Agent: Joshua)",
                status: "pending",
                priority: "high",
              },
            ],
          }),
          create: async () => ({ data: { id: "test-session" } }),
          prompt: async () => ({ data: {} }),
          messages: async () => ({ data: [] }),
        },
      }

      const tool = createDelegateTask({
        manager: mockManager,
        client: mockClient,
        directory: "/tmp",
      })

      const toolContext = {
        sessionID: "parent-session",
        messageID: "parent-message",
        agent: "Paul",
        abort: new AbortController().signal,
      }

      const result = await tool.execute(
        {
          description: "Resume failed task",
          prompt: "fix: complete missing assertions",
          subagent_type: "Paul-Junior",
          run_in_background: true,
          resume: "ses_resume_1",
          skills: null,
        },
        toolContext
      )

      expect(result).toContain("Background task resumed")
    })
  })
})
