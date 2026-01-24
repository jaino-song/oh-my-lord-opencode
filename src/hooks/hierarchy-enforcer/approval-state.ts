import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const APPROVAL_FILE = ".sisyphus/approval_state.json"

export interface ApprovalState {
  approvals: {
    taskId: string
    approver: string
    timestamp: number
    status: "approved" | "rejected"
  }[]
}

export function getApprovalPath(root: string): string {
  return join(root, APPROVAL_FILE)
}

export function loadApprovalState(root: string): ApprovalState {
  const path = getApprovalPath(root)
  if (!existsSync(path)) return { approvals: [] }
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ApprovalState
  } catch {
    return { approvals: [] }
  }
}

export function recordApproval(root: string, taskId: string | undefined, approver: string, status: "approved" | "rejected") {
  const state = loadApprovalState(root)
  state.approvals.push({
    taskId: taskId ?? "unknown",
    approver,
    timestamp: Date.now(),
    status
  })
  
  if (state.approvals.length > 100) {
    state.approvals = state.approvals.slice(-100)
  }
  
  try {
    writeFileSync(getApprovalPath(root), JSON.stringify(state, null, 2))
  } catch {
    //
  }
}

export function hasRecentApproval(root: string, approverPattern: string, durationMs = 300000): boolean {
  const state = loadApprovalState(root)
  const cutoff = Date.now() - durationMs
  
  return state.approvals.some(a => {
    const approverLower = a.approver.toLowerCase()
    const patternLower = approverPattern.toLowerCase()
    return a.status === "approved" && 
      a.timestamp > cutoff && 
      (approverLower.includes(patternLower) || patternLower.includes(approverLower))
  })
}
