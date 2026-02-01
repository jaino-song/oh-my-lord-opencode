import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { createPrometheusMdOnlyHook } from "./index"
import { MESSAGE_STORAGE } from "../../features/hook-message-injector"
import { SYSTEM_DIRECTIVE_PREFIX } from "../../shared/system-directive"
import { clearSessionAgent } from "../../features/claude-code-session-state"

describe("prometheus-md-only", () => {
  const TEST_SESSION_ID = "test-session-prometheus"
  let testMessageDir: string

  type Todo = { content: string; status: string; priority: string; id: string }

  function createMockPluginInput(options?: { todos?: Todo[]; throwTodoError?: boolean }) {
    const todoMock = mock(async () => {
      if (options?.throwTodoError) {
        throw new Error("todo fetch failed")
      }

      return {
        data: (options?.todos ?? [
          { content: "test todo", status: "pending", priority: "high", id: "todo-1" },
        ]) satisfies Todo[],
      }
    })

    return {
      client: { session: { todo: todoMock } },
      directory: "/tmp/test",
    } as never
  }

  function setupMessageStorage(sessionID: string, agent: string): void {
    testMessageDir = join(MESSAGE_STORAGE, sessionID)
    mkdirSync(testMessageDir, { recursive: true })
    const messageContent = {
      agent,
      model: { providerID: "test", modelID: "test-model" },
    }
    writeFileSync(
      join(testMessageDir, "msg_001.json"),
      JSON.stringify(messageContent)
    )
  }

  afterEach(() => {
    clearSessionAgent(TEST_SESSION_ID)
    if (testMessageDir) {
      try {
        rmSync(testMessageDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
  })

  describe("with Prometheus agent in message storage", () => {
    beforeEach(() => {
      setupMessageStorage(TEST_SESSION_ID, "Prometheus (Planner)")
    })

    test("should block Prometheus from writing non-.md files", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/file.ts" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files")
    })

     test("should allow plan writes when todos exist", async () => {
       // #given
       const hook = createPrometheusMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "/tmp/test/.paul/plans/work-plan.md" },
       }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should block plan writes when no todos registered", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput({ todos: [] }))
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/tmp/test/.paul/plans/work-plan.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("register at least one todo")
    })

    test("should always allow draft writes", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput({ todos: [] }))
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/tmp/test/.paul/drafts/work-plan.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should block Prometheus from writing non-.md files", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/tmp/test/src/code.ts" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files")
    })

    test("should block Edit tool for non-.md files", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Edit",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/code.py" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files")
    })

    test("should not affect non-Write/Edit tools", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Read",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/file.ts" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should handle missing filePath gracefully", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: {},
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should inject read-only warning when Prometheus calls delegate_task", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "delegate_task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { prompt: "Analyze this codebase" },
      }

      // #when
      await hook["tool.execute.before"](input, output)

      // #then
      expect(output.args.prompt).toContain(SYSTEM_DIRECTIVE_PREFIX)
      expect(output.args.prompt).toContain("DO NOT modify any files")
    })

    test("should not block Prometheus delegations (authorization handled by hierarchy-enforcer)", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "delegate_task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: {
          subagent_type: "Paul",
          prompt: "Please implement X",
        },
      }

      // #when
      return expect(hook["tool.execute.before"](input, output)).resolves.toBeUndefined()

      // #then
      expect(output.args.prompt).toContain(SYSTEM_DIRECTIVE_PREFIX)
      expect(output.args.prompt).toContain("DO NOT modify any files")
    })

    test("should inject read-only warning when Prometheus calls task", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { prompt: "Research this library" },
      }

      // #when
      await hook["tool.execute.before"](input, output)

      // #then
      expect(output.args.prompt).toContain(SYSTEM_DIRECTIVE_PREFIX)
    })

    test("should inject read-only warning when Prometheus calls call_omo_agent", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "call_omo_agent",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { prompt: "Find implementation examples" },
      }

      // #when
      await hook["tool.execute.before"](input, output)

      // #then
      expect(output.args.prompt).toContain(SYSTEM_DIRECTIVE_PREFIX)
    })

    test("should not double-inject warning if already present", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "delegate_task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const promptWithWarning = `Some prompt ${SYSTEM_DIRECTIVE_PREFIX} already here`
      const output = {
        args: { prompt: promptWithWarning },
      }

      // #when
      await hook["tool.execute.before"](input, output)

      // #then
      const occurrences = (output.args.prompt as string).split(SYSTEM_DIRECTIVE_PREFIX).length - 1
      expect(occurrences).toBe(1)
    })
  })

   describe("with non-Prometheus agent in message storage", () => {
     beforeEach(() => {
       setupMessageStorage(TEST_SESSION_ID, "Paul")
     })

    test("should not affect non-Prometheus agents", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/file.ts" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should not inject warning for non-Prometheus agents calling delegate_task", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "delegate_task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const originalPrompt = "Implement this feature"
      const output = {
        args: { prompt: originalPrompt },
      }

      // #when
      await hook["tool.execute.before"](input, output)

      // #then
      expect(output.args.prompt).toBe(originalPrompt)
      expect(output.args.prompt).not.toContain(SYSTEM_DIRECTIVE_PREFIX)
    })
  })

  describe("without message storage", () => {
    test("should handle missing session gracefully (no agent found)", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: "non-existent-session",
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/file.ts" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })
  })

  describe("workspace-wide markdown write permissions", () => {
    beforeEach(() => {
      setupMessageStorage(TEST_SESSION_ID, "planner-paul")
    })

    test("should allow planner to write any .md file under workspace root", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/tmp/test/docs/architecture.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should allow planner to write README.md at workspace root", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/tmp/test/README.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should allow planner to write .md in nested directories", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/tmp/test/src/components/Button/README.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should block planner from writing .md outside workspace root", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/other/project/README.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("outside workspace root")
    })

    test("should block planner from writing .md via path traversal", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/tmp/test/../../../etc/passwd.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("outside workspace root")
    })

     test("should still allow .paul directories", async () => {
       // #given
       const hook = createPrometheusMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "/tmp/test/.paul/plans/work-plan.md" },
       }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })
  })

  describe("cross-platform path validation", () => {
    beforeEach(() => {
      setupMessageStorage(TEST_SESSION_ID, "Prometheus (Planner)")
    })

     test("should allow Windows-style backslash paths under .paul/", async () => {
       // #given
       const hook = createPrometheusMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: ".paul\\plans\\work-plan.md" },
       }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

     test("should allow mixed separator paths under .paul/", async () => {
       // #given
       const hook = createPrometheusMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: ".paul\\plans/work-plan.MD" },
       }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should allow uppercase .MD extension", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
       const output = {
         args: { filePath: ".paul/plans/work-plan.MD" },
       }

       // #when / #then
       return expect(
         hook["tool.execute.before"](input, output)
       ).resolves.toBeUndefined()
     })

     test("should block paths outside workspace root", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/other/project/docs/plan.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("outside workspace root")
    })

    test("should allow nested directories with .md files", async () => {
      // #given - when ctx.directory is parent of actual project, path includes project name
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "src/docs/api.md" },
      }

      // #when / #then - should allow any .md file under workspace
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should block path traversal attempts outside workspace", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "docs/../../etc/passwd.md" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("outside workspace root")
    })

     test("should allow case-insensitive .PAUL directory", async () => {
       // #given
       const hook = createPrometheusMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: ".PAUL/plans/work-plan.md" },
       }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

     test("should allow nested project path with .paul (Windows real-world case)", async () => {
       // #given - simulates when ctx.directory is parent of actual project
       // User reported: xauusd-dxy-plan\.paul\drafts\supabase-email-templates.md
       const hook = createPrometheusMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "xauusd-dxy-plan\\.paul\\drafts\\supabase-email-templates.md" },
       }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

     test("should allow nested project path with mixed separators", async () => {
       // #given
       const hook = createPrometheusMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "my-project/.paul\\plans/task.md" },
       }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

     test("should block nested project path without .paul", async () => {
       // #given
       const hook = createPrometheusMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "my-project\\src\\code.ts" },
       }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files")
    })
  })

  describe("bash command blocking", () => {
    beforeEach(() => {
      setupMessageStorage(TEST_SESSION_ID, "planner-paul")
    })

    describe("should block dangerous bash commands", () => {
      const dangerousCommands = [
        { cmd: "cat > /path/to/file.ts << 'EOF'\ncontent\nEOF", desc: "heredoc file write" },
        { cmd: "echo 'code' > file.ts", desc: "echo redirect" },
        { cmd: "sed -i 's/foo/bar/g' file.ts", desc: "sed in-place" },
        { cmd: "rm -rf src/", desc: "rm command" },
        { cmd: "cp source.ts dest.ts", desc: "cp command" },
        { cmd: "mv old.ts new.ts", desc: "mv command" },
        { cmd: "touch newfile.ts", desc: "touch command" },
        { cmd: "mkdir -p src/new", desc: "mkdir command" },
        { cmd: "chmod +x script.sh", desc: "chmod command" },
        { cmd: "git commit -m 'message'", desc: "git commit" },
        { cmd: "git push origin main", desc: "git push" },
        { cmd: "npm install lodash", desc: "npm install" },
        { cmd: "pnpm add react", desc: "pnpm add" },
        { cmd: "echo test >> file.log", desc: "append redirect" },
        { cmd: "cat file | tee output.txt", desc: "tee command" },
        { cmd: "printf '%s' 'data' > file.txt", desc: "printf redirect" },
      ]

      for (const { cmd, desc } of dangerousCommands) {
        test(`should block: ${desc}`, async () => {
          // #given
          const hook = createPrometheusMdOnlyHook(createMockPluginInput())
          const input = {
            tool: "Bash",
            sessionID: TEST_SESSION_ID,
            callID: "call-1",
          }
          const output = {
            args: { command: cmd },
          }

          // #when / #then
          return expect(
            hook["tool.execute.before"](input, output)
          ).rejects.toThrow("cannot execute file-modifying bash commands")
        })
      }
    })

    describe("should allow safe bash commands", () => {
      const safeCommands = [
        { cmd: "ls -la", desc: "ls command" },
        { cmd: "cat file.ts", desc: "cat read-only" },
        { cmd: "head -n 10 file.ts", desc: "head command" },
        { cmd: "tail -f log.txt", desc: "tail command" },
        { cmd: "grep -r 'pattern' src/", desc: "grep command" },
        { cmd: "find . -name '*.ts'", desc: "find command" },
        { cmd: "git status", desc: "git status" },
        { cmd: "git log --oneline", desc: "git log" },
        { cmd: "git diff HEAD~1", desc: "git diff" },
        { cmd: "npm list", desc: "npm list" },
        { cmd: "pwd", desc: "pwd command" },
        { cmd: "whoami", desc: "whoami command" },
        { cmd: "tree src/", desc: "tree command" },
      ]

      for (const { cmd, desc } of safeCommands) {
        test(`should allow: ${desc}`, async () => {
          // #given
          const hook = createPrometheusMdOnlyHook(createMockPluginInput())
          const input = {
            tool: "Bash",
            sessionID: TEST_SESSION_ID,
            callID: "call-1",
          }
          const output = {
            args: { command: cmd },
          }

          // #when / #then
          return expect(
            hook["tool.execute.before"](input, output)
          ).resolves.toBeUndefined()
        })
      }
    })

    test("should handle missing command gracefully", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Bash",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: {},
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should work with lowercase 'bash' tool name", async () => {
      // #given
      const hook = createPrometheusMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "bash",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { command: "rm -rf /" },
      }

      // #when / #then
      return expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("cannot execute file-modifying bash commands")
    })
  })
})
