> In this repository: `npm test`, `npm run build`, `npm run validate`. The checkout paths below apply after `npm run install-into -- <checkout>`.

# Testing The Night Window

## Status of this source release

**45 Node model/content/integration tests passed. The actual SoftN/ZIPP browser acceptance test has NOT been executed.** The complete checkout, native engine artifacts and dependencies could not be retrieved in the build environment. Static Chromium snapshots are layout approximations, not a replacement game and not evidence of native event dispatch or ZIPP compatibility. See the release-root `VALIDATION.md` for logs and limitations.

## Deterministic game tests

From the actual repository root:

```sh
node apps/demo/bundles/TheNightWindow/tests/run-tests.cjs
node apps/demo/bundles/TheNightWindow/tests/bench.cjs
```

`harness.cjs` joins exactly the manifest's twelve `.logic` files and executes them in Node's isolated V8 context with explicit audio and storage stubs. The audio stub answers `play` with a handle, keeps `whenEnded` watchers so a test can end a clip (`e.endAll()`), and records every call in `e.sounds`. This exercises the implemented rules and SoftN adapter functions, but **does not emulate or validate ZIPP, React rendering or the permissions bridge**.

Tests cover roster/document references; all dialogue prerequisites and required story encounters; memory delivery; portrait eligibility; 10,000 deterministic generated cases; the guided first shift (every step, out-of-order steps, skip, replay, persistence); one-time tips; voice playback (no overlap, mute, voice volume, replay, briefings chained into Marr's note, endings, witness calls, outer-queue lines); denial and quarantine harm; the injured-resident consequence; intercom availability; HOLD limits; scanner uncertainty; camera/blackout; immutable original paperwork; later dialogue; appeals; all seven nights; save/reload at every case; six reachable endings and the circuit decision; arcade scoring and bounded history; corrupt/missing/quota-limited saves; reset; settings; UI projection secrecy; every asset listed and present; MP3/WAV integrity and the rain seam; a recorded clip for every scripted line and no orphaned clips; the bundle staying under the runtime's remote size limit; handler references; catalogue registration and conflict safety; in-memory resume after storage failure.

The model performance diagnostic reports V8 timings only. It is not a browser frame-rate or ZIPP throughput benchmark.

## Existing repository validation and build

After installing the overlay and the repository's normal dependencies:

```sh
node apps/demo/scripts/build-bundle.cjs TheNightWindow
node apps/demo/scripts/test-bundle.cjs TheNightWindow
npm test -w @softn/demo
npm run build:packages
npm run build:site
```

Registration adds `test:night-window` to the existing demo test command without removing its other tests. The existing all-bundles validator should discover the new canonical bundle normally. The installer deliberately rebuilds using the target checkout's builder, not a custom ZIP writer.

## Native browser acceptance driver — supplied, not executed here

`tests/native-acceptance.py` drives the **real** SoftN web application through its native controls. It does not inject game state, provide a fallback renderer, or evaluate the game program in browser JavaScript. It uses a clean temporary browser context, so the reset test does not touch an existing personal save.

Install Python Playwright in an isolated environment:

```sh
python -m venv .night-window-test-env
# Activate that environment using your platform's normal command.
python -m pip install playwright
python -m playwright install chromium
```

Start the existing SoftN site/runtime. Supply its actual local URL; for a full site preview, a typical URL is:

```sh
python apps/demo/bundles/TheNightWindow/tests/native-acceptance.py --url "http://localhost:4173/web/?open=/demos/TheNightWindow.softn" --headed
```

The port is an example: use the one printed by the repository's preview server. In standalone web development the base path may instead be `/`. The URL must open the actual built bundle through the normal runtime.

The driver is intended to exercise two full 49-case routes (survivor and purge), first-case tutorial/comparison/HOLD, all final dispositions, questions, tool unlocks, source tabs, reload/continue, mobile tabs, ending collection, arcade reload, settings and reset. It records case progress, actual browser errors and a failure screenshot. Only syntax-checking of the driver was performed in this release; selectors or timing may need adjustment when first run against the real runtime. Do not mark this test green without running it.

## Human native-runtime acceptance checklist

Run the built file through both the normal file picker and the installed directory entry. No special preview HTML is included or needed.

1. New game: sign in, compare Ada's card and register and ask follow-ups. HOLD must retain the visitor; a final decision must ask for confirmation and advance once.
2. Night one: check Mara's expired permit against the counterfoil; inspect the false Tomas's reversed scar using image and text; exercise one denial and one quarantine. A discrepancy alone is not a classification.
3. Progression: finish night one; verify the next briefing and intercom unlock. Finish night three and confirm the later tools. Check blackout/battery lamp and camera comparison.
4. Save: type a personal note, leave the field, open the menu, reload and continue. Verify the same encounter, transcript, selected evidence and persistent preferences. Test blocked storage and corrupt saves in an isolated profile.
5. Consequences: revisit someone denied or detained; inspect unavailable-witness recordings, appeals and the injured visitor outcome. Compare rewritten terminal data with the independent original.
6. Endings: complete a protective route, a severe-harm route and an evidence-gated route. On the true route, verify all three circuit choices. Returning to the menu must retain the collection.
7. Arcade: use the same seed in two new queues and compare cases. Test good/bad decisions, streak reset, later sophistication, save/continue and local high score.
8. Layout/accessibility: use keyboard, touch and 320/390/768/1440 widths; scroll to every control in the constrained runtime. Verify captions, written visual clues, muted play, reduced motion, focus and readable document comparison. Listen to the sound assets and check loop transitions after a real user gesture.
9. Pacing: time a first complete playthrough, watch for dominant trivial strategies, and record ambiguous cases that felt arbitrary rather than investigable. The 60–120-minute target has not been measured.

## Layout proofs in the source release

The release's `verification/check-layout.py` renders thirteen model snapshots at five widths using the captured composition helper and approximated component structure. `check-scroll.py` checks every enabled control's reachability within the clipped App-height model. It found the missing inner scroller, which was fixed. These checks cannot catch native-parser/style scoping, asset resolver, worker/main bridge, event binding, focus restoration or real audio behavior.
