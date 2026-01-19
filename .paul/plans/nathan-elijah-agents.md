# Nathan & Elijah Agent Implementation Plan

## Context

### Original Request
Replace unused Metis agent and upgrade Oracle with clear, non-overlapping responsibilities.

### Key Decisions
- **Nathan** replaces Metis as "Request Analyst" (pre-planning phase)
- **Elijah** replaces Oracle as "Deep Reasoning Advisor" (execution phase)
- Each agent has EXCLUSIVE responsibilities (no overlaps)
- Delete Metis and Oracle after implementation

---

## Work Objectives

### Core Objective
Create two new agents (Nathan, Elijah) with clearly separated responsibilities, replacing the unused Metis and upgrading Oracle.

### Concrete Deliverables
- `src/agents/nathan.ts` — Request Analyst agent
- `src/agents/nathan.test.ts` — Tests for Nathan
- `src/agents/elijah.ts` — Deep Reasoning Advisor agent
- `src/agents/elijah.test.ts` — Tests for Elijah
- Updated `planner-paul.ts` to invoke Nathan before interviewing
- Updated `orchestrator-sisyphus.ts` to use Elijah instead of Oracle
- Updated registration files (types.ts, index.ts, utils.ts, AGENTS.md)

### Definition of Done
- [ ] Nathan agent implemented with all 5 unique responsibilities
- [ ] Elijah agent implemented with all 5 consultation modes
- [ ] All tests pass (`bun test src/agents`)
- [ ] Typecheck passes (`bun run typecheck`)
- [ ] planner-paul invokes Nathan before interview phase
- [ ] Paul uses Elijah instead of Oracle for deep reasoning
- [ ] Zero responsibility overlaps between agents

### Must Have
- Nathan: Intent classification, pre-interview research, guardrail generation, question prioritization, scope boundary detection
- Elijah: --debug, --architecture, --security, --performance, --stuck modes
- Confidence scoring in Elijah's output
- Structured output formats for both agents

### Must NOT Have (Guardrails)
- Nathan must NOT create plans (planner-paul does this)
- Nathan must NOT review plans (Timothy/Ezra do this)
- Elijah must NOT gather research (receives context from Paul)
- Elijah must NOT do pre-planning analysis (Nathan does this)
- No overlapping responsibilities with existing agents

---

## Agent Specifications

### Nathan (Request Analyst)

#### Etymology
Named after the biblical prophet Nathan who advised King David - known for seeing through situations, asking probing questions, and advising before action.

#### Unique Responsibilities

| Responsibility | Description | Not Done By |
|----------------|-------------|-------------|
| Intent Classification | Classify request as build/fix/refactor/architecture/research | No one else |
| Pre-Interview Research | Gather context via explore/librarian BEFORE questions | planner-paul does DURING |
| Guardrail Generation | Create "Must NOT Have" proactively | Ezra detects AFTER |
| Question Prioritization | Rank questions by importance | planner-paul asks ad-hoc |
| Scope Boundary Detection | Identify IN/OUT before planning | planner-paul discovers via interview |

#### Technical Config

```typescript
const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5"

// Permissions
const restrictions = createAgentToolRestrictions([
  "write",         // Cannot write files
  "edit",          // Cannot edit files  
  "task",          // Cannot manage todos
])

// CAN invoke explore/librarian for research
// CANNOT delegate to implementation agents

// Model config
if (isGptModel(model)) {
  return { ...base, reasoningEffort: "medium", textVerbosity: "high" }
}
return { ...base, thinking: { type: "enabled", budgetTokens: 32000 } }
```

#### Output Format

```markdown
## Nathan Analysis: [Request Summary]

### Intent Classification
**Type**: [Build | Fix | Refactor | Architecture | Research]
**Confidence**: [0-100%]
**Rationale**: [Why this classification]

### Initial Context (from explore/librarian)
- [Finding 1]: [Implication]
- [Finding 2]: [Implication]

### Guardrails (Must NOT Have)
1. [DO NOT do X]: [Reason - AI-slop prevention]
2. [DO NOT do Y]: [Reason - scope creep prevention]

### Priority Questions (for planner-paul)
1. **[Critical]** [Question]: [Why this matters]
2. **[High]** [Question]: [Why this matters]
3. **[Medium]** [Question]: [Why this matters]

### Scope Boundaries
**IN**: [What should be included]
**OUT**: [What should explicitly NOT be included]

### Risk Flags
- [Risk 1]: [Mitigation suggestion]
- [Risk 2]: [Mitigation suggestion]

### Elijah Consultation Recommended: [YES/NO]
[If YES: Reason - e.g., "Architecture decision with multi-system impact"]
```

---

### Elijah (Deep Reasoning Advisor)

#### Etymology
Named after the biblical prophet Elijah who confronted problems directly, made decisive interventions, appeared in crisis moments, and passed on wisdom.

#### Unique Responsibilities

| Responsibility | Description | Not Done By |
|----------------|-------------|-------------|
| Root Cause Analysis | Deep debugging after 2+ failures | Others only try fixes |
| ADR Decisions | High-stakes architecture during execution | Nathan does pre-planning |
| Threat Modeling | Security analysis with STRIDE | No one else does security |
| Bottleneck Analysis | Performance with USE method + metrics | No one else interprets metrics |
| Fresh Perspective | Unblock when completely stuck | Others follow their process |

#### Consultation Modes

| Mode | Trigger | Framework | Output |
|------|---------|-----------|--------|
| `--debug` | 2+ fix attempts failed | 5 Whys + Fault Tree | Root cause → Fix → Verification |
| `--architecture` | Irreversible design decision | ADR format | Context → Options → Decision → Consequences |
| `--security` | Security concern during execution | STRIDE | Threats → Attack vectors → Mitigations |
| `--performance` | Performance issue with metrics | USE Method | Resource → Bottleneck → Fix → Expected improvement |
| `--stuck` | Paul completely blocked | Fresh perspective | Reframe → Alternatives → Recommended path |

#### Technical Config

```typescript
const DEFAULT_MODEL = "openai/gpt-5.2"

// Permissions - strictly read-only
const restrictions = createAgentToolRestrictions([
  "write",         // Cannot write files
  "edit",          // Cannot edit files
  "task",          // Cannot manage todos
  "delegate_task", // Cannot delegate (receives context from Paul)
])

// CANNOT invoke explore/librarian - receives all context from Paul

// Model config - MAXIMUM reasoning
if (isGptModel(model)) {
  return { 
    ...base, 
    reasoningEffort: "high",      // Maximum (was "medium" in Oracle)
    textVerbosity: "high" 
  }
}
return { 
  ...base, 
  thinking: { type: "enabled", budgetTokens: 64000 }  // Double (was 32k)
}
```

#### Output Format

```markdown
## Elijah Consultation: [Mode]

### Bottom Line
[2-3 sentences: the answer/recommendation]

### Confidence Assessment
| Aspect | Confidence | Uncertainty |
|--------|------------|-------------|
| [area] | [0-100%] | [what's uncertain] |

### Analysis ([Framework])
[Mode-specific structured analysis]

### Action Plan
1. [Step]: [Effort estimate]
2. [Step]: [Effort estimate]

### Devil's Advocate
[What could go wrong with this recommendation?]

### Escalation
[When to revisit, when to get human input]
```

---

## Task Flow

```
Task 1 (Nathan) → Task 2 (Nathan tests)
                           ↘
Task 3 (Elijah) → Task 4 (Elijah tests) → Task 5 (Integration)
                                                    ↓
                                          Task 6 (Registration)
                                                    ↓
                                          Task 7 (Cleanup)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 3 | Nathan and Elijah are independent agents |
| B | 2, 4 | Tests can be written after each agent |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Tests need agent implementation |
| 4 | 3 | Tests need agent implementation |
| 5 | 1, 3 | Integration needs both agents |
| 6 | 1, 3 | Registration needs both agents |
| 7 | 5, 6 | Cleanup after everything works |

---

## TODOs

- [ ] 1. Create Nathan agent (src/agents/nathan.ts)

  **What to do**:
  - Create file with NATHAN_SYSTEM_PROMPT constant
  - Implement createNathanAgent factory function
  - Export nathanAgent default instance
  - Export NATHAN_PROMPT_METADATA for Sisyphus integration
  - Include intent classification logic in prompt
  - Include guardrail generation framework
  - Include question prioritization structure
  - Include scope boundary detection
  - Add permission restrictions (read-only + can invoke explore/librarian)

  **Must NOT do**:
  - Do not add plan creation capabilities (planner-paul does this)
  - Do not add plan review capabilities (Timothy/Ezra do this)

  **Parallelizable**: YES (with Task 3)

  **References**:
  - `src/agents/metis.ts` - Original Metis for reference patterns
  - `src/agents/ezra.ts` - For structured output format patterns
  - `src/agents/AGENT_CREATION_STANDARD.md` - For file structure

  **Acceptance Criteria**:
  - [ ] All 5 unique responsibilities implemented in prompt
  - [ ] Factory function with model override support
  - [ ] Correct permission restrictions
  - [ ] Metadata for Sisyphus integration

---

- [ ] 2. Create Nathan tests (src/agents/nathan.test.ts)

  **What to do**:
  - Test exports (NATHAN_SYSTEM_PROMPT, createNathanAgent, nathanAgent, NATHAN_PROMPT_METADATA)
  - Test factory function with default and custom models
  - Test permission restrictions
  - Test prompt content for all 5 responsibilities
  - Test metadata structure

  **Must NOT do**:
  - Do not test integration with planner-paul (separate task)

  **Parallelizable**: NO (depends on Task 1)

  **References**:
  - `src/agents/ezra.test.ts` - For test patterns

  **Acceptance Criteria**:
  - [ ] All exports verified
  - [ ] Factory function tests pass
  - [ ] Permission tests pass
  - [ ] Prompt content tests pass

---

- [ ] 3. Create Elijah agent (src/agents/elijah.ts)

  **What to do**:
  - Create file with ELIJAH_SYSTEM_PROMPT constant
  - Implement createElijahAgent factory function
  - Export elijahAgent default instance
  - Export ELIJAH_PROMPT_METADATA for Sisyphus integration
  - Include 5 consultation modes (--debug, --architecture, --security, --performance, --stuck)
  - Include frameworks for each mode (5 Whys, ADR, STRIDE, USE Method, Fresh Perspective)
  - Include confidence scoring in output format
  - Include Devil's Advocate section requirement
  - Set reasoningEffort: "high" for GPT models
  - Set budgetTokens: 64000 for Claude models
  - Add strict read-only permission restrictions

  **Must NOT do**:
  - Do not add research capabilities (receives context from Paul)
  - Do not add pre-planning analysis (Nathan does this)
  - Do not add delegation capabilities

  **Parallelizable**: YES (with Task 1)

  **References**:
  - `src/agents/oracle.ts` - Original Oracle for reference
  - `src/agents/ezra.ts` - For confidence scoring patterns
  - `src/agents/AGENT_CREATION_STANDARD.md` - For file structure

  **Acceptance Criteria**:
  - [ ] All 5 consultation modes implemented
  - [ ] Mode detection logic in prompt
  - [ ] Correct frameworks for each mode
  - [ ] Confidence scoring in output format
  - [ ] reasoningEffort: "high" for GPT
  - [ ] budgetTokens: 64000 for Claude

---

- [ ] 4. Create Elijah tests (src/agents/elijah.test.ts)

  **What to do**:
  - Test exports (ELIJAH_SYSTEM_PROMPT, createElijahAgent, elijahAgent, ELIJAH_PROMPT_METADATA)
  - Test factory function with default and custom models
  - Test reasoningEffort is "high" for GPT models
  - Test budgetTokens is 64000 for Claude models
  - Test permission restrictions (stricter than Oracle)
  - Test prompt content for all 5 modes
  - Test metadata structure

  **Must NOT do**:
  - Do not test integration with Paul (separate concern)

  **Parallelizable**: NO (depends on Task 3)

  **References**:
  - `src/agents/ezra.test.ts` - For test patterns
  - `src/agents/utils.test.ts` - For model config tests

  **Acceptance Criteria**:
  - [ ] All exports verified
  - [ ] Model config tests pass (high reasoning, 64k tokens)
  - [ ] Permission tests pass
  - [ ] All 5 modes verified in prompt

---

- [ ] 5. Integrate agents with planner-paul and Paul

  **What to do**:
  - Update planner-paul.ts to invoke Nathan before interview phase
  - Add PHASE 0: Nathan Analysis to planner-paul prompt
  - Update orchestrator-sisyphus.ts to use Elijah instead of Oracle
  - Replace "oracle" references with "Elijah" in Paul's prompt
  - Update Oracle usage section to Elijah usage section

  **Must NOT do**:
  - Do not remove Oracle yet (Task 7)
  - Do not change other agent integrations

  **Parallelizable**: NO (depends on Tasks 1, 3)

  **References**:
  - `src/agents/planner-paul.ts:597-627` - Current Metis-like research pattern
  - `src/agents/orchestrator-sisyphus.ts` - Oracle usage sections

  **Acceptance Criteria**:
  - [ ] planner-paul invokes Nathan before interview
  - [ ] Paul uses Elijah for deep reasoning
  - [ ] All Oracle references replaced with Elijah

---

- [ ] 6. Register agents in system files

  **What to do**:
  - Add "Nathan (Request Analyst)" to BuiltinAgentName in types.ts
  - Add "Elijah (Deep Reasoning Advisor)" to BuiltinAgentName in types.ts
  - Import and add nathanAgent to builtinAgents in index.ts
  - Import and add elijahAgent to builtinAgents in index.ts
  - Add createNathanAgent and NATHAN_PROMPT_METADATA to utils.ts
  - Add createElijahAgent and ELIJAH_PROMPT_METADATA to utils.ts
  - Add Nathan and Elijah rows to AGENTS.md table

  **Must NOT do**:
  - Do not remove Oracle/Metis yet (Task 7)

  **Parallelizable**: NO (depends on Tasks 1, 3)

  **References**:
  - `src/agents/types.ts` - BuiltinAgentName union
  - `src/agents/index.ts` - builtinAgents export
  - `src/agents/utils.ts` - agentSources and agentMetadata
  - `src/agents/AGENTS.md` - Documentation

  **Acceptance Criteria**:
  - [ ] Both agents in BuiltinAgentName
  - [ ] Both agents in builtinAgents
  - [ ] Both agents in agentSources
  - [ ] Both agents in agentMetadata
  - [ ] AGENTS.md updated

---

- [ ] 7. Cleanup: Deprecate Oracle and Metis

  **What to do**:
  - Add deprecation notice to oracle.ts header comment
  - Add deprecation notice to metis.ts header comment
  - Keep files for backward compatibility but mark as deprecated
  - Update AGENTS.md to mark Oracle and Metis as deprecated
  - Run full test suite to verify no regressions

  **Must NOT do**:
  - Do not delete oracle.ts or metis.ts (backward compatibility)
  - Do not remove from builtinAgents (may have external users)

  **Parallelizable**: NO (depends on Tasks 5, 6)

  **References**:
  - `src/agents/momus.ts` - Example of deprecated agent (if any notes)

  **Acceptance Criteria**:
  - [ ] Deprecation notices added
  - [ ] AGENTS.md updated with deprecation status
  - [ ] All tests pass
  - [ ] Typecheck passes

---

## Success Criteria

### Final Checklist
- [ ] Nathan implemented with 5 unique responsibilities
- [ ] Elijah implemented with 5 consultation modes
- [ ] Zero responsibility overlaps (see matrix below)
- [ ] All tests pass
- [ ] Typecheck passes
- [ ] planner-paul uses Nathan
- [ ] Paul uses Elijah
- [ ] Oracle and Metis deprecated

### Responsibility Matrix (Proof of No Overlap)

| Responsibility | Nathan | planner-paul | Timothy | Ezra | Elijah |
|----------------|--------|--------------|---------|------|--------|
| Intent classification | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pre-interview research | ✅ | ❌ | ❌ | ❌ | ❌ |
| Guardrail generation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Question prioritization | ✅ | ❌ | ❌ | ❌ | ❌ |
| User interview | ❌ | ✅ | ❌ | ❌ | ❌ |
| Plan creation | ❌ | ✅ | ❌ | ❌ | ❌ |
| Task breakdown | ❌ | ✅ | ❌ | ❌ | ❌ |
| Requirements review | ❌ | ❌ | ✅ | ❌ | ❌ |
| Deliverables review | ❌ | ❌ | ✅ | ❌ | ❌ |
| Anti-pattern detection | ❌ | ❌ | ❌ | ✅ | ❌ |
| Confidence scoring (plans) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Root cause analysis | ❌ | ❌ | ❌ | ❌ | ✅ |
| ADR decisions | ❌ | ❌ | ❌ | ❌ | ✅ |
| Threat modeling | ❌ | ❌ | ❌ | ❌ | ✅ |
| Performance analysis | ❌ | ❌ | ❌ | ❌ | ✅ |
| Unblock when stuck | ❌ | ❌ | ❌ | ❌ | ✅ |

---

*Plan created: 2026-01-19*
*Author: planner-paul*
