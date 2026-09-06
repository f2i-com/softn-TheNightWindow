# Build tools

Copies of the scripts the game needs to build and validate without a softn.com checkout,
taken from f2i-com/softn.com@efdd21b (`apps/demo/scripts/`). The provenance is on the first line of each copy.

| File | Role |
| --- | --- |
| `pack.cjs` | Packs `bundle/` into a `.softn` archive with the same ZIP writer and rules as softn.com's `build-bundle.cjs`. |
| `bundle-source-composer.cjs` | Mirrors how loaders compose the manifest's logic files into one program; used by the validator. |
| `test-bundle.cjs` | The structural validation the SoftN loaders apply: `node tools/test-bundle.cjs dist/TheNightWindow.softn`. |
| `sfx-lib.cjs` | The tone/noise synthesizer behind the offline sound fallback (`bundle/assets-src/make-sfx.cjs`). |
| `register-night-window.cjs` | Adds the game to a checkout's demo catalogue, API seeder and demo test command without replacing other entries. |

When softn.com changes these scripts, refresh the copies here and note the new commit.
