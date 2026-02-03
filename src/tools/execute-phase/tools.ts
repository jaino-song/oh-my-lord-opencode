import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin"
import type { ExecutePhaseArgs, PhaseInfo, PhaseTodo, PhaseResult } from "./types"
import { EXECUTE_PHASE_DESCRIPTION } from "./constants"
import type { BackgroundManager } from "../../features/background-agent"
import { log } from "../../shared/logger"

type OpencodeClient = PluginInput["client"]

interface Todo {
  id: string
  content: string
  status: string
  priority: string
}

const PHASE_MARKER_REGEX = /^\[P(\d+)\]\s*===\s*PHASE\s+\d+:\s*(.+?)\s*\((Parallel|Sequential)\)\s*===$/i
const TASK_REGEX = /^\[P(\d+)\.(\d+)\]\s*(.+?)\s*(?:\(Agent:\s*([^)]+)\))?$/i

function parsePhaseMarker(content: string): { phase: number; title: string; mode: "parallel" | "sequential" } | null {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()
  const match = cleaned.match(PHASE_MARKER_REGEX)
  if (!match) return null
  return {
    phase: parseInt(match[1], 10),
    title: match[2].trim(),
    mode: match[3].toLowerCase() as "parallel" | "sequential",
  }
}

function parseTask(content: string): { phase: number; taskNum: string; description: string; agent?: string } | null {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()
  const match = cleaned.match(TASK_REGEX)
  if (!match) return null
  return {
    phase: parseInt(match[1], 10),
    taskNum: `${match[1]}.${match[2]}`,
    description: match[3].trim(),
    agent: match[4]?.trim(),
  }
}

function extractPhaseInfo(todos: Todo[], targetPhase: number): PhaseInfo | null {
  let phaseTitle = `Phase ${targetPhase}`
  let phaseMode: "parallel" | "sequential" = "sequential"
  const phaseTodos: PhaseTodo[] = []

  for (const todo of todos) {
    if (!todo.content.toLowerCase().startsWith("exec::")) continue

    const marker = parsePhaseMarker(todo.content)
    if (marker && marker.phase === targetPhase) {
      phaseTitle = marker.title
      phaseMode = marker.mode
      continue
    }

    const task = parseTask(todo.content)
    if (task && task.phase === targetPhase) {
      phaseTodos.push({
        id: todo.id,
        content: todo.content,
        taskNumber: task.taskNum,
        agentHint: task.agent,
        status: todo.status,
      })
    }
  }

  if (phaseTodos.length === 0) return null

  return {
    phase: targetPhase,
    title: phaseTitle,
    mode: phaseMode,
    todos: phaseTodos,
  }
}

function buildTaskPrompt(todo: PhaseTodo): string {
  return `Execute task [P${todo.taskNumber}]:

${todo.content}

Complete this task and call signal_done when finished.`
}

export interface ExecutePhaseToolOptions {
  manager: BackgroundManager
  client: OpencodeClient
  directory: string
}

export function createExecutePhase(options: ExecutePhaseToolOptions): ToolDefinition {
  const { manager, client } = options

  return tool({
    description: EXECUTE_PHASE_DESCRIPTION,
    args: {
      phase: tool.schema.number().describe("Phase number to execute (e.g., 1, 2, 3)"),
    },
    async execute(args: ExecutePhaseArgs, toolContext) {
      const ctx = toolContext as { sessionID: string; abort: AbortSignal }
      
      const todosResponse = await client.session.todo({ path: { id: ctx.sessionID } })
      const todos = (todosResponse.data ?? []) as Todo[]

      if (todos.length === 0) {
        return `❌ No todos found. Make sure EXEC:: todos are created by planner-paul.`
      }

      const phaseInfo = extractPhaseInfo(todos, args.phase)
      if (!phaseInfo) {
        return `❌ Phase ${args.phase} not found in todos. Available EXEC:: todos:\n${todos
          .filter(t => t.content.toLowerCase().startsWith("exec::"))
          .map(t => `- ${t.content}`)
          .join("\n")}`
      }

      const pendingTodos = phaseInfo.todos.filter(t => t.status !== "completed" && t.status !== "cancelled")
      if (pendingTodos.length === 0) {
        return `✅ Phase ${args.phase} (${phaseInfo.title}) already complete. All tasks finished.`
      }

      log(`[execute_phase] Starting phase ${args.phase}`, {
        title: phaseInfo.title,
        mode: phaseInfo.mode,
        taskCount: pendingTodos.length,
      })

      const results: PhaseResult[] = []

      const POLL_INTERVAL_MS = 1000
      const MAX_WAIT_MS = 10 * 60 * 1000

      async function waitForTask(taskId: string): Promise<{ status: string; result?: string; error?: string }> {
        const startTime = Date.now()
        while (Date.now() - startTime < MAX_WAIT_MS) {
          const task = manager.getTask(taskId)
          if (!task) {
            return { status: "error", error: "Task not found" }
          }
          if (task.status === "completed" || task.status === "error" || task.status === "cancelled") {
            return { status: task.status, result: task.result, error: task.error }
          }
          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
        }
        return { status: "error", error: "Timeout waiting for task" }
      }

      if (phaseInfo.mode === "parallel") {
        const tasks: Array<{ todo: PhaseTodo; taskId: string; sessionId: string }> = []

        for (const todo of pendingTodos) {
          const agent = todo.agentHint ?? "Paul-Junior"
          const prompt = buildTaskPrompt(todo)

          try {
            const task = await manager.launch({
              description: `[P${todo.taskNumber}] ${todo.agentHint ?? "Task"}`,
              prompt,
              agent,
              parentSessionID: ctx.sessionID,
              parentMessageID: "",
              parentAgent: "Paul",
            })
            tasks.push({ todo, taskId: task.id, sessionId: task.sessionID })
            log(`[execute_phase] Launched parallel task`, { taskId: task.id, agent, taskNumber: todo.taskNumber })
          } catch (error) {
            results.push({
              taskId: "",
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: `Failed to launch: ${error instanceof Error ? error.message : String(error)}`,
            })
          }
        }

        const waitPromises = tasks.map(async ({ todo, taskId, sessionId }) => {
          try {
            const result = await waitForTask(taskId)
            results.push({
              taskId,
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent: todo.agentHint ?? "Paul-Junior",
              status: result.status === "completed" ? "success" : "failed",
              result: result.result ?? result.error ?? "No output",
              sessionId,
            })
          } catch (error) {
            results.push({
              taskId,
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent: todo.agentHint ?? "Paul-Junior",
              status: "failed",
              result: `Timeout or error: ${error instanceof Error ? error.message : String(error)}`,
              sessionId,
            })
          }
        })

        await Promise.all(waitPromises)
      } else {
        for (const todo of pendingTodos) {
          const agent = todo.agentHint ?? "Paul-Junior"
          const prompt = buildTaskPrompt(todo)

          try {
            const task = await manager.launch({
              description: `[P${todo.taskNumber}] ${todo.agentHint ?? "Task"}`,
              prompt,
              agent,
              parentSessionID: ctx.sessionID,
              parentMessageID: "",
              parentAgent: "Paul",
            })

            log(`[execute_phase] Launched sequential task`, { taskId: task.id, agent, taskNumber: todo.taskNumber })

            const result = await waitForTask(task.id)
            results.push({
              taskId: task.id,
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: result.status === "completed" ? "success" : "failed",
              result: result.result ?? result.error ?? "No output",
              sessionId: task.sessionID,
            })

            if (result.status !== "completed") {
              log(`[execute_phase] Sequential task failed, stopping phase`, { taskId: task.id })
              break
            }
          } catch (error) {
            results.push({
              taskId: "",
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: `Error: ${error instanceof Error ? error.message : String(error)}`,
            })
            break
          }
        }
      }

      const successCount = results.filter(r => r.status === "success").length
      const failedCount = results.filter(r => r.status === "failed").length

      let output = `## Phase ${args.phase}: ${phaseInfo.title} (${phaseInfo.mode})\n\n`
      output += `**Results:** ${successCount} succeeded, ${failedCount} failed\n\n`

      for (const result of results) {
        const icon = result.status === "success" ? "✅" : "❌"
        output += `### ${icon} [P${result.taskNumber}] - ${result.agent}\n`
        output += `${result.result.slice(0, 500)}${result.result.length > 500 ? "..." : ""}\n\n`
        if (result.sessionId) {
          output += `Session: ${result.sessionId}\n\n`
        }
      }

      if (failedCount > 0) {
        output += `\n⚠️ Some tasks failed. Review errors and retry with:\n`
        for (const result of results.filter(r => r.status === "failed")) {
          output += `- delegate_task(resume="${result.sessionId}", prompt="fix: ...")\n`
        }
      }

      return output
    },
  })
}
