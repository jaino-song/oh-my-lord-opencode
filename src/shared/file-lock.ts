/**
 * File Locking System for Parallel Delegation
 *
 * Prevents race conditions when multiple delegations work on the same file.
 * Locks are session-scoped and automatically released when delegation completes.
 *
 * This module uses in-memory data structures only - no shell commands or external processes.
 */

export interface FileLock {
  filePath: string
  sessionID: string
  taskDescription: string
  lockedAt: number
}

/**
 * Global file lock registry
 * Key: normalized file path
 * Value: Lock information
 */
const fileLocks = new Map<string, FileLock>()

/**
 * Normalize file path for consistent comparison
 * Handles both relative and absolute paths, case-insensitive on Windows
 *
 * @param filePath - Raw file path
 * @returns Normalized path for comparison
 */
export function normalizeFilePath(filePath: string): string {
  // Convert backslashes to forward slashes
  let normalized = filePath.replace(/\\/g, "/")

  // Remove leading ./ for relative paths
  normalized = normalized.replace(/^\.\//, "")

  // Lowercase for case-insensitive comparison (Windows)
  normalized = normalized.toLowerCase()

  return normalized
}

/**
 * Extract file paths from a task prompt
 *
 * Looks for common patterns in natural language:
 * - Explicit file mentions: "in file.ts", "to file.ts", "file.ts"
 * - File extensions: *.ts, *.tsx, *.js, *.py, etc.
 *
 * @param prompt - Task prompt text
 * @returns Array of file paths found in prompt
 */
export function extractFilePathsFromPrompt(prompt: string): string[] {
  const paths: string[] = []

  // Pattern 1: Explicit file mentions with common prepositions
  // Example: "in src/file.ts", "to components/Button.tsx"
  const explicitPattern = /(?:in|to|modify|update|edit|change|fix)\s+([a-zA-Z0-9/_.-]+\.[a-z]{2,4})/gi
  let match = explicitPattern.exec(prompt)
  while (match) {
    paths.push(match[1])
    match = explicitPattern.exec(prompt)
  }

  // Pattern 2: Standalone file paths with code extensions
  // Example: "src/services/auth.service.ts"
  const standalonePattern = /\b([a-zA-Z0-9/_.-]+\.(ts|tsx|js|jsx|py|go|java|cpp|c|rs|vue|svelte))\b/gi
  match = standalonePattern.exec(prompt)
  while (match) {
    const path = match[1]
    // Avoid duplicates
    if (!paths.includes(path)) {
      paths.push(path)
    }
    match = standalonePattern.exec(prompt)
  }

  // Pattern 3: Quoted paths
  // Example: "path/to/file.ts"
  const quotedPattern = /["']([a-zA-Z0-9/_.-]+\.[a-z]{2,4})["']/g
  match = quotedPattern.exec(prompt)
  while (match) {
    const path = match[1]
    if (!paths.includes(path)) {
      paths.push(path)
    }
    match = quotedPattern.exec(prompt)
  }

  return paths
}

/**
 * Check if a file is currently locked
 *
 * @param filePath - File path to check
 * @returns Lock information if locked, null otherwise
 */
export function getFileLock(filePath: string): FileLock | null {
  const normalized = normalizeFilePath(filePath)
  return fileLocks.get(normalized) ?? null
}

/**
 * Check if any of the given files are locked
 *
 * @param filePaths - Array of file paths to check
 * @returns Array of locked files with their lock information
 */
export function getLockedFiles(filePaths: string[]): FileLock[] {
  const locked: FileLock[] = []

  for (const filePath of filePaths) {
    const lock = getFileLock(filePath)
    if (lock) {
      locked.push(lock)
    }
  }

  return locked
}

/**
 * Acquire locks on multiple files for a delegation task
 *
 * @param filePaths - Files to lock
 * @param sessionID - Session making the lock request
 * @param taskDescription - Description of the task
 * @returns true if all locks acquired, false if any file already locked
 */
export function acquireFileLocks(
  filePaths: string[],
  sessionID: string,
  taskDescription: string
): boolean {
  // First, check if any files are already locked
  const alreadyLocked = getLockedFiles(filePaths)
  if (alreadyLocked.length > 0) {
    return false
  }

  // Acquire all locks
  const now = Date.now()
  for (const filePath of filePaths) {
    const normalized = normalizeFilePath(filePath)
    fileLocks.set(normalized, {
      filePath,
      sessionID,
      taskDescription,
      lockedAt: now,
    })
  }

  return true
}

/**
 * Release locks held by a specific session
 *
 * Called when a delegation completes (success or failure)
 *
 * @param sessionID - Session to release locks for
 * @returns Number of locks released
 */
export function releaseFileLocks(sessionID: string): number {
  let released = 0

  for (const [key, lock] of fileLocks.entries()) {
    if (lock.sessionID === sessionID) {
      fileLocks.delete(key)
      released++
    }
  }

  return released
}

/**
 * Release a specific file lock
 *
 * @param filePath - File to unlock
 * @returns true if lock was released, false if no lock existed
 */
export function releaseFileLock(filePath: string): boolean {
  const normalized = normalizeFilePath(filePath)
  return fileLocks.delete(normalized)
}

/**
 * Get all currently locked files
 *
 * @returns Array of all active locks
 */
export function getAllFileLocks(): FileLock[] {
  return Array.from(fileLocks.values())
}

/**
 * Clear all file locks (for testing or emergency reset)
 */
export function clearAllFileLocks(): void {
  fileLocks.clear()
}

/**
 * Clean up stale locks (older than specified age)
 *
 * @param maxAgeMs - Maximum age in milliseconds (default: 30 minutes)
 * @returns Number of stale locks removed
 */
export function cleanupStaleLocks(maxAgeMs: number = 30 * 60 * 1000): number {
  const now = Date.now()
  let removed = 0

  for (const [key, lock] of fileLocks.entries()) {
    if (now - lock.lockedAt > maxAgeMs) {
      fileLocks.delete(key)
      removed++
    }
  }

  return removed
}
