/**
 * Few-Shot Calibration Examples Tests
 *
 * Validates that few-shot calibration example files exist and are properly
 * structured for the plan-checker and verifier agents.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = path.join(__dirname, '..', 'get-shit-done', 'references', 'few-shot-examples');
const AGENTS_DIR = path.join(__dirname, '..', 'agents');

// ─── Plan-Checker Examples ──────────────────────────────────────────────────

describe('few-shot: plan-checker examples', () => {
  const filePath = path.join(EXAMPLES_DIR, 'plan-checker.md');

  test('plan-checker.md exists', () => {
    assert.ok(fs.existsSync(filePath), 'plan-checker.md should exist');
  });

  test('has format version at top', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      content.includes('Format version: 1.0'),
      'plan-checker.md should declare format version 1.0'
    );
  });

  test('has exactly 3 examples', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const exampleHeadings = content.match(/^## Example \d+:/gm);
    assert.ok(exampleHeadings, 'should have example headings');
    assert.equal(exampleHeadings.length, 3, 'should have exactly 3 examples');
  });

  test('each example has "Why this is correct" annotation', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const annotations = content.match(/\*\*Why this is correct:\*\*/g);
    assert.ok(annotations, 'should have "Why this is correct" annotations');
    assert.equal(annotations.length, 3, 'each of the 3 examples should have an annotation');
  });
});

// ─── Verifier Examples ──────────────────────────────────────────────────────

describe('few-shot: verifier examples', () => {
  const filePath = path.join(EXAMPLES_DIR, 'verifier.md');

  test('verifier.md exists', () => {
    assert.ok(fs.existsSync(filePath), 'verifier.md should exist');
  });

  test('has format version at top', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(
      content.includes('Format version: 1.0'),
      'verifier.md should declare format version 1.0'
    );
  });

  test('has exactly 3 examples', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const exampleHeadings = content.match(/^## Example \d+:/gm);
    assert.ok(exampleHeadings, 'should have example headings');
    assert.equal(exampleHeadings.length, 3, 'should have exactly 3 examples');
  });

  test('each example has "Why this is correct" annotation', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const annotations = content.match(/\*\*Why this is correct:\*\*/g);
    assert.ok(annotations, 'should have "Why this is correct" annotations');
    assert.equal(annotations.length, 3, 'each of the 3 examples should have an annotation');
  });
});

// ─── Agent References ───────────────────────────────────────────────────────

describe('few-shot: agent references', () => {
  test('gsd-plan-checker.md references plan-checker examples', () => {
    const agentPath = path.join(AGENTS_DIR, 'gsd-plan-checker.md');
    const content = fs.readFileSync(agentPath, 'utf-8');
    assert.ok(
      content.includes('few-shot-examples/plan-checker.md'),
      'gsd-plan-checker.md should reference the plan-checker few-shot examples'
    );
  });

  test('gsd-verifier.md references verifier examples', () => {
    const agentPath = path.join(AGENTS_DIR, 'gsd-verifier.md');
    const content = fs.readFileSync(agentPath, 'utf-8');
    assert.ok(
      content.includes('few-shot-examples/verifier.md'),
      'gsd-verifier.md should reference the verifier few-shot examples'
    );
  });
});
