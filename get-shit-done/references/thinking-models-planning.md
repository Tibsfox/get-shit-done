# Thinking Model Guidance: Planning

When and how to leverage extended thinking for planning tasks.

---

## When to Use Extended Thinking

- **Decomposing ambiguous requirements** — when the phase goal is clear but the path to achieving it involves multiple valid approaches with different tradeoff profiles
- **Identifying hidden dependencies** between tasks that are not obvious from file-level analysis, such as shared state, initialization order, or data format contracts
- **Designing task ordering with parallelization** — when multiple plans could run concurrently but subtle dependencies constrain the wave structure
- **Gap closure planning** — when verification has identified structural gaps that require reasoning about what was missed and why, not just adding more tasks

## Recommended Budget

**Level:** High

Planning quality directly determines execution quality. A flawed plan wastes far more tokens during execution than the thinking budget spent getting the plan right. Allocate thinking for the initial decomposition and dependency analysis — the phase of planning where architectural decisions are made. Task-level detail writing (actions, verification commands, done criteria) is mechanical and does not need extended thinking.

## Prompt Structure

When requesting extended thinking:
1. **State the goal** — what the phase must deliver, expressed as observable outcomes rather than implementation steps
2. **Provide constraints** — locked decisions from CONTEXT.md, architectural boundaries, scope limits, and context budget
3. **Ask for decomposition with dependency graph** — request a task breakdown that explicitly maps dependencies between plans, identifies parallelization opportunities, and flags tasks that must be sequential

## When NOT to Think

Extended thinking adds latency and cost. Skip it for:
- **Plans with clear requirements and obvious task breakdown** — when the phase goal maps directly to a small number of well-understood tasks
- **Single-file changes** — phases that touch one file with a clear specification need no decomposition reasoning
- **Revision cycles** — when the plan-checker returns specific, actionable feedback that requires mechanical updates rather than re-thinking the approach
- **Template-driven planning** — when the plan follows an established pattern from a previous phase and only the specifics change
