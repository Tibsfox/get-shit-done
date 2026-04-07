/**
 * Structural tests for P1.3: TOCTOU race fix in state commands.
 *
 * All state commands that modify STATE.md must use readModifyWriteStateMd()
 * to hold the lock across the entire read-modify-write cycle. The old pattern
 * of readFileSync() → modify → writeStateMd() allowed two concurrent calls
 * to both read the same content and the second write to clobber the first.
 */

'use strict';

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const STATE_SRC = path.join(__dirname, '..', 'get-shit-done', 'bin', 'lib', 'state.cjs');

// Commands that write to STATE.md and must use readModifyWriteStateMd
const WRITE_COMMANDS = [
  'cmdStateUpdate',
  'cmdStateAdvancePlan',
  'cmdStateRecordMetric',
  'cmdStateUpdateProgress',
  'cmdStateAddDecision',
  'cmdStateAddBlocker',
  'cmdStateResolveBlocker',
  'cmdStateRecordSession',
  'cmdStateBeginPhase',
];

describe('P1.3: TOCTOU race prevention in state commands', () => {
  let src;

  before(() => {
    src = fs.readFileSync(STATE_SRC, 'utf-8');
  });

  for (const cmd of WRITE_COMMANDS) {
    test(`${cmd} uses readModifyWriteStateMd (not read + writeStateMd)`, () => {
      // Find the function body
      const funcStart = src.indexOf(`function ${cmd}(`);
      assert.ok(funcStart !== -1, `${cmd} must exist in state.cjs`);

      // Get function body up to next top-level function
      const afterFunc = src.slice(funcStart);
      const nextFunc = afterFunc.match(/\nfunction cmd\w+\(/);
      const funcBody = nextFunc
        ? afterFunc.slice(0, nextFunc.index)
        : afterFunc.slice(0, 2000);

      // cmdStatePatch already uses readModifyWriteStateMd — it's the reference impl
      if (cmd === 'cmdStatePatch') return;

      // Must use readModifyWriteStateMd
      assert.ok(
        funcBody.includes('readModifyWriteStateMd('),
        `${cmd} must use readModifyWriteStateMd() to hold lock across read-modify-write`
      );

      // Must NOT have bare readFileSync followed by writeStateMd (the TOCTOU pattern)
      // Exception: readFileSync is OK if it's inside the readModifyWriteStateMd callback
      const hasBareFsRead = funcBody.match(
        /fs\.readFileSync\(statePath/
      );
      assert.ok(
        !hasBareFsRead,
        `${cmd} must not use bare fs.readFileSync(statePath) — read inside readModifyWriteStateMd callback instead`
      );
    });
  }

  test('cmdStatePatch already uses readModifyWriteStateMd (reference implementation)', () => {
    const funcStart = src.indexOf('function cmdStatePatch(');
    const afterFunc = src.slice(funcStart);
    const nextFunc = afterFunc.match(/\nfunction cmd\w+\(/);
    const funcBody = nextFunc ? afterFunc.slice(0, nextFunc.index) : afterFunc.slice(0, 1000);

    assert.ok(
      funcBody.includes('readModifyWriteStateMd('),
      'cmdStatePatch is the reference implementation and must use readModifyWriteStateMd'
    );
  });
});
