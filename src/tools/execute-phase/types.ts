export interface ExecutePhaseArgs {
  phase: number
  skills?: string[] | null
}

export interface PhaseTodo {
  id: string
  content: string
  taskNumber: string
  agentHint?: string
  requiredSkills?: string[]
  contractRefs?: string[]
  fileRefs?: string[]
  todoAnchorIds?: string[]
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
  skillsUsed?: string[]
}

export interface ContractPatternCheck {
  file: string
  regex: string
  description?: string
}

export interface ContractAcceptanceSpec {
  requiredFilesExist?: string[]
  requiredPatterns?: ContractPatternCheck[]
  forbiddenPatterns?: ContractPatternCheck[]
  requireTodoIdsResolved?: boolean
  frontendConformance?: boolean
}

export interface MachineReadableContract {
  id: string
  files?: string[]
  todoIds?: string[]
  skills?: string[]
  acceptance?: ContractAcceptanceSpec
}

export interface MachineReadableContractSpec {
  schemaVersion: "contracts-v1"
  contracts: MachineReadableContract[]
}
