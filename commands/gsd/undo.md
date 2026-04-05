---
name: gsd:undo
description: Safe git revert command — undo GSD phase or plan commits without destroying history
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---
<objective>
Safely revert GSD commits using `git revert --no-commit`. Three modes:
- `--last N` — show last N GSD commits for interactive selection
- `--phase NN` — revert all commits for a specific phase
- `--plan NN-MM` — revert commits for a specific plan only

All reverts are collected into a single atomic commit. Never uses `git reset`.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/undo.md
</execution_context>

<process>
Execute the undo workflow from @~/.claude/get-shit-done/workflows/undo.md end-to-end.
</process>
