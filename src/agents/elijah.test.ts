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
  test("should be read-only", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/read-only/)
  })

  test("should NOT delegate", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/no.*delegat/)
  })

  test("should NOT gather research", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/no.*research|not.*gather/)
  })

  test("should be execution phase only", () => {
    expect(ELIJAH_SYSTEM_PROMPT.toLowerCase()).toMatch(/execution.*phase/)
  })
})

describe("createElijahAgent factory function", () => {
  test("createElijahAgent with default model returns GPT-5.2-codex config", () => {
    const agent = createElijahAgent()

    expect(agent.model).toBe("openai/gpt-5.2-codex")
    expect(agent.mode).toBe("subagent")
    expect(agent.temperature).toBe(0.1)
  })

  test("createElijahAgent with default model has HIGH reasoningEffort (not medium)", () => {
    const agent = createElijahAgent()

    expect(agent.reasoningEffort).toBe("high")
    expect(agent.textVerbosity).toBe("high")
    expect(agent.thinking).toBeUndefined()
  })

  test("createElijahAgent with Claude model has 64k budgetTokens (not 32k)", () => {
    const agent = createElijahAgent("anthropic/claude-opus-4-5")

    expect(agent.model).toBe("anthropic/claude-opus-4-5")
    expect(agent.thinking).toEqual({ type: "enabled", budgetTokens: 64000 })
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
  test("reasoningEffort should be 'high' not 'medium'", () => {
    const agent = createElijahAgent()
    expect(agent.reasoningEffort).toBe("high")
  })

  test("budgetTokens should be 64000 not 32000 for Claude", () => {
    const agent = createElijahAgent("anthropic/claude-opus-4-5")
    expect(agent.thinking).toEqual({ type: "enabled", budgetTokens: 64000 })
  })
})

describe("ELIJAH_PROMPT_METADATA", () => {
  test("ELIJAH_PROMPT_METADATA has correct cost (EXPENSIVE)", () => {
    expect(ELIJAH_PROMPT_METADATA.cost).toBe("EXPENSIVE")
  })

  test("ELIJAH_PROMPT_METADATA has promptAlias", () => {
    expect(ELIJAH_PROMPT_METADATA.promptAlias).toBe("Elijah")
  })

  test("ELIJAH_PROMPT_METADATA has triggers for all 5 modes", () => {
    expect(ELIJAH_PROMPT_METADATA.triggers).toBeInstanceOf(Array)
    expect(ELIJAH_PROMPT_METADATA.triggers.length).toBeGreaterThanOrEqual(5)
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

  test("ELIJAH_PROMPT_METADATA has avoidWhen array", () => {
    expect(ELIJAH_PROMPT_METADATA.avoidWhen).toBeInstanceOf(Array)
    expect(ELIJAH_PROMPT_METADATA.avoidWhen?.some((a) => a.toLowerCase().includes("nathan"))).toBe(true)
  })

  test("ELIJAH_PROMPT_METADATA has keyTrigger", () => {
    expect(ELIJAH_PROMPT_METADATA.keyTrigger).toBeDefined()
    expect(ELIJAH_PROMPT_METADATA.keyTrigger?.toLowerCase()).toMatch(/elijah|crisis|execution/)
  })
})

describe("elijahAgent default export", () => {
  test("elijahAgent is properly configured", () => {
    expect(elijahAgent).toBeDefined()
    expect(elijahAgent.model).toBe("openai/gpt-5.2-codex")
    expect(elijahAgent.prompt).toBe(ELIJAH_SYSTEM_PROMPT)
  })

  test("elijahAgent has correct description", () => {
    expect(elijahAgent.description).toBeDefined()
    expect(elijahAgent.description?.toLowerCase()).toMatch(/deep.*reason|debug|architecture|security|performance|stuck/)
  })
})
