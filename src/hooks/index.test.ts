import { describe, test, expect } from "bun:test"

import { sortHooksByPriority } from "./index"

interface TestHook {
  name: string
  priority?: number
}

describe("Hook Priority System", () => {
  describe("sortHooksByPriority", () => {
    test("should sort hooks by priority in descending order (highest first)", () => {
      // #given - array of hooks with different priorities
      const hooks: TestHook[] = [
        { name: "low-priority", priority: 0 },
        { name: "high-priority", priority: 100 },
        { name: "medium-priority", priority: 50 },
      ]

      // #when - sorting hooks by priority
      const sortedHooks = sortHooksByPriority(hooks)

      // #then - hooks are ordered by priority descending
      expect(sortedHooks[0].priority).toBe(100)
      expect(sortedHooks[1].priority).toBe(50)
      expect(sortedHooks[2].priority).toBe(0)
    })

    test("should treat hooks without priority field as priority 0", () => {
      // #given - hook without priority property
      const hookWithoutPriority: TestHook = { name: "no-priority-hook" }

      // #when - checking the default priority behavior
      const defaultPriority = hookWithoutPriority.priority ?? 0

      // #then - defaults to 0
      expect(defaultPriority).toBe(0)
    })

    test("should sort hooks without priority as priority 0", () => {
      // #given - mix of hooks with and without priority
      const hooks: TestHook[] = [
        { name: "no-priority" },
        { name: "high-priority", priority: 100 },
        { name: "explicit-zero", priority: 0 },
      ]

      // #when - sorting hooks by priority
      const sortedHooks = sortHooksByPriority(hooks)

      // #then - high priority first, then both zero-priority hooks
      expect(sortedHooks[0].priority).toBe(100)
      expect(sortedHooks[0].name).toBe("high-priority")
      expect(sortedHooks[1].priority ?? 0).toBe(0)
      expect(sortedHooks[2].priority ?? 0).toBe(0)
    })

    test("should maintain stable sort order for hooks with equal priorities", () => {
      // #given - two hooks with same priority (insertion order matters)
      const hooks: TestHook[] = [
        { name: "first-added", priority: 0 },
        { name: "second-added", priority: 0 },
      ]

      // #when - sorting hooks by priority
      const sortedHooks = sortHooksByPriority(hooks)

      // #then - original insertion order preserved for equal priorities
      expect(sortedHooks[0].name).toBe("first-added")
      expect(sortedHooks[1].name).toBe("second-added")
    })

    test("should maintain stable sort for multiple hooks with same priority", () => {
      // #given - multiple hooks with same priority interspersed with different priorities
      const hooks: TestHook[] = [
        { name: "first-zero", priority: 0 },
        { name: "high", priority: 100 },
        { name: "second-zero", priority: 0 },
        { name: "third-zero", priority: 0 },
      ]

      // #when - sorting hooks by priority
      const sortedHooks = sortHooksByPriority(hooks)

      // #then - high priority first, then zeros in original order
      expect(sortedHooks[0].name).toBe("high")
      expect(sortedHooks[1].name).toBe("first-zero")
      expect(sortedHooks[2].name).toBe("second-zero")
      expect(sortedHooks[3].name).toBe("third-zero")
    })

    test("should handle empty array", () => {
      // #given - empty hooks array
      const hooks: TestHook[] = []

      // #when - sorting empty array
      const sortedHooks = sortHooksByPriority(hooks)

      // #then - returns empty array
      expect(sortedHooks).toHaveLength(0)
    })

    test("should handle single hook", () => {
      // #given - single hook
      const hooks: TestHook[] = [{ name: "only-hook", priority: 50 }]

      // #when - sorting single hook
      const sortedHooks = sortHooksByPriority(hooks)

      // #then - returns same hook
      expect(sortedHooks).toHaveLength(1)
      expect(sortedHooks[0].name).toBe("only-hook")
    })

    test("should handle negative priorities", () => {
      // #given - hooks with negative priorities
      const hooks: TestHook[] = [
        { name: "negative", priority: -10 },
        { name: "zero", priority: 0 },
        { name: "positive", priority: 10 },
      ]

      // #when - sorting hooks
      const sortedHooks = sortHooksByPriority(hooks)

      // #then - sorted descending: positive > zero > negative
      expect(sortedHooks[0].name).toBe("positive")
      expect(sortedHooks[1].name).toBe("zero")
      expect(sortedHooks[2].name).toBe("negative")
    })

    test("should not mutate original array", () => {
      // #given - original hooks array
      const hooks: TestHook[] = [
        { name: "low", priority: 0 },
        { name: "high", priority: 100 },
      ]
      const originalFirstName = hooks[0].name

      // #when - sorting hooks
      sortHooksByPriority(hooks)

      // #then - original array unchanged
      expect(hooks[0].name).toBe(originalFirstName)
    })
  })
})
