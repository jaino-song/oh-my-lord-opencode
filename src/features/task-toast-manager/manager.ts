import type { PluginInput } from "@opencode-ai/plugin"
import type { TrackedTask, TaskStatus, ModelFallbackInfo, CompletionToastData, ProgressToastData } from "./types"
import type { ConcurrencyManager } from "../background-agent/concurrency"

type OpencodeClient = PluginInput["client"]

export class TaskToastManager {
  private tasks: Map<string, TrackedTask> = new Map()
  private client: OpencodeClient
  private concurrencyManager?: ConcurrencyManager

  constructor(client: OpencodeClient, concurrencyManager?: ConcurrencyManager) {
    this.client = client
    this.concurrencyManager = concurrencyManager
  }

  setConcurrencyManager(manager: ConcurrencyManager): void {
    this.concurrencyManager = manager
  }

  addTask(task: {
    id: string
    description: string
    agent: string
    isBackground: boolean
    status?: TaskStatus
    skills?: string[]
    modelInfo?: ModelFallbackInfo
  }): void {
    const trackedTask: TrackedTask = {
      id: task.id,
      description: task.description,
      agent: task.agent,
      status: task.status ?? "running",
      startedAt: new Date(),
      isBackground: task.isBackground,
      skills: task.skills,
      modelInfo: task.modelInfo,
    }

    this.tasks.set(task.id, trackedTask)
    this.showTaskListToast(trackedTask)
  }

  /**
   * Update task status
   */
  updateTask(id: string, status: TaskStatus): void {
    const task = this.tasks.get(id)
    if (task) {
      task.status = status
    }
  }

  /**
   * Remove completed/error task
   */
  removeTask(id: string): void {
    this.tasks.delete(id)
  }

  /**
   * Get all running tasks (newest first)
   */
  getRunningTasks(): TrackedTask[] {
    const running = Array.from(this.tasks.values())
      .filter((t) => t.status === "running")
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    return running
  }

  /**
   * Get all queued tasks
   */
  getQueuedTasks(): TrackedTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.status === "queued")
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
  }

  /**
   * Format duration since task started
   */
  private formatDuration(startedAt: Date): string {
    const seconds = Math.floor((Date.now() - startedAt.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  private getConcurrencyInfo(): string {
    if (!this.concurrencyManager) return ""
    const running = this.getRunningTasks()
    const queued = this.getQueuedTasks()
    const total = running.length + queued.length
    const limit = this.concurrencyManager.getConcurrencyLimit("default")
    if (limit === Infinity) return ""
    return ` [${total}/${limit}]`
  }

   private buildTaskListMessage(newTask: TrackedTask): string {
     const concurrencyInfo = this.getConcurrencyInfo()

     const lines: string[] = []

     // show new task info first
     lines.push(`task: ${newTask.description}`)
     lines.push(`agent: ${newTask.agent}`)
     if (newTask.skills?.length) {
       lines.push(`skills: ${newTask.skills.join(", ")}`)
     }

     // add separator if there are other tasks
     const running = this.getRunningTasks()
     const queued = this.getQueuedTasks()
     if (running.length > 1 || queued.length > 0) {
       lines.push("")
       lines.push("---")
     }

     const isFallback = newTask.modelInfo && (
       newTask.modelInfo.type === "inherited" || newTask.modelInfo.type === "system-default"
     )
    if (isFallback) {
      const suffixMap: Record<"inherited" | "system-default", string> = {
        inherited: " (inherited from parent)",
        "system-default": " (system default fallback)",
      }
      const suffix = suffixMap[newTask.modelInfo!.type as "inherited" | "system-default"]
      lines.push(`⚠️ Model fallback: ${newTask.modelInfo!.model}${suffix}`)
      lines.push("")
    }

    if (running.length > 0) {
      lines.push(`Running (${running.length}):${concurrencyInfo}`)
      for (const task of running) {
        const duration = this.formatDuration(task.startedAt)
        const bgIcon = task.isBackground ? "⚡" : "🔄"
        const isNew = task.id === newTask.id ? " ← NEW" : ""
        const skillsInfo = task.skills?.length ? ` [${task.skills.join(", ")}]` : ""
        lines.push(`${bgIcon} ${task.description} (${task.agent})${skillsInfo} - ${duration}${isNew}`)
      }
    }

    if (queued.length > 0) {
      if (lines.length > 0) lines.push("")
      lines.push(`Queued (${queued.length}):`)
      for (const task of queued) {
        const bgIcon = task.isBackground ? "⏳" : "⏸️"
        const skillsInfo = task.skills?.length ? ` [${task.skills.join(", ")}]` : ""
        lines.push(`${bgIcon} ${task.description} (${task.agent})${skillsInfo}`)
      }
    }

    return lines.join("\n")
  }

  /**
   * Show consolidated toast with all running/queued tasks
   */
  private showTaskListToast(newTask: TrackedTask): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tuiClient = this.client as any
    if (!tuiClient.tui?.showToast) return

    const message = this.buildTaskListMessage(newTask)
    const running = this.getRunningTasks()
    const queued = this.getQueuedTasks()

    const title = "[TASK STARTED]"

    tuiClient.tui.showToast({
      body: {
        title,
        message: message || `${newTask.description} (${newTask.agent})`,
        variant: "info",
        duration: running.length + queued.length > 2 ? 5000 : 3000,
      },
    }).catch(() => {})
  }

  /**
    * Show task completion toast
    */
  showCompletionToast(task: CompletionToastData): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tuiClient = this.client as any
    if (!tuiClient.tui?.showToast) return

    this.removeTask(task.id)

    const lines: string[] = []
    lines.push(`task: ${task.description}`)
    lines.push(`agent: ${task.agent}`)
    lines.push(`duration: ${task.duration}`)

    if (task.tokens) {
      lines.push(`tokens: ${task.tokens.input}in / ${task.tokens.output}out`)
    }

    if (task.result) {
      const truncated = task.result.length > 100
        ? task.result.slice(0, 100) + "..."
        : task.result
      lines.push(`report: ${truncated}`)
    }

    const remaining = this.getRunningTasks()
    const queued = this.getQueuedTasks()
    if (remaining.length > 0 || queued.length > 0) {
      lines.push("")
      lines.push(`still running: ${remaining.length} | queued: ${queued.length}`)
    }

    const message = lines.join("\n")

     tuiClient.tui.showToast({
       body: {
         title: "[TASK COMPLETED]",
         message,
         variant: "success",
         duration: 5000,
       },
     }).catch(() => {})
   }

   /**
    * Show progress toast for running background task
    */
   showProgressToast(task: ProgressToastData): void {
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const tuiClient = this.client as any
     if (!tuiClient.tui?.showToast) return

     // only show if task is still running
     const trackedTask = this.tasks.get(task.id)
     if (!trackedTask || trackedTask.status !== "running") return

     const lines: string[] = []
     lines.push(`task: ${task.description}`)

     // compact info line: agent | elapsed | tools
     const infoParts = [task.agent, task.elapsed]
     if (task.toolcalls !== undefined) {
       infoParts.push(`${task.toolcalls} tools`)
     }
     lines.push(infoParts.join(" | "))

     // separator and progress text
     if (task.progress) {
       lines.push("---")
       const truncated = task.progress.length > 150
         ? task.progress.slice(0, 150) + "..."
         : task.progress
       lines.push(truncated)
     }

     const message = lines.join("\n")

     tuiClient.tui.showToast({
       body: {
         title: "[task in progress]",
         message,
         variant: "info",
         duration: 3000,
       },
     }).catch(() => {})
   }
}

let instance: TaskToastManager | null = null

export function getTaskToastManager(): TaskToastManager | null {
  return instance
}

export function initTaskToastManager(
  client: OpencodeClient,
  concurrencyManager?: ConcurrencyManager
): TaskToastManager {
  instance = new TaskToastManager(client, concurrencyManager)
  return instance
}
