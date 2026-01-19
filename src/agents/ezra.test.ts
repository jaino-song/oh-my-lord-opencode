import { describe, test, expect } from "bun:test"
import {
  EZRA_SYSTEM_PROMPT,
  createEzraAgent,
  ezraAgent,
  EZRA_PROMPT_METADATA,
} from "./ezra"

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

describe("EZRA_SYSTEM_PROMPT policy requirements", () => {
  test("should treat SYSTEM DIRECTIVE as ignorable/stripped", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt).toContain("[SYSTEM DIRECTIVE")
    expect(prompt.toLowerCase()).toMatch(/ignore|strip|system directive/)
  })

  test("should extract paths containing .paul/plans/ or .sisyphus/plans/ and ending in .md", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt).toContain(".paul/plans/")
    expect(prompt).toContain(".sisyphus/plans/")
    expect(prompt).toContain(".md")
    expect(prompt.toLowerCase()).toMatch(/extract|find/)
  })

  test("should NOT teach that conversational wrappers are INVALID", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    const invalidExample = "Please review .paul/plans/plan.md"
    const rejectionTeaching = new RegExp(
      `reject.*${escapeRegExp(invalidExample)}`,
      "i"
    )
    expect(prompt).not.toMatch(rejectionTeaching)
  })

  test("should handle ambiguity (2+ paths) and 'no path found' rejection", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/multiple|ambiguous|2\+/)
    expect(prompt.toLowerCase()).toMatch(/no.*path.*found/)
  })
})

describe("EZRA_SYSTEM_PROMPT confidence scoring", () => {
  test("should include confidence scoring system with 0-100 scale", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt).toMatch(/confidence/i)
    expect(prompt).toMatch(/0-100/)
    expect(prompt).toMatch(/\b70\b/)
  })

  test("should only report issues with confidence >= 70", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/only.*report.*70|confidence.*>=?\s*70|threshold.*70/)
  })

  test("should define confidence score ranges with descriptions", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt).toMatch(/0-25/)
    expect(prompt).toMatch(/26-50/)
    expect(prompt).toMatch(/51-69/)
    expect(prompt).toMatch(/70-85/)
    expect(prompt).toMatch(/86-100/)
  })
})

describe("EZRA_SYSTEM_PROMPT review modes", () => {
  test("should support quick review mode", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/quick.*mode|--quick/)
    expect(prompt.toLowerCase()).toMatch(/critical.*blocker/)
  })

  test("should support standard review mode as default", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/standard.*mode|standard.*\(default\)|default/)
  })

  test("should support deep review mode", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/deep.*mode|--deep/)
    expect(prompt.toLowerCase()).toMatch(/simulat/)
    expect(prompt.toLowerCase()).toMatch(/elijah/)
  })
})

describe("EZRA_SYSTEM_PROMPT anti-pattern detection", () => {
  test("should detect Umbrella Task anti-pattern", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/umbrella.*task/)
    expect(prompt).toMatch(/3\+/)
  })

  test("should detect Phantom Dependency anti-pattern", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/phantom.*depend/)
    expect(prompt.toLowerCase()).toMatch(/unlisted/)
  })

  test("should detect Magic Success anti-pattern", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/magic.*success/)
    expect(prompt.toLowerCase()).toMatch(/measur|criteri/)
  })

  test("should detect Infinite Scope anti-pattern", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/infinite.*scope/)
    expect(prompt.toLowerCase()).toMatch(/boundary|never.*end/)
  })

  test("should detect Circular Dependency anti-pattern", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/circular.*depend/)
  })

  test("should detect File Ghost anti-pattern", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/file.*ghost/)
  })
})

describe("EZRA_SYSTEM_PROMPT structured output", () => {
  test("should define structured output format with verdict", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt).toMatch(/PASS/)
    expect(prompt).toMatch(/NEEDS_REVISION/)
    expect(prompt).toMatch(/REJECT/)
    expect(prompt.toLowerCase()).toMatch(/verdict/)
  })

  test("should include statistics section in output format", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/statistic/)
    expect(prompt.toLowerCase()).toMatch(/total.*task/)
    expect(prompt.toLowerCase()).toMatch(/issue/)
  })

  test("should include Elijah escalation recommendation in output", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt).toMatch(/Elijah Escalation.*YES.*NO|Elijah Escalation:\s*\[YES\s*\|\s*NO\]/i)
  })
})

describe("EZRA_SYSTEM_PROMPT Elijah escalation triggers", () => {
  test("should recommend Elijah for plans with 15+ tasks", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt).toMatch(/15\+/)
  })

  test("should recommend Elijah for dense dependencies", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/dense.*depend|inter-depend/)
  })
})

describe("EZRA_SYSTEM_PROMPT ADHD context retention", () => {
  test("should retain ADHD author context framing", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/adhd/)
    expect(prompt.toLowerCase()).toMatch(/rejection/)
    expect(prompt.toLowerCase()).toMatch(/ruthless|critical/)
  })

  test("should include four core evaluation criteria from Momus", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/clarity/)
    expect(prompt.toLowerCase()).toMatch(/verif/)
    expect(prompt.toLowerCase()).toMatch(/context.*complete/)
    expect(prompt.toLowerCase()).toMatch(/big.*picture/)
  })
})

describe("createEzraAgent factory function", () => {
  test("createEzraAgent with default model returns GPT-5.2 config", () => {
    const agent = createEzraAgent()

    expect(agent.model).toBe("openai/gpt-5.2")
    expect(agent.mode).toBe("subagent")
    expect(agent.temperature).toBe(0.1)
  })

  test("createEzraAgent with default model has high reasoningEffort (GPT)", () => {
    const agent = createEzraAgent()

    expect(agent.reasoningEffort).toBe("high")
    expect(agent.thinking).toBeUndefined()
  })

  test("createEzraAgent with GPT model has high reasoningEffort, no thinking", () => {
    const agent = createEzraAgent("openai/gpt-5.2")

    expect(agent.model).toBe("openai/gpt-5.2")
    expect(agent.reasoningEffort).toBe("high")
    expect(agent.textVerbosity).toBe("high")
    expect(agent.thinking).toBeUndefined()
  })

  test("createEzraAgent has prompt attached", () => {
    const agent = createEzraAgent()

    expect(agent.prompt).toBe(EZRA_SYSTEM_PROMPT)
  })
})

describe("EZRA_PROMPT_METADATA", () => {
  test("EZRA_PROMPT_METADATA has correct category", () => {
    expect(EZRA_PROMPT_METADATA.category).toBe("advisor")
  })

  test("EZRA_PROMPT_METADATA has correct cost", () => {
    expect(EZRA_PROMPT_METADATA.cost).toBe("CHEAP")
  })

  test("EZRA_PROMPT_METADATA has promptAlias", () => {
    expect(EZRA_PROMPT_METADATA.promptAlias).toBe("Ezra")
  })

  test("EZRA_PROMPT_METADATA has relevant triggers", () => {
    expect(EZRA_PROMPT_METADATA.triggers).toBeInstanceOf(Array)
    expect(EZRA_PROMPT_METADATA.triggers.length).toBeGreaterThan(0)
    expect(
      EZRA_PROMPT_METADATA.triggers.some(
        (t) =>
          t.domain.toLowerCase().includes("plan") ||
          t.trigger.toLowerCase().includes("plan")
      )
    ).toBe(true)
  })

  test("EZRA_PROMPT_METADATA has useWhen array", () => {
    expect(EZRA_PROMPT_METADATA.useWhen).toBeInstanceOf(Array)
    expect(EZRA_PROMPT_METADATA.useWhen?.length).toBeGreaterThan(0)
  })

  test("EZRA_PROMPT_METADATA has avoidWhen array", () => {
    expect(EZRA_PROMPT_METADATA.avoidWhen).toBeInstanceOf(Array)
  })
})

describe("EZRA_SYSTEM_PROMPT identity", () => {
  test("should reference Ezra in prompt", () => {
    const prompt = EZRA_SYSTEM_PROMPT

    expect(prompt.toLowerCase()).toMatch(/ezra/)
  })
})

describe("ezraAgent default export", () => {
  test("ezraAgent is properly configured", () => {
    expect(ezraAgent).toBeDefined()
    expect(ezraAgent.model).toBe("openai/gpt-5.2")
    expect(ezraAgent.prompt).toBe(EZRA_SYSTEM_PROMPT)
  })
})
