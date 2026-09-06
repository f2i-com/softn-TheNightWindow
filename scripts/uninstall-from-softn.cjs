#!/usr/bin/env node
'use strict';
/**
 * Remove this game from a softn.com checkout again.
 *
 *   node scripts/uninstall-from-softn.cjs "C:\path\to\softn.com" [--dry-run]
 *
 * Deletes the game's own files and restores the three shared files the installer
 * edited (demo catalogue, API seeder, demo package) from .night-window-backup/, or
 * from git when no backup exists. Touches nothing else: saved data in the browser and
 * any other change in the checkout are left alone.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const GAME_PATHS = [
  'apps/demo/bundles/TheNightWindow',
  'apps/demo/bundles/TheNightWindow.softn',
  'apps/demo/scripts/register-night-window.cjs',
  'apps/softn-web/public/demos/TheNightWindow.softn',
  'apps/softn-web/public/demos/icons/TheNightWindow.svg',
  'apps/softn-web/public/demos/thumbs/TheNightWindow.webp',
];
const SHARED = ['apps/softn-web/public/demos/index.json', 'apps/softn-api/lib/seed.php', 'apps/demo/package.json'];

try {
  const args = process.argv.slice(2), dry = args.includes('--dry-run');
  const targets = args.filter((a) => !a.startsWith('--'));
  if (targets.length !== 1) throw Error('Usage: node scripts/uninstall-from-softn.cjs "C:\\path\\to\\softn.com" [--dry-run]');
  const root = fs.realpathSync(path.resolve(targets[0]));
  if (!fs.existsSync(path.join(root, 'apps/demo/scripts/build-bundle.cjs'))) throw Error('Not a softn.com checkout: ' + root);
  const present = GAME_PATHS.filter((p) => fs.existsSync(path.join(root, p)));
  const backup = path.join(root, '.night-window-backup');
  console.log('Target: ' + root + '\nGame files to remove: ' + (present.join(', ') || '(none)'));
  if (dry) { console.log('Dry run. Nothing changed.'); process.exit(0); }
  for (const p of present) fs.rmSync(path.join(root, p), { recursive: true, force: true });
  for (const rel of SHARED) {
    const saved = path.join(backup, rel);
    if (fs.existsSync(saved)) {
      fs.copyFileSync(saved, path.join(root, rel));
      console.log('Restored ' + rel + ' from the installer backup');
    } else {
      const r = cp.spawnSync('git', ['checkout', '--', rel], { cwd: root, stdio: 'pipe' });
      console.log((r.status === 0 ? 'Restored ' : 'Could not restore ') + rel + ' from git' + (r.status === 0 ? '' : ': ' + String(r.stderr)));
    }
  }
  if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
  console.log('\nRemoved. Nothing else in the checkout was touched.');
} catch (err) {
  console.error('\nRemoval stopped: ' + err.message);
  process.exitCode = 1;
}
