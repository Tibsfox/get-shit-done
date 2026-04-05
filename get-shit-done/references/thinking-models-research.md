# Thinking Model Guidance: Research

When and how to leverage extended thinking for research tasks.

---

## When to Use Extended Thinking

- **Synthesizing findings from multiple sources** — when Context7, official docs, and web search results provide overlapping or partially contradictory information that must be reconciled into a coherent recommendation
- **Evaluating conflicting approaches** where the ecosystem offers multiple viable libraries or patterns and the tradeoffs are nuanced (performance vs. DX, bundle size vs. feature completeness)
- **Assessing technology trade-offs** that affect downstream planning — choosing a standard stack component that constrains architectural decisions in later phases
- **Constructing confidence assessments** — when determining whether a claim should be tagged HIGH, MEDIUM, or LOW requires reasoning about source quality, recency, and corroboration

## Recommended Budget

**Level:** Medium-High

Research synthesis benefits from structured reasoning, particularly when reconciling conflicting sources or making stack recommendations that the planner will treat as locked decisions. Allocate thinking tokens for the synthesis and recommendation phase — after raw data gathering is complete — rather than during individual tool calls. The gathering phase (Context7 queries, web searches, doc reads) is mechanical and does not benefit from extended thinking.

## Prompt Structure

When requesting extended thinking:
1. **Present the research question** — what specific decision or understanding the research must produce, scoped to the phase's needs
2. **List known constraints** — locked decisions from CONTEXT.md, project tech stack from CLAUDE.md, and any compatibility requirements that narrow the solution space
3. **Ask for structured comparison** — request a comparison matrix or decision framework rather than a narrative, ensuring the output is directly consumable by the planner

## When NOT to Think

Extended thinking adds latency and cost. Skip it for:
- **Factual lookups** — checking a library version, reading a changelog, confirming an API signature
- **Reading documentation** — consuming official docs or Context7 output to extract specific information
- **Searching for specific APIs** — finding the right method name, configuration key, or CLI flag
- **Verifying a single claim** — cross-checking one source against another when the answer is binary (yes/no, exists/doesn't exist)
