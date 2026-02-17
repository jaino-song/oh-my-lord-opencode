import { describe, test, expect } from "bun:test"
import {
  ELIJAH_SYSTEM_PROMPT,
  createElijahAgent,
  elijahAgent,
  ELIJAH_PROMPT_METADATA,
} from "./elijah"

describe("ELIJAH_SYSTEM_PROMPT identity", () => {
  test("should reference Elijah in prompt", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/elijah/)
  })

  test("should describe Elijah as Deep Reasoning Advisor", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/deep.*reason|reason.*advisor/)
  })

  test("should reference biblical Elijah", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/prophet|biblical|crisis/)
  })

  test("should describe Elijah as Deep Reasoning Advisor for both phases", () => {
    // #given - the phase-agnostic Elijah prompt
    // #when - checking identity description
    // #then - both phases are in the role description
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/planning.*phase.*review|plan.*review/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/execution.*phase.*problem/)
  })
})

describe("ELIJAH_SYSTEM_PROMPT consultation modes", () => {
  test("should include --debug mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/--debug/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/root cause/)
  })

  test("should include --architecture mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/--architecture/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/adr|architecture decision/)
  })

  test("should include --security mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/--security/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/stride|threat/)
  })

  test("should include --performance mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/--performance/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/use method|bottleneck/)
  })

  test("should include --stuck mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/--stuck/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/fresh perspective|alternative/)
  })
})

describe("ELIJAH_SYSTEM_PROMPT frameworks", () => {
  test("should use 5 Whys + Fault Tree for debug mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/5 whys/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/fault tree/)
  })

  test("should use ADR format for architecture mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/ADR/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/context/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/option/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/recommend/)
  })

  test("should use STRIDE for security mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/STRIDE/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/\*\*S\*\*poofing/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/\*\*T\*\*ampering/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/\*\*R\*\*epudiation/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/\*\*I\*\*nformation/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/\*\*D\*\*enial/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/\*\*E\*\*levation/)
  })

  test("should use USE Method for performance mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/USE/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/utilization/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/saturation/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/error/)
  })

  test("should use Reframe approach for stuck mode", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/reframe/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/alternative/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/hidden assumption/)
  })
})

describe("ELIJAH_SYSTEM_PROMPT confidence scoring", () => {
  test("should require confidence scoring in output", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/confidence.*required|required.*confidence/)
  })

  test("should include confidence assessment section", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/### Confidence Assessment/)
  })

  test("should define confidence thresholds", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/80%/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/60-79%/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/40-59%/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/<40%/)
  })

  test("should include uncertainty column", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/uncertainty/)
  })
})

describe("ELIJAH_SYSTEM_PROMPT Devil's Advocate", () => {
  test("should require Devil's Advocate section", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Devil's Advocate/)
  })

  test("should ask what could go wrong", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/what could go wrong/)
  })

  test("should ask when approach would be wrong", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/wrong approach|when.*wrong/)
  })
})

describe("ELIJAH_SYSTEM_PROMPT output format", () => {
  test("should define structured output format", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/## Elijah Consultation/)
  })

  test("should include Bottom Line section", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/### Bottom Line/)
  })

  test("should include Action Plan section", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/### Action Plan/)
  })

  test("should include Escalation section", () => {
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/### Escalation/)
  })

  test("should require effort estimates", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/effort.*estimate/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Quick|Short|Medium|Large/)
  })
})

describe("ELIJAH_SYSTEM_PROMPT constraints", () => {
  test("should NOT contain EXECUTION PHASE ONLY constraint", () => {
    // #given - the rewritten Elijah prompt
    // #when - checking for removed execution-only constraint
    // #then - old identity is gone
    expect(ELIJAH_SYSTEM_PROMPT).not.toMatch(/EXECUTION PHASE ONLY/i)
  })

  test("should contain DUAL PHASE constraint", () => {
    // #given - the rewritten Elijah prompt
    // #when - checking for new phase-agnostic identity
    // #then - dual phase identity is present
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/DUAL PHASE/i)
  })

  test("should contain FILE READING ONLY constraint", () => {
    // #given - the rewritten Elijah prompt
    // #when - checking for updated research constraint
    // #then - file reading only constraint is present
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/FILE READING ONLY/i)
  })

  test("should be read-only", () => {
    // #given - the Elijah prompt
    // #when - checking read-only constraint
    // #then - read-only constraint preserved
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/read-only/)
  })

  test("should NOT delegate", () => {
    // #given - the Elijah prompt
    // #when - checking no-delegation constraint
    // #then - no-delegation constraint preserved
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/no.*delegat/)
  })

  test("should reference both planning and execution phases", () => {
    // #given - the phase-agnostic Elijah prompt
    // #when - checking for dual-phase references
    // #then - both phases are mentioned
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/planning.*phase/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/execution.*phase/)
  })
})

describe("ELIJAH_SYSTEM_PROMPT --plan-review mode", () => {
  test("should include --plan-review mode", () => {
    // #given - the Elijah prompt with new plan-review mode
    // #when - checking for mode flag
    // #then - --plan-review mode exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/--plan-review/)
  })

  test("should include Security Checklist with OWASP reference", () => {
    // #given - the Elijah prompt with concrete checklists
    // #when - checking for OWASP-based security checklist
    // #then - Security Checklist with OWASP reference exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Security Checklist/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/OWASP/)
  })

  test("should include Performance Checklist with plan-specific patterns", () => {
    // #given - the Elijah prompt with concrete checklists
    // #when - checking for performance checklist
    // #then - Performance Checklist with plan-specific patterns exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Performance Checklist/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Plan-Specific/i)
  })

  test("should include Architecture Checklist with design review items", () => {
    // #given - the Elijah prompt with concrete checklists
    // #when - checking for architecture checklist
    // #then - Architecture Checklist with design review exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Architecture Checklist/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Design Review/i)
  })

  test("should define PASS and NEEDS_REVISION verdicts for plan-review", () => {
    // #given - the Elijah prompt
    // #when - checking for plan-review verdicts
    // #then - both verdicts are defined
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/PASS/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/NEEDS_REVISION/)
  })

  test("should include Security Audit section header in output", () => {
    // #given - the Elijah prompt
    // #when - checking for Security Audit output section
    // #then - section header exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/### Security Audit/)
  })

  test("should include Performance Audit section header in output", () => {
    // #given - the Elijah prompt
    // #when - checking for Performance Audit output section
    // #then - section header exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/### Performance Audit/)
  })

  test("should include Architecture Audit section header in output", () => {
    // #given - the Elijah prompt
    // #when - checking for Architecture Audit output section
    // #then - section header exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/### Architecture Audit/)
  })

  test("should contain concrete security checklist items (OWASP-based)", () => {
    // #given - the Elijah prompt with 15-item OWASP security checklist
    // #when - checking for concrete security checklist items
    // #then - key OWASP items are present
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/auth.*mechanism|authentication/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/RBAC|ABAC/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/encryption/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/input.*validation/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/rate.*limit/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/secrets.*management|hardcoded.*credential/)
  })

  test("should contain concrete performance checklist items (plan-specific patterns)", () => {
    // #given - the Elijah prompt with 10-item performance checklist
    // #when - checking for concrete performance checklist items
    // #then - key performance patterns are present
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/N\+1/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/cach/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/pagination/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/connection.*pool/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/index/)
  })

  test("should contain concrete architecture checklist items (design review)", () => {
    // #given - the Elijah prompt with 10-item architecture checklist
    // #when - checking for concrete architecture checklist items
    // #then - key design review items are present
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/single.*responsib/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/coupl/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/rollback/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/backward.*compat/)
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/testab/)
  })

  test("should include Required Plan Changes section in plan-review output", () => {
    // #given - the Elijah prompt
    // #when - checking for actionable output section
    // #then - Required Plan Changes section exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Required Plan Changes/)
  })
})

describe("ELIJAH_SYSTEM_PROMPT --verify-plan mode", () => {
  test("should include --verify-plan mode", () => {
    // #given - the Elijah prompt with new verify-plan mode
    // #when - checking for mode flag
    // #then - --verify-plan mode exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/--verify-plan/)
  })

  test("should reference post-implementation verification", () => {
    // #given - the Elijah prompt
    // #when - checking for post-implementation context
    // #then - post-implementation reference exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/post-implementation/i)
  })

  test("should define VERIFIED and CONCERNS_REMAIN verdicts", () => {
    // #given - the Elijah prompt with verify-plan mode
    // #when - checking for verify-plan verdicts
    // #then - both verdicts are defined
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/VERIFIED/)
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/CONCERNS_REMAIN/)
  })

  test("should include Planning Concerns Resolution section", () => {
    // #given - the Elijah prompt
    // #when - checking for concerns resolution output section
    // #then - Planning Concerns Resolution section exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Planning Concerns Resolution/)
  })

  test("should include Unresolved Concerns section", () => {
    // #given - the Elijah prompt
    // #when - checking for unresolved concerns output section
    // #then - Unresolved Concerns section exists
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Unresolved Concerns/)
  })

  test("should define maintenance-only skip rule for verify-plan", () => {
    // #given - the Elijah prompt
    // #when - checking for docs/config-only skip guidance
    // #then - skip rule is explicitly documented
    expect(ELIJAH_SYSTEM_PROMPT).toMatch(/Verification not needed for maintenance-only plan/)
  })
})

describe("createElijahAgent factory function", () => {
  test("createElijahAgent with default model returns GPT 5.3 Codex config", () => {
    const agent = createElijahAgent()

    expect(agent.model).toBe("openai/gpt-5.3-codex")
    expect(agent.mode).toBe("subagent")
    expect(agent.temperature).toBe(0.1)
  })

  test("createElijahAgent with default model has reasoningEffort (GPT)", () => {
    const agent = createElijahAgent()

    expect(agent.reasoningEffort).toBe("high")
    expect(agent.thinking).toBeUndefined()
  })

  test("createElijahAgent with Claude model has adaptive thinking", () => {
    const agent = createElijahAgent("anthropic/claude-opus-4-6")

    expect(agent.model).toBe("anthropic/claude-opus-4-6")
    expect(agent.thinking).toEqual({ type: "adaptive" })
    expect(agent.reasoningEffort).toBeUndefined()
  })

  test("createElijahAgent has prompt attached", () => {
    const agent = createElijahAgent()

    expect(agent.prompt).toBe(ELIJAH_SYSTEM_PROMPT)
  })

  test("createElijahAgent allows custom model override", () => {
    const agent = createElijahAgent("anthropic/claude-sonnet-4-5")

    expect(agent.model).toBe("anthropic/claude-sonnet-4-5")
  })
})

describe("Elijah vs Oracle config differences", () => {
  test("default model uses GPT with reasoningEffort", () => {
    const agent = createElijahAgent()
    expect(agent.reasoningEffort).toBe("high")
    expect(agent.thinking).toBeUndefined()
  })

  test("GPT model uses high reasoningEffort", () => {
    const agent = createElijahAgent("openai/gpt-5.2")
    expect(agent.reasoningEffort).toBe("high")
    expect(agent.thinking).toBeUndefined()
  })

  test("Claude model uses adaptive thinking", () => {
    const agent = createElijahAgent("anthropic/claude-opus-4-6")
    expect(agent.thinking).toEqual({ type: "adaptive" })
  })
})

describe("ELIJAH_PROMPT_METADATA", () => {
  test("ELIJAH_PROMPT_METADATA has correct cost (EXPENSIVE)", () => {
    expect(ELIJAH_PROMPT_METADATA.cost).toBe("EXPENSIVE")
  })

  test("ELIJAH_PROMPT_METADATA has promptAlias", () => {
    expect(ELIJAH_PROMPT_METADATA.promptAlias).toBe("Elijah")
  })

  test("ELIJAH_PROMPT_METADATA has at least 7 triggers (5 modes + plan-review + verify-plan)", () => {
    // #given - the updated Elijah metadata with plan-review and verify-plan triggers
    // #when - checking trigger count
    // #then - at least 7 triggers (5 original + plan-review + verify-plan)
    expect(ELIJAH_PROMPT_METADATA.triggers).toBeInstanceOf(Array)
    expect(ELIJAH_PROMPT_METADATA.triggers.length).toBeGreaterThanOrEqual(7)
  })

  test("ELIJAH_PROMPT_METADATA triggers include debug mode", () => {
    expect(
      ELIJAH_PROMPT_METADATA.triggers.some(
        (t) => t.trigger.toLowerCase().includes("debug") || t.domain.toLowerCase().includes("debug")
      )
    ).toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA triggers include architecture mode", () => {
    expect(
      ELIJAH_PROMPT_METADATA.triggers.some(
        (t) => t.trigger.toLowerCase().includes("architecture") || t.domain.toLowerCase().includes("architecture")
      )
    ).toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA triggers include security mode", () => {
    expect(
      ELIJAH_PROMPT_METADATA.triggers.some(
        (t) => t.trigger.toLowerCase().includes("security") || t.domain.toLowerCase().includes("security")
      )
    ).toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA triggers include performance mode", () => {
    expect(
      ELIJAH_PROMPT_METADATA.triggers.some(
        (t) => t.trigger.toLowerCase().includes("performance") || t.domain.toLowerCase().includes("performance")
      )
    ).toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA triggers include stuck mode", () => {
    expect(
      ELIJAH_PROMPT_METADATA.triggers.some(
        (t) => t.trigger.toLowerCase().includes("stuck") || t.domain.toLowerCase().includes("unblock")
      )
    ).toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA has useWhen array", () => {
    expect(ELIJAH_PROMPT_METADATA.useWhen).toBeInstanceOf(Array)
    expect(ELIJAH_PROMPT_METADATA.useWhen?.length).toBeGreaterThan(0)
  })

  test("ELIJAH_PROMPT_METADATA has avoidWhen array without pre-planning exclusion", () => {
    // #given - the updated Elijah metadata
    // #when - checking avoidWhen no longer excludes planning
    // #then - pre-planning avoidance is removed
    expect(ELIJAH_PROMPT_METADATA.avoidWhen).toBeInstanceOf(Array)
    expect(
      ELIJAH_PROMPT_METADATA.avoidWhen?.some((a) => a.toLowerCase().includes("pre-planning"))
    ).not.toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA has updated keyTrigger referencing plan-review", () => {
    // #given - the updated Elijah metadata
    // #when - checking keyTrigger
    // #then - keyTrigger references plan-review mode
    expect(ELIJAH_PROMPT_METADATA.keyTrigger).toBeDefined()
    expect(ELIJAH_PROMPT_METADATA.keyTrigger?.toLowerCase()).toMatch(/plan.*review/)
  })

  test("ELIJAH_PROMPT_METADATA triggers include plan-review mode", () => {
    // #given - the updated Elijah metadata
    // #when - checking for plan-review trigger
    // #then - plan review trigger exists
    expect(
      ELIJAH_PROMPT_METADATA.triggers.some(
        (t) => t.trigger.toLowerCase().includes("plan-review") || t.domain.toLowerCase().includes("plan review")
      )
    ).toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA triggers include verify-plan mode", () => {
    // #given - the updated Elijah metadata
    // #when - checking for verify-plan trigger
    // #then - verify-plan trigger exists
    expect(
      ELIJAH_PROMPT_METADATA.triggers.some(
        (t) => t.trigger.toLowerCase().includes("verify") || t.domain.toLowerCase().includes("verify")
      )
    ).toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA includes code-implementation plan in useWhen", () => {
    // #given - the updated Elijah metadata
    // #when - checking useWhen includes planning use case
    // #then - code-implementation plan use case exists
    expect(
      ELIJAH_PROMPT_METADATA.useWhen?.some((u) => u.toLowerCase().includes("code-implementation") || u.toLowerCase().includes("before ezra"))
    ).toBe(true)
  })
})

describe("elijahAgent default export", () => {
  test("elijahAgent is properly configured", () => {
    expect(elijahAgent).toBeDefined()
    expect(elijahAgent.model).toBe("openai/gpt-5.3-codex")
    expect(elijahAgent.prompt).toBe(ELIJAH_SYSTEM_PROMPT)
  })

  test("elijahAgent has description mentioning plan reviews", () => {
    // #given - the updated Elijah agent
    // #when - checking description
    // #then - description mentions plan reviews
    expect(elijahAgent.description).toBeDefined()
    expect(elijahAgent.description?.toLowerCase()).toMatch(/plan.*review|plan.*audit/)
  })

  test("elijahAgent has description mentioning --plan-review mode", () => {
    // #given - the updated Elijah agent
    // #when - checking description for mode flag
    // #then - description lists --plan-review
    expect(elijahAgent.description).toMatch(/--plan-review/)
  })
})
