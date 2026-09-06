#!/usr/bin/env node
'use strict';
/** Register one new demo without replacing any shared catalogue or test files.
 * Run from anywhere: node apps/demo/scripts/register-night-window.cjs   (or: node tools/register-night-window.cjs <checkout>)
 * All shared-file changes are planned and checked before any are written.
 * This script neither deploys nor connects to the API database.
 */
const fs = require('node:fs');
const path = require('node:path');
const SLUG = 'the-night-window';
const TEST_COMMAND = 'node --test bundles/TheNightWindow/tests/game.test.cjs bundles/TheNightWindow/tests/content.test.cjs bundles/TheNightWindow/tests/integration.test.cjs';
function patchMap(source, map, value) {
  const pattern = new RegExp('(private\\s+const\\s+' + map + '\\s*=\\s*\\[)([\\s\\S]*?)(\\];)');
  const found = pattern.exec(source);
  if (!found) throw new Error('Unsupported seeder: missing ' + map + ' map. No shared files were changed.');
  const key = /(['"])the-night-window\1\s*=>\s*(['"])([^'"]*)\2/;
  const existing = key.exec(found[2]);
  if (existing && existing[3] !== value) throw new Error('Conflicting existing ' + map + ' entry for ' + SLUG);
  if (existing) return source;
  return source.replace(pattern, (_, a, body, end) => a + '\n        \'the-night-window\' => \'' + value + '\',' + body + end);
}
function planRegistration(root, manifestOverride = null) {
  const indexPath = path.join(root, 'apps/softn-web/public/demos/index.json');
  const seedPath = path.join(root, 'apps/softn-api/lib/seed.php');
  const packagePath = path.join(root, 'apps/demo/package.json');
  const bundleRoot = path.join(root, 'apps/demo/bundles/TheNightWindow');
  const original = new Map([indexPath, seedPath, packagePath].map(f => [f, fs.readFileSync(f, 'utf8')]));
  const index = JSON.parse(original.get(indexPath));
  if (!Array.isArray(index)) throw new Error('The PHP demo seeder requires an array index; unexpected index format.');
  const manifest = manifestOverride || JSON.parse(fs.readFileSync(path.join(bundleRoot, 'manifest.json'), 'utf8'));
  const matches = index.filter(e => e && (e.id === SLUG || e.file === 'TheNightWindow.softn'));
  if (matches.length > 1 || (matches.length === 1 && (matches[0].id !== SLUG || matches[0].file !== 'TheNightWindow.softn'))) {
    throw new Error('Conflicting existing Night Window catalogue identifier.');
  }
  const output = path.join(root, 'apps/demo/bundles/TheNightWindow.softn');
  const item = {...(matches[0] || {}), id:SLUG, file:'TheNightWindow.softn', name:manifest.name,
    description:manifest.description, primary:manifest.config.theme.primary,
    size:fs.existsSync(output) ? fs.statSync(output).size : 0};
  if (matches.length) index[index.indexOf(matches[0])] = item; else index.push(item);
  let seed = patchMap(original.get(seedPath), 'CATEGORY', 'games');
  seed = patchMap(seed, 'TAGS', 'story,horror,observation,offline');
  const pkg = JSON.parse(original.get(packagePath));
  if (!pkg.scripts || typeof pkg.scripts.test !== 'string') throw new Error('Demo test script was not found.');
  if (pkg.scripts['test:night-window'] && pkg.scripts['test:night-window'] !== TEST_COMMAND) {
    throw new Error('An existing test:night-window command differs; refusing to replace it.');
  }
  pkg.scripts['test:night-window'] = TEST_COMMAND;
  if (!pkg.scripts.test.includes('npm run test:night-window')) pkg.scripts.test += ' && npm run test:night-window';
  return [
    {file:indexPath, before:original.get(indexPath), after:JSON.stringify(index, null, 2)+'\n'},
    {file:seedPath, before:original.get(seedPath), after:seed},
    {file:packagePath, before:original.get(packagePath), after:JSON.stringify(pkg, null, 2)+'\n'},
  ];
}
function register(root) {
  const changes = planRegistration(root).filter(c => c.before !== c.after);
  // A backup is never silently overwritten. Backups are outside deployment paths.
  const backupRoot = path.join(root, '.night-window-backup');
  for (const c of changes) {
    const backup = path.join(backupRoot, path.relative(root, c.file));
    fs.mkdirSync(path.dirname(backup), {recursive:true});
    if (!fs.existsSync(backup)) fs.writeFileSync(backup, c.before, {flag:'wx'});
  }
  const written = [];
  try {
    for (const c of changes) {
      if (fs.readFileSync(c.file, 'utf8') !== c.before) throw new Error('Concurrent modification of ' + c.file);
      fs.writeFileSync(c.file, c.after); written.push(c);
    }
  } catch (err) {
    for (const c of written.reverse()) fs.writeFileSync(c.file, c.before);
    throw err;
  }
  return changes.map(c => path.relative(root, c.file));
}
module.exports = {planRegistration, register, patchMap, TEST_COMMAND};
if (require.main === module) {
  try {
    // From a softn.com checkout this sits at apps/demo/scripts; from the game repository, pass the checkout path.
    const root = path.resolve(process.argv[2] || path.join(__dirname, '../../..'));
    const changed = register(root);
    console.log(changed.length ? 'Registered The Night Window:\n  '+changed.join('\n  ') : 'The Night Window is already registered.');
    console.log('Next: node apps/demo/scripts/build-bundle.cjs TheNightWindow');
  } catch (err) { console.error(err.message); process.exitCode=1; }
}
