# Thinking Model Guidance: Verification

When and how to leverage extended thinking for verification tasks.

---

## When to Use Extended Thinking

- **Evaluating whether code satisfies abstract requirements** — when the success criterion is behavioral ("user can securely authenticate") and verifying it requires reasoning about whether the implementation actually achieves the stated outcome
- **Assessing edge case coverage** — determining whether the implementation handles boundary conditions, error paths, and adversarial inputs that are implied but not explicitly listed in the plan
- **Verifying security properties** — reasoning about whether authentication, authorization, input validation, and data protection are correctly implemented across the full request lifecycle
- **Distinguishing real gaps from deferred work** — when a missing feature could be either a verification failure or intentional scope for a later phase, requiring cross-referencing against the roadmap

## Recommended Budget

**Level:** Medium

Verification should be thorough but not over-analyze. Allocate thinking tokens for the initial goal-backward derivation — establishing what must be true for the phase to succeed — rather than for each individual artifact check. Once the must-haves framework is established, checking file existence, scanning for patterns, and tracing wiring are mechanical operations that do not benefit from extended thinking.

## Prompt Structure

When requesting extended thinking:
1. **State the criterion** — the specific observable truth or requirement being verified, expressed as a user-visible outcome
2. **Point to the implementation** — identify the artifacts, key links, and data flows that should support the criterion
3. **Ask for evidence-based assessment** — request a structured judgment (VERIFIED, FAILED, UNCERTAIN) with specific evidence from the codebase supporting the conclusion

## When NOT to Think

Extended thinking adds latency and cost. Skip it for:
- **Checking file existence** — verifying that expected artifacts were created at the specified paths
- **Verifying string matches** — confirming that imports, exports, or configuration values match expected patterns
- **Confirming simple structural requirements** — checking that a file has the expected sections, a function has the right signature, or a test file exists
- **Running automated test commands** — executing test suites and interpreting pass/fail results
