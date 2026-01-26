# Oh My Lord OpenCode

> A strict TDD enforcement fork of [oh-my-opencode](https://github.com/jaino-song/oh-my-lord-opencode) with **Hub-and-Spoke Architecture**, **Token Optimization**, and biblical agent naming.

[![Based on oh-my-opencode](https://img.shields.io/badge/based%20on-oh--my--opencode-blue?style=flat-square)](https://github.com/jaino-song/oh-my-lord-opencode)
[![Latest Release](https://img.shields.io/github/v/release/jaino-song/oh-my-lord-opencode?style=flat-square)](https://github.com/jaino-song/oh-my-lord-opencode/releases)

## Releases

| Version | Branch | Status | Description |
|---------|--------|--------|-------------|
| [v0.11.1](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.1) | `dev` | Pre-release | Sisyphus → Paul migration, naming cleanup |
| [v0.11.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.0) | `dev` | Pre-release | v3.1 agents, toast notifications, 87% token reduction |
| [v0.9.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.9.0) | `dev` | Pre-release | v3.1 agents, toast notifications, 87% token reduction |

## What's New in v0.11.1

- **Complete Sisyphus → Paul Migration**: All agent names updated (sisyphus-junior → paul-junior, etc.)
- **Repository Rename**: oh-my-opencode → oh-my-lord-opencode
- **Improved Hierarchy Enforcer**: Session notifications for delegation results
- **Test Stability**: Fixed parallel test race conditions in CI

## What Changed from oh-my-opencode

This fork introduces **HARD BLOCKS** for TDD violations and a **Strict Hub-and-Spoke Architecture** that reduces token consumption by ~87%.

### 1. Strict Hub-and-Spoke Architecture
Subagents (Spokes) **NEVER** delegate to other subagents.
- **Paul** (Hub) orchestrates EVERYTHING directly.
- **Paul-Junior** (Spoke) only writes code. He cannot call UI or Git agents.
- **Solomon** (Spoke) only plans tests. He cannot call Reviewers.

### 2. Massive Token Optimization (~87% Reduction)
- **Lazy Loading**: `AGENTS.md` and `README.md` are NOT injected automatically. Agents load them only if needed.
- **Summarized Outputs**: Delegation results are compressed into summaries, not full transcripts.
- **Context Hygiene**: Hubs (`Paul`) stay lightweight (~12k tokens) instead of bloating to 35k+.
- **Compressed Directives**: Injected prompts reduced from 354 to 50 tokens per delegation.

### 3. TDD Hard Blocks
- Code cannot be written without tests first.
- Attempting to write implementation code before Red Phase triggers a **HARD ERROR**.

### 4. Toast Notifications (v0.9.0+)
Real-time workflow visibility:
- Delegation events: `Paul → Paul-Junior`
- Subagent completions: Nathan analysis, Timothy review, Solomon test planning
- TDD warnings, competency hints, approval status

---

## The Agent Hierarchy

### Hubs (Orchestrators)

| Agent | Role | Responsibility |
|-------|------|----------------|
| **Paul** | **Execution Hub** | Executes plans. Calls ALL implementation and testing agents directly. |
| **planner-paul** | **Planning Hub** | Creates plans. Calls Nathan, Solomon, Timothy, Thomas. |
| **worker-paul** | **Trivial Hub** | Handles small tasks (<10 lines) autonomously. |

### Spokes (Specialists)

| Agent | Domain | Parent Hub | Constraints |
|-------|--------|------------|-------------|
| **Nathan** | Request Analysis | planner-paul | Research only. No code. |
| **Timothy** | Plan Review | planner-paul | Read-only advisor. |
| **Solomon** | TDD Planning | planner-paul | **NO DELEGATION**. Generates test specs only. |
| **Thomas** | TDD Review | planner-paul | Read-only advisor. |
| **Paul-Junior**| Backend/Logic | Paul | **NO DELEGATION**. Implementation only. |
| **frontend-ui-ux-engineer** | UI/CSS/React | Paul | **NO DELEGATION**. UI Implementation only. |
| **ultrabrain** | Complex Logic | Paul | **NO DELEGATION**. Algorithms/Security only (o1). |
| **git-master** | Git Ops | Paul | **NO DELEGATION**. Git commands only. |
| **Peter** | Unit Tests | Paul | Writes Jest tests. |
| **John** | E2E Tests | Paul | Writes Playwright tests. |
| **Joshua** | Test Runner | Paul | Runs tests. |

---

## Token Optimization Strategy

The system uses a "Pull" model instead of a "Push" model for context.

| Feature | Legacy (pre-v0.11) | Oh My Lord Paul | Impact |
|---------|-----------------|-----------------|--------|
| **Context** | Auto-injected (`AGENTS.md` + `README`) | Lazy-loaded (On-demand read) | **-13k tokens/turn** |
| **Delegation** | Full transcript returned | Summarized JSON returned | **-3k tokens/call** |
| **Prompt** | Massive Monolith (~3k tokens) | Compressed Bullets (~1.5k tokens) | **-1.5k tokens** |
| **Injected Directives** | 354 tokens per delegation | 50 tokens per delegation | **-304 tokens/call** |
| **Plan** | Full file loaded | Summarized Todo List loaded | **-4k tokens** |

**Result**: Paul can execute **4-5x more steps** before hitting context limits (~2,910 tokens saved per plan execution).

---

## Workflow Guide

### Phase 1: Planning (`@planner-paul`)

1.  **Analysis**: `planner-paul` calls **Nathan** to analyze intent (Build/Refactor/Trivial).
2.  **Drafting**: `planner-paul` interviews you and drafts a strategy.
3.  **Generation**:
    *   `planner-paul` creates Implementation Plan (`.paul/plans/feature.md`).
    *   Calls **Timothy** for structural review.
    *   Calls **Solomon** for TDD Test Plan (`.paul/plans/feature-tests.md`).
    *   Calls **Thomas** for TDD audit.
4.  **Handoff**: Creates `EXEC::` todos for Paul.

### Phase 2: Execution (`@Paul`)

1.  **Red Phase (Tests)**:
    *   **Paul** calls **Peter** or **John** to write failing tests.
    *   **Paul** calls **Joshua** to verify failure.
2.  **Green Phase (Implementation)**:
     *   **Paul** selects specialist based on plan hint:
         *   Standard → **Paul-Junior**
         *   UI/Visual → **frontend-ui-ux-engineer**
         *   Complex/Hard → **ultrabrain**
     *   Specialist implements code.
3.  **Refactor Phase (Verification)**:
    *   **Paul** calls **Joshua** to verify success.
    *   Runs build/lint checks.

---

## Key Enforcements

### 1. Strict Hub-and-Spoke (HARD BLOCK)
The `hierarchy-enforcer` hook blocks nested delegation.
- `Paul-Junior` cannot call `frontend-ui-ux-engineer`.
- `Solomon` cannot call `Thomas`.
- **Reason**: Maintains visibility for the Hub and reduces token bloat.

### 2. No `call_omo_agent` (HARD BLOCK)
The legacy `call_omo_agent` tool is **BANNED** and monitored.
- Use `delegate_task` with proper categories.
- Subagents can only use `delegate_task` for research (`explore`/`librarian`).

### 3. TDD is Mandatory (HARD BLOCK)
- Code changes without tests are rejected.
- `tdd-enforcement` hook checks for test file existence and execution.

---

## Installation

```bash
git clone https://github.com/jaino-song/oh-my-lord-opencode.git
cd oh-my-lord-opencode
bun install
bun run build
```

Update your OpenCode config:
```json
{
  "plugin": [
    "file:///absolute/path/to/oh-my-lord-opencode/dist/index.js"
  ]
}
```

## License
[SUL-1.0](LICENSE.md)
