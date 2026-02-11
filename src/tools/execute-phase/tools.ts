import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin"
import type { ExecutePhaseArgs, PhaseInfo, PhaseTodo, PhaseResult } from "./types"
import { EXECUTE_PHASE_DESCRIPTION } from "./constants"
import type { BackgroundManager } from "../../features/background-agent"
import { log } from "../../shared/logger"
import { resolveMultipleSkillsAsync } from "../../features/opencode-skill-loader/skill-content"

type OpencodeClient = PluginInput["client"]

interface Todo {
  id: string
  content: string
  status: string
  priority: string
}

const PHASE_MARKER_REGEX = /^\[P(\d+)\]\s*===\s*PHASE\s+\d+:\s*(.+?)\s*\((Parallel|Sequential)\)\s*===$/i
const TASK_REGEX = /^\[P(\d+)\.(\d+)\]\s*(.+?)\s*(?:\(Agent:\s*([^)]+)\))?$/i

const UI_HINT_REGEX = /\b(css|tailwind|style|styles|color|colors|background|border|margin|padding|flex|grid|animation|transition|responsive|mobile|layout|spacing|font|hover|shadow|ui|ux|component|components|tsx|jsx)\b/i
const GIT_HINT_REGEX = /\b(git|commit|rebase|squash|branch|merge|checkout|push|pull|cherry-pick|cherrypick|stash|tag)\b/i

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

export function inferAgentFromTodoContent(content: string): string {
  const cleaned = content.replace(/^EXEC::\s*/i, "").trim()

  if (GIT_HINT_REGEX.test(cleaned)) {
    return "git-master"
  }

  if (UI_HINT_REGEX.test(cleaned)) {
    return "frontend-ui-ux-engineer"
  }

  return "Paul-Junior"
}

function resolveAgent(todo: PhaseTodo): string {
  const hint = todo.agentHint?.trim()
  if (hint) {
    return hint
  }
  return inferAgentFromTodoContent(todo.content)
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

function summarizeSkillContent(content: string): string {
  // Skills are intentionally loaded - return full content without truncation
  return content
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
      skills: tool.schema.array(tool.schema.string()).nullable().describe("Array of skill names to prepend to all phase tasks. Use null if no skills needed. Optional.").optional(),
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

      // Resolve skills if provided
      let skillContent: string | undefined
      if (args.skills && args.skills.length > 0) {
        const { resolved, notFound } = await resolveMultipleSkillsAsync(args.skills)
        if (notFound.length > 0) {
          return `❌ Skills not found: ${notFound.join(", ")}`
        }
        const summarized = Array.from(resolved.values()).map(summarizeSkillContent)
        skillContent = summarized.join("\n\n")
        log(`[execute_phase] Resolved ${args.skills.length} skills for phase ${args.phase}`)
      }

      log(`[execute_phase] Starting phase ${args.phase}`, {
        title: phaseInfo.title,
        mode: phaseInfo.mode,
        taskCount: pendingTodos.length,
        hasSkills: !!skillContent,
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
        const tasks: Array<{ todo: PhaseTodo; taskId: string; sessionId: string; agent: string }> = []

        for (const todo of pendingTodos) {
          const agent = resolveAgent(todo)
          let prompt = buildTaskPrompt(todo)
          
          // Prepend skill content if available
          if (skillContent) {
            prompt = `${skillContent}\n\n${prompt}`
          }

          try {
            const task = await manager.launch({
              description: `[P${todo.taskNumber}] ${todo.agentHint ?? "Task"}`,
              prompt,
              agent,
              parentSessionID: ctx.sessionID,
              parentMessageID: "",
              parentAgent: "Paul",
              skillContent,
            })
            tasks.push({ todo, taskId: task.id, sessionId: task.sessionID, agent })
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

        const waitPromises = tasks.map(async ({ todo, taskId, sessionId, agent }) => {
          try {
            const result = await waitForTask(taskId)
            results.push({
              taskId,
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: result.status === "completed" ? "success" : "failed",
              result: result.result ?? result.error ?? "No output",
              sessionId,
            })
          } catch (error) {
            results.push({
              taskId,
              todoId: todo.id,
              taskNumber: todo.taskNumber,
              agent,
              status: "failed",
              result: `Timeout or error: ${error instanceof Error ? error.message : String(error)}`,
              sessionId,
            })
          }
        })

        await Promise.all(waitPromises)
      } else {
        for (const todo of pendingTodos) {
          const agent = resolveAgent(todo)
          let prompt = buildTaskPrompt(todo)
          
          // Prepend skill content if available
          if (skillContent) {
            prompt = `${skillContent}\n\n${prompt}`
          }

          try {
            const task = await manager.launch({
              description: `[P${todo.taskNumber}] ${todo.agentHint ?? "Task"}`,
              prompt,
              agent,
              parentSessionID: ctx.sessionID,
              parentMessageID: "",
              parentAgent: "Paul",
              skillContent,
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
      output += `**Results:** ${successCount} succeeded, ${failedCount} failed\n`
      if (args.skills && args.skills.length > 0) {
        output += `**Skills:** ${args.skills.join(", ")}\n`
      }
      output += "\n"

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
          output += `- execute_phase(phase=${args.phase}${args.skills ? `, skills=[${args.skills.map(s => `"${s}"`).join(", ")}]` : ""})\n`
        }
      }

      return output
    },
  })
}
