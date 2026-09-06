# The Night Window

An original, offline-capable narrative observation game for SoftN. Seven graveyard shifts at Meridian-17 turn the question “Who is this person?” into “Who controls the record that tells me?”

## Playing

The first new game runs a **guided first shift**: seven short steps, spoken by the narrator, that walk through the papers, the terminal, the comparison rail, the interview and the first signature. It can be skipped at any time and replayed from Settings or the Guide. The night that introduces a new mechanic (counterfoil, intercom, archive, scanner, appeals, disclosed Echoes) opens with a one-time tip card. The **Guide** button in the header is a plain-language reference for every paper, terminal panel, tool and signature.

Every resident, the narrator and the previous guard are **voiced**: 508 scripted lines, recorded with ElevenLabs text-to-speech from the game's own dialogue tables. A line with no clip is simply silent; the text is always on screen, and the bar under the header shows who spoke last with a replay button. Voice volume is separate from effects and ambience.

Every visitor requires **head office form 17-B**: eight rows to verify (name, date of birth, apartment and resident ID against the register; feature and eye colour against Observe; the face against the photograph on file; the return slip against the counterfoil). Compare on a row lays the two sources side by side and highlights both facts; mark the row Matches, Differs or Unclear. No signature opens until the form is sent to head office, which acknowledges by voice, and the filed form goes into the notebook.

Every new campaign deals the queue afresh from a seed shown on the briefing: the same seven nights, each night's visitors in a different order, Ada or Ruth first (both genuine, with clean paperwork), and the cases that refer to one another kept in sequence. A reload deals the same queue.

Start a new campaign and sign in. Select labeled fields on different documents to place them on the comparison rail; pin useful comparisons. Switch between the resident card, return authorization and written/live observations, with the current index and independent retained documents alongside them. Questions unlock contextual follow-ups. A gentle or forceful approach changes a resident's response; it is not an identity test.

ADMIT opens the inner gate. DENY returns a person outside. QUARANTINE orders detention. HOLD spends one of two shift resources on further evidence **without** ending the case. All final decisions require confirmation. Human mistakes, lies and false-positive scanner readings are intentional. The consequences concern particular people, not only a total score.

Intercom testimony starts on night two, archive access on night three, and the uncertain scanner/camera on night four. Notes and memories survive between nights. Some witnesses are unavailable because of your earlier decisions; a dated recording is never presented as a live witness. Later appeals can release innocent residents without erasing the harm already done.

There are no timed dialogue choices, reflex requirements or sound-only clues. Body-side descriptions refer to the visitor's own left and right. Every important visual discrepancy also has written evidence. On a phone, Window, Papers and Terminal become tabs; the app owns its vertical scroller inside SoftN's clipped App container.

## Campaign and replay

The campaign has 20 residents, 49 authored encounters, 295 dialogue nodes, seven nights and six endings with distinct illustrated, interactive scene sequences. An independent paper trail and remembered private details become increasingly important. Completing any ending unlocks a seeded endless queue with 36 reusable anomaly types, increasing sophistication, investigation efficiency, streaks, false positives, correct admissions/detections and a local high score.

A first-playthrough duration of 60–120 minutes is a **design target, not a measured claim**. Model automation does not assess reading pace or horror effectiveness.

## Build and test

In this repository:

```sh
npm ci
npm test           # 52 deterministic tests
npm run build      # dist/TheNightWindow.softn
npm run validate   # the structural check the SoftN loaders apply
```

Inside a softn.com checkout (after `npm run install-into -- <checkout>`), from the checkout root:

```sh
node apps/demo/scripts/build-bundle.cjs TheNightWindow
node apps/demo/bundles/TheNightWindow/tests/run-tests.cjs
node apps/demo/scripts/test-bundle.cjs bundles/TheNightWindow.softn
```

## Recreate original assets

```sh
python bundle/assets-src/make-art.py
npm run sfx -- --key-file path/to/ElevenLabs-API.txt
npm run voice -- --key-file path/to/ElevenLabs-API.txt
```

`make-voice.cjs` derives every spoken line from the content tables (residents, campaign, nights, endings, tutorial, tips), records only the clips that are missing, writes `logic/voice.logic` (line id → clip) and refreshes the manifest's asset list. Stage directions outside curly quotes are not spoken by the character; a trailing notebook summary is stripped. Casting and voice settings live at the top of the script, and `assets-src/voice-lines.json` is the reviewable script of the whole cast. Narration is 44.1 kHz / 64 kbps; resident dialogue, openings and witness calls are 22.05 kHz / 32 kbps, which keeps the bundle under the web runtime's 32 MB limit. `--dry-run` prints what would be recorded without contacting the API; `--group` limits the run; `--prune` deletes clips whose line no longer exists.

`make-sfx-eleven.cjs` generates the fifteen one-shot effects as MP3 and the rain bed as a seamless 22.05 kHz WAV through the ElevenLabs sound-generation API. `make-sfx.cjs` remains as the offline synthesized fallback (it writes WAVs; the adapter expects `.mp3` one-shots, so rename or adjust `nwSfxFile` if you use it). The API key is read from a file outside the bundle and never written anywhere. Regenerate and rebuild after changing assets; tests reject missing, unlisted or orphaned assets and require a clip for every scripted line.

## Persistence and permissions

Versioned, validated local campaign and arcade saves are separate. Each has a previous-good backup. Settings, unlocked endings and the local high score are stored separately. New Game preserves the ending collection and preferences; Reset Save removes only this game's keys. Invalid saves trigger recovery or an understandable error rather than an unchecked load. Storage failures leave the current session playable in memory; returning from the menu prefers the latest in-memory session.

No network, server-storage, camera, microphone or arbitrary host permissions are requested. The in-fiction camera and scanner do not use real devices. Audio uses bundled generated files through SoftN. `config.execution: "main"` requests the current synchronous localStorage-compatible path; `.logic` still runs in ZIPP, not browser JavaScript.

The web runtime scopes storage to bundle identity. Rebuilding changes that identity; a new bundle revision may not automatically see an old revision's saves. Do not weaken the runtime's identity isolation to work around this. Use the host's migration facilities where available.

## Originality and scope

Original fiction, residents, documents, interface and illustrations. Voices and sound effects are generated from the game's own text with ElevenLabs (premade voices; no cloned or third-party recordings). Inspired by the broad observation/document-inspection horror genre, not by another game's protected characters, artwork, dialogue, lore or recordings. No third-party game assets are included. Paperwork is snapped into readable panels rather than freely draggable. There is no account dependency, remote leaderboard, 3D scene or external fallback game.

The source follows the parent repository's Apache-2.0 licensing. See `DATA_MODEL.md` for extension points and `SPOILERS.md` for content-authoring/ending checks.
