'use strict';

/**
 * Import Command Tests (#1731)
 *
 * Validates that the /gsd-import command definition and workflow file exist,
 * document --from mode, note --prd as future, include conflict detection,
 * never auto-resolve conflicts, offer plan-checker validation, and handle
 * missing PROJECT.md/REQUIREMENTS.md gracefully.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const COMMAND_FILE = path.join(__dirname, '..', 'commands', 'gsd', 'import.md');
const WORKFLOW_FILE = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'import.md');

// ─── File existence ──────────────────────────────────────────────────────────

describe('/gsd-import — file existence', () => {
  test('command definition file exists', () => {
    assert.ok(
      fs.existsSync(COMMAND_FILE),
      'commands/gsd/import.md must exist'
    );
  });

  test('workflow file exists', () => {
    assert.ok(
      fs.existsSync(WORKFLOW_FILE),
      'get-shit-done/workflows/import.md must exist'
    );
  });
});

// ─── Command definition ─────────────────────────────────────────────────────

describe('/gsd-import — command definition', () => {
  const content = fs.readFileSync(COMMAND_FILE, 'utf-8');

  test('has valid YAML frontmatter with name field', () => {
    assert.match(content, /^---\n/, 'must start with YAML frontmatter');
    assert.ok(
      content.includes('name: gsd:import'),
      'frontmatter must include name: gsd:import'
    );
  });

  test('has description field', () => {
    assert.ok(
      content.includes('description:'),
      'frontmatter must include a description field'
    );
  });

  test('references the workflow file in execution_context', () => {
    assert.ok(
      content.includes('workflows/import.md'),
      'command must reference the import workflow file'
    );
  });

  test('documents --from mode', () => {
    assert.ok(
      content.includes('--from'),
      'command must document the --from mode'
    );
  });

  test('documents --prd as future mode', () => {
    assert.ok(
      content.includes('--prd'),
      'command must document the --prd mode'
    );
    assert.ok(
      content.includes('future') || content.includes('follow-up') || content.includes('coming soon'),
      'command must indicate --prd is not yet available'
    );
  });
});

// ─── Workflow — mode handling ────────────────────────────────────────────────

describe('/gsd-import workflow — mode handling', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');

  test('workflow documents --from mode processing', () => {
    assert.ok(
      content.includes('--from'),
      'workflow must document --from mode'
    );
  });

  test('workflow shows --prd as future/coming soon', () => {
    assert.ok(
      content.includes('--prd'),
      'workflow must mention --prd mode'
    );
    assert.ok(
      content.includes('future release') || content.includes('coming soon'),
      'workflow must indicate --prd is deferred to a future release'
    );
  });
});

// ─── Workflow — conflict detection ───────────────────────────────────────────

describe('/gsd-import workflow — conflict detection', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');

  test('workflow includes a conflict detection section', () => {
    const hasConflictSection =
      content.includes('Conflict Detection') ||
      content.includes('detect_conflicts') ||
      content.includes('conflict detection');
    assert.ok(
      hasConflictSection,
      'workflow must include a conflict detection section'
    );
  });

  test('workflow checks against PROJECT.md', () => {
    assert.ok(
      content.includes('PROJECT.md'),
      'workflow must check conflicts against PROJECT.md'
    );
  });

  test('workflow checks against REQUIREMENTS.md', () => {
    assert.ok(
      content.includes('REQUIREMENTS.md'),
      'workflow must check conflicts against REQUIREMENTS.md'
    );
  });

  test('conflicts are never auto-resolved — user confirmation required', () => {
    const hasNoAutoResolve =
      content.includes('Never auto-resolve') ||
      content.includes('never auto-resolve') ||
      content.includes('Never auto-resolve conflicts');
    assert.ok(
      hasNoAutoResolve,
      'workflow must explicitly state that conflicts are never auto-resolved'
    );

    const hasUserChoice =
      content.includes('Keep existing') ||
      content.includes('Accept external') ||
      content.includes('user to choose') ||
      content.includes('user to resolve');
    assert.ok(
      hasUserChoice,
      'workflow must present resolution options to the user'
    );
  });

  test('conflict table includes resolution column', () => {
    assert.ok(
      content.includes('Resolution Needed') || content.includes('resolution'),
      'conflict table must include a resolution column or mention resolution'
    );
  });
});

// ─── Workflow — missing project artifacts ────────────────────────────────────

describe('/gsd-import workflow — missing project artifacts', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');

  test('documents behavior when PROJECT.md does not exist', () => {
    const handlesMissing =
      (content.includes('No existing PROJECT.md') || content.includes('none of these files exist')) &&
      (content.includes('initial plan') || content.includes('no prior decisions'));
    assert.ok(
      handlesMissing,
      'workflow must document graceful handling when PROJECT.md does not exist'
    );
  });

  test('skips conflict detection when no prior artifacts exist', () => {
    const skipsConflicts =
      content.includes('No conflict detection needed') ||
      content.includes('skip conflict detection') ||
      content.includes('Skip this step');
    assert.ok(
      skipsConflicts,
      'workflow must skip conflict detection when no prior project artifacts exist'
    );
  });
});

// ─── Workflow — plan-checker validation ──────────────────────────────────────

describe('/gsd-import workflow — plan-checker validation', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');

  test('offers plan-checker validation', () => {
    assert.ok(
      content.includes('plan-checker'),
      'workflow must offer plan-checker validation'
    );
  });

  test('validation is optional (user can decline)', () => {
    const isOptional =
      content.includes('[Y/n]') ||
      content.includes('user declines') ||
      content.includes('skip validation') ||
      content.includes('Skipping');
    assert.ok(
      isOptional,
      'plan-checker validation must be optional — user can decline'
    );
  });

  test('lists gsd-plan-checker in available_agent_types', () => {
    assert.ok(
      content.includes('gsd-plan-checker'),
      'workflow must list gsd-plan-checker in available_agent_types'
    );
  });
});

// ─── Workflow — path validation is unconditional ───────────────────────────

describe('/gsd-import workflow — unconditional path validation', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');

  test('calls validatePath unconditionally (not advisory)', () => {
    // Must NOT contain the old conditional phrasing
    assert.ok(
      !content.includes('if available'),
      'workflow must not make validatePath conditional with "if available"'
    );
    // Must contain unconditional validatePath call
    assert.ok(
      content.includes('validatePath'),
      'workflow must call validatePath'
    );
  });

  test('path validation is marked as mandatory', () => {
    const hasMandatory =
      content.includes('mandatory') || content.includes('MANDATORY');
    assert.ok(
      hasMandatory,
      'workflow must describe path validation as mandatory'
    );
  });

  test('aborts if validation fails before any file operations', () => {
    const hasAbort =
      content.includes('abort immediately') ||
      content.includes('do not proceed');
    assert.ok(
      hasAbort,
      'workflow must abort if path validation fails'
    );
  });

  test('validatePath runs before file existence check', () => {
    const validateIdx = content.indexOf('validatePath');
    const existenceIdx = content.indexOf('! -f');
    assert.ok(
      validateIdx > -1 && existenceIdx > -1 && validateIdx < existenceIdx,
      'validatePath must appear before the file existence check'
    );
  });
});

// ─── Workflow — conflict resolution writes durable artifacts ───────────────

describe('/gsd-import workflow — conflict resolution durability', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');

  test('Accept external resolution writes back to artifacts', () => {
    // The workflow must instruct writing "Accept external" resolutions to artifacts
    const hasWriteBack =
      content.includes('Accept external') &&
      (content.includes('overwrite the conflicting section') ||
       content.includes('write') || content.includes('update'));
    assert.ok(
      hasWriteBack,
      'Accept external resolutions must write back to durable artifacts'
    );
  });

  test('Merge both resolution writes back to artifacts', () => {
    const hasMergeWrite =
      content.includes('Merge both') &&
      (content.includes('write the merged content') ||
       content.includes('replacing the old section'));
    assert.ok(
      hasMergeWrite,
      'Merge both resolutions must write merged content to artifacts'
    );
  });

  test('resolutions are persisted not just conversational', () => {
    assert.ok(
      content.includes('persisted') || content.includes('durable artifacts'),
      'workflow must ensure conflict resolutions are persisted, not just conversational'
    );
  });

  test('reports artifact updates after resolution', () => {
    const hasReport =
      content.includes('Updated .planning/PROJECT.md') ||
      content.includes('Updated .planning/REQUIREMENTS.md') ||
      content.includes('Report each artifact update');
    assert.ok(
      hasReport,
      'workflow must report which artifacts were updated after conflict resolution'
    );
  });
});

// ─── Command — allowed-tools matches subagent pattern ──────────────────────

describe('/gsd-import command — allowed-tools', () => {
  const content = fs.readFileSync(COMMAND_FILE, 'utf-8');

  test('allowed-tools lists Task for subagent spawning (not Agent)', () => {
    // Extract the frontmatter section
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatterMatch, 'must have YAML frontmatter');
    const frontmatter = frontmatterMatch[1];

    assert.ok(
      frontmatter.includes('Task'),
      'allowed-tools must include Task for subagent spawning'
    );
    assert.ok(
      !frontmatter.includes('Agent'),
      'allowed-tools must not list Agent — use Task for subagent pattern'
    );
  });
});

// ─── Workflow — output format ────────────────────────────────────────────────

describe('/gsd-import workflow — output format', () => {
  const content = fs.readFileSync(WORKFLOW_FILE, 'utf-8');

  test('generates PLAN.md format output', () => {
    assert.ok(
      content.includes('PLAN.md'),
      'workflow must generate PLAN.md format output'
    );
  });

  test('includes task structure with success_criteria', () => {
    assert.ok(
      content.includes('success_criteria') || content.includes('Success criteria'),
      'workflow must include success_criteria in generated tasks'
    );
  });

  test('includes estimated_complexity field', () => {
    assert.ok(
      content.includes('estimated_complexity') || content.includes('Estimated complexity'),
      'workflow must include estimated_complexity in generated tasks'
    );
  });

  test('includes final import report', () => {
    assert.ok(
      content.includes('Import Complete'),
      'workflow must include a final import summary report'
    );
  });
});
