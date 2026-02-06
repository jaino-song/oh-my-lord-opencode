import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"
import type { CallPaulAgentArgs } from "./types"

describe("call-paul-agent skills parameter", () => {
  test("should accept optional skills parameter", () => {
    // #given - args with skills
    const args: CallPaulAgentArgs = {
      description: "Test task",
      prompt: "Do something",
      subagent_type: "explore",
      run_in_background: true,
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
    const args: CallPaulAgentArgs = {
      description: "Test task",
      prompt: "Do something",
      subagent_type: "explore",
      run_in_background: true,
      skills: null,
    }

    // #when - validate args structure
    const hasNullSkills = args.skills === null

    // #then - skills should be null
    expect(hasNullSkills).toBe(true)
  })

  test("should accept undefined skills parameter", () => {
    // #given - args without skills
    const args: CallPaulAgentArgs = {
      description: "Test task",
      prompt: "Do something",
      subagent_type: "explore",
      run_in_background: true,
    }

    // #when - validate args structure
    const hasUndefinedSkills = args.skills === undefined

    // #then - skills should be undefined
    expect(hasUndefinedSkills).toBe(true)
  })

  test("should support empty skills array", () => {
    // #given - args with empty skills array
    const args: CallPaulAgentArgs = {
      description: "Test task",
      prompt: "Do something",
      subagent_type: "explore",
      run_in_background: true,
      skills: [],
    }

    // #when - validate args structure
    const hasEmptySkills = Array.isArray(args.skills) && args.skills.length === 0

    // #then - skills should be empty array
    expect(hasEmptySkills).toBe(true)
  })

  test("should support multiple skills", () => {
    // #given - args with multiple skills
    const skills = ["git-master", "python", "typescript", "docker"]
    const args: CallPaulAgentArgs = {
      description: "Complex task",
      prompt: "Do something complex",
      subagent_type: "librarian",
      run_in_background: false,
      skills,
    }

    // #when - validate args structure
    const skillCount = args.skills?.length ?? 0

    // #then - all skills should be present
    expect(skillCount).toBe(4)
    expect(args.skills).toEqual(skills)
  })
})
