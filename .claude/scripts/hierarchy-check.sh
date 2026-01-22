#!/bin/bash
# Hierarchy Enforcer - Validates agent delegation relationships
# Exit 0 = allowed, Exit 1 = blocked
# Compatible with bash 3.x (macOS default)

set -e

# Read tool input from stdin or environment
TOOL_INPUT="${TOOL_INPUT:-$(cat - 2>/dev/null || echo '{}')}"
TARGET_AGENT=$(echo "$TOOL_INPUT" | jq -r '.subagent_type // empty' 2>/dev/null || echo "")

# Get current agent from state file
STATE_FILE=".claude/state/current-agent.txt"
CURRENT_AGENT=$(cat "$STATE_FILE" 2>/dev/null || echo "user")

# If no target agent specified, allow (not a Task call)
if [ -z "$TARGET_AGENT" ]; then
  exit 0
fi

# Define allowed relationships using case statements (bash 3 compatible)
get_allowed_targets() {
  local agent="$1"
  case "$agent" in
    "executor")
      echo "test-runner,backend-impl,frontend-impl,unit-test-writer,e2e-test-writer,deep-reasoning"
      ;;
    "planner")
      echo "tdd-planner,plan-reviewer,request-analyzer"
      ;;
    "quick-fix"|"test-runner"|"backend-impl"|"frontend-impl"|"unit-test-writer"|"e2e-test-writer"|"tdd-planner"|"plan-reviewer"|"request-analyzer"|"deep-reasoning")
      echo ""
      ;;
    "user")
      echo "executor,planner,quick-fix,deep-reasoning"
      ;;
    *)
      echo ""
      ;;
  esac
}

ALLOWED=$(get_allowed_targets "$CURRENT_AGENT")

# Check if target is in allowed list
if [ -z "$ALLOWED" ]; then
  echo "BLOCKED: Agent '$CURRENT_AGENT' cannot delegate to any agent"
  exit 1
fi

# Check if target is in comma-separated allowed list
if echo ",$ALLOWED," | grep -q ",$TARGET_AGENT,"; then
  # Update current agent state for nested calls
  mkdir -p "$(dirname "$STATE_FILE")"
  echo "$TARGET_AGENT" > "$STATE_FILE"
  echo "ALLOWED: $CURRENT_AGENT -> $TARGET_AGENT"
  exit 0
else
  echo "BLOCKED: Agent '$CURRENT_AGENT' cannot delegate to '$TARGET_AGENT'"
  echo "Allowed targets: $ALLOWED"
  exit 1
fi
