#!/usr/bin/env node
/**
 * Build GSD hooks with logger bundled for distribution.
 * Uses esbuild to bundle each hook with its lib/ dependencies.
 *
 * Hooks are bundled to hooks/dist/ for easy distribution and installation.
 * Bundling ensures hooks are self-contained and can run without node_modules.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');
const DIST_DIR = path.join(HOOKS_DIR, 'dist');

// All hooks that need logger bundled
const HOOKS_TO_BUNDLE = [
  'gsd-log-init.js',
  'gsd-check-update.js',
  'gsd-statusline.js'
];

async function build() {
  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Bundle each hook with dependencies
  for (const hook of HOOKS_TO_BUNDLE) {
    const src = path.join(HOOKS_DIR, hook);
    const dest = path.join(DIST_DIR, hook);

    if (!fs.existsSync(src)) {
      console.warn(`Warning: ${hook} not found, skipping`);
      continue;
    }

    console.log(`Bundling ${hook}...`);

    await esbuild.build({
      entryPoints: [src],
      bundle: true,
      platform: 'node',
      target: 'node16.7',  // Match package.json engines
      outfile: dest,
      format: 'cjs',
      minify: false,  // Keep readable for debugging
      sourcemap: false,
      external: [],  // Bundle everything including lib/
    });

    console.log(`  -> ${dest}`);
  }

  console.log('\nBuild complete.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
