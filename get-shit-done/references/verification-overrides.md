# Verification Overrides

Mechanism for marking intentional plan deviations as accepted rather than failed.

---

## When to Use

Overrides apply when a phase intentionally deviated from the original plan during execution — for example, a requirement was descoped, an alternative approach was chosen, or a dependency changed.

Without overrides, the verifier reports these as FAIL even though the deviation was intentional. Overrides let the developer mark specific items as `PASSED (override)` with a documented reason.

---

## When NOT to Use

Overrides are not a workaround for incomplete work or a way to bypass verification:

- **Incomplete implementation** — If the feature is simply unfinished, fix it rather than overriding. Overrides document *intentional* deviations, not missing work.
- **Load-bearing security or correctness requirements** — Overrides on items that protect data integrity, authentication, authorization, or safety-critical behavior should be flagged for human review before acceptance. These items exist for a reason.
- **Bulk overrides that nullify a phase** — If the majority of a phase's must-have items would need overrides, the phase plan itself likely needs revision. The verifier should warn when overrides exceed 50% of a phase's criteria.

---

## Override Format

Add an `overrides` block to the VERIFICATION.md frontmatter:

```yaml
---
overrides:
  - must_have: "API endpoint returns paginated results"
    reason: "Descoped to v2 — dataset too small to justify pagination overhead"
    accepted_by: "user"
  - must_have: "OAuth2 integration with Google"
    reason: "Switched to passkey auth per updated security requirements"
    accepted_by: "tech-lead"
---
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `must_have` | Yes | The verification must-have text (fuzzy-matched, not exact) |
| `reason` | Yes | Why the deviation is acceptable |
| `accepted_by` | Yes | Who accepted the override (e.g., "user", "tech-lead") — required for audit traceability |

---

## Matching Rules

The verifier uses **fuzzy matching** to pair overrides with criteria:
- Case-insensitive comparison
- Ignores leading/trailing whitespace
- Matches if the override must_have is a substring of the full criterion text
- Matches if 80%+ of words in the override appear in the criterion

This avoids brittle exact-string matching when criteria wording varies slightly between PLAN.md and VERIFICATION.md.

---

## Verifier Behavior

When an override matches a criterion:
1. Mark as `PASSED (override)` instead of `FAIL`
2. Include the override reason in the verification report
3. Visually distinguish from regular PASS (e.g., with override annotation)

When a criterion fails and NO override exists:
1. Report as `FAIL` (normal behavior)
2. Suggest: "If this deviation was intentional, add an override to VERIFICATION.md frontmatter"

---

## Override Lifecycle

### Re-verification carryforward

Existing overrides persist across re-verify runs. When a phase is re-verified (e.g., after additional work), previously accepted overrides remain in effect — the developer does not need to re-enter them. If the underlying criterion now passes naturally, the verifier marks it as `PASSED` and the override becomes inert but remains in the frontmatter for audit history.

### Milestone surfacing

Overrides appear in `/gsd-audit-milestone` reports. The audit summary includes a dedicated overrides section listing every override applied across the milestone, grouped by phase. This gives stakeholders visibility into which deviations were accepted and why.

### Frontmatter tracking

VERIFICATION.md frontmatter includes an `overrides_applied` count that tracks how many overrides are active for that phase:

```yaml
---
overrides_applied: 2
overrides:
  - must_have: "..."
    reason: "..."
    accepted_by: "..."
---
```

The verifier updates this count automatically during each verification run.

---

## Example VERIFICATION.md

```markdown
---
overrides_applied: 1
overrides:
  - must_have: "paginated API responses"
    reason: "Descoped — dataset under 100 items, pagination adds complexity without value"
    accepted_by: "user"
---

## Phase 3: API Layer — Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | REST endpoints return JSON | PASSED | curl tests confirm |
| 2 | Paginated API responses | PASSED (override) | Descoped — see override |
| 3 | Authentication middleware | PASSED | JWT validation working |
```
