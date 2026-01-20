
const dirtyFilesBySession = new Map<string, Set<string>>()

export function markFileDirty(sessionID: string, filePath: string): void {
  if (!dirtyFilesBySession.has(sessionID)) {
    dirtyFilesBySession.set(sessionID, new Set())
  }
  dirtyFilesBySession.get(sessionID)!.add(filePath)
}

export function clearDirtyFiles(sessionID: string): void {
  dirtyFilesBySession.delete(sessionID)
}

export function getDirtyFiles(sessionID: string): string[] {
  return Array.from(dirtyFilesBySession.get(sessionID) ?? [])
}

export function hasDirtyFiles(sessionID: string): boolean {
  return (dirtyFilesBySession.get(sessionID)?.size ?? 0) > 0
}

export function _resetState(): void {
  dirtyFilesBySession.clear()
}
