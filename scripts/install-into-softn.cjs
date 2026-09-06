#!/usr/bin/env node
'use strict';
/**
 * Install this game into an existing softn.com checkout for local play and testing.
 *
 *   node scripts/install-into-softn.cjs "C:\path\to\softn.com" [--dry-run] [--replace]
 *
 * Copies bundle/ to apps/demo/bundles/TheNightWindow, the registration script to
 * apps/demo/scripts, and the directory thumbnail; registers the game in the demo
 * catalogue, the API seeder and the demo test command; rebuilds with the checkout's
 * own build-bundle.cjs; runs the game's tests. Never clones, commits, pushes, deploys,
 * installs dependencies, or deletes saved data. Originals of shared files are kept in
 * .night-window-backup/. `scripts/uninstall-from-softn.cjs` reverses it.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const registration = require('../tools/register-night-window.cjs');

const repo = path.resolve(__dirname, '..');
const OVERLAY = [
  { from: 'bundle', to: 'apps/demo/bundles/TheNightWindow' },
  { from: 'tools/register-night-window.cjs', to: 'apps/demo/scripts/register-night-window.cjs' },
  { from: 'site/thumbnail.webp', to: 'apps/softn-web/public/demos/thumbs/TheNightWindow.webp' },
];

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((f) => (f.isDirectory() ? files(path.join(dir, f.name)) : [path.join(dir, f.name)]));
}
function run(root, script, ...args) {
  const r = cp.spawnSync(process.execPath, [path.join(root, script), ...args], { cwd: root, stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw Error('Command failed: ' + script + ' ' + args.join(' '));
}
function plan() {
  const pairs = [];
  for (const item of OVERLAY) {
    const src = path.join(repo, item.from);
    if (!fs.existsSync(src)) continue;
    if (fs.statSync(src).isDirectory()) {
      for (const f of files(src)) pairs.push({ src: f, rel: path.join(item.to, path.relative(src, f)) });
    } else {
      pairs.push({ src, rel: item.to });
    }
  }
  return pairs;
}

try {
  const args = process.argv.slice(2), replace = args.includes('--replace'), dry = args.includes('--dry-run');
  const unknown = args.filter((a) => a.startsWith('--') && !['--replace', '--dry-run'].includes(a));
  const targets = args.filter((a) => !a.startsWith('--'));
  if (unknown.length || targets.length !== 1) throw Error('Usage: node scripts/install-into-softn.cjs "C:\\path\\to\\softn.com" [--dry-run] [--replace]');
  const root = fs.realpathSync(path.resolve(targets[0]));
  if (root === repo) throw Error('Choose your softn.com checkout, not this repository.');
  for (const f of ['packages/@softn/core', 'apps/demo/scripts/build-bundle.cjs', 'apps/demo/package.json', 'apps/softn-api/lib/seed.php', 'apps/softn-web/public/demos/index.json']) {
    if (!fs.existsSync(path.join(root, f))) throw Error('Not a supported softn.com checkout; missing ' + f);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'bundle/manifest.json'), 'utf8'));
  registration.planRegistration(root, manifest); // Validate shared schemas before any copying.
  const pairs = plan(), conflicts = [];
  for (const p of pairs) {
    const dest = path.join(root, p.rel);
    if (fs.existsSync(dest) && (!fs.statSync(dest).isFile() || !fs.readFileSync(p.src).equals(fs.readFileSync(dest)))) conflicts.push(p.rel);
  }
  if (conflicts.length && !replace) throw Error('Existing files differ; nothing was changed. Review them, then use --replace to retain backups and replace this game:\n' + conflicts.join('\n'));
  console.log('Target: ' + root + '\nGame files: ' + pairs.length + '\nShared metadata: index.json, seed.php, apps/demo/package.json');
  if (dry) { console.log('Dry run passed. Nothing changed.'); process.exit(0); }
  // Clips pruned here must not linger there: the checkout's builder packs everything under assets/.
  const voiceDir = path.join(root, 'apps/demo/bundles/TheNightWindow/assets/voice');
  if (replace && fs.existsSync(voiceDir)) fs.rmSync(voiceDir, { recursive: true, force: true });
  const backupRoot = path.join(root, '.night-window-backup', 'replaced-' + new Date().toISOString().replace(/[:.]/g, '-'));
  for (const rel of conflicts) {
    const dest = path.join(backupRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(path.join(root, rel))) fs.copyFileSync(path.join(root, rel), dest);
  }
  for (const p of pairs) {
    const dest = path.join(root, p.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(p.src, dest);
  }
  const changed = registration.register(root);
  console.log('Updated shared files: ' + changed.length + ' (originals retained in .night-window-backup)');
  run(root, 'apps/demo/scripts/build-bundle.cjs', 'TheNightWindow');
  run(root, 'apps/demo/bundles/TheNightWindow/tests/run-tests.cjs');
  console.log('\nInstalled and rebuilt. No remote repository or site was modified.');
  console.log('Play: npm run dev:web in the checkout, then http://localhost:1420/?open=/demos/TheNightWindow.softn');
  console.log('Remove again: node scripts/uninstall-from-softn.cjs "' + root + '"');
} catch (err) {
  console.error('\nInstallation stopped: ' + err.message);
  process.exitCode = 1;
}
