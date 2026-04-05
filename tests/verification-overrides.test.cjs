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
        content.includes('overrides:') && content.includes('criterion:') && content.includes('reason:'),
        'should document the YAML frontmatter format with overrides, criterion, and reason fields'
      );
    });

    test('documents approved_by field', () => {
      content = content || fs.readFileSync(refPath, 'utf-8');
      assert.ok(
        content.includes('approved_by'),
        'should document the approved_by field'
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
