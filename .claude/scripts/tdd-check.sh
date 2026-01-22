#!/bin/bash
# TDD Phase Checker - Validates TDD workflow compliance
# Exit 0 = allowed, Exit 1 = blocked

set -e

STATE_FILE=".claude/state/tdd-phase.json"
TOOL_INPUT="${TOOL_INPUT:-$(cat -)}"

# Get file being written
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null || echo "")

# If no file path, allow (not a file write)
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Check if this is a test file
IS_TEST_FILE=false
if [[ "$FILE_PATH" == *".test."* ]] || [[ "$FILE_PATH" == *".spec."* ]] || [[ "$FILE_PATH" == *"__tests__"* ]] || [[ "$FILE_PATH" == *"/e2e/"* ]] || [[ "$FILE_PATH" == *"/tests/"* ]]; then
  IS_TEST_FILE=true
fi

# Check if this is a source file (not config, not docs, not tests)
IS_SOURCE_FILE=false
if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]] || [[ "$FILE_PATH" == *.js ]] || [[ "$FILE_PATH" == *.jsx ]]; then
  if [[ "$IS_TEST_FILE" == false ]] && [[ "$FILE_PATH" != *"config"* ]] && [[ "$FILE_PATH" != *".d.ts" ]]; then
    IS_SOURCE_FILE=true
  fi
fi

# Allow non-code files (markdown, json, etc)
if [[ "$IS_SOURCE_FILE" == false ]] && [[ "$IS_TEST_FILE" == false ]]; then
  exit 0
fi

# Initialize state file if not exists
if [ ! -f "$STATE_FILE" ]; then
  mkdir -p "$(dirname "$STATE_FILE")"
  echo '{"phase": "NONE", "testFiles": [], "lastTestRun": null, "testsPassing": false}' > "$STATE_FILE"
fi

# Read current phase
PHASE=$(jq -r '.phase' "$STATE_FILE")
TESTS_PASSING=$(jq -r '.testsPassing' "$STATE_FILE")

# TDD Phase Rules:
# NONE -> Can only write test files (enters RED)
# RED -> Can write source files (enters GREEN after tests pass)
# GREEN -> Can write any files (refactoring)

case "$PHASE" in
  "NONE")
    if [ "$IS_TEST_FILE" == true ]; then
      # Writing tests in NONE phase -> enter RED
      jq '.phase = "RED"' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
      echo "TDD: Entering RED phase (test first)"
      exit 0
    else
      echo "TDD VIOLATION: Must write tests first (RED phase)"
      echo "Current phase: NONE"
      echo "Write test files before implementation"
      exit 1
    fi
    ;;

  "RED")
    if [ "$IS_SOURCE_FILE" == true ]; then
      # Writing source in RED -> allowed (making tests pass)
      echo "TDD: Writing implementation (RED -> GREEN)"
      exit 0
    else
      # Writing more tests in RED -> allowed
      echo "TDD: Adding more tests in RED phase"
      exit 0
    fi
    ;;

  "GREEN")
    # In GREEN phase, any code changes allowed (refactoring)
    echo "TDD: Refactoring in GREEN phase"
    exit 0
    ;;

  *)
    # Unknown phase, reset to NONE
    jq '.phase = "NONE"' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
    echo "TDD: Reset to NONE phase"
    exit 0
    ;;
esac
