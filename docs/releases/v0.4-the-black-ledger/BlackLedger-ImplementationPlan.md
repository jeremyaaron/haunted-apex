# Haunted Apex v0.4.0 The Black Ledger Implementation Plan

## Purpose

This plan breaks **v0.4.0: The Black Ledger** into reviewable implementation phases.

It follows [`BlackLedger-TDD.md`](./BlackLedger-TDD.md) and preserves the project rules
established by District Zero, Rival Territory, and The Roster:

- Keep the engine pure TypeScript.
- Keep Angular out of simulation rules.
- Keep static content separate from mutable run state.
- Keep seeded simulation deterministic.
- Keep preview and resolution calculations shared.
- Keep every phase buildable and testable.
- Keep Ledger consequences visible before they are punishing.
- Use the harness to evaluate balance rather than tuning from isolated examples.
- Do not expand into relationships, faction diplomacy, cloud services, Electron, or
  permanent campaign progression.

## Completion Target

The release is complete when an eight-week run supports:

```text
Action + Operative + Target + Ledger State
  -> Outcome
  + Consequence
  + Future Hook
```

The player should be able to:

```text
discover named secrets through targeted Intel work
accept visible debts through choices
bank and call in thin favors
spend Command to Work the Ledger
understand exact Ledger costs and effects before committing
see spent and unresolved entries at run end
copy a shareable run report
```

The harness must report whether Ledger creation, Ledger usage, unresolved debts, Secret
discovery, and Ledger events materially affect outcomes.

The tested production build remains playable at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

## Phase 0: Baseline, Documentation, and Release Status Cleanup

### Objective

Establish a clean v0.3 baseline, lock the v0.4 design inputs, and remove brittle release
status checks before changing runtime contracts.

### Scope

- Confirm the repository is based on the deployed v0.3 release commit or tag.
- Keep the v0.4 vision, clarifications, TDD, and implementation plan together under:

```text
docs/releases/v0.4-the-black-ledger/
```

- Update docs indexes so v0.4 documents are discoverable.
- Simplify README release status prose:
  - remove "latest release is X"
  - remove "current development target is Y"
  - keep the playable prototype link
  - keep links to development docs
- Remove or replace `release-status.json`, `scripts/check-readme.mjs`, `check:readme`,
  and the Pages workflow step that verifies stale mutable prose.
- If a replacement check is useful, add a structural docs check:
  - README links to docs
  - docs README links each release folder
  - README links the Pages build
- Run the existing test suite and production builds.
- Record the current test count and representative v0.3 harness baseline.
- Confirm no dev, Karma, or browser-debug process remains running.

### Implementation Notes

- Do not change gameplay behavior in this phase.
- Do not update game version or save schema yet.
- Treat `v0.4.md`, `v0.4A.md`, and `BlackLedger-TDD.md` as locked inputs unless
  implementation reveals a contradiction.
- Git tags and GitHub Releases are the official release source of truth. README should
  describe how to play and where docs live, not declare a mutable release state.

### Deliverables

- Complete v0.4 design set.
- Clean release-status documentation workflow.
- Green v0.3 baseline.
- Recorded pre-Ledger harness results.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
git diff --check
```

Recommended baseline:

```text
100 runs per agent
win rates
loss causes
average final pressures
operative usage reports
current target/rival reports
```

### Completion Record

Completed June 8, 2026:

- Runtime validation used Node `24.16.0` from `.nvmrc` and npm `11.13.0`.
- The shell default still resolved to Node `20.19.1`, so validation commands explicitly
  sourced `~/.nvm/nvm.sh` and ran `nvm use`.
- Removed mutable README release-status prose. README now describes the current playable
  GitHub Pages build and links to release documentation without claiming a latest semantic
  release or current development target.
- Added the v0.4 documentation links to README and `docs/README.md`.
- Replaced `npm run check:readme` with `npm run check:docs`.
- Removed `docs/releases/release-status.json` and `scripts/check-readme.mjs`.
- Added `scripts/check-docs.mjs`, which verifies README links to docs, the Pages build,
  and every release folder listed under `docs/releases/`.
- Updated the GitHub Pages workflow to run `npm run check:docs`.
- Captured a deterministic 100-runs-per-agent baseline using seed prefix
  `V04-PHASE0-BASELINE`:

```text
Random:           1% wins, 0 incomplete
Aggressive:      37% wins, 0 incomplete
Cautious:         0% wins, 0 incomplete
Greedy:          49% wins, 0 incomplete
Operator / Sane: 70% wins, 0 incomplete
```

- Primary baseline loss patterns:

```text
Random:     53 out of time, 38 bankrupt, 8 Heat lockdown
Aggressive: 48 Heat lockdown, 12 bankrupt, 2 out of time, 1 Loyalty collapse
Cautious:   97 out of time, 3 bankrupt
Greedy:     30 out of time, 9 Heat lockdown, 8 Loyalty collapse, 4 bankrupt
Operator:   18 bankrupt, 10 Heat lockdown, 2 out of time
```

- Current package metadata remains `0.0.0`; version `0.4.0` is reserved for the release
  readiness phase.
- The current persistence key remains `haunted-apex:v0.3:current-run`; Phase 2 will
  replace this with the v0.4 schema and storage key.
- All 252 existing tests passed in ChromeHeadless.
- Both application and specification TypeScript projects passed `--noEmit` checks.
- The standard production build passed.
- The production build with base href `/haunted-apex/` passed.
- The structural documentation check passed for four release folders.
- No development, Karma, or browser-debug process remains running.

### Review Gate

Confirm the baseline and README/release-status policy before changing save-state shape.

## Phase 1: Ledger Models and Static Content

### Objective

Introduce the Ledger domain contracts and authored v0.4 content without changing runtime
behavior.

### Scope

- Add Ledger model types:
  - `LedgerEntryKind`
  - `LedgerEntryDefinitionId`
  - `LedgerEntryId`
  - `LedgerUseOptionId`
  - `LedgerEntryDefinition`
  - `LedgerUseOptionDefinition`
  - `LedgerDiscoveryProfile`
  - `LedgerEntry`
  - `LedgerState`
  - `LedgerEntrySource`
  - `LedgerConsumptionSource`
- Add the 12 Ledger definitions:
  - 6 Secrets
  - 4 Debts
  - 2 Favors
- Add content registry helpers and barrel exports.
- Add basic content validation tests.
- Do not add Ledger state to live runs yet unless required by types.

### Implementation Notes

- Definitions contain authored data only.
- Runtime entries reference definitions by id.
- Every definition must have at least one use option.
- Debts can have multiple settlement options.
- Duplicate runtime entries are allowed by default.
- Definitions may include `unique` and `repeatWeightMultiplier` hooks, but no definition
  needs to opt into uniqueness in the first pass unless the content demands it.
- Use Resource and Intel costs for v0.4 Ledger use options.

### Deliverables

- Ledger model file.
- `ledger-entries` content registry.
- Registry lookup helpers.
- Exported public engine APIs.

### Verification

Unit tests:

- Exactly 12 Ledger definitions exist.
- Definition ids are unique.
- All three kinds exist.
- There are 6 Secrets, 4 Debts, and 2 Favors.
- Every definition has a name, description, rarity, tags, and at least one use option.
- Every use option has a stable id and label.
- Debt definitions expose at least one settlement option.
- Favors are consumable.
- Discovery profiles exist only where useful and reference valid target concepts.

### Completion Record

Completed June 8, 2026:

- Added pure Ledger model contracts in `src/app/engine/model/ledger.ts`.
- Added explicit ids and runtime types for Ledger definitions, use options, entries,
  sources, consumption metadata, discovery profiles, and Ledger state.
- Added the 12-entry v0.4 static content slice in `src/app/engine/content/ledger-entries.ts`:
  - 6 Secrets
  - 4 Debts
  - 2 Favors
- Added use options for every definition.
- Added multiple explicit settlement options for every Debt.
- Kept Favors thin with one consumable comeback use each.
- Added discovery profiles only to Secrets and connected those profiles to current
  districts, venues, rivals, and target tags.
- Exported Ledger model and content APIs through the existing engine barrel files.
- Added `ledger-content.spec.ts` to validate counts, ids, player-facing fields, use
  options, costs, effects, debt/favor shape, discovery references, and registry lookups.
- Did not add Ledger state to `GameState` or alter runtime behavior; Phase 2 owns that
  contract change.

### Review Gate

Review authored Ledger content and use-option labels before wiring runtime state.

## Phase 2: GameState, Entry Lifecycle, Selectors, and Persistence

### Objective

Add Ledger runtime state, lifecycle helpers, selectors, and v0.4 persistence validation.

### Scope

- Bump `GameState.schemaVersion` to `4`.
- Add `ledger` to `GameState`.
- Initialize empty Ledger state in `newGame`.
- Add `addLedgerEntry`.
- Add active and consumed selectors:
  - Secrets
  - Debts
  - Favors
  - all active entries
  - spent/resolved entries
  - summary counts
- Add Ledger entry view models for UI consumption.
- Update storage constants:
  - `CURRENT_SAVE_SCHEMA_VERSION = 4`
  - `CURRENT_GAME_VERSION = '0.4.0'`
  - `CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.4:current-run'`
  - `LEGACY_V03_STORAGE_KEY = 'haunted-apex:v0.3:current-run'`
- Validate Ledger state in storage loading.
- Invalidate v0.3 saves with a clear compatibility notice.

### Implementation Notes

- Consumed entries remain in `ledger.entries`.
- Active selectors filter out consumed entries.
- `addLedgerEntry` should create deterministic unique instance ids.
- Source metadata must be preserved for run summaries and event copy.
- Storage validation should reject malformed Ledger entries rather than partially loading
  questionable state.
- No migration from v0.3 is required.

### Deliverables

- v0.4 `GameState` contract.
- Entry creation lifecycle helper.
- Ledger selectors and view models.
- v0.4 localStorage validation.
- Compatibility notice for v0.3 saves.

### Verification

Unit tests:

- `newGame` initializes empty Ledger state.
- `addLedgerEntry` creates entries with source metadata.
- Duplicate Ledger entries are allowed as separate instances.
- Consumed entries remain in history but disappear from active selectors.
- Active Secret, Debt, and Favor selectors work.
- Ledger panel selector groups active and consumed entries.
- v0.3 saves are invalidated.
- v0.4 storage validation rejects unknown definitions, mismatched kinds, malformed sources,
  and invalid related ids.

### Review Gate

Confirm save invalidation behavior and selector shape before introducing Ledger actions.

## Phase 3: Work the Ledger Action and Target Validation

### Objective

Add `Work the Ledger` as a legal command-phase action that targets an active Ledger entry
and explicit use option.

### Scope

- Extend `ActionId` and action content with `work_the_ledger`.
- Extend `ActionTarget` with:

```ts
{ type: 'ledger'; entryId: LedgerEntryId; useOptionId: LedgerUseOptionId }
```

- Extend target validation and target option generation.
- Add Ledger target options for active entries and their use options.
- Add queue validation for:
  - missing Ledger target
  - unknown entry
  - consumed entry
  - unknown use option
  - unaffordable use option
- Ensure command points are spent normally.
- Ensure queued order views preserve Ledger target labels.

### Implementation Notes

- `Work the Ledger` has no base Resource cost and no base pressure effect.
- Entry-specific costs and effects come from the selected use option.
- Use-option affordability should be available at queue time.
- Target option labels can be generated as:

```text
Entry Name - Use Option Label
```

- Avoid special-case Angular logic. The UI should consume target options and queue
  availability from selectors/facade.

### Deliverables

- `Work the Ledger` action definition.
- Ledger target type and validation.
- Legal Ledger target option generation.
- Queue tests covering valid and invalid Ledger targets.

### Verification

Unit tests:

- `Work the Ledger` cannot queue without a Ledger target.
- Unknown Ledger entry is rejected.
- Consumed Ledger entry is rejected.
- Unknown use option is rejected.
- Unaffordable use option is rejected.
- Affordable active Ledger use can queue.
- Queued order preserves `entryId` and `useOptionId`.
- Removing a queued Ledger order restores command availability.
- Existing non-Ledger targets still validate correctly.

### Review Gate

Confirm the command action and target shape before applying Ledger effects.

## Phase 4: Shared Ledger Use Preview and Resolution

### Objective

Implement the shared use-effect pipeline that powers both previews and `Work the Ledger`
resolution.

### Scope

- Add `previewLedgerUse`.
- Add `resolveLedgerUse`.
- Apply Resource/Intel costs.
- Apply pressure effects.
- Mark entries consumed when configured.
- Preserve consumption metadata.
- Increment consumed counts.
- Add action logs naming the entry and use option.
- Integrate `resolveLedgerUse` into `resolveQueuedOrder` for `work_the_ledger`.
- Extend action previews to show Ledger costs, effects, consumption, and risk.

### Implementation Notes

- Resolution must call preview and apply its calculated costs and effects.
- Do not duplicate use-effect math between preview and resolution.
- Costs should render as costs in the UI but apply as negative deltas internally.
- If a use option does not consume the entry, it must be intentional and visible in content.
- Risk remains normal action risk plus use-option risk modifiers if present.

### Deliverables

- Shared Ledger use preview/resolution module.
- `Work the Ledger` order resolution.
- Preview rows for costs, effects, and consumption.
- Logs and diagnostics for harness reporting.

### Verification

Unit tests:

- Preview reports costs, effects, affordability, consumption, and risk.
- Resolution applies the exact previewed costs and effects.
- Secret use can reduce Heat or increase Dominion and consume the Secret.
- Debt settlement can spend Resources or Intel and consume the Debt.
- Favor use can apply comeback effects and consume the Favor.
- Consumed entries cannot be used again.
- Unaffordable entries do not resolve.
- Preview and resolution stay consistent for representative entries.

### Review Gate

Confirm preview/resolution parity before adding discovery and event creation paths.

## Phase 5: Targeted Gather Intel Secret Discovery

### Objective

Make targeted `Gather Intel` capable of discovering named Secrets with an exact previewed
chance.

### Scope

- Add `previewSecretDiscovery`.
- Calculate Secret discovery chance for targeted `Gather Intel`.
- Show no chance for untargeted `Gather Intel`.
- Select weighted discoverable Secret definitions during resolution.
- Apply duplicate weighting and unique-entry hooks.
- Add discovered Secret entries with action source metadata.
- Attach target, rival, and operative context where available.
- Add logs and diagnostics for discovery.
- Preserve existing raw Intel gain initially.

### Implementation Notes

- Use seeded RNG for discovery rolls and Secret selection.
- Chance should update when target or operative changes.
- Candidate selection should account for target tags and active duplicates.
- Do not make targeted Intel mandatory through overpowered Secret rates.
- Untargeted `Gather Intel` remains the clean meter action.

### Deliverables

- Shared discovery preview/resolution helpers.
- Targeted Intel preview integration.
- Secret creation during action resolution.
- Discovery diagnostics for harness reports.

### Verification

Unit tests:

- Untargeted `Gather Intel` has no discovery chance.
- Targeted `Gather Intel` has an exact discovery chance.
- Chance responds to target context and operative stress where implemented.
- Seeded targeted Intel can discover a deterministic Secret.
- Discovery adds source metadata and related target context.
- Duplicate weighting lowers repeat candidate weight.
- Unique definitions are not rediscovered while active if unique behavior is enabled.
- Raw Intel gain is not reduced in this phase.

### Review Gate

Review Secret discovery frequency with a small harness smoke test before adding more
Ledger creation through events.

## Phase 6: Event Choice Ledger Effects and Existing Event Integration

### Objective

Allow event choices to create, consume, or resolve exact Ledger entries, then update key
existing events.

### Scope

- Extend event choice definitions with `ledgerEffects`.
- Extend event choice availability if Ledger effects require active entries or costs.
- Apply Ledger effects centrally in `resolveEventChoice`.
- Add event choice preview rows for exact Ledger consequences.
- Update selected existing events:
  - Liaison Offers a Favor
  - Blackmail Lead Emerges
  - Unexpected Windfall
  - Operative Wants More
  - Corp Patrol Sweep, if clean in the current content
- Add logs for event-created and event-consumed Ledger entries.

### Implementation Notes

- Event choices must display exact entries:

```text
Creates Debt: Owes the Liaison
Creates Secret: Dead Channel Trace
Resolves Debt: Unfunded Promise
```

- Do not convert every flag or event branch.
- Keep event-created Ledger entries visible before punishment.
- Use source type `event` for entries created by weekly event choices.

### Deliverables

- Event choice Ledger effect model.
- Event preview support for Ledger effects.
- Resolver support for creation and consumption.
- 4 to 5 existing events integrated with Ledger entries.

### Verification

Unit tests:

- Event choices create exact Ledger definitions.
- Created entries preserve event id and choice id.
- Event choices can consume or resolve selected entries where configured.
- Event previews display exact Ledger entry names.
- Existing event pressure effects still apply.
- Event choice affordability behavior is unchanged unless Ledger effects explicitly add
  new constraints.

### Review Gate

Play one UI run or inspect event previews before adding Ledger-specific event pressure.

## Phase 7: Ledger-Specific Events and Event Weighting

### Objective

Add weekly events that make active Ledger entries come due or open strategic windows.

### Scope

- Extend pending event state with optional selected Ledger entry id.
- Extend event weighting context with Ledger counts, ages, and tags.
- Add `Debt Comes Due`.
- Add `Leverage Window`.
- Add `Favor Returned`.
- Optionally add `Ledger Leak` if the first three events land cleanly.
- Select a specific active entry for Ledger-specific events where possible.
- Display selected entry names in event title/copy and choice previews.
- Preserve once-per-run or recent-event penalties where appropriate.

### Implementation Notes

- Ledger-specific events should be soft pressure, not a new hard loss condition.
- `Debt Comes Due` should become more likely for older Debts.
- `Leverage Window` should become more likely when the player is behind or under Heat.
- `Favor Returned` should be a comeback event, not constant free value.
- The event pool should not become all Ledger events.

### Deliverables

- Ledger event context helpers.
- Three Ledger-specific event definitions.
- Event selection support for selected Ledger entries.
- Event choice resolution against selected entries.

### Verification

Unit tests:

- `Debt Comes Due` is ineligible without active Debt.
- `Leverage Window` is ineligible without active Secret.
- `Favor Returned` is ineligible without active Favor.
- Selected pending events preserve `ledgerEntryId`.
- Event choices resolve or preserve the selected entry correctly.
- Ledger event weights rise with active entries and age.
- Recent-event penalties still apply.
- Non-Ledger event weighting remains functional.

### Review Gate

Run harness smoke tests to confirm Ledger events appear but do not dominate the pool.

## Phase 8: Angular Ledger UI and Player-Facing Previews

### Objective

Expose the Black Ledger system in the playable UI without redesigning the current shell.

### Scope

- Add a Black Ledger panel with:
  - Secrets
  - Debts
  - Favors
  - Spent / Resolved
- Render Ledger entry cards:
  - kind
  - name
  - description
  - created week
  - source/context
  - potency
  - tags
  - primary use preview
  - status
- Wire `Work the Ledger` target dropdown through existing target controls.
- Show use-option costs, effects, and consumption in action previews.
- Disable queueing for unaffordable Ledger uses with clear copy.
- Show `Secret Chance: N%` for targeted `Gather Intel`.
- Show event choice Ledger effect rows/chips.
- Keep consumed entries visible but muted or collapsed.

### Implementation Notes

- Use selector view models. Do not calculate Ledger rules in Angular.
- Keep the UI dense and scan-friendly.
- Avoid making the Ledger panel a separate route.
- Ensure mobile and desktop layouts do not overlap or hide key controls.
- Exact percentages are acceptable for v0.4 because they help tuning and strategic clarity.

### Deliverables

- Visible Ledger panel.
- Ledger target selection for `Work the Ledger`.
- Ledger-aware action previews.
- Ledger-aware event choice previews.
- UI tests for critical render states.

### Verification

Unit/UI tests:

- Empty Ledger panel renders cleanly.
- Active Secrets, Debts, and Favors render in correct sections.
- Consumed entries render in Spent / Resolved state.
- `Work the Ledger` dropdown shows entry/use labels.
- Selecting a Ledger use updates preview rows.
- Unaffordable Ledger use disables queueing.
- Targeted `Gather Intel` shows Secret chance.
- Untargeted `Gather Intel` does not show Secret chance.
- Event choices show exact Ledger effects.

Manual checks:

- Complete one run through the UI.
- No target/operative/Ledger selector overlap.
- No clipped effect labels in compact cards.
- No debug-only state is visible by default.

### Review Gate

Do a usability pass before adding run-end summary and harness metrics.

## Phase 9: Run-End Summary and Copy Report

### Objective

Make each completed run produce a Ledger-aware, shareable summary.

### Scope

- Add pure report builder:
  - `buildRunSummary`
  - `formatRunSummary`
- Include:
  - result
  - ended week
  - seed
  - final pressures
  - starting roster
  - final roster
  - most assigned operative
  - MVP operative
  - most dangerous rival
  - Ledger entries gained
  - Ledger entries consumed
  - unresolved debts
  - major events
  - epitaph
- Add report to the game-over panel only.
- Add `Copy Run Report`.
- Add clipboard success/failure state.

### Implementation Notes

- Report text must be deterministic from final `GameState`.
- MVP scoring can start simple and improve later.
- Epitaphs can be selected from deterministic state patterns.
- No active-run history dashboard in v0.4.

### Deliverables

- Pure run summary module.
- Game-over summary UI.
- Copy report UI behavior.

### Verification

Unit/UI tests:

- Run summary includes seed, result, week, final pressures, roster, Ledger stats, and
  unresolved debts.
- Formatting is deterministic for a fixed final state.
- Victory and loss summaries both render.
- Copy button calls the clipboard path when available.
- Copy failure state is handled without crashing.

### Review Gate

Review copied report text for shareability and tone before harness expansion.

## Phase 10: Harness Agents and Ledger Reports

### Objective

Teach all simulation agents to reason about Ledger entries and report Ledger impact across
batch runs.

### Scope

- Extend legal order enumeration with Ledger targets and use options.
- Add Ledger scoring to agents:
  - RandomBot
  - AggressiveBot
  - CautiousBot
  - GreedyBot
  - OperatorBot
- Track per-run Ledger stats:
  - entries created
  - Secrets created
  - Debts created
  - Favors created
  - entries consumed
  - unresolved Debts
  - Secret discovery attempts and successes
  - Ledger event selections
- Add CSV report sections:
  - `ledger_summary`
  - `ledger_usage`
  - `ledger_outcomes`
  - `secret_discovery`
  - `ledger_events`

### Implementation Notes

- Agents should consume the same legal options the UI and engine expose.
- OperatorBot should use Ledger entries in survival and schedule-aware situations.
- CautiousBot should avoid Debts and settle early.
- AggressiveBot should exploit Secrets for Dominion.
- GreedyBot should accept dirty money and delay settlement.
- RandomBot should sample valid Ledger behavior without duplicating validation.

### Deliverables

- Ledger-aware agent policies.
- Ledger-aware simulation diagnostics.
- Expanded harness CSV output.
- Tests for legal Ledger option enumeration and report sections.

### Verification

Unit/harness tests:

- Harness legal order options include valid Ledger use options when entries exist.
- Agents do not select consumed or unaffordable Ledger uses.
- OperatorBot uses Heat-saving Secrets/Favors under high Heat.
- CautiousBot settles affordable old Debts.
- AggressiveBot can exploit Dominion-positive Secrets.
- Reports include all Ledger sections.
- Batch runs complete without incomplete states.

### Review Gate

Run an initial 100-runs-per-agent report and inspect Ledger frequency before balance.

## Phase 11: Balance, Tuning, and Release Readiness

### Objective

Tune v0.4 so the Ledger changes run texture without overwhelming the pressure loop.

### Scope

- Run repeated harness batches.
- Tune:
  - Secret discovery chance
  - candidate weights
  - Ledger use costs and effects
  - debt event weights
  - leverage event weights
  - favor usefulness
  - event choice Ledger rewards/punishments
- Compare v0.4 win rates against v0.3 baseline.
- Play at least one full UI run.
- Update field guide copy if the Ledger needs additional explanation.
- Confirm README/release docs remain accurate under simplified policy.
- Prepare release notes for `v0.4.0`.

### Implementation Notes

- Good target texture:

```text
2-5 Ledger entries per average run
0-2 Debts per average run
1-2 Secrets used per average run
Debts matter but do not create a hard loss condition
Favors are occasional comeback tools
OperatorBot remains competent but not automatic
```

- Avoid making targeted `Gather Intel` mandatory for every winning strategy.
- Avoid making Debts either harmless or run-ending.
- If the Ledger panel is noisy, reduce generation before hiding information.

### Deliverables

- Final tuning pass.
- Final harness report.
- Release notes draft.
- Green full validation.
- Ready-to-tag v0.4 release state.

### Verification

Full validation:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
git diff --check
```

Harness validation:

```text
100 runs per agent minimum
win rates
loss causes
average final pressures
operative reports
target/rival reports
Ledger reports
event reports
```

Manual validation:

```text
Start a new v0.4 run.
Acquire at least one Ledger entry.
Use Work the Ledger.
Resolve at least one Ledger-aware event.
Finish a run.
Copy the run report.
Confirm no crash, stuck state, or invisible consequence.
```

### Release Gate

v0.4.0 is ready when:

```text
The game has a visible Black Ledger panel.
Secrets, Debts, and Favors can all appear in normal play.
Targeted Gather Intel previews and can discover Secrets.
Work the Ledger can use Secrets, settle Debts, and call Favors.
Event choices show exact Ledger consequences.
Ledger-specific events reference specific active entries.
Consumed entries remain visible as history.
Run-end summary and Copy Run Report work.
Harness reports expose Ledger behavior.
Balance remains recognizable from v0.3.
Production and Pages builds pass.
```
