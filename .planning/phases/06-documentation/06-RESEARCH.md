# Phase 6: Documentation - Research

**Researched:** 2026-01-29
**Domain:** Technical documentation for logging systems, developer reference guides, troubleshooting documentation
**Confidence:** HIGH

## Summary

This phase creates user-facing documentation for GSD's logging system implemented in Phases 1-5. The research confirms that documentation for logging systems follows established patterns: reference guides explaining concepts and configuration, integration with existing documentation systems (like `/gsd:settings`), troubleshooting guides with symptom-diagnosis-solution structure, and CHANGELOG entries following semantic versioning conventions.

The GSD codebase already has strong documentation patterns established: references/ directory for comprehensive guides (model-profiles.md, planning-config.md), command markdown files with YAML frontmatter and structured sections, workflow orchestrator documentation with logging specifications, and CHANGELOG following Keep a Changelog format. The logging implementation (Phases 1-5) is complete with lib/logger.js, lib/logger-config.js, lib/logger-syslog.js, lib/logger-metrics.js providing the foundation, and hooks/gsd-log-init.js for session initialization.

Key insight: GSD already uses a hybrid documentation approach throughout - combining prose explanation with concrete code examples, structured sections with clear boundaries, and XML-style tags for semantic markup. The logging documentation should follow these same patterns for consistency.

**Primary recommendation:** Follow GSD's existing documentation patterns - hybrid prose/code style, XML-tagged sections for structure, concrete examples over abstract explanation, and integration with existing commands rather than standalone documentation.

## Standard Stack

The established libraries/tools for this domain:

### Core Documentation Infrastructure (Already in GSD)

| Component | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| Markdown | `*.md` files | Primary documentation format | Universal, version-controllable, human-readable |
| YAML frontmatter | Command files | Metadata and structure | Parseable by orchestrators, clean separation |
| XML-style tags | Templates, references | Semantic sections | Clear boundaries, agent-parseable |
| Keep a Changelog | CHANGELOG.md | Version history format | Industry standard, semantic versioning compatible |

### Supporting Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| journalctl | View syslog logs | Standard Linux log viewer for systemd |
| syslog | Log storage | Universal Unix logging mechanism |
| grep/jq | Log filtering | Query and filter structured logs |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown | ReStructuredText, AsciiDoc | Markdown is GSD's established format, changing would be inconsistent |
| Keep a Changelog | Custom format | Keep a Changelog is industry standard, already in use |
| journalctl examples | Generic syslog commands | journalctl is systemd-specific but covers 95%+ of Linux systems |

**Installation:**
```bash
# No installation needed - documentation uses existing Markdown infrastructure
# journalctl is pre-installed on systemd-based Linux distributions
```

## Architecture Patterns

### Recommended Documentation Structure

```
get-shit-done/
├── references/
│   └── logging.md              # New comprehensive reference guide
├── commands/gsd/
│   └── settings.md             # Update existing file with logging section
├── CHANGELOG.md                # Add logging feature entry
└── README.md                   # (Optional) Brief mention in features
```

### Pattern 1: Hybrid Prose + Code Documentation

**What:** Combine explanatory prose with concrete, executable examples
**When to use:** Reference guides, how-to sections, configuration documentation
**Example:**

From existing GSD references/model-profiles.md:
```markdown
## Switching Profiles

Runtime: `/gsd:set-profile <profile>`

Per-project default: Set in `.planning/config.json`:
```json
{
  "model_profile": "balanced"
}
```

**Design Rationale**

**Why Opus for gsd-planner?**
Planning involves architecture decisions...
```

### Pattern 2: Quick Start + Deep Reference

**What:** Start with common use cases (80% of users), then provide comprehensive reference for edge cases
**When to use:** Feature documentation where most users need basic usage but some need full control

From context: User specified "Hybrid approach: Quick start tutorial + comprehensive reference sections"

**Structure:**
```markdown
# Feature Name

## Quick Start
[3-5 common use cases with minimal explanation]

## Configuration
[Full reference of all options]

## Advanced Usage
[Edge cases, troubleshooting, internals]
```

### Pattern 3: Structured Troubleshooting

**What:** Symptom → Diagnosis → Solution format with concrete examples
**When to use:** Troubleshooting guides, FAQ sections

Based on web research (Daily.dev, Write the Docs):
```markdown
### Issue: [Symptom user sees]

**What you'll see:**
- Specific error message or behavior

**Diagnosis:**
```bash
# Command to check
journalctl --user -u gsd -n 50
```

**Solution:**
[Step-by-step fix with commands]
```

### Pattern 4: CHANGELOG Integration

**What:** Follow Keep a Changelog format with semantic categorization
**When to use:** Adding new features to CHANGELOG.md

From existing GSD CHANGELOG.md:
```markdown
## [Unreleased]

### Added
- **Feature Name** — Brief description of what it does
  - Sub-bullet for implementation details if needed
  - Sub-bullet for usage examples

### Changed
- What changed and why

### Fixed
- What was broken and how it's fixed now
```

### Anti-Patterns to Avoid

- **Assuming Linux expertise:** Users may not know syslog/journalctl basics - explain the fundamentals first (from context)
- **Abstract examples:** Avoid "run command X" without showing actual command with expected output
- **Separate troubleshooting doc:** Don't create standalone guide - integrate into reference or as subsection (context allows Claude discretion)
- **Configuration-only docs:** Don't just list config options - explain when/why to use each level
- **Skip the "why":** Logging levels exist for a reason - explain the philosophy behind each level choice

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log viewing examples | Custom log parser | journalctl with filters | Standard tool, well-documented, handles JSON output |
| Documentation site | Static site generator | Markdown in repo | GSD is CLI tool, docs live with code |
| Configuration examples | Abstract descriptions | Actual JSON snippets | Users copy-paste, reduces errors |
| Troubleshooting flowchart | Complex diagram | Structured text with commands | Copy-pasteable, accessible, version-controllable |

**Key insight:** GSD documentation is consumed by AI agents and humans - prefer structured text over rich media for both audiences.

## Common Pitfalls

### Pitfall 1: Assuming Journalctl Knowledge

**What goes wrong:** Users don't know how to view logs, documentation says "check journalctl" without examples
**Why it happens:** Documentation writers assume Unix admin knowledge
**How to avoid:** Include journalctl primer section with basic viewing patterns before GSD-specific content (per context)
**Warning signs:** User questions like "how do I see the logs?" after reading docs

### Pitfall 2: Configuration Without Context

**What goes wrong:** Listing all config options without explaining when/why to use them
**Why it happens:** Reference-first approach without use-case guidance
**How to avoid:** Start with common scenarios (debugging failed phase, performance monitoring) then show config for each
**Warning signs:** Users set DEBUG level globally because docs don't explain INFO is sufficient for most cases

### Pitfall 3: Incomplete Troubleshooting

**What goes wrong:** Troubleshooting guide covers happy path, omits edge cases and diagnostic commands
**Why it happens:** Writer documents what they remember, not systematic coverage
**How to avoid:** Use symptom-diagnosis-solution structure, include actual log output examples (per context and web research)
**Warning signs:** GitHub issues asking "how do I debug X" where X should be in troubleshooting guide

### Pitfall 4: Stale Examples

**What goes wrong:** Documentation shows old config format or deprecated commands
**Why it happens:** Code changes, docs don't update
**How to avoid:** Examples should reference actual implementation code (lib/logger-config.js DEFAULTS), use relative paths
**Warning signs:** Users report "config doesn't work as documented"

### Pitfall 5: Settings Integration Inconsistency

**What goes wrong:** Logging settings shown differently than other settings in `/gsd:settings` output
**Why it happens:** New feature added without studying existing patterns
**How to avoid:** Read commands/gsd/settings.md structure, match table format and explanation style
**Warning signs:** Settings output looks fragmented or inconsistent

## Code Examples

Verified patterns from GSD implementation:

### Configuration Loading (from lib/logger-config.js)

```javascript
// Config precedence: env > project > global > defaults
// Environment variables
GSD_LOG_LEVEL=4  # DEBUG level

// Project config (.planning/config.json)
{
  "logging": {
    "level": "debug",
    "syslog": {
      "enabled": true,
      "facility": "LOCAL0"
    }
  }
}

// Global config (~/.claude/gsd-config.json)
{
  "logging": {
    "level": "info",
    "syslog": { "enabled": true }
  }
}
```

### Log Levels (from lib/logger-config.js)

```javascript
const LEVELS = {
  OFF: 0,     // No logging
  ERROR: 1,   // Critical failures only
  WARN: 2,    // Recoverable issues
  INFO: 3,    // Workflow milestones (default)
  DEBUG: 4,   // Detailed operations
  TRACE: 5    // Complete transparency
};
```

### Viewing Logs with journalctl

```bash
# View all GSD logs from current session
journalctl --user -t gsd -f

# View last 50 GSD entries
journalctl --user -t gsd -n 50

# Filter by priority (ERR, WARNING, INFO)
journalctl --user -t gsd -p info

# View logs for specific phase
journalctl --user -t gsd | grep "phase=05"

# JSON output for parsing
journalctl --user -t gsd -o json | jq '.MESSAGE'
```

### Settings Output Format (from commands/gsd/settings.md)

```
| Setting              | Value |
|----------------------|-------|
| Model Profile        | balanced |
| Plan Researcher      | On |
```

Pattern: Table with setting name and current value, followed by explanatory text.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| README-only docs | Structured references/ directory | GSD evolution | Better organization, agent-parseable |
| Manual log viewing | journalctl structured logs | systemd adoption (~2015) | Standard querying, JSON support |
| CHANGELOG in git log | Keep a Changelog format | Industry shift (~2014) | Human-readable, tool-friendly |
| Separate troubleshooting doc | Integrated in reference | Modern best practice (2024-2026) | Single source, contextual help |

**Deprecated/outdated:**
- Separate troubleshooting documents: Modern approach integrates troubleshooting into feature docs (from web research: Daily.dev 2026)
- Abstract configuration examples: Current best practice uses concrete, copy-pasteable snippets (from web research: Write the Docs 2026)

## Open Questions

Things that couldn't be fully resolved:

1. **Troubleshooting guide location**
   - What we know: Context allows Claude discretion on "inline vs dedicated vs integrated"
   - What's unclear: Best placement for GSD's structure - subsection in logging.md vs standalone references/troubleshooting-logging.md
   - Recommendation: Start as subsection in logging.md (single source), extract if it grows beyond ~200 lines

2. **CHANGELOG entry detail level**
   - What we know: Keep a Changelog format, semantic versioning categories (Added/Changed/Fixed)
   - What's unclear: How verbose to be - list all 6 levels, or summarize "debug logging system"?
   - Recommendation: High-level feature bullet with 2-3 sub-bullets for key capabilities (follows existing pattern from CHANGELOG.md line 96-105)

3. **Settings display format**
   - What we know: Context allows Claude discretion on "read-only vs interactive vs hybrid"
   - What's unclear: Current `/gsd:settings` is interactive (AskUserQuestion), logging may be read-only inspection
   - Recommendation: Extend existing interactive settings with logging section, show current level + allow changing it inline with other settings

## Sources

### Primary (HIGH confidence)
- GSD codebase analysis (lib/logger*.js, commands/gsd/settings.md, references/*.md, CHANGELOG.md)
- Keep a Changelog format specification - https://keepachangelog.com/en/1.1.0/
- journalctl manual - freedesktop.org systemd documentation
- Existing GSD documentation patterns (verified via Read tool)

### Secondary (MEDIUM confidence)
- [Daily.dev: Developer Troubleshooting Docs Best Practices](https://daily.dev/blog/developer-troubleshooting-docs-best-practices) - Troubleshooting structure guidance (2026)
- [Write the Docs: Software Documentation Guide](https://www.writethedocs.org/guide/index.html) - Documentation types and organization
- [Document360: Write Developer Documentation](https://document360.com/blog/write-developer-documentation/) - Best practices for dev docs (2026)
- [DigitalOcean: How To Use journalctl](https://www.digitalocean.com/community/tutorials/how-to-use-journalctl-to-view-and-manipulate-systemd-logs) - journalctl usage patterns (2025)
- [Better Stack: Log Management with Journalctl](https://betterstack.com/community/guides/logging/how-to-control-journald-with-journalctl/) - SysAdmin's guide (2025)
- [Dash0: Managing Systemd Logs](https://www.dash0.com/guides/systemd-logs-linux-journalctl) - Production-ready practices (2026)

### Tertiary (LOW confidence)
- None - all findings verified against GSD codebase or authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - GSD patterns established, journalctl is standard Linux tool
- Architecture: HIGH - Patterns verified in existing GSD codebase (references/, commands/, CHANGELOG.md)
- Pitfalls: HIGH - Common documentation issues well-documented in web research, validated by examining existing GSD docs

**Research date:** 2026-01-29
**Valid until:** 90 days (documentation best practices stable, GSD patterns established)
