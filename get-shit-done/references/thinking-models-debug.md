# Thinking Model Guidance: Debug

When and how to leverage extended thinking for debug tasks.

---

## When to Use Extended Thinking

- **Reproducing complex bugs** where the failure path crosses multiple modules or involves timing-dependent behavior
- **Analyzing stack traces with multiple causal chains** — when the reported error is a symptom and the real root cause is several layers removed
- **Tracing data flow across modules** to find where a value is corrupted, dropped, or transformed incorrectly
- **Evaluating competing hypotheses** when initial investigation yields multiple plausible root causes that cannot be distinguished without structured reasoning

## Recommended Budget

**Level:** High

Complex root cause analysis benefits most from extended reasoning. Allocate thinking tokens for the initial diagnostic analysis — building the causal chain from symptom to root cause — rather than for each individual debugging step. Once the root cause hypothesis is formed, execution of the fix is typically mechanical and does not require extended thinking.

## Prompt Structure

When requesting extended thinking:
1. **State the symptom clearly** — what is observed, when it occurs, and what was expected instead
2. **List what has been ruled out** — previous hypotheses tested and their results, to avoid redundant reasoning
3. **Ask for causal chain analysis** — request a structured trace from the symptom back to the root cause, identifying each transformation or decision point along the path

## When NOT to Think

Extended thinking adds latency and cost. Skip it for:
- **Simple typos or syntax errors** — missing commas, misspelled identifiers, unclosed brackets
- **Missing imports or dependencies** — the error message directly names the missing module
- **Known error messages with obvious fixes** — well-documented errors where the resolution is standard (e.g., "ENOENT: no such file or directory")
- **Configuration mismatches** — wrong port, incorrect environment variable name, mismatched version in package.json
