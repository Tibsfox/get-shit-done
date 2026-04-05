const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('undo command', () => {
  test('command file exists', () => {
    const p = path.join(__dirname, '..', 'commands', 'gsd', 'undo.md');
    assert.ok(fs.existsSync(p), 'commands/gsd/undo.md should exist');
  });

  test('workflow file exists', () => {
    const p = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'undo.md');
    assert.ok(fs.existsSync(p), 'get-shit-done/workflows/undo.md should exist');
  });

  test('command file has correct frontmatter', () => {
    const p = path.join(__dirname, '..', 'commands', 'gsd', 'undo.md');
    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(content.includes('name: gsd:undo'), 'should have correct command name');
    assert.ok(content.includes('description:'), 'should have description frontmatter');
  });

  test('documents all three modes: --last, --phase, --plan', () => {
    const p = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'undo.md');
    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(content.includes('--last'), 'workflow should document --last mode');
    assert.ok(content.includes('--phase'), 'workflow should document --phase mode');
    assert.ok(content.includes('--plan'), 'workflow should document --plan mode');
  });

  test('includes dependency check for downstream phases', () => {
    const p = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'undo.md');
    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(
      content.includes('Dependency check') || content.includes('dependency'),
      'workflow should include dependency checking'
    );
    assert.ok(
      content.includes('later phase') || content.includes('Later phases'),
      'workflow should warn about downstream phase dependencies'
    );
  });

  test('uses only git revert --no-commit, never git reset as a command', () => {
    const p = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'undo.md');
    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(
      content.includes('git revert --no-commit'),
      'workflow must use git revert --no-commit'
    );
    // Extract code blocks and verify none contain git reset as a command
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    const codeContent = codeBlocks.join('\n');
    assert.ok(
      !codeContent.includes('git reset'),
      'workflow code blocks must never use git reset'
    );
  });

  test('produces single atomic commit with revert() prefix', () => {
    const p = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'undo.md');
    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(
      content.includes('atomic commit') || content.includes('Atomic commit'),
      'workflow should describe atomic commit step'
    );
    assert.ok(
      content.includes('revert('),
      'commit message should use revert() conventional commit prefix'
    );
  });

  test('includes conflict handling with abort instructions', () => {
    const p = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'undo.md');
    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(
      content.includes('Conflict') || content.includes('conflict'),
      'workflow should handle revert conflicts'
    );
    assert.ok(
      content.includes('git revert --abort'),
      'workflow should mention git revert --abort for conflict resolution'
    );
  });

  test('checks phase manifest before falling back to git log', () => {
    const p = path.join(__dirname, '..', 'get-shit-done', 'workflows', 'undo.md');
    const content = fs.readFileSync(p, 'utf-8');
    assert.ok(
      content.includes('phase-manifest') || content.includes('.phase-manifest.json'),
      'workflow should check phase manifest for commit hashes'
    );
    assert.ok(
      content.includes('fall back') || content.includes('fallback') || content.includes('If no manifest'),
      'workflow should fall back to git log when manifest unavailable'
    );
  });
});
