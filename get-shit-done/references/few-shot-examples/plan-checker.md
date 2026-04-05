# Few-Shot Calibration: Plan Checker

Format version: 1.0

Annotated examples calibrating plan-checker output quality. Each example shows an input scenario, the expected response, and why that response is correct.

---

## Example 1: Approve — Well-Structured Plan

**Scenario:** Phase 3 (API Layer) plan with clear task decomposition, correct dependency ordering, testable success criteria, and realistic scope.

**Input summary:**
- 4 tasks across 2 waves
- Each task has files_modified, success_criteria, and estimated_complexity
- Dependencies correctly ordered (models before routes before middleware)
- Success criteria are verifiable (specific endpoints, status codes, response shapes)

**Expected response:**
```
## Plan Check: Phase 3 — API Layer

**Verdict: APPROVED**

The plan is well-structured with correct dependency ordering and verifiable success criteria.

| Check | Status | Notes |
|-------|--------|-------|
| Task decomposition | ✅ | 4 tasks, appropriate granularity |
| Dependency ordering | ✅ | Models → Routes → Middleware → Tests |
| Success criteria | ✅ | Specific endpoints and status codes |
| Scope alignment | ✅ | Matches REQUIREMENTS.md phase goals |
| Risk identification | ✅ | Auth middleware complexity noted |
```

**Why this is correct:** All checks pass. The plan has no gaps between requirements and tasks, dependencies flow correctly, and criteria are testable (not vague like "API works").

---

## Example 2: Flag Gap — Missing Error Handling

**Scenario:** Phase 5 (Payment Integration) plan that covers the happy path but omits error handling, retry logic, and webhook validation.

**Input summary:**
- 3 tasks: Stripe setup, payment flow, subscription management
- No task for error handling or webhook signature verification
- Success criteria mention "payment works" but not failure modes
- REQUIREMENTS.md explicitly lists "graceful degradation on payment failure"

**Expected response:**
```
## Plan Check: Phase 5 — Payment Integration

**Verdict: REVISION REQUESTED**

Critical gap: payment error handling and webhook security are absent despite being in REQUIREMENTS.md.

| Check | Status | Notes |
|-------|--------|-------|
| Task decomposition | ⚠️ | Missing error handling task |
| Dependency ordering | ✅ | Correct |
| Success criteria | ❌ | "Payment works" is not verifiable — needs specific status codes and failure modes |
| Scope alignment | ❌ | REQUIREMENTS.md REQ-5.3 (graceful degradation) has no covering task |
| Risk identification | ❌ | No mention of webhook signature verification |

### Issues (blocking)

- **GAP-01:** No task covers error handling. REQ-5.3 requires graceful degradation on payment failure — add a task for retry logic, user-facing error messages, and partial-failure recovery.
- **GAP-02:** Webhook endpoint has no signature verification. This is a security requirement — add to an existing task or create a new one.
- **GAP-03:** Success criteria "payment works" is too vague. Replace with specific criteria: "POST /payments returns 201 on success, 402 on declined, 500 on gateway timeout."
```

**Why this is correct:** The plan has functional gaps traceable to specific requirements. The checker identifies the exact requirement IDs, suggests concrete fixes, and uses blocking severity because these are security and reliability issues (not stylistic).

---

## Example 3: Approve with Info — Minor Suggestion

**Scenario:** Phase 2 (Database) plan that is complete but could benefit from an index on a frequently-queried column.

**Input summary:**
- 5 tasks covering schema, migrations, seed data, queries, tests
- All requirements covered
- No index on `users.email` despite login-by-email being a core flow

**Expected response:**
```
## Plan Check: Phase 2 — Database Layer

**Verdict: APPROVED**

Plan covers all requirements. One optimization suggestion (non-blocking).

| Check | Status | Notes |
|-------|--------|-------|
| Task decomposition | ✅ | 5 tasks, appropriate scope |
| Dependency ordering | ✅ | Schema → Migrations → Seeds → Queries → Tests |
| Success criteria | ✅ | Specific query patterns and expected results |
| Scope alignment | ✅ | All REQ-2.x items covered |
| Risk identification | ✅ | Migration rollback strategy documented |

### Issues (info)

- **INFO-01:** Consider adding an index on `users.email` — login-by-email is a core flow and will be queried on every auth request. Not blocking because the schema can be amended later without migration risk.
```

**Why this is correct:** The issue is a performance optimization, not a functional gap. INFO severity is correct because the plan is complete without it. The checker approves the plan (INFO issues don't block) while still surfacing the suggestion.
