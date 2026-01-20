import { describe, test, expect, beforeEach } from "bun:test"
import {
  extractFilesFromPrompt,
  checkFileConflicts,
  registerPendingFiles,
  clearPendingFiles,
  _resetState,
} from "./file-tracker"

describe("parallel-safety-enforcer", () => {
  beforeEach(() => {
    _resetState()
  })

  describe("extractFilesFromPrompt", () => {
    test("should extract file paths from natural language", () => {
      // #given
      const prompt = "Edit src/hooks/test.ts to add the new function"
      
      // #when
      const files = extractFilesFromPrompt(prompt)
      
      // #then
      expect(files).toContain("src/hooks/test.ts")
    })

    test("should extract multiple files", () => {
      // #given
      const prompt = "Modify src/a.ts and also update src/b.ts"
      
      // #when
      const files = extractFilesFromPrompt(prompt)
      
      // #then
      expect(files.length).toBeGreaterThanOrEqual(2)
    })

    test("should handle file path patterns", () => {
      // #given
      const prompt = "file: src/components/Button.tsx needs changes"
      
      // #when
      const files = extractFilesFromPrompt(prompt)
      
      // #then
      expect(files.some(f => f.includes("button.tsx"))).toBe(true)
    })
  })

  describe("checkFileConflicts", () => {
    test("should detect conflict when same file is pending", () => {
      // #given
      registerPendingFiles("session-1", "task-1", ["src/test.ts"])
      
      // #when
      const result = checkFileConflicts("session-1", ["src/test.ts"])
      
      // #then
      expect(result.hasConflict).toBe(true)
      expect(result.conflictingFile).toBe("src/test.ts")
      expect(result.conflictingTaskId).toBe("task-1")
    })

    test("should not detect conflict for different files", () => {
      // #given
      registerPendingFiles("session-1", "task-1", ["src/a.ts"])
      
      // #when
      const result = checkFileConflicts("session-1", ["src/b.ts"])
      
      // #then
      expect(result.hasConflict).toBe(false)
    })

    test("should not detect conflict across different sessions", () => {
      // #given
      registerPendingFiles("session-1", "task-1", ["src/test.ts"])
      
      // #when
      const result = checkFileConflicts("session-2", ["src/test.ts"])
      
      // #then
      expect(result.hasConflict).toBe(false)
    })
  })

  describe("clearPendingFiles", () => {
    test("should clear files after task completion", () => {
      // #given
      registerPendingFiles("session-1", "task-1", ["src/test.ts"])
      
      // #when
      clearPendingFiles("session-1", "task-1")
      const result = checkFileConflicts("session-1", ["src/test.ts"])
      
      // #then
      expect(result.hasConflict).toBe(false)
    })
  })
})
