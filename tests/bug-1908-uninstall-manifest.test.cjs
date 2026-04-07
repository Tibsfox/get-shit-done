/**
 * Regression tests for bug #1908
 *
 * The uninstall() function must remove gsd-file-manifest.json from the
 * target directory. The installer writes this file during install/update
 * (writeManifest), but uninstall() previously did not clean it up —
 * leaving stale GSD metadata in the runtime config root.
 */

'use strict';

const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const INSTALL_SRC = path.join(__dirname, '..', 'bin', 'install.js');

describe('bug #1908: uninstall removes gsd-file-manifest.json', () => {
  let src;

  before(() => {
    src = fs.readFileSync(INSTALL_SRC, 'utf-8');
  });

  test('uninstall function references gsd-file-manifest.json for removal', () => {
    // The uninstall function should contain code to remove the manifest
    // Find the uninstall function body
    const uninstallStart = src.indexOf('function uninstall(');
    assert.ok(uninstallStart !== -1, 'uninstall function must exist');

    // Get the function body (up to the next top-level function)
    const afterUninstall = src.slice(uninstallStart);
    const nextFuncMatch = afterUninstall.match(/\n(?:function |const |\/\*\*)\s/);
    const uninstallBody = nextFuncMatch
      ? afterUninstall.slice(0, nextFuncMatch.index)
      : afterUninstall;

    assert.ok(
      uninstallBody.includes('gsd-file-manifest.json'),
      'uninstall() must reference gsd-file-manifest.json for cleanup'
    );
  });

  test('manifest removal uses unlinkSync (not rmSync recursive)', () => {
    // The manifest is a single file — should use unlinkSync, not rmSync
    const uninstallStart = src.indexOf('function uninstall(');
    const afterUninstall = src.slice(uninstallStart);

    // Find the manifest removal block
    const manifestBlock = afterUninstall.match(
      /gsd-file-manifest\.json[\s\S]{0,200}unlinkSync/
    );
    assert.ok(manifestBlock, 'manifest should be removed with unlinkSync');
  });

  test('manifest removal is guarded by existsSync', () => {
    const uninstallStart = src.indexOf('function uninstall(');
    const afterUninstall = src.slice(uninstallStart);

    // The pattern should be: existsSync check before unlinkSync
    const manifestSection = afterUninstall.match(
      /existsSync\(manifestPath\)[\s\S]{0,100}unlinkSync\(manifestPath\)/
    );
    assert.ok(manifestSection, 'manifest removal should be guarded by existsSync');
  });
});
