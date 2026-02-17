import { describe, test, expect } from "bun:test"
import {
  inferAgentFromTodoContent,
  extractRequiredSkillsFromTodoContent,
  extractContractRefsFromTodoContent,
  extractFileRefsFromTodoContent,
  extractTodoAnchorIdsFromTodoContent,
  parseMachineReadableContractSpec,
  parseMachineReadableContractSpecWithValidation,
  parsePlanContractBlocks,
} from "./tools"
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

describe("execute-phase agent inference", () => {
  test("should route UI tasks to frontend-ui-ux-engineer", () => {
    // #given
    const todoContent = "EXEC:: [P2.3] Update button spacing and tailwind classes"

    // #when
    const agent = inferAgentFromTodoContent(todoContent)

    // #then
    expect(agent).toBe("frontend-ui-ux-engineer")
  })

  test("should route git tasks to git-master", () => {
    // #given
    const todoContent = "EXEC:: [P1.5] Create git checkpoint commit"

    // #when
    const agent = inferAgentFromTodoContent(todoContent)

    // #then
    expect(agent).toBe("git-master")
  })

  test("should prioritize git tasks over UI keywords", () => {
    // #given
    const todoContent = "EXEC:: [P7.9] Commit UI layout tweaks"

    // #when
    const agent = inferAgentFromTodoContent(todoContent)

    // #then
    expect(agent).toBe("git-master")
  })

  test("should default to Paul-Junior for non-UI non-git tasks", () => {
    // #given
    const todoContent = "EXEC:: [P3.1] Implement API service validation"

    // #when
    const agent = inferAgentFromTodoContent(todoContent)

    // #then
    expect(agent).toBe("Paul-Junior")
  })
})

describe("execute-phase task skill parsing", () => {
  test("should parse explicit Skills metadata", () => {
    // #given
    const todoContent = "EXEC:: [P1.1] Build hero section (Agent: frontend-ui-ux-engineer) (Skills: frontend-design, ui-ux-pro-max)"

    // #when
    const skills = extractRequiredSkillsFromTodoContent(todoContent)

    // #then
    expect(skills).toEqual(["frontend-design", "ui-ux-pro-max"])
  })

  test("should parse Required Skills metadata alias", () => {
    // #given
    const todoContent = "EXEC:: [P2.1] Improve performance (Agent: frontend-ui-ux-engineer) (Required Skills: vercel-react-best-practices)"

    // #when
    const skills = extractRequiredSkillsFromTodoContent(todoContent)

    // #then
    expect(skills).toEqual(["vercel-react-best-practices"])
  })

  test("should parse explicit none skills", () => {
    // #given
    const todoContent = "EXEC:: [P3.1] Run full test suite (Agent: Joshua) (Skills: none)"

    // #when
    const skills = extractRequiredSkillsFromTodoContent(todoContent)

    // #then
    expect(skills).toEqual([])
  })

  test("should return undefined when no skills metadata exists", () => {
    // #given
    const todoContent = "EXEC:: [P4.1] Implement API endpoint (Agent: Paul-Junior)"

    // #when
    const skills = extractRequiredSkillsFromTodoContent(todoContent)

    // #then
    expect(skills).toBeUndefined()
  })
})

describe("execute-phase task contract metadata parsing", () => {
  test("should parse contract refs", () => {
    // #given
    const todoContent = "EXEC:: [P1.1] Build hero section (Agent: frontend-ui-ux-engineer) (Contracts: FC-HERO, FC-CARD)"

    // #when
    const contracts = extractContractRefsFromTodoContent(todoContent)

    // #then
    expect(contracts).toEqual(["FC-HERO", "FC-CARD"])
  })

  test("should parse file refs", () => {
    // #given
    const todoContent = "EXEC:: [P1.2] Implement login form (Files: src/app/login/page.tsx, src/components/login-form.tsx)"

    // #when
    const files = extractFileRefsFromTodoContent(todoContent)

    // #then
    expect(files).toEqual(["src/app/login/page.tsx", "src/components/login-form.tsx"])
  })

  test("should parse TODO anchor IDs", () => {
    // #given
    const todoContent = "EXEC:: [P1.3] Resolve deferred behavior (TODO-IDs: TD-LOGIN-001, TD-LOGIN-002)"

    // #when
    const todoIds = extractTodoAnchorIdsFromTodoContent(todoContent)

    // #then
    expect(todoIds).toEqual(["TD-LOGIN-001", "TD-LOGIN-002"])
  })

  test("should normalize none values for metadata", () => {
    // #given
    const todoContent = "EXEC:: [P3.1] Run checks (Contracts: none) (Files: none) (TODO-IDs: none)"

    // #when
    const contracts = extractContractRefsFromTodoContent(todoContent)
    const files = extractFileRefsFromTodoContent(todoContent)
    const todoIds = extractTodoAnchorIdsFromTodoContent(todoContent)

    // #then
    expect(contracts).toEqual([])
    expect(files).toEqual([])
    expect(todoIds).toEqual([])
  })
})

describe("execute-phase plan file contract parsing", () => {
  test("should parse file contracts by heading id", () => {
    // #given
    const planContent = `# Example Plan

## Blueprint

### File Contracts

#### FC-LOGIN-FORM
**File**: \`src/components/login-form.tsx\`
1. Render inputs

#### FC-AUTH-SERVICE
**File**: \`src/services/auth.ts\`
1. Implement login call

### UI Planning Contract
- Keep spacing consistent`

    // #when
    const contracts = parsePlanContractBlocks(planContent)

    // #then
    expect(contracts.size).toBe(2)
    expect(contracts.get("FC-LOGIN-FORM")).toContain("login-form.tsx")
    expect(contracts.get("FC-AUTH-SERVICE")).toContain("auth.ts")
  })

  test("should parse machine-readable contracts-v1 block", () => {
    // #given
    const planContent = `# Plan

## Blueprint

### File Contracts


\`\`\`json
{
  "schemaVersion": "contracts-v1",
  "contracts": [
    {
      "id": "FC-LOGIN-FORM",
      "files": ["src/components/login-form.tsx"],
      "todoIds": ["TD-LOGIN-001"],
      "acceptance": {
        "requiredFilesExist": ["src/components/login-form.tsx"],
        "frontendConformance": true
      }
    }
  ]
}
\`\`\`
`

    // #when
    const spec = parseMachineReadableContractSpec(planContent)

    // #then
    expect(spec?.schemaVersion).toBe("contracts-v1")
    expect(spec?.contracts).toHaveLength(1)
    expect(spec?.contracts[0].id).toBe("FC-LOGIN-FORM")
    expect(spec?.contracts[0].acceptance?.frontendConformance).toBe(true)
  })

  test("should ignore non-schema json blocks", () => {
    // #given
    const planContent = `# Plan
\`\`\`json
{ "foo": "bar" }
\`\`\`
`

    // #when
    const spec = parseMachineReadableContractSpec(planContent)

    // #then
    expect(spec).toBeUndefined()
  })

  test("should return field-level schema errors for malformed contracts-v1 block", () => {
    // #given
    const planContent = `# Plan
\`\`\`json
{
  "schemaVersion": "contracts-v1",
  "contracts": [
    {
      "id": "",
      "files": ["src/app/page.tsx"],
      "acceptance": {
        "requiredPatterns": [
          { "file": "", "regex": "(" }
        ]
      }
    }
  ]
}
\`\`\`
`

    // #when
    const parsed = parseMachineReadableContractSpecWithValidation(planContent)

    // #then
    expect(parsed.spec).toBeUndefined()
    expect(parsed.candidateFound).toBe(true)
    expect(parsed.errors.length).toBeGreaterThan(0)
    expect(parsed.errors.some((e) => e.includes("contracts.0.id"))).toBe(true)
  })
})
