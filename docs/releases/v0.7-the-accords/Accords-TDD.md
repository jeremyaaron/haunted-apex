# Haunted Apex v0.7.0 Accords TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.7.0: The Accords**.

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

The Accords adds the first institutional layer:

```text
Broker/Action/Event + Faction State + Active Accords
  -> Pressure Outcome
  + Standing/Suspicion/Obligation
  + Short-Term Bargain
  + Future Political Pressure
```

The release succeeds when factions feel like useful institutions with appetite, not vendors.
The player should understand which institution can help, what the bargain costs now, and what
political memory it leaves behind.

## Source Documents

- [`v0.7.md`](./v0.7.md): product vision, faction model, accord model, events, UI scope,
  reports, and balance goals.
- [`v0.7A.md`](./v0.7A.md): locked mechanical decisions and canonical answers to open
  questions.
- [`Fronts-TDD.md`](../v0.6-fronts/Fronts-TDD.md): current Front, event, report, persistence,
  and release architecture.
- [`Entanglements-TDD.md`](../v0.5-entanglements/Entanglements-TDD.md): Contact architecture
  and relationship-effect conventions.
- [`BlackLedger-TDD.md`](../v0.4-the-black-ledger/BlackLedger-TDD.md): Ledger architecture
  and persistent entry conventions.
- [`Roster-TDD.md`](../v0.3-the-roster/Roster-TDD.md): operative stress and roster
  architecture.
- [`RivalTerritory-TDD.md`](../v0.2-rival-territory/RivalTerritory-TDD.md): targeting,
  territory, rival, and GitHub Pages architecture.
- [`DistrictZero-TDD.md`](../v0.1-district-zero/DistrictZero-TDD.md): original pressure
  loop and deterministic simulation architecture.
- [`Layer1.md`](../../foundation/Layer1.md): long-term product identity and simulation
  philosophy.

When these documents differ, `v0.7A.md` is canonical for v0.7 mechanical behavior.

## Goals

- Add Factions as first-class engine entities.
- Add static faction definitions for five v0.7 institutions.
- Generate exactly four active factions per run.
- Always include Ashline Bureau as an active faction.
- Seed-select three additional active factions from the remaining four definitions.
- Keep inactive factions invisible in normal UI.
- Track Standing, Suspicion, Obligation, used accords, active accords, flags, and recent
  interactions per active faction.
- Derive faction status in selectors instead of persisting it.
- Add Accord definitions as static faction content.
- Add active accord runtime state.
- Enforce a maximum of two active accords total.
- Enforce a maximum of one active accord per faction.
- Enforce one-use-per-run for every accord definition.
- Add `Broker Accord` as a command-phase action with no operative assignment.
- Support faction action targets containing both faction id and accord id.
- Preview and resolve accord costs, immediate effects, weekly effects, duration, faction
  metric changes, Ledger entries, rival pressure, and front exposure hooks.
- Apply accord immediate effects on the broker week.
- Begin accord weekly effects on the next Advance Week resolution.
- Count accord duration as weekly-effect ticks, not total calendar weeks.
- Expire accords after their weekly ticks are consumed.
- Implement Ashline `Inspection Delay` as a concrete highest-exposure front cooling hook.
- Defer Helix `Permit Shell` front-cost discounts.
- Add constrained faction touch for front, contact, Ledger, accord, and faction-event cases.
- Do not apply broad faction touch to ordinary district or venue targeting.
- Add at least five generic faction event templates with selected active faction context.
- Add `Institutional Favor` and `Compliance Blind Spot` Ledger entries.
- Add direct `associatedFactionId` fields to rival and contact definitions.
- Use faction-side associations for districts, venues, and front tags.
- Add a Factions panel/tab to the existing one-screen UI.
- Show active accords inside the Factions panel.
- Add faction-aware agent behavior and harness report sections.
- Preserve deterministic seeded simulation.
- Preserve the broad v0.6 balance profile.
- Treat RandomBot win rate as diagnostic, with 0-10% acceptable if runs remain valid.
- Invalidate v0.6 saves through schema versioning.

## Non-Goals

- Full diplomacy simulator.
- Faction wars.
- Faction territory movement.
- Alliance trees.
- Faction conquest.
- Faction-specific victory paths.
- Complex cross-faction reputation.
- Negotiation minigames.
- Multi-stage treaty chains.
- Faction leader portraits.
- Faction shops or inventory.
- Player-created factions.
- Multi-run faction continuity.
- Long campaign political arcs.
- Helix front-cost discount implementation.
- Broad faction touch for every district or venue action.
- Faction-specific bespoke event trees.
- New full-page routes.
- Backend services.
- Cloud saves.
- Electron packaging.
- SQLite integration.

## Architectural Direction

The dependency direction remains:

```text
Angular UI -> GameFacade -> Pure Engine
Pure Engine -> Model + Content + RNG
Persistence Adapter -> versioned serialized GameState envelope
Harness Agents -> public engine commands and selectors
GitHub Actions -> production Angular artifact -> GitHub Pages
```

Faction and Accord rules belong in the pure engine. Angular may display factions, selected
accord previews, active accord state, event consequences, and reports, but it must not calculate
accord availability, affordability, faction status, faction touch effects, weekly accord effects,
event eligibility, or report metrics.

Static definitions and mutable runtime state must remain separate:

```text
Static Faction definition:
  identity
  archetype
  role tags
  base metrics
  association lists
  accord ids or definitions
  event ids
  flavor metadata

Mutable Faction state:
  faction id
  Standing
  Suspicion
  Obligation
  used accord ids
  active accord ids
  runtime flags
  recent interactions

Static Accord definition:
  faction id
  label and description
  duration
  requirements
  costs
  immediate effects
  weekly effects
  faction metric deltas
  Ledger effects
  rival pressure effects
  front hook metadata
  role tags

Mutable Active Accord:
  runtime id
  definition id
  faction id
  started week
  remaining weekly ticks
  first weekly effect week
  source metadata
```

The same Faction and Accord registries must power:

```text
new-game faction generation
action target options
action previews
action resolution
weekly accord effects
accord expiration
event eligibility
event choice previews
event resolution
Ledger linking
UI faction cards
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
    contacts.ts
    events.ts
    factions.ts
    game-state.ts
    ledger.ts
    rivals.ts
  content/
    accord-events.ts
    accords.ts
    factions.ts
    ledger-entries.ts
  factions/
    accord-effects.ts
    accord-options.ts
    apply-accord-weekly-effects.ts
    apply-faction-touch.ts
    derive-faction-status.ts
    expire-accords.ts
    faction-event-eligibility.ts
    faction-selectors.ts
    generate-factions.ts
    resolve-broker-accord.ts
  ledger/
    ledger-use.ts
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

- Faction definitions contain authored data, not mutable run state.
- Accord preview and resolution share the same effect calculation.
- Weekly accord ticks and expiration use shared helpers.
- Faction event definitions declare faction effects; event resolution applies them centrally.
- Ledger entries can reference factions, but declared faction effects define consequences.
- The UI consumes selectors and facade commands instead of reconstructing faction rules.

## Domain Identifiers

Add explicit faction and accord identifiers for the v0.7 content slice:

```ts
type FactionId =
  | 'faction_ashline_bureau'
  | 'faction_helix_meridian'
  | 'faction_velvet_house'
  | 'faction_chrome_maw'
  | 'faction_ghostline_communion';

type AccordId =
  | 'accord_ashline_clean_corridor'
  | 'accord_ashline_inspection_delay'
  | 'accord_helix_quiet_capital'
  | 'accord_helix_permit_shell'
  | 'accord_velvet_guest_list'
  | 'accord_velvet_silence'
  | 'accord_chrome_dockside_tithe'
  | 'accord_chrome_muscle_retainer'
  | 'accord_ghostline_dead_channel'
  | 'accord_ghostline_mercy_static';

type ActiveAccordId = `active_${AccordId}_${number}`;

type FactionStatus =
  | 'hostile'
  | 'cold'
  | 'neutral'
  | 'favorable'
  | 'watching'
  | 'indebted'
  | 'entangled';

type FactionArchetype =
  | 'security_bureau'
  | 'megacorp'
  | 'nightlife_house'
  | 'industrial_syndicate'
  | 'ghost_market'
  | 'memory_cult';

type FactionRoleTag =
  | 'heat_control'
  | 'resources'
  | 'intel'
  | 'dominion'
  | 'fronts'
  | 'ledger'
  | 'rival_pressure'
  | 'security'
  | 'nightlife'
  | 'industrial'
  | 'weird'
  | 'ruin'
  | 'stability';
```

`ActiveAccordId` should be deterministic within a run. It can be generated from accord id and
the count of existing/used accords, or a monotonic state-local counter if one already exists.

## Static Faction Model

Add faction definitions as pure content:

```ts
type FactionDefinition = {
  id: FactionId;
  name: string;
  archetype: FactionArchetype;
  roleTags: readonly FactionRoleTag[];
  baseStanding: number;
  baseSuspicion: number;
  baseObligation: number;
  associatedDistrictIds?: readonly DistrictId[];
  associatedVenueIds?: readonly VenueId[];
  associatedRivalIds?: readonly RivalId[];
  associatedContactIds?: readonly ContactId[];
  associatedFrontTags?: readonly FrontRoleTag[];
  accordIds: readonly AccordId[];
  eventIds: readonly EventId[];
  flavor: {
    dossier: string;
    visualTags?: readonly string[];
  };
};
```

The initial registry contains:

```text
Ashline Bureau
Helix Meridian
Velvet House
Chrome Maw
Ghostline Communion
```

Content validation should enforce:

- Exactly five faction definitions exist.
- Faction ids are unique.
- Every faction has a supported archetype and role tags.
- Base Standing, Suspicion, and Obligation are 0-100 integers.
- Associated district, venue, rival, and contact ids resolve when present.
- Associated front role tags resolve to known Front role tags.
- Accord ids resolve.
- Event ids resolve once faction events are added.
- Ashline Bureau exists and is marked as the always-active faction by generation rules.

## Static Accord Model

Add accord definitions as pure content:

```ts
type FactionMetricDelta = {
  standing?: number;
  suspicion?: number;
  obligation?: number;
};

type AccordRequirement =
  | { metric: 'standing'; gte: number }
  | { metric: 'standing'; lte: number }
  | { metric: 'suspicion'; gte: number }
  | { metric: 'suspicion'; lte: number }
  | { metric: 'obligation'; gte: number }
  | { metric: 'obligation'; lte: number }
  | { type: 'owned_front_required' };

type AccordFrontEffect =
  | {
      type: 'cool_highest_exposure_front';
      exposureDelta: number;
    };

type AccordLedgerEffect =
  | {
      type: 'create';
      definitionId: LedgerEntryDefinitionId;
      relatedFactionId?: FactionId;
    };

type AccordDefinition = {
  id: AccordId;
  factionId: FactionId;
  label: string;
  description: string;
  durationWeeks: number;
  requirements?: readonly AccordRequirement[];
  cost?: {
    resources?: number;
    intel?: number;
  };
  immediateEffects?: PressureDelta;
  weeklyEffects?: PressureDelta;
  factionEffectsOnStart?: FactionMetricDelta;
  factionEffectsPerWeek?: FactionMetricDelta;
  factionEffectsOnExpire?: FactionMetricDelta;
  ledgerEffectsOnStart?: readonly AccordLedgerEffect[];
  rivalPressureEffectsOnStart?: Partial<Record<RivalId, number>>;
  frontEffectsOnStart?: readonly AccordFrontEffect[];
  tags: readonly FactionRoleTag[];
};
```

Content validation should enforce:

- Exactly ten accord definitions exist.
- Accord ids are unique.
- Accord faction ids resolve.
- Every accord is listed by its faction definition.
- Duration is a positive integer.
- Costs are non-negative integers.
- Pressure effects use supported pressure keys.
- Faction metric effects use supported faction metric keys.
- Ledger effect definition ids resolve.
- Rival pressure effect ids resolve.
- Front hooks use supported hook types.

## Runtime Faction and Accord State

Extend `GameState`:

```ts
type FactionState = {
  id: FactionId;
  standing: number;
  suspicion: number;
  obligation: number;
  usedAccordIds: AccordId[];
  activeAccordIds: ActiveAccordId[];
  flags: Record<string, boolean | number | string>;
  recentInteractions: FactionInteraction[];
};

type ActiveAccord = {
  id: ActiveAccordId;
  definitionId: AccordId;
  factionId: FactionId;
  startedWeek: number;
  remainingWeeks: number;
  firstWeeklyEffectWeek: number;
  source: {
    type: 'broker_accord';
  };
};

type FactionInteraction = {
  week: number;
  sourceType: 'accord' | 'event' | 'action' | 'front' | 'contact' | 'ledger';
  sourceId: string;
  standingDelta?: number;
  suspicionDelta?: number;
  obligationDelta?: number;
};

type GameState = {
  factions: Partial<Record<FactionId, FactionState>>;
  activeFactionIds: FactionId[];
  activeAccords: Record<ActiveAccordId, ActiveAccord>;
  // existing fields...
};
```

Rules:

- Only active factions have `FactionState` records.
- `activeFactionIds` defines normal UI visibility and target options.
- Inactive faction definitions remain available to content validation but not normal selectors.
- Faction metrics clamp to 0-100.
- Derived status is not persisted.
- Every brokered accord id is added to `usedAccordIds` when brokered, not when expired.
- `usedAccordIds` blocks the same accord from being brokered again later in the run.
- `activeAccordIds` mirrors `activeAccords` for faction-local display and validation.
- Recent interactions should remain lightweight. A short fixed cap such as 8 per faction is
  acceptable if the existing pattern uses capped recent histories.

## Faction Status

Derive status from faction state:

```ts
function deriveFactionStatus(faction: FactionState): FactionStatus {
  if (faction.standing <= 20) return 'hostile';
  if (faction.obligation >= 70 && faction.suspicion >= 60) return 'entangled';
  if (faction.obligation >= 70) return 'indebted';
  if (faction.suspicion >= 70) return 'watching';
  if (faction.standing >= 70) return 'favorable';
  if (faction.standing <= 40) return 'cold';
  return 'neutral';
}
```

The selector should show both the status label and the underlying metrics.

## Faction Generation

Generate active factions during new game creation:

```text
Always active:
  Ashline Bureau

Seed-selected:
  3 of the remaining 4 faction definitions
```

Generation should:

- Use the existing seeded RNG helpers.
- Produce identical active factions for identical seeds.
- Initialize faction state from definition base metrics.
- Initialize `usedAccordIds`, `activeAccordIds`, flags, and recent interactions as empty.
- Initialize `activeAccords` as an empty record.

Inactive factions:

- Do not appear in the Factions panel.
- Do not appear as Broker Accord targets.
- Do not trigger faction events.
- Do not receive faction touch.

## Associated Entity Links

Use direct definition fields where an entity naturally belongs to one faction:

```ts
type RivalDefinition = {
  // existing...
  associatedFactionId?: FactionId;
};

type ContactDefinition = {
  // existing...
  associatedFactionId?: FactionId;
};
```

Initial associations:

```text
Nyx Ardent -> Velvet House
Knox Marrow -> Chrome Maw
Captain Hollis -> Ashline Bureau
Veyra Lux -> Velvet House
Ciro Moth -> Ghostline Communion
```

Faction definitions keep lists/tags for broader spheres:

```text
districts
venues
front role tags
associated rivals
associated contacts
```

Resolution helpers should prefer direct association for rivals and contacts, and faction-side
association for districts, venues, and Front role tags.

## Actions and Targets

Add one action:

```ts
{
  id: 'broker_accord',
  label: 'Broker Accord',
  commandCost: 1,
  resourceCost: 0,
  effects: {},
  baseRisk: 10,
  stressType: 'none',
  assignment: 'none',
  requiresTarget: true,
  allowedTargetTypes: ['faction']
}
```

Extend `ActionId`:

```ts
type ActionId =
  | ExistingActionIds
  | 'broker_accord';
```

Extend `ActionTarget`:

```ts
type ActionTarget =
  | ExistingTargets
  | {
      type: 'faction';
      factionId: FactionId;
      accordId: AccordId;
    };
```

Target semantics:

- `factionId` selects the active faction.
- `accordId` selects one accord belonging to that faction.
- The target is invalid if the faction is inactive.
- The target is invalid if the accord does not belong to the faction.
- `Broker Accord` does not allow operative assignment.

## Broker Accord Availability

Broker Accord target options should include legal and visible accord choices for active factions.

Unavailable reasons:

```text
target_required
target_not_allowed
target_not_found
faction_inactive
accord_not_found
accord_wrong_faction
accord_already_used
accord_already_active
accord_cap_reached
faction_accord_cap_reached
accord_requirement_not_met
not_enough_resources
not_enough_intel
not_command_phase
not_enough_command_points
```

Rules:

- Total active accord cap is 2.
- Per-faction active accord cap is 1.
- Same accord cannot be brokered twice in one run.
- Different accords from the same faction can be brokered later after the previous one expires.
- Requirement checks use current faction state and current game state.
- Ashline `Inspection Delay` requires at least one owned active front because it cools a front.
  The Pale Circuit normally satisfies this.
- Unaffordable accords cannot be queued.

## Broker Accord Preview

Preview should include:

- Faction name.
- Accord label and description.
- Command cost through existing command UI.
- Resource and Intel costs.
- Immediate pressure effects.
- Weekly pressure effects.
- Duration.
- Clear timing copy: `Starting next week for N weeks`.
- Faction metric changes on start.
- Faction metric changes per week.
- Faction metric changes on expiration when present.
- Ledger entries created on start.
- Rival pressure changes on start.
- Front exposure hook details when present.
- Active accord cap or one-use warnings when unavailable.

Example:

```text
Broker Accord: Ashline Bureau - Clean Corridor

Cost:
-700 Resources

Immediate:
-6 Heat

Starting next week for 2 weeks:
-3 Heat / Week

Faction:
+3 Standing
+8 Suspicion
+8 Obligation
+3 Suspicion / Week
```

Ashline `Inspection Delay` preview must show the selected front hook:

```text
Highest-exposure front: Zero Mercy Cut
Zero Mercy Cut Exposure -10
```

If multiple fronts tie for highest exposure, use a deterministic tie-breaker such as name or
front id. Preview and resolution must select the same front.

## Broker Accord Resolution

Resolution should use the same calculation as preview.

Flow:

1. Validate target faction is active.
2. Validate target accord exists and belongs to the faction.
3. Validate active accord caps.
4. Validate accord has not been used this run.
5. Validate requirements.
6. Validate resource and Intel costs.
7. Spend costs.
8. Apply immediate pressure effects.
9. Apply faction start effects.
10. Apply rival pressure effects.
11. Apply front start effects.
12. Create Ledger entries from start effects.
13. Create `ActiveAccord` with:
    - `startedWeek = state.week`
    - `remainingWeeks = definition.durationWeeks`
    - `firstWeeklyEffectWeek = state.week + 1`
14. Add active accord id to faction state.
15. Add accord id to faction `usedAccordIds`.
16. Append recent faction interaction.
17. Add event log entry with costs, effects, faction metric deltas, and active duration.

All pressure values should clamp through existing pressure helpers. Faction metrics and front
exposure should clamp to 0-100.

## Active Accord Weekly Resolution

Apply active accord weekly effects during weekly resolution after queued orders and before front
weekly yields:

```text
1. Resolve queued orders.
2. Apply active accord weekly effects.
3. Apply front weekly yields.
4. Apply global weekly drift.
5. Cool local district heat.
6. Apply passive rival/contact/faction threshold effects.
7. Select weekly event.
8. Resolve event choice.
9. Expire accord ticks that reached zero.
10. Check win/loss.
```

Weekly application rules:

- Accord weekly effects do not apply on the broker week.
- Accord weekly effects apply only when `state.week >= activeAccord.firstWeeklyEffectWeek`.
- Each weekly application decrements `remainingWeeks` by 1.
- `factionEffectsPerWeek` applies alongside `weeklyEffects`.
- A log entry should show accord name and weekly effects.
- If `remainingWeeks` reaches 0 after a weekly tick, expire the accord in the same weekly
  resolution after event handling.

Expiration rules:

- Remove the active accord from `activeAccords`.
- Remove the active accord id from faction `activeAccordIds`.
- Apply `factionEffectsOnExpire` when present.
- Append recent faction interaction when expiration effects exist.
- Add expiration log:

```text
Accord expired: Ashline Clean Corridor.
The clean corridor closes. The cameras remember who used it.
```

## Faction Metric Effects

Use a shared helper for faction metric deltas:

```ts
function applyFactionMetricDelta(
  state: GameState,
  factionId: FactionId,
  delta: FactionMetricDelta,
  context: {
    sourceType: FactionInteraction['sourceType'];
    sourceId: string;
  },
): GameState;
```

The helper should:

- No-op when the faction is inactive or missing.
- Clamp Standing, Suspicion, and Obligation to 0-100.
- Append recent interaction when any metric changes.
- Keep logs separate from state mutation unless existing engine patterns combine them.

## Faction Touch

v0.7 faction touch is intentionally constrained.

Touch applies only to:

```text
Broker Accord explicit effects
Front establish/upgrade in faction sphere
Manage Contact with associatedFactionId
Work the Ledger with relatedFactionId and declared faction effects
Faction events
```

Touch does not apply to:

```text
Gather Intel at any associated venue
Run Small Job in any associated district
Expand Influence anywhere linked to a faction
Bribe Official generally
ordinary district or venue targeting
```

Front touch:

```text
When establishing or upgrading a front in an active faction sphere:
  Suspicion +4
  Standing +1 if the front role tag matches the faction's interests

If an active accord with tag 'fronts' belongs to the touching faction:
  reduce Suspicion gain by 2
```

A front is in faction sphere when any is true:

- Front district id is in faction `associatedDistrictIds`.
- Front venue id is in faction `associatedVenueIds`.
- Front role tags intersect faction `associatedFrontTags`.

Contact touch:

```text
Cultivate associated contact:
  Standing +1

Pressure associated contact:
  Suspicion +2

Use associated contact service:
  Suspicion +2
  Obligation +2 if the service gives pressure benefit or creates Ledger value
```

Ledger touch:

- Ledger entries gain optional `relatedFactionId`.
- Ledger uses apply faction effects only when the Ledger use or entry definition declares them.
- Do not infer faction effects for every related Ledger entry use.

## Ledger Integration

Extend Ledger state and definitions with optional faction context:

```ts
type LedgerEntry = {
  // existing...
  relatedFactionId?: FactionId;
};

type LedgerEntryDefinition = {
  // existing...
  factionEffectsOnUse?: FactionMetricDelta;
};
```

If existing Ledger use option types already carry declared side effects, place the faction delta
there instead of on the entry definition. The core rule is that faction Ledger effects are
explicit, not inferred.

Add two Ledger definitions:

```text
Debt: Institutional Favor
Secret: Compliance Blind Spot
```

`Institutional Favor` suggested uses:

```text
Settle with Resources:
  Resources -1000
  related faction Obligation -10
  consumes debt

Settle with Intel:
  Intel -6
  related faction Suspicion +3
  related faction Obligation -8
  consumes debt
```

`Compliance Blind Spot` suggested use:

```text
Heat -6
Intel -2
related faction Suspicion -8
consumes secret
```

Accords may create these entries with `relatedFactionId` set to the accord faction.

## Faction Events

Add five to six faction event templates using the existing weekly event slot:

```text
Faction Demand
Faction Scrutiny
Accord Terms Shift
Market Access
Proxy Conflict
Institutional Blind Spot
```

Faction events select a specific active faction when possible. Event title and body should include
the selected faction name and light faction-specific vocabulary. Mechanics remain generic.

Event target selection should be seeded and weighted by eligibility:

```text
Faction Demand:
  eligible when obligation >= 50
  much higher weight when obligation >= 70

Faction Scrutiny:
  eligible when suspicion >= 60

Accord Terms Shift:
  eligible when at least one active accord exists
  higher weight when obligation >= 40 or suspicion >= 50

Market Access:
  eligible when standing >= 65

Proxy Conflict:
  eligible when associated rival pressure >= 50

Institutional Blind Spot:
  eligible when standing >= 55 and suspicion <= 45
```

Event definitions need faction effects:

```ts
type EventChoiceFactionEffect = {
  factionId?: FactionId; // default selected faction when omitted
  delta: FactionMetricDelta;
};
```

Event choice preview and resolution should apply faction effects centrally, like Ledger,
Contact, and Front effects.

Faction event rules:

- Only active factions are selected.
- Inactive factions do not trigger events.
- Faction events use the normal weekly event slot.
- Faction events should not dominate the slot.
- Event choices must preview pressure costs/effects and faction metric changes.
- Event logs must name the selected faction.

Passive thresholds:

- Obligation >= 70 increases demand event weight.
- Suspicion >= 70 increases scrutiny event weight.
- Ashline Suspicion >= 80 increases Ashline-flavored scrutiny and existing security/front
  inspection pressure, if this can be done with the existing event weighting pipeline.
- Do not add passive weekly damage in v0.7.

## Accord Content

Initial accord definitions:

```text
Ashline Bureau:
  Clean Corridor
  Inspection Delay

Helix Meridian:
  Quiet Capital
  Permit Shell

Velvet House:
  Guest List Pact
  Velvet Silence

Chrome Maw:
  Dockside Tithe
  Muscle on Retainer

Ghostline Communion:
  Dead Channel Access
  Mercy of Static
```

Locked mechanical highlights:

- `Clean Corridor`: Heat suppression, Ashline Suspicion/Obligation.
- `Inspection Delay`: Heat relief plus highest-exposure front Exposure -10.
- `Quiet Capital`: resource injection, small Heat, Institutional Favor/Dirty Books style debt.
- `Permit Shell`: Heat relief and weekly Resources. No front cost discount in v0.7.
- `Guest List Pact`: Intel/Dominion, Nyx pressure.
- `Velvet Silence`: Heat/Loyalty stabilization.
- `Dockside Tithe`: fast money and Dominion, loud Heat, Knox pressure.
- `Muscle on Retainer`: Dominion push with Loyalty/Heat cost.
- `Dead Channel Access`: Intel and secrets at Ruin cost.
- `Mercy of Static`: Ruin relief with Heat and obligation.

Exact numbers should follow `v0.7.md` unless tuning in later phases requires adjustment.

## UI Design

Add Factions to the existing shared secondary panel/tab system. Do not add a new route.

Faction panel content:

```text
Active factions
Selected or expanded faction detail
Available accords
Active accords
Recent interactions
Related entities
```

Faction card shows:

- Name.
- Archetype.
- Derived status.
- Standing.
- Suspicion.
- Obligation.
- Role tags.
- Active accord count.
- Active accord names and remaining weeks.
- Related districts/rivals/contacts/front tags when space allows.

Faction detail shows:

- Dossier.
- Metric rows.
- Available accords with costs, duration, and high-level consequences.
- Unavailable accord reason.
- Active accord details.
- Recent interactions.
- Related rivals, contacts, districts, venues, and front tags.

Broker Accord action UI:

- Uses the existing target dropdown pattern.
- Target labels should include faction and accord:

```text
Ashline Bureau - Clean Corridor
Helix Meridian - Quiet Capital
```

Action preview should show:

- Cost.
- Immediate effects.
- `Starting next week for N weeks` weekly effects.
- Faction metric effects.
- Ledger entries.
- Rival warnings.
- Front hook details.
- Accord cap and one-use warnings.

Active accord display inside Factions panel is sufficient for v0.7. No global strip is required.

## Selectors and Facade

Add selector view models:

```ts
type FactionPanelView = {
  activeFactions: FactionView[];
  activeAccords: ActiveAccordView[];
  totalActiveAccords: number;
  accordCap: number;
};

type FactionView = {
  id: FactionId;
  name: string;
  archetype: FactionArchetype;
  status: FactionStatus;
  standing: number;
  suspicion: number;
  obligation: number;
  roleTags: readonly FactionRoleTag[];
  dossier: string;
  activeAccords: ActiveAccordView[];
  availableAccords: AccordOptionView[];
  recentInteractions: readonly FactionInteractionView[];
  relatedDistrictNames: readonly string[];
  relatedVenueNames: readonly string[];
  relatedRivalNames: readonly string[];
  relatedContactNames: readonly string[];
  associatedFrontTags: readonly FrontRoleTag[];
};

type AccordOptionView = {
  factionId: FactionId;
  accordId: AccordId;
  label: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  costRows: readonly CostView[];
  immediateEffects: readonly PressureDeltaView[];
  weeklyEffects: readonly PressureDeltaView[];
  durationWeeks: number;
  factionEffectsOnStart: FactionMetricDelta;
  factionEffectsPerWeek: FactionMetricDelta;
  ledgerEffectLabels: readonly string[];
  rivalPressureWarnings: readonly string[];
  frontEffectLabels: readonly string[];
};

type ActiveAccordView = {
  id: ActiveAccordId;
  accordId: AccordId;
  factionId: FactionId;
  factionName: string;
  label: string;
  remainingWeeks: number;
  weeklyEffects: readonly PressureDeltaView[];
  factionEffectsPerWeek: FactionMetricDelta;
};
```

The facade should expose:

```ts
readonly factions = computed(() => selectFactionPanelView(this.stateSignal()));
```

Queueing uses the existing command pipeline with extended targets.

## Persistence

Increment save schema version from v0.6 to v0.7 and use a v0.7 storage key.

Expected values:

```ts
CURRENT_SAVE_SCHEMA_VERSION = 7;
CURRENT_GAME_VERSION = '0.7.0';
CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.7:current-run';
LEGACY_V06_STORAGE_KEY = 'haunted-apex:v0.6:current-run';
```

v0.6 saves should be invalidated with a compatibility notice. Do not write a v0.6 to v0.7
migration.

Save validation must verify:

- `factions` exists and is a record.
- `activeFactionIds` exists and is an array.
- `activeAccords` exists and is a record.
- Active faction ids resolve and include Ashline.
- Exactly four factions are active in new games.
- Faction state exists for active factions.
- No faction state exists for invalid faction ids.
- Faction metrics are 0-100.
- Used accord ids resolve and belong to the faction.
- Active accord ids resolve and belong to the faction.
- Active accord definitions resolve.
- Active accord faction ids resolve and are active.
- Active accord remaining weeks are non-negative integers.
- Active accord `firstWeeklyEffectWeek` is a positive integer.
- Active accord caps are not exceeded.
- Per-faction active accord cap is not exceeded.
- Ledger entries with `relatedFactionId` reference active or known faction definitions.
- Rival and contact `associatedFactionId` values resolve through content validation.

## Reports and Harness

Extend run summaries and harness reports with faction and accord data:

```text
active faction set
Broker Accord uses per run
accord usage count by faction and accord
most used accord
average active accords per run
average final Standing/Suspicion/Obligation by faction
faction event trigger frequency
accord contribution to Resources/Heat/Dominion/Intel/Ruin
obligation-related event frequency
suspicion-related event frequency
loss correlation by high Suspicion
loss correlation by high Obligation
win rate by active faction set
OperatorBot accord selection patterns
```

Track per-run faction stats:

```ts
type FactionRunStats = {
  activeFactionIds: FactionId[];
  brokerAccordOrders: number;
  accordUses: Record<AccordId, number>;
  maxActiveAccords: number;
  weeklyAccordYieldTotals: PressureDelta;
  finalFactionMetrics: Record<FactionId, {
    standing: number;
    suspicion: number;
    obligation: number;
    status: FactionStatus;
  }>;
  factionEvents: Record<EventId, number>;
  highSuspicionRuns: Record<FactionId, boolean>;
  highObligationRuns: Record<FactionId, boolean>;
};
```

The in-game harness CSV should add faction sections without removing existing sections.

## Agent Updates

Agents should become faction-aware without full optimization.

Operator:

- Broker Ashline `Clean Corridor` when Heat is dangerous and affordable.
- Broker Ashline `Inspection Delay` when front exposure is high and Heat/front risk matters.
- Consider Helix or Chrome money accords when Resources are low.
- Consider Velvet or Chrome Dominion accords when behind schedule.
- Avoid new accords with factions at Obligation >= 70.
- Avoid high-Suspicion factions unless the accord solves immediate loss risk.
- Respect active accord caps.
- Avoid late accords unless immediate effects matter.

Cautious:

- Prefer Ashline and Helix safety.
- Prefer Heat control and stabilizing accords.
- Avoid Chrome and Ghostline high-risk accords.
- Prefer event choices that reduce Obligation or Suspicion.
- Still usually miss Dominion target.

Aggressive:

- Prefer Chrome and Velvet Dominion accords.
- Ignore Suspicion and Obligation until severe.
- Use faction events to push Dominion when possible.

Greedy:

- Prefer Helix and Chrome resource accords.
- Accept Debt and Obligation.
- Avoid accords only when they create immediate loss.

Random:

- Randomly select valid faction/accord decisions.
- Random win rate is diagnostic, not a blocking balance target.

## Balance Targets

Preserve broad v0.6 tuning:

```text
OperatorBot: 55-75% win rate
CautiousBot: low win rate, usually Dominion shortfall
RandomBot: 0-10% win rate acceptable if runs remain valid
AggressiveBot: viable but volatile
GreedyBot: viable but swingy
```

Faction-specific targets:

```text
Average Broker Accord uses per run: 0.5-2.0
Average active accords at a time: 0-1.5
Faction events per run: 0-2
High Obligation matters in some runs, not every run
High Suspicion creates risk, not automatic collapse
No accord is mandatory for OperatorBot
Faction play creates different run shapes
Ignoring factions can still win sometimes
```

Expected failure signals:

- Broker Accord is never used: accords are too weak, costly, or hidden.
- Every OperatorBot run uses the same accord: that accord or pressure need is too efficient.
- Obligation never matters: demand events are too soft or too rare.
- Suspicion creates too many events: faction pressure is too noisy.
- Greedy wins too often: capital accords are too generous.
- Cautious starts winning often: safety accords are too efficient.
- Faction metrics change invisibly: previews/logs/selectors need clearer output.
- Accords feel like better normal actions: future pressure is too soft.

## Testing Strategy

Unit and integration tests should cover:

- Faction content validity.
- Accord content validity.
- Faction generation is deterministic by seed.
- Ashline Bureau is always active.
- Exactly four factions are active.
- Inactive factions do not appear in normal selectors.
- Faction state initializes from definitions.
- `deriveFactionStatus` works for major metric combinations.
- Broker Accord requires faction target and accord id.
- Broker Accord cannot exceed active accord cap.
- Broker Accord cannot add more than one active accord per faction.
- Same accord cannot be brokered twice in one run.
- Different accord from same faction can be brokered after prior accord expires.
- Unaffordable accords cannot be queued.
- Accord immediate effects apply during broker resolution.
- Accord weekly effects do not apply on broker week.
- Accord weekly effects apply starting the next week.
- Accord duration decrements only on weekly ticks.
- Expired accords are removed and logged.
- Faction metric effects apply from accords.
- Ashline `Inspection Delay` selects highest-exposure owned front and reduces exposure by 10.
- Helix `Permit Shell` does not modify Invest Front costs.
- Faction touch does not fire for ordinary targeted actions.
- Faction touch fires for front/contact/ledger cases with explicit faction association.
- Faction events only trigger for active factions.
- Faction Demand requires obligation threshold.
- Faction Scrutiny requires suspicion threshold.
- Faction events use the normal weekly event slot.
- Faction events use selected active faction names in previews/logs.
- `Institutional Favor` and `Compliance Blind Spot` can be created/used.
- Active accords appear in faction view model.
- Reports include faction and accord metrics.
- Agents can simulate games with factions enabled.
- RandomBot can simulate valid runs even if win rate is zero.
- v0.6 saves are invalidated.

## Acceptance Criteria

v0.7.0 is complete when:

```text
The game has a Factions panel/tab.

Each run has 4 active factions, including Ashline Bureau.

Each active faction has Standing, Suspicion, and Obligation.

Faction status is visible and derived.

Broker Accord action exists.

Broker Accord can create time-limited active accords.

Each accord is one-use-per-run.

At least 10 accords exist across faction definitions.

Accords preview immediate effects, weekly effects, timing, duration, and faction metric changes.

Accord immediate effects apply on the broker week.

Accord weekly effects begin on the next Advance Week resolution.

Active accords apply weekly effects and expire.

Ashline Inspection Delay reduces the highest-exposure owned Front by 10.

At least 5 faction-specific events can trigger.

Faction events select specific active factions.

Front, Contact, and Ledger integrations lightly modify faction metrics where explicitly scoped.

Active accords are visible inside the Factions panel.

Simulation agents understand basic accord usage.

Reports include faction/accord usage and outcome data.

The broad v0.6 balance profile remains recognizable.
```

## Release Readiness

Before release:

- Update README/docs links if any new v0.7 docs were added.
- Add v0.7 release notes draft.
- Update Field Guide copy for Factions, Accords, Standing, Suspicion, Obligation, and weekly
  accord timing.
- Ensure debug-only faction data remains hidden in normal play.
- Run the full validation suite.
- Run the production GitHub Pages build.
- Run the docs checker.
- Capture final harness snapshot.
- Confirm no dev, Karma, or browser-debug process from the release pass remains running.
- Leave package version policy unchanged unless explicitly decided otherwise.

Verification:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
npm run check:docs
git diff --check
```

## Open Implementation Risks

- Accord preview/resolution drift if front, Ledger, rival, and faction effects are calculated
  in separate places.
- Event weighting may make faction events too rare to matter or too common in the single weekly
  event slot.
- Broker Accord can become mandatory if Ashline or Helix effects are too efficient.
- Obligation and Suspicion may feel decorative if event pressure is too soft.
- Faction touch can become opaque if logs and previews do not clearly name metric changes.
- UI density may become high with factions, contacts, fronts, ledger, rivals, and operatives all
  competing for the secondary panel.
- Harness reports may become noisy unless faction sections summarize the most actionable signals.
