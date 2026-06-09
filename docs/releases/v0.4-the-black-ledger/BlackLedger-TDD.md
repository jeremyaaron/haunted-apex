# Haunted Apex v0.4.0 The Black Ledger TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.4.0: The Black Ledger**.

District Zero established the pressure loop:

```text
Action + Operative -> Outcome
```

Rival Territory added spatial and political context:

```text
Action + Operative + Target -> Outcome + Local Change + Rival Reaction
```

The Roster made operative identity and condition persistent strategic inputs:

```text
Action + Operative + Target + Operative Condition -> Outcome + Personal Consequence
```

The Black Ledger adds a player-facing memory layer:

```text
Action + Operative + Target + Ledger State
  -> Outcome
  + Consequence
  + Future Hook
```

The iteration succeeds when Intel stops feeling like only a pressure meter and starts
producing named, remembered assets and liabilities: secrets, debts, favors, receipts, and
obligations that can be used later or can come due.

## Source Documents

- [`v0.4.md`](./v0.4.md): product vision, Ledger concepts, content direction, UI scope,
  event examples, reports, and balance goals.
- [`v0.4A.md`](./v0.4A.md): locked mechanical decisions and canonical answers to open
  questions.
- [`Roster-TDD.md`](../v0.3-the-roster/Roster-TDD.md): current roster, stress, event,
  harness, and persistence architecture.
- [`RivalTerritory-TDD.md`](../v0.2-rival-territory/RivalTerritory-TDD.md): targeting,
  territory, rival, and GitHub Pages architecture.
- [`DistrictZero-TDD.md`](../v0.1-district-zero/DistrictZero-TDD.md): original pressure
  loop and deterministic simulation architecture.
- [`Layer1.md`](../../foundation/Layer1.md): long-term product identity and simulation
  philosophy.

When these documents differ, `v0.4A.md` is canonical for v0.4 mechanical behavior.

## Goals

- Add a Black Ledger model to `GameState`.
- Support all three Ledger entry kinds: Secret, Debt, and Favor.
- Implement 12 initial Ledger definitions: 6 Secrets, 4 Debts, and 2 Favors.
- Keep Favors thin: beneficial, consumable comeback tools without deep event chains.
- Add `Work the Ledger` as a normal command-phase action with command cost 1.
- Make `Work the Ledger` target a specific Ledger entry and use option.
- Allow Ledger use options to apply costs, pressure effects, and consume or resolve entries.
- Disable unaffordable Ledger use options before queueing.
- Allow duplicate Ledger entries as separate runtime instances by default.
- Keep consumed Ledger entries visible as run history.
- Make only targeted `Gather Intel` eligible to discover Secrets.
- Show exact Secret discovery chance in targeted `Gather Intel` previews.
- Make event choices preview exact Ledger entries created, consumed, or resolved.
- Update selected existing events to create Ledger entries.
- Add at least three Ledger-specific weekly events.
- Make Ledger-specific events select and reference a specific active entry where possible.
- Add a visible Black Ledger panel with Active and Spent / Resolved states.
- Add a run-end report to the game-over panel.
- Add `Copy Run Report` for shareable run summaries.
- Update all harness agents with basic Ledger behavior.
- Extend harness reports with Ledger usage and unresolved obligation metrics.
- Preserve deterministic seeded simulation.
- Preserve the broad v0.3 balance profile.
- Invalidate v0.3 saves through schema versioning.
- Simplify release status documentation so Git tags and GitHub releases are the release
  source of truth.

## Non-Goals

- Full relationship graphs.
- Romance systems.
- Multi-stage investigations.
- Procedural secret text generation.
- Faction diplomacy.
- Rival AI planning.
- Permanent campaign progression.
- Player accounts.
- Cloud saves.
- Save migration from v0.3 to v0.4.
- Backend services.
- Social sharing backend.
- Steam achievements.
- Electron packaging.
- SQLite integration.
- A run history dashboard.
- New hard loss conditions based on Debt count.
- A redesigned UI shell.

## Architectural Direction

The dependency direction remains:

```text
Angular UI -> GameFacade -> Pure Engine
Pure Engine -> Model + Content + RNG
Persistence Adapter -> versioned serialized GameState envelope
Harness Agents -> public engine commands and selectors
GitHub Actions -> production Angular artifact -> GitHub Pages
```

Ledger rules belong in the pure engine. Angular may display Ledger data, selected use
options, previews, and reports, but it must not calculate discovery chance, affordability,
entry resolution, event eligibility, or use effects.

Static definitions and mutable runtime state must remain separate:

```text
Static Ledger definition:
  identity
  kind
  name
  description
  rarity
  tags
  use options
  discovery profile
  repeat behavior
  flavor metadata

Mutable Ledger entry:
  runtime instance id
  definition id
  created week
  source
  potency
  consumed/resolved state
  related target/rival/operative context
```

The same Ledger definition registry must power:

```text
new-game defaults
action target options
action previews
action resolution
event choice previews
event resolution
event weighting
UI views
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
    ledger.ts
    events.ts
    game-state.ts
  content/
    ledger-entries.ts
    ledger-events.ts
    district-zero-actions.ts
    district-zero-events.ts
    roster-events.ts
  ledger/
    add-ledger-entry.ts
    ledger-selectors.ts
    ledger-use.ts
    secret-discovery.ts
    ledger-event-context.ts
  selectors/
    previews.ts
    territory.ts
    ledger.ts
  simulation/
    queue-order.ts
    resolve-action.ts
    resolve-event.ts
    select-weekly-event.ts
  reports/
    run-summary.ts
  harness/
    agents.ts
    simulation-harness.ts
```

Exact file boundaries may vary. The important boundaries are:

- Content definitions contain authored Ledger data, not mutable run state.
- Ledger preview and resolution share the same use-effect pipeline.
- Discovery chance calculation is shared between preview and resolution.
- Event choice Ledger effects are declared in event definitions and resolved centrally.
- The UI consumes selectors and facade commands instead of reconstructing Ledger rules.

## Domain Identifiers

Add explicit Ledger identifiers for the v0.4 content slice:

```ts
type LedgerEntryKind = 'secret' | 'debt' | 'favor';

type LedgerEntryDefinitionId =
  | 'secret_patrol_schedule'
  | 'secret_magistrate_glass_room'
  | 'secret_nyx_velvet_ledger'
  | 'secret_knox_route_manifests'
  | 'secret_ghostline_buyer_list'
  | 'secret_dead_channel_trace'
  | 'debt_owes_liaison'
  | 'debt_unfunded_promise'
  | 'debt_contaminated_money'
  | 'debt_saints_payment_trail'
  | 'favor_checkpoint_captain'
  | 'favor_hidden_route';

type LedgerEntryId = string;
type LedgerUseOptionId = string;
```

The implementation may derive these unions from readonly content registries if the result
remains readable and type safe.

## Action Target Extension

Extend `ActionTarget` with a Ledger target:

```ts
type ActionTarget =
  | { type: 'district'; id: DistrictId }
  | { type: 'venue'; id: VenueId }
  | { type: 'rival'; id: RivalId }
  | { type: 'recruit'; id: OperativeId }
  | {
      type: 'ledger';
      entryId: LedgerEntryId;
      useOptionId: LedgerUseOptionId;
    };
```

`Work the Ledger` targets both a Ledger entry and a use option. This preserves the locked
v0.4 rule that debts with multiple settlement methods require the player to choose the
method before queueing.

For UI simplicity, target labels may be generated as separate selectable options:

```text
Owes the Liaison - Pay in Credits
Owes the Liaison - Offer Information
Patrol Schedule - Burn Patrol Window
Checkpoint Captain - Call in Favor
```

The target shape must still preserve `entryId` and `useOptionId` separately so preview,
resolution, reports, and run summary can distinguish the entry from the chosen use.

## Action Definition

Add one action:

```ts
{
  id: 'work_the_ledger',
  label: 'Work the Ledger',
  commandCost: 1,
  resourceCost: 0,
  effects: {},
  baseRisk: 12,
  requiresTarget: true,
  allowedTargetTypes: ['ledger'],
  description:
    'Turn secrets into leverage, settle dangerous obligations, or call in favors before they expire into consequences.',
}
```

The action itself has no default pressure effect. The selected Ledger use option supplies
costs, effects, and consumption behavior.

## Static Ledger Definition Model

```ts
type LedgerEntryRarity = 'common' | 'uncommon' | 'rare';

type LedgerEntryDefinition = {
  id: LedgerEntryDefinitionId;
  kind: LedgerEntryKind;
  name: string;
  description: string;
  rarity: LedgerEntryRarity;
  tags: string[];
  useOptions: LedgerUseOptionDefinition[];
  discovery?: LedgerDiscoveryProfile;
  unique?: boolean;
  repeatWeightMultiplier?: number;
  flavor?: {
    shortLabel?: string;
    visualTags?: string[];
  };
};
```

Use options are authored on the definition:

```ts
type LedgerUseOptionDefinition = {
  id: LedgerUseOptionId;
  label: string;
  description?: string;
  cost?: PressureCost;
  effects: PressureDelta;
  consumesEntry: boolean;
  riskModifier?: number;
  tags?: string[];
};
```

Costs use the same cost vocabulary as event choices:

```ts
type PressureCost = Partial<Pick<PressureState, 'resources' | 'intel'>>;
```

For v0.4, Resource and Intel costs are sufficient. The model can accept broader pressure
costs if that matches the existing event cost type, but UI copy should keep these costs
plain and visible.

Discovery profiles guide targeted `Gather Intel`:

```ts
type LedgerDiscoveryProfile = {
  targetTags?: string[];
  rivalIds?: RivalId[];
  districtIds?: DistrictId[];
  venueIds?: VenueId[];
  minIntel?: number;
  baseWeight: number;
};
```

## Runtime Ledger Model

Add Ledger state to `GameState`:

```ts
type GameState = {
  schemaVersion: 4;
  // existing fields...
  ledger: LedgerState;
};
```

```ts
type LedgerState = {
  entries: LedgerEntry[];
  discoveredCount: number;
  consumedCount: number;
};
```

Runtime entries:

```ts
type LedgerEntry = {
  id: LedgerEntryId;
  definitionId: LedgerEntryDefinitionId;
  kind: LedgerEntryKind;
  createdWeek: number;
  source: LedgerEntrySource;
  potency: 1 | 2 | 3;
  revealed: boolean;
  consumed: boolean;
  consumedWeek?: number;
  consumedBy?: LedgerConsumptionSource;
  relatedTarget?: Exclude<ActionTarget, { type: 'ledger' | 'recruit' }>;
  relatedOperativeId?: OperativeId;
  relatedRivalId?: RivalId;
  flags?: Record<string, boolean | number | string>;
};
```

Source metadata:

```ts
type LedgerEntrySource =
  | {
      type: 'event';
      eventId: EventId;
      choiceId: EventChoiceId;
    }
  | {
      type: 'action';
      actionId: ActionId;
      target?: Exclude<ActionTarget, { type: 'ledger' }>;
    }
  | {
      type: 'operative_event';
      operativeId: OperativeId;
      eventId: EventId;
    };
```

Consumption metadata:

```ts
type LedgerConsumptionSource =
  | {
      type: 'action';
      actionId: 'work_the_ledger';
      useOptionId: LedgerUseOptionId;
    }
  | {
      type: 'event';
      eventId: EventId;
      choiceId: EventChoiceId;
    };
```

Consumed entries remain in `ledger.entries`. Active selectors filter by `consumed === false`.

## Initial Ledger Content

Implement the v0.4 content slice from `v0.4A.md`.

### Secrets

```text
Patrol Schedule
Magistrate in the Glass Room
Nyx's Velvet Ledger
Knox's Route Manifests
Ghostline Buyer List
Dead Channel Trace
```

### Debts

```text
Owes the Liaison
Unfunded Promise
Contaminated Money
Saint's Payment Trail
```

### Favors

```text
Checkpoint Captain
Hidden Route
```

Every definition must include at least one use option. Debts may include multiple
settlement options.

Example Secret:

```ts
{
  id: 'secret_patrol_schedule',
  kind: 'secret',
  name: 'Patrol Schedule',
  description: 'Private security rotations through the lower avenues.',
  rarity: 'common',
  tags: ['corp', 'heat', 'security'],
  discovery: {
    targetTags: ['corp', 'security', 'industrial'],
    baseWeight: 14,
  },
  useOptions: [
    {
      id: 'burn_patrol_window',
      label: 'Burn Patrol Window',
      cost: { intel: 2 },
      effects: { heat: -12 },
      consumesEntry: true,
    },
  ],
}
```

Example Debt:

```ts
{
  id: 'debt_owes_liaison',
  kind: 'debt',
  name: 'Owes the Liaison',
  description: 'A favor accepted from the liaison network. They remember cleanly.',
  rarity: 'common',
  tags: ['liaison', 'debt', 'social'],
  repeatWeightMultiplier: 0.35,
  useOptions: [
    {
      id: 'pay_in_credits',
      label: 'Pay in Credits',
      cost: { resources: 900 },
      effects: { loyalty: 2 },
      consumesEntry: true,
    },
    {
      id: 'offer_information',
      label: 'Offer Information',
      cost: { intel: 5 },
      effects: { heat: -2 },
      consumesEntry: true,
    },
  ],
}
```

Example Favor:

```ts
{
  id: 'favor_checkpoint_captain',
  kind: 'favor',
  name: 'Checkpoint Captain',
  description: 'A checkpoint captain owes you one quiet opening.',
  rarity: 'common',
  tags: ['favor', 'heat', 'security'],
  useOptions: [
    {
      id: 'call_checkpoint',
      label: 'Call in Favor',
      cost: { intel: 2 },
      effects: { heat: -10 },
      consumesEntry: true,
    },
  ],
}
```

Exact numeric effects should be tuned during implementation and harness passes. The TDD
requires the model and shared pipeline, not final balance values.

## Ledger Selectors

Add pure selectors:

```ts
getLedgerDefinition(definitionId): LedgerEntryDefinition | undefined
getLedgerEntry(state, entryId): LedgerEntry | undefined
selectActiveLedgerEntries(state): LedgerEntryView[]
selectConsumedLedgerEntries(state): LedgerEntryView[]
selectActiveSecrets(state): LedgerEntry[]
selectActiveDebts(state): LedgerEntry[]
selectActiveFavors(state): LedgerEntry[]
selectLedgerTargetOptions(state): ActionTargetOption[]
selectLedgerPanelView(state): LedgerPanelView
selectLedgerSummary(state): LedgerSummary
```

View models should include display-ready labels:

```ts
type LedgerEntryView = {
  id: LedgerEntryId;
  definitionId: LedgerEntryDefinitionId;
  kind: LedgerEntryKind;
  name: string;
  description: string;
  createdWeek: number;
  potency: number;
  status: 'active' | 'spent' | 'resolved';
  sourceLabel: string;
  relatedContextLabel?: string;
  tags: string[];
  useOptions: LedgerUseOptionView[];
};
```

Use option views:

```ts
type LedgerUseOptionView = {
  id: LedgerUseOptionId;
  label: string;
  description?: string;
  costRows: PressureDeltaRow[];
  effectRows: PressureDeltaRow[];
  consumesEntry: boolean;
  affordable: boolean;
  unavailableReason?: 'insufficient_resources' | 'insufficient_intel' | 'entry_consumed';
};
```

## Adding Ledger Entries

Use one helper for all entry creation:

```ts
type AddLedgerEntryRequest = {
  definitionId: LedgerEntryDefinitionId;
  source: LedgerEntrySource;
  potency?: 1 | 2 | 3;
  relatedTarget?: Exclude<ActionTarget, { type: 'ledger' | 'recruit' }>;
  relatedOperativeId?: OperativeId;
  relatedRivalId?: RivalId;
  flags?: Record<string, boolean | number | string>;
};

function addLedgerEntry(state: GameState, request: AddLedgerEntryRequest): GameState;
```

`addLedgerEntry` must:

- Validate the definition exists.
- Create a stable deterministic instance id.
- Copy `kind` from the definition.
- Default potency to 1.
- Set `createdWeek` to the current week.
- Increment `discoveredCount`.
- Preserve source and related context.
- Add a log entry naming the created Ledger entry.

Instance ids should be deterministic within a run:

```text
ledger_<definitionId>_<week>_<sequence>
```

The exact shape is flexible as long as repeated entries are unique and seeded simulation
remains deterministic.

## Ledger Use Pipeline

Add shared preview and resolution functions:

```ts
type LedgerUsePreview = {
  entry: LedgerEntry;
  definition: LedgerEntryDefinition;
  useOption: LedgerUseOptionDefinition;
  cost: PressureDelta;
  effects: PressureDelta;
  consumesEntry: boolean;
  affordable: boolean;
  unavailableReason?: LedgerUseUnavailableReason;
  riskModifier: number;
};

type LedgerUseUnavailableReason =
  | 'entry_not_found'
  | 'definition_not_found'
  | 'use_option_not_found'
  | 'entry_consumed'
  | 'insufficient_resources'
  | 'insufficient_intel';
```

```ts
function previewLedgerUse(
  state: GameState,
  entryId: LedgerEntryId,
  useOptionId: LedgerUseOptionId,
): LedgerUsePreview;

function resolveLedgerUse(
  state: GameState,
  entryId: LedgerEntryId,
  useOptionId: LedgerUseOptionId,
): ResolveLedgerUseResult;
```

`resolveLedgerUse` must call `previewLedgerUse` and use its calculated costs and effects.
Preview and resolution must not duplicate math.

Resolution order:

```text
1. Validate active entry.
2. Validate selected use option.
3. Validate affordability.
4. Apply costs.
5. Apply effects.
6. Mark consumed if consumesEntry is true.
7. Increment consumedCount if newly consumed.
8. Add action log entry.
9. Return updated state and diagnostic details.
```

Ledger costs should be represented as negative pressure deltas internally:

```text
Resources cost 900 -> resources -900
Intel cost 5 -> intel -5
```

## Queue Validation

`queueOrder` must understand Ledger targets.

For `work_the_ledger`:

- Target is required.
- Target type must be `ledger`.
- Entry must exist.
- Entry must be active.
- Use option must exist on the entry definition.
- Use option must be affordable.
- Command points must be available.
- Operative assignment rules remain normal if the action allows assignment.

Unavailable reasons should be explicit:

```ts
type QueueOrderUnavailableReason =
  | ExistingQueueReason
  | 'ledger_target_required'
  | 'ledger_entry_unknown'
  | 'ledger_entry_consumed'
  | 'ledger_use_unknown'
  | 'ledger_use_unaffordable';
```

The action card should display these reasons in player-facing language.

## Action Preview Integration

Extend action previews for two cases.

### Work the Ledger

When the selected action is `work_the_ledger` and a Ledger target is selected:

```text
Expected:
Heat -10
Intel -2
Consumes Favor
Risk: Low 12%
```

The preview must include:

- Command cost.
- Entry-specific costs.
- Entry-specific effects.
- Consumption or resolution text.
- Risk chance.
- Unavailable state if unaffordable.

### Targeted Gather Intel

When `Gather Intel` has a district, venue, or rival target:

```text
Secret Chance: 28%
```

The chance is calculated by the shared discovery function. Untargeted `Gather Intel` does
not show Secret chance and cannot discover a Secret.

## Secret Discovery

Add a shared discovery preview:

```ts
type SecretDiscoveryPreview = {
  eligible: boolean;
  chance: number;
  candidateDefinitionIds: LedgerEntryDefinitionId[];
};

function previewSecretDiscovery(
  state: GameState,
  order: QueuedOrder | QueueOrderRequest,
): SecretDiscoveryPreview;
```

Rules:

- Only `gather_intel` can discover Secrets.
- The order must have a non-Ledger target.
- Chance is exact and shown in preview.
- Resolution uses seeded RNG.
- Candidate selection is weighted by target tags, target identity, rival context, current
  Intel, repeat penalties, and active duplicates.
- Duplicate definitions are allowed unless a definition is marked `unique`.

Initial chance formula:

```ts
const base = 18;
const intelBonus = Math.floor(state.pressures.intel / 10);
const targetBonus = getTargetIntelDiscoveryBonus(order.target, state);
const stressPenalty = getAssignedOperativeStressPenalty(order, state);
const chance = clamp(base + intelBonus + targetBonus - stressPenalty, 5, 45);
```

The implementation may tune constants, but must preserve:

- Minimum chance for targeted Intel.
- Maximum chance cap.
- No chance for untargeted Intel.
- Preview and resolution using the same calculation.

If discovery succeeds:

```text
1. Select one Secret definition from eligible weighted candidates.
2. Add a Ledger entry with source type action.
3. Attach target/rival/operative context when available.
4. Log the discovery.
5. Do not reduce raw Intel gain in the initial pass.
```

## Event Definition Extensions

Extend event choices with Ledger effects:

```ts
type EventChoiceDefinition = {
  // existing fields...
  ledgerEffects?: EventChoiceLedgerEffect[];
};
```

```ts
type EventChoiceLedgerEffect =
  | {
      type: 'create';
      definitionId: LedgerEntryDefinitionId;
      potency?: 1 | 2 | 3;
      relatedTarget?: ActionTarget;
      relatedOperativeId?: OperativeId;
      relatedRivalId?: RivalId;
    }
  | {
      type: 'consume';
      entrySelector: LedgerEntrySelector;
    }
  | {
      type: 'resolve';
      entrySelector: LedgerEntrySelector;
    };
```

For Ledger-specific events, pending event state must preserve the selected entry:

```ts
type PendingEventState = {
  id: EventId;
  selectedLedgerEntryId?: LedgerEntryId;
  // existing fields...
};
```

A selector can target either the event-selected entry or a matching kind:

```ts
type LedgerEntrySelector =
  | { type: 'selected_entry' }
  | { type: 'kind'; kind: LedgerEntryKind }
  | { type: 'definition'; definitionId: LedgerEntryDefinitionId };
```

For v0.4, prefer `selected_entry` for Ledger-specific events so player-facing copy names
the specific entry.

## Event Choice Preview

Event choices must expose exact Ledger effects:

```text
Creates Debt: Owes the Liaison
Creates Secret: Dead Channel Trace
Creates Favor: Checkpoint Captain
Consumes Secret: Patrol Schedule
Resolves Debt: Unfunded Promise
```

Do not show vague labels like:

```text
Creates a Debt
```

The UI can render Ledger effects as chips or rows next to pressure effects and costs.

## Existing Event Integration

Update 4 to 5 existing events first. Initial targets:

```text
Liaison Offers a Favor
Blackmail Lead Emerges
Unexpected Windfall
Operative Wants More
Corp Patrol Sweep
```

Expected conversions:

```text
Accept favor -> creates Debt: Owes the Liaison
Save blackmail -> creates Secret: Magistrate in the Glass Room or Dead Channel Trace
Take windfall -> creates Debt: Contaminated Money
Trace windfall -> creates Secret: Dead Channel Trace
Promise future rewards -> creates Debt: Unfunded Promise
Feed a rival name -> creates Secret or Debt depending chosen implementation
```

Do not convert every historical flag. v0.4 should formalize meaningful, player-facing
consequences without turning every event branch into a Ledger branch.

## New Ledger Events

Add at least three Ledger-specific weekly events. Recommended set:

```text
Debt Comes Due
Leverage Window
Favor Returned
```

`Ledger Leak` is valuable but can be the fourth event if implementation time allows.

### Debt Comes Due

Eligibility:

```text
At least one active Debt.
More likely if Debt age >= 2 weeks.
More likely if Heat >= 60 or Loyalty <= 45.
```

Selection should choose a specific active Debt and store its `ledgerEntryId` in pending
event state.

Choices:

```text
Pay what is owed -> cost Resources, resolves selected Debt, Loyalty benefit
Offer information instead -> cost Intel, resolves selected Debt, Heat benefit
Refuse the claim -> selected Debt remains active, pressure damage
```

### Leverage Window

Eligibility:

```text
At least one active Secret.
More likely if Dominion < 45 or Heat >= 65.
```

Selection should choose a specific active Secret.

Choices:

```text
Use the leverage -> consumes selected Secret, Dominion/Heat benefit, Ruin cost
Hold it -> Secret remains active, small Intel gain
Sell it quietly -> consumes selected Secret, Resources gain, Intel cost
```

### Favor Returned

Eligibility:

```text
At least one active Favor.
More likely if Heat >= 65 or Loyalty <= 40.
```

Selection should choose a specific active Favor.

Choices:

```text
Call it in now -> consumes selected Favor, Heat/Loyalty benefit
Ask for money -> consumes selected Favor, Resources gain
Save the favor -> Favor remains active, small Intel gain
```

### Ledger Leak

Eligibility:

```text
Active Secret count >= 2
or Ruin >= 25
or recent memory/Ghostline/Juno activity
```

This event can be deferred if the first three events carry the system.

## Event Weighting

Extend the current event weight context:

```ts
type EventWeightContext = {
  // existing fields...
  activeSecrets: number;
  activeDebts: number;
  activeFavors: number;
  oldestDebtAge: number;
  oldestSecretAge: number;
  ledgerTags: Set<string>;
};
```

Weights must be soft, not dominating:

- Active Debts raise debt-event weight.
- Older Debts raise debt-event weight further.
- Active Secrets raise leverage-event weight.
- Active Favors raise favor-event weight.
- Repeated Ledger events should receive normal recent-event penalties.

The event pool should not become all debt events all the time.

## Turn Order

The v0.4 turn order remains:

```text
1. Player queues command-phase orders.
2. Player advances week.
3. Queued orders resolve in order.
4. Work the Ledger applies selected Ledger use options when encountered.
5. Targeted Gather Intel may discover a Secret during order resolution.
6. Assignment stress and recent activity update.
7. Weekly drift and passive rival effects apply.
8. Weekly event is selected with Ledger context.
9. Player resolves weekly event choice.
10. Win/loss state is checked.
```

If the current implementation checks win/loss before or after event resolution in a
slightly different location, preserve existing behavior unless Ledger integration requires
a focused adjustment. Do not introduce multiple weekly events.

## UI Design

v0.4 adds one major UI area and one game-over report. It should extend the current dense
one-screen structure, not redesign it.

### Black Ledger Panel

Add a Black Ledger panel with sections:

```text
Secrets
Debts
Favors
Spent / Resolved
```

Each active card shows:

```text
kind
name
description
created week
source or related context
potency
tags
primary use preview
status
```

Spent / Resolved entries should remain visible but muted or collapsed by default.

### Action Card Integration

For `Work the Ledger`:

- Target dropdown shows generated Ledger use options.
- Option label includes entry name and use option label.
- Preview shows costs, effects, risk, and consumption.
- Queue button is disabled for consumed or unaffordable options.

For targeted `Gather Intel`:

- Preview shows `Secret Chance: N%`.
- Secret chance should update when target or operative changes.

### Event Choice Integration

Event choices should show Ledger consequences alongside pressure consequences:

```text
Creates Debt: Owes the Liaison
Creates Secret: Dead Channel Trace
Consumes Favor: Hidden Route
Resolves Debt: Saint's Payment Trail
```

### Game-Over Report

Add run summary to the game-over panel only.

Include:

```text
result
week ended
seed
final pressures
starting roster
final roster
most assigned operative
MVP operative
most dangerous rival
Ledger entries gained
Ledger entries consumed
unresolved debts
major events
epitaph
```

Add a button:

```text
Copy Run Report
```

Use the browser clipboard API with a graceful fallback:

```text
Report copied
Copy failed
```

Do not build an always-available run history dashboard in v0.4.

## Run Summary Model

Add a pure report builder:

```ts
type RunSummaryReport = {
  title: string;
  seed: string;
  result: 'victory' | 'loss';
  endedWeek: number;
  finalPressures: PressureState;
  startingRoster: OperativeSummary[];
  finalRoster: OperativeSummary[];
  mostAssignedOperative?: OperativeSummary;
  mvpOperative?: OperativeSummary;
  mostDangerousRival?: RivalSummary;
  ledger: {
    created: number;
    consumed: number;
    activeSecrets: number;
    unresolvedDebts: number;
    activeFavors: number;
    entries: LedgerReportEntry[];
  };
  majorEvents: string[];
  epitaph: string;
  text: string;
};
```

```ts
function buildRunSummary(state: GameState): RunSummaryReport;
function formatRunSummary(report: RunSummaryReport): string;
```

The report must be deterministic from final state. Do not depend on UI state.

MVP can start simple:

```text
most assignments
then most beneficial visible pressure delta
then lowest final stress as tie-breaker
```

The exact scoring can be refined later.

## Persistence

v0.4 changes the saved `GameState` shape and must invalidate v0.3 saves.

Update:

```ts
CURRENT_SAVE_SCHEMA_VERSION = 4;
CURRENT_GAME_VERSION = '0.4.0';
CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.4:current-run';
LEGACY_V03_STORAGE_KEY = 'haunted-apex:v0.3:current-run';
```

`newGame` initializes:

```ts
ledger: {
  entries: [],
  discoveredCount: 0,
  consumedCount: 0,
}
```

Storage validation must validate:

- `schemaVersion === 4`.
- `ledger.entries` is an array.
- Every entry has a known definition id.
- Every entry kind matches its definition kind.
- Every entry source is valid.
- Related targets, operatives, and rivals reference known content where present.
- Consumed metadata is valid where present.

Compatibility notice:

```text
Detected save from v0.3.x. v0.4.0 changes the game state schema and requires a fresh run.
Start New Run.
```

No migration is required.

## Harness Agent Updates

All agents must enumerate legal Ledger targets through the same legal order option path used
for normal targets.

### OperatorBot

Rules:

```text
If Heat >= 75 and active Secret/Favor can reduce Heat, Work the Ledger.
If active Debt age >= 2 and Resources > 1800, settle it.
If active Debt age >= 2 and Intel > 12, settle with Intel if available.
If Dominion is behind schedule and a Secret can add Dominion, use it.
If no active Ledger entries and survival is stable, prefer targeted Gather Intel at high-secrecy targets.
Avoid creating too many Debts unless needed to survive.
```

### CautiousBot

Rules:

```text
Avoid creating Debts.
Settle Debts early.
Use Secrets primarily to reduce Heat.
Call Favors defensively.
Likely still fails Dominion target.
```

### AggressiveBot

Rules:

```text
Exploit Secrets for Dominion.
Accept dirty Ledger choices.
Ignore Debts until pressure is severe.
Use Favors only when near loss.
```

### GreedyBot

Rules:

```text
Use Secrets and Favors for Resources when available.
Accept contaminated money.
Delay debt settlement.
Avoid Ledger uses that spend Resources unless near collapse.
```

### RandomBot

Rules:

```text
Random valid action, target, operative, and Ledger use option.
```

## Harness Reports

Extend batch reports with Ledger sections:

```text
ledger_summary
agent,avgEntriesCreated,avgSecretsCreated,avgDebtsCreated,avgFavorsCreated,avgEntriesConsumed,avgUnresolvedDebts

ledger_usage
agent,kind,definitionId,name,created,consumed,activeAtEnd,wins,losses

ledger_outcomes
agent,debtCount,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgRuin

secret_discovery
agent,targetedGatherIntelOrders,discoveries,discoveryRate,mostCommonSecret

ledger_events
agent,eventId,eventTitle,eligibleRuns,selections,selectionRate
```

Useful tuning checks:

- Secrets should be created and used often enough to matter.
- Debts should create pressure without acting as hard loss conditions.
- Favors should appear as occasional comeback tools.
- `Work the Ledger` should be selected by OperatorBot in meaningful situations.
- Targeted `Gather Intel` should not become mandatory in every winning run.

## Balance Targets

Preserve broad v0.3 profile:

```text
OperatorBot: 55-75% win rate
CautiousBot: low win rate due to Dominion shortfall
RandomBot: 5-12% win rate
AggressiveBot: viable but volatile
GreedyBot: viable but swingy
```

Ledger-specific targets:

```text
Average Ledger entries per run: 2-5
Average Debts per run: 0-2
Average Secrets used per run: 1-2
Debt Comes Due appears in 20-40% of runs with active debts
Leverage Window appears in 15-30% of runs with active secrets
Unresolved Debts at end feel ominous, not always fatal
```

No Ledger entry should be universally correct to use immediately.

No Debt should be harmless enough that players always accept it.

## Release Documentation Policy

The README should not declare both "latest release" and "current development target."
That statement is hard to keep accurate during the merge, deploy, smoke test, and tag
sequence.

v0.4 should simplify release status handling:

- Git tags and GitHub Releases are the source of truth for official releases.
- `main` plus GitHub Pages is the current playable prototype.
- `docs/releases/` is the source of truth for design history.
- README should link to the playable prototype and release docs without claiming a current
  semantic release state.
- Remove the release-status README check unless it is replaced with a structural docs check.

Suggested replacement:

```text
npm run check:docs
```

That check should verify:

- Every `docs/releases/v*/` folder is linked from `docs/README.md`.
- README links to `docs/README.md`.
- README links to the playable GitHub Pages build.

It should not verify mutable prose like "current development target."

## Testing Targets

Add focused tests for:

```text
newGame initializes empty Ledger state.
Ledger entries can be added with source metadata.
Duplicate Ledger entries are allowed as separate instances.
Consumed entries remain in history but disappear from active selectors.
Active Secret/Debt/Favor selectors work.
Ledger panel selectors group active and consumed entries.
Work the Ledger is available only with active Ledger target and valid use option.
Work the Ledger is disabled when use option costs are unaffordable.
Work the Ledger applies use costs and effects.
Work the Ledger consumes entries when configured.
Consumed Ledger entry cannot be worked again.
Targeted Gather Intel preview shows Secret chance.
Untargeted Gather Intel has no Secret chance and cannot discover Secrets.
Targeted Gather Intel can discover a Secret deterministically by seed.
Secret discovery respects duplicate weighting and unique definitions.
Event choices create exact Ledger entries.
Event choices consume or resolve selected Ledger entries.
Debt Comes Due only triggers with active Debt.
Leverage Window only triggers with active Secret.
Favor Returned only triggers with active Favor.
Ledger-specific pending events preserve selected ledgerEntryId.
Event choice preview displays exact Ledger create/consume/resolve labels.
Run summary includes seed, result, final pressures, roster, Ledger stats, and unresolved debts.
Copy report uses formatted run summary text.
Harness agents can select legal Ledger targets.
Harness reports include Ledger summary and usage metrics.
v0.3 saves are invalidated.
v0.4 storage validation rejects malformed Ledger entries.
Production and GitHub Pages builds still succeed.
```

## Acceptance Criteria

v0.4.0 is complete when:

```text
The game has a visible Black Ledger panel.

The player can acquire Secrets, Debts, and Favors during normal play.

The initial content slice includes 12 Ledger definitions.

Targeted Gather Intel can discover named Secrets.

Targeted Gather Intel previews exact Secret discovery chance.

Work the Ledger can use Secrets, settle Debts, and call Favors.

Debts with multiple settlement methods require an explicit player choice.

Ledger costs and effects are visible before queueing.

Unaffordable Ledger uses cannot be queued.

Consumed Ledger entries remain visible as spent/resolved history.

Existing events create Ledger entries in visible, exact ways.

At least three Ledger-specific events exist.

Ledger-specific events reference specific active entries where possible.

Unresolved Debts do not create a new hard loss condition.

The run-end game-over panel includes a Ledger-aware run summary.

Copy Run Report works.

Simulation agents understand basic Ledger usage.

Harness reports expose Ledger usage and outcomes.

v0.3 saves are invalidated with a clear compatibility notice.

The broad v0.3 balance profile remains recognizable.

README release status prose is simplified so future releases do not require direct-to-main
status correction commits.
```

