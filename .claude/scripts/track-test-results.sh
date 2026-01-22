#!/bin/bash
# Test Result Tracker - Updates TDD phase based on test results
# Called after Bash tool executions

set -e

TOOL_OUTPUT="${TOOL_OUTPUT:-$(cat -)}"
STATE_FILE=".claude/state/tdd-phase.json"

# Check if this was a test command
IS_TEST_CMD=false
if echo "$TOOL_OUTPUT" | grep -qE "(jest|vitest|playwright|bun test|npm test)" 2>/dev/null; then
  IS_TEST_CMD=true
fi

# If not a test command, skip
if [ "$IS_TEST_CMD" == false ]; then
  exit 0
fi

# Initialize state file if not exists
if [ ! -f "$STATE_FILE" ]; then
  mkdir -p "$(dirname "$STATE_FILE")"
  echo '{"phase": "NONE", "testFiles": [], "lastTestRun": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "testsPassing": false}' > "$STATE_FILE"
fi

# Determine if tests passed or failed
TESTS_PASSED=false
if echo "$TOOL_OUTPUT" | grep -qE "(Tests:.*passed|All tests passed|✓|PASS)" 2>/dev/null; then
  if ! echo "$TOOL_OUTPUT" | grep -qE "(failed|FAIL|✗|Error)" 2>/dev/null; then
    TESTS_PASSED=true
  fi
fi

# Get current phase
PHASE=$(jq -r '.phase' "$STATE_FILE")

# Update state
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [ "$TESTS_PASSED" == true ]; then
  # Tests passing
  if [ "$PHASE" == "RED" ]; then
    # RED -> GREEN transition
    jq --arg now "$NOW" '.phase = "GREEN" | .testsPassing = true | .lastTestRun = $now' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
    echo "TDD: Tests passing! Transitioned RED -> GREEN"
  else
    jq --arg now "$NOW" '.testsPassing = true | .lastTestRun = $now' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
    echo "TDD: Tests passing (phase: $PHASE)"
  fi
else
  # Tests failing
  jq --arg now "$NOW" '.testsPassing = false | .lastTestRun = $now' "$STATE_FILE" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
  if [ "$PHASE" == "NONE" ]; then
    echo "TDD: Tests failing (expected in RED phase)"
  else
    echo "TDD: Tests failing (phase: $PHASE)"
  fi
fi

exit 0
