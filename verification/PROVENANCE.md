# Verification and source provenance

Release date: 2026-09-06. Upstream repository: https://github.com/f2i-com/softn.com

## Source access boundary

The container could not resolve GitHub for `git clone`. Archive and binary/dependency retrieval also failed. Public source views were available through the browsing tool, so the implementation was based on actual source inspection, but **not a complete, pinned local checkout**. No upstream commit ID is asserted for this overlay and no remote repository was changed.

The files under `upstream/apps/demo/scripts/` are captured copies of the repository's public build/composition/audio helper source used for this isolated build. They are not a full source checkout and were not authenticated byte-for-byte against a git object. They are included for reproducibility and attribution, not installed over the target checkout's own scripts.

- `build-bundle.cjs`: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/demo/scripts/build-bundle.cjs
- `bundle-source-composer.cjs`: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/demo/scripts/bundle-source-composer.cjs
- `sfx-lib.cjs`: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/demo/scripts/sfx-lib.cjs

These helpers are part of SoftN, whose root package declares Apache-2.0. The release includes that license. The game does not use a separate Python/manual ZIP constructor to build its `.softn`; its output comes from the captured upstream builder, and the installer rebuilds with the destination checkout's own builder.

## Relevant inspected implementation

Actual source review covered the current core runtime/bridge and bundle machinery, components, web runtime, demo scripts, permissions, asset/audio loading, local persistence, state projection and advanced demo patterns. Particularly relevant references for the delivered implementation:

- Core scripting bridge: https://raw.githubusercontent.com/f2i-com/softn.com/main/packages/@softn/core/src/runtime/script-runtime.ts
- App root sizing/overflow: https://raw.githubusercontent.com/f2i-com/softn.com/main/packages/@softn/components/src/layout/App.tsx
- Box layout and event forwarding: https://raw.githubusercontent.com/f2i-com/softn.com/main/packages/@softn/components/src/layout/Box.tsx
- Web entry and bundle identity: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/softn-web/src/App.tsx
- Web runtime runner: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/softn-web/src/components/AppRunner.tsx
- Directory seeder: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/softn-api/lib/seed.php
- Demo index: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/softn-web/public/demos/index.json
- Demo commands: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/demo/package.json
- Bundle validator: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/demo/scripts/test-bundle.cjs
- All-bundles validator: https://raw.githubusercontent.com/f2i-com/softn.com/main/apps/demo/scripts/test-all-bundles.cjs

The last two validator sources were read, **not successfully executed**. Their prerequisites/full checkout were unavailable. Standalone archive integrity checks do not replace those validators or native runtime acceptance.

The reference game was used only as a genre reference. No reference-game text, art, audio, names or code was incorporated. No user's other game assets were reused.

## Reproducing the isolated checks

Run from the extracted source release:

```sh
node repository/apps/demo/bundles/TheNightWindow/tests/run-tests.cjs
node repository/apps/demo/bundles/TheNightWindow/tests/bench.cjs
python verification/check-bundle.py
node verification/check-installer.cjs
```

The installer test constructs a temporary path/schema fixture, adds the captured upstream builder, and exercises installation/rebuilding/tests/conflicts/backups. It is **not** a full-repository test.

`check-layout.py` requires Python Playwright plus Chromium. It uses `layout-proof.cjs` to produce temporary noninteractive HTML snapshots of the game's native templates and then measures those snapshots. Generated HTML is excluded from the release; it is not a playable HTML port. `check-scroll.py` then measures scrolling and hit-testing within the clipped App-height approximation. Both scripts currently use `/usr/bin/chromium`; adjust that executable path on another system.

The source release's proof PNGs are labeled `layout-proof-*` for this reason. The directory thumbnail is original cover art, **not a native screenshot**. The optional `tests/native-acceptance.py` will produce native screenshots and a native result only when actually run against the real SoftN runtime.
