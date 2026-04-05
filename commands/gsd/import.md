---
name: gsd:import
description: Import external plans or PRDs into GSD format with conflict detection
argument-hint: "--from <filepath> | --prd <filepath>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Task
  - AskUserQuestion
---
<objective>
Import external planning documents into GSD format. Two modes:

- `--from <filepath>` — import an external plan, detect conflicts against PROJECT.md
  and REQUIREMENTS.md, convert to GSD PLAN.md format, validate via plan-checker
- `--prd <filepath>` — (future) import a PRD, extract PROJECT.md + REQUIREMENTS.md,
  generate ROADMAP.md

Currently supports `--from` mode. The `--prd` mode will be added in a follow-up PR.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/import.md
</execution_context>

<context>
Arguments: $ARGUMENTS

**Supported modes (derived from `$ARGUMENTS`):**
- `--from <filepath>` — Import an external plan file into GSD PLAN.md format
- `--prd <filepath>` — (future) Import a PRD document; currently exits with guidance

**Active mode must be derived from `$ARGUMENTS`:**
- `--from` is active only if the literal `--from` token is present in `$ARGUMENTS`
- `--prd` is active only if the literal `--prd` token is present in `$ARGUMENTS`
- If neither token appears, show usage help and exit
</context>

<process>
Execute the import workflow from @~/.claude/get-shit-done/workflows/import.md end-to-end.
Preserve all workflow gates (argument parsing, path validation, conflict detection, user confirmation, format conversion, optional validation, commit, reporting).
</process>
