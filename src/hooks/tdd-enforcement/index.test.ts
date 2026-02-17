import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createTddEnforcementHook } from "./index"

describe("tdd-enforcement Elijah verify-plan gate", () => {
  let tempDir: string

  beforeEach(() => {
    // #given - isolated workspace with .paul directories
    tempDir = mkdtempSync(join(tmpdir(), "tdd-enforcement-elijah-"))
    mkdirSync(join(tempDir, ".paul", "plans"), { recursive: true })
    mkdirSync(join(tempDir, ".paul"), { recursive: true })
    writeFileSync(join(tempDir, ".paul", "approval_state.json"), JSON.stringify({ approvals: [] }, null, 2))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test("blocks final todo completion for implementation plans without recent Elijah verification", async () => {
    // #given
    writeFileSync(
      join(tempDir, ".paul", "plans", "impl-plan.md"),
      "# Plan\n\n## Blueprint\n\n### File Tree\n- src/features/auth/service.ts\n"
    )
    const hook = createTddEnforcementHook({ directory: tempDir } as any)

    // #when / #then
    const run = hook["tool.execute.before"](
      { tool: "todowrite", sessionID: "s1", callID: "c1" },
      {
        args: {
          todos: [
            { status: "completed" },
            { status: "cancelled" },
          ],
        },
      }
    ) as Promise<void>

    await expect(run).rejects.toThrow("PLAN VERIFICATION BLOCK")
  })

  test("allows final todo completion when recent Elijah approval exists", async () => {
    // #given
    writeFileSync(
      join(tempDir, ".paul", "plans", "impl-plan.md"),
      "# Plan\n\n## TODOs\n- src/app/page.tsx\n"
    )
    writeFileSync(
      join(tempDir, ".paul", "approval_state.json"),
      JSON.stringify(
        {
          approvals: [
            {
              taskId: "task-1",
              approver: "Elijah",
              timestamp: Date.now(),
              status: "approved",
            },
          ],
        },
        null,
        2
      )
    )
    const hook = createTddEnforcementHook({ directory: tempDir } as any)

    // #when / #then
    const run = hook["tool.execute.before"](
      { tool: "todowrite", sessionID: "s1", callID: "c2" },
      {
        args: {
          todos: [
            { status: "completed" },
            { status: "completed" },
          ],
        },
      }
    ) as Promise<void>

    await expect(run).resolves.toBeUndefined()
  })

  test("skips Elijah requirement for maintenance-only plans", async () => {
    // #given
    writeFileSync(
      join(tempDir, ".paul", "plans", "docs-plan.md"),
      "# Docs Plan\n\n## Files\n- docs/WORKFLOWS.md\n- assets/config.json\n"
    )
    const hook = createTddEnforcementHook({ directory: tempDir } as any)

    // #when / #then
    const run = hook["tool.execute.before"](
      { tool: "todowrite", sessionID: "s1", callID: "c3" },
      {
        args: {
          todos: [
            { status: "completed" },
            { status: "cancelled" },
          ],
        },
      }
    ) as Promise<void>

    await expect(run).resolves.toBeUndefined()
  })

  test("does not require Elijah for non-final todo updates", async () => {
    // #given
    writeFileSync(
      join(tempDir, ".paul", "plans", "impl-plan.md"),
      "# Plan\n\n- src/features/cart/index.ts\n"
    )
    const hook = createTddEnforcementHook({ directory: tempDir } as any)

    // #when / #then
    const run = hook["tool.execute.before"](
      { tool: "todowrite", sessionID: "s1", callID: "c4" },
      {
        args: {
          todos: [
            { status: "completed" },
            { status: "pending" },
          ],
        },
      }
    ) as Promise<void>

    await expect(run).resolves.toBeUndefined()
  })

  test("blocks final completion when Elijah approval is older than implementation file changes", async () => {
    // #given
    writeFileSync(
      join(tempDir, ".paul", "plans", "impl-plan.md"),
      "# Plan\n\n## File Tree\n- src/features/auth/service.ts\n"
    )
    mkdirSync(join(tempDir, "src", "features", "auth"), { recursive: true })
    const implFile = join(tempDir, "src", "features", "auth", "service.ts")
    writeFileSync(implFile, "export const login = () => true\n")

    const approvalTimestamp = Date.now() - 60_000
    writeFileSync(
      join(tempDir, ".paul", "approval_state.json"),
      JSON.stringify(
        {
          approvals: [
            {
              taskId: "task-stale",
              approver: "Elijah",
              timestamp: approvalTimestamp,
              status: "approved",
            },
          ],
        },
        null,
        2
      )
    )
    const newerSeconds = (Date.now() + 10_000) / 1000
    utimesSync(implFile, newerSeconds, newerSeconds)

    const hook = createTddEnforcementHook({ directory: tempDir } as any)

    // #when / #then
    const run = hook["tool.execute.before"](
      { tool: "todowrite", sessionID: "s1", callID: "c5" },
      {
        args: {
          todos: [
            { status: "completed" },
            { status: "completed" },
          ],
        },
      }
    ) as Promise<void>

    await expect(run).rejects.toThrow("PLAN VERIFICATION STALE")
  })
})
