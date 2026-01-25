import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * Test Result Schema
 *
 * Structured output format for Joshua (Test Runner).
 * Written to .sisyphus/test-results/{todoId}.json after test execution.
 */

export interface TestFrameworkResult {
  total: number
  passed: number
  failed: number
  skipped?: number
  flaky?: number  // Playwright only
}

export interface TestFailure {
  framework: "jest" | "playwright"
  testName: string
  filePath: string
  errorMessage: string
}

export interface TestResultFile {
  status: "PASS" | "FAIL"
  jest?: TestFrameworkResult
  playwright?: TestFrameworkResult
  timestamp: number  // Unix timestamp in milliseconds
  duration_ms: number
  failures?: TestFailure[]
}

/**
 * Get the test results directory
 *
 * @param workspaceRoot - The root directory of the workspace
 * @returns Path to test results directory
 */
export function getTestResultsDir(workspaceRoot: string): string {
  return join(workspaceRoot, ".sisyphus/test-results")
}

/**
 * Read a specific test result file
 *
 * @param workspaceRoot - The root directory of the workspace
 * @param todoId - The todo ID or filename (without extension)
 * @returns Parsed test result or null if not found
 */
export function readTestResult(
  workspaceRoot: string,
  todoId: string
): TestResultFile | null {
  const resultsDir = getTestResultsDir(workspaceRoot)
  const filePath = join(resultsDir, `${todoId}.json`)

  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, "utf-8")
    const result = JSON.parse(content) as TestResultFile
    return validateTestResult(result) ? result : null
  } catch {
    return null
  }
}

/**
 * Get the most recent test result
 *
 * @param workspaceRoot - The root directory of the workspace
 * @returns Most recent test result or null if none exist
 */
export function getMostRecentTestResult(
  workspaceRoot: string
): TestResultFile | null {
  const resultsDir = getTestResultsDir(workspaceRoot)

  if (!existsSync(resultsDir)) {
    return null
  }

  try {
    const files = readdirSync(resultsDir)
      .filter(file => file.endsWith(".json"))
      .map(file => {
        const fullPath = join(resultsDir, file)
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

    if (files.length === 0) {
      return null
    }

    // Sort by modification time (most recent first)
    files.sort((a, b) => b.mtime - a.mtime)

    // Read most recent file
    const content = readFileSync(files[0].path, "utf-8")
    const result = JSON.parse(content) as TestResultFile
    return validateTestResult(result) ? result : null
  } catch {
    return null
  }
}

/**
 * Check if tests passed in a result file
 *
 * @param result - Test result to check
 * @returns true if all tests passed
 */
export function didTestsPass(result: TestResultFile): boolean {
  return result.status === "PASS"
}

/**
 * Get total test count from result
 *
 * @param result - Test result
 * @returns Total number of tests run
 */
export function getTotalTestCount(result: TestResultFile): number {
  let total = 0
  if (result.jest) total += result.jest.total
  if (result.playwright) total += result.playwright.total
  return total
}

/**
 * Get failed test count from result
 *
 * @param result - Test result
 * @returns Number of failed tests
 */
export function getFailedTestCount(result: TestResultFile): number {
  let failed = 0
  if (result.jest) failed += result.jest.failed
  if (result.playwright) failed += result.playwright.failed
  return failed
}

/**
 * Validate test result structure
 *
 * @param result - Object to validate
 * @returns true if valid TestResultFile
 */
export function validateTestResult(result: unknown): result is TestResultFile {
  if (!result || typeof result !== "object") return false

  const r = result as Partial<TestResultFile>

  // Required fields
  if (!r.status || (r.status !== "PASS" && r.status !== "FAIL")) return false
  if (typeof r.timestamp !== "number") return false
  if (typeof r.duration_ms !== "number") return false

  // At least one framework result required
  if (!r.jest && !r.playwright) return false

  // Validate jest result if present
  if (r.jest) {
    if (
      typeof r.jest.total !== "number" ||
      typeof r.jest.passed !== "number" ||
      typeof r.jest.failed !== "number"
    ) {
      return false
    }
  }

  // Validate playwright result if present
  if (r.playwright) {
    if (
      typeof r.playwright.total !== "number" ||
      typeof r.playwright.passed !== "number" ||
      typeof r.playwright.failed !== "number"
    ) {
      return false
    }
  }

  return true
}

/**
 * Format test result as human-readable summary
 *
 * @param result - Test result to format
 * @returns Formatted summary string
 */
export function formatTestResultSummary(result: TestResultFile): string {
  const lines: string[] = []
  const statusEmoji = result.status === "PASS" ? "✅" : "❌"

  lines.push(`${statusEmoji} Test Status: ${result.status}`)
  lines.push(`Duration: ${(result.duration_ms / 1000).toFixed(2)}s`)

  if (result.jest) {
    lines.push(
      `Jest: ${result.jest.passed}/${result.jest.total} passed` +
        (result.jest.failed > 0 ? ` (${result.jest.failed} failed)` : "")
    )
  }

  if (result.playwright) {
    lines.push(
      `Playwright: ${result.playwright.passed}/${result.playwright.total} passed` +
        (result.playwright.failed > 0
          ? ` (${result.playwright.failed} failed)`
          : "")
    )
  }

  if (result.failures && result.failures.length > 0) {
    lines.push(`\nFailures (${result.failures.length}):`)
    for (const failure of result.failures.slice(0, 5)) {
      // Show first 5
      lines.push(`  - [${failure.framework}] ${failure.testName}`)
      lines.push(`    ${failure.filePath}`)
      lines.push(`    ${failure.errorMessage}`)
    }
    if (result.failures.length > 5) {
      lines.push(`  ... and ${result.failures.length - 5} more`)
    }
  }

  return lines.join("\n")
}
