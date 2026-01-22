#!/bin/bash
# Session Context Injector - Provides context on session start
# Outputs context to be injected into the session

set -e

# Initialize state directory
mkdir -p .claude/state

# Initialize current agent to user
echo "user" > .claude/state/current-agent.txt

# Find active plan
PLAN_DIR=".paul/plans"
if [ -d "$PLAN_DIR" ]; then
  # Find most recent plan file
  ACTIVE_PLAN=$(ls -t "$PLAN_DIR"/*.md 2>/dev/null | head -1)

  if [ -n "$ACTIVE_PLAN" ]; then
    echo "[SESSION CONTEXT]"
    echo ""
    echo "Active Plan: $ACTIVE_PLAN"
    echo ""
    # Show first 20 lines of plan
    head -20 "$ACTIVE_PLAN"
    echo ""
    echo "..."
    echo "[Use Read tool to see full plan]"
    echo ""
  fi
fi

# Show TDD phase if exists
TDD_STATE=".claude/state/tdd-phase.json"
if [ -f "$TDD_STATE" ]; then
  PHASE=$(jq -r '.phase' "$TDD_STATE")
  TESTS_PASSING=$(jq -r '.testsPassing' "$TDD_STATE")
  echo "TDD Phase: $PHASE"
  echo "Tests Passing: $TESTS_PASSING"
  echo ""
fi

# Show any active todos from previous session
TODOS_FILE=".claude/state/active-todos.json"
if [ -f "$TODOS_FILE" ]; then
  echo "Active TODOs:"
  jq -r '.todos[] | select(.status == "in_progress") | "- [IN PROGRESS] " + .content' "$TODOS_FILE" 2>/dev/null || true
  jq -r '.todos[] | select(.status == "pending") | "- [PENDING] " + .content' "$TODOS_FILE" 2>/dev/null | head -5 || true
  echo ""
fi

exit 0
