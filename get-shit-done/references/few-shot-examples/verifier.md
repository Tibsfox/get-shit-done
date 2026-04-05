# Few-Shot Calibration: Verifier

Format version: 1.0

Annotated examples calibrating verifier output quality. Each example shows an input scenario, the expected response, and why that response is correct.

---

## Example 1: All Pass — Clean Verification

**Scenario:** Phase 3 (API Layer) completed. All endpoints exist, tests pass, error handling present.

**Input summary:**
- PLAN.md lists 4 tasks, all have SUMMARY.md entries marked complete
- Codebase has the expected files (routes/, models/, middleware/, tests/)
- `npm test` passes with the expected test count
- API endpoints respond with correct status codes

**Expected response:**
```
## Verification: Phase 3 — API Layer

**Result: ALL CRITERIA PASSED**

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | REST endpoints return JSON responses | PASSED | curl /api/users returns 200 with Content-Type: application/json |
| 2 | Authentication middleware validates JWT | PASSED | middleware/auth.js exists, tests/auth.test.js has 12 passing assertions |
| 3 | Error responses use consistent format | PASSED | ErrorHandler class in middleware/errors.js, all routes use it |
| 4 | Database queries use parameterized statements | PASSED | grep confirms no string concatenation in SQL, all use query params |
```

**Why this is correct:** Each criterion has specific evidence from the actual codebase — file paths, test counts, command output. The verifier checked what EXISTS, not what SUMMARY.md claimed. Evidence is concrete and reproducible.

---

## Example 2: Missing Artifact — Incomplete Phase

**Scenario:** Phase 4 (Frontend) SUMMARY.md claims completion but the test file is empty and one component is missing.

**Input summary:**
- SUMMARY.md says "all components implemented, tests passing"
- `src/components/Dashboard.tsx` referenced in plan but doesn't exist
- `tests/frontend.test.ts` exists but contains only boilerplate (0 actual test assertions)
- Other components exist and look correct

**Expected response:**
```
## Verification: Phase 4 — Frontend

**Result: 2 CRITERIA FAILED**

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Dashboard component renders user data | FAILED | src/components/Dashboard.tsx does not exist (referenced in PLAN.md task 2) |
| 2 | Navigation between views works | PASSED | Router.tsx has correct route definitions, Link components verified |
| 3 | Frontend tests cover critical paths | FAILED | tests/frontend.test.ts has 0 assertions — file is boilerplate only |
| 4 | Responsive layout on mobile breakpoints | PASSED | Tailwind breakpoints confirmed in all component files |

### Failed Criteria Detail

**Criterion 1 — Dashboard component:**
SUMMARY.md claims "Dashboard component with user data display." However, `src/components/Dashboard.tsx` does not exist on disk. The import in `App.tsx` line 12 will cause a build error.

**Criterion 3 — Frontend tests:**
SUMMARY.md claims "tests passing." The file `tests/frontend.test.ts` exists but contains only a `describe()` block with no `test()` or `it()` calls. This is a stub, not a test suite.
```

**Why this is correct:** The verifier caught the discrepancy between SUMMARY.md claims and actual codebase state. It checked for file existence (not just SUMMARY claims), verified test content (not just file presence), and provided actionable evidence (specific file paths, line numbers).

---

## Example 3: Wrong Export — Subtle Mismatch

**Scenario:** Phase 6 (SDK) appears complete but the public API exports don't match the documented interface.

**Input summary:**
- PLAN.md says "export Client, Config, and Response types from index.ts"
- `src/index.ts` exports `Client` and `Config` but not `Response` (it exports `APIResponse` instead)
- All tests pass (they import `APIResponse` directly, not through the public API)
- README shows `import { Client, Config, Response } from 'sdk'`

**Expected response:**
```
## Verification: Phase 6 — SDK

**Result: 1 CRITERION FAILED**

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Client class exported from index.ts | PASSED | `export { Client }` on line 3 |
| 2 | Config type exported from index.ts | PASSED | `export { Config }` on line 4 |
| 3 | Response type exported from index.ts | FAILED | index.ts exports `APIResponse`, not `Response` — naming mismatch |
| 4 | SDK tests cover public API surface | PASSED | 18 tests, all pass |

### Failed Criteria Detail

**Criterion 3 — Response type export:**
The plan and README document `Response` as the public type name, but `src/index.ts` line 5 exports `APIResponse`. Tests pass because they import directly from `src/types.ts`, bypassing the public API. A consumer using `import { Response } from 'sdk'` will get `undefined`.

This is a naming mismatch, not missing functionality. Fix: either rename the export to `Response` or update the plan/README to document `APIResponse`.
```

**Why this is correct:** The verifier caught a subtle mismatch that tests missed (because tests bypass the public API). The evidence is precise — specific line numbers, specific export names, and the explanation of why tests didn't catch it. This is exactly the kind of issue goal-backward verification is designed to find.
