> This record was kept while the game was developed as an overlay for the softn.com checkout. Paths such as `repository/apps/demo/bundles/TheNightWindow/` correspond to `bundle/` in this repository, and `install.cjs` to `scripts/install-into-softn.cjs`.

# The Night Window — implementation and validation report

## 2026-09-06 update: what changed and what was actually run

Changes: ElevenLabs voice acting for all 508 scripted lines (443 clips), ElevenLabs sound effects and rain loop, a guided first shift with spoken steps, one-time tip cards, an in-game guide, a voice bar with replay, separate voice volume, and a clearer desk (progress strip, tab hints, comparison badge, decision captions, locked-tool labels, header labels). New files: `logic/tutorial.logic`, generated `logic/voice.logic`, `assets/voice/*.mp3`, `assets-src/make-voice.cjs`, `assets-src/make-sfx-eleven.cjs`, `assets-src/voice-lines.json`. The manifest now lists 12 logic files and 768 assets.

Run and passed on this machine (Windows 11, Node 22.15.0, the real `softn.com` checkout with dependencies installed and packages built):

| Check | Result |
| --- | --- |
| `node install.cjs <checkout>` (registration, rebuild with the checkout's `build-bundle.cjs`, game tests) | Installed; bundle 21,211,109 bytes, 788 files |
| `node tests/run-tests.cjs` (49 tests: game, content, integration) | 49 / 49 pass |
| `node apps/demo/scripts/test-bundle.cjs bundles/TheNightWindow.softn` | PASS: complete, current, parseable |
| `npm test -w @softn/demo` (all bundles, validators, Promptly audio, Night Window tests) | exit 0 (`verification/browser-playthrough-2026-09-06/demo-suite.log`) |
| Playwright against `npm run dev:web` at `http://localhost:1420/?open=/demos/TheNightWindow.softn` | Menu, guide, briefing, all seven guided steps, admission, receipt, second visitor tip, settings, 390-px tabs, save/menu/continue: 0 console errors, 0 page errors, 22 / 22 audio plays accepted (`report.json`, screenshots) |
| ElevenLabs generation | 440 clips in 330 s, 0 failures; 16 sounds (`elevenlabs-generation.log`) |

Not run: a timed human playthrough; the Rust/Tauri desktop loader; `npm run build:site`. Audio was verified as accepted by the browser (play() resolved, clip durations 0.6 s to 40 s), not listened to by a person.

### Sixth round, same day: the queue dealt afresh

- Every new campaign takes a fresh seed and plays each night's visitors in a seeded order: night one opens with Ada or Ruth (both genuine, with clean paperwork), later nights keep their opening case, night seven keeps Orin last, and sixteen pairs of cases that refer to one another keep their authored order; the rest is shuffled. Seed 198917 remains the authored order for the tests and the smoke script. The briefing shows the roster seed. The four tutorial lines that named Ada were reworded and re-recorded so the guided shift fits any opener.
- A new test walks 300 seeds (valid permutations, nights in sequence, a genuine opener, pinned openers and closer, every pair in order, more than 250 distinct orders, both openers seen and no others), plays a full campaign on another seed to the finale with all fourteen pieces of evidence and ten memories and all five explicit routes open, and checks that a reload deals the same queue. 52 / 52 Node tests.
- The browser driver no longer assumes Ada: it reads the first visitor's name, asks the first question, and after a reload waits for the same second visitor to return (`report.json`, `first_visitor`, `second_visitor`).

### Fifth round, same day: the form in three pages

- Form 17-B is paged so that nothing on it needs scrolling: page 1 "Against the register" (name, date of birth, apartment, resident ID), page 2 "The person at the window" (feature, eyes, face), page 3 "Papers and filing" (return slip, the two automatic rows, Send to head office). A page strip at the top shows each page's progress ("1 Register · 2/4", "✓" when complete) and turns pages on press; Previous / Next page buttons and a "Page n of 3" counter sit in the footer; a completed page turns itself over with a caption and the paper sound; a soft fade marks any remaining overflow. The guided shift jumps to page 3 once every row is marked; a new visitor starts on page 1.
- 51 / 51 Node tests, including page counts, automatic turning, manual turning, clamping and the reset per visitor. Playwright recorded the page strip through a full form (`report.json`, `form_pages_seen`): 17 stages, 0 console errors, 0 page errors, reload still served from the catalogue, no button below 4.5:1.

### Fourth round, same day: floating form and the reload 404

- Form 17-B is now a floating panel. On screens wider than 1120 px it docks at the right and the desk narrows beside it (two columns, terminal below), so it never covers a control; on tablets and phones it is a bottom sheet above the signature bar. Minimise folds it to a pill that shows progress; the guided shift reopens it when it needs it. Playwright confirmed the panel keeps its viewport position while the desk scrolls (`form_fixed_while_scrolling`) and that folding and restoring work.
- Reloading `/app/The Night Window` in a development checkout logged `Failed to fetch bundle … /api/apps/The%20Night%20Window/bundle.softn (HTTP 404)`: the runtime asks the directory API for the bundle by name, and a checkout without PHP has no API, so every demo fell back to its cached copy with an error. The runtime (`apps/softn-web/src/App.tsx`, outside this overlay; diff in `verification/runtime-patch/`) now reopens a shipped demo from `public/demos/index.json` — first in development, and in production only after the API says no — using the API's own slug rule. Typecheck passes, the web unit tests pass (95 / 95), and lint reports only the two `console.info` warnings the file already had. Playwright's reload made requests to `/demos/index.json` and the bundle only, with no `/api` request and no console error (`report.json`, `reload`).
- The other line in that console, `Unchecked runtime.lastError: The message port closed before a response was received`, comes from a browser extension, not from the runtime or the game.
- 51 / 51 Node tests; 17 browser stages, 0 console errors, 0 page errors.

### Third round, same day: form 17-B

- New `logic/checklist.logic` (pure model) and adapter handlers; the turn carries `checklist` marks and `checklistSent`, validated on decode. 51 / 51 Node tests, including compare/mark/file, the signature gate, reload, a forged sent flag, the ledger entry and the outer queue.
- Three head-office acknowledgements recorded (Roger), three tutorial lines re-recorded, one printer sound generated; 446 clips, 511 voiced ids.
- Playwright: the guided shift now runs Compare → Matches → Observe → question → an ADMIT attempt that head office refuses → all rows marked → Send form 17-B → filed → ADMIT → receipt showing the filed form. See `detail-checklist-compare.png`, `detail-checklist-filed.png` and `report.json` (`gate_blocked`).

### Second round, same day (feedback)

- Spoken text no longer contains shouted words: the generator lower-cases ALL-CAPS words (DENY, ADMIT, HOLD, OBSERVE…) for speech only, so the model reads them as words rather than names. 78 clips re-recorded, 0 failures, orphans pruned (`elevenlabs-rerecord.log`).
- The intake photograph now belongs to the terminal's Register record (phosphor-tinted, scanlined); the card the visitor hands over carries a "photo held on terminal record" box; Observe shows the visitor as seen now and compares stills against the photograph on file.
- The terminal is a CRT: bezel, function-key tabs (F1 Register … F7 Notebook), scanlines, vignette, phosphor glow, query prompt, blinking caret (disabled under reduced motion), inverse-video selection.
- HOLD moved from the signature bar into Tools as "Ask the outer desk"; locked tools (intercom night 2, scanner and camera night 4) are clickable and explain when they arrive; every tool result appears in a desk log beside the tools.
- Contrast: the light-on-light "Hear Marr's note" button on the paper note was fixed; a WCAG contrast audit over every enabled button on the menu, briefing, desk (56 buttons), settings and phone layout found none below 4.5:1 (`report.json`, `contrast`).
- Re-run of the Playwright playthrough: 15 stages, 0 console errors, 0 page errors, 24 / 24 audio plays accepted. 50 / 50 Node tests; bundle 21.3 MB.

## Release status

**Game source implemented and `.softn` packaged; native SoftN/ZIPP acceptance remains unverified.** This is an additive source overlay, not a completed GitHub commit or a full repository checkout. It does not meet the requested “actually playtested in the native runtime / all existing repository builds passing” acceptance condition yet. The implementation and the gaps are separated below.

The environment could read actual public repository sources, but `git clone`, archive retrieval and binary/dependency access failed. Captured copies of the upstream builder, source composer and SFX library were used. No ordinary React/HTML game, hidden fallback host or host-specific core patch was substituted. Nothing was pushed, published or deployed to softn.com.

## Implemented game

**The Night Window**, November 1989. The player handles the graveyard security window of Meridian-17 after the Echo Rain. The campaign shifts from identifying suspicious returns to investigating a census/reference service that can rewrite its own evidence.

| Content/system | Implemented |
| --- | --- |
| Campaign | Seven nights, 49 curated encounters |
| Cast | 20 recurring residents with relationships, schedules, private histories and suspicious human explanations |
| Dialogue | 295 authored nodes, follow-ups, approach selection, moods and prior-decision reactions |
| Anomalies | 36 reusable types across identity, document, appearance, behaviour, temporal and rare physical clues |
| Endings | Six explicit routes, separate scene artwork and three-step sequences; interactive circuit choice on the true route |
| Replay | Seeded endless queue, increasing tiers, accuracy/false-positive metrics, streak, efficiency, local high score and separate save |
| Investigation | Selectable cross-source facts, card/return slip, observations, independent archive/counterfoil, resident directory, phone, limited scanner and camera |
| Consequences | Trust, harm, breaches, resident presence, unavailable witnesses, custody appeals, memories, secrets and collaborator-dependent routes |
| Persistence | Versioned validated saves, checksum, previous-good backup, missing/corrupt/quota handling, settings, ending collection and reset |
| Accessibility | Captions, written equivalents for important visual clues, keyboard focus, mobile tabs, reduced motion, volume/mute, no reading timers |
| Assets | 300 original portrait variants, seven scene SVGs, icon/cover art and 16 synthesized mono WAVs; 325 bundled assets total |

The campaign's six endings are **The Locked Dawn**, **The Quiet Building**, **Every Window Lit**, **The Other Frequency**, **A Chair at the Table**, and **The Unrecorded Morning**. The true route requires an independent evidence chain and particular surviving collaborators, not only a final score. A 60–120-minute first playthrough remains a design target: no timed human playthrough was performed.

The 16 audio assets cover ambience/rain, terminal/paper, doors, containment, arrival, outage, knocking, ringing, hold/intercom, scan/camera, alarm and dawn. WAVs were generated using the existing synthesized-SFX helper. No borrowed audio, voice, artwork or font files are included.

## Files and integration

Game source is under `apps/demo/bundles/TheNightWindow/`: six native `.ui` templates, ten ordered `.logic` files, `manifest.json`, `permission.json`, original `assets/`, reproducible `assets-src/`, tests and documentation. Canonical and served `.softn` copies plus an icon and cover thumbnail are included in the overlay.

`apps/demo/scripts/register-night-window.cjs` preserves and updates the shared demo index, the PHP seeder's games/tags mapping and the demo package test scripts. The source release's `install.cjs` applies that overlay, checks schemas/conflicts, keeps backups, invokes the destination checkout's own bundle builder and runs the game tests. These scripts were exercised in an isolated integration fixture. **They have not modified your live repository or production directory.**

No SoftN core files were changed. No native runtime bug is claimed to have been reproduced or fixed. The repaired constrained-root scrolling issue was in this game's layout, not a defect in SoftN's App wrapper.

## Tests actually executed

| Check | Actual result | Boundary |
| --- | --- | --- |
| Node model/content/integration tests | **45/45 passed**, no skipped tests | Node/V8 with explicit storage/audio stubs; not ZIPP |
| Seven-night rules path with reloads | Passed | Same implemented `.logic` functions in Node |
| All six ending routes | Reachable in tests | Model-level campaign paths; not browser playthroughs |
| Procedural cases | 10,000 seeded cases checked | Reference, compatibility, determinism and detector invariants; not subjective balancing |
| Endless history/scoring | 510-case bounded-history run passed | Node model |
| Static responsive layout | **65 layouts passed**, widths 320, 390, 768, 1280, 1440 | Approximated native component DOM, not SoftN renderer |
| Constrained-shell scrolling | **65 layouts / 1,536 enabled controls passed** | Static scroll/hit tests in Chromium; not native event dispatch |
| Archive integrity | CRC, manifest/source parity, served parity passed | Structural archive checks only |
| Upstream bundle helper | Run repeatedly; matching output | Captured source copy, not a full checkout |
| Installer | Dry-run, install/rebuild, 45 tests, idempotence, conflict refusal and backup replacement passed | Temporary schema/path fixture, not native core build |
| Native acceptance driver | Python syntax checked | **Not run against SoftN** |
| Existing demo suite / package builds / site build | **Not run** | Full checkout/dependencies unavailable |
| Native `.softn` playtest and audio playback | **Not run** | Actual runtime unavailable |

Evidence files: `verification/tests.tap`, `bundle-results.json`, `layout-results.json`, `scroll-results.json`, `installer-results.json`, `installer-test.log`, `performance.json`, `build.log` and `rebuild.log`. The source-review/captured-helper boundary is documented in `verification/PROVENANCE.md`.

## Measured performance

Measurements were taken on **v22.16.0 / V8**, Linux, AMD EPYC 9V74 80-Core Processor. They are not ZIPP measurements and do not establish native frame rate, CPU use or launch latency.

| Diagnostic | Median | 95th percentile |
| --- | ---: | ---: |
| 100 seeded case/document constructions | 2.1754 ms | 2.4251 ms |
| Refresh current native-UI projection | 0.1283 ms | 0.2757 ms |
| Autosave + checksum/backup + UI refresh | 0.3113 ms | 0.4465 ms |
| Decode and validate completed 49-case campaign | 0.8260 ms | 1.0879 ms |

The case-construction row is **a batch of 100**, not one case. Logic source is 273,680 UTF-8 bytes; the initial bound UI projection is 11,172 bytes. A tested completed-campaign save is 20,918 bytes (not a worst-case limit). Journals and decision history are bounded; animation uses CSS rather than per-frame VM calls.

## Bundle integrity

- File: `TheNightWindow.softn`
- Bytes: **3,756,085** (approximately 3.76 MB)
- Entries: **343**
- SHA-256: `dbc228c43f5a6e4722dcfb7dea7099cdc82ecde11eab69c14b91d8b6b96085bb`

The canonical and served bundles are byte-identical. All listed assets and source files match the build; the manifest comparison is semantic JSON because the builder normalizes its output formatting. The bundle format uses the repository helper's own ZIP-writing path. This integrity result does not imply successful parsing/execution in native SoftN.

## Fixes made during implementation/checking

Corrected generated archive responses that leaked too much certainty; added independent corroboration for mundane errors; made private memories appear in reachable dialogue before being retained; constrained physical anomalies to compatible baselines; preserved the real resident after quarantining an impersonator; retained historical witness labeling after earlier detention/death; made appeals one-shot; preserved the original record across terminal rewrites; fixed camera portrait cropping and snapshot/expression separation; removed mobile header overflow; gave the game its own scroller inside SoftN's clipped App container; and prevented menu resume from rolling back in-memory progress after a storage-quota failure.

## Remaining acceptance and worthwhile improvements

The required next acceptance step is running the built file in the actual SoftN/ZIPP runtime and resolving any issues found there. `tests/native-acceptance.py` and the detailed native checklist in `TESTING.md` are supplied, along with full-checkout commands. Confirm event bindings, scoped styles, source composition, real audio gestures, saves, browser reloads, all routes, and direct/directory opening. Run the existing repository tests and build commands; no green result is claimed for them here.

Then perform a timed first-playthrough and independent clue-balance review. The model tests establish consistency and reachability, not whether the pacing feels right. Further optional work includes more bespoke visual poses/lighting and a moderated shared arcade leaderboard. Freely draggable documents, voice acting and an online leaderboard are not implemented; the current choices favour readable touch-friendly comparison, originality and offline play.
