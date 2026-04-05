/**
 * Tests for verification overrides reference document (#1747)
 *
 * Verifies that the verification-overrides.md reference exists, documents
 * the YAML frontmatter override format, and is referenced by gsd-verifier.md.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

describe('verification overrides reference (#1747)', () => {

  // ── Reference document ────────────────────────────────────────────────────

  describe('get-shit-done/references/verification-overrides.md', () => {
    const refPath = path.join(ROOT, 'get-shit-done', 'references', 'verification-overrides.md');
    let content;

    test('file exists', () => {
      assert.ok(fs.existsSync(refPath), 'verification-overrides.md should exist');
      content = fs.readFileSync(refPath, 'utf-8');
    });

    test('contains Override Format section', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('## Override Format'),
        'should contain an "Override Format" section'
      );
    });

    test('contains Matching Rules section', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('## Matching Rules'),
        'should contain a "Matching Rules" section'
      );
    });

    test('contains Verifier Behavior section', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('## Verifier Behavior'),
        'should contain a "Verifier Behavior" section'
      );
    });

    test('documents YAML frontmatter overrides block', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('overrides:') && content.includes('must_have:') && content.includes('reason:'),
        'should document the YAML frontmatter format with overrides, must_have, and reason fields'
      );
    });

    test('documents accepted_by field', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('accepted_by'),
        'should document the accepted_by field'
      );
    });

    test('accepted_by is required (not optional)', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      // The fields table should show accepted_by as required
      assert.ok(
        content.includes('`accepted_by` | Yes'),
        'accepted_by should be marked as required in the fields table'
      );
    });

    test('describes fuzzy matching behavior', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('fuzzy matching') || content.includes('fuzzy-match'),
        'should describe fuzzy matching for pairing overrides with criteria'
      );
    });

    test('describes case-insensitive matching', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.toLowerCase().includes('case-insensitive'),
        'should describe case-insensitive matching'
      );
    });

    test('describes 80% word overlap matching', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('80%'),
        'should describe 80% word overlap matching threshold'
      );
    });

    test('documents PASSED (override) status', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('PASSED (override)'),
        'should document the PASSED (override) status marker'
      );
    });

    test('includes example VERIFICATION.md', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('## Example VERIFICATION.md'),
        'should include an example VERIFICATION.md section'
      );
    });

    test('documents When to Use guidance', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('## When to Use'),
        'should contain a "When to Use" section'
      );
    });

    // ── Abuse guardrails (When NOT to Use) ──────────────────────────────────

    test('contains When NOT to Use section', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('## When NOT to Use'),
        'should contain a "When NOT to Use" section with abuse guardrails'
      );
    });

    test('warns against overriding incomplete implementation', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.toLowerCase().includes('incomplete') || content.toLowerCase().includes('unfinished'),
        'should warn against using overrides for incomplete work'
      );
    });

    test('warns about security/correctness overrides needing human review', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('human review'),
        'should flag security/correctness overrides for human review'
      );
    });

    test('warns against bulk overrides nullifying a phase', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.toLowerCase().includes('bulk') || content.toLowerCase().includes('majority'),
        'should warn against bulk overrides that nullify a phase'
      );
    });

    // ── Override lifecycle documentation ─────────────────────────────────────

    test('contains Override Lifecycle section', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('## Override Lifecycle'),
        'should contain an "Override Lifecycle" section'
      );
    });

    test('documents re-verification carryforward', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.toLowerCase().includes('carryforward') || content.toLowerCase().includes('carry forward') || content.toLowerCase().includes('persist'),
        'should document that overrides persist across re-verify runs'
      );
    });

    test('documents milestone surfacing', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('gsd-audit-milestone'),
        'should document that overrides appear in milestone audit reports'
      );
    });

    test('documents overrides_applied frontmatter tracking', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('overrides_applied'),
        'should document the overrides_applied tracking field in VERIFICATION.md frontmatter'
      );
    });
  });

  // ── Verifier agent reference ──────────────────────────────────────────────

  describe('agents/gsd-verifier.md references overrides', () => {
    const verifierPath = path.join(ROOT, 'agents', 'gsd-verifier.md');
    let verifierContent;

    test('gsd-verifier.md exists', () => {
      assert.ok(fs.existsSync(verifierPath), 'gsd-verifier.md should exist');
      verifierContent = fs.readFileSync(verifierPath, 'utf-8');
    });

    test('references verification-overrides.md in required_reading', () => {
      verifierContent = verifierContent || fs.readFileSync(verifierPath, 'utf-8');
      assert.ok(
        verifierContent.includes('verification-overrides.md'),
        'gsd-verifier.md should reference verification-overrides.md'
      );
    });

    test('required_reading block is between </role> and <project_context>', () => {
      verifierContent = verifierContent || fs.readFileSync(verifierPath, 'utf-8');
      const roleEnd = verifierContent.indexOf('</role>');
      const projectCtx = verifierContent.indexOf('<project_context>');
      const reqReading = verifierContent.indexOf('<required_reading>');
      assert.ok(roleEnd > -1, '</role> tag should exist');
      assert.ok(projectCtx > -1, '<project_context> tag should exist');
      assert.ok(reqReading > -1, '<required_reading> tag should exist');
      assert.ok(
        reqReading > roleEnd && reqReading < projectCtx,
        '<required_reading> should appear between </role> and <project_context>'
      );
    });
  });
});
