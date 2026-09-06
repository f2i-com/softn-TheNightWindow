# Data model and extension guide

## Execution and file order

The bundle's manifest lists ten `.logic` files in dependency order. The source composer combines them into the ZIPP program. This is deliberate module separation by source file, **not** reliance on browser ES module imports. The entry `.ui` references the adapter; manifest-listed logic paths avoid duplicate inclusion through the normal composer.

| File | Responsibility |
| --- | --- |
| `residents.logic` | Public baseline identity, appearance, relationships, schedule, personality, private background and secrets. |
| `anomalies.logic` | The reusable anomaly catalogue: IDs, categories, targets, observable difference and independent detection route. |
| `nights.logic` | Seven shift briefings, prior-guard notes, weather, incidents and tool introductions. |
| `campaign.logic` | Curated case configuration, document overrides, authored dialogue, witnesses, evidence and story decisions. |
| `rules.logic` | Pure encounter/progression/choice/relationship/presence rules and bounded journals. |
| `documents.logic` | Derived document views, fact selection and two-source comparisons. |
| `arcade.logic` | Seeded case construction, escalating tiers and compatible anomalies. |
| `endings.logic` | Explicit final routes, prerequisites, illustrated scene steps and circuit interaction. |
| `save.logic` | Versioned serialization, checksum, validation, backup recovery and metadata settings (including voice volume, tutorial completion and seen tips). |
| `checklist.logic` | Head office form 17-B: the eight rows every visitor requires, marking, readiness, filing and the acknowledgement lines. Pure model. |
| `tutorial.logic` | Guided first shift steps, one-time tips per case, the finale text and the in-game guide. Plain content tables. |
| `voice.logic` | **Generated** by `assets-src/make-voice.cjs`: spoken line id → clip key under `assets/voice/`. Never edit by hand. |
| `main.logic` | Thin SoftN adapter: UI selections/projections, persistence, `softn.audio` effects, voice playback, tutorial progression and tips. |

The manifest lists thirteen `.logic` files; `checklist.logic` follows `documents.logic` (it uses `nwFact`), `tutorial.logic` precedes `voice.logic`, and `main.logic` is always last.

## Form 17-B

`NW_CHECKLIST` defines eight rows. A pair row names two fact ids (`card:name` against `record:name`, `card:feature` against `live:feature`); Compare puts both on `turn.selected`, marks their sources seen, and switches the paper tab and terminal panel so both facts are highlighted. A view row (`photo`, `permit`) opens the two panels the player must read with their own eyes. Marks are `match`, `differs` or `unclear`; marking a marked row again clears it. `NW_CHECKLIST_AUTO` rows (asked a question, corroborated) are derived from the turn and never block filing. `nwChecklistFile` requires all eight marks, sets `turn.checklistSent`, and writes a `FORM 17-B` journal entry with the summary. The adapter refuses `nwRequestDecision` until the form is sent; the pure `nwResolve` is unchanged so tests and the smoke run can still drive the model directly. Marks and the sent flag survive save/reload; a sent flag without a complete form is dropped on decode. Head office acknowledges by voice (`office/<n>`, rotated by cursor) over the desk printer sound. The form is rendered as a fixed-position panel (`.nw-form-pop`) outside the desk grid; `nwFormOpen` folds it to a pill, and while it is open on a wide screen the root carries `nw-form-docked`, which narrows the desk so the panel never covers a control. A stub in the desk flow shows progress and reopens the form. Rows carry a `page` (1 to 3, see `NW_FORM_PAGES`); the adapter keeps `nwFormPage`, turns a page by hand (`nwFormPageSet`, `nwFormPagePrev`, `nwFormPageNext`), turns a completed page over by itself after a mark (`nwFormAutoTurn`), resets to page 1 for each visitor, and lands on the last page when the guided shift reaches filing with every row marked. The automatic rows and the Send button live on the last page.

## Voice

Line ids are stable and derived from content: `reply/<caseId>/<nodeId>`, `opening/<caseId>`, `call/<caseId>`, `brief/<night>`, `note/<night>`, `incident/<night>`, `ending/<routeId>/<step>`, `finale`, `tutorial/<stepId>`, `tip/<caseId>`, and for the outer queue `arcade-voice/<residentId>`, `arcade-gentle/<residentId>`, `arcade-press/<residentId>`. Clip keys are `<speaker>_<sha1(speaker|text)[:8]>`, so an unchanged line keeps its clip and several ids can share one (every resident's shared "press" reply is one clip per resident, not one per case). `nwSpeak(id, speaker, nextId, nextSpeaker)` stops any current line, plays the clip at the voice volume, and plays the follow-up once the first has ended on its own; a missing clip falls through to the follow-up. Only the resident's quoted words are spoken when a reply carries a stage direction; the memory summary appended to a reply is not spoken. Adding or rewording dialogue means re-running the generator; tests require a clip for every scripted line and reject orphaned clips.

## Tutorial and tips

`NW_TUTORIAL` steps carry a `done` condition (`next`, `card`, `compare`, `observe`, `ask`, `decide`, `close`) and a `where` hint that selects the mobile tab. `nwTutorialSettle` runs after every event: it passes over every step the player has already satisfied, then speaks the step now due. Signing a decision at any point jumps to the receipt step; closing the first ledger entry, or skipping, sets `meta.tutorialDone`. Guidance only ever runs on the first campaign encounter. `NW_TIPS` is keyed by case id; a dismissed or resolved tip is remembered in `meta.tipsSeen`.

Only the rendered projection and small UI values are used by templates. The authoritative session and resident/case tables are not bound wholesale to the UI. There are no frame ticks, per-frame serialization, `Loop` components, `requestAnimationFrame`, arbitrary browser DOM calls, external games or network requests in the game program. CSS handles environmental motion.

## Resident definitions

`NW_RESIDENTS` is the sole baseline roster. Stable string IDs link cases and relationships. Keep public identity separate from private memories/secrets. The directory is a public address book, **not** a debugger exposing private facts needed to solve later cases. A document can be wrong without changing its owner's baseline data.

To add a resident, use an existing object as the complete schema, assign a unique ID and resident number, valid relationship IDs, and a plausible schedule. Add an art specification to `assets-src/make-art.py`, generate all required variants and add asset paths to the manifest. The procedural generator uses the whole roster; anomaly-specific eligibility must still hold. Update the exact-count tests intentionally.

Each resident has fifteen local SVG variants: base, eye, mole, scar, pupil, ear, hand, reflection, shadow, teeth, temperature, bandage, open, defensive and anxious. Not every resident is eligible for every physical discrepancy. For example, a missing ear notch needs an actual ear notch in the baseline. Expression changes must never overwrite a real appearance anomaly or a retained camera still.

## The order of the queue

`NW_CAMPAIGN` is authored in one order, but a campaign plays it in the order `nwCampaignOrder(seed)` deals from the session seed: the session's `cursor` indexes that permutation, never the table directly (`nwCaseAt`, `nwCampaignCase`). Nights stay in sequence. Night one opens with one of `NW_FIRST_VISITORS` (Ada or Ruth: genuine, with clean paperwork, so the guided shift never opens on a difference), later nights open with the case that introduces the night's mechanic (`NW_ORDER_FIRST`), night seven closes with Orin (`NW_ORDER_LAST`), and pairs of cases that refer to one another keep their authored order (`NW_ORDER_BEFORE`). Everything else in a night is shuffled with the same integer PRNG the outer queue uses. Seed 198917 is the authored order itself, which the tests and the smoke script rely on; a new campaign takes a fresh seed from `Math.random` (the test harness pins it to 198917). Memories, evidence and flags all cross nights, never a single night, so the shuffle cannot make a later case unsolvable; the shuffle test proves a full campaign on another seed still yields all fourteen pieces of evidence and ten memories. The seed is saved with the session, so a reload deals the same queue.

## Curated encounters

`NW_CAMPAIGN` contains stable case IDs, night numbers, resident IDs, a hidden truth category (`human`, `hostile`, or the peaceful Echo category used by the source), anomalies, document overrides, opening, dialogue nodes, archive/phone/hold/scan information, evidence, memory flags and consequences. Use an existing complete case as the template rather than inventing optional field defaults.

Truth is an author/test expectation, not displayed by the campaign UI. A final decision may remain ethically difficult even when identity is known. The resolution text and generated arcade review explain the particular case; they are not a universal species detector.

Dialogue node IDs are local to a case. A node carries its question, reply, mood, prerequisite and optional approach/evidence/memory attributes. `nwQuestionVisible` enforces prerequisites and mutually exclusive approach selection. `nwAsk` records what the visitor actually said before retaining discoveries. A memory used three nights later must be taught through reachable dialogue, a retained record or a relationship witness; never award knowledge that was not presented.

Cases derive fresh document copies. The original baseline and independent retained paper must not be mutated when a document is forged or the terminal is rewritten. The night-five rewrite event changes the current census view while preserving the original document and logged evidence.

## Anomalies and solvability

The 36 anomaly entries cover identity, document, appearance, behaviour, temporal and uncommon physical evidence. Each needs a concrete observed claim and a separate way of checking it. Generated mistakes are not arbitrary word substitutions with no clue.

The arcade generator uses a deterministic integer PRNG and `(seed, encounter index)` so an identical queue is reproducible without saving giant generated case objects. Tiers increase every twelve cases. Later cases can combine compatible anomalies; targets must not clobber one another. Human clerical errors have corroborating mundane explanations. Peaceful Echoes are not scored as hostile merely because they disclose their origin.

The archive gives independent observations and dates, not a hidden truth label. Randomized private-word/counterfoil and clock challenges require comparing the account with its independently retained expectation. Scanner readings have deliberate false positives and false negatives. Tone, anger, fear, missing paperwork and high readings do not independently imply hostility.

Adding a new anomaly requires: catalogue definition, its document/statement/portrait transformation, independent detector, baseline eligibility rule, generator compatibility rule and a regression case. Run the 10,000-seed invariant test, but also read generated examples: structural solvability is not the same as good writing or balanced play.

## State and actions

Campaign progression is `brief → desk → receipt → desk/shiftEnd → brief`, followed by `finale → ending → credits`. Only `nwResolve` signs a disposition, and it rejects duplicate/phase-invalid choices. HOLD is a resource-limited investigation operation, not a fifth final outcome or free truth oracle.

Session state includes cursor/night/phase, the active turn, evidence, memories, story flags, resident relationships/presence, authority/community confidence, harm, breaches, appeals, decisions, notebook, ending progress and arcade counters. Presence distinguishes inside, outside, quarantine and death; a hostile impersonator is not the real resident and must not erase them. Later dialogue/witness availability reads this state. A successful appeal restores presence without refunding earlier harm or time.

A turn records asked nodes, approach, investigated sources/tools, selected facts, pins, transcript, rewritten-record status, lamp/camera state, held/closed status and signed result. Selection IDs use `source:key` and survive switching panels. The comparison rail lets the player interpret two actual values. It does not automatically say “monster” or “human.”

Journals are bounded to 160 entries and decision history to 500 entries for endless mode. Useful permanent memories/evidence are retained separately. Arcade scoring tracks correct admissions/detections, false positives, admitted Echoes, humans denied, streak and efficiency. Efficiency counts investigation actions, not the player's reading speed.

## Endings

The finale shows available routes and missing prerequisites. Breach overrides available protective routes after excessive successful infiltrations. Otherwise the player makes an explicit final choice. Evidence, specific collaborators' presence, consent and community confidence gate the investigative routes. Each route has three authored scene steps and a distinct scene illustration. The true route also requires a real circuit decision; the paper diagram and corrupted terminal disagree.

The engine tests reach all six routes from campaign play rather than constructing an impossible final-score object. See `SPOILERS.md` for the author-facing prerequisite chain.

## Saves and UI

The save codec validates versions, field types, bounds, IDs, phases and turn references. A checksum detects accidental corruption; it is not encryption, tamper resistance or leaderboard anti-cheat. A previous-good backup can recover a broken or missing primary entry. LocalStorage exceptions are surfaced. Keep the current in-memory session on menu resume so quota failure cannot silently roll back later decisions.

The adapter builds a compact projection after discrete events, not on a timer. Save/endings/settings are separate from view selection. Keep large dialogue/roster tables out of template bindings. All audio paths are bundled. `softn.audio.stopAll()` is used for the app's mute/menu path; the game does not create host audio contexts. All critical sounds are captioned.

The root has a constrained-height vertical scroller because SoftN's `App` component clips overflow. Test within that shell, not only in a naturally expanding HTML body. Mobile panels use tabs and preserve the comparison rail and decisions. Do not reintroduce free-positioned documents that hide controls or rely on hover.
