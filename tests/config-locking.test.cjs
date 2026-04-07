/**
 * Structural test for P1.4: config.json write locking.
 *
 * setConfigValue must hold the planning lock across its read-modify-write
 * cycle to prevent concurrent config-set commands from clobbering each
 * other's changes during parallel agent execution.
 */

'use strict';

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CONFIG_SRC = path.join(__dirname, '..', 'get-shit-done', 'bin', 'lib', 'config.cjs');

describe('P1.4: config.json write locking', () => {
  let src;

  before(() => {
    src = fs.readFileSync(CONFIG_SRC, 'utf-8');
  });

  test('config.cjs imports withPlanningLock from core.cjs', () => {
    assert.ok(
      src.includes('withPlanningLock'),
      'config.cjs must import withPlanningLock'
    );
  });

  test('setConfigValue wraps read-modify-write in withPlanningLock', () => {
    const funcStart = src.indexOf('function setConfigValue(');
    assert.ok(funcStart !== -1, 'setConfigValue must exist');

    const afterFunc = src.slice(funcStart);
    const nextFunc = afterFunc.match(/\n(?:function |const |\/\*\*)\s/);
    const funcBody = nextFunc ? afterFunc.slice(0, nextFunc.index) : afterFunc.slice(0, 1500);

    assert.ok(
      funcBody.includes('withPlanningLock(cwd,'),
      'setConfigValue must wrap its body in withPlanningLock(cwd, ...)'
    );
  });
});
