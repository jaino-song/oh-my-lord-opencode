import { describe, test, expect } from "bun:test"
import {
  NATHAN_SYSTEM_PROMPT,
  createNathanAgent,
  nathanAgent,
  NATHAN_PROMPT_METADATA,
} from "./nathan"

describe("NATHAN_SYSTEM_PROMPT identity", () => {
  test("should reference Nathan in prompt", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/nathan/)
  })

  test("should describe Nathan as Request Analyst", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/request.*analyst/)
  })

  test("should reference biblical Nathan", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/prophet|king david|biblical/)
  })
})

describe("NATHAN_SYSTEM_PROMPT unique responsibilities", () => {
  test("should include intent classification", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/intent.*classif/)
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/Build|Fix|Refactor|Architecture|Research/)
  })

  test("should include pre-interview research phase", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/research.*first|phase 0.*research/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/explore/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/librarian/)
  })

  test("should include guardrail generation", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/guardrail/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/must not/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/ai-slop|ai slop/)
  })

  test("should include question prioritization", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/question.*priorit|priority.*question/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/critical/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/high/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/medium/)
  })

  test("should include scope boundary detection", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/scope.*boundar/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/in.*scope/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/out.*scope/)
  })
})

describe("NATHAN_SYSTEM_PROMPT intent types", () => {
  test("should define Build intent", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/Build/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/create|add|new feature/)
  })

  test("should define Fix intent", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/Fix/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/bug|broken/)
  })

  test("should define Refactor intent", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/Refactor/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/restructure|clean up/)
  })

  test("should define Architecture intent", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/Architecture/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/design|structure/)
  })

  test("should define Research intent", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/Research/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/investigate|explore/)
  })
})

describe("NATHAN_SYSTEM_PROMPT guardrails by intent", () => {
  test("should have Build intent guardrails", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/build.*guardrail|build intent/i)
  })

  test("should have Fix intent guardrails", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/fix.*guardrail|fix intent/i)
  })

  test("should have Refactor intent guardrails", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/refactor.*guardrail|refactor intent/i)
  })

  test("should have Architecture intent guardrails", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/architecture.*guardrail|architecture intent/i)
  })

  test("should have Research intent guardrails", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/research.*guardrail|research intent/i)
  })
})

describe("NATHAN_SYSTEM_PROMPT Elijah consultation trigger", () => {
  test("should mention Elijah consultation", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/elijah.*consult|consult.*elijah/)
  })

  test("should define when to recommend Elijah", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/multi-system|security|performance|unfamiliar/)
  })
})

describe("NATHAN_SYSTEM_PROMPT output format", () => {
  test("should define structured output format", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/## Nathan Analysis/)
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/### Intent Classification/)
  })

  test("should include research findings section", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/research.*finding/)
  })

  test("should include guardrails section", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/### Guardrails/)
  })

  test("should include priority questions section", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/### Priority Questions/)
  })

  test("should include scope boundaries section", () => {
    expect(NATHAN_SYSTEM_PROMPT).toMatch(/### Scope Boundaries/)
  })

  test("should include risk flags section", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/risk.*flag/)
  })
})

describe("NATHAN_SYSTEM_PROMPT constraints", () => {
  test("should be read-only", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/read-only/)
  })

  test("should NOT create plans", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/no.*plan|not.*create.*plan/)
  })

  test("should prepare questions for planner-paul, not ask directly", () => {
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/planner-paul/)
    expect(NATHAN_SYSTEM_PROMPT.toLowerCase()).toMatch(/prepare.*question/)
  })
})

describe("createNathanAgent factory function", () => {
  test("createNathanAgent with default model returns GPT-5.2 config", () => {
    const agent = createNathanAgent()

    expect(agent.model).toBe("openai/gpt-5.2")
    expect(agent.mode).toBe("subagent")
    expect(agent.temperature).toBe(0.1)
  })

  test("createNathanAgent with default model has high reasoningEffort (GPT)", () => {
    const agent = createNathanAgent()

    expect(agent.reasoningEffort).toBe("high")
    expect(agent.thinking).toBeUndefined()
  })

  test("createNathanAgent with GPT model has high reasoningEffort, no thinking", () => {
    const agent = createNathanAgent("openai/gpt-5.2")

    expect(agent.model).toBe("openai/gpt-5.2")
    expect(agent.reasoningEffort).toBe("high")
    expect(agent.textVerbosity).toBe("high")
    expect(agent.thinking).toBeUndefined()
  })

  test("createNathanAgent has prompt attached", () => {
    const agent = createNathanAgent()

    expect(agent.prompt).toBe(NATHAN_SYSTEM_PROMPT)
  })

  test("createNathanAgent allows custom model override", () => {
    const agent = createNathanAgent("anthropic/claude-opus-4-5")

    expect(agent.model).toBe("anthropic/claude-opus-4-5")
  })
})

describe("NATHAN_PROMPT_METADATA", () => {
  test("NATHAN_PROMPT_METADATA has correct category", () => {
    expect(NATHAN_PROMPT_METADATA.category).toBe("advisor")
  })

  test("NATHAN_PROMPT_METADATA has correct cost (CHEAP)", () => {
    expect(NATHAN_PROMPT_METADATA.cost).toBe("CHEAP")
  })

  test("NATHAN_PROMPT_METADATA has promptAlias", () => {
    expect(NATHAN_PROMPT_METADATA.promptAlias).toBe("Nathan")
  })

  test("NATHAN_PROMPT_METADATA has relevant triggers", () => {
    expect(NATHAN_PROMPT_METADATA.triggers).toBeInstanceOf(Array)
    expect(NATHAN_PROMPT_METADATA.triggers.length).toBeGreaterThan(0)
    expect(
      NATHAN_PROMPT_METADATA.triggers.some(
        (t) =>
          t.domain.toLowerCase().includes("pre-planning") ||
          t.trigger.toLowerCase().includes("before")
      )
    ).toBe(true)
  })

  test("NATHAN_PROMPT_METADATA has useWhen array", () => {
    expect(NATHAN_PROMPT_METADATA.useWhen).toBeInstanceOf(Array)
    expect(NATHAN_PROMPT_METADATA.useWhen?.length).toBeGreaterThan(0)
  })

  test("NATHAN_PROMPT_METADATA has avoidWhen array", () => {
    expect(NATHAN_PROMPT_METADATA.avoidWhen).toBeInstanceOf(Array)
  })

  test("NATHAN_PROMPT_METADATA has keyTrigger", () => {
    expect(NATHAN_PROMPT_METADATA.keyTrigger).toBeDefined()
    expect(NATHAN_PROMPT_METADATA.keyTrigger?.toLowerCase()).toMatch(/nathan/)
  })
})

describe("nathanAgent default export", () => {
  test("nathanAgent is properly configured", () => {
    expect(nathanAgent).toBeDefined()
    expect(nathanAgent.model).toBe("openai/gpt-5.2")
    expect(nathanAgent.prompt).toBe(NATHAN_SYSTEM_PROMPT)
  })

  test("nathanAgent has correct description", () => {
    expect(nathanAgent.description).toBeDefined()
    expect(nathanAgent.description?.toLowerCase()).toMatch(/request.*analyst|intent|guardrail/)
  })
})
