---
name: gsd:discuss-phase
description: Gather phase context through adaptive questioning before planning
argument-hint: "<phase>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Extract implementation decisions that downstream agents need — researcher and planner will use CONTEXT.md to know what to investigate and what choices are locked.

**How it works:**
1. Analyze the phase to identify gray areas (UI, UX, behavior, etc.)
2. Present gray areas — user selects which to discuss
3. Deep-dive each selected area until satisfied
4. Create CONTEXT.md with decisions that guide research and planning

**Output:** `{phase}-CONTEXT.md` — decisions clear enough that downstream agents can act without asking the user again
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/discuss-phase.md
@~/.claude/get-shit-done/templates/context.md
</execution_context>

<context>
Phase number: $ARGUMENTS (required)

**Load project state:**
@.planning/STATE.md

**Load roadmap:**
@.planning/ROADMAP.md
</context>

<process>
1. Validate phase number (error if missing or not in roadmap)
2. Check if CONTEXT.md exists (offer update/view/skip if yes)
3. **Analyze phase** — Identify domain and generate phase-specific gray areas
4. **Present gray areas** — Multi-select: which to discuss? (NO skip option)
5. **Deep-dive each area** — 4 questions per area, then offer more/next
6. **Write CONTEXT.md** — Sections match areas discussed
7. Offer next steps (research or plan)

**CRITICAL: Scope guardrail**
- Phase boundary from ROADMAP.md is FIXED
- Discussion clarifies HOW to implement, not WHETHER to add more
- If user suggests new capabilities: "That's its own phase. I'll note it for later."
- Capture deferred ideas — don't lose them, don't act on them

**Domain-aware gray areas:**
Gray areas depend on what's being built. Analyze the phase goal:
- Something users SEE → layout, density, interactions, states
- Something users CALL → responses, errors, auth, versioning
- Something users RUN → output format, flags, modes, error handling
- Something users READ → structure, tone, depth, flow
- Something being ORGANIZED → criteria, grouping, naming, exceptions

Generate 3-4 **phase-specific** gray areas, not generic categories.

**Probing depth:**
- Ask 4 questions per area before checking
- "More questions about [area], or move to next?"
- If more → ask 4 more, check again
- After all areas → "Ready to create context?"

**Do NOT ask about (Claude handles these):**
- Technical implementation
- Architecture choices
- Performance concerns
- Scope expansion
</process>

<logging>

## Logging Specifications for Orchestrator

Context gathering sessions track exploration depth and decision capture. Log key events for understanding context quality.

### 1. Discussion Start (INFO level)

Log when context discussion session begins to record context gathering lifecycle for audit trail.

**Message format:** "Discussion started for phase {phase}: {N} gray areas identified"

**Context to include:**
- `event`: "discussion.start"
- `phase`: Phase identifier (e.g., "05-workflow-integration")
- `gray_areas_count`: Number of gray areas identified
- `context_exists`: Whether CONTEXT.md already exists (boolean)

**Example code:**

```javascript
logger.info(`Discussion started for phase ${phase}: ${grayAreasCount} gray areas identified`, {
  event: 'discussion.start',
  phase: phase,
  gray_areas_count: grayAreasCount,
  context_exists: contextExists
});
```

### 2. Area Deep-Dive (DEBUG level)

Log when user selects area to discuss and completes exploration to track discussion depth and user engagement.

**Message format:** "Deep-dive complete: {area_name} ({N} questions asked)"

**Context to include:**
- `event`: "discussion.area_complete"
- `phase`: Phase identifier
- `area_name`: Name of gray area discussed
- `questions_asked`: Number of questions asked during deep-dive
- `user_satisfied`: Whether user was satisfied with depth (boolean)

**Example code:**

```javascript
logger.debug(`Deep-dive complete: ${areaName} (${questionsAsked} questions asked)`, {
  event: 'discussion.area_complete',
  phase: phase,
  area_name: areaName,
  questions_asked: questionsAsked,
  user_satisfied: userSatisfied
});
```

### 3. Context Creation (INFO level)

Log when CONTEXT.md is written with discussion results to record context quality and coverage.

**Message format:** "Context created for phase {phase}: {N} areas discussed, {M} decisions captured"

**Context to include:**
- `event`: "discussion.complete"
- `phase`: Phase identifier
- `areas_discussed`: Number of areas discussed
- `duration_ms`: Discussion duration in milliseconds
- `decisions_captured`: Number of decisions captured

**Example code:**

```javascript
logger.info(`Context created for phase ${phase}: ${areasDiscussed} areas discussed, ${decisionsCaptured} decisions captured`, {
  event: 'discussion.complete',
  phase: phase,
  areas_discussed: areasDiscussed,
  duration_ms: duration,
  decisions_captured: decisionsCaptured
});
```

</logging>

<success_criteria>
- Gray areas identified through intelligent analysis
- User chose which areas to discuss
- Each selected area explored until satisfied
- Scope creep redirected to deferred ideas
- CONTEXT.md captures decisions, not vague vision
- User knows next steps
</success_criteria>
