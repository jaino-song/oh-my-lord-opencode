import { FILE_PATH_PATTERNS } from "./constants"

interface PendingTask {
  taskId: string
  files: Set<string>
  startTime: number
}

const pendingBySession = new Map<string, Map<string, PendingTask>>()

export function extractFilesFromPrompt(prompt: string): string[] {
  const files = new Set<string>()
  for (const pattern of FILE_PATH_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    let match
    while ((match = regex.exec(prompt)) !== null) {
      const file = match[1] || match[0]
      if (file && !file.includes('*')) {
        files.add(normalizeFilePath(file))
      }
    }
  }
  return Array.from(files)
}

function normalizeFilePath(filePath: string): string {
  return filePath.toLowerCase().replace(/\\/g, '/')
}

export function checkFileConflicts(
  parentSessionID: string,
  files: string[]
): { hasConflict: boolean; conflictingFile?: string; conflictingTaskId?: string } {
  const sessionTasks = pendingBySession.get(parentSessionID)
  if (!sessionTasks) {
    return { hasConflict: false }
  }

  for (const file of files) {
    const normalized = normalizeFilePath(file)
    for (const [taskId, task] of sessionTasks) {
      if (task.files.has(normalized)) {
        return { 
          hasConflict: true, 
          conflictingFile: file, 
          conflictingTaskId: taskId 
        }
      }
    }
  }
  return { hasConflict: false }
}

export function registerPendingFiles(
  parentSessionID: string,
  taskId: string,
  files: string[]
): void {
  if (!pendingBySession.has(parentSessionID)) {
    pendingBySession.set(parentSessionID, new Map())
  }
  const sessionTasks = pendingBySession.get(parentSessionID)!
  sessionTasks.set(taskId, {
    taskId,
    files: new Set(files.map(normalizeFilePath)),
    startTime: Date.now(),
  })
}

export function clearPendingFiles(
  parentSessionID: string,
  taskId: string
): void {
  const sessionTasks = pendingBySession.get(parentSessionID)
  if (sessionTasks) {
    sessionTasks.delete(taskId)
    if (sessionTasks.size === 0) {
      pendingBySession.delete(parentSessionID)
    }
  }
}

export function getPendingTaskCount(parentSessionID: string): number {
  return pendingBySession.get(parentSessionID)?.size ?? 0
}

export function clearSessionState(parentSessionID: string): void {
  pendingBySession.delete(parentSessionID)
}

export function _resetState(): void {
  pendingBySession.clear()
}
