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
