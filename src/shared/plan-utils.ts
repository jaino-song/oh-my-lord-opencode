import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Active Plan Mechanism
 *
 * Returns the most recent plan file in .paul/plans/ directory.
 * Plans are identified by modification time (mtime).
 *
 * Philosophy:
 * - Most recent plan = active plan (simple, no pointer file needed)
 * - Plan files: .paul/plans/*.md
 * - If no plans exist → null (Paul should tell user to switch to planner-paul)
 *
 * @param workspaceRoot - The root directory of the workspace
 * @returns Full path to the active plan, or null if no plans exist
 */
export function getActivePlan(workspaceRoot: string): string | null {
  const plansDir = join(workspaceRoot, ".paul/plans")

  // Check if plans directory exists
  if (!existsSync(plansDir)) {
    return null
  }

  try {
    // Read all .md files from plans directory
    const files = readdirSync(plansDir)
      .filter(file => file.endsWith(".md"))
      .map(file => {
        const fullPath = join(plansDir, file)
        try {
          const stats = statSync(fullPath)
          return {
            path: fullPath,
            mtime: stats.mtimeMs,
          }
        } catch {
          return null
        }
      })
      .filter((item): item is { path: string; mtime: number } => item !== null)

    // No plan files found
    if (files.length === 0) {
      return null
    }

    // Sort by modification time (most recent first)
    files.sort((a, b) => b.mtime - a.mtime)

    // Return most recent plan
    return files[0].path
  } catch {
    // Error reading directory → no active plan
    return null
  }
}

/**
 * Check if an active plan exists
 *
 * @param workspaceRoot - The root directory of the workspace
 * @returns true if active plan exists, false otherwise
 */
export function hasActivePlan(workspaceRoot: string): boolean {
  return getActivePlan(workspaceRoot) !== null
}

/**
 * Get the name of the active plan (filename without path)
 *
 * @param workspaceRoot - The root directory of the workspace
 * @returns Plan filename or null if no active plan
 */
export function getActivePlanName(workspaceRoot: string): string | null {
  const activePlan = getActivePlan(workspaceRoot)
  if (!activePlan) return null

  // Extract filename from full path
  const parts = activePlan.split(/[/\\]/)
  return parts[parts.length - 1]
}
