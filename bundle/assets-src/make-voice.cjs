#!/usr/bin/env node
'use strict';
/** Voice acting for The Night Window, recorded through the ElevenLabs text-to-speech API.
 *
 * Usage (from anywhere):
 *   node make-voice.cjs --key-file "C:\path\to\ElevenLabs-API.txt" [--group narrator,marr,openings,residents,arcade,calls]
 *                       [--dry-run] [--prune] [--concurrency 2] [--limit N]
 *
 * What it does:
 *   1. Loads the game's own content tables (residents, campaign, nights, endings, tutorial).
 *   2. Derives every spoken line: who says it, the exact words, and a stable id such as
 *      "reply/n1-01-ada/where" or "brief/3".
 *   3. Requests any clip that is not already on disk and writes assets/voice/<speaker>_<hash>.mp3.
 *      The hash covers speaker and words, so an unchanged line is never paid for twice.
 *   4. Writes logic/voice.logic (line id -> clip key) and refreshes manifest.json's asset list.
 *   5. Writes assets-src/voice-lines.json, a reviewable script of the whole cast.
 *
 * The API key is read from a file outside the bundle and never written anywhere.
 * Stage directions outside curly quotes are not spoken by the character; only the quoted words are.
 * A trailing notebook summary (the memoryText) is stripped from speech.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const voiceDir = path.join(root, 'assets', 'voice');
const args = process.argv.slice(2);
function opt(name, fallback) { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; }
const dryRun = args.includes('--dry-run');
const prune = args.includes('--prune');
const keyFile = opt('--key-file', process.env.ELEVENLABS_KEY_FILE || '');
const groups = opt('--group', 'narrator,marr,openings,residents,arcade,calls').split(',').map(s => s.trim()).filter(Boolean);
const concurrency = Math.max(1, Number(opt('--concurrency', '2')) || 2);
const limit = Number(opt('--limit', '0')) || 0;
const MODEL = 'eleven_multilingual_v2';
const API = 'https://api.elevenlabs.io/v1';

// ── Cast ───────────────────────────────────────────────────────────────────
// Premade ElevenLabs voices only (the key has no voices_write permission, so the
// shared library cannot be added to). Where two roles share a voice they never
// appear on the same night, and pacing/stability settings keep them apart.
const HQ = 'mp3_44100_64', LQ = 'mp3_22050_32';
const CAST = {
  narrator: { name: 'Narrator', voice: 'JBFqnCBsd6RMkjVDRZzb', note: 'George: warm British storyteller', settings: { stability: 0.62, similarity_boost: 0.8, style: 0.22, use_speaker_boost: true, speed: 0.95 } },
  marr:     { name: 'S. Marr (previous guard)', voice: 'pqHfZKP75CvOlQylNhV4', note: 'Bill: old, crisp, tired', settings: { stability: 0.6, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 0.94 } },
  office:   { name: 'Head office (form acknowledgements)', voice: 'CwhRBWXzGAHq8TQ4Fs17', note: 'Roger: flat, unhurried bureaucracy over the desk speaker', settings: { stability: 0.85, similarity_boost: 0.8, style: 0.05, use_speaker_boost: true, speed: 0.97 } },
  ada:      { voice: 'pFZP5JQG7iQjIQuC4Bku', note: 'Lily: velvety British actress, slowed for 68', settings: { stability: 0.72, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed: 0.88 } },
  mara:     { voice: 'EXAVITQu4vr4xnSDxMaL', note: 'Sarah: mature, flat with exhaustion', settings: { stability: 0.75, similarity_boost: 0.8, style: 0.08, use_speaker_boost: true, speed: 0.95 } },
  ivo:      { voice: 'bIHbv24MWmeRgasZH58o', note: 'Will: young, relaxed, quick', settings: { stability: 0.45, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 1.06 } },
  tomas:    { voice: 'iP95p4xoKVk53GoZ742B', note: 'Chris: down-to-earth engineer', settings: { stability: 0.6, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 0.95 } },
  selene:   { voice: 'Xb7hH8MSUJpSbSDYk0k2', note: 'Alice: clear British, controlled', settings: { stability: 0.8, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true, speed: 1.0 } },
  nessa:    { voice: 'EXAVITQu4vr4xnSDxMaL', note: 'Sarah again, pushed harder: direct and sleepless', settings: { stability: 0.4, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true, speed: 1.05 } },
  lio:      { voice: 'cgSgspJ2msm6clMCkdW9', note: 'Jessica: the youngest premade voice, kept literal and steady for a 12-year-old', settings: { stability: 0.7, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: 1.0 } },
  emil:     { voice: 'N2lVS1w4EtoT3dr4eOWO', note: 'Callum: husky, excitable tangents', settings: { stability: 0.42, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true, speed: 1.04 } },
  celia:    { voice: 'hpp4J3VqNfWAUOO0d1Us', note: 'Bella: warm, persuasive organizer', settings: { stability: 0.6, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 0.97 } },
  orin:     { voice: 'SAz9YHcvj6GT2YYXdXww', note: 'River: neutral, unhurried, uncanny calm', settings: { stability: 0.85, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true, speed: 0.9 } },
  leon:     { voice: 'pNInz6obpgDQGcFmaJgB', note: 'Adam: blunt, disciplined', settings: { stability: 0.7, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true, speed: 0.98 } },
  bea:      { voice: 'FGY2WhTYpPnrIDTdsKH5', note: 'Laura: quick, quirky courier', settings: { stability: 0.4, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true, speed: 1.12 } },
  dalia:    { voice: 'Xb7hH8MSUJpSbSDYk0k2', note: 'Alice again, slower and heavier: careful vocabulary, moral exhaustion', settings: { stability: 0.58, similarity_boost: 0.8, style: 0.22, use_speaker_boost: true, speed: 0.93 } },
  pavel:    { voice: 'onwK4e9ZLuTAKqWW03F9', note: 'Daniel: formal British, courteous and distracted', settings: { stability: 0.6, similarity_boost: 0.8, style: 0.18, use_speaker_boost: true, speed: 0.93 } },
  ruth:     { voice: 'XrExE9yKIg1WjnnlVkGX', note: 'Matilda: upbeat, kitchen-warm', settings: { stability: 0.55, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 1.0 } },
  micah:    { voice: 'TX3LPaxmHKxFdv7VOQHJ', note: 'Liam: young, sardonic when scared', settings: { stability: 0.5, similarity_boost: 0.78, style: 0.3, use_speaker_boost: true, speed: 1.02 } },
  june:     { voice: 'hpp4J3VqNfWAUOO0d1Us', note: 'Bella again, brisker and plainer: practical tram driver', settings: { stability: 0.5, similarity_boost: 0.78, style: 0.12, use_speaker_boost: true, speed: 1.04 } },
  victor:   { voice: 'cjVigY5qzO86Huf0OWal', note: 'Eric: smooth, velvet menace', settings: { stability: 0.82, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: 0.9 } },
  anja:     { voice: 'FGY2WhTYpPnrIDTdsKH5', note: 'Laura again, steadier and drier: fast, sceptical electrician', settings: { stability: 0.62, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1.0 } },
  hadi:     { voice: 'nPczCjzI2devNBz1zQrb', note: 'Brian: deep, gentle, exact', settings: { stability: 0.72, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true, speed: 0.92 } },
};

// ── Content ────────────────────────────────────────────────────────────────
function loadTables() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const files = manifest.files.logic.filter(f => f !== 'logic/voice.logic' && f !== 'logic/main.logic');
  const code = files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  const ctx = vm.createContext({ console });
  vm.runInContext(code + '\n;({residents:NW_RESIDENTS,campaign:NW_CAMPAIGN,nights:NW_NIGHTS,endings:NW_ENDING_DEFS,tutorial:typeof NW_TUTORIAL==="undefined"?[]:NW_TUTORIAL,tips:typeof NW_TIPS==="undefined"?[]:NW_TIPS,finale:typeof NW_FINALE_TEXT==="undefined"?"":NW_FINALE_TEXT});', ctx);
  return vm.runInContext('({residents:NW_RESIDENTS,campaign:NW_CAMPAIGN,nights:NW_NIGHTS,endings:NW_ENDING_DEFS,tutorial:typeof NW_TUTORIAL==="undefined"?[]:NW_TUTORIAL,tips:typeof NW_TIPS==="undefined"?[]:NW_TIPS,finale:typeof NW_FINALE_TEXT==="undefined"?"":NW_FINALE_TEXT,office:typeof NW_OFFICE_LINES==="undefined"?[]:NW_OFFICE_LINES})', ctx);
}
function norm(text) { return String(text).replace(/\s+/g, ' ').trim(); }
function tidy(text) {
  const out = norm(text)
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,$/, '.')
    .replace(/[“”]/g, '')
    // The desk shouts ADMIT, DENY and HOLD; the model reads shouted words as names ("Denny").
    // Spoken text keeps ordinary words ordinary. Codes with digits (M17-4100) are untouched.
    .replace(/\b[A-Z]{3,}\b/g, w => w.charAt(0) + w.slice(1).toLowerCase());
  return out.charAt(0).toUpperCase() + out.slice(1);
}
/** What the character actually says: quoted words only when the line has stage directions. */
function speech(raw, memoryText) {
  let text = norm(raw);
  if (memoryText && text.endsWith(norm(memoryText))) text = norm(text.slice(0, text.length - norm(memoryText).length));
  const quoted = [];
  const re = /“([^”]*)”/g;
  let m;
  while ((m = re.exec(text)) !== null) if (norm(m[1])) quoted.push(norm(m[1]));
  if (quoted.length && !text.startsWith('“')) {
    // Stage direction first, then speech: speak only the speech.
    return tidy(quoted.map(q => q.replace(/,$/, '.')).join(' '));
  }
  if (quoted.length && text.startsWith('“')) {
    const outside = norm(text.replace(re, ' '));
    // “…,” he says. “…” — the words between quotes are attribution, not speech.
    if (outside.length < 40) return tidy(quoted.map(q => q.replace(/,$/, '.')).join(' '));
  }
  return tidy(text);
}
function marrSpeech(note) { return tidy(norm(note).replace(/^(Guard\s+S\.\s*)?Marr:\s*/i, '')); }
function key(speaker, text) { return speaker + '_' + crypto.createHash('sha1').update(speaker + '|' + norm(text)).digest('hex').slice(0, 8); }

function buildLines(t) {
  const lines = [];
  const add = (group, id, speaker, text, format) => {
    const spoken = norm(text);
    if (!spoken) return;
    lines.push({ group, id, speaker, text: spoken, key: key(speaker, spoken), format });
  };
  for (let i = 0; i < t.nights.length; i++) {
    add('narrator', 'brief/' + (i + 1), 'narrator', tidy(t.nights[i].brief), HQ);
    add('narrator', 'incident/' + (i + 1), 'narrator', tidy(t.nights[i].incident), HQ);
    add('marr', 'note/' + (i + 1), 'marr', marrSpeech(t.nights[i].note), LQ);
  }
  for (const e of t.endings) for (let i = 0; i < e.steps.length; i++) add('narrator', 'ending/' + e.id + '/' + i, 'narrator', tidy(e.steps[i].text), HQ);
  if (t.finale) add('narrator', 'finale', 'narrator', tidy(t.finale), HQ);
  for (let i = 0; i < t.office.length; i++) add('narrator', 'office/' + i, 'office', tidy(t.office[i]), HQ);
  for (const step of t.tutorial) add('narrator', 'tutorial/' + step.id, 'narrator', tidy(step.voice || step.text), HQ);
  for (const tip of t.tips) add('narrator', 'tip/' + tip.id, 'narrator', tidy(tip.voice || tip.text), HQ);
  for (const c of t.campaign) {
    add('openings', 'opening/' + c.id, 'narrator', tidy(c.opening), LQ);
    for (const n of c.nodes) add('residents', 'reply/' + c.id + '/' + n.id, c.resident, speech(n.a, c.memoryText), LQ);
    add('calls', 'call/' + c.id, 'narrator', tidy(c.call), LQ);
  }
  for (const r of t.residents) {
    add('arcade', 'arcade-voice/' + r.id, r.id, tidy(r.voice), LQ);
    add('arcade', 'arcade-gentle/' + r.id, r.id, 'I was not truthful about why I went out. That is not the same as not being me.', LQ);
    add('arcade', 'arcade-press/' + r.id, r.id, 'Check the departure gate. You should not confuse being unpleasant with being something else.', LQ);
  }
  return lines;
}

// ── Output ─────────────────────────────────────────────────────────────────
function walk(dir) { return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(f => f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)]) : []; }
function writeOutputs(lines, tables) {
  const present = new Set(walk(voiceDir).map(f => path.basename(f, '.mp3')));
  const map = {};
  for (const l of lines) if (present.has(l.key)) map[l.id] = l.key;
  const ids = Object.keys(map).sort();
  const body = ids.map(id => '  ' + JSON.stringify(id) + ': ' + JSON.stringify(map[id])).join(',\n');
  const logic = '// Generated by assets-src/make-voice.cjs. Do not edit by hand.\n' +
    '// Spoken line id -> clip under assets/voice/<key>.mp3. A missing id simply has no voice.\n' +
    'let NW_VOICE = {\n' + body + '\n};\n' +
    'let NW_VOICE_COUNT = ' + ids.length + ';\n';
  fs.writeFileSync(path.join(root, 'logic', 'voice.logic'), logic);
  const manifestPath = path.join(root, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.files.assets = walk(path.join(root, 'assets')).map(f => path.relative(root, f).replace(/\\/g, '/')).sort((a, b) => a.localeCompare(b));
  if (!manifest.files.logic.includes('logic/voice.logic')) {
    const at = manifest.files.logic.indexOf('logic/main.logic');
    manifest.files.logic.splice(at < 0 ? manifest.files.logic.length : at, 0, 'logic/voice.logic');
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const script = { model: MODEL, cast: {}, lines: lines.map(l => ({ id: l.id, speaker: l.speaker, key: l.key, recorded: present.has(l.key), text: l.text })) };
  for (const id of Object.keys(CAST)) {
    const r = tables.residents.find(x => x.id === id);
    script.cast[id] = { name: CAST[id].name || (r ? r.name : id), voice: CAST[id].voice, note: CAST[id].note, settings: CAST[id].settings };
  }
  fs.writeFileSync(path.join(__dirname, 'voice-lines.json'), JSON.stringify(script, null, 2) + '\n');
  return ids.length;
}

// ── API ────────────────────────────────────────────────────────────────────
async function tts(apiKey, line) {
  const cast = CAST[line.speaker];
  const url = API + '/text-to-speech/' + cast.voice + '?output_format=' + line.format;
  const body = JSON.stringify({ text: line.text, model_id: MODEL, voice_settings: cast.settings, apply_text_normalization: 'auto' });
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body });
    if (res.ok) {
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < 500) throw new Error('Suspiciously small clip (' + bytes.length + ' bytes)');
      return bytes;
    }
    const text = await res.text();
    let detail = null;
    try { detail = JSON.parse(text).detail; } catch (e) { /* not JSON */ }
    const status = detail && detail.status;
    if (res.status === 401 && /quota|limit/i.test(text)) { const err = new Error('Quota: ' + (detail && detail.message || text)); err.fatal = true; throw err; }
    if (res.status === 429 || res.status >= 500 || status === 'too_many_concurrent_requests' || status === 'system_busy') {
      const wait = Math.min(30000, 1500 * attempt * attempt);
      process.stdout.write('  [' + res.status + ' ' + (status || '') + '; retry in ' + Math.round(wait / 1000) + 's]\n');
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    throw new Error('HTTP ' + res.status + ' ' + text.slice(0, 300));
  }
  throw new Error('Gave up after repeated rate limits');
}

async function main() {
  const tables = loadTables();
  const all = buildLines(tables);
  for (const l of all) if (!CAST[l.speaker]) throw new Error('No voice cast for ' + l.speaker);
  const present = new Set(walk(voiceDir).map(f => path.basename(f, '.mp3')));
  const wanted = new Set(all.map(l => l.key));
  // Several ids can share a clip (the same words from the same mouth); request each clip once.
  const byKey = new Map();
  for (const l of all) if (!byKey.has(l.key)) byKey.set(l.key, l);
  const summary = {};
  for (const l of byKey.values()) { summary[l.group] = summary[l.group] || { clips: 0, chars: 0, missing: 0, missingChars: 0 }; summary[l.group].clips++; summary[l.group].chars += l.text.length; if (!present.has(l.key)) { summary[l.group].missing++; summary[l.group].missingChars += l.text.length; } }
  console.log('Line ids: ' + all.length + ' · distinct clips: ' + byKey.size + ' · already recorded: ' + [...byKey.keys()].filter(k => present.has(k)).length);
  for (const g of Object.keys(summary)) console.log('  ' + g.padEnd(10) + ' clips ' + String(summary[g].clips).padStart(4) + ' chars ' + String(summary[g].chars).padStart(6) + ' · to record: ' + summary[g].missing + ' clips / ' + summary[g].missingChars + ' chars');
  if (prune) for (const k of present) if (!wanted.has(k)) { fs.unlinkSync(path.join(voiceDir, k + '.mp3')); console.log('pruned ' + k); }
  let queue = [...byKey.values()].filter(l => groups.includes(l.group) && !present.has(l.key));
  const order = ['narrator', 'marr', 'openings', 'residents', 'arcade', 'calls'];
  queue.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  if (limit) queue = queue.slice(0, limit);
  console.log('Selected for recording: ' + queue.length + ' clips / ' + queue.reduce((n, l) => n + l.text.length, 0) + ' characters (' + MODEL + ')');
  if (dryRun) { const n = writeOutputs(all, tables); console.log('Dry run. voice.logic lists ' + n + ' recorded ids. Nothing was requested.'); return; }
  if (!keyFile || !fs.existsSync(keyFile)) throw new Error('Provide --key-file <path to a file containing the ElevenLabs API key>');
  const apiKey = fs.readFileSync(keyFile, 'utf8').replace(/\s+/g, '');
  fs.mkdirSync(voiceDir, { recursive: true });
  let done = 0, failed = 0, fatal = null, bytes = 0;
  const started = Date.now();
  let next = 0;
  async function worker() {
    while (next < queue.length && !fatal) {
      const line = queue[next++];
      try {
        const clip = await tts(apiKey, line);
        fs.writeFileSync(path.join(voiceDir, line.key + '.mp3'), clip);
        done++; bytes += clip.length;
        console.log('[' + done + '/' + queue.length + '] ' + line.key + ' ' + line.id + ' (' + line.text.length + ' chars, ' + Math.round(clip.length / 1024) + ' KB)');
      } catch (err) {
        if (err.fatal) { fatal = err; break; }
        failed++;
        console.error('FAILED ' + line.id + ': ' + err.message);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const n = writeOutputs(all, tables);
  console.log('\nRecorded ' + done + ' clips (' + (bytes / 1048576).toFixed(1) + ' MB) in ' + Math.round((Date.now() - started) / 1000) + 's; failed ' + failed + '. voice.logic now lists ' + n + ' voiced line ids.');
  if (fatal) { console.error('\nStopped early: ' + fatal.message + '\nRun again later; recorded clips are kept and only the missing ones are requested.'); process.exitCode = 2; }
  else if (failed) process.exitCode = 1;
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
