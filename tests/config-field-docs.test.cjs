/**
 * Verify planning-config.md documents all config fields from source code.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const REFERENCE_PATH = path.join(__dirname, '..', 'get-shit-done', 'references', 'planning-config.md');
const CORE_PATH = path.join(__dirname, '..', 'get-shit-done', 'bin', 'lib', 'core.cjs');

describe('config-field-docs', () => {
  const content = fs.readFileSync(REFERENCE_PATH, 'utf-8');

  test('contains Complete Field Reference section', () => {
    assert.ok(
      content.includes('## Complete Field Reference'),
      'planning-config.md must contain a "Complete Field Reference" heading'
    );
  });

  test('documents at least 15 config fields in tables', () => {
    // Count table rows that start with | `<key>` (field rows, not header/separator)
    const fieldRows = content.match(/^\| `[a-z_][a-z0-9_.]*` \|/gm);
    assert.ok(fieldRows, 'Expected markdown table rows with backtick-quoted keys');
    assert.ok(
      fieldRows.length >= 15,
      `Expected at least 15 documented fields, found ${fieldRows.length}`
    );
  });

  test('contains example configurations', () => {
    assert.ok(
      content.includes('## Example Configurations'),
      'planning-config.md must contain an "Example Configurations" section'
    );
    // Verify at least one JSON code block with a model_profile key
    assert.ok(
      content.includes('"model_profile"'),
      'Example configurations must include model_profile'
    );
  });

  test('contains field interactions section', () => {
    assert.ok(
      content.includes('## Field Interactions'),
      'planning-config.md must contain a "Field Interactions" section'
    );
  });

  test('every CONFIG_DEFAULTS key appears in the doc', () => {
    // Extract CONFIG_DEFAULTS keys from core.cjs source
    const coreSource = fs.readFileSync(CORE_PATH, 'utf-8');
    const defaultsMatch = coreSource.match(
      /const CONFIG_DEFAULTS\s*=\s*\{([\s\S]*?)\n\};/
    );
    assert.ok(defaultsMatch, 'Could not find CONFIG_DEFAULTS in core.cjs');

    const body = defaultsMatch[1];
    // Match property keys (word characters before the colon)
    const keys = [...body.matchAll(/^\s*(\w+)\s*:/gm)].map(m => m[1]);
    assert.ok(keys.length > 0, 'Could not extract any keys from CONFIG_DEFAULTS');

    // CONFIG_DEFAULTS uses flat keys; the doc may use namespaced equivalents.
    // Map flat keys to the namespace forms used in config.json and the doc.
    const NAMESPACE_MAP = {
      research: 'workflow.research',
      plan_checker: 'workflow.plan_check',
      verifier: 'workflow.verifier',
      nyquist_validation: 'workflow.nyquist_validation',
      text_mode: 'workflow.text_mode',
      subagent_timeout: 'workflow.subagent_timeout',
      branching_strategy: 'git.branching_strategy',
      phase_branch_template: 'git.phase_branch_template',
      milestone_branch_template: 'git.milestone_branch_template',
      quick_branch_template: 'git.quick_branch_template',
    };

    const missing = keys.filter(k => {
      // Check both bare key and namespaced form
      if (content.includes(`\`${k}\``)) return false;
      const ns = NAMESPACE_MAP[k];
      if (ns && content.includes(`\`${ns}\``)) return false;
      return true;
    });
    assert.deepStrictEqual(
      missing,
      [],
      `CONFIG_DEFAULTS keys missing from planning-config.md: ${missing.join(', ')}`
    );
  });

  test('documents workflow namespace fields', () => {
    const workflowFields = [
      'workflow.research',
      'workflow.plan_check',
      'workflow.verifier',
      'workflow.nyquist_validation',
      'workflow.use_worktrees',
      'workflow.subagent_timeout',
      'workflow.text_mode',
    ];
    const missing = workflowFields.filter(f => !content.includes(`\`${f}\``));
    assert.deepStrictEqual(
      missing,
      [],
      `Workflow fields missing from planning-config.md: ${missing.join(', ')}`
    );
  });

  test('documents git namespace fields', () => {
    const gitFields = [
      'git.branching_strategy',
      'git.base_branch',
      'git.phase_branch_template',
      'git.milestone_branch_template',
    ];
    const missing = gitFields.filter(f => !content.includes(`\`${f}\``));
    assert.deepStrictEqual(
      missing,
      [],
      `Git fields missing from planning-config.md: ${missing.join(', ')}`
    );
  });
});
