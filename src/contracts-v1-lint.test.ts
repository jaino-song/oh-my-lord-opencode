import { describe, expect, test } from "bun:test"
import { lintContractsV1PlanContent } from "./tools/execute-phase/tools"

describe("contracts-v1 lint", () => {
  test("passes for valid contracts-v1 block", () => {
    // #given
    const plan = `# Plan

\`\`\`json
{
  "schemaVersion": "contracts-v1",
  "contracts": [
    {
      "id": "FC-LOGIN",
      "files": ["src/app/login/page.tsx"],
      "todoIds": ["TD-LOGIN-001"],
      "acceptance": {
        "requiredFilesExist": ["src/app/login/page.tsx"],
        "requireTodoIdsResolved": true,
        "frontendConformance": true
      }
    }
  ]
}
\`\`\`
`

    // #when
    const errors = lintContractsV1PlanContent(plan)

    // #then
    expect(errors).toEqual([])
  })

  test("returns schema and shape errors for invalid contracts-v1 block", () => {
    // #given
    const plan = `# Plan

\`\`\`json
{
  "schemaVersion": "contracts-v1",
  "contracts": [
    {
      "id": "",
      "files": [],
      "todoIds": ["bad-id"],
      "acceptance": {
        "requiredPatterns": [{ "file": "", "regex": "(" }]
      }
    }
  ]
}
\`\`\`
`

    // #when
    const errors = lintContractsV1PlanContent(plan)

    // #then
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some((e) => e.includes("contracts.0.id"))).toBe(true)
  })
})
