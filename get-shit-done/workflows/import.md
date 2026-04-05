<purpose>
Import external planning documents into GSD format with conflict detection against
existing project decisions. The --from mode reads an external plan, detects conflicts
against PROJECT.md and REQUIREMENTS.md, presents conflicts for user resolution (never
auto-resolves), converts to GSD PLAN.md format with task structure, and optionally
validates via plan-checker. Handles missing PROJECT.md/REQUIREMENTS.md gracefully by
importing as initial plan without conflict detection.
</purpose>

<available_agent_types>
Valid GSD subagent types (use exact names — do not fall back to 'general-purpose'):
- gsd-plan-checker — Validates PLAN.md structure and completeness
</available_agent_types>

<process>

<step name="parse_arguments" priority="first">
Parse `$ARGUMENTS` to determine mode and extract the file path.

**Mode detection:**
- If `$ARGUMENTS` contains `--prd`: show the following message and **exit immediately**:
  ```
  PRD import coming in a future release — use --from for now.
  ```
- If `$ARGUMENTS` contains `--from`: extract the filepath token following `--from`
- If neither `--from` nor `--prd` is present: show usage help and exit:
  ```
  Usage: /gsd-import --from <filepath>

  Modes:
    --from <filepath>  Import an external plan into GSD PLAN.md format
    --prd <filepath>   (coming soon) Import a PRD into PROJECT.md + REQUIREMENTS.md
  ```

Store the extracted filepath for subsequent steps.
</step>

<step name="validate_filepath">
Validate the file path using `validatePath()` from `security.cjs`. This is **mandatory** —
path validation must succeed before any file operations proceed.

**Path validation (unconditional — must run first):**
```bash
# MANDATORY: Call validatePath() before any file access
node -e "
  const { validatePath } = require('$HOME/.claude/get-shit-done/bin/lib/security.cjs');
  const result = validatePath(process.argv[1], process.cwd(), { allowAbsolute: true });
  if (!result.safe) {
    console.error('Path validation failed: ' + result.error);
    process.exit(1);
  }
  console.log('Validated: ' + result.resolved);
" "{filepath}"
```

**If validation fails, abort immediately — do not proceed to file existence or any other step.**

After validation passes, check existence:
```bash
if [ ! -f "{filepath}" ]; then
  echo "File not found: {filepath}"
  exit 1
fi
```

Read the file content. Detect the format:
- **Markdown** — contains `#` headers, lists, code blocks
- **YAML** — starts with `---` or contains YAML key-value patterns
- **JSON** — starts with `{` or `[`
- **Plain text** — none of the above

Report:
```
Source file: {filepath}
Format detected: {format}
Size: {line_count} lines
```
</step>

<step name="read_project_context">
Read existing GSD artifacts if they exist:

```
.planning/PROJECT.md   — project decisions, constraints, goals
.planning/REQUIREMENTS.md — established requirements with IDs
.planning/ROADMAP.md   — existing phases and their scope
```

**If none of these files exist**, note this and set `has_existing_context = false`:
```
No existing PROJECT.md or REQUIREMENTS.md found — importing as initial plan.
No conflict detection needed (no prior decisions to conflict with).
```

**If any exist**, set `has_existing_context = true` and extract:
- From PROJECT.md: key decisions, technology choices, constraints, goals
- From REQUIREMENTS.md: requirement IDs and descriptions
- From ROADMAP.md: phase numbers, names, and scope summaries
</step>

<step name="detect_conflicts">
**Skip this step entirely if `has_existing_context = false`.**

Compare the external plan against existing project decisions. For each major
section, decision, or requirement in the external plan, check:

1. **Decision conflicts** — Does it contradict a decision in PROJECT.md?
2. **Requirement conflicts** — Does it overlap with or contradict an existing requirement in REQUIREMENTS.md?
3. **Scope overlaps** — Does it duplicate scope already covered by an existing phase in ROADMAP.md?

**Present all conflicts to the user. Never auto-resolve conflicts.**

```
## Import Conflict Detection

**Source:** {filepath}
**Conflicts found:** {count}

| # | External Plan Says | Conflicts With | Resolution Needed |
|---|-------------------|----------------|-------------------|
| C-01 | "Use MongoDB for storage" | PROJECT.md: "PostgreSQL chosen for ACID compliance" | Technology choice |
| C-02 | "Build custom auth" | REQ-03: "Use OAuth2 via Passport.js" | Requirement conflict |
| C-03 | "Phase 2: API Layer" | ROADMAP Phase 02 already covers API | Scope overlap |
```

**For each conflict, ask the user to choose a resolution:**
- **Keep existing** — discard the conflicting section from the external plan (no artifact update needed)
- **Accept external** — replace the existing decision with the external plan's version
- **Merge both** — combine both perspectives (user provides guidance)
- **Skip this section** — exclude from import, revisit later (no artifact update needed)

Wait for the user to resolve **every** conflict before proceeding to conversion.

**MANDATORY: Write conflict resolutions back to durable artifacts.**
After all conflicts are resolved, update the source-of-truth files to reflect the decisions:

- **Accept external** resolutions: overwrite the conflicting section in the relevant artifact
  (PROJECT.md for decision conflicts, REQUIREMENTS.md for requirement conflicts, ROADMAP.md
  for scope overlaps) with the external plan's version.
- **Merge both** resolutions: write the merged content (as confirmed by the user) into the
  relevant artifact, replacing the old section.
- Resolutions that do not change existing artifacts (**Keep existing**, **Skip this section**)
  require no artifact write-back.

This ensures conflict resolutions are persisted — not just acknowledged in conversation.
Report each artifact update:
```
Updated .planning/PROJECT.md — replaced decision: "{old_decision}" → "{new_decision}"
Updated .planning/REQUIREMENTS.md — revised REQ-{id}: "{updated_text}"
```

If no conflicts are detected, report:
```
No conflicts detected against existing project decisions.
```
</step>

<step name="convert_to_gsd_format">
Transform the external plan (with conflict resolutions applied) into GSD PLAN.md format.

**Extract and structure:**
- Tasks with descriptions
- `files_modified` — list files each task will touch (infer from context where possible)
- `success_criteria` — measurable outcomes for each task
- `estimated_complexity` — low / medium / high based on scope
- Task ordering and wave structure (parallel-safe grouping)
- Dependencies identified from the external plan (`depends_on` references)

**Target output format** — standard GSD PLAN.md with:
```markdown
---
phase: "{phase_number}"
name: "{phase_name}"
estimated_complexity: "{complexity}"
---

# {Phase Name}

## Wave 1

### Task 1.1: {task_name}
**Description:** {description}
**Files modified:** {file_list}
**Success criteria:**
- {criterion_1}
- {criterion_2}
**Estimated complexity:** {complexity}

### Task 1.2: {task_name}
...

## Wave 2
...
```

Determine the target phase directory:
- If ROADMAP.md exists, use the next available phase number
- If no ROADMAP.md, default to phase `01`

Write the generated PLAN.md to the target phase directory:
```
.planning/phases/{phase_number}-{phase_name}/PLAN.md
```
</step>

<step name="validate_plan">
Offer to run plan-checker on the generated PLAN.md:

```
Run plan-checker to validate the imported plan? [Y/n]
```

If the user accepts (or presses Enter for default Y):
- Spawn `gsd-plan-checker` agent against the generated PLAN.md
- Present validation results
- If validation fails, offer to fix issues before finalizing

If the user declines, skip validation:
```
Skipping plan-checker validation.
```
</step>

<step name="commit_result">
If `commit_docs` is enabled in project configuration:

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(import): import external plan from {filename}" --files {file_list}
```

If `commit_docs` is not enabled, skip this step.
</step>

<step name="report" priority="last">
Present the final import summary:

```
## Import Complete

**Source:** {filepath}
**Target:** {phase_dir}/PLAN.md
**Conflicts resolved:** {conflict_count}
**Tasks extracted:** {task_count}
**Validation:** {passed/skipped}
```
</step>

</process>
