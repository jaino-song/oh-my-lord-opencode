export type TaskStatus = "running" | "queued" | "completed" | "error"

export interface ModelFallbackInfo {
  model: string
  type: "user-defined" | "inherited" | "category-default" | "system-default"
}

export interface TrackedTask {
  id: string
  description: string
  agent: string
  status: TaskStatus
  startedAt: Date
  isBackground: boolean
  skills?: string[]
  modelInfo?: ModelFallbackInfo
  tokens?: {
    input: number
    output: number
  }
  result?: string  // summary of task result
}

export interface TaskToastOptions {
  title: string
  message: string
  variant: "info" | "success" | "warning" | "error"
  duration?: number
}

export interface CompletionToastData {
  id: string
  description: string
  agent: string
  duration: string
  tokens?: { input: number; output: number }
  result?: string
}

export interface ProgressToastData {
  id: string
  description: string
  agent: string
  progress: string
  toolcalls?: number
  elapsed: string
}
