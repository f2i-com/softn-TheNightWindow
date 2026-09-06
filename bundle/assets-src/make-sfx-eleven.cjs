#!/usr/bin/env node
'use strict';
/** Sound design for The Night Window through the ElevenLabs sound-generation API.
 *
 * Usage:
 *   node make-sfx-eleven.cjs --key-file "C:\path\to\ElevenLabs-API.txt" [--only rain,door] [--force] [--dry-run]
 *
 * One-shots are written as assets/sfx/<name>.mp3. The rain bed is fetched as raw PCM,
 * folded to mono, cross-faded into a seamless loop and written as assets/sfx/rain.wav,
 * because a WAV loops without the decoder gap an MP3 has. Existing files are kept unless --force.
 * make-sfx.cjs remains as the offline synthesized fallback.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sfxDir = path.join(root, 'assets', 'sfx');
const args = process.argv.slice(2);
function opt(name, fallback) { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; }
const keyFile = opt('--key-file', process.env.ELEVENLABS_KEY_FILE || '');
const only = opt('--only', '').split(',').map(s => s.trim()).filter(Boolean);
const force = args.includes('--force'), dryRun = args.includes('--dry-run');
const RATE = 22050;

const SOUNDS = [
  { name: 'rain', loop: true, seconds: 20, influence: 0.45, text: 'Steady rain against a reinforced glass window at night, heard from inside a small concrete security booth. Faint fluorescent tube hum and distant ventilation. No voices, no music, constant texture, seamless loop.' },
  { name: 'click', seconds: 0.6, influence: 0.5, text: 'Single soft click of a small plastic toggle switch on a 1980s desk console. Dry, close, short.' },
  { name: 'terminal', seconds: 0.8, influence: 0.55, text: 'Short two-note beep from a 1980s green-screen computer terminal accepting a keystroke. Clean, electronic.' },
  { name: 'paper', seconds: 1.2, influence: 0.5, text: 'A single sheet of paper slid across a felt desk and set down. Quiet office, close microphone, no voices.' },
  { name: 'door', seconds: 2.5, influence: 0.55, text: 'Heavy steel security door: electric bolts retract with a clunk, the door swings open, a hollow corridor echo. Industrial building, night.' },
  { name: 'contain', seconds: 3.0, influence: 0.55, text: 'Metal roller shutters descending and locking with a deep clank, followed by a low two-tone containment alarm chime. Institutional, ominous.' },
  { name: 'arrival', seconds: 2.0, influence: 0.5, text: 'Footsteps on wet concrete approaching and stopping, rain in the background, then a small brass desk bell rings once. Night, exterior heard through glass.' },
  { name: 'outage', seconds: 2.5, influence: 0.55, text: 'Fluorescent lights powering down with a fading electrical whine, a relay click, then silence with a faint ventilation hum. Power failure.' },
  { name: 'knock', seconds: 2.0, influence: 0.6, text: 'Three slow, deliberate knocks on a heavy steel door, heard from inside a small room. Ominous, evenly spaced, no voices.' },
  { name: 'ring', seconds: 2.5, influence: 0.6, text: 'Old 1980s office desk telephone with a mechanical bell ringing twice. Close, realistic, no voices.' },
  { name: 'hold', seconds: 1.0, influence: 0.5, text: 'Intercom acknowledgement: a rising two-note electronic chime, soft and institutional.' },
  { name: 'intercom', seconds: 1.5, influence: 0.55, text: 'Intercom button pressed, a burst of static, then an open telephone line hiss. 1980s apartment building intercom.' },
  { name: 'scan', seconds: 1.8, influence: 0.55, text: 'Handheld electronic scanner sweep: a rising analog tone, a short pause, then a single confirmation chirp. Retro science instrument.' },
  { name: 'camera', seconds: 1.2, influence: 0.6, text: 'Single 1980s 35mm film camera shutter click followed by a short motor film wind. Close, realistic.' },
  { name: 'alarm', seconds: 3.0, influence: 0.6, text: 'Industrial building alarm bell ringing continuously with a slight metallic rattle, heard from a corridor. Urgent, no voices.' },
  { name: 'printer', seconds: 2.2, influence: 0.55, text: 'A 1980s dot-matrix printer prints one short line of text, then a sheet of paper is torn off. Office desk, close microphone, no voices.' },
  { name: 'dawn', seconds: 5.0, influence: 0.4, text: 'A soft, slowly rising warm synthesizer pad in a major key, like first daylight, fading out gently. Calm, hopeful, no drums.' },
];

function wavFromMono(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i]))), 44 + i * 2);
  return b;
}
/** Sound generation answers PCM as interleaved stereo 16-bit; fold it to mono and seal the loop seam. */
function loopWav(pcm, seconds) {
  const frames = Math.floor(pcm.length / 4);
  const mono = new Float64Array(frames);
  for (let i = 0; i < frames; i++) mono[i] = (pcm.readInt16LE(i * 4) + pcm.readInt16LE(i * 4 + 2)) / 2;
  const n = Math.min(frames, seconds * RATE), k = Math.min(Math.floor(RATE * 0.5), Math.floor(n / 4));
  // Overlap-add the tail into the head, then drop the tail: the file now ends where it began.
  const out = new Float64Array(n - k);
  for (let i = 0; i < n - k; i++) out[i] = mono[i];
  for (let i = 0; i < k; i++) { const p = i / k; out[i] = mono[i] * p + mono[n - k + i] * (1 - p); }
  // Normalize to a comfortable bed level.
  let peak = 1; for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = Math.min(1, 22000 / peak);
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  return wavFromMono(out);
}
async function generate(apiKey, s) {
  const format = s.loop ? 'pcm_22050' : 'mp3_44100_64';
  const body = { text: s.text, duration_seconds: s.seconds, prompt_influence: s.influence };
  if (s.loop) body.loop = true;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=' + format, { method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const text = await res.text();
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 2000 * attempt)); continue; }
    throw new Error('HTTP ' + res.status + ' ' + text.slice(0, 300));
  }
  throw new Error('rate limited repeatedly');
}
async function main() {
  const todo = SOUNDS.filter(s => (!only.length || only.includes(s.name)) && (force || !fs.existsSync(path.join(sfxDir, s.name + (s.loop ? '.wav' : '.mp3')))));
  console.log('Sounds to generate: ' + (todo.map(s => s.name).join(', ') || '(none)'));
  if (dryRun) return;
  if (!keyFile || !fs.existsSync(keyFile)) throw new Error('Provide --key-file <path to a file containing the ElevenLabs API key>');
  const apiKey = fs.readFileSync(keyFile, 'utf8').replace(/\s+/g, '');
  fs.mkdirSync(sfxDir, { recursive: true });
  let failed = 0;
  for (const s of todo) {
    try {
      const bytes = await generate(apiKey, s);
      const out = path.join(sfxDir, s.name + (s.loop ? '.wav' : '.mp3'));
      fs.writeFileSync(out, s.loop ? loopWav(bytes, s.seconds) : bytes);
      // A regenerated one-shot replaces the synthesized WAV of the same name.
      if (!s.loop && fs.existsSync(path.join(sfxDir, s.name + '.wav'))) fs.unlinkSync(path.join(sfxDir, s.name + '.wav'));
      console.log('wrote ' + path.basename(out) + ' (' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
    } catch (err) { failed++; console.error('FAILED ' + s.name + ': ' + err.message); }
  }
  if (failed) process.exitCode = 1;
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
