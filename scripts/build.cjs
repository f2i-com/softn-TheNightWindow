#!/usr/bin/env node
'use strict';
/**
 * Build dist/TheNightWindow.softn from bundle/, with checksums and release notes.
 *
 *   node scripts/build.cjs [--expect-tag vX.Y.Z]
 *
 * --expect-tag makes the build fail when the tag being released does not match
 * bundle/manifest.json's version, so a release can never carry the wrong number.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { packBundle } = require('../tools/pack.cjs');

const root = path.resolve(__dirname, '..');
const bundleDir = path.join(root, 'bundle');
const distDir = path.join(root, 'dist');
const args = process.argv.slice(2);
const tagIndex = args.indexOf('--expect-tag');
const expectTag = tagIndex >= 0 ? args[tagIndex + 1] : null;

try {
  const { bytes, entries, manifest } = packBundle(bundleDir);
  if (expectTag && expectTag !== 'v' + manifest.version) {
    throw new Error(`Tag ${expectTag} does not match bundle/manifest.json version ${manifest.version}. Bump the manifest (and re-tag) so the release number is honest.`);
  }
  fs.mkdirSync(distDir, { recursive: true });
  const out = path.join(distDir, 'TheNightWindow.softn');
  fs.writeFileSync(out, bytes);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(distDir, 'SHA256SUMS.txt'), `${sha256}  TheNightWindow.softn\n`);
  const voice = fs.existsSync(path.join(bundleDir, 'assets', 'voice')) ? fs.readdirSync(path.join(bundleDir, 'assets', 'voice')).length : 0;
  const notes = [
    `# ${manifest.name} v${manifest.version}`,
    '',
    manifest.description,
    '',
    `- Bundle: \`TheNightWindow.softn\`, ${(bytes.length / 1048576).toFixed(2)} MB, ${entries} entries`,
    `- SHA-256: \`${sha256}\``,
    `- Voice clips: ${voice}`,
    '',
    'Open it in the SoftN web runtime with its file picker, or serve it and use `?open=<url>`.',
    'To play it inside a softn.com checkout: `npm run install-into -- <path to softn.com>`.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(distDir, 'RELEASE_NOTES.md'), notes);
  console.log(`${manifest.name} v${manifest.version}: ${entries} entries, ${(bytes.length / 1048576).toFixed(2)} MB`);
  console.log(`sha256 ${sha256}`);
  console.log(`-> ${path.relative(root, out)}`);
} catch (err) {
  console.error('Build failed: ' + err.message);
  process.exitCode = 1;
}
