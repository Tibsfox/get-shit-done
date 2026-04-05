# Verification Overrides

Mechanism for marking intentional plan deviations as accepted rather than failed.

---

## When to Use

Overrides apply when a phase intentionally deviated from the original plan during execution — for example, a requirement was descoped, an alternative approach was chosen, or a dependency changed.

Without overrides, the verifier reports these as FAIL even though the deviation was intentional. Overrides let the developer mark specific items as `PASSED (override)` with a documented reason.

---

## Override Format

Add an `overrides` block to the VERIFICATION.md frontmatter:

```yaml
---
overrides:
  - criterion: "API endpoint returns paginated results"
    reason: "Descoped to v2 — dataset too small to justify pagination overhead"
    approved_by: "developer"
  - criterion: "OAuth2 integration with Google"
    reason: "Switched to passkey auth per updated security requirements"
    approved_by: "developer"
---
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `criterion` | Yes | The verification criterion text (fuzzy-matched, not exact) |
| `reason` | Yes | Why the deviation is acceptable |
| `approved_by` | No | Who approved (defaults to "developer") |

---

## Matching Rules

The verifier uses **fuzzy matching** to pair overrides with criteria:
- Case-insensitive comparison
- Ignores leading/trailing whitespace
- Matches if the override criterion is a substring of the full criterion text
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

## Example VERIFICATION.md

```markdown
---
overrides:
  - criterion: "paginated API responses"
    reason: "Descoped — dataset under 100 items, pagination adds complexity without value"
---

## Phase 3: API Layer — Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | REST endpoints return JSON | PASSED | curl tests confirm |
| 2 | Paginated API responses | PASSED (override) | Descoped — see override |
| 3 | Authentication middleware | PASSED | JWT validation working |
```
