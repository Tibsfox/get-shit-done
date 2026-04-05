/**
 * Thinking Model Guidance Reference Tests
 *
 * Validates that all 5 thinking model reference files exist with required
 * sections, and that each of the 6 relevant agent files references its
 * thinking model guidance doc via @-reference lines.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const REFERENCES_DIR = path.join(__dirname, '..', 'get-shit-done', 'references');
const AGENTS_DIR = path.join(__dirname, '..', 'agents');

const THINKING_CONTEXTS = ['debug', 'execution', 'planning', 'research', 'verification'];

const REQUIRED_SECTIONS = [
  '## When to Use Extended Thinking',
  '## Recommended Budget',
  '## Prompt Structure',
  '## When NOT to Think',
];

const AGENT_TO_REFERENCE = {
  'gsd-debugger': 'thinking-models-debug.md',
  'gsd-executor': 'thinking-models-execution.md',
  'gsd-planner': 'thinking-models-planning.md',
  'gsd-phase-researcher': 'thinking-models-research.md',
  'gsd-plan-checker': 'thinking-models-planning.md',
  'gsd-verifier': 'thinking-models-verification.md',
};

// ─── Reference File Existence ───────────────────────────────────────────────

describe('thinking model reference files exist', () => {
  for (const context of THINKING_CONTEXTS) {
    test(`thinking-models-${context}.md exists`, () => {
      const filePath = path.join(REFERENCES_DIR, `thinking-models-${context}.md`);
      assert.ok(fs.existsSync(filePath), `Missing reference file: thinking-models-${context}.md`);
    });
  }
});

// ─── Reference File Required Sections ───────────────────────────────────────

describe('thinking model reference files have required sections', () => {
  for (const context of THINKING_CONTEXTS) {
    describe(`thinking-models-${context}.md`, () => {
      const filePath = path.join(REFERENCES_DIR, `thinking-models-${context}.md`);
      let content;

      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        content = '';
      }

      for (const section of REQUIRED_SECTIONS) {
        test(`contains "${section}"`, () => {
          assert.ok(
            content.includes(section),
            `thinking-models-${context}.md missing section: ${section}`
          );
        });
      }
    });
  }
});

// ─── Agent File References ──────────────────────────────────────────────────

describe('agent files reference thinking model guidance', () => {
  for (const [agent, refFile] of Object.entries(AGENT_TO_REFERENCE)) {
    test(`${agent}.md references ${refFile}`, () => {
      const agentPath = path.join(AGENTS_DIR, `${agent}.md`);
      const content = fs.readFileSync(agentPath, 'utf-8');

      const expectedRef = `@~/.claude/get-shit-done/references/${refFile}`;
      assert.ok(
        content.includes(expectedRef),
        `${agent}.md missing @-reference line: ${expectedRef}`
      );
    });
  }
});
