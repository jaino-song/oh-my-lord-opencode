import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  extractImplementationFileRefsFromPlanContent,
  getLatestImplementationFileMtimeFromPlan,
  isActivePlanImplementation,
  isImplementationPlanContent,
} from "./plan-utils"

describe("plan-utils implementation-plan detection", () => {
  let tempDir: string

  beforeEach(() => {
    // #given
    tempDir = mkdtempSync(join(tmpdir(), "plan-utils-test-"))
    mkdirSync(join(tempDir, ".paul", "plans"), { recursive: true })
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test("detects implementation plan content from code file extensions", () => {
    // #given
    const content = "## File Tree\n- src/features/auth/login.ts\n- src/app/page.tsx\n"

    // #when
    const result = isImplementationPlanContent(content)

    // #then
    expect(result).toBe(true)
  })

  test("does not flag docs/config-only content as implementation", () => {
    // #given
    const content = "## Files\n- docs/AGENTS.md\n- docs/WORKFLOWS.md\n- assets/oh-my-lord-opencode.schema.json\n"

    // #when
    const result = isImplementationPlanContent(content)

    // #then
    expect(result).toBe(false)
  })

  test("detects implementation active plan from latest plan file", () => {
    // #given
    writeFileSync(join(tempDir, ".paul", "plans", "plan-a.md"), "- src/index.ts")

    // #when
    const result = isActivePlanImplementation(tempDir)

    // #then
    expect(result).toBe(true)
  })

  test("extracts implementation file refs from plan content", () => {
    // #given
    const content = "- src/app/page.tsx\n- `src/features/auth/service.ts`\n- docs/README.md\n"

    // #when
    const refs = extractImplementationFileRefsFromPlanContent(content)

    // #then
    expect(refs).toEqual(["src/app/page.tsx", "src/features/auth/service.ts"])
  })

  test("returns latest implementation file mtime from active plan scope", () => {
    // #given
    writeFileSync(join(tempDir, ".paul", "plans", "plan-z.md"), "- src/feature/a.ts\n- src/feature/b.tsx\n")
    mkdirSync(join(tempDir, "src", "feature"), { recursive: true })
    const fileA = join(tempDir, "src", "feature", "a.ts")
    const fileB = join(tempDir, "src", "feature", "b.tsx")
    writeFileSync(fileA, "export const a = 1\n")
    writeFileSync(fileB, "export const b = 2\n")
    const now = Date.now() / 1000
    utimesSync(fileA, now - 10, now - 10)
    utimesSync(fileB, now, now)

    // #when
    const latest = getLatestImplementationFileMtimeFromPlan(tempDir)

    // #then
    expect(latest).not.toBeNull()
    expect((latest ?? 0) > 0).toBe(true)
  })
})
