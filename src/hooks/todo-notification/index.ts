import type { PluginInput } from "@opencode-ai/plugin"
import { getParentAgentName } from "../../features/agent-context"
import { showToast, getCurrentModel, type ToastClient } from "../shared/notification"
import type { StoredMessage } from "../../features/hook-message-injector"

const notifiedTodos = new Map<string, Set<string>>()

export function clearNotifiedTodos(sessionID?: string): void {
  if (sessionID) {
    notifiedTodos.delete(sessionID)
  } else {
    notifiedTodos.clear()
  }
}

function capitalizeAgent(agent: string): string {
  return agent.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("-")
}

async function injectTodoAlert(
  client: ToastClient,
  sessionID: string,
  agent: string,
  task: string,
  currentModel?: StoredMessage["model"]
): Promise<void> {
  if (!client.session?.prompt) return
  
  const notification = `[TODO ALERT - OH-MY-LORD-OPENCODE]
⚡ ${capitalizeAgent(agent)}
TODO: ${task}
✅ TODO DONE`

  await client.session.prompt({
    path: { id: sessionID },
    body: {
      noReply: true,
      parts: [{ type: "text", text: notification }],
      ...(agent ? { agent } : {}),
      ...(currentModel ? { model: currentModel } : {}),
    },
  }).catch(() => {})
}

export function createTodoNotificationHook(ctx: PluginInput) {
  const client = ctx.client as unknown as ToastClient

  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown>; message?: string }
    ): Promise<void> => {
      if (input.tool.toLowerCase() !== "todowrite") return

      const todos = output.args.todos as Array<{ content: string; status: string; id: string }> | undefined
      if (!todos) return

      const currentAgent = getParentAgentName(input.sessionID, "User")
      const currentModel = getCurrentModel(input.sessionID)
      
      if (!notifiedTodos.has(input.sessionID)) {
        notifiedTodos.set(input.sessionID, new Set<string>())
      }
      const sessionNotified = notifiedTodos.get(input.sessionID)!
      
      for (const todo of todos) {
        const shortTask = todo.content.slice(0, 40) + (todo.content.length > 40 ? "..." : "")
        const isDelegationTodo = /delegat/i.test(todo.content)
        
        if (todo.status === "completed") {
          if (!sessionNotified.has(todo.id)) {
            await showToast(client, "✅ Task Completed", shortTask, "success", 5000)
            if (!isDelegationTodo) {
              await injectTodoAlert(client, input.sessionID, currentAgent, todo.content, currentModel)
            }
            sessionNotified.add(todo.id)
          }
        } else if (todo.status === "in_progress") {
          await showToast(client, "🔄 Task Started", shortTask, "info", 5000)
        }
      }
    }
  }
}
