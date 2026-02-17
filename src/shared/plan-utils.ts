import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const IMPLEMENTATION_FILE_EXTENSION_REGEX = /\.(tsx|ts|jsx|js|py|go|rs|java|cpp|cs|kt|swift|php|rb|c)\b/i
const IMPLEMENTATION_FILE_REF_REGEX = /([A-Za-z0-9_./-]+\.(?:tsx|ts|jsx|js|py|go|rs|java|cpp|cs|kt|swift|php|rb|c))/gi

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

/**
 * Determine whether a plan content includes implementation-code scope.
 *
 * Used for conditional verification gates (for example Elijah --verify-plan).
 */
export function isImplementationPlanContent(planContent: string): boolean {
  return IMPLEMENTATION_FILE_EXTENSION_REGEX.test(planContent)
}

export function extractImplementationFileRefsFromPlanContent(planContent: string): string[] {
  const refs = new Set<string>()
  for (const match of planContent.matchAll(IMPLEMENTATION_FILE_REF_REGEX)) {
    const raw = (match[1] ?? "").trim()
    if (!raw) continue
    const cleaned = raw.replace(/^[`'"(]+|[`'"),.:;]+$/g, "")
    if (!cleaned) continue
    refs.add(cleaned)
  }
  return Array.from(refs)
}

export function getLatestImplementationFileMtimeFromPlan(workspaceRoot: string): number | null {
  const activePlanPath = getActivePlan(workspaceRoot)
  if (!activePlanPath || !existsSync(activePlanPath)) {
    return null
  }

  let content = ""
  try {
    content = readFileSync(activePlanPath, "utf8")
  } catch {
    return null
  }

  const refs = extractImplementationFileRefsFromPlanContent(content)
  if (refs.length === 0) {
    return null
  }

  let latest: number | null = null
  for (const ref of refs) {
    const absolute = join(workspaceRoot, ref)
    if (!existsSync(absolute)) continue
    try {
      const mtime = statSync(absolute).mtimeMs
      if (latest === null || mtime > latest) {
        latest = mtime
      }
    } catch {
      // ignore unreadable file entries
    }
  }

  return latest
}

/**
 * Determine whether the active plan requires implementation verification.
 *
 * Returns false when no active plan exists or the plan cannot be read.
 */
export function isActivePlanImplementation(workspaceRoot: string): boolean {
  const activePlanPath = getActivePlan(workspaceRoot)
  if (!activePlanPath || !existsSync(activePlanPath)) {
    return false
  }

  try {
    const content = readFileSync(activePlanPath, "utf8")
    return isImplementationPlanContent(content)
  } catch {
    return false
  }
}
