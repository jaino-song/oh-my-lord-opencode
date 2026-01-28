# Oh My Lord OpenCode

> A strict TDD enforcement plugin for OpenCode with **Hub-and-Spoke Architecture**, **Token Optimization**, and biblical agent naming.

[![npm version](https://img.shields.io/npm/v/oh-my-lord-opencode?style=flat-square)](https://www.npmjs.com/package/oh-my-lord-opencode)
[![Latest Release](https://img.shields.io/github/v/release/jaino-song/oh-my-lord-opencode?style=flat-square)](https://github.com/jaino-song/oh-my-lord-opencode/releases)
[![License](https://img.shields.io/badge/license-SUL--1.0-blue?style=flat-square)](LICENSE.md)

## Releases

| Version | Branch | Status | Description |
|---------|--------|--------|-------------|
| [v0.12.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.12.0) | `dev` | **Latest** | Structured JSON+SUMMARY outputs, ~65% subagent token reduction |
| [v0.11.2](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.2) | `dev` | Stable | Fixed approval system blocking planners |
| [v0.11.1](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.1) | `dev` | Stable | Paul migration, hierarchy enforcer improvements |
| [v0.11.0](https://github.com/jaino-song/oh-my-lord-opencode/releases/tag/v0.11.0) | `dev` | Stable | v3.1 agents, toast notifications, 87% token reduction |

## Quick Start

```bash
# Install
npm install -g oh-my-lord-opencode

# Configure OpenCode
echo '{"plugin": ["oh-my-lord-opencode"]}' > ~/.config/opencode/opencode.json

# Verify installation
oh-my-lord-opencode doctor
```

Then in OpenCode:
```
@planner-paul create a REST API with user authentication
# Creates formal plan in .paul/plans/

@Paul execute the plan
# Executes with TDD workflow
```

## What's New in v0.12.0

- **Structured Subagent Outputs**: Nathan, Timothy, Thomas, and Solomon now return compact JSON + SUMMARY line format
- **~65% Token Reduction**: Subagent responses are machine-parseable JSON instead of verbose markdown
- **Normalized System Reminders**: Consistent `[system reminder]` block format across all agents
- **Fallback Safety**: SUMMARY line ensures human readability even if JSON parsing fails
- **Faster Routing**: Orchestrators can programmatically check `status`, `triviality`, `issues[]` fields

### New Output Format (v0.12.0)
```json
{
  "schema": "oml.subagent.v1",
  "kind": "nathan.analysis",
  "complexity": "high",
  "triviality": { "is_trivial": false, "estimated_files": 10 },
  ...
}
```
```
SUMMARY: Complexity: HIGH; Trivial: no; Files: 10; LOC: 100+
```

## Overview

Oh My Lord OpenCode is a batteries-included OpenCode plugin that provides:
- **Multi-Model Orchestration**: GPT-5.2, Claude Opus/Sonnet 4, Gemini 3 Pro, and more
- **Strict TDD Enforcement**: HARD BLOCKS for code-before-tests violations
- **Hub-and-Spoke Architecture**: Eliminates nested delegation, reduces token bloat by ~87%
- **11 LSP Tools**: Full language server integration for TypeScript, Python, Go, etc.
- **AST-Grep Integration**: Structural code search and refactoring
- **Built-in MCPs**: Context7 (docs), Grep.app (GitHub search), Websearch (Exa AI), n8n automation
- **Background Agents**: Parallel task execution with automatic compaction
- **Token Analytics**: Real-time tracking of token usage and costs
- **30+ Lifecycle Hooks**: Extensible plugin architecture
- **CLI Tools**: Doctor, version checker, interactive setup

## Why Oh My Lord OpenCode?

| Feature | Standard OpenCode | Oh My Lord OpenCode |
|---------|------------------|---------------------|
| **Agent System** | Single agent | 20+ specialized agents |
| **TDD Enforcement** | Optional | HARD BLOCKS (mandatory) |
| **Token Efficiency** | Standard | 87% reduction via lazy loading |
| **Architecture** | Flat | Hub-and-Spoke (no nested delegation) |
| **LSP Integration** | Basic | 11 advanced tools |
| **Code Search** | grep/find | AST-Grep (structural) |
| **Documentation** | Manual search | Context7 (1000+ libraries) |
| **GitHub Search** | N/A | Grep.app (500K+ repos) |
| **Background Tasks** | Sequential | Parallel with auto-compaction |
| **Workflow Automation** | N/A | n8n MCP integration |
| **Token Tracking** | N/A | Real-time analytics |
| **Notifications** | N/A | Toast notifications |

## Key Features

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

| Agent | Domain | Parent Hub | Model | Constraints |
|-------|--------|------------|-------|-------------|
| **Nathan** | Request Analysis | planner-paul | openai/gpt-5.2-high | Research only. No code. |
| **Timothy** | Plan Review | planner-paul | google/gemini-3-pro-high | Read-only advisor. |
| **Solomon** | TDD Planning | planner-paul | openai/gpt-5.2-codex | **NO DELEGATION**. Generates test specs only. |
| **Thomas** | TDD Review | planner-paul | openai/gpt-5.2-high | Read-only advisor. |
| **Elijah** | Deep Reasoning | planner-paul | openai/o1 | Complex problem solving. |
| **Ezra** | Plan Review | planner-paul | openai/gpt-5.2-high | Alternative plan reviewer. |
| **Paul-Junior**| Backend/Logic | Paul | anthropic/claude-sonnet-4-5 | **NO DELEGATION**. Implementation only. |
| **frontend-ui-ux-engineer** | UI/CSS/React | Paul | google/gemini-3-pro-preview | **NO DELEGATION**. UI Implementation only. |
| **ultrabrain** | Complex Logic | Paul | openai/o1 | **NO DELEGATION**. Algorithms/Security only. |
| **git-master** | Git Operations | Paul | zai-coding-plan/glm-4.7 | **NO DELEGATION**. Git commands only. |
| **Peter** | Unit Tests | Paul | openai/gpt-5.2-codex | Writes Jest tests. |
| **John** | E2E Tests | Paul | openai/gpt-5.2-codex | Writes Playwright tests. |
| **Joshua** | Test Runner | Paul | openai/gpt-5.2 | Runs tests and verifies results. |
| **Saul** | Git Operations | Paul | anthropic/claude-sonnet-4-5 | Advanced git workflows. |

### Research & Analysis Agents

| Agent | Purpose | Model | Use Case |
|-------|---------|-------|----------|
| **oracle** | High-IQ debugging | openai/gpt-5.2 | Complex architecture analysis |
| **librarian** | Multi-repo analysis | zai-coding-plan/glm-4.7 | Documentation and codebase research |
| **explore** | Fast exploration | anthropic/claude-haiku-4-5 | Quick codebase navigation |
| **multimodal-looker** | Image/PDF analysis | google/antigravity-gemini-3-flash | Visual content interpretation |
| **document-writer** | Technical docs | google/gemini-3-pro-preview | Documentation generation |

---

## Token Optimization Strategy

The system uses a "Pull" model instead of a "Push" model for context, achieving ~87% token reduction.

| Feature | Legacy (pre-v0.11) | Oh My Lord OpenCode | Impact |
|---------|-----------------|---------------------|--------|
| **Context** | Auto-injected (`AGENTS.md` + `README`) | Lazy-loaded (On-demand read) | **-13k tokens/turn** |
| **Delegation** | Full transcript returned | Summarized JSON returned | **-3k tokens/call** |
| **Prompt** | Massive Monolith (~3k tokens) | Compressed Bullets (~1.5k tokens) | **-1.5k tokens** |
| **Injected Directives** | 354 tokens per delegation | 50 tokens per delegation | **-304 tokens/call** |
| **Plan** | Full file loaded | Summarized Todo List loaded | **-4k tokens** |
| **Background Compaction** | N/A | Auto-compress completed tasks | **-2k tokens/task** |
| **Subagent Outputs** (v0.12.0) | Verbose markdown (~800 tokens) | JSON+SUMMARY (~300 tokens) | **-65% per response** |

**Result**: 
- Paul can execute **4-5x more steps** before hitting context limits
- ~2,910 tokens saved per plan execution
- Background agents automatically compact their context
- Real-time token analytics track usage and costs
- Subagent responses (Nathan, Timothy, Thomas) now ~65% smaller

---

## Workflow Guide

### Three-Agent System

Oh My Lord OpenCode uses three main agents for different task types:

| Agent | Use Case | Workflow |
|-------|----------|----------|
| `@planner-paul` | Complex features requiring architecture | Creates formal plans → User switches to `@Paul` |
| `@Paul` | Execute formal plans | Reads `.paul/plans/*.md` → Delegates to specialists |
| `@worker-paul` | Trivial tasks (< 10 lines, single file) | Executes immediately, no delegation |

### Phase 1: Planning (`@planner-paul`)

**When to use**: New features, refactoring, complex changes

1. **Analysis**: 
   - Calls **Nathan** to analyze requirements
   - Determines if task is Build/Refactor/Trivial
   
2. **Drafting**: 
   - Interviews you for requirements
   - Drafts implementation strategy
   
3. **Plan Generation**:
   - Creates Implementation Plan (`.paul/plans/feature.md`)
   - Calls **Timothy** for structural review
   - Calls **Solomon** for TDD Test Plan (`.paul/plans/feature-tests.md`)
   - Calls **Thomas** for TDD audit
   - Optional: Calls **Elijah** for deep reasoning on complex problems
   
4. **Handoff**: 
   - Creates `EXEC::` todos for Paul
   - User manually switches to `@Paul` to execute

### Phase 2: Execution (`@Paul`)

**When to use**: Formal plan exists in `.paul/plans/`

1. **Red Phase (Tests First)**:
   - Reads plan from `.paul/plans/feature.md`
   - Calls **Peter** (unit tests) or **John** (E2E tests)
   - Calls **Joshua** to verify tests fail (Red)
   - **HARD BLOCK**: Cannot proceed without failing tests
   
2. **Green Phase (Implementation)**:
   - Selects specialist based on plan hint:
     - Standard logic → **Paul-Junior** (Claude Sonnet 4)
     - UI/Visual → **frontend-ui-ux-engineer** (Gemini 3 Pro)
     - Complex algorithms → **ultrabrain** (OpenAI o1)
     - Git operations → **git-master** or **Saul**
   - Specialist implements code
   - **HARD BLOCK**: No nested delegation (spokes can't call other spokes)
   
3. **Refactor Phase (Verification)**:
   - Calls **Joshua** to verify tests pass (Green)
   - Runs build/lint checks
   - Refactors if needed
   - Marks task complete

### Phase 3: Trivial Tasks (`@worker-paul`)

**When to use**: Small changes (< 10 lines, single file, low risk)

Examples:
- Fix typos
- Update comments
- Change configuration values
- Rename variables

**Workflow**:
1. Analyzes task complexity
2. If trivial: Executes immediately
3. If complex: Suggests using `@planner-paul` instead

**Constraints**:
- Cannot delegate to other agents
- Cannot handle multi-file changes
- Cannot handle architectural changes

---

## Usage Examples

### Example 1: Building a REST API

```
User: @planner-paul create a REST API with user authentication and CRUD operations

planner-paul:
1. Calls Nathan to analyze requirements
2. Creates implementation plan in .paul/plans/rest-api.md
3. Calls Solomon to create test plan in .paul/plans/rest-api-tests.md
4. Calls Timothy to review architecture
5. Creates EXEC:: todos for Paul

User: @Paul execute the plan

Paul:
1. Reads .paul/plans/rest-api.md
2. RED: Calls Peter to write unit tests for auth
3. RED: Calls Joshua to verify tests fail
4. GREEN: Calls Paul-Junior to implement auth
5. GREEN: Calls Joshua to verify tests pass
6. Repeats for CRUD operations
7. REFACTOR: Calls Joshua for final verification
```

### Example 2: UI Component

```
User: @planner-paul create a responsive dashboard with charts

planner-paul:
1. Analyzes requirements
2. Creates plan with UI specifications
3. Calls Solomon for component test plan
4. Calls Timothy for review

User: @Paul execute the plan

Paul:
1. RED: Calls John to write E2E tests
2. RED: Calls Joshua to verify failure
3. GREEN: Calls frontend-ui-ux-engineer to implement UI
4. GREEN: Calls Joshua to verify tests pass
5. REFACTOR: Optimizes performance
```

### Example 3: Trivial Change

```
User: @worker-paul fix the typo in README line 42

worker-paul:
1. Analyzes: Single file, < 10 lines, low risk
2. Reads README.md
3. Fixes typo
4. Done (no delegation needed)
```

### Example 4: Complex Algorithm

```
User: @planner-paul implement a distributed cache with LRU eviction

planner-paul:
1. Calls Nathan for requirements analysis
2. Calls Elijah (o1) for deep reasoning on cache design
3. Creates detailed plan with algorithm specifications
4. Calls Solomon for comprehensive test plan

User: @Paul execute the plan

Paul:
1. RED: Calls Peter for unit tests
2. RED: Calls Joshua to verify failure
3. GREEN: Calls ultrabrain (o1) for complex algorithm implementation
4. GREEN: Calls Joshua to verify tests pass
5. REFACTOR: Performance optimization
```

## FAQ

### Q: When should I use `@planner-paul` vs `@Paul` vs `@worker-paul`?

**A**: 
- `@planner-paul`: Complex features, new architecture, refactoring (creates plans)
- `@Paul`: Execute existing plans in `.paul/plans/` (requires formal plan)
- `@worker-paul`: Trivial changes (< 10 lines, single file, low risk)

### Q: Why does Paul block without a plan?

**A**: Paul is a strict executor. He requires a formal plan in `.paul/plans/` to ensure:
- Proper TDD workflow
- Clear architecture
- Comprehensive testing
- Token efficiency

### Q: Can I skip TDD for quick prototypes?

**A**: No. TDD is enforced with HARD BLOCKS. However:
- Use `@worker-paul` for trivial changes (no TDD required)
- Write minimal tests first, then iterate
- Tests ensure code quality and prevent regressions

### Q: How do I handle git operations?

**A**: 
- Simple commits: `@Paul` can call `git-master` or `Saul`
- Complex workflows (rebase, squash): Use `@planner-paul` to create a plan first
- Never use `@worker-paul` for git operations

### Q: What if I hit token limits?

**A**: 
1. Enable background compaction in config
2. Use background agents for parallel work
3. Check token analytics: `mcp_token_report`
4. Break large tasks into smaller plans

### Q: Can agents call other agents directly?

**A**: No. Hub-and-Spoke architecture enforces:
- Only Hubs (`Paul`, `planner-paul`, `worker-paul`) can delegate
- Spokes (specialists) cannot delegate to other spokes
- This prevents token bloat and maintains visibility

### Q: How do I debug agent behavior?

**A**: 
1. Check toast notifications for delegation events
2. Use `mcp_session_read` to review session history
3. Enable debug logging in config
4. Use `oh-my-lord-opencode doctor` for diagnostics

### Q: What models are used?

**A**: 
- **Planning**: Claude Opus 4, GPT-5.2 High, Gemini 3 Pro High
- **Implementation**: Claude Sonnet 4, GPT-5.2 Codex, Gemini 3 Pro
- **Testing**: GPT-5.2, GPT-5.2 Codex
- **Deep Reasoning**: OpenAI o1
- **Research**: Claude Haiku 4, GLM-4.7

---

## Available Tools

### LSP Tools (11 tools)
- **goto-definition**: Jump to symbol definitions
- **find-references**: Find all usages of a symbol
- **symbols**: Get document/workspace symbols
- **diagnostics**: Get errors and warnings
- **prepare-rename**: Check if rename is valid
- **rename**: Rename symbols across workspace
- And more...

### AST-Grep Tools
- **ast-grep-search**: Structural code pattern search
- **ast-grep-replace**: AST-aware code refactoring
- Supports 25+ languages (TypeScript, Python, Go, Rust, etc.)

### Session Management
- **session-list**: List all OpenCode sessions
- **session-read**: Read session messages and history
- **session-search**: Search across session content
- **session-info**: Get session metadata and statistics

### Agent Delegation
- **delegate-task**: Delegate tasks to specialized agents
- **call-paul-agent**: Call explore/librarian agents
- **background-task**: Manage background task execution

### Other Tools
- **look-at**: Analyze images, PDFs, and diagrams
- **skill**: Load specialized skills
- **slashcommand**: Execute built-in slash commands
- **interactive-bash**: TMUX-based interactive shell

## Built-in MCPs

### Context7
Official documentation search for 1000+ libraries and frameworks.
```typescript
// Automatically resolves library IDs and queries docs
mcp_context7_resolve-library-id({ libraryName: "next.js" })
mcp_context7_query-docs({ libraryId: "/vercel/next.js", query: "server actions" })
```

### Grep.app
Search across 500K+ public GitHub repositories.
```typescript
mcp_grep_app_searchGitHub({ 
  query: "useState(",
  language: ["TypeScript", "TSX"]
})
```

### Websearch
Real-time web search powered by Exa AI.
```typescript
mcp_websearch_web_search_exa({
  query: "latest TypeScript features",
  numResults: 5
})
```

### n8n MCP
Complete n8n workflow automation integration.
- Search nodes and templates
- Create and manage workflows
- Validate configurations
- Deploy templates

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

### From npm (Recommended)

```bash
npm install -g oh-my-lord-opencode
# or
bun add -g oh-my-lord-opencode
```

Update your OpenCode config (`~/.config/opencode/opencode.json`):
```json
{
  "plugin": [
    "oh-my-lord-opencode"
  ]
}
```

### From Source (Development)

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

## Project Structure

```
oh-my-lord-opencode/
├── src/
│   ├── agents/              # 20+ AI agents with specialized roles
│   │   ├── paul.ts          # Main execution orchestrator
│   │   ├── planner-paul.ts  # Planning orchestrator
│   │   ├── worker-paul.ts   # Trivial task handler
│   │   ├── nathan.ts        # Request analyst
│   │   ├── solomon.ts       # TDD planner
│   │   ├── joshua.ts        # Test runner
│   │   └── ...              # More specialized agents
│   ├── hooks/               # 30+ lifecycle hooks
│   │   ├── hierarchy-enforcer/      # Hub-and-spoke enforcement
│   │   ├── tdd-enforcement/         # TDD hard blocks
│   │   ├── paul-orchestrator/       # Paul's orchestration logic
│   │   ├── task-toast-manager/      # Real-time notifications
│   │   └── ...                      # More hooks
│   ├── tools/               # Core tools
│   │   ├── lsp/             # 11 LSP tools (goto-def, find-refs, etc.)
│   │   ├── ast-grep/        # Structural code search
│   │   ├── delegate-task/   # Agent delegation system
│   │   ├── session-manager/ # Session history and search
│   │   └── ...              # More tools
│   ├── features/            # Plugin features
│   │   ├── background-agent/        # Parallel task execution
│   │   ├── token-analytics/         # Token tracking
│   │   ├── builtin-skills/          # Skill system
│   │   └── ...                      # More features
│   ├── mcp/                 # Built-in MCP integrations
│   │   ├── context7/        # Documentation search
│   │   ├── grep-app/        # GitHub code search
│   │   └── websearch/       # Web search via Exa AI
│   ├── config/              # Configuration and schemas
│   └── cli/                 # CLI tools (doctor, installer)
├── docs/                    # Documentation
├── script/                  # Build and publish scripts
└── dist/                    # Build output
```

## Configuration

Create `~/.config/opencode/oh-my-lord-opencode.json` or `.opencode/oh-my-lord-opencode.json`:

```jsonc
{
  // Agent configurations
  "agents": {
    "Paul": {
      "model": "anthropic/claude-sonnet-4-5",
      "temperature": 0.2
    }
  },
  
  // Hook configurations
  "hooks": {
    "tdd-enforcement": {
      "enabled": true,
      "strictMode": true
    },
    "hierarchy-enforcer": {
      "enabled": true
    }
  },
  
  // MCP configurations
  "mcps": {
    "context7": {
      "enabled": true
    },
    "grep-app": {
      "enabled": true
    }
  }
}
```

## CLI Commands

```bash
# Check installation and configuration
oh-my-lord-opencode doctor

# Get local version
oh-my-lord-opencode version

# Run interactive setup
oh-my-lord-opencode run
```

## Troubleshooting

### Plugin Not Loading

1. Check OpenCode config:
```bash
cat ~/.config/opencode/opencode.json
```

2. Verify installation:
```bash
oh-my-lord-opencode doctor
```

3. Check OpenCode logs:
```bash
tail -f ~/.opencode/logs/opencode.log
```

### Agent Not Available

Agents are lazy-loaded. If an agent isn't available:
1. Restart OpenCode
2. Check agent configuration in `~/.config/opencode/oh-my-lord-opencode.json`
3. Verify model availability in your OpenCode setup

### TDD Enforcement Blocking

If TDD enforcement is blocking legitimate work:
1. Ensure tests exist before implementation
2. Check `.paul/plans/` for test specifications
3. Use `@worker-paul` for trivial changes (< 10 lines)

### Token Limit Errors

If hitting context limits:
1. Use background agents for parallel work
2. Enable background compaction in config
3. Check token analytics: `mcp_token_report`

## Development

### Prerequisites
- **Bun** (latest) - The only supported package manager
- **TypeScript 5.7.3+** - For type checking
- **OpenCode 1.0.150+** - For testing

### Setup

```bash
git clone https://github.com/jaino-song/oh-my-lord-opencode.git
cd oh-my-lord-opencode
bun install
bun run build
```

### Testing

```bash
# Run all tests
bun test

# Run specific test
bun test hierarchy-enforcer

# Watch mode
bun test --watch

# Type check
bun run typecheck
```

### Building

```bash
# Build plugin
bun run build

# Build with binaries
bun run build:all

# Clean build
bun run clean && bun run build
```

## Performance Metrics

### Token Efficiency

| Metric | Before v0.11 | After v0.11 | Improvement |
|--------|--------------|-------------|-------------|
| Context per turn | ~35k tokens | ~4.5k tokens | **87% reduction** |
| Delegation overhead | 354 tokens | 50 tokens | **86% reduction** |
| Plan loading | ~4k tokens | ~0.5k tokens | **88% reduction** |
| Background compaction | N/A | Auto | **2k tokens/task saved** |

### Execution Speed

| Task Type | Agents Involved | Avg. Time | Token Usage |
|-----------|----------------|-----------|-------------|
| Trivial change | worker-paul | < 30s | ~2k tokens |
| Simple feature | Paul + 2-3 specialists | 2-5 min | ~15k tokens |
| Complex feature | planner-paul + Paul + 5+ specialists | 10-30 min | ~50k tokens |
| Full application | planner-paul + Paul + background agents | 1-3 hours | ~200k tokens |

### Test Coverage

- **84 test files** covering core functionality
- **TDD enforcement** ensures 100% test coverage for new code
- **Parallel test execution** in CI
- **Automatic test generation** via Peter and John agents

## Roadmap

### v0.12 (Planned)
- [ ] Enhanced token analytics with cost breakdown
- [ ] More MCP integrations (Linear, Jira, GitHub)
- [ ] Improved background agent scheduling
- [ ] Agent performance profiling
- [ ] Custom agent creation wizard

### v0.13 (Planned)
- [ ] Multi-project workspace support
- [ ] Agent learning from past sessions
- [ ] Advanced code review agent
- [ ] Integration testing framework
- [ ] Performance benchmarking suite

## Community

- **GitHub Issues**: [Report bugs or request features](https://github.com/jaino-song/oh-my-lord-opencode/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/jaino-song/oh-my-lord-opencode/discussions)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **CLA**: See [CLA.md](CLA.md) for contributor agreement

## Related Projects

- [OpenCode](https://opencode.ai) - The AI-powered code editor
- [oh-my-opencode](https://github.com/jaino-song/oh-my-opencode) - Original project (deprecated)
- [Claude Code](https://claude.ai/code) - Anthropic's coding assistant

## Acknowledgments

Built with:
- [OpenCode SDK](https://github.com/opencode-ai/sdk) - Plugin framework
- [AST-Grep](https://ast-grep.github.io/) - Structural code search
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development
- [Zod](https://zod.dev/) - Schema validation

Special thanks to:
- OpenCode team for the amazing platform
- All contributors and early adopters
- The open-source community

## License

[SUL-1.0](LICENSE.md) - See license file for details.

---

**Made with ❤️ by the Oh My Lord OpenCode team**
