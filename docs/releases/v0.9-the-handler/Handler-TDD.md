# Haunted Apex v0.9.0 Handler TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.9.0: The Handler**.

District Zero established the pressure loop:

```text
Action -> Pressure Outcome
```

Rival Territory made places and rivals matter:

```text
Action + Target -> Outcome + Local Change + Rival Reaction
```

The Roster made crew identity persistent:

```text
Action + Operative + Target -> Outcome + Stress + Personal Consequence
```

The Black Ledger made consequences named, persistent, and spendable:

```text
Action/Event -> Secret/Debt/Favor -> Later Use or Later Pressure
```

Entanglements made outside relationships useful and dangerous:

```text
Action/Event/Ledger + Contact State
  -> Pressure Outcome
  + Relationship Change
  + Future Hook
```

Fronts added owned infrastructure:

```text
Invest/Weekly Event + Front State
  -> Recurring Yield
  + Exposure
  + Rival Attention
  + Event Hook
```

The Accords added institutional bargains:

```text
Broker/Action/Event + Faction State + Active Accords
  -> Pressure Outcome
  + Standing/Suspicion/Obligation
  + Short-Term Bargain
  + Future Political Pressure
```

The City Wakes added run-level identity:

```text
Seed + Campaign Tension + City Identity
  -> Coherent starting board
  + Biased generators
  + Tension-weighted events
  + Opening briefing
  + Campaign-aware reports
```

The Handler adds playability and learnability:

```text
Current GameState + legal previews + Handler policy
  -> explainable recommendations
  + visible guidance
  + Training Run safety
  + validation reports
```

The release succeeds when a cold player can understand what to do, follow exact Handler guidance
in Training, and win without hidden deep-search play.

## Source Documents

- [`v0.9.md`](./v0.9.md): product vision, HandlerBot philosophy, Advisor UX, validation
  targets, and learnability goals.
- [`v0.9A.md`](./v0.9A.md): locked mechanical decisions and canonical answers to open
  questions.
- [`CityWakes-TDD.md`](../v0.8-the-city-wakes/CityWakes-TDD.md): current Campaign Tension,
  run assembly, save schema, and Campaign harness architecture.
- [`Accords-TDD.md`](../v0.7-the-accords/Accords-TDD.md): Faction, Accord, report, and
  persistence architecture.
- [`Fronts-TDD.md`](../v0.6-fronts/Fronts-TDD.md): Front generation, Front events, and
  ownership architecture.
- [`Entanglements-TDD.md`](../v0.5-entanglements/Entanglements-TDD.md): Contact generation,
  Contact events, and relationship-effect conventions.
- [`BlackLedger-TDD.md`](../v0.4-the-black-ledger/BlackLedger-TDD.md): Ledger architecture
  and persistent entry conventions.
- [`Roster-TDD.md`](../v0.3-the-roster/Roster-TDD.md): operative generation, stress, and
  roster architecture.
- [`RivalTerritory-TDD.md`](../v0.2-rival-territory/RivalTerritory-TDD.md): targeting,
  territory, rival, and GitHub Pages architecture.
- [`DistrictZero-TDD.md`](../v0.1-district-zero/DistrictZero-TDD.md): original pressure loop
  and deterministic simulation architecture.
- [`Layer1.md`](../../foundation/Layer1.md): long-term product identity and simulation
  philosophy.

When these documents differ, `v0.9A.md` is canonical for v0.9 behavior.

## Goals

- Add `HandlerBot` as a distinct strategy from `OperatorBot`.
- Keep `OperatorBot` as the sane benchmark strategy.
- Make `HandlerBot` the explicit-advice and validation strategy.
- Ensure `HandlerBot` uses current state, legal previews, visible history, and current rules only.
- Prevent deep search, future event inspection, runtime LLM calls, or hidden oracle logic.
- Add Advisor modes:
  - `off`
  - `hints`
  - `coach`
  - `handler`
- Add a visible Handler Guidance panel above the fold near the Command Board.
- Add exact command-phase recommendations in Handler mode.
- Add exact event-choice recommendations in Handler mode.
- Add non-exact warnings/opportunities in Hints mode.
- Add strategic direction without full order plans in Coach mode.
- Add explanation text for recommendations.
- Add Dominion pace guidance.
- Add critical pressure warnings.
- Add recommendation highlighting for actions, targets, operatives, and event choices.
- Preserve player agency by requiring manual clicks for all recommended actions.
- Add a visible How To Play header action that opens a modal or drawer.
- Add Training Run mode with one deterministic curated config.
- Set Training Advisor mode to `handler` by default.
- Set Standard Advisor mode to saved preference, or `coach` when no preference exists.
- Set Training Dominion target to `80`.
- Keep Standard Dominion target at `90` unless validation proves Standard is overtuned.
- Mark custom Standard seeds as `Unvalidated` unless runtime validation exists.
- Add Handler validation reports and release gates.
- Add a fixed 100-seed-per-Campaign Standard validation set.
- Ensure fixed Training config wins with Handler.
- Ensure Standard Handler validation wins 500/500 runs.
- Count invalid recommendations and fail validation on any invalid recommendation.
- Count softlocks/stalls and fail validation on any softlock or stall.
- Invalidate v0.8 saves through schema versioning.

## Non-Goals

- Visual or audio immersion.
- Image/media system.
- Soundtrack player.
- New factions, fronts, contacts, operatives, or simulation systems.
- Full scripted tutorial campaign.
- Animated tutorial overlays.
- Auto-play.
- Auto-queue.
- Auto-apply.
- Runtime LLM advisor.
- Deep search solver.
- Oracle certification.
- Server-side validation.
- Multiplayer.
- Full difficulty overhaul beyond Training and Standard.

## Current Architecture Summary

The current v0.8 architecture is suitable for v0.9:

```text
Angular App
  -> GameFacade
  -> pure TypeScript engine
  -> localStorage persistence
```

Important current boundaries:

- `newGame(config)` delegates to `assembleNewRun(config)`.
- `GameState` schema version is `8`.
- `NewGameConfig` currently supports seed and Campaign Tension selection.
- Dominion victory currently uses `DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.dominionVictory`.
- Action legality and previews are already exposed through selectors:
  - `getOrderAvailability`
  - `getActionPreview`
  - `selectActionTargetOptions`
  - `selectAssignmentOptions`
  - `selectActionCards`
- Event choice legality and previews are already exposed through:
  - `getEventChoiceAvailability`
  - `getEventChoicePreview`
- Harness agents live under `engine/harness/agents.ts`.
- Harness simulation already queues legal orders and resolves legal event choices.

v0.9 should reuse these boundaries. HandlerBot must be engine-level logic, not Angular UI logic.

## High-Level Architecture

Add a new Advisor domain under the engine:

```text
src/app/engine/advisor/
  advisor-types.ts
  advisor-preferences.ts
  dominion-pace.ts
  handler-policy.ts
  handler-event-policy.ts
  handler-recommendations.ts
  advisor-view-model.ts
  run-validation.ts
  validation-seeds.ts
  advisor-reports.ts
```

Re-export public Advisor APIs through:

```text
src/app/engine/advisor/index.ts
src/app/engine/index.ts
```

Integrate HandlerBot with harness agents without making the Advisor UI depend on harness code:

```text
handler-policy.ts
  -> pure recommendation policy

harness/agents.ts
  -> HandlerBot adapter around handler-policy

advisor-view-model.ts
  -> player-facing view model around handler-policy
```

This keeps one source of truth for Handler decisions while preserving separate consumers:

```text
Harness simulation
Advisor UI
Validation reports
Tests
```

## Run Modes

Add first-class run mode:

```ts
export type RunMode = 'training' | 'standard';
```

`challenge` is a future hook and should not be visible in v0.9.

Extend `NewGameConfig`:

```ts
export type NewGameConfig = {
  seed?: string;
  difficulty?: Difficulty;
  campaignTensionId?: CampaignTensionId;
  runMode?: RunMode;
  customSeed?: boolean;
};
```

`difficulty` can remain for compatibility, but `runMode` becomes the v0.9 player-facing concept.

Add run metadata to `GameState`:

```ts
export type RunValidationStatus = 'validated' | 'harness_validated' | 'unvalidated';

export type RunSettings = {
  mode: RunMode;
  dominionTarget: number;
  validationStatus: RunValidationStatus;
  customSeed: boolean;
};

export type GameState = {
  schemaVersion: 9;
  ...
  run: RunSettings;
};
```

Rationale:

- Dominion target must be state-specific.
- Training must use target `80`; Standard starts at target `90`.
- UI and reports need to display run mode and validation status.
- Win/loss checks should use `state.run.dominionTarget`, not a global target constant.

## Training Run Config

Add a fixed v0.9 Training config:

```ts
export const TRAINING_RUN_CONFIG = {
  runMode: 'training',
  seed: 'TRAINING-GLASS-CROWN-001',
  campaignTensionId: 'campaign_dirty_capital',
  advisorMode: 'handler',
  dominionTarget: 80,
} as const;
```

The vision document suggested `dirty_capital`; the existing engine id is
`campaign_dirty_capital`, so the implementation should use the existing id.

Training run behavior:

```text
fixed seed
fixed Dirty Capital campaign
Dominion target 80
validation status Validated
Advisor mode Handler
```

Training must be deterministic. If Dirty Capital proves too harsh, tune the fixed Training config
or Training-specific balancing hooks before expanding to generated Training runs.

## Standard Run Behavior

Standard run behavior:

```text
selected/random Campaign Tension
Dominion target 90
saved Advisor preference if present
Coach if no saved Advisor preference exists
generated non-custom seed: Harness Validated
custom seed: Unvalidated
```

Custom seed detection:

- If the player types a seed or the app passes a seed from the seed input, set `customSeed: true`.
- If the app creates the default seed internally, set `customSeed: false`.

In v0.9, custom seed does not need runtime validation.

Player-facing copy:

```text
Custom Seed: Unvalidated
This seed has not been checked against Handler guidance and may be harder or less balanced than standard generated runs.
```

## Rules Context

Add a small rules helper:

```ts
export type RunRules = {
  dominionTarget: number;
  heatLoss: number;
  loyaltyLoss: number;
  resourceLoss: number;
  maxWeeks: number;
};

export function getRunRules(state: GameState): RunRules;
```

Initial implementation:

```text
dominionTarget = state.run.dominionTarget
heatLoss = DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.heatLoss
loyaltyLoss = DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.loyaltyLoss
resourceLoss = DISTRICT_ZERO_WIN_LOSS_THRESHOLDS.resourceLoss
maxWeeks = state.maxWeeks
```

Use `getRunRules(state).dominionTarget` in:

- win/loss checks
- pressure meter target text
- Dominion meter percentage
- Advisor pace calculations
- run summary
- harness reports where target matters
- Handler scoring

Do not rewrite every constant in one pass. Keep the global constants as defaults and use run rules
where run-specific behavior is required.

## Persistence

Increment persistence:

```ts
CURRENT_SAVE_SCHEMA_VERSION = 9;
CURRENT_GAME_VERSION = '0.9.0';
CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.9:current-run';
LEGACY_V08_STORAGE_KEY = 'haunted-apex:v0.8:current-run';
```

Update compatibility copy:

```text
Detected an older save. v0.9.0 - The Handler changes the game state schema and requires a fresh run.
```

Stored run validation must require:

```text
schemaVersion === 9
state.run.mode is training or standard
state.run.dominionTarget is a positive number
state.run.validationStatus is validated, harness_validated, or unvalidated
state.run.customSeed is boolean
```

v0.8 saves are invalidated. No migration is required.

## Advisor Preferences

Add localStorage-backed preferences separate from run saves:

```ts
export type AdvisorMode = 'off' | 'hints' | 'coach' | 'handler';

export type UserPreferences = {
  advisorMode: AdvisorMode;
  hasSeenTrainingPrompt?: boolean;
};
```

Suggested storage key:

```text
haunted-apex:user-preferences:v1
```

Preferences should be intentionally small and versioned independently from `GameState`.

Default mode helper:

```ts
export function getDefaultAdvisorMode(
  runMode: RunMode,
  savedPreference: AdvisorMode | undefined,
): AdvisorMode {
  if (runMode === 'training') {
    return 'handler';
  }

  return savedPreference ?? 'coach';
}
```

Behavior:

- Training always starts in Handler mode.
- Standard uses saved preference when available.
- Standard defaults to Coach when there is no saved preference.
- Changing Advisor mode persists the preference.
- Switching Training away from Handler is allowed, but starting a new Training run resets to
  Handler.

## Dominion Pace

Add:

```ts
export type DominionPaceStatus = 'ahead' | 'on_pace' | 'behind' | 'critical';

export type DominionPaceView = {
  target: number;
  current: number;
  dominionNeeded: number;
  weeksRemaining: number;
  requiredPerWeek: number;
  actualPerWeek: number;
  status: DominionPaceStatus;
  summary: string;
};
```

Calculation:

```ts
dominionNeeded = Math.max(0, target - currentDominion);
weeksRemaining = Math.max(1, maxWeeks - currentWeek + 1);
requiredPerWeek = dominionNeeded / weeksRemaining;
```

Use bands:

```text
ahead: projected Dominion exceeds target with cushion
on_pace: required per week is manageable
behind: required per week is elevated but recoverable
critical: required per week is unlikely without high-risk Dominion play
```

The exact numeric bands can tune during implementation, but they should be deterministic and tested.

Advisor display examples:

```text
Dominion Pace: You need about 9.8 Dominion per week to win.
Dominion Pace: You are ahead of pace. Stabilize Heat or Loyalty before pushing again.
```

## HandlerBot Contract

Add `HandlerBot` as a strategy agent:

```ts
export const HANDLER_BOT: StrategyAgent = {
  id: 'handler',
  label: 'HandlerBot',
  ...
};
```

Include HandlerBot in harness reports, but keep existing `STRATEGY_AGENTS` compatibility explicit:

```ts
export const STRATEGY_AGENTS = [
  RANDOM_BOT,
  AGGRESSIVE_BOT,
  CAUTIOUS_BOT,
  GREEDY_BOT,
  OPERATOR_BOT,
] as const;

export const EXTENDED_STRATEGY_AGENTS = [
  ...STRATEGY_AGENTS,
  HANDLER_BOT,
] as const;
```

If changing existing UI harness output to include HandlerBot is low-risk, update it to use
`EXTENDED_STRATEGY_AGENTS`. Otherwise, add a Handler validation-specific harness entry point.

HandlerBot must:

- choose only legal order recommendations,
- choose only legal event choices,
- respect command points,
- respect target requirements,
- respect operative availability,
- respect affordability,
- produce explanations,
- expose confidence,
- adapt to queued orders,
- never inspect future random results or future event selections.

## Handler Recommendation Types

Core types:

```ts
export type AdvisorConfidence = 'high' | 'medium' | 'low';

export type HandlerRecommendationPhase = 'command' | 'event' | 'game_over';

export type HandlerReasonCode =
  | 'dominion_pace'
  | 'heat_crisis'
  | 'resource_danger'
  | 'loyalty_danger'
  | 'useful_ledger'
  | 'front_exposure'
  | 'faction_obligation'
  | 'contact_volatility'
  | 'operative_stress'
  | 'campaign_priority'
  | 'plan_warning'
  | 'training_safety';
```

Command recommendation:

```ts
export type HandlerRecommendedOrder = {
  actionId: ActionId;
  actionLabel: string;
  target?: ActionTarget;
  targetLabel?: string;
  assignedOperativeId?: OperativeId;
  operativeName?: string;
  preview: ActionPreview;
  confidence: AdvisorConfidence;
  reason: string;
  reasonCodes: HandlerReasonCode[];
  warnings: AdvisorMessage[];
};
```

Event recommendation:

```ts
export type HandlerEventRecommendation = {
  eventId: EventId;
  choiceId: EventChoiceId;
  choiceLabel: string;
  confidence: AdvisorConfidence;
  reason: string;
  reasonCodes: HandlerReasonCode[];
  warnings: AdvisorMessage[];
};
```

Full recommendation:

```ts
export type HandlerRecommendation = {
  phase: HandlerRecommendationPhase;
  confidence: AdvisorConfidence;
  currentRead: AdvisorMessage[];
  recommendedOrders: HandlerRecommendedOrder[];
  eventRecommendation?: HandlerEventRecommendation;
  warnings: AdvisorMessage[];
  opportunities: AdvisorMessage[];
  planAssessment?: string;
  invalidRecommendations: HandlerInvalidRecommendation[];
};
```

## Advisor View Model

The Advisor UI should consume a presentation-oriented view model:

```ts
export type AdvisorMessageTone = 'info' | 'good' | 'warning' | 'danger';

export type AdvisorMessage = {
  id: string;
  tone: AdvisorMessageTone;
  text: string;
  reasonCode?: HandlerReasonCode;
};

export type AdvisorRecommendationView = {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  chips: string[];
  confidence: AdvisorConfidence;
  recommendedActionId?: ActionId;
  recommendedTargetKey?: string;
  recommendedOperativeId?: OperativeId;
  recommendedEventChoiceId?: EventChoiceId;
};

export type AdvisorViewModel = {
  mode: AdvisorMode;
  runMode: RunMode;
  validationStatus: RunValidationStatus;
  phase: HandlerRecommendationPhase;
  title: string;
  summary: string;
  dominionPace: DominionPaceView;
  currentRead: AdvisorMessage[];
  recommendations: AdvisorRecommendationView[];
  warnings: AdvisorMessage[];
  opportunities: AdvisorMessage[];
  confidence: AdvisorConfidence;
};
```

Mode filtering:

```text
Off:
  no panel

Hints:
  currentRead, warnings, opportunities
  no exact actions, targets, operatives, or event choices

Coach:
  currentRead, warnings, strategic recommendations
  suggested systems/action categories allowed
  no complete exact order set

Handler:
  exact recommended orders and event choices
  exact targets and operatives where applicable
  reasons and warnings
```

## Handler Command Policy

Handler command policy should be current-turn tactical evaluation, not deep search.

Inputs:

```ts
export type HandlerCommandPolicyInput = {
  state: GameState;
  legalOptions: readonly LegalOrderOption[];
};
```

Output:

```ts
HandlerRecommendation
```

Policy priority:

1. Prevent immediate loss.
2. Stay on Dominion pace.
3. Use available leverage.
4. Manage secondary red zones.
5. Build future value only when there is time.
6. Avoid unnecessary ugliness.

Candidate generation:

- Generate legal single-order candidates from existing legal options.
- Generate legal two-order combinations by simulating the first queue through `queueOrder` and
  recomputing legal options for the second order.
- Respect current queued orders:
  - no queued orders: recommend a full plan,
  - one queued order: assess it and recommend the best remaining legal order,
  - full queue: assess the plan and show warnings or stability text.

This is current-turn combination evaluation. It is not multi-week search.

Candidate scoring should use:

- projected Dominion pace,
- projected Heat safety,
- projected Loyalty safety,
- projected Resources safety,
- risk chance,
- resource costs,
- useful Ledger uses,
- useful Contact services,
- useful Front exposure reduction,
- useful Accord/faction effects,
- operative stress,
- campaign-specific priorities,
- debt/ruin/obligation/exposure avoidance,
- late-run immediacy.

Handler should prefer robust states over flashy states:

```text
Bad:  +18 Dominion, Heat 98, no recovery.
Good: +10 Dominion, Heat 70, useful Ledger/Intel path preserved.
```

## Handler Event Policy

Inputs:

```ts
export type HandlerEventPolicyInput = {
  state: GameState;
  legalChoices: readonly LegalEventChoiceOption[];
};
```

Policy priority:

1. Prevent immediate loss.
2. Preserve Dominion pace if safe.
3. Reduce red-zone pressure.
4. Avoid unaffordable costs.
5. Avoid severe Debt/Ruin/Obligation unless necessary.
6. Preserve future recovery tools.
7. Choose best strategic gain when stable.

Event policy must use current event definitions, choice costs, choice effects, Ledger effects,
Contact effects, Front effects, Faction effects, and currently visible state.

Handler must recommend only legal choices.

## Partial Queue Behavior

Advisor must adapt to the current queue.

Required behavior:

```text
If no orders queued:
  show full recommended plan.

If one order queued:
  evaluate current queued order.
  recommend best remaining order if Command remains.

If two orders queued:
  evaluate current queued plan.
  show either "Plan looks stable" or warnings/suggested replacements.

If queued order is risky:
  explain the risk and suggest removing/replacing it.
```

The implementation should expose queue assessment:

```ts
export type HandlerQueuedPlanAssessment = {
  status: 'stable' | 'risky' | 'dangerous';
  summary: string;
  warnings: AdvisorMessage[];
  suggestedRemovals: string[];
};
```

Queue assessment should not mutate state.

## Recommendation Highlighting

No auto-apply is locked.

Allowed:

- action card highlight,
- target option marker,
- operative option marker,
- event choice marker,
- "Handler Pick" chip,
- warning chip on risky queued orders.

Not allowed:

- Apply Recommended Orders button,
- auto-selecting targets,
- auto-selecting operatives,
- auto-queueing,
- auto-resolving event choices.

Highlight helpers should be based on IDs, not display text:

```ts
isRecommendedAction(actionId)
isRecommendedTarget(actionId, targetKey)
isRecommendedOperative(actionId, operativeId)
isRecommendedEventChoice(choiceId)
```

## Training and Standard UI

Header should show:

```text
Haunted Apex
City
Campaign
Week
Run Mode
Validation status
How to Play
```

New-run controls should support:

```text
Training Run
Standard Run
Campaign Tension selection for Standard
Seed entry for Standard
```

Training copy:

```text
Training Run
A forgiving fixed run with Handler guidance enabled by default.
```

Standard custom seed copy:

```text
Custom Seed: Unvalidated
This seed has not been checked against Handler guidance and may be harder or less balanced than standard generated runs.
```

## Advisor Panel UI

Panel title:

```text
Handler Guidance
```

Placement:

```text
above the fold
near or above Command Board
```

Minimum sections:

- Current Read
- Recommendation
- Why
- Warnings
- Advisor mode selector

The existing dense page may need to move secondary panels lower or into tabs later. For v0.9,
layout changes should be limited to making Handler Guidance prominent without breaking current
panels.

## How To Play

Add a visible header action:

```text
How to Play
```

It opens a modal or side drawer.

Minimum contents:

- Goal.
- Loss conditions.
- Turn structure.
- Command points.
- Actions, targets, and operatives.
- Advance Week.
- Events.
- Advisor modes.
- Training versus Standard.
- Pressure glossary.
- Tags as role hints.

Reuse Field Guide copy where appropriate, but do not bury this below the Event Feed.

## Tag and Stat Clarity

If scope allows, add first-pass tooltip/help definitions for:

- Trust
- Leverage
- Volatility
- Exposure
- Standing
- Suspicion
- Obligation
- Front Exposure
- Rival Pressure
- Operative Stress
- common tags like heat control, intel, nightlife, industrial, ledger, social

This is secondary to HandlerBot and the Advisor panel. The TDD recommends implementing glossary
content in the How To Play drawer first, then adding inline tooltips only where low-risk.

## Validation Set

Add deterministic Standard validation seeds:

```text
src/app/engine/advisor/standard-validation-seeds.ts
```

Shape:

```ts
export const STANDARD_VALIDATION_SEEDS: Record<CampaignTensionId, readonly string[]> = {
  campaign_corp_crackdown: [...100 seeds],
  campaign_nightlife_war: [...100 seeds],
  campaign_ghostline_signal: [...100 seeds],
  campaign_industrial_cut: [...100 seeds],
  campaign_dirty_capital: [...100 seeds],
};
```

Seeds may be generated by a deterministic script and then committed as static content, or generated
reproducibly from a locked prefix. The release gate uses this deterministic validation set, not an
ad hoc random sample.

This is not a certified seed bank. v0.9 does not certify individual Standard runs at runtime.
The validation set is build-level confidence that Handler advice is reliable.

Training validation uses the single fixed Training config.

## Handler Validation

Add:

```ts
export type HandlerValidationStatus = 'handler_win' | 'handler_loss' | 'invalid_state';

export type HandlerValidationResult = {
  status: HandlerValidationStatus;
  seed: string;
  campaignTensionId: CampaignTensionId;
  runMode: RunMode;
  resultWeek?: number;
  finalPressures?: Pressures;
  lossCause?: GameOverReason | 'agent_stalled' | 'invalid_recommendation';
  invalidRecommendationCount: number;
  decisionTrace: HandlerDecisionTraceEntry[];
};
```

Trace:

```ts
export type HandlerDecisionTraceEntry = {
  week: number;
  phase: 'command' | 'event';
  recommendationSummary: string;
  chosenOrders?: HandlerRecommendedOrder[];
  chosenEventChoiceId?: EventChoiceId;
  reason: string;
  warnings: string[];
};
```

Validation rules:

- Fixed Training config must result in `handler_win`.
- Standard validation set must run 500 total runs.
- Standard validation set must result in 500 Handler wins.
- Any Handler loss blocks release until investigated.
- Invalid recommendation count must be 0.
- Softlocks/stalls fail validation.

If validation fails:

1. Fix bugs or invalid state.
2. Fix Handler blind spots if obvious and teachable.
3. Improve previews/guidance if issue is legibility.
4. Tune campaign modifiers.
5. Tune event severity/weights.
6. Tune action yields/costs.
7. Tune Standard Dominion target or campaign length only if systemic.

## Harness Reports

Extend harness reports with Handler-specific sections:

```text
handler_validation_summary
handler_campaign_summary
handler_loss_causes
handler_invalid_recommendations
handler_confidence_distribution
handler_training_validation
handler_operator_delta
```

Required fields:

- Handler win rate overall.
- Handler win rate by Campaign Tension.
- Handler win rate by run mode.
- Handler loss cause distribution.
- Handler average final pressures.
- Handler action usage.
- Handler event choice usage.
- Handler recommendation confidence distribution.
- Handler invalid recommendation count.
- Handler deviations from OperatorBot.
- Training Run validation result.

Red flags:

- Any Training loss.
- Any invalid recommendation.
- Any Handler loss in the 500-run Standard validation set.
- Any softlock or stall.
- Dominion shortfall dominating Handler losses.
- Heat collapse dominating Handler losses.
- Handler using the same repetitive strategy every Campaign.

## Balance and Tuning

Initial targets:

```text
Training Handler: fixed config must win.
Standard Handler: 500/500 validation wins.
OperatorBot: 55-80% overall acceptable.
RandomBot: validity diagnostic only.
CautiousBot: expected to lose often by Dominion shortfall.
AggressiveBot / GreedyBot: viable but volatile.
```

Standard starts at Dominion target `90`.

Training starts at Dominion target `80`.

If Handler fails Standard primarily by Dominion shortfall:

1. Improve Handler pace logic if it is missing obvious Dominion opportunities.
2. Slightly increase safe Dominion yields if good play cannot reach pace.
3. Soften event drag if events erase too much progress.
4. Consider lowering Standard Dominion only after evidence shows systemic tightness.

If Handler fails Standard primarily by Heat:

1. Improve Handler crisis detection if it is staying hot too long.
2. Add stronger preference for Heat recovery tools.
3. Soften campaign/event Heat spikes if reasonable choices still lock down.

If Handler fails Training:

```text
Training is broken.
```

Fix the Training config, Handler policy, or Training tuning before release.

## Angular Integration

`GameFacade` should expose:

```ts
readonly advisorView = computed<AdvisorViewModel>(() =>
  selectAdvisorViewModel(this.stateSignal(), this.preferences.advisorMode()),
);

readonly userPreferences = ...

setAdvisorMode(mode: AdvisorMode): void;
startTrainingRun(): GameState;
startStandardRun(seed?: string, campaignTensionId?: CampaignTensionId): GameState;
```

The existing `startNewRun(seed, campaignTensionId)` can delegate to Standard behavior for
compatibility.

`App` should:

- render the Advisor panel unless mode is `off`,
- render mode selector,
- render How To Play button and modal/drawer,
- render run mode and validation status,
- route Training button to `startTrainingRun`,
- mark custom seed Standard runs as unvalidated,
- apply recommendation highlights to existing controls.

Avoid placing Handler logic in `App`. `App` should only consume view models and call facade methods.

## Testing Strategy

### Unit Tests

Add tests for:

- `getDefaultAdvisorMode`.
- Training config values.
- Standard config values.
- run-specific Dominion target.
- win/loss uses `state.run.dominionTarget`.
- Dominion pace calculation.
- Handler command recommendations are legal.
- Handler command recommendations are affordable.
- Handler command recommendations respect targets.
- Handler command recommendations respect operative availability.
- Handler event recommendations are valid choices.
- Handler recommendations include explanation text.
- Handler recommendations include confidence.
- Handler does not mutate state while recommending.
- Handler adapts after one queued order.
- Handler evaluates full queued plans.
- Handler flags risky queued orders.
- Handler validation detects invalid recommendations.
- Training fixed config wins.
- Standard validation set has exactly 100 seeds per Campaign.

### Harness Tests

Add focused harness coverage for:

- HandlerBot can complete a run.
- HandlerBot reports appear.
- Handler invalid recommendation count is zero in normal generated samples.
- Training validation result is `handler_win`.
- Standard validation summary fails on any Handler loss.
- Standard validation summary fails on any invalid recommendation.
- Standard validation summary fails on any softlock or stall.

Full 500-run validation may be expensive for ordinary unit tests. Use a smaller deterministic
test fixture for normal CI and run the full validation set during Phase 14/release validation
unless runtime remains acceptable.

### Angular Tests

Add app tests for:

- How To Play button is visible.
- How To Play opens and closes.
- Advisor Off hides panel.
- Advisor Hints shows no exact orders.
- Advisor Coach shows strategy but no complete order plan.
- Advisor Handler shows exact actions/targets/operatives.
- Advisor mode persists.
- Training defaults to Handler mode.
- Training shows target 80.
- Standard shows target 90.
- Custom seed shows Unvalidated.
- Handler Pick highlight appears on recommended controls.
- No recommendation click auto-queues an order.

### Storage Tests

Add tests for:

- v0.9 run envelope round-trip.
- v0.8 save invalidation.
- `run` field validation.
- preference save/load.
- malformed preference fallback.

## Release Validation

Before v0.9 release:

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
Handler Standard wins: 500/500.
Handler Standard losses: 0.
Invalid recommendations: 0.
Softlocks/stalls: 0.
```

Manual smoke:

```text
start Training Run
verify target 80
verify Handler mode
verify Handler recommendation appears before acting
manually follow Handler recommendations for several turns
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

## Acceptance Criteria

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
Standard Handler validation wins 500/500 runs.
Any Handler loss blocks release until investigated.
Invalid recommendation count is zero.
Softlock/stall count is zero.
Dominion pace guidance exists.
How To Play is visible above the fold through a header action.
The game is materially easier for a cold player to start.
```

## Open Implementation Risks

- Handler scoring may initially fail the Standard gate. The expected response is policy
  improvement or tuning, not deep search.
- Exact recommendation highlighting may require careful target-key matching to avoid brittle
  display-text comparisons.
- The top-level layout is already dense. Keep the Advisor prominent, but avoid a full navigation
  redesign unless the implementation plan explicitly reserves time for it.
- Full 500-run validation may be slow inside the browser test suite. Keep the formal bank
  runnable through harness tooling even if CI uses smaller tests.
- Training fixed config may expose Dirty Capital-specific rough edges. Tune the Training config
  before adding more Training seeds.
