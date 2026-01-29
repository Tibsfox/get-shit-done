# Verification Logging Patterns

Reusable logging patterns for verification operations. Use these patterns when implementing verification logic in workflows, scripts, or tools.

<core_principle>
**Verification logging serves two audiences:**
1. **Humans debugging:** Need clear, readable log output to understand what passed/failed
2. **Automated systems:** Need structured context fields to query and aggregate results

All patterns include both human-readable messages AND structured context objects.
</core_principle>

<log_levels>
## Log Level Assignments

| Event Type | Level | Rationale |
|------------|-------|-----------|
| Verification start | INFO (3) | Marks workflow milestone |
| Artifact check | DEBUG (4) | Detailed diagnostic, high volume |
| Key link check | DEBUG (4) | Detailed diagnostic, high volume |
| Gap detection | INFO (3) | Must be visible at default level |
| Verification outcome | INFO (3) | Critical workflow status |
| Context pressure | DEBUG (4) at 75%, WARN (2) at 90%+ | Tiered alerts |

**Rule:** Verification outcomes (gaps, pass/fail) at INFO. Individual checks at DEBUG.
</log_levels>

<artifact_verification>
## Three-Level Artifact Verification

Every artifact check follows the exists → substantive → wired hierarchy.

### Level 1: Existence

```javascript
// Pattern: Log existence check result
const exists = fs.existsSync(artifactPath);
if (!exists) {
  logger.debug(`Artifact check: ${artifactPath}`, {
    path: artifactPath,
    exists: false,
    substantive: null,  // Not checked if doesn't exist
    wired: null,        // Not checked if doesn't exist
    status: 'missing',
    issue: 'File does not exist at expected path'
  });
  return { status: 'missing' };
}
```

### Level 2: Substantive

Check that file has real implementation, not placeholder.

```javascript
// Pattern: Log substantive check result
const content = fs.readFileSync(artifactPath, 'utf8');
const lines = content.split('\n').length;
const stubPatterns = content.match(/TODO|FIXME|placeholder|not implemented/gi);
const hasExports = /^export (default |)(function|const|class)/m.test(content);
const substantive = lines >= minLines && !stubPatterns && hasExports;

if (!substantive) {
  logger.debug(`Artifact check: ${artifactPath}`, {
    path: artifactPath,
    exists: true,
    substantive: false,
    wired: null,  // Not checked if not substantive
    status: 'stub',
    issue: stubPatterns
      ? `Contains stub patterns: ${stubPatterns.join(', ')}`
      : `Too short (${lines} lines, minimum ${minLines}) or missing exports`
  });
  return { status: 'stub' };
}
```

### Level 3: Wired

Check that artifact is connected to the system.

```javascript
// Pattern: Log wiring check result
const componentName = path.basename(artifactPath, path.extname(artifactPath));
const imports = execSync(
  `grep -r "import.*${componentName}" src/ --include="*.tsx" --include="*.ts"`,
  { encoding: 'utf8', stdio: 'pipe' }
).split('\n').filter(line => line && !line.includes(artifactPath));
const wired = imports.length > 0;

const status = wired ? 'verified' : 'orphaned';
const issue = wired ? null : 'Artifact exists with real implementation but not imported anywhere';

logger.debug(`Artifact check: ${artifactPath}`, {
  path: artifactPath,
  exists: true,
  substantive: true,
  wired: wired,
  status: status,
  issue: issue
});
```

### Status Summary

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `verified` | Passes all three levels | None |
| `missing` | File doesn't exist | Create file |
| `stub` | Exists but placeholder content | Implement real code |
| `orphaned` | Real code but not used | Wire into system |

</artifact_verification>

<gap_detection>
## Gap Detection Logging

Gaps are logged at INFO level because they drive downstream workflow (plan creation via `/gsd:plan-phase --gaps`).

### Gap Structure

Every gap log includes:
- `truth`: The observable behavior that failed verification
- `status`: 'failed' or 'partial'
- `reason`: Human-readable explanation of why it failed
- `artifacts_affected`: Array of file paths with issues
- `missing_items`: Array of specific things to add/fix (drives task creation)

```javascript
// Pattern: Log detected gap
const gap = {
  truth: 'User can see existing messages',
  status: 'failed',
  reason: 'Chat component exists but does not fetch messages from API',
  artifacts: [
    { path: 'src/components/Chat.tsx', issue: 'No useEffect with fetch call' }
  ],
  missing: [
    'API call in useEffect to /api/chat',
    'State for storing fetched messages (useState)',
    'Render messages array in JSX (map over messages)'
  ]
};

// INFO level - must be visible at default log level
logger.info(`Gap detected: ${gap.truth}`, {
  truth: gap.truth,
  status: gap.status,
  reason: gap.reason,
  artifacts_affected: gap.artifacts.map(a => a.path),
  missing_items: gap.missing
});
```

### Missing Items Format

`missing_items` should be specific enough to drive task creation:

| Too Vague | Specific Enough |
|-----------|-----------------|
| "Fix chat component" | "API call in useEffect to /api/chat" |
| "Add messages" | "State for storing fetched messages (useState)" |
| "Display data" | "Render messages array in JSX (map over messages)" |

**Rule:** Each missing item should become one task action. If you can't imagine the task, it's too vague.

</gap_detection>

<verification_outcome>
## Verification Outcome Logging

Log final verification result at INFO level with complete summary.

### Outcome Structure

```javascript
// Pattern: Log verification outcome
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

### Status Values

| Status | Meaning | Workflow Action |
|--------|---------|-----------------|
| `passed` | All must-haves verified | Proceed to next phase |
| `gaps_found` | Automated checks found issues | Run `/gsd:plan-phase --gaps` |
| `human_needed` | Need human to verify visuals/flows | Present human verification items |

</verification_outcome>

<key_link_verification>
## Key Link Verification Logging

Key links are critical connections between components. If broken, the goal fails even with all artifacts present.

### Link Structure

```javascript
// Pattern: Log key link verification
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
  // Check if response is used
  const usesResponse = /await.*fetch|\.then\(|setMessages|setData/.test(content);
  if (usesResponse) {
    status = 'wired';
    details = 'Found fetch call with response handling';
  } else {
    status = 'partial';
    details = 'Fetch call exists but response not used';
  }
}

// DEBUG level - detailed diagnostic
logger.debug(`Key link check: ${path.basename(componentPath)} -> ${apiPath}`, {
  from: componentPath,
  to: apiPath,
  via: 'fetch in useEffect',
  status: status,
  details: details
});
```

### Link Status Values

| Status | Meaning | Issue |
|--------|---------|-------|
| `wired` | Connection exists and works | None |
| `not_wired` | No connection found | Missing call |
| `partial` | Call exists but incomplete | Response not used |

</key_link_verification>
