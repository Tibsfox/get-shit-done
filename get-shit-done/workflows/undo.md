<purpose>
Safe git revert for GSD phase and plan commits. Uses only `git revert --no-commit`
to preserve history. All reverts collected into a single atomic commit.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

## Step 1: Parse arguments

Determine mode from user input:
- `--last N` (default: `--last 10`) — interactive selection from recent GSD commits
- `--phase NN` — revert all commits for phase NN
- `--plan NN-MM` — revert commits for plan MM within phase NN

If no arguments provided, default to `--last 10`.

## Step 2: Identify target commits

### Mode: --last N

```bash
# Show last N GSD conventional commits
git log --oneline --grep="^feat\|^fix\|^refactor\|^test\|^docs\|^chore" -n ${N} --format="%H %s"
```

Present numbered list and ask user to select which commit(s) to revert (comma-separated numbers or ranges).

### Mode: --phase NN

```bash
# Try phase manifest first
MANIFEST=".planning/.phase-manifest.json"
if [ -f "$MANIFEST" ]; then
  # Extract commit hashes for phase NN from manifest
  node -e "const m=JSON.parse(require('fs').readFileSync('$MANIFEST','utf8')); const p=m.phases?.['${PHASE}']; if(p?.commits) p.commits.forEach(c=>console.log(c))"
fi
```

If no manifest or no commits found, fall back to git log:
```bash
# Filter by conventional commit scope matching phase number
git log --oneline --all --format="%H %s" | grep -i "phase.${PHASE}\|phase-${PHASE}\|(${PHASE})\|(\$PHASE)"
```

Show matched commits and confirm scope with user.

### Mode: --plan NN-MM

```bash
# Filter commits related to specific plan
git log --oneline --all --format="%H %s" | grep -i "plan.${PLAN_ID}\|${PHASE}.*${PLAN_ID}"
```

Show matched commits and confirm.

## Step 3: Dependency check

For `--phase` and `--plan` modes, check if later phases reference the target:

```bash
# Check if any later phase directories reference the target phase
for dir in .planning/phases/*/; do
  PHASE_NUM=$(basename "$dir" | grep -oP '^\d+')
  if [ "$PHASE_NUM" -gt "$TARGET_PHASE" ]; then
    # Check PLAN.md files for references to the target phase
    grep -l "phase.${TARGET_PHASE}\|Phase ${TARGET_PHASE}" "$dir"*.md 2>/dev/null
  fi
done
```

If dependencies found:
```
Warning: Later phases may depend on this work:
  - Phase 05 PLAN.md references Phase 03 authentication module
  - Phase 07 PLAN.md imports from Phase 03 auth middleware

Reverting Phase 03 may break these phases. Continue anyway? [y/N]
```

Require explicit confirmation.

## Step 4: Execute reverts

```bash
# Revert each commit in reverse chronological order (newest first)
for HASH in ${COMMITS_REVERSED}; do
  git revert --no-commit "$HASH" 2>&1 || {
    echo "Conflict reverting $HASH — resolve manually or abort with: git revert --abort"
    exit 1
  }
done
```

## Step 5: Atomic commit

Ask user for a reason:
```
Reason for reverting (one line):
```

```bash
git commit -m "revert(${SCOPE}): undo ${DESCRIPTION} — ${REASON}"
```

Commit message format: `revert(<phase>): undo phase NN — <user reason>`

## Step 6: Report

```
## Undo Complete

**Reverted:** {count} commit(s)
**Scope:** {phase NN | plan NN-MM | selected commits}
**Commit:** {new_commit_hash}

The original commits are preserved in git history.
To undo this revert: `git revert {new_commit_hash}`
```

</process>

<success_criteria>
- [ ] Correct mode detected from arguments
- [ ] Phase manifest checked before git log fallback
- [ ] Dependency warning shown for later phases
- [ ] User confirmation required before executing
- [ ] All reverts use git revert --no-commit (never git reset)
- [ ] Single atomic commit with descriptive message
- [ ] Conflict handling with abort instructions
</success_criteria>
