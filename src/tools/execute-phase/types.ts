export interface ExecutePhaseArgs {
  phase: number
  skills?: string[] | null
}

export interface PhaseTodo {
  id: string
  content: string
  taskNumber: string
  agentHint?: string
  status: string
}

export interface PhaseInfo {
  phase: number
  title: string
  mode: "parallel" | "sequential"
  todos: PhaseTodo[]
}

export interface PhaseResult {
  taskId: string
  todoId: string
  taskNumber: string
  agent: string
  status: "success" | "failed"
  result: string
  sessionId?: string
}
