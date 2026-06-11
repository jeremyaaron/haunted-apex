# Haunted Apex v0.6.0 Fronts Implementation Plan

## Purpose

This plan breaks **v0.6.0: Fronts** into reviewable implementation phases.

It follows [`Fronts-TDD.md`](./Fronts-TDD.md) and preserves the project rules established
by District Zero, Rival Territory, The Roster, The Black Ledger, and Entanglements:

- Keep the engine pure TypeScript.
- Keep Angular out of simulation rules.
- Keep static content separate from mutable run state.
- Keep seeded generation and simulation deterministic.
- Keep preview and resolution calculations shared.
- Keep every phase buildable and testable.
- Keep fronts visible, useful, risky, trackable, and reportable without expanding into a
  full economy sim.
- Use the harness to evaluate balance rather than tuning from isolated examples.

## Completion Target

The release is complete when an eight-week run supports:

```text
Starting Pale Circuit front
  -> Seeded front opportunities
  -> Invest in Front establish/upgrade
  -> Weekly yield + exposure
  -> Front-targeted Lay Low
  -> Front events + Ledger hooks
  -> Front-aware reports and balance signals
```

The player should be able to:

```text
see The Pale Circuit as owned infrastructure
inspect fixed seeded front opportunities
understand Level, Exposure, Status, weekly yield, and related rival
establish a new front
upgrade an owned front to level 2
cool an exposed front with Lay Low
see front events reference a specific owned front
read final run front outcomes
```

The harness must report whether fronts are used, which fronts dominate, whether exposure
creates enough risk, whether late investment is bad, whether early investment is useful, and
whether the broad v0.5 balance profile remains recognizable.

The tested production build remains playable at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

## Phase 0: Baseline and Documentation Lock

### Objective

Establish a clean v0.5 baseline, lock the v0.6 design inputs, and verify the repository
before changing save-state or action contracts.

### Scope

- Confirm the repository is based on the approved and tagged v0.5 release.
- Keep the v0.6 vision, clarifications, TDD, and implementation plan together under:

```text
docs/releases/v0.6-fronts/
```

- Update docs indexes so v0.6 documents are discoverable.
- Run the existing test suite.
- Run the standard production build.
- Run the GitHub Pages subpath build.
- Run the docs link checker.
- Record the current test count and representative v0.5 harness baseline.
- Record the current storage key and save schema version.
- Confirm no dev, Karma, or browser-debug process from this phase remains running.

### Implementation Notes

- Do not change gameplay behavior in this phase.
- Do not update package version to `0.6.0` yet.
- Treat `v0.6.md`, `v0.6A.md`, and `Fronts-TDD.md` as locked inputs unless
  implementation reveals a contradiction.
- Preserve v0.5 balance output as the comparison point for Phase 11.
- Keep the post-v0.5 Contact requirement-detail fix if it is already present and green.

### Deliverables

- Complete v0.6 design set.
- Green v0.5 baseline.
- Recorded pre-Front harness results.
- No accidental generated, temporary, or server artifacts.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
npm run check:docs
git diff --check
```

Recommended baseline:

```text
100 runs per agent
win rates
loss causes
average final pressures
Ledger usage reports
target/rival/district reports
roster/stress reports
contact reports
```

### Completion Record

Completed June 10, 2026:

- Runtime validation used Node `24.16.0` from `.nvmrc` and npm `11.13.0`.
- Development baseline is `main` at commit `c0117eb`, which is tagged locally as
  `v0.5.0`.
- The v0.6 documentation set is organized under:

```text
docs/releases/v0.6-fronts/
```

- Added the v0.6 direction, clarifications, TDD, and implementation plan to
  `docs/README.md`.
- Added the v0.6 release folder to the root README development-documentation list.
- Current package metadata remains `0.0.0`; version `0.6.0` is reserved for release
  readiness.
- Current persistence key is `haunted-apex:v0.5:current-run`.
- Current save schema version is `5`.
- Current game version is `0.5.0`.
- Current `GameState` has no Front state. Phase 2 owns the schema version increase,
  `haunted-apex:v0.6:current-run`, v0.5 save invalidation, and Front state validation.
- The post-v0.5 Contact requirement-detail fix is present and green; locked Contact
  services now show details such as `Requires 25 Leverage - Current 18`.
- Captured a deterministic 100-runs-per-agent baseline using seed prefix
  `V06-PHASE0-BASELINE`:

```text
Random:           1% wins, 0 incomplete, avg 5.89 weeks
Aggressive:      49% wins, 0 incomplete, avg 5.03 weeks
Cautious:         0% wins, 0 incomplete, avg 7.78 weeks
Greedy:          49% wins, 0 incomplete, avg 7.32 weeks
Operator / Sane: 61% wins, 0 incomplete, avg 6.40 weeks
```

- Primary baseline loss patterns:

```text
Random:     68 bankrupt, 27 out of time, 3 Heat lockdown, 1 Loyalty collapse
Aggressive: 42 Heat lockdown, 8 bankrupt, 1 out of time
Cautious:   92 out of time, 8 bankrupt
Greedy:     39 out of time, 7 Heat lockdown, 3 bankrupt, 2 Loyalty collapse
Operator:   24 bankrupt, 8 out of time, 7 Heat lockdown
```

- Ledger baseline summary:

```text
Random:           1.95 entries created, 0.95 consumed, 0.41 unresolved Debts
Aggressive:      2.72 entries created, 0.90 consumed, 1.08 unresolved Debts
Cautious:         2.91 entries created, 1.10 consumed, 0.00 unresolved Debts
Greedy:          5.52 entries created, 1.07 consumed, 2.16 unresolved Debts
Operator / Sane: 3.11 entries created, 1.23 consumed, 0.11 unresolved Debts
```

- Contact baseline summary:

```text
Random:           1.91 Manage Contact uses/run, 0.00 burned Contacts
Aggressive:      0.88 Manage Contact uses/run, 0.00 burned Contacts
Cautious:         0.24 Manage Contact uses/run, 0.00 burned Contacts
Greedy:          0.89 Manage Contact uses/run, 0.00 burned Contacts
Operator / Sane: 2.48 Manage Contact uses/run, 0.00 burned Contacts
```

- All 384 tests passed in ChromeHeadless.
- Both application and specification TypeScript projects passed `--noEmit` checks.
- The standard production build passed.
- The production build with base href `/haunted-apex/` passed.
- The structural documentation check passed for six release folders.
- `git diff --check` passed.

### Review Gate

Confirm baseline and docs before adding the Front model.

## Phase 1: Front Models, Static Content, and Status Helpers

### Objective

Introduce the Front domain contracts and authored v0.6 content without changing runtime
behavior.

### Scope

- Add Front model types:
  - `FrontDefinitionId`
  - `FrontId`
  - `FrontOpportunityId`
  - `FrontOptionId`
  - `FrontStatus`
  - `FrontArchetype`
  - `FrontRoleTag`
  - `FrontDefinition`
  - `FrontState`
  - `FrontOpportunity`
  - `FrontYieldHistoryEntry`
- Add the six Front definitions:
  - The Pale Circuit
  - Black Clinic
  - Courier Line
  - Zero Mercy Cut
  - Shell Gallery
  - Surveillance Den
- Add content registry helpers and barrel exports.
- Add `deriveFrontStatus`.
- Add front exposure clamp helpers.
- Add weekly yield calculation helper.
- Add content validation tests.
- Do not add Front state to live runs yet unless required by types.

### Implementation Notes

- Definitions contain authored data only.
- Runtime state references definitions by id.
- `FrontId` may equal `FrontDefinitionId` in v0.6 because only one instance per definition
  is allowed.
- Include `social` as a valid role tag because Shell Gallery uses it.
- Do not hardcode front-specific behavior in generic engine helpers.
- Keep `status` out of `FrontState`; derive it from exposure.

### Deliverables

- Front model file.
- Front content registry.
- Status, exposure clamp, and yield helpers.
- Exported public engine APIs.
- Static content test coverage.

### Verification

Unit tests:

- Exactly six Front definitions exist.
- Front ids are unique.
- Every Front has valid archetype, role tags, costs, yields, exposure values, and flavor.
- `The Pale Circuit` setup cost is `0`.
- Every Front has `maxLevel: 2`.
- Preferred district and venue ids resolve.
- `deriveFrontStatus` maps exact thresholds correctly.
- Exposure clamp keeps values between 0 and 100.
- Weekly yield helper adds level 2 bonus at level 2 only.

### Completion Record

Completed June 11, 2026:

- Added Front domain contracts in `src/app/engine/model/fronts.ts`:
  - `FrontDefinitionId`
  - `FrontId`
  - `FrontOpportunityId`
  - `FrontOptionId`
  - `FrontStatus`
  - `FrontArchetype`
  - `FrontRoleTag`
  - `FrontDefinition`
  - `FrontState`
  - `FrontOpportunity`
  - `FrontYieldHistoryEntry`
- Added the six v0.6 Front definitions in `src/app/engine/content/fronts.ts`:
  - The Pale Circuit
  - Black Clinic
  - Courier Line
  - Zero Mercy Cut
  - Shell Gallery
  - Surveillance Den
- Added the `getFrontDefinition` registry helper.
- Added Front helper APIs in `src/app/engine/fronts/`:
  - `deriveFrontStatus`
  - `clampFrontExposure`
  - `calculateFrontWeeklyYield`
- Added model, content, and engine barrel exports.
- Added focused tests for:
  - content registry shape and lookups
  - supported archetypes and role tags
  - valid costs, level caps, exposure values, and pressure deltas
  - preferred district and venue references
  - status threshold derivation
  - exposure clamping
  - level 1 vs level 2 weekly yield calculation
- No Front state was added to live `GameState`.
- No save schema, storage key, action, new-game, UI, event, or harness behavior changed.

Verification:

```text
Focused Front specs:      9 passed.
Full Angular suite:       393 passed.
App TypeScript check:     passed.
Spec TypeScript check:    passed.
Standard build:           passed.
```

### Review Gate

Confirm the content slice before wiring Fronts into `GameState`.

## Phase 2: New Game Generation, Persistence, and Save Invalidation

### Objective

Add Front state to new runs, generate fixed front opportunities, and version persistence for
v0.6.

### Scope

- Extend `GameState` with:
  - `fronts`
  - `frontOpportunities`
- Add `The Pale Circuit` as a starting owned level 1 front.
- Associate `The Pale Circuit` with:
  - `district_violet_ward`
  - `venue_pale_circuit`
- Generate four fixed seeded front opportunities per run.
- Exclude `front_pale_circuit` from generated opportunities.
- Enforce opportunity coverage:
  - at least one resources front
  - at least one intel or heat-control front
  - at least one risky/high-reward front
- Infer `relatedRivalId` from district/venue control during generation.
- Store `relatedRivalId` on opportunities.
- Increment save schema and storage key for v0.6.
- Invalidate v0.5 saves with a compatibility notice.
- Extend storage validation for Front state.

### Implementation Notes

- The owned front cap is 3, and the starting front counts.
- Opportunities remain fixed for the run.
- The player may own one instance per Front definition.
- Do not migrate v0.5 saves.
- Keep generation deterministic for the same seed.
- Store the related rival at generation time; do not recalculate it later for existing
  opportunities.

### Deliverables

- New-game Front initialization.
- Seeded opportunity generator.
- Persistence schema update.
- Storage validation update.
- Compatibility notice text for v0.6.

### Verification

Unit tests:

- New games start with `The Pale Circuit` owned.
- Starting front counts toward the cap.
- New games generate exactly four opportunities.
- Opportunities exclude `front_pale_circuit`.
- Opportunities are deterministic by seed.
- Opportunity generation satisfies coverage requirements.
- Opportunities store related rival when one is inferred.
- Generated opportunities do not duplicate owned definitions.
- v0.6 saves round-trip Front state.
- v0.5 saves are rejected with the compatibility notice.
- Malformed Front state is rejected.

### Review Gate

Confirm v0.6 new runs and persistence before adding player-facing actions.

## Phase 3: Front Targets, Legal Orders, and Invest Preview

### Objective

Make `Invest in Front` visible as an action with legal targets and exact previews, without
resolving investments yet.

### Scope

- Add `invest_front` to action content.
- Extend `ActionTarget` with:
  - `front_opportunity`
  - `front`
- Add front target option generation.
- Include establish targets for available opportunities.
- Include upgrade targets for owned level 1 fronts.
- Keep level 2 fronts visible as max-level in selectors where appropriate.
- Prevent operative assignment for `Invest in Front`.
- Add preview data for:
  - establish cost
  - upgrade cost
  - immediate pressure effects
  - weekly yield after investment
  - district control yield
  - immediate exposure change
  - weekly exposure gain after investment
  - projected status
  - stored related rival
  - rival pressure warning
- Add unavailable reasons:
  - `front_cap_reached`
  - `front_already_owned`
  - `front_already_max_level`

### Implementation Notes

- Establish actions are disabled when owned active front count is already 3.
- Upgrade actions remain available when cap is reached.
- Opportunities should remain visible even when disabled by cap.
- Do not resolve front state changes in this phase.
- Preview calculation should be reusable by Phase 4 resolution.

### Deliverables

- `Invest in Front` action card support.
- Front target option selectors.
- Front preview model.
- Unavailable reason copy.
- Focused preview tests.

### Verification

Unit tests:

- `Invest in Front` requires a target.
- `Invest in Front` does not allow operative assignment.
- Establish target options include generated opportunities.
- Upgrade target options include owned level 1 fronts.
- Level 2 fronts do not produce available upgrade targets.
- Establish preview shows cost, immediate effects, weekly yield, exposure, status, and rival
  warning.
- Upgrade preview shows cost, immediate effects, updated weekly yield, exposure, status, and
  rival warning.
- Establish is unavailable at front cap.
- Upgrade is still available at front cap.
- Unaffordable targets are unavailable.

### Review Gate

Confirm preview accuracy before allowing investments to resolve.

## Phase 4: Invest in Front Resolution

### Objective

Resolve `Invest in Front` orders through the shared preview pipeline.

### Scope

- Add `resolveInvestFront`.
- Wire `invest_front` into action resolution.
- Establish flow:
  - validate opportunity
  - validate cap
  - validate definition is not already owned
  - spend setup cost
  - apply establish effects
  - apply explicit rival pressure on establish to stored related rival
  - create `FrontState` at level 1
  - set exposure to `exposureOnEstablish`
  - set `establishedWeek`
  - remove or selector-hide the established opportunity
  - log outcome
- Upgrade flow:
  - validate owned front
  - validate level below 2
  - spend upgrade cost
  - apply upgrade effects
  - increase exposure by `exposureOnUpgrade`
  - increase level to 2
  - log outcome

### Implementation Notes

- Resolution must use the same calculation as preview.
- Clamp pressure values through existing pressure helpers.
- Clamp exposure from 0 to 100.
- Keep action logs specific: include front name and major effects.
- If a queued order becomes invalid by resolution time, log a blocked outcome instead of
  crashing.

### Deliverables

- Front establish resolution.
- Front upgrade resolution.
- Event feed entries for investments.
- Tests for preview/resolution parity.

### Verification

Unit tests:

- Establishing a front creates owned state.
- Establishing spends resources and applies immediate effects.
- Establishing applies stored related rival pressure.
- Establishing removes or hides the opportunity.
- Establishing cannot exceed cap.
- Establishing cannot duplicate an owned definition.
- Upgrading increases level to 2.
- Upgrading spends resources and applies immediate effects.
- Upgrading increases exposure.
- Upgrading cannot exceed level 2.
- Resolution logs include front names.

### Review Gate

Confirm the player can establish and upgrade fronts through the engine.

## Phase 5: Weekly Yields, Exposure, and District/Rival Effects

### Objective

Make owned fronts produce recurring value and recurring exposure during weekly resolution.

### Scope

- Add weekly front yield application.
- Apply front yields after queued orders and before global weekly drift.
- Apply level 2 bonus yield.
- Apply weekly exposure gain.
- Add `+1` extra weekly exposure for level 2 fronts.
- Apply district control yield.
- Apply explicit weekly rival pressure when a definition declares it.
- Append `yieldHistory` entries.
- Add event feed or summary log entries for weekly front output.

### Implementation Notes

- Exposure itself has no generic passive pressure penalty.
- Only explicit definition yields affect pressure meters.
- Do not create Ledger entries from weekly yields.
- Keep yield history lightweight and deterministic.
- Ensure front weekly resolution cannot break win/loss checks.

### Deliverables

- Weekly front yield engine.
- Weekly exposure engine.
- District control and rival pressure hooks.
- Yield history tracking.
- Tests for weekly order.

### Verification

Unit tests:

- Front weekly yields apply during weekly resolution.
- Level 2 bonus yield applies.
- Exposure increases weekly.
- Level 2 adds one extra weekly exposure.
- District control yield applies and clamps.
- Explicit weekly rival pressure applies only when defined.
- No generic Heat or Loyalty damage is applied solely because exposure is high.
- Yield history records week, effects, and exposure delta.

### Review Gate

Confirm fronts now matter over time before adding exposure-management controls.

## Phase 6: Front-Targeted Lay Low

### Objective

Give the player a clear command-phase tool to reduce front exposure.

### Scope

- Extend `Lay Low` target support to owned fronts.
- Keep untargeted `Lay Low` behavior unchanged.
- Add front-targeted `Lay Low` preview:
  - 300 Resources cost
  - Heat -6
  - Dominion -1
  - selected front Exposure -14
- Disable front-targeted `Lay Low` for unowned or inactive fronts.
- Prevent operative assignment for front-targeted `Lay Low`.
- Resolve front exposure reduction and global effects.
- Log the cooled front by name.

### Implementation Notes

- `Lay Low` has different behavior when the selected target is a front.
- Exposure cannot go below 0.
- If existing assignment UI is action-level rather than target-level, hide or disable
  assignment when a front target is selected.

### Deliverables

- Front target options for `Lay Low`.
- Front-targeted preview and resolution.
- UI copy for unavailable states.
- Tests covering untargeted behavior remains stable.

### Verification

Unit tests:

- Untargeted `Lay Low` keeps current behavior.
- Owned fronts appear as `Lay Low` targets.
- Unowned fronts cannot be targeted.
- Front-targeted `Lay Low` costs 300 Resources.
- Front-targeted `Lay Low` reduces Heat and Dominion.
- Front-targeted `Lay Low` reduces exposure by 14 and clamps at 0.
- Front-targeted `Lay Low` does not allow operative assignment.
- Logs include the front name.

### Review Gate

Confirm exposure is manageable before adding front event pressure.

## Phase 7: Front Events and Ledger Hooks

### Objective

Add front-specific weekly events and visible event consequences.

### Scope

- Add front event content:
  - Front Inspection
  - Staff Wants Protection
  - Rival Leans on Your Front
  - Clean Money, Dirty Hands
  - Back Room Ledger
- Add front event eligibility helpers.
- Add weighted-random eligible front selection biased by exposure.
- Add front effect definitions for event choices.
- Apply front exposure effects during event resolution.
- Preview front effects on event choices.
- Add at most two new Ledger entries:
  - Secret: Back Room Guest List
  - Debt: Dirty Books
- Reuse existing Ledger entries where semantically acceptable.
- Ensure front events use the normal single weekly event slot.

### Implementation Notes

- Every front event title/body should include the selected front name.
- Do not always pick the highest exposure front.
- Use seeded RNG for eligible front selection.
- Suggested base target weight is `10 + exposure`, with bonuses from `v0.6A.md`.
- Front events should not dominate the weekly event slot.
- Weekly yields must not create Ledger entries.
- If Ledger related-front state would be too invasive, keep front context in event logs and
  reports for v0.6.

### Deliverables

- Front event definitions.
- Front event target context.
- Event preview/resolution support for front effects.
- New Ledger definitions if needed.
- Event selection tests.

### Verification

Unit tests:

- Front Inspection is eligible for exposed fronts.
- Staff Wants Protection is eligible with active fronts.
- Rival Leans on Your Front requires rival context and pressure.
- Clean Money, Dirty Hands responds to resources fronts.
- Back Room Ledger responds to intel or nightlife fronts.
- Front event target selection is deterministic by seed.
- Higher exposure increases target selection likelihood in deterministic samples.
- Event choices apply front exposure effects.
- Event choices apply pressure, rival, and Ledger effects.
- Front events consume the normal weekly event slot.
- Event titles or rendered copy include the selected front name.

### Review Gate

Confirm front events are understandable and not overwhelming.

## Phase 8: Front Selectors, Facade, and Tabbed UI

### Objective

Expose fronts to the player through a tabbed/shared information panel without adding a new
route or making the main command area unreadable.

### Scope

- Add front selector view models:
  - owned front views
  - opportunity views
  - yield rows
  - exposure/status rows
  - upgrade state
  - cap state
  - related rival names
  - yield history summaries
- Expose `fronts` and `frontOpportunities` through `GameFacade`.
- Add Fronts to a tabbed/shared secondary panel.
- Preserve access to existing panels:
  - Operatives
  - Rivals
  - Ledger
  - Contacts
  - Log/Debug
- Render owned front cards.
- Render front opportunity cards.
- Render max-level state.
- Render cap-reached disabled state.
- Render front previews in action cards.
- Add Field Guide copy for Fronts.

### Implementation Notes

- Keep the main command board focused on commands and selected previews.
- The Fronts tab or shared panel should orient the player; exact consequences belong in the
  action preview.
- Avoid page-height explosion.
- Keep text compact enough for current dense UI.
- Do not add art or route work in v0.6.

### Deliverables

- Fronts UI panel/tab.
- Owned front cards.
- Opportunity cards.
- Front preview rendering.
- Field Guide Fronts section.
- App tests for critical display states.

### Verification

UI tests:

- Fronts tab/panel renders.
- The Pale Circuit appears as an owned front.
- Opportunities appear.
- Level, exposure, status, weekly yield, and related rival render.
- Upgrade cost or Max Level renders.
- Cap reached state renders.
- Invest preview shows cost, immediate effects, weekly yield, exposure, and rival warning.
- Front-targeted Lay Low preview shows exposure reduction.
- Field Guide explains Level, Exposure, Status, weekly yield, and front events.
- Existing Ledger, Contacts, Roster, Rivals, Event Feed, and Debug access remains intact.

### Review Gate

Manual UI review: confirm fronts are legible, compact, and command consequences are clear.

## Phase 9: Run Summary and Harness Reporting

### Objective

Make front outcomes measurable in run summaries and harness output.

### Scope

- Track front run stats:
  - established fronts
  - upgrades
  - weekly yield totals
  - resources generated by fronts
  - dominion generated by fronts
  - heat generated/reduced by fronts
  - final front exposure
  - front events triggered
  - final owned front count
- Add front data to run-end summary.
- Add harness sections:
  - front establishment rate
  - front upgrade rate
  - average owned front count
  - average weekly front yield
  - most profitable front
  - most dangerous front
  - most ignored front
  - front event counts
  - win rate by front opportunity set
  - loss correlation by final exposure band

### Implementation Notes

- Preserve existing harness CSV sections.
- Add front sections after existing contact/ledger sections unless there is a clearer local
  pattern.
- Reports should be deterministic for identical seeds.
- Keep report wording player-readable in the run-end panel.

### Deliverables

- Front run summary model.
- Front harness stats.
- CSV/report formatting updates.
- Tests for report aggregation.

### Verification

Unit tests:

- Run summary includes owned fronts.
- Run summary includes established/upgraded counts.
- Run summary includes final exposure/status.
- Harness reports average owned front count.
- Harness reports front establishment and upgrade rates.
- Harness reports front yield totals.
- Harness reports front event counts.
- Existing report sections remain present.

### Review Gate

Confirm the harness can answer whether fronts are being used and whether exposure matters.

## Phase 10: Agent Front Behavior

### Objective

Teach simulation agents enough front behavior to make harness balance meaningful.

### Scope

- Update RandomBot to randomly use valid front establish, upgrade, and cooling options.
- Update OperatorBot:
  - invest early if resources allow
  - prefer fronts that solve current strategic gaps
  - avoid high-exposure fronts when Heat is high
  - cool hot fronts when time remains
  - upgrade only when payback or immediate effects justify it
- Update CautiousBot:
  - prefer Shell Gallery, Black Clinic, Courier Line
  - avoid Zero Mercy Cut
  - cool fronts early
- Update AggressiveBot:
  - prefer Zero Mercy Cut and Dominion fronts
  - upgrade early
  - ignore exposure until severe
- Update GreedyBot:
  - prefer highest resource yield
  - accept exposure and debt risk
- Add deterministic agent tests where practical.

### Implementation Notes

- Agents should score legal order options; they should not call private front internals when
  selectors/previews can provide enough information.
- Operator does not need to be optimal.
- Do not overfit to a single seed.
- Keep behavior transparent enough to debug from harness output.

### Deliverables

- Front-aware agent scoring.
- Harness tests or snapshots for front order selection.
- Initial front-aware harness snapshot.

### Verification

Unit/harness tests:

- Agents simulate without crashing.
- Random can select front options.
- Operator establishes an early useful front when resources allow.
- Cautious avoids Zero Mercy Cut when safer options exist.
- Aggressive prefers high-Dominion/high-risk options.
- Greedy prefers resource-yielding fronts.
- Agents can target front Lay Low when appropriate.

### Review Gate

Confirm the harness produces useful front behavior before tuning.

## Phase 11: Balance Pass and Tuning

### Objective

Tune front costs, yields, exposure, event weights, and agent scoring against v0.6 targets.

### Scope

- Run deterministic 100-runs-per-agent harness samples.
- Compare against v0.5 baseline.
- Tune:
  - setup costs
  - upgrade costs
  - weekly yields
  - exposure on establish
  - exposure on upgrade
  - weekly exposure gain
  - front event weights
  - front event choice effects
  - agent front scoring
- Record before/after harness snapshots.
- Keep Fronts strategically useful but not mandatory.

### Target Profile

Broad balance:

```text
OperatorBot: 55-75% win rate
CautiousBot: low win rate, usually Dominion shortfall
RandomBot: 5-12% win rate
AggressiveBot: viable but volatile
GreedyBot: viable but swingy
```

Front-specific:

```text
Average owned fronts at end: 1.5-2.5
Average new fronts established per run: 0.5-1.5
Average upgrades per run: 0-1
Front events per run: 0-2
No front obviously optimal in every run
High-risk fronts create recognizable pressure
Late front investment usually bad unless immediate effects matter
```

### Implementation Notes

- If fronts are never used, payback is too slow or UI/agent scoring is weak.
- If every sane run opens with the same front, that front is too efficient.
- If high-risk fronts never create trouble, exposure/event weights are too soft.
- If front events dominate, event weights are too high.
- If Greedy wins too often, resource fronts are too strong.
- If Cautious wins consistently, safe fronts are too efficient.

### Deliverables

- Tuned front numbers.
- Updated agent scoring if needed.
- Recorded final pre-release harness snapshot.
- Notes on remaining balance risks.

### Verification

```bash
npm test -- --watch=false --include src/app/engine/harness/simulation-harness.spec.ts
npm test -- --watch=false
npm run build
npm run check:docs
git diff --check
```

Harness:

```text
100 runs per agent
front report sections
loss causes
win rates
average owned front count
front event counts
front establishment/upgrade rates
```

### Review Gate

Manual and harness review: confirm Fronts are useful, risky, and not mandatory.

## Phase 12: Release Readiness, Documentation, and Pages Build

### Objective

Prepare v0.6 for merge, deployment, smoke testing, and tagging.

### Scope

- Update README/docs links if any new v0.6 docs were added.
- Add v0.6 release notes draft.
- Update Field Guide copy if playtesting reveals missing explanations.
- Ensure debug-only Front data remains hidden in normal play.
- Run full validation suite.
- Run production Pages build.
- Run docs checker.
- Run final harness snapshot.
- Confirm no dev, Karma, or browser-debug process from this phase remains running.
- Leave package version policy unchanged unless explicitly decided otherwise.

### Implementation Notes

- GitHub tags and Releases remain the source of truth for release identity.
- README should link to the playable build and docs, not claim a mutable current
  development target.
- Do not introduce deployment changes unless the existing Pages workflow fails.
- Keep release notes concise and player-facing.

### Deliverables

- v0.6 release notes draft.
- Final green validation.
- Final harness snapshot.
- Ready-to-merge branch.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
npm run check:docs
git diff --check
```

Manual smoke test:

```text
start a new seeded run
open the Fronts tab
inspect The Pale Circuit
inspect front opportunities
queue Invest in Front to establish a new front
advance week and confirm weekly yield/exposure
upgrade an owned front
target Lay Low at a front
trigger or simulate a front event
finish or force-end a run
inspect front report output
```

### Review Gate

Merge to `main`, wait for Pages deployment, smoke test the deployed build, then tag
`v0.6.0` when satisfied.
