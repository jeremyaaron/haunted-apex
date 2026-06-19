# Haunted Apex v0.9.0 Handler Implementation Plan

## Purpose

This plan breaks **v0.9.0: The Handler** into reviewable implementation phases.

It follows [`Handler-TDD.md`](./Handler-TDD.md) and preserves the project rules established by
District Zero through The City Wakes:

- Keep the engine pure TypeScript.
- Keep Angular out of simulation rules.
- Keep static content separate from mutable run state.
- Keep seeded generation and simulation deterministic.
- Keep preview and resolution calculations shared.
- Keep every phase buildable and testable.
- Keep recommendations legal, explainable, and manually applied by the player.
- Treat HandlerBot validation as a release gate, not a nice-to-have report.

## Completion Target

The release is complete when an eight-week run supports:

```text
New run
  -> Training or Standard mode
  -> Campaign Tension
  -> visible How To Play entry point
  -> prominent Handler Guidance panel
  -> Advisor mode selection
  -> exact Handler advice when requested
  -> current-state HandlerBot harness validation
```

The player should be able to:

```text
start a Training Run with Handler advice enabled by default
start a Standard Run with Coach advice by default
understand the goal, turn flow, command points, actions, events, and loss conditions
see whether Dominion pace is healthy
receive warnings when a queued plan is dangerous
follow Handler recommendations without the game taking actions automatically
distinguish unvalidated custom seeds from standard generated runs
```

The release gate is strict:

```text
Training fixed config: Handler win required.
Standard validation set: 500 Standard runs.
Validation composition: 100 deterministic seeds per Campaign Tension.
Handler Standard wins: 500/500.
Handler Standard losses: 0.
Invalid recommendations: 0.
Softlocks/stalls: 0.
```

If HandlerBot cannot meet the gate, tune Handler logic or game balance before release.
Do not ship v0.9 with known Handler losses.

The tested production build remains playable at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

## Phase 0: Baseline and Documentation Lock

### Objective

Establish a clean v0.8 baseline, lock the v0.9 design inputs, and verify the repository before
changing run modes, persistence, Advisor state, or harness behavior.

### Scope

- Confirm the repository is based on the approved and tagged v0.8 release.
- Keep the v0.9 vision, clarifications, TDD, and implementation plan together under:

```text
docs/releases/v0.9-the-handler/
```

- Update docs indexes so v0.9 documents are discoverable.
- Run the existing test suite.
- Run app and spec type checks.
- Run the standard production build.
- Run the GitHub Pages subpath build.
- Run the docs link checker.
- Record the current test count and representative v0.8 harness baseline.
- Record the current storage key and save schema version.
- Confirm package version policy remains unchanged until release readiness.
- Confirm no dev, Karma, or browser-debug process from this phase remains running.

### Implementation Notes

- Do not change gameplay behavior in this phase.
- Do not update package version to `0.9.0` yet.
- Treat `v0.9.md`, `v0.9A.md`, and `Handler-TDD.md` as locked inputs unless implementation
  reveals a contradiction.
- Preserve the v0.8 balance output as the comparison point for Handler and Standard tuning.

### Deliverables

- Complete v0.9 design set.
- Green v0.8 baseline.
- Recorded pre-Handler harness results.
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
win rates by Campaign Tension
loss causes
average final pressures
event frequency
Ledger usage reports
contact reports
front reports
faction/accord reports
campaign modifier reports
```

### Completion Record

Completed June 18, 2026:

- Runtime validation used Node `24.16.0` from `.nvmrc`.
- Development baseline is branch `v0.9` at commit `59d6418`, which is the v0.8 merge commit on
  `github/main` and is tagged `v0.8.0`.
- The old remote `v0.8` branch has been pruned locally. The local `v0.8` branch remains only as
  historical local state and is not the v0.9 baseline.
- The v0.9 documentation set is organized under:

```text
docs/releases/v0.9-the-handler/
```

- Added the v0.9 direction, clarifications, TDD, and implementation plan to `docs/README.md`.
- Added the v0.9 release folder to the root README development-documentation list.
- Current package metadata remains `0.0.0`; version `0.9.0` is reserved for release readiness.
- Current persistence key is:

```text
haunted-apex:v0.8:current-run
```

- Current save schema version is `8`.
- Current game version is `0.8.0`.
- Phase 1 owns the run-mode schema change, `haunted-apex:v0.9:current-run`, v0.8 save
  invalidation, and dynamic Dominion target state.
- Current test count is `580` specs.
- Captured a deterministic 100-runs-per-agent baseline using seed prefix
  `V09-PHASE0-BASELINE`:

```text
Random:           0% wins, 0 incomplete, avg 7.19 weeks
Aggressive:      22% wins, 0 incomplete, avg 4.95 weeks
Cautious:         0% wins, 0 incomplete, avg 7.79 weeks
Greedy:           9% wins, 0 incomplete, avg 7.36 weeks
Operator / Sane: 69% wins, 0 incomplete, avg 7.17 weeks
```

- Baseline average final pressures:

```text
Random:           Dominion 47.24, Heat 31.64, Loyalty 59.39, Resources 1,680.50, Intel 39.57, Ruin 15.40
Aggressive:      Dominion 84.25, Heat 95.93, Loyalty 40.26, Resources 2,438.30, Intel 26.83, Ruin 14.91
Cautious:        Dominion 19.41, Heat  2.78, Loyalty 95.55, Resources 1,446.50, Intel 28.81, Ruin 10.89
Greedy:          Dominion 75.26, Heat 81.53, Loyalty 48.08, Resources 6,170.00, Intel 66.00, Ruin 31.40
Operator / Sane: Dominion 90.01, Heat 79.25, Loyalty 47.37, Resources 2,398.00, Intel 19.28, Ruin 21.78
```

- Primary baseline loss patterns:

```text
Random:           68 out of time, 29 bankrupt, 3 Heat lockdown
Aggressive:      71 Heat lockdown, 4 out of time, 3 bankrupt
Cautious:         94 out of time, 6 bankrupt
Greedy:           65 out of time, 26 Heat lockdown
Operator / Sane: 19 out of time, 6 Heat lockdown, 6 bankrupt
```

- Campaign-level baseline summary:

```text
Corp Crackdown:   93 runs, 25 wins, 68 losses, 26.9% win rate, avg Dominion 60.17, avg Heat 50.99
Nightlife War:   103 runs, 12 wins, 91 losses, 11.7% win rate, avg Dominion 61.88, avg Heat 54.89
Ghostline Signal:106 runs, 23 wins, 83 losses, 21.7% win rate, avg Dominion 63.44, avg Heat 57.47
Industrial Cut:  102 runs, 20 wins, 82 losses, 19.6% win rate, avg Dominion 64.35, avg Heat 70.18
Dirty Capital:    96 runs, 20 wins, 76 losses, 20.8% win rate, avg Dominion 66.23, avg Heat 56.95
```

- Verification passed:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
npm run check:docs
git diff --check
```

- Production build size at baseline:

```text
main:      634.84 kB raw, 140.78 kB estimated transfer
polyfills:  34.59 kB raw,  11.33 kB estimated transfer
initial:   669.59 kB raw, 152.27 kB estimated transfer
```

- No dev server, Karma watcher, or browser-debug process was intentionally left running by this
  phase.

## Phase 1: Run Mode, Schema, and Persistence

### Objective

Introduce first-class Training and Standard run modes without changing the player-facing UI yet.

### Scope

- Add `RunMode = 'training' | 'standard'`.
- Extend `NewGameConfig` with `runMode`.
- Add run metadata to `GameState`.
- Add dynamic Dominion target state.
- Set Standard Dominion target to `90`.
- Set Training Dominion target to `80`.
- Add validation status metadata for generated, fixed, and custom runs.
- Update save schema version to v0.9.
- Update localStorage key to the v0.9 key.
- Invalidate v0.8 saves cleanly.
- Preserve current `startNewRun(seed, campaignTensionId)` compatibility by delegating to
  Standard behavior.

### Implementation Notes

- Keep `challenge` out of visible v0.9 UI and tests.
- Ensure win/loss checks read the run-specific Dominion target rather than a global constant.
- Training and Standard should use the same core engine. Training is a configured run mode,
  not a separate game.

### Deliverables

- Run-mode types and selectors.
- v0.9 save schema and storage migration behavior.
- Dynamic Dominion victory threshold.
- Unit coverage for Training and Standard config values.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Completed June 18, 2026:

- Added `RunMode`, `RunValidationStatus`, and `RunSettings`.
- Extended `NewGameConfig` with `runMode` and `customSeed`.
- Updated `GameState` to schema version `9`.
- Added `state.run` metadata:

```text
mode
dominionTarget
validationStatus
customSeed
```

- Standard runs now default to:

```text
mode: standard
dominionTarget: 90
validationStatus: harness_validated for generated seeds, unvalidated for custom seeds
```

- Training-mode runs now use:

```text
mode: training
dominionTarget: 80
validationStatus: validated
```

- Added `getRunRules(state)` and routed Dominion victory checks through
  `state.run.dominionTarget`.
- Updated Dominion pressure meter percentage, target label, status strip, and Field Guide target
  copy to read the run-specific target.
- Updated OperatorBot's Dominion pace and finish heuristics to use the run-specific target.
- Updated persistence:

```text
CURRENT_SAVE_SCHEMA_VERSION = 9
CURRENT_GAME_VERSION = 0.9.0
CURRENT_RUN_STORAGE_KEY = haunted-apex:v0.9:current-run
LEGACY_V08_STORAGE_KEY = haunted-apex:v0.8:current-run
```

- v0.8 saves are invalidated cleanly. No migration is performed.
- Updated compatibility copy for v0.9.
- Added storage validation for run metadata.
- Preserved `startNewRun(seed, campaignTensionId)` compatibility as Standard behavior.
- Added focused tests for:
  - Standard custom seed run metadata,
  - generated Standard validation status,
  - Training Dominion target,
  - run-specific Dominion victory,
  - v0.8 save invalidation,
  - malformed run metadata rejection.
- Test count increased from `580` to `585` specs.
- Verification passed:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
npm run check:docs
git diff --check
```

- Production build size after Phase 1:

```text
main:      636.04 kB raw, 141.05 kB estimated transfer
polyfills:  34.59 kB raw,  11.33 kB estimated transfer
initial:   670.78 kB raw, 152.54 kB estimated transfer
```

- No dev server, Karma watcher, or browser-debug process was intentionally left running by this
  phase.

## Phase 2: Training Run Assembly

### Objective

Create the fixed, curated Training Run configuration that gives first-time players a forgiving
entry point and gives validation a deterministic Training target.

### Scope

- Add the fixed Training config:
  - seed,
  - Campaign Tension,
  - starting state overrides if needed,
  - starting roster assumptions if needed,
  - Training validation metadata.
- Add facade support for `startTrainingRun()`.
- Add `startStandardRun(seed?, campaignTensionId?)`.
- Ensure Training defaults to Advisor Handler mode once Advisor preferences exist.
- Ensure Standard retains saved Advisor preference, or defaults to Coach when no preference exists.
- Mark custom Standard seed runs as `Unvalidated`.

### Implementation Notes

- Keep Training deterministic.
- Keep Training easier, but do not add hidden tutorial-only rules unless explicitly justified.
- The Training config must be replayable by harness validation.

### Deliverables

- Training config static data.
- Run creation helpers for Training and Standard.
- Tests proving Training target `80`, Standard target `90`, and custom Standard validation copy.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

### Completion Record

Completed June 18, 2026:

- Added `TRAINING_RUN_CONFIG` under the simulation engine.
- Fixed Training config is:

```text
runMode: training
seed: TRAINING-GLASS-CROWN-001
campaignTensionId: campaign_dirty_capital
customSeed: false
```

- Training run assembly now produces:

```text
mode: training
dominionTarget: 80
validationStatus: validated
customSeed: false
```

- Added `GameFacade.startTrainingRun()`.
- Added `GameFacade.startStandardRun(seed?, campaignTensionId?)`.
- Preserved `GameFacade.startNewRun(seed?, campaignTensionId?)` as a Standard-run compatibility
  wrapper.
- Existing visible New Run UI still uses Standard behavior. Dedicated Training/Standard controls
  remain scheduled for Phase 12.
- Advisor-mode defaults are intentionally deferred to Phase 3, where Advisor preferences are
  introduced.
- Added focused tests for:
  - fixed Training config values,
  - Training run persistence through the facade,
  - Standard custom seed `unvalidated` metadata through the facade.
- Test count increased from `585` to `587` specs.
- Verification passed:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
npm run check:docs
git diff --check
```

- Production build size after Phase 2:

```text
main:      636.27 kB raw, 141.12 kB estimated transfer
polyfills:  34.59 kB raw,  11.33 kB estimated transfer
initial:   671.02 kB raw, 152.61 kB estimated transfer
```

- No dev server, Karma watcher, or browser-debug process was intentionally left running by this
  phase.

## Phase 3: Advisor Types, Preferences, and Dominion Pace

### Objective

Add the Advisor domain shell and player preference model before implementing strategic
recommendations.

### Scope

- Add Advisor engine folder and exports:

```text
src/app/engine/advisor/
  advisor-types.ts
  advisor-preferences.ts
  dominion-pace.ts
  advisor-view-model.ts
  index.ts
```

- Add `AdvisorMode = 'off' | 'hints' | 'coach' | 'handler'`.
- Add preference persistence for Advisor mode.
- Add malformed preference fallback.
- Add default Advisor mode selection:
  - Training: Handler.
  - Standard: saved preference, else Coach.
- Add Dominion pace calculation.
- Add pressure warning and opportunity message primitives.
- Export Advisor APIs through `engine/index.ts`.

### Implementation Notes

- Preference state belongs near facade/application state, but strategic interpretation belongs
  in pure engine selectors.
- Dominion pace should be useful without requiring Handler policy to exist yet.

### Deliverables

- Advisor types.
- Advisor preference storage.
- Dominion pace selector.
- Initial Advisor view model with no exact recommendations.
- Unit tests for defaults, persistence, and pace bands.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Pending.

## Phase 4: Legal Option Enumeration and Recommendation Inputs

### Objective

Create one engine-level source for legal Handler candidate inputs using existing availability and
preview logic.

### Scope

- Add legal order option enumeration for all currently queueable actions.
- Include:
  - action id,
  - action label,
  - target if required,
  - target label,
  - assigned operative if available,
  - assignment label,
  - preview,
  - cost,
  - risk,
  - availability status.
- Add legal event choice option enumeration.
- Ensure options respect:
  - command points,
  - target requirements,
  - affordability,
  - operative availability,
  - current queued orders.
- Add stable keys for recommended targets and assignments.

### Implementation Notes

- Reuse existing selectors such as `getOrderAvailability`, `getActionPreview`,
  `selectActionTargetOptions`, `selectAssignmentOptions`, and `getEventChoicePreview`.
- Do not duplicate action legality rules inside HandlerBot.
- This phase should expose enough data for policy scoring without choosing a policy yet.

### Deliverables

- Legal option types and selectors.
- Tests covering target requirements, affordability, assignment availability, and event choice
  validity.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

### Completion Record

Pending.

## Phase 5: Handler Command Policy

### Objective

Implement HandlerBot's current-turn command policy and make it capable of recommending legal,
explainable orders.

### Scope

- Add:

```text
handler-policy.ts
handler-recommendations.ts
```

- Generate legal one-order candidates.
- Generate legal two-order combinations by simulating the first queued order and recomputing
  legal options for the second.
- Score candidates by:
  - immediate loss prevention,
  - Dominion pace,
  - Heat safety,
  - Loyalty safety,
  - Resources safety,
  - useful Ledger, Contact, Front, Accord, and faction effects,
  - operative stress,
  - campaign priorities,
  - risk chance,
  - avoidable Debt, Ruin, Obligation, Exposure, and Volatility.
- Return recommended orders, confidence, reasons, reason codes, warnings, and opportunities.
- Count and expose invalid recommendations.

### Implementation Notes

- HandlerBot may evaluate current-turn combinations. It must not run multi-week search.
- Handler should prefer robust states over high-Dominion states that immediately lose to Heat,
  bankruptcy, or Loyalty collapse.
- Explanations should be player-readable and not leak implementation jargon.

### Deliverables

- Handler command recommendation engine.
- Unit tests proving recommended orders are legal, affordable, target-valid, assignment-valid,
  explainable, and non-mutating.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

### Completion Record

Pending.

## Phase 6: Handler Event Policy and Decision Trace

### Objective

Add Handler event-choice recommendations and trace output for validation and debugging.

### Scope

- Add:

```text
handler-event-policy.ts
run-validation.ts
```

- Score legal event choices by:
  - immediate loss prevention,
  - Dominion pace if safe,
  - red-zone pressure reduction,
  - affordability,
  - Debt, Ruin, Obligation, Exposure, Volatility, and Trust impact,
  - preservation of future recovery tools,
  - strategic gain when stable.
- Add event recommendation reasons, confidence, warnings, and reason codes.
- Add `HandlerDecisionTraceEntry`.
- Ensure event recommendation uses only current visible state and current event choices.

### Implementation Notes

- Event policy must not assume future event draws.
- Trace output should be compact enough for harness CSV/report sections but detailed enough to
  investigate losses.

### Deliverables

- Handler event recommendation engine.
- Decision trace types and helpers.
- Tests proving event recommendations are legal, explainable, and non-mutating.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

### Completion Record

Pending.

## Phase 7: Partial Queue Assessment

### Objective

Make Handler advice adapt to player-queued orders instead of assuming a blank command queue.

### Scope

- Add queued plan assessment:

```ts
status: 'stable' | 'risky' | 'dangerous'
summary: string
warnings: AdvisorMessage[]
suggestedRemovals: string[]
```

- Support:
  - no queued orders: full recommended plan,
  - one queued order: evaluate the queued order and recommend the best remaining order,
  - full queue: assess current plan and show stability or warnings,
  - risky queued order: explain risk and suggest replacement/removal.
- Ensure assessment does not mutate state.

### Implementation Notes

- This phase is important for player trust. Advice should respond to what the player has already
  done rather than pretending the turn is empty.
- Suggested removals should refer to order ids or stable queue entries, not display text.

### Deliverables

- Queue assessment engine.
- Advisor recommendation output updated for partial queue states.
- Tests for zero, one, and full queued-order scenarios.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

### Completion Record

Pending.

## Phase 8: HandlerBot Harness Adapter and Reports

### Objective

Add HandlerBot as a distinct harness strategy and report its behavior without replacing existing
agents.

### Scope

- Add `HANDLER_BOT`.
- Keep existing `STRATEGY_AGENTS` compatibility explicit.
- Add `EXTENDED_STRATEGY_AGENTS` or a Handler validation-specific entry point.
- Adapt Handler recommendations into harness commands and event choices.
- Add invalid recommendation counting.
- Add stall and softlock detection.
- Extend reports with:
  - `handler_validation_summary`,
  - `handler_campaign_summary`,
  - `handler_loss_causes`,
  - `handler_invalid_recommendations`,
  - `handler_confidence_distribution`,
  - `handler_training_validation`,
  - `handler_operator_delta`.

### Implementation Notes

- The harness should consume Handler policy. It should not implement a separate Handler strategy.
- If a Handler recommendation cannot be applied, count it as invalid and fail validation.
- Keep existing agent reports stable unless extending them is low-risk.

### Deliverables

- HandlerBot harness strategy.
- Handler report sections.
- Focused tests proving HandlerBot can complete a run and reports appear.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

### Completion Record

Pending.

## Phase 9: Validation Seeds and Release Gate Runner

### Objective

Implement the deterministic Handler validation set and fail-fast release gate.

### Scope

- Add Standard validation seed source:

```text
src/app/engine/advisor/standard-validation-seeds.ts
```

- Include exactly `100` deterministic seeds per Campaign Tension.
- Add Training validation runner.
- Add Standard validation runner.
- Require:
  - Training fixed config: Handler win.
  - Standard validation set: 500 runs.
  - Standard Handler wins: 500/500.
  - Standard Handler losses: 0.
  - Invalid recommendations: 0.
  - Softlocks/stalls: 0.
- Add validation summary failure reasons.
- Add a script or npm command if useful for full release validation.

### Implementation Notes

- This is not a certified seed bank.
- This is not runtime run certification.
- This is build-level confidence from deterministic Handler trials.
- Ordinary unit tests can use a smaller fixture if the full 500-run set is too slow for every
  test invocation, but Phase 14 must run the full validation set.

### Deliverables

- Deterministic validation seed set.
- Handler validation runner.
- Failure summary output useful enough to investigate losses.
- Tests proving seed counts and failure conditions.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
git diff --check
```

Focused validation:

```text
Training fixed config: Handler win.
Standard validation set size: 500.
Per-Campaign seed count: 100.
Any Handler loss fails validation.
Any invalid recommendation fails validation.
Any softlock or stall fails validation.
```

### Completion Record

Pending.

## Phase 10: Advisor Facade and View Model Integration

### Objective

Connect Advisor engine outputs to Angular through the facade without putting strategy logic in
the UI.

### Scope

- Add facade computed state for `AdvisorViewModel`.
- Add facade methods:
  - `setAdvisorMode(mode)`,
  - `startTrainingRun()`,
  - `startStandardRun(seed?, campaignTensionId?)`.
- Add selectors for recommendation highlights:
  - action,
  - target,
  - operative,
  - event choice.
- Add run mode and validation status selectors.
- Ensure Advisor view model filters output by mode:
  - Off: no panel.
  - Hints: current read, warnings, opportunities, no exact picks.
  - Coach: strategic recommendations, no complete order plan.
  - Handler: exact orders, targets, operatives, event choices.

### Implementation Notes

- Do not auto-queue orders.
- Do not auto-select targets or operatives.
- Do not auto-resolve event choices.
- UI should consume presentation-ready strings and ids, not scoring internals.

### Deliverables

- Facade integration.
- Advisor mode filtering.
- Highlight selectors.
- Tests for facade behavior and no-auto-action guarantees.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Pending.

## Phase 11: Advisor Panel UI and Recommendation Highlights

### Objective

Render Handler Guidance prominently and make recommendations actionable without taking control
away from the player.

### Scope

- Add Handler Guidance panel above the fold near the Command Board.
- Add Advisor mode selector.
- Render:
  - Current Read,
  - Recommendation,
  - Why,
  - Warnings,
  - Dominion pace.
- Render exact Handler recommendations in Handler mode.
- Render non-exact advice in Hints and Coach mode.
- Highlight recommended:
  - action cards,
  - targets,
  - operative assignments,
  - event choices.
- Add "Handler Pick" chip or equivalent marker.
- Add risky queued-order warning chips.

### Implementation Notes

- Keep the page dense and scannable. This is a playability release, not the art/music pass.
- Avoid moving major panels unless necessary for the Advisor panel to be visible.
- Make highlights clear but not so visually loud that they hide normal game state.

### Deliverables

- Advisor panel UI.
- Recommendation highlights.
- Tests for mode-specific rendering and no auto-queue behavior.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npm run build
git diff --check
```

Manual smoke:

```text
Advisor Off hides the panel.
Hints shows no exact order plan.
Coach shows strategic advice without exact picks.
Handler shows exact action, target, operative, and event choice picks.
Highlights render but do not take action.
```

### Completion Record

Pending.

## Phase 12: How To Play, Training Controls, and Run Labels

### Objective

Make the basic game loop visible to a cold player before they need to scroll to the Field Guide.

### Scope

- Add visible How To Play header action.
- Implement modal or side drawer.
- Include:
  - goal,
  - loss conditions,
  - turn structure,
  - command points,
  - actions, targets, and operatives,
  - Advance Week,
  - events,
  - Advisor modes,
  - Training versus Standard,
  - pressure glossary,
  - tags as role hints.
- Add new-run controls for:
  - Training Run,
  - Standard Run,
  - Campaign Tension selection for Standard,
  - seed entry for Standard.
- Show run mode and validation status in the header.
- Show custom seed `Unvalidated` copy.
- Keep or update Field Guide copy so it complements the How To Play drawer.

### Implementation Notes

- Reuse Field Guide content where it is still accurate.
- The How To Play entry point must be visible without scrolling.
- Do not bury essential turn-flow rules below the Event Feed.

### Deliverables

- How To Play drawer or modal.
- Training and Standard start controls.
- Run mode and validation labels.
- Angular tests for open/close and visible labels.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npm run build
git diff --check
```

Manual smoke:

```text
How To Play is visible.
How To Play opens and closes.
Training Run starts at Dominion target 80.
Standard Run starts at Dominion target 90.
Custom seed is labeled Unvalidated.
```

### Completion Record

Pending.

## Phase 13: Handler Balance and Reliability Pass

### Objective

Use the validation runner to tune Handler logic and game balance until the strict v0.9 gate is
met.

### Scope

- Run Training validation.
- Run Standard 500-run validation.
- Investigate every Handler loss.
- Investigate every invalid recommendation.
- Investigate every softlock or stall.
- Tune in this order:
  1. Fix bugs or invalid state.
  2. Fix Handler blind spots if obvious and teachable.
  3. Improve previews/guidance if the issue is legibility.
  4. Tune campaign modifiers.
  5. Tune event severity or weights.
  6. Tune action yields or costs.
  7. Tune Standard Dominion target or campaign length only if systemic.
- Preserve non-Handler agents as useful diagnostics, not release gates.

### Implementation Notes

- Handler losses are not acceptable release risk in v0.9.
- If Handler advice loses, either the Handler is not smart enough or the game is too hard.
- Do not solve the gate by turning HandlerBot into a deep-search oracle.
- Prefer readable, teachable current-state heuristics and legible balance.

### Deliverables

- Handler validation report showing:
  - Training fixed config won.
  - Standard Handler wins 500/500.
  - Invalid recommendations 0.
  - Softlocks/stalls 0.
- Balance notes summarizing any tuning.
- Updated tests if tuning changes rule expectations.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npm run build
git diff --check
```

Validation gate:

```text
Training fixed config: Handler win.
Standard validation set: 500 Standard runs.
Handler Standard wins: 500/500.
Handler Standard losses: 0.
Invalid recommendations: 0.
Softlocks/stalls: 0.
```

### Completion Record

Pending.

## Phase 14: Polish, Regression Tests, and Documentation

### Objective

Tighten the UI, broaden tests around the new player experience, and update documentation before
release validation.

### Scope

- Add or update tests for:
  - Advisor mode persistence,
  - Training default Handler mode,
  - Standard default Coach mode,
  - custom seed Unvalidated label,
  - How To Play visibility,
  - recommendation highlighting,
  - event recommendation highlighting,
  - no auto-queue or auto-apply behavior,
  - v0.8 save invalidation,
  - v0.9 save round-trip.
- Update docs:
  - root README if current release notes need changed,
  - docs index,
  - release notes draft if used for v0.9,
  - any stale Field Guide wording.
- Check for enum/code labels leaking into UI.
- Check responsive layout after adding the Advisor panel.
- Confirm no bundle warning management requires user intervention.

### Implementation Notes

- Keep this phase focused on release polish and regression coverage.
- If build-size thresholds need adjustment, handle it as part of implementation and do not create
  a recurring user-facing blocker.

### Deliverables

- Polished Advisor and How To Play UI.
- Updated docs.
- Green regression suite.
- No stale development callouts.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run check:docs
git diff --check
```

Manual smoke:

```text
Training Run starts cleanly.
Standard Run starts cleanly.
Advisor modes switch correctly.
Recommendations adapt after queuing one order.
Recommendations adapt after queuing two orders.
Event recommendation appears when an event is pending.
How To Play is visible and readable.
No visible enum labels leak into player-facing text.
```

### Completion Record

Pending.

## Phase 15: Release Readiness and Pages Build

### Objective

Prove v0.9 is shippable, including the full Handler validation gate and deployable Pages build.

### Scope

- Run the full automated verification suite.
- Run the full Handler validation gate.
- Run the GitHub Pages subpath build.
- Smoke-test the production build locally if practical.
- Confirm package/release metadata for `0.9.0`.
- Draft or update v0.9 release notes.
- Confirm no dev server or validation process remains running.

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

Handler validation:

```text
Training fixed config: Handler win required.
Standard validation set: 500 Standard runs.
Validation composition: 100 deterministic seeds per Campaign Tension.
Handler Standard wins: 500/500.
Handler Standard losses: 0.
Invalid recommendations: 0.
Softlocks/stalls: 0.
```

Manual release smoke:

```text
start Training Run
verify target 80
verify Handler mode
follow Handler recommendations for several turns
verify event choice recommendation appears
start Standard Run without saved preference
verify Coach default
start Standard Run with custom seed
verify Unvalidated copy
open How To Play
switch Advisor modes
verify Off hides panel
verify Handler highlights controls without auto-queueing
finish or force-end run and inspect summary
run harness and inspect Handler report sections
```

### Completion Record

Pending.

## Release Acceptance Criteria

v0.9.0 is complete when:

```text
HandlerBot exists as a distinct bot from OperatorBot.
HandlerBot uses current-state policy, not deep search.
HandlerBot chooses command-phase orders and event choices.
HandlerBot recommendations are legal and explainable.
Advisor has Off, Hints, Coach, and Handler modes.
Handler mode provides exact actions, targets, operatives, and event choices.
Advisor does not auto-queue or auto-apply recommendations.
Advisor adapts to partially queued orders.
Recommendation highlights render without taking action for the player.
Training Run exists with fixed curated config.
Training Run defaults to Handler mode.
Training Run uses Dominion target 80.
Standard Run uses Dominion target 90.
Custom Standard seeds are labeled Unvalidated.
Fixed Training config wins under Handler validation.
Standard validation set is deterministic and reproducible.
Standard validation set contains 100 seeds per Campaign Tension.
Standard Handler validation wins 500/500 runs.
Any Handler loss blocks release until investigated.
Invalid recommendation count is zero.
Softlock/stall count is zero.
Dominion pace guidance exists.
How To Play is visible above the fold through a header action.
The game is materially easier for a cold player to start.
```
