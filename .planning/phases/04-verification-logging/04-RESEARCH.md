# Phase 4: Verification Logging - Research

**Researched:** 2026-01-28
**Domain:** Verification process instrumentation, audit trail logging, goal-backward verification patterns
**Confidence:** HIGH

## Summary

This phase implements logging within the gsd-verifier agent's verification operations, creating a detailed audit trail of how phase goal achievement is determined. The research focused on three key areas: (1) verification process logging patterns from testing and audit systems, (2) structured logging for multi-level artifact checks (exists/substantive/wired), and (3) gap detection logging for downstream consumption by planners.

Key findings:
- The gsd-verifier agent already has complete logging specifications in `<logging>` section (added in Phase 3-01)
- Verification logging requires structured context objects for each verification step to enable audit trail reconstruction
- Multi-level artifact checks (exists → substantive → wired) create hierarchical verification evidence that must be logged at DEBUG level for diagnosis
- Gap detection results must be logged at INFO level since they drive downstream plan creation via `/gsd:plan-phase --gaps`
- Audit trail best practices (2026) emphasize immutable logs, complete chain of custody, and structured data for compliance

The existing logger infrastructure (Phase 1-2) provides all necessary primitives: level-based filtering (DEBUG for artifact checks, INFO for outcomes), structured context via key-value pairs, session ID correlation, and syslog transport for audit compliance.

**Primary recommendation:** Implement the 7 logging events already specified in gsd-verifier.md `<logging>` section. Focus on structured context objects that capture verification state (exists/substantive/wired status) and gap details (truth/reason/missing items) for both human diagnosis and programmatic consumption by gap closure planners.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js logger.js | v1 (internal) | Core logging API with level-based methods | GSD's zero-dependency logger (Phase 1) |
| Bash verification scripts | N/A | File existence, grep patterns, wiring checks | gsd-verifier's existing verification engine |
| Structured context objects | N/A | Key-value metadata in log entries | Enables audit trail reconstruction and gap analysis |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| logger-metrics.js | v1 (internal) | Duration tracking for verification timing | Performance analysis of verification steps |
| YAML frontmatter parsing | N/A | Extract must_haves from PLAN.md | Determine what to verify (truths, artifacts, key_links) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Structured context objects | String interpolation in messages | Context objects enable log aggregation and querying, essential for audit compliance |
| DEBUG level for artifact checks | INFO level for all checks | DEBUG keeps default log output clean while preserving diagnostic detail when needed |
| Gap detection at INFO | Gap detection at DEBUG | INFO ensures gaps are visible at default level, critical for workflow progression |

**Installation:**
```bash
# Logger already installed in Phase 1-2
# Verification scripts already exist in gsd-verifier.md
# No additional dependencies needed
```

## Architecture Patterns

### Recommended Verification Logging Flow

Verification logging follows the gsd-verifier execution steps:

```
Step 0: Check Previous VERIFICATION.md
├─ If exists → Load must_haves (no log)
└─ If not    → Derive must_haves (no log)

Step 1-2: Context Loading & Must-Haves
└─ Log: Verification start (INFO)
   - phase, plans_count, must_haves_count, mode

Step 3-4: Verify Truths → Artifacts
├─ For each artifact:
│  └─ Log: Artifact check (DEBUG)
│     - path, exists, substantive, wired, status, issue
└─ For each truth:
   └─ Determine status based on supporting artifacts

Step 5: Verify Key Links
└─ For each link:
   └─ Log: Key link check (DEBUG)
      - from, to, via, status, details

Step 6: Gap Detection
└─ For each failed truth:
   └─ Log: Gap detected (INFO)
      - truth, status, reason, artifacts_affected, missing_items

Step 7-9: Overall Status & Output
├─ Log: Verification outcome (INFO)
│  - status, score, gaps, human_verification_needed
└─ Create VERIFICATION.md (no log)

Agent Lifecycle:
├─ Start: Agent spawn (INFO)
└─ End:   Agent completion (INFO)
   - outcome, duration_ms, status, score, gaps_count
```

### Pattern 1: Three-Level Artifact Verification Logging

**What:** Log artifact checks at three hierarchical levels: exists → substantive → wired

**When to use:** All artifact verification in Step 4

**Example:**
```javascript
// Source: gsd-verifier.md <logging> section
// Context: Verifying src/components/Chat.tsx artifact

// Level 1: Existence check
const exists = fs.existsSync(artifactPath);

// Level 2: Substantive check (adequate length, no stubs, has exports)
const lines = fs.readFileSync(artifactPath, 'utf8').split('\n').length;
const hasStubs = /TODO|FIXME|placeholder/.test(content);
const hasExports = /^export (default |)/.test(content);
const substantive = lines >= 15 && !hasStubs && hasExports;

// Level 3: Wiring check (imported and used)
const imports = grep('-r', `import.*${componentName}`, 'src/').stdout;
const wired = imports.split('\n').length > 1;

// Determine overall status
let status, issue;
if (!exists) {
  status = 'missing';
  issue = 'File does not exist at expected path';
} else if (!substantive) {
  status = 'stub';
  issue = `Too short (${lines} lines) or has stub patterns`;
} else if (!wired) {
  status = 'orphaned';
  issue = 'Component exists with real implementation but not imported anywhere';
} else {
  status = 'verified';
  issue = null;
}

// Log at DEBUG level (level 4)
logger.debug(`Artifact check: ${artifactPath}`, {
  agent_id: agentId,
  path: artifactPath,
  exists: exists,
  substantive: substantive,
  wired: wired,
  status: status,
  issue: issue
});
```

**Why this works:**
- Captures complete verification state for diagnosis
- Structured context enables querying by status (find all 'orphaned' artifacts)
- Three-level hierarchy matches gsd-verifier's verification logic
- DEBUG level keeps default output clean while preserving detail

### Pattern 2: Gap Detection with Downstream Context

**What:** Log gap detection with structured data consumable by `/gsd:plan-phase --gaps`

**When to use:** Step 6 (Gap Detection) when a truth fails verification

**Example:**
```javascript
// Source: gsd-verifier.md Step 10 (Structure Gap Output)
// Context: Truth "User can see existing messages" failed verification

const gap = {
  truth: 'User can see existing messages',
  status: 'failed',
  reason: 'Chat component exists but does not fetch messages from API',
  artifacts: [
    {
      path: 'src/components/Chat.tsx',
      issue: 'No useEffect with fetch call'
    }
  ],
  missing: [
    'API call in useEffect to /api/chat',
    'State for storing fetched messages',
    'Render messages array in JSX'
  ]
};

// Log at INFO level (level 3) - must be visible at default level
logger.info(`Gap detected: ${gap.truth}`, {
  agent_id: agentId,
  truth: gap.truth,
  status: gap.status,
  reason: gap.reason,
  artifacts_affected: gap.artifacts.map(a => a.path),
  missing_items: gap.missing
});
```

**Why this works:**
- INFO level ensures gaps are visible at default log level
- Structured context matches VERIFICATION.md YAML frontmatter format
- `missing_items` array directly informs what planner should create tasks for
- `artifacts_affected` enables correlation with artifact check logs

### Pattern 3: Verification Outcome Summary

**What:** Log final verification outcome with complete summary for audit trail closure

**When to use:** Step 9 (Determine Overall Status) after all checks complete

**Example:**
```javascript
// Source: gsd-verifier.md Step 9
// Context: All verification checks complete, determine overall status

const verifiedTruths = truths.filter(t => t.status === 'verified');
const totalTruths = truths.length;
const score = `${verifiedTruths.length}/${totalTruths} truths verified`;

let status;
if (verifiedTruths.length === totalTruths && gaps.length === 0) {
  status = 'passed';
} else if (gaps.length > 0) {
  status = 'gaps_found';
} else {
  status = 'human_needed';
}

// Log at INFO level (level 3)
logger.info(`Verification outcome: ${status}`, {
  agent_id: agentId,
  status: status,
  score: score,
  gaps: gaps.map(g => ({
    truth: g.truth,
    reason: g.reason
  })),
  human_verification_needed: humanVerificationItems.length > 0
});
```

**Why this works:**
- Single log entry summarizes entire verification session
- Score provides quick assessment (3/5 truths verified)
- Gap summaries enable quick diagnosis without reading full logs
- Closure point for audit trail (verification session complete)

### Pattern 4: Re-Verification Mode Logging

**What:** Log re-verification context when verifying after gap closure

**When to use:** Step 0 when previous VERIFICATION.md exists with gaps

**Example:**
```javascript
// Source: gsd-verifier.md Step 0 (Check for Previous Verification)
// Context: Previous verification found gaps, now re-verifying

const previousVerification = parseYAML(previousVerificationMd);
const isReVerification = previousVerification.gaps && previousVerification.gaps.length > 0;

// Log verification start with re-verification context
logger.info('Verification start', {
  agent_id: agentId,
  phase: phaseId,
  plans_count: plans.length,
  must_haves_count: mustHaves.truths.length + mustHaves.artifacts.length + mustHaves.key_links.length,
  mode: isReVerification ? 're-verification' : 'initial',
  previous_status: isReVerification ? previousVerification.status : null,
  previous_gaps_count: isReVerification ? previousVerification.gaps.length : 0
});
```

**Why this works:**
- Correlates current verification with previous attempt
- `mode` field enables filtering re-verification sessions in logs
- `previous_gaps_count` shows progress (5 gaps → 2 gaps → 0 gaps)
- Enables audit trail across multiple verification iterations

### Anti-Patterns to Avoid

- **Logging at wrong levels:** Don't log artifact checks at INFO — creates noise at default level. Use DEBUG for detailed checks, INFO for outcomes only.

- **String interpolation instead of structured context:** Don't use `logger.info(\`Artifact ${path} status: ${status}\`)`. Use structured context objects for queryability.

- **Missing correlation metadata:** Don't log without `agent_id` and `phase` context. These fields enable correlation across verification steps.

- **Incomplete gap information:** Don't log gaps without `missing_items` array. Planner needs specific guidance on what to implement.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verification audit trail | Custom verification logging code | Logger with structured context | Infrastructure already exists, follows audit logging best practices |
| Gap data structure | Custom gap format | VERIFICATION.md YAML frontmatter schema | Already defined in gsd-verifier.md, consumed by `/gsd:plan-phase --gaps` |
| Three-level artifact checks | New verification logic | gsd-verifier.md existing bash functions | `check_exists()`, `check_stubs()`, `check_wiring()` already implemented |
| Agent lifecycle tracking | Manual start/end logging | Standard agent spawn/completion pattern | All 11 agents use identical lifecycle logging format |
| Re-verification detection | Custom previous-run tracking | Parse previous VERIFICATION.md frontmatter | gsd-verifier Step 0 already implements this logic |

**Key insight:** Phase 3 already specified ALL logging events for gsd-verifier. Phase 4 implements the orchestrator code that CALLS these logging events during verification execution.

## Common Pitfalls

### Pitfall 1: Logging Too Much at INFO Level

**What goes wrong:** Logging every artifact check at INFO level creates overwhelming output at default log level (3), making it hard to find important outcomes

**Why it happens:** Misunderstanding log level semantics — INFO is for "informational milestones", not detailed operations

**How to avoid:**
- INFO: Verification start, gap detected, verification outcome, agent lifecycle
- DEBUG: Artifact checks, key link checks, intermediate steps
- TRACE: Individual grep commands, file reads (if needed)

**Warning signs:** User complaints about "too much logging" when running verification at default level, or inability to find gaps quickly in logs

### Pitfall 2: Incomplete Gap Context for Planner

**What goes wrong:** Gap logs say "Chat component failed" but don't specify what's missing, forcing planner to guess what tasks to create

**Example:**
```javascript
// BAD - vague gap logging
logger.info('Gap detected', {
  truth: 'User can see existing messages',
  status: 'failed'
  // Missing: reason, artifacts_affected, missing_items
});

// GOOD - complete gap context
logger.info('Gap detected: User can see existing messages', {
  truth: 'User can see existing messages',
  status: 'failed',
  reason: 'Chat component exists but does not fetch messages from API',
  artifacts_affected: ['src/components/Chat.tsx'],
  missing_items: [
    'API call in useEffect to /api/chat',
    'State for storing fetched messages',
    'Render messages array in JSX'
  ]
});
```

**Why it happens:** Treating gap logs as human-only output, forgetting planner consumes this data

**How to avoid:** Always include `reason`, `artifacts_affected`, and `missing_items` in gap logs — these fields directly inform planner task creation

**Warning signs:** Planner creates vague tasks like "fix Chat component" instead of specific tasks like "add useEffect to fetch messages from /api/chat"

### Pitfall 3: Not Logging Re-Verification Context

**What goes wrong:** Can't distinguish initial verification from re-verification after gap closure, making it hard to track progress across iterations

**Why it happens:** Only logging current state, not referencing previous verification attempts

**How to avoid:**
- Check for previous VERIFICATION.md before starting (gsd-verifier Step 0)
- Log `mode: 're-verification'` in verification start event
- Include `previous_status` and `previous_gaps_count` context
- Log gaps_closed and regressions in re-verification

**Warning signs:** Audit trail shows multiple "gaps_found" statuses but can't tell if gaps are being fixed or accumulating

### Pitfall 4: Artifact Status Without Issue Details

**What goes wrong:** Artifact check logs show `status: 'stub'` but don't explain what made it a stub, forcing manual file inspection

**Example:**
```javascript
// BAD - status without explanation
logger.debug('Artifact check: src/components/Chat.tsx', {
  status: 'stub'
  // Missing: what specifically made this a stub?
});

// GOOD - status with issue details
logger.debug('Artifact check: src/components/Chat.tsx', {
  exists: true,
  substantive: false,
  wired: true,
  status: 'stub',
  issue: 'Too short (8 lines, minimum 15) and contains TODO comments'
});
```

**Why it happens:** Logging status without logging the evidence that led to that status

**How to avoid:** Always include `issue` field when status is not 'verified', with specific details (line count, stub patterns found, missing imports)

**Warning signs:** Developers need to read files manually to understand why verification failed, despite having "verification failed" logs

### Pitfall 5: Missing Correlation Between Artifact Checks and Gap Detection

**What goes wrong:** Gap logs reference artifacts but there's no way to correlate gap with specific artifact check results

**Why it happens:** Not including consistent artifact paths in both artifact check and gap detection logs

**How to avoid:**
- Use consistent `path` field in artifact checks: `path: 'src/components/Chat.tsx'`
- Use same path format in gaps: `artifacts_affected: ['src/components/Chat.tsx']`
- Always include `agent_id` for session-level correlation
- Use structured context, not string interpolation, for queryability

**Warning signs:** Can see "Chat.tsx failed" in gap logs but can't find corresponding artifact check log to see why

## Code Examples

Verified patterns from gsd-verifier.md logging specifications and structured logging best practices:

### Verification Start Logging

```javascript
// Source: gsd-verifier.md <logging> section "Verification Start"
// Context: Orchestrator begins verification after loading context

const plans = glob.sync(`${phaseDir}/*-PLAN.md`);
const mustHaves = derivedOrLoadedFromPlanFrontmatter();
const previousVerification = fs.existsSync(`${phaseDir}/*-VERIFICATION.md`)
  ? parseVerificationFrontmatter()
  : null;
const isReVerification = previousVerification?.gaps?.length > 0;

logger.info('Verification start', {
  agent_id: agentId,
  phase: phaseId,
  plans_count: plans.length,
  must_haves_count: mustHaves.truths.length + mustHaves.artifacts.length + mustHaves.key_links.length,
  mode: isReVerification ? 're-verification' : 'initial',
  // Re-verification context (if applicable)
  previous_status: isReVerification ? previousVerification.status : undefined,
  previous_gaps_count: isReVerification ? previousVerification.gaps.length : 0
});
```

### Artifact Check Logging (Three Levels)

```javascript
// Source: gsd-verifier.md Step 4 "Verify Artifacts (Three Levels)"
// Context: Checking artifact src/components/Chat.tsx

const artifactPath = 'src/components/Chat.tsx';

// Level 1: Existence
const exists = fs.existsSync(artifactPath);
if (!exists) {
  logger.debug(`Artifact check: ${artifactPath}`, {
    agent_id: agentId,
    path: artifactPath,
    exists: false,
    substantive: null,
    wired: null,
    status: 'missing',
    issue: 'File does not exist at expected path'
  });
  return { status: 'missing' };
}

// Level 2: Substantive (adequate length, no stubs, has exports)
const content = fs.readFileSync(artifactPath, 'utf8');
const lines = content.split('\n').length;
const stubPatterns = content.match(/TODO|FIXME|placeholder|not implemented/gi);
const hasExports = /^export (default |)(function|const|class)/m.test(content);
const substantive = lines >= 15 && !stubPatterns && hasExports;

if (!substantive) {
  logger.debug(`Artifact check: ${artifactPath}`, {
    agent_id: agentId,
    path: artifactPath,
    exists: true,
    substantive: false,
    wired: null,  // Don't check wiring if not substantive
    status: 'stub',
    issue: stubPatterns
      ? `Contains stub patterns: ${stubPatterns.join(', ')}`
      : `Too short (${lines} lines, minimum 15) or missing exports`
  });
  return { status: 'stub' };
}

// Level 3: Wiring (imported and used)
const componentName = path.basename(artifactPath, path.extname(artifactPath));
const imports = execSync(`grep -r "import.*${componentName}" src/ --include="*.tsx" --include="*.ts"`, {
  encoding: 'utf8',
  stdio: 'pipe'
}).split('\n').filter(line => line && !line.includes(artifactPath));
const wired = imports.length > 0;

const status = wired ? 'verified' : 'orphaned';
const issue = wired ? null : 'Component exists with real implementation but not imported anywhere';

logger.debug(`Artifact check: ${artifactPath}`, {
  agent_id: agentId,
  path: artifactPath,
  exists: true,
  substantive: true,
  wired: wired,
  status: status,
  issue: issue
});

return { status, wired, imports: imports.length };
```

### Key Link Verification Logging

```javascript
// Source: gsd-verifier.md Step 5 "Verify Key Links (Wiring)"
// Context: Checking component → API link

const componentPath = 'src/components/Chat.tsx';
const apiPath = '/api/chat';
const content = fs.readFileSync(componentPath, 'utf8');

// Check for fetch/axios call
const hasFetchCall = /fetch\(['"]\s*\/api\/chat|axios\.(get|post)\s*\(\s*['"]\/api\/chat/m.test(content);

let status, details;
if (!hasFetchCall) {
  status = 'not_wired';
  details = 'No fetch or axios call to /api/chat found in component';
} else {
  // Check if response is used (await, .then, setState)
  const usesResponse = /await.*fetch|\.then\(|setMessages|setData/.test(content);
  if (usesResponse) {
    status = 'wired';
    details = 'Found fetch call with response handling (await/then/setState)';
  } else {
    status = 'partial';
    details = 'Fetch call exists but response not used (no await, .then, or setState)';
  }
}

logger.debug(`Key link check: ${path.basename(componentPath)} -> ${apiPath}`, {
  agent_id: agentId,
  from: componentPath,
  to: apiPath,
  via: 'fetch in useEffect',
  status: status,
  details: details
});
```

### Gap Detection Logging

```javascript
// Source: gsd-verifier.md Step 6 "Gap Detection" and Step 10 "Structure Gap Output"
// Context: Truth "User can see existing messages" failed verification

const truth = 'User can see existing messages';
const supportingArtifacts = [
  { path: 'src/components/Chat.tsx', status: 'orphaned', issue: 'No useEffect with fetch call' }
];

// Determine gap details
const gap = {
  truth: truth,
  status: 'failed',
  reason: 'Chat component exists but does not fetch messages from API',
  artifacts: supportingArtifacts.map(a => ({
    path: a.path,
    issue: a.issue
  })),
  missing: [
    'API call in useEffect to /api/chat',
    'State for storing fetched messages (useState)',
    'Render messages array in JSX (map over messages)'
  ]
};

// Log at INFO level (must be visible at default log level)
logger.info(`Gap detected: ${gap.truth}`, {
  agent_id: agentId,
  truth: gap.truth,
  status: gap.status,
  reason: gap.reason,
  artifacts_affected: gap.artifacts.map(a => a.path),
  missing_items: gap.missing
});

// Also write to gaps array for VERIFICATION.md frontmatter
gaps.push(gap);
```

### Verification Outcome Logging

```javascript
// Source: gsd-verifier.md Step 9 "Determine Overall Status"
// Context: All verification checks complete, determine final status

const verifiedTruths = truths.filter(t => t.status === 'verified');
const totalTruths = truths.length;
const score = `${verifiedTruths.length}/${totalTruths} truths verified`;

let status;
if (verifiedTruths.length === totalTruths && gaps.length === 0) {
  status = 'passed';
} else if (gaps.length > 0) {
  status = 'gaps_found';
} else {
  status = 'human_needed';
}

logger.info(`Verification outcome: ${status}`, {
  agent_id: agentId,
  status: status,
  score: score,
  gaps: gaps.map(g => ({
    truth: g.truth,
    reason: g.reason,
    missing_count: g.missing.length
  })),
  human_verification_needed: humanVerificationItems.length > 0,
  human_items_count: humanVerificationItems.length
});
```

### Agent Spawn and Completion Logging

```javascript
// Source: gsd-verifier.md <logging> section "Agent Spawn" and "Agent Completion"
// Context: Orchestrator lifecycle events for gsd-verifier agent

// SPAWN: Before creating agent task
const mustHaves = loadOrDeriveMustHaves();
const agentId = generateAgentId();
const spawnTime = Date.now();

logger.info('Agent spawn: gsd-verifier', {
  agent_id: agentId,
  agent_type: 'gsd-verifier',
  phase: phaseId,
  is_re_verification: isReVerification,
  must_haves_count: mustHaves.truths.length + mustHaves.artifacts.length + mustHaves.key_links.length,
  truths_count: mustHaves.truths.length,
  artifacts_count: mustHaves.artifacts.length,
  key_links_count: mustHaves.key_links.length
});

// ... agent execution via Task() ...

// COMPLETION: After agent finishes
const completionTime = Date.now();
const duration = completionTime - spawnTime;

logger.info('Agent completion: gsd-verifier', {
  agent_id: agentId,
  outcome: 'success',  // Verification completed (regardless of pass/fail)
  duration_ms: duration,
  status: verificationResult.status,  // 'passed' | 'gaps_found' | 'human_needed'
  score: `${verifiedTruths.length}/${totalTruths}`,
  truths_verified: verifiedTruths.length,
  truths_total: totalTruths,
  gaps_count: gaps.length
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Post-hoc verification reports | Real-time verification logging | 2026 logging evolution | Enables audit trail reconstruction and gap analysis during verification |
| Pass/fail binary status | Multi-level artifact checks (exists/substantive/wired) | gsd-verifier design | Granular diagnosis of why verification failed |
| Manual gap analysis | Structured gap logging with missing_items | Phase 4 design | Enables automated gap closure via `/gsd:plan-phase --gaps` |
| Single verification run | Re-verification mode with iteration tracking | gsd-verifier Step 0 | Track progress across gap closure iterations |
| String-only log messages | Structured context objects | 2020s logging evolution | Enables log querying and audit compliance |

**Deprecated/outdated:**
- **Binary pass/fail logging:** No longer sufficient — need three-level artifact checks with specific failure reasons
- **Ad-hoc verification logging:** Replaced by standardized logging specifications in agent markdown
- **Manual log correlation:** Replaced by session_id and agent_id correlation metadata

## Open Questions

No significant unresolved questions. The logging specifications are complete in gsd-verifier.md (Phase 3-01), and the verification logic is well-established. This phase is straightforward implementation.

## Sources

### Primary (HIGH confidence)
- GSD codebase: agents/gsd-verifier.md `<logging>` section (Phase 3-01)
- GSD codebase: agents/gsd-verifier.md `<verification_process>` steps 0-10
- GSD codebase: get-shit-done/references/verification-patterns.md
- GSD logging infrastructure: lib/logger.js, lib/logger-config.js (Phase 1-2)
- .planning/PROJECT.md requirements: VERIFY-01 through VERIFY-05

### Secondary (MEDIUM confidence)
- [Audit Trail Requirements: Guidelines for Compliance and Best Practices | Inscope](https://www.inscopehq.com/post/audit-trail-requirements-guidelines-for-compliance-and-best-practices)
- [What Is an Audit Trail? Everything You Need to Know | AuditBoard](https://auditboard.com/blog/what-is-an-audit-trail)
- [Audit Logging: A Comprehensive Guide | Splunk](https://www.splunk.com/en_us/blog/learn/audit-logs.html)
- [Logging Best Practices: An Engineer's Checklist | Honeycomb](https://www.honeycomb.io/blog/engineers-checklist-logging-best-practices)
- [Log Management in 2026: Key Components and Best Practices | LogManager](https://logmanager.com/blog/log-management/log-management-best-practices/)

### Tertiary (LOW confidence)
- [Test Artifacts: Meaning, Types, and Best Practices | testRigor](https://testrigor.com/blog/test-artifacts/) - General testing artifact patterns
- [Verification and Validation in Software Testing | BrowserStack](https://www.browserstack.com/guide/verification-and-validation-in-testing) - General V&V concepts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All components already exist (logger, gsd-verifier logic, specifications)
- Architecture: HIGH - Logging specifications complete in gsd-verifier.md, verified patterns established
- Pitfalls: HIGH - Based on structured logging best practices and existing GSD implementation patterns

**Research date:** 2026-01-28
**Valid until:** ~30 days (stable domain — verification patterns and logger API unlikely to change)

**Key constraints from PROJECT.md decisions:**
- Use syslog as primary transport (Initial decision)
- 6 log levels (0-5) following OFF/ERROR/WARN/INFO/DEBUG/TRACE (Initial decision)
- Zero runtime dependencies — Node.js standard library only (Initial decision)
- Singleton logger pattern for consistent session ID (Initial decision)
- Agent spawn and completion logged at INFO level (03-01 decision)
- Hybrid format: prose descriptions with JavaScript code examples (03-01 decision)
- Verification start at INFO with phase info and must-haves count (VERIFY-01 requirement)
- Artifact checks at DEBUG level (level 4+) with exists/substantive/wired status (VERIFY-02 requirement)
- Key link verification results logged with from/to/via details (VERIFY-03 requirement)
- Gap detection logs truth, status, and missing items (VERIFY-04 requirement)
- Overall verification outcome at INFO level with score (VERIFY-05 requirement)
