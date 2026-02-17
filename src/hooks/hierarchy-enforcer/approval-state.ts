import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const APPROVAL_FILE = ".paul/approval_state.json"

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
  
  // debug logging
  if (process.env.HIERARCHY_DEBUG === "1") {
    console.error(`[hierarchy-enforcer] hasRecentApproval called:`)
    console.error(`  root: ${root}`)
    console.error(`  approverPattern: ${approverPattern}`)
    console.error(`  cutoff: ${cutoff}`)
    console.error(`  approvals count: ${state.approvals.length}`)
    const recentApprovals = state.approvals.filter(a => a.timestamp > cutoff)
    console.error(`  recent approvals: ${JSON.stringify(recentApprovals.map(a => ({ approver: a.approver, timestamp: a.timestamp })))}`)
  }
  
  return state.approvals.some(a => {
    const approverLower = a.approver.toLowerCase()
    const patternLower = approverPattern.toLowerCase()
    return a.status === "approved" && 
      a.timestamp > cutoff && 
      (approverLower.includes(patternLower) || patternLower.includes(approverLower))
  })
}

export function getLatestApprovalTimestamp(
  root: string,
  approverPattern: string,
  status: "approved" | "rejected" = "approved"
): number | null {
  const state = loadApprovalState(root)
  const patternLower = approverPattern.toLowerCase()

  let latest: number | null = null
  for (const approval of state.approvals) {
    const approverLower = approval.approver.toLowerCase()
    const matchesApprover = approverLower.includes(patternLower) || patternLower.includes(approverLower)
    if (!matchesApprover) continue
    if (approval.status !== status) continue
    if (latest === null || approval.timestamp > latest) {
      latest = approval.timestamp
    }
  }

  return latest
}
