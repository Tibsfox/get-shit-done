# Thinking Model Guidance: Execution

When and how to leverage extended thinking for execution tasks.

---

## When to Use Extended Thinking

- **Multi-file refactors with cross-cutting concerns** — when a change in one module requires coordinated updates across several files and the dependency chain is non-obvious
- **Implementing complex algorithms** where correctness depends on subtle invariants or edge case handling
- **Resolving merge conflicts** that involve overlapping logic changes from multiple contributors, requiring understanding of both intents to produce a correct merge
- **Design decisions within an existing plan** — when the plan specifies what to build but the executor must choose between implementation approaches that affect downstream tasks

## Recommended Budget

**Level:** Medium

Most execution work is mechanical — translating a plan into code, running commands, committing results. Save thinking tokens for the moments where a design decision arises within the plan's scope. Allocate thinking for the decision point itself, not for the subsequent implementation of the chosen approach.

## Prompt Structure

When requesting extended thinking:
1. **Reference the plan** — point to the specific PLAN.md task and its constraints so reasoning stays scoped
2. **Highlight the decision point** — identify the specific fork where multiple valid approaches exist
3. **Constrain the thinking scope** — specify what outcome the reasoning should produce (e.g., "choose between approaches A and B given these constraints") rather than leaving it open-ended

## When NOT to Think

Extended thinking adds latency and cost. Skip it for:
- **Straightforward file creation from templates** — when the plan specifies the exact structure and content
- **Simple edits** — renaming variables, updating strings, adding imports
- **Running commands** — build, test, lint, commit operations that follow established patterns
- **Copying patterns from existing code** — when the plan says "follow the same pattern as X" and X is clear
