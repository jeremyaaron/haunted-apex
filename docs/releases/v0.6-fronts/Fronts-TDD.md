# Haunted Apex v0.6.0 Fronts TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.6.0: Fronts**.

District Zero established the pressure loop:

```text
Action -> Pressure Outcome
```

Rival Territory made place and rival context matter:

```text
Action + Target -> Outcome + Local Change + Rival Reaction
```

The Roster made crew identity and condition persistent:

```text
Action + Operative + Target -> Outcome + Stress + Personal Consequence
```

The Black Ledger made consequences named, persistent, and spendable:

```text
Action/Event -> Secret/Debt/Favor -> Later Use or Later Pressure
```

Entanglements made outside relationships strategically useful and dangerous:

```text
Action/Event/Ledger + Contact State
  -> Pressure Outcome
  + Relationship Change
  + Future Hook
```

Fronts adds the first ownership layer:

```text
Invest/Weekly Event + Front State
  -> Recurring Yield
  + Exposure
  + Rival Attention
  + Event Hook
```

The release succeeds when owned infrastructure feels like a persistent bargain:
valuable enough to build early, visible enough to create trouble, and legible enough
that the player understands what their empire is producing and who may notice.

## Source Documents

- [`v0.6.md`](./v0.6.md): product vision, front model, content, events, UI scope,
  reports, and balance goals.
- [`v0.6A.md`](./v0.6A.md): locked mechanical decisions and canonical answers to open
  questions.
- [`Entanglements-TDD.md`](../v0.5-entanglements/Entanglements-TDD.md): current Contact,
  event, report, persistence, and release architecture.
- [`BlackLedger-TDD.md`](../v0.4-the-black-ledger/BlackLedger-TDD.md): Ledger
  architecture and persistent entry conventions.
- [`Roster-TDD.md`](../v0.3-the-roster/Roster-TDD.md): operative stress and roster
  architecture.
- [`RivalTerritory-TDD.md`](../v0.2-rival-territory/RivalTerritory-TDD.md): targeting,
  territory, rival, and GitHub Pages architecture.
- [`DistrictZero-TDD.md`](../v0.1-district-zero/DistrictZero-TDD.md): original pressure
  loop and deterministic simulation architecture.
- [`Layer1.md`](../../foundation/Layer1.md): long-term product identity and simulation
  philosophy.

When these documents differ, `v0.6A.md` is canonical for v0.6 mechanical behavior.

## Goals

- Add Fronts as a first-class engine entity.
- Add static front definitions for six v0.6 fronts.
- Start every new run with `The Pale Circuit` as an owned level 1 front.
- Count `The Pale Circuit` against the owned front cap of 3.
- Generate four fixed seeded front opportunities per run, excluding `The Pale Circuit`.
- Enforce one owned instance per front definition.
- Add `Invest in Front` as a command-phase action with no operative assignment.
- Allow `Invest in Front` to establish front opportunities or upgrade owned fronts.
- Disable establish actions when the owned front cap is reached while preserving upgrade
  actions.
- Keep front opportunities visible when disabled by cap.
- Support level 1 and level 2 fronts only.
- Add front exposure, derived front status, and weekly exposure gain.
- Keep exposure primarily event-driven, with no generic passive pressure penalty.
- Apply only explicit front definition pressure yields/effects.
- Apply weekly front yields and district control yields during weekly resolution.
- Store related rival on front opportunities and front state, inferred at generation time
  from district or venue control.
- Apply explicit rival pressure on establish and per week when the front definition says so.
- Extend `Lay Low` so it can target owned fronts and reduce exposure.
- Add at least four front-specific weekly events using the existing weekly event slot.
- Select front event targets by weighted-random eligible front, biased by exposure.
- Add at most two front-specific Ledger entries: `Back Room Guest List` and `Dirty Books`.
- Keep Contact integration future-ready through tags, copy, and optional non-critical hooks.
- Add Fronts to a tabbed/shared secondary information panel instead of adding a new route.
- Show owned fronts, front opportunities, yields, exposure, status, upgrade state, and rival
  warnings in the UI.
- Show exact front costs, immediate effects, weekly yields, exposure changes, and rival
  pressure in action previews.
- Add front-aware agent behavior and harness report sections.
- Preserve deterministic seeded simulation.
- Preserve the broad v0.5 balance profile.
- Invalidate v0.5 saves through schema versioning.

## Non-Goals

- Full economic simulation.
- Supply chains.
- Inventory.
- Tax or legal systems.
- Front staffing.
- Multiple staff roles.
- Front sale or abandonment.
- Front destruction.
- Venue ownership wars.
- Level 3+ fronts.
- Multi-level upgrade trees.
- Procedural business names.
- Front-specific art pipeline.
- Required mechanical Contact modifiers.
- Persistent campaign economy.
- Cloud saves.
- Multiplayer.
- Electron packaging.
- SQLite integration.
- New full-page routes.

## Architectural Direction

The dependency direction remains:

```text
Angular UI -> GameFacade -> Pure Engine
Pure Engine -> Model + Content + RNG
Persistence Adapter -> versioned serialized GameState envelope
Harness Agents -> public engine commands and selectors
GitHub Actions -> production Angular artifact -> GitHub Pages
```

Front rules belong in the pure engine. Angular may display fronts, selected previews,
event consequences, reports, and tab state, but it must not calculate front affordability,
status, weekly yield, exposure gain, event eligibility, rival pressure, or report metrics.

Static definitions and mutable runtime state must remain separate:

```text
Static Front definition:
  identity
  archetype
  role tags
  preferred locations
  costs
  yields
  immediate effects
  exposure rules
  rival pressure rules
  event hooks
  flavor metadata

Mutable Front state:
  runtime id
  definition id
  district
  optional venue
  stored related rival
  level
  exposure
  established week
  active/compromised flags
  runtime flags
  yield history
```

The same front registry and effect pipeline must power:

```text
new-game front setup
front opportunity generation
action target options
action previews
action resolution
weekly yield resolution
weekly event eligibility
event choice previews
event resolution
Ledger linking
UI front cards
agent scoring
harness reports
save validation
run-end summary
```

## Recommended Source Layout

```text
src/app/engine/
  model/
    actions.ts
    events.ts
    fronts.ts
    game-state.ts
    ledger.ts
  content/
    fronts.ts
    front-events.ts
    ledger-entries.ts
  fronts/
    apply-front-effects.ts
    apply-front-weekly-yields.ts
    derive-front-status.ts
    front-event-eligibility.ts
    front-reports.ts
    front-selectors.ts
    generate-front-opportunities.ts
    resolve-invest-front.ts
  selectors/
    previews.ts
    run-summary.ts
    territory.ts
  simulation/
    queue-order.ts
    resolve-action.ts
    resolve-event.ts
    resolve-week.ts
    select-weekly-event.ts
  harness/
    agents.ts
    simulation-harness.ts
```

Exact file boundaries may vary. The important boundaries are:

- Front definitions contain authored front data, not mutable run state.
- Front opportunity generation is seeded and deterministic.
- Front preview and resolution share the same effect calculation.
- Weekly front yields and exposure use shared helpers.
- Event definitions declare front effects; event resolution applies them centrally.
- The UI consumes selectors and facade commands instead of reconstructing front rules.

## Domain Identifiers

Add explicit front identifiers for the v0.6 content slice:

```ts
type FrontDefinitionId =
  | 'front_pale_circuit'
  | 'front_black_clinic'
  | 'front_courier_line'
  | 'front_zero_mercy_cut'
  | 'front_shell_gallery'
  | 'front_surveillance_den';

type FrontId = FrontDefinitionId;

type FrontOpportunityId = `front_opportunity_${FrontDefinitionId}`;

type FrontOptionId = 'establish' | 'upgrade';

type FrontStatus = 'quiet' | 'noticed' | 'hot' | 'compromised';

type FrontArchetype =
  | 'lounge'
  | 'clinic'
  | 'courier_line'
  | 'fight_pit'
  | 'shell_gallery'
  | 'surveillance_den'
  | 'data_chapel';

type FrontRoleTag =
  | 'resources'
  | 'loyalty'
  | 'intel'
  | 'heat_control'
  | 'dominion'
  | 'ruin'
  | 'stability'
  | 'rival_pressure'
  | 'nightlife'
  | 'security'
  | 'weird'
  | 'social';
```

`FrontId` can initially equal `FrontDefinitionId` because v0.6 allows only one owned
instance per definition. Keeping both names preserves room for future multiple instances
without changing every caller.

## Static Front Model

Add front definitions as pure content:

```ts
type FrontDefinition = {
  id: FrontDefinitionId;
  name: string;
  archetype: FrontArchetype;
  roleTags: readonly FrontRoleTag[];
  allowedDistrictTags?: readonly string[];
  preferredDistrictIds?: readonly DistrictId[];
  preferredVenueIds?: readonly VenueId[];
  setupCost: number;
  upgradeCost: number;
  maxLevel: 2;
  baseWeeklyYield: PressureDelta;
  level2BonusYield: PressureDelta;
  establishEffects: PressureDelta;
  upgradeEffects: PressureDelta;
  exposureOnEstablish: number;
  exposureOnUpgrade: number;
  exposurePerWeek: number;
  districtControlYield?: number;
  rivalPressureOnEstablish?: number;
  rivalPressurePerWeek?: number;
  eventIds: readonly EventId[];
  flavor: {
    dossier: string;
    visualTags?: readonly string[];
  };
};
```

The initial registry contains:

```text
The Pale Circuit
Black Clinic
Courier Line
Zero Mercy Cut
Shell Gallery
Surveillance Den
```

Content validation should enforce:

- Exactly six front definitions exist.
- Front ids are unique.
- Every front has a supported archetype and role tags.
- `maxLevel` is exactly `2`.
- Costs and exposure values are non-negative integers.
- `setupCost` for `The Pale Circuit` is `0`.
- Preferred district and venue ids resolve.
- Event ids resolve once front events are added.
- No definition uses unsupported pressure keys.

## Runtime Front State

Extend `GameState` with owned fronts and opportunities:

```ts
type FrontState = {
  id: FrontId;
  definitionId: FrontDefinitionId;
  districtId: DistrictId;
  venueId?: VenueId;
  relatedRivalId?: RivalId;
  level: 1 | 2;
  exposure: number;
  establishedWeek: number;
  compromised: boolean;
  active: boolean;
  flags: Record<string, boolean | number | string>;
  yieldHistory: FrontYieldHistoryEntry[];
};

type FrontYieldHistoryEntry = {
  week: number;
  effects: PressureDelta;
  exposureDelta: number;
};

type FrontOpportunity = {
  id: FrontOpportunityId;
  definitionId: FrontDefinitionId;
  districtId: DistrictId;
  venueId?: VenueId;
  relatedRivalId?: RivalId;
};

type GameState = {
  fronts: Record<FrontId, FrontState>;
  frontOpportunities: FrontOpportunity[];
  // existing fields...
};
```

Rules:

- `The Pale Circuit` starts owned in every run.
- `The Pale Circuit` has `definitionId: 'front_pale_circuit'`.
- `The Pale Circuit` is associated with `venue_pale_circuit`.
- The player can own at most three active fronts.
- The starting front counts against the cap.
- A front definition can be owned at most once.
- Opportunities are generated once on new game and remain fixed for the run.
- Established opportunities are removed from the available opportunity list or marked
  established by selector filtering.
- Inactive or future abandoned fronts are not part of v0.6 behavior.

## Front Status

Derive status from exposure, do not persist it:

```ts
function deriveFrontStatus(exposure: number): FrontStatus {
  if (exposure < 30) return 'quiet';
  if (exposure < 60) return 'noticed';
  if (exposure < 80) return 'hot';
  return 'compromised';
}
```

`compromised` is a status, not an automatic shutdown. The `FrontState.compromised` flag is
reserved for event or future use and should not be required for the derived status.

## Opportunity Generation

Generate four fixed opportunities per run from definitions other than `front_pale_circuit`.

Coverage requirements:

```text
At least one resources front.
At least one intel or heat-control front.
At least one risky/high-reward front.
```

Generation should:

- Use the run seed and existing seeded RNG helpers.
- Exclude definitions already owned at new game.
- Choose valid district/venue placement from preferred ids when available.
- Store `relatedRivalId` at generation time by deriving it from district/venue control.
- Produce stable opportunity ids.
- Produce identical opportunities for identical seeds.

The related rival should be copied from opportunity to `FrontState` when established.
Future control changes do not alter the stored v0.6 related rival.

## Actions and Targets

Add one action:

```ts
{
  id: 'invest_front',
  label: 'Invest in Front',
  commandCost: 1,
  resourceCost: 0,
  effects: {},
  baseRisk: 10,
  requiresTarget: true,
  allowedTargetTypes: ['front_opportunity', 'front']
}
```

Extend `ActionTarget`:

```ts
type ActionTarget =
  | ExistingTargets
  | {
      type: 'front_opportunity';
      opportunityId: FrontOpportunityId;
      definitionId: FrontDefinitionId;
      districtId: DistrictId;
      venueId?: VenueId;
    }
  | {
      type: 'front';
      id: FrontId;
      optionId: FrontOptionId;
    };
```

Target semantics:

- `front_opportunity` means establish a new owned front.
- `front` with `optionId: 'upgrade'` means upgrade an owned front from level 1 to level 2.
- `front` with `optionId: 'establish'` should not be emitted.
- `FrontOptionId` does not include `cool`; cooling belongs to front-targeted `Lay Low`.
- `Invest in Front` does not allow operative assignment.
- `Lay Low` may target owned fronts and does not assign an operative for front targets.

## Invest Preview

`Invest in Front` previews must include:

- Establish or upgrade label.
- Resource cost.
- Command cost through existing command UI.
- Immediate pressure effects.
- Weekly yield at the resulting level.
- District control yield.
- Immediate exposure change.
- Weekly exposure gain after the investment.
- Resulting front status.
- Related rival warning.
- Rival pressure from establish or explicit definition effects.
- Availability reason if disabled.

Establish preview:

```text
Cost:
-1200 Resources

Immediate:
+4 Dominion
+4 Heat
+10 Knox Marrow Pressure

Weekly:
+550 Resources
+1 Dominion
+1 Heat
+2 Chrome Narrows Control

Exposure:
Starts at 20
+5/week
Initial Status: Quiet
```

Upgrade preview:

```text
Cost:
-1200 Resources

Immediate:
+3 Dominion
+2 Heat

Weekly after upgrade:
+500 Resources
+2 Loyalty
+1 Dominion
+2 Violet Ward Control

Exposure:
+8 immediately
+3/week
Projected Status: Noticed
```

Disable reasons:

```text
target_required
target_not_found
target_not_allowed
front_cap_reached
front_already_owned
front_already_max_level
not_enough_resources
not_command_phase
not_enough_command_points
```

The existing unavailable-reason display should map new reasons to player-readable text.

## Invest Resolution

Resolution should use the same calculation as preview.

Establish flow:

1. Validate target opportunity exists.
2. Validate front cap.
3. Validate definition is not already owned.
4. Validate resource cost.
5. Spend setup cost.
6. Apply `establishEffects`.
7. Apply explicit rival pressure on establish to stored `relatedRivalId`.
8. Create `FrontState` at level 1.
9. Set exposure to `exposureOnEstablish`.
10. Set `establishedWeek` to current week.
11. Remove or hide established opportunity.
12. Add event log entry with front name, cost, effects, exposure, and rival pressure.

Upgrade flow:

1. Validate owned front exists.
2. Validate level is below 2.
3. Validate resource cost.
4. Spend upgrade cost.
5. Apply `upgradeEffects`.
6. Increase exposure by `exposureOnUpgrade`.
7. Increase level to 2.
8. Add event log entry with front name, cost, effects, exposure, and new weekly yield.

All pressure values should clamp through existing pressure helpers. Exposure should clamp
between 0 and 100.

## Weekly Front Resolution

Apply front weekly effects during weekly resolution after queued orders and before global
weekly drift:

```text
1. Resolve queued orders.
2. Apply front weekly yields.
3. Apply global weekly drift.
4. Cool local district heat.
5. Apply passive rival/contact effects.
6. Select weekly event.
7. Resolve event choice.
8. Check win/loss.
```

Yield calculation:

```ts
function calculateFrontWeeklyYield(front, definition): PressureDelta {
  let result = { ...definition.baseWeeklyYield };

  if (front.level >= 2) {
    result = addPressureDelta(result, definition.level2BonusYield);
  }

  return result;
}
```

Exposure gain:

```ts
const baseGain = definition.exposurePerWeek;
const levelGain = front.level === 2 ? 1 : 0;
const exposureDelta = baseGain + levelGain;
```

District control yield:

```ts
district.control += (definition.districtControlYield ?? 0) * front.level;
```

Rival pressure:

- Apply `definition.rivalPressurePerWeek` only when present and the front has a stored
  `relatedRivalId`.
- Do not infer new rivals during weekly resolution.

For each active front, append a `yieldHistory` entry:

```ts
{
  week,
  effects: weeklyYield,
  exposureDelta
}
```

Keep history lightweight. If history size becomes a UI issue, selectors can show only recent
entries without truncating state in v0.6.

## Front-Targeted Lay Low

Extend `Lay Low` targeting:

```text
Untargeted Lay Low:
  current behavior

Front-targeted Lay Low:
  cost: 300 Resources
  effects:
    Heat -6
    Dominion -1
    selected front Exposure -14
```

Rules:

- Front target must be an owned active front.
- Front-targeted Lay Low does not assign an operative.
- Front exposure cannot go below 0.
- Preview must show global effects and front exposure reduction.
- Event log must name the front.

This gives the player a visible exposure-management lever without introducing another action.

## Front Events

Add four to five front-specific events using the existing weekly event slot.

Required initial set:

```text
Front Inspection
Staff Wants Protection
Rival Leans on Your Front
Clean Money, Dirty Hands
Back Room Ledger
```

Every front event title and body must include the selected front name.

Event target selection:

```ts
weight = 10 + front.exposure;
```

Additional suggested bonuses:

```text
+20 if exposure >= 80
+10 if front is in rival territory and event is rival-related
+10 if front level is 2
+5 if front was established/upgraded recently
```

Rules:

- Do not always pick the highest-exposure front.
- Do not pure-random eligible fronts.
- Weighted-random must use seeded RNG.
- High-exposure fronts should be selected more often and feel causally dangerous.

Event definitions should support:

```ts
type EventChoiceFrontEffect = {
  frontExposureDelta?: number;
};

type EventChoiceRivalPressureEffect = {
  rivalId?: RivalId; // optional when resolved from selected front
  pressureDelta: number;
};
```

Existing event choice preview and resolution should apply front effects centrally, like
Ledger and Contact effects.

## Ledger Integration

Front events may create Ledger entries. Weekly yields must not create Ledger entries.

Add at most two new front-specific Ledger definitions:

```text
Secret: Back Room Guest List
Debt: Dirty Books
```

Reuse existing entries where semantically acceptable:

```text
Favor: Hidden Route
Secret: Dead Channel Trace
Debt: Contaminated Money
Debt: Fabricated Evidence
Debt: Unfunded Promise
```

Ledger entries created by front events should capture related front context if this can be
done cleanly without expanding the Ledger model too far. If not, event logs and reports can
carry the front name in v0.6.

## Contact Integration

No required mechanical Contact modifiers are part of v0.6.

Minimum integration:

- Front definitions include role tags that future Contact modifiers can use.
- Front event copy may reference active contacts when contextually appropriate.
- Front opportunities may display related contact hints if selector plumbing is cheap.

Optional non-critical showcase:

```text
If Dr. Mercy is active, Black Clinic setup cost -200 or Black Clinic event weight is
slightly reduced.
```

The optional showcase must not become an acceptance criterion. Fronts need to stand on
their own before becoming a Contact modifier system.

## UI Design

Use a tabbed/shared secondary panel. Do not add a route and do not add another full
always-visible vertical panel.

The shared panel should include tabs or segmented controls for the current dense secondary
information areas, including:

```text
Operatives
Rivals
Ledger
Contacts
Fronts
Log / Debug
```

Exact grouping can follow the existing layout. The main command area remains focused on:

```text
actions
selected action preview
queued orders
advance week
event choice
```

Fronts tab content:

```text
Owned Fronts
Front Opportunities
Selected or expanded front details
```

Owned front cards show:

- Name.
- District and optional venue.
- Level.
- Derived status.
- Exposure.
- Weekly yield.
- Weekly exposure gain.
- District control yield.
- Role tags.
- Upgrade cost or `Max Level`.
- Related rival if present.
- Recent yield history if space allows.

Opportunity cards show:

- Name.
- District and optional venue.
- Setup cost.
- Base weekly yield.
- Exposure on establish.
- Weekly exposure gain.
- Related rival if present.
- Role tags.
- Disabled reason if cap reached or already owned.

The action card preview remains the source of exact command consequences. The Fronts tab
should orient the player; the command preview should confirm the transaction.

## Selectors and Facade

Add selector view models for UI and agents:

```ts
type FrontView = {
  id: FrontId;
  definitionId: FrontDefinitionId;
  name: string;
  districtName: string;
  venueName?: string;
  relatedRivalName?: string;
  level: 1 | 2;
  status: FrontStatus;
  exposure: number;
  roleTags: readonly FrontRoleTag[];
  weeklyYieldRows: readonly PressureDeltaView[];
  weeklyExposureGain: number;
  districtControlYield: number;
  upgradeCost: number;
  canUpgrade: boolean;
  upgradeUnavailableReason?: string;
  yieldHistory: readonly FrontYieldHistoryView[];
};

type FrontOpportunityView = {
  id: FrontOpportunityId;
  definitionId: FrontDefinitionId;
  name: string;
  districtName: string;
  venueName?: string;
  relatedRivalName?: string;
  setupCost: number;
  weeklyYieldRows: readonly PressureDeltaView[];
  exposureOnEstablish: number;
  weeklyExposureGain: number;
  roleTags: readonly FrontRoleTag[];
  available: boolean;
  unavailableReason?: string;
};
```

The facade should expose:

```ts
readonly fronts = computed(() => selectFrontViews(this.stateSignal()));
readonly frontOpportunities = computed(() => selectFrontOpportunityViews(this.stateSignal()));
```

Queueing uses the existing command pipeline with extended targets.

## Persistence

Increment save schema version from v0.5 to v0.6 and use a v0.6 storage key.

Expected values:

```ts
CURRENT_SAVE_SCHEMA_VERSION = 6;
CURRENT_GAME_VERSION = '0.6.0';
CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.6:current-run';
```

v0.5 saves should be invalidated with a compatibility notice. Do not write a v0.5 to v0.6
migration.

Save validation must verify:

- `fronts` exists and is a record.
- `frontOpportunities` exists and is an array.
- Owned front ids resolve.
- Front definition ids resolve.
- No duplicate owned definition ids.
- Owned active front count is at most 3.
- `The Pale Circuit` exists in new v0.6 games.
- Front level is `1` or `2`.
- Exposure is 0-100.
- District, venue, and related rival ids resolve when present.
- Yield history entries are well-formed.
- Opportunities resolve to definitions and locations.
- Opportunities do not duplicate owned definitions.

## Reports and Harness

Extend run summaries and harness reports with front data:

```text
front establishment rate
front upgrade rate
average owned front count
average weekly front yield
resources generated by fronts
dominion generated by fronts
heat generated/reduced by fronts
average final front exposure
front events triggered
most profitable front
most dangerous front
most ignored front
OperatorBot front choices
loss correlation by front exposure
win rate by front opportunity set
```

Track per-run front stats:

```ts
type FrontRunStats = {
  established: Record<FrontDefinitionId, number>;
  upgraded: Record<FrontDefinitionId, number>;
  weeklyYieldTotals: PressureDelta;
  finalFronts: Record<FrontId, FrontFinalRunStats>;
  frontEvents: Record<EventId, number>;
};
```

The in-game harness CSV should add front sections without removing existing sections.

## Agent Updates

Agents should become front-aware without needing full optimization.

Operator:

- Establish one useful front early if resources allow.
- Prefer fronts that solve current strategic gaps.
- Avoid high-exposure fronts when Heat is high.
- Use front-targeted Lay Low when exposure is high and time remains.
- Upgrade only when payback horizon or immediate effects justify it.
- Avoid upgrades after Week 6 unless immediate Dominion or Heat relief matters.

Cautious:

- Prefer Shell Gallery, Black Clinic, and Courier Line.
- Avoid Zero Mercy Cut.
- Cool fronts early.
- Still usually miss Dominion target.

Aggressive:

- Prefer Zero Mercy Cut and Dominion-producing fronts.
- Upgrade early if possible.
- Ignore exposure until severe.

Greedy:

- Prefer highest resource yield.
- Establish or upgrade money fronts.
- Accept exposure and debt risk.

Random:

- Randomly select valid front establish, upgrade, and cooling options.

## Balance Targets

Preserve broad v0.5 tuning:

```text
OperatorBot: 55-75% win rate
CautiousBot: low win rate, usually Dominion shortfall
RandomBot: 5-12% win rate
AggressiveBot: viable but volatile
GreedyBot: viable but swingy
```

Front-specific targets:

```text
Average owned fronts at end: 1.5-2.5
Average new fronts established per run: 0.5-1.5
Average upgrades per run: 0-1
Front events per run: 0-2
Fronts matter more when invested in early.
Late front investment is usually bad unless immediate effects matter.
No front is obviously optimal in every run.
High-risk fronts create recognizable pressure.
```

Expected failure signals:

- Fronts are never used: payback is too slow or UI is unclear.
- Every sane run starts with the same front: that front is too efficient.
- High-risk fronts never cause trouble: exposure is too soft.
- Front events dominate the event slot: event weights are too high.
- Greedy wins too often: resource fronts are too strong.
- Cautious wins consistently: safe fronts are too efficient.

## Testing Strategy

Unit and integration coverage should include:

- Front content registry validates all definitions.
- `deriveFrontStatus` handles exact thresholds.
- New games start with `The Pale Circuit`.
- Front opportunities are deterministic by seed.
- Opportunity generation enforces coverage requirements.
- Opportunity generation stores related rival.
- Establish preview shows cost, immediate effects, weekly yield, exposure, and rival warning.
- Establish resolution creates a front and removes/hides the opportunity.
- Establish is disabled at front cap.
- Upgrade preview shows cost, immediate effects, new yield, exposure, and status.
- Upgrade resolution increases level to 2.
- Level 2 fronts cannot upgrade.
- Unaffordable front investments cannot be queued.
- One definition cannot be owned twice.
- Weekly front yields apply in the documented order.
- Level 2 bonus yield applies.
- Front exposure increases weekly.
- District control yield applies and clamps.
- Explicit weekly rival pressure applies only when defined.
- Front-targeted Lay Low reduces exposure and applies global effects.
- Front-targeted Lay Low cannot target unowned fronts.
- Front event eligibility responds to exposure/status/rival context.
- Front event target selection is seeded and exposure-weighted.
- Front event choices apply front effects.
- Front events use the normal weekly event slot.
- Front Ledger entries can be created from event choices.
- Front views show owned fronts and opportunities.
- Run summary includes front outcomes.
- Harness agents can simulate front-enabled games.
- Save validation accepts v0.6 state and rejects malformed front state.
- v0.5 saves are invalidated.

## Acceptance Criteria

v0.6.0 is complete when:

```text
The game has a Fronts tab or shared panel section.
Each run starts with The Pale Circuit as an owned front.
Each run has visible fixed seeded front opportunities.
The player can establish at least one new front.
The player can upgrade an owned front to level 2.
Owned fronts generate weekly yields.
Owned fronts accumulate exposure.
Front status is visible.
Lay Low can target an owned front to reduce exposure.
At least four front-specific events can trigger.
Front previews show cost, immediate effects, weekly yield, exposure, and rival warning.
Front effects appear in event logs and resolution logs.
Simulation agents understand basic front investment.
Reports include front usage and outcome data.
The broad v0.5 balance profile remains recognizable.
```

## Release Readiness

Before merge and tag:

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

## Open Implementation Risks

- The shared/tabbed panel may require more UI restructuring than prior releases. Keep the
  first pass functional and readable before polishing.
- Front events compete with Ledger, Contact, Operative, and base events for one weekly slot.
  Event weighting must be tuned so fronts create texture without drowning everything else.
- Payback timing is tight inside eight weeks. Front costs and yields should be harness-tuned
  early, not left until release readiness.
- The starting Pale Circuit must feel useful without making every run feel predetermined.
- Front exposure should be threatening through visible event risk, not mysterious passive
  decay.
