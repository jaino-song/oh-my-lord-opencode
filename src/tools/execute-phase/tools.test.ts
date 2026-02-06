import { describe, test, expect } from "bun:test"
import type { ExecutePhaseArgs } from "./types"

describe("execute-phase skills parameter", () => {
  test("should accept optional skills parameter", () => {
    // #given - args with skills
    const args: ExecutePhaseArgs = {
      phase: 1,
      skills: ["git-master", "python"],
    }

    // #when - validate args structure
    const hasSkills = args.skills !== undefined

    // #then - skills should be present
    expect(hasSkills).toBe(true)
    expect(args.skills).toEqual(["git-master", "python"])
  })

  test("should accept null skills parameter", () => {
    // #given - args with null skills
    const args: ExecutePhaseArgs = {
      phase: 1,
      skills: null,
    }

    // #when - validate args structure
    const hasNullSkills = args.skills === null

    // #then - skills should be null
    expect(hasNullSkills).toBe(true)
  })

  test("should accept undefined skills parameter", () => {
    // #given - args without skills
    const args: ExecutePhaseArgs = {
      phase: 1,
    }

    // #when - validate args structure
    const hasUndefinedSkills = args.skills === undefined

    // #then - skills should be undefined
    expect(hasUndefinedSkills).toBe(true)
  })

  test("should support multiple skills", () => {
    // #given - args with multiple skills
    const skills = ["git-master", "python", "typescript"]
    const args: ExecutePhaseArgs = {
      phase: 2,
      skills,
    }

    // #when - validate args structure
    const skillCount = args.skills?.length ?? 0

    // #then - all skills should be present
    expect(skillCount).toBe(3)
    expect(args.skills).toEqual(skills)
  })

  test("should support different phase numbers with skills", () => {
    // #given - args for different phases
    const phases = [1, 2, 3, 4, 5]
    const skills = ["git-master"]

    // #when - create args for each phase
    const allArgs = phases.map(phase => ({
      phase,
      skills,
    }))

    // #then - all should have correct phase and skills
    expect(allArgs).toHaveLength(5)
    expect(allArgs[0].phase).toBe(1)
    expect(allArgs[4].phase).toBe(5)
    expect(allArgs.every(arg => arg.skills?.includes("git-master"))).toBe(true)
  })
})
