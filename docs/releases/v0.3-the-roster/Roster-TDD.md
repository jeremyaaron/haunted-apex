# Haunted Apex v0.3.0 The Roster TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.3.0: The Roster**.

District Zero established the pressure loop:

```text
Action + Operative -> Outcome
```

Rival Territory added spatial and political context:

```text
Action + Operative + Target -> Outcome + Local Change + Rival Reaction
```

The Roster makes operative identity and condition persistent strategic inputs:

```text
Action
  + Operative Identity
  + Operative Condition
  + Target
  -> Outcome
  + Operative Consequence
  + Local Change
  + Rival Reaction
```

The iteration succeeds when seeded crew composition changes how a run is played, the
player can reason about operative strengths and liabilities before assigning them, and
overusing an operative creates visible strategic consequences.

## Source Documents

- [`v0.3.md`](./v0.3.md): product vision, roster content, event examples, UI scope,
  simulation requirements, and balance goals.
- [`v0.3A.md`](./v0.3A.md): locked mechanical decisions and canonical answers to open
  questions.
- [`RivalTerritory-TDD.md`](../v0.2-rival-territory/RivalTerritory-TDD.md): current engine,
  targeting, territory, rival, event, persistence, harness, and deployment architecture.
- [`DistrictZero-TDD.md`](../v0.1-district-zero/DistrictZero-TDD.md): original pressure
  loop and deterministic simulation architecture.
- [`Layer1.md`](../../foundation/Layer1.md): long-term product identity and simulation
  philosophy.

When these documents differ, `v0.3A.md` is canonical for v0.3 mechanical behavior.

## Goals

- Replace fixed starting operatives with a deterministic seeded roster.
- Add a visible deterministic hire pool.
- Include ten authored operatives with recognizable strategic identities.
- Preserve role coverage in every starting roster.
- Allow at most one rare operative in a starting roster.
- Keep a maximum active roster size of five.
- Make `Recruit Operative` target a specific hire candidate.
- Separate static operative definitions from mutable campaign state.
- Replace hardcoded operative identity branches with traits and affinities.
- Make all matching affinities stack.
- Make preview and resolution use one shared modifier pipeline.
- Add visible stress tiers with discrete risk effects.
- Keep Breaking operatives assignable.
- Track assignment history and operative condition over the run.
- Add six initial operative-specific events to the normal weekly event pool.
- Allow each signature operative event to appear at most once per run.
- Make all five harness agents roster-aware.
- Report operative usage, recruitment, stress, events, and roster outcomes.
- Preserve deterministic eight-week simulation and the existing broad balance profile.
- Extend the current Black Ledger UI without redesigning its visual structure.
- Invalidate v0.2 saves through explicit schema versioning.
- Preserve the static GitHub Pages deployment contract.

## Non-Goals

- Procedural operative generation.
- Full relationship graphs.
- Romance or liaison systems.
- Multi-stage personal quests.
- Operative leveling or skill trees.
- Inventory, equipment, or loadouts.
- Permanent death.
- Random assignment refusal.
- Firing or dismissing operatives.
- Rival recruitment or poaching.
- Roster unlock progression.
- Portrait asset production.
- Faction diplomacy.
- New city districts, venues, rivals, or win conditions.
- Replacing the existing event phase with multiple events per week.
- Migrating v0.2 run state into v0.3.
- Electron or SQLite integration.
- Backend services, authentication, cloud saves, or required telemetry.

## Architectural Direction

The dependency direction remains:

```text
Angular UI -> GameFacade -> Pure Engine
Pure Engine -> Model + Content + RNG
Persistence Adapter -> versioned serialized GameState envelope
Harness Agents -> public engine commands and selectors
GitHub Actions -> production Angular artifact -> GitHub Pages
```

Roster rules remain pure engine behavior. Angular components may display roster data and
submit operative or recruit selections, but must not calculate affinities, stress tiers,
event eligibility, or roster validity.

Static definitions and mutable state remain separate:

```text
Static operative definition:
  identity
  rarity
  role tags
  base stats
  starting loyalty/stress
  visible traits
  affinities
  stress profile
  event references
  dossier

Mutable operative state:
  loyalty
  stress
  status
  revealed traits
  hidden flags
  weeks assigned
  recent assignments
```

The same definition registry must power:

```text
new-game generation
action previews
action resolution
event eligibility
UI views
agent scoring
harness reports
save validation
```

## Recommended Source Layout

```text
src/app/engine/
  model/
    actions.ts
    operatives.ts
    traits.ts
    events.ts
    game-state.ts
  content/
    roster-operatives.ts
    roster-traits.ts
    roster-events.ts
    district-zero-actions.ts
    district-zero-tuning.ts
  roster/
    generate-roster.ts
    roster-validation.ts
    operative-modifiers.ts
    stress.ts
    assignment-history.ts
    operative-events.ts
  selectors/
    previews.ts
    targets.ts
    operatives.ts
    hire-pool.ts
  simulation/
    new-game.ts
    queue-order.ts
    resolve-action.ts
    resolve-week.ts
    resolve-event.ts
    select-weekly-event.ts
  harness/
    agents.ts
    simulation-harness.ts
```

Exact file boundaries may vary. The important boundaries are:

- Content definitions contain authored data, not mutable run state.
- Shared roster modifier functions are used by preview and resolution.
- Roster generation is independent of Angular and persistence.
- Harness agents consume legal engine options rather than reimplementing validation.

## Domain Identifiers

Use explicit identifiers for the initial curated roster:

```ts
type OperativeId =
  | 'op_mara_voss'
  | 'op_juno_hex'
  | 'op_saint_calder'
  | 'op_iris_vale'
  | 'op_knox_riven'
  | 'op_orchid_seven'
  | 'op_vant_black'
  | 'op_echo_saint'
  | 'op_rook_vale'
  | 'op_mother_neon';
```

Trait and operative-event identifiers should also be explicit unions or be safely derived
from readonly registries:

```ts
type TraitId =
  | 'trait_clean_entry'
  | 'trait_ghost_debt'
  | 'trait_brilliant_unstable'
  | 'trait_ghost_touch'
  | 'trait_silver_tongue'
  | 'trait_probably_lying'
  | 'trait_velvet_access'
  | 'trait_loud_solution'
  | 'trait_knows_the_routes'
  | 'trait_corporate_ghost'
  | 'trait_marked_asset'
  | 'trait_soft_extraction'
  | 'trait_unclean_hands'
  | 'trait_knows_the_desk'
  | 'trait_public_face'
  | 'trait_everyone_owes_her'
  | 'trait_old_debts';
```

Do not use arbitrary operative ID strings in core engine APIs after this migration.

## Static Operative Models

```ts
type OperativeRarity = 'common' | 'uncommon' | 'rare';

type OperativeRoleTag =
  | 'intel'
  | 'social'
  | 'violence'
  | 'tech'
  | 'heat_control'
  | 'money'
  | 'ruin'
  | 'stability'
  | 'rival_pressure'
  | 'recruitment';

type OperativeStats = {
  violence: number;
  charm: number;
  tech: number;
  subtlety: number;
};

type StressProfile = {
  stressGainModifier: number;
  breakingEventIds: EventId[];
};

type OperativeDefinition = {
  id: OperativeId;
  name: string;
  archetype: string;
  rarity: OperativeRarity;
  roleTags: OperativeRoleTag[];
  baseStats: OperativeStats;
  startingLoyalty: number;
  startingStress: number;
  signatureTraitId: TraitId;
  liabilityTraitId?: TraitId;
  affinities: OperativeAffinity[];
  stressProfile: StressProfile;
  eventIds: EventId[];
  flavor: {
    dossier: string;
    quote?: string;
    visualTags?: string[];
  };
};
```

The registry is the only source of identity and base skill data:

```ts
const OPERATIVE_DEFINITIONS: Record<OperativeId, OperativeDefinition>;

function getOperativeDefinition(
  operativeId: OperativeId,
): OperativeDefinition | undefined;
```

The current `DISTRICT_ZERO_STARTING_OPERATIVES`,
`DISTRICT_ZERO_RECRUIT_POOL`, and identity-specific
`DISTRICT_ZERO_OPERATIVE_ACTION_MODIFIERS` structures are retired.

## Curated Roster Contract

v0.3 ships all ten operatives:

Initial authored values:

| Operative | Rarity | Violence | Charm | Tech | Subtlety | Loyalty | Stress |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mara Voss | uncommon | 35 | 58 | 45 | 82 | 72 | 18 |
| Juno Hex | uncommon | 20 | 35 | 90 | 55 | 61 | 32 |
| Saint Calder | common | 45 | 78 | 35 | 62 | 66 | 20 |
| Iris Vale | uncommon | 15 | 88 | 30 | 68 | 58 | 14 |
| Knox Riven | common | 86 | 25 | 20 | 38 | 56 | 12 |
| Orchid Seven | common | 30 | 52 | 50 | 78 | 64 | 16 |
| Vant Black | rare | 28 | 48 | 84 | 70 | 54 | 28 |
| Echo Saint | uncommon | 12 | 64 | 76 | 58 | 62 | 22 |
| Rook Vale | common | 42 | 74 | 30 | 52 | 70 | 14 |
| Mother Neon | rare | 25 | 90 | 44 | 66 | 78 | 18 |

Initial role and mechanical identity contracts:

| Operative | Role tags | Signature | Liability | Minimum mechanical anchor |
| --- | --- | --- | --- | --- |
| Mara Voss | intel, heat_control, stability | Clean Entry | Ghost Debt | Gather Intel lowers Heat and risk; nightlife adds Intel |
| Juno Hex | intel, tech, ruin | Brilliant, Unstable | Ghost Touch | Gather Intel and memory targets add Intel, Stress, and Ruin |
| Saint Calder | social, heat_control, money | Silver Tongue | Probably Lying | Bribes cost less; influence produces more Dominion |
| Iris Vale | social, recruitment, rival_pressure | Velvet Access | none | Nightlife/social work improves Intel and risk; Nyx work creates extra leverage and attention |
| Knox Riven | violence, money | Loud Solution | none | Violent work produces more Resources/Dominion and more Heat |
| Orchid Seven | intel, money, stability | Knows the Routes | none | Black-market/smuggling work improves Resources or Intel with lower Heat |
| Vant Black | tech, heat_control, intel | Corporate Ghost | Marked Asset | Technical/industrial work improves Intel and risk; stress worsens corporate-event exposure |
| Echo Saint | ruin, tech, stability | Soft Extraction | Unclean Hands | Lay Low and memory work reduce Stress or Ruin at an Intel/Heat tradeoff |
| Rook Vale | social, heat_control, stability | Knows the Desk | Public Face | Bribes cost less and Expand Influence adds district Control; high Local Heat worsens exposure |
| Mother Neon | social, stability, recruitment | Everyone Owes Her | Old Debts | Recruiting her protects Loyalty and costs less, but adds Ruin; later recovery is unusually strong |

These values and anchors are content constants and initial balance inputs. Trait and
affinity definitions may divide an anchor into multiple modifiers, but the resulting
player-visible behavior must preserve the table.

Additional content constraints:

- Values are authored per operative, not derived from rarity.
- No operative starts at Unstable or Breaking.
- Juno starts with higher Stress than the roster median.
- Mara, Rook, and Mother Neon begin with above-median Loyalty.
- Rare status does not imply universally better base stats.
- Every operative has one visible signature trait.
- Every operative may have at most one visible mechanical liability.

Balance passes may tune numeric modifiers or starting Loyalty/Stress without changing
the model. Any such changes must update this table and the content tests.

Initial modifier values:

| Operative | Context | Initial modifier |
| --- | --- | --- |
| Mara Voss | Gather Intel | Heat -1, risk -3 |
| Mara Voss | Nightlife target | Intel +2, risk -1 |
| Juno Hex | Gather Intel | Intel +3, Ruin +1 |
| Juno Hex | Memory target | Intel +4, Ruin +2, Stress +4 |
| Saint Calder | Bribe Official | Resource cost -300 |
| Saint Calder | Expand Influence | Dominion +3 |
| Iris Vale | Nightlife or social target | Intel +2, risk -2 |
| Iris Vale | Nyx or Nyx-controlled target | Dominion +1, rival Pressure +2 |
| Knox Riven | Run a Small Job | Resources +400, Dominion +2, Heat +3 |
| Knox Riven | Violence target | Resources +300, Heat +2 |
| Orchid Seven | Ghostline Market or smuggling target | Resources +300, Intel +2, Heat -1 |
| Vant Black | Gather Intel | Intel +3, risk -2 |
| Vant Black | Industrial target | Heat -1, risk -2 |
| Echo Saint | Lay Low | Ruin -2, Stress -4 |
| Echo Saint | Memory target | Intel +2, Ruin -1, Stress -2 |
| Rook Vale | Bribe Official | Resource cost -300 |
| Rook Vale | Expand Influence | District Control +2 |
| Rook Vale | Target Local Heat at 60+ | Heat +2, risk +3 |
| Mother Neon | Recruit Mother Neon | Resource cost -300, Loyalty +6, Ruin +2 |
| Mother Neon | Lay Low | Loyalty +2, Stress -2 |

Where multiple rows match, all modifiers stack. A modifier may introduce a pressure not
present in the base action because that change is part of the operative's authored
identity. Territory and venue modifiers retain their existing rule of modifying only
pressures already present after operative modifiers.

## Mutable Operative State

```ts
type OperativeStatus = 'available' | 'assigned' | 'idle' | 'injured';

type RecentAssignment = {
  id: string;
  week: number;
  actionId: ActionId;
  target?: ActionTarget;
  targetTags: string[];
  complication: boolean;
  stressDelta: number;
};

type OperativeState = {
  id: OperativeId;
  loyalty: number;
  stress: number;
  status: OperativeStatus;
  revealedTraits: TraitId[];
  hiddenFlags: Record<string, boolean | number | string>;
  weeksAssigned: number;
  recentAssignments: RecentAssignment[];
};
```

`GameState.operatives` becomes `OperativeState[]`. Base stats, archetype, role tags,
rarity, and dossier are selected from the static registry.

`compromised` is removed as the automatic 80-Stress state. Existing future-facing
`injured` support may remain in the model, but v0.3 does not introduce injury mechanics.

At new-game initialization:

```text
loyalty = definition.startingLoyalty
stress = definition.startingStress
status = available
revealedTraits = signature + liability, when present
hiddenFlags = {}
weeksAssigned = 0
recentAssignments = []
```

Mechanical liabilities are immediately visible through `revealedTraits`. Event trigger
formulas and counters remain in engine definitions or `hiddenFlags`, never in normal UI
view models.

## Game State Changes

```ts
type GameState = {
  // existing fields
  schemaVersion: 3;
  operatives: OperativeState[];
  hirePool: OperativeId[];
  seenSignatureEventIds: EventId[];
};
```

Remove:

```ts
recruitPool: RecruitCandidate[];
```

The hire pool stores IDs only. Candidate identity is resolved from the static operative
registry.

`seenSignatureEventIds` records an operative event when it is presented, not only after a
choice is resolved. This prevents reloads or interrupted event choices from making the
event eligible a second time.

## Roster Generation

Configuration:

```ts
type RosterGenerationConfig = {
  startingRosterSize: 3;
  hirePoolSize: 4;
  maxStartingRares: 1;
  rarityWeights: Record<OperativeRarity, number>;
};

type GeneratedRoster = {
  startingOperativeIds: OperativeId[];
  hirePoolIds: OperativeId[];
  rngCursor: number;
};
```

Initial rarity weights:

```ts
const RARITY_WEIGHTS = {
  common: 6,
  uncommon: 3,
  rare: 1,
} as const;
```

These weights affect selection frequency. They do not alter operative mechanics.

### Required starting coverage

Every starting roster must cover all three groups:

```ts
const REQUIRED_STARTING_TAG_GROUPS: readonly OperativeRoleTag[][] = [
  ['intel', 'tech'],
  ['social', 'heat_control'],
  ['violence', 'money', 'stability'],
];
```

A group is covered when at least one selected operative has at least one tag in that
group. One operative may cover multiple groups.

Additional validity rules:

- Exactly three unique starting operatives.
- At most one starting rare.
- At least one operative with `intel`, `tech`, or a tested Intel affinity.
- At least one operative capable of reducing Heat or improving a Heat-reducing action.
- Starting and hire pools do not overlap.

### Deterministic algorithm

Use the existing seeded RNG.

```text
1. Normalize the run seed.
2. Create an RNG at cursor 0.
3. Produce one weighted ordering of all definitions without replacement.
4. Evaluate three-operative combinations in deterministic candidate order.
5. Select the first combination satisfying all roster rules.
6. Read the next four non-selected IDs from the existing weighted order.
7. Use those IDs as the hire pool.
8. Return the advanced RNG cursor with both pools.
```

The generator must not use `Math.random`, object-property iteration order, or retry loops
with an unbounded failure mode.

If no weighted candidate combination validates, use a deterministic exhaustive
combination search over definitions sorted by ID. Throw a descriptive content error only
if the registry itself cannot produce a valid roster.

The new game stores the returned RNG cursor before any weekly event selection. The same
seed must always produce the same starting roster, hire pool, and subsequent simulation.

## New Game Initialization

`newGame()` becomes:

```text
1. Normalize seed.
2. Generate starting roster and hire pool.
3. Materialize OperativeState for starting IDs.
4. Store hire-pool IDs.
5. Initialize districts, rivals, pressures, and logs.
6. Set schemaVersion to 3.
7. Set rngCursor to the roster generator's returned cursor.
8. Enter COMMAND phase.
```

Starting roster size remains three. Hire pool size remains four. The active roster cap
remains five.

## Recruit Target

Extend `ActionTarget`:

```ts
type ActionTarget =
  | { type: 'district'; id: DistrictId }
  | { type: 'venue'; id: VenueId }
  | { type: 'rival'; id: RivalId }
  | { type: 'recruit'; id: OperativeId };
```

`Recruit Operative` becomes:

```ts
{
  id: 'recruit_operative',
  commandCost: 1,
  resourceCost: 1600,
  effects: {
    loyalty: -4,
    dominion: 3,
  },
  assignment: 'none',
  requiresTarget: true,
  allowedTargetTypes: ['recruit'],
}
```

District and venue targets are removed from this action.

Recruit target options are the current `GameState.hirePool` in stable pool order.

Each option exposes:

```ts
type RecruitTargetOption = {
  target: { type: 'recruit'; id: OperativeId };
  label: string;
  operativeId: OperativeId;
  archetype: string;
  rarity: OperativeRarity;
  roleTags: OperativeRoleTag[];
};
```

Recruit targets:

- Have no district.
- Have no rival controller.
- Do not change district Control or Local Heat.
- Do not create rival pressure.
- Do not contribute territory tags to recent activity.

They may use synthetic reporting tags such as `recruit`, rarity, and role tags, but those
tags must not influence city event weighting unless explicitly introduced later.

## Recruit Validation

Recruitment is unavailable when:

- No recruit target is selected.
- The target ID is not currently in the hire pool.
- The active roster plus already queued recruit orders would exceed five.
- The same candidate is already targeted by another queued recruit order.
- The action cost or Command cost cannot be paid under existing validation.

Add unavailable reasons:

```ts
type QueueOrderUnavailableReason =
  | ExistingReasons
  | 'recruit_not_in_hire_pool'
  | 'recruit_already_queued'
  | 'roster_full';
```

Resolution removes the selected ID from `hirePool` and materializes that operative from
its definition. Recruitment must never take the first pool entry implicitly.

If a queued recruit target becomes invalid before resolution, resolution should fail
closed with a diagnostic rather than recruit a different candidate. Normal engine flow
should prevent this state through queue validation.

No replacement candidate is generated after recruitment.

## Operative Affinities

```ts
type OperativeAffinity = {
  id: string;
  actionId?: ActionId;
  targetTag?: string;
  districtId?: DistrictId;
  districtTag?: string;
  rivalId?: RivalId;
  effects?: PressureDelta;
  riskModifier?: number;
  stressModifier?: number;
  rivalPressureModifier?: number;
};
```

An affinity matches when every condition defined on that affinity matches the action
context. Omitted conditions are ignored. A district condition applies to both direct
district targets and venues inside that district.

Examples:

```text
actionId only:
  applies to that action at any target

targetTag only:
  applies to any action at a target with that tag

actionId + targetTag:
  applies only when both match

rivalId:
  applies when the selected target is the rival or is controlled by that rival
```

All matching affinities stack additively.

Affinity IDs are required for previews, diagnostics, logs, and tests. Do not infer UI
labels by serializing condition objects.

## Trait Model

Traits are data-driven and visible:

```ts
type TraitKind = 'signature' | 'liability' | 'stress' | 'hidden';

type ModifierCondition = {
  actionIds?: ActionId[];
  targetTags?: string[];
  rivalIds?: RivalId[];
  minLocalHeat?: number;
  minStressTier?: StressTier;
  maxStressTier?: StressTier;
  minPressure?: Partial<Record<PressureId, number>>;
  maxPressure?: Partial<Record<PressureId, number>>;
};

type TraitModifier = {
  id: string;
  condition: ModifierCondition;
  effects?: PressureDelta;
  resourceCostModifier?: number;
  riskModifier?: number;
  stressModifier?: number;
  rivalPressureModifier?: number;
  districtControlModifier?: number;
};

type TraitDefinition = {
  id: TraitId;
  name: string;
  kind: TraitKind;
  description: string;
  modifiers: TraitModifier[];
};
```

Within `ModifierCondition`, array fields use "any listed value matches" semantics. The
different fields combine with AND semantics. For example, `actionIds` plus `targetTags`
requires a matching action and at least one matching target tag.

The normal UI displays trait name and description. It may display matched modifier
summaries for the currently previewed action.

The engine must not contain branches such as:

```ts
if (operative.id === 'op_juno_hex') {
  // ...
}
```

Identity-specific behavior belongs in trait, affinity, or event definitions.

## Shared Operative Modifier Pipeline

Create one pure calculation entry point:

```ts
type OperativeActionContext = {
  state: GameState;
  action: ActionDefinition;
  operative?: OperativeState;
  recruitTargetDefinition?: OperativeDefinition;
  target?: ActionTarget;
};

type OperativeModifierResult = {
  effects: PressureDelta;
  resourceCostModifier: number;
  riskModifier: number;
  stressModifier: number;
  rivalPressureModifier: number;
  districtControlModifier: number;
  appliedSources: AppliedModifierSource[];
};

function calculateOperativeModifiers(
  context: OperativeActionContext,
): OperativeModifierResult;
```

For normal actions, modifiers come from the assigned operative. For `Recruit Operative`,
the selected candidate definition may contribute modifiers explicitly conditioned on
the recruit action. This supports authored recruitment consequences such as Mother
Neon's reduced cost and Old Debts liability without bypassing the normal preview and
resolution pipeline.

`appliedSources` contains player-safe explanations:

```ts
type AppliedModifierSource = {
  sourceType: 'trait' | 'affinity';
  sourceId: string;
  label: string;
  effects?: PressureDelta;
  riskModifier?: number;
  stressModifier?: number;
  resourceCostModifier?: number;
};
```

Do not include hidden event triggers or secret counters in this result.

## Canonical Effect Order

The canonical action pipeline is:

```text
1. Base action effects and resource cost.
2. Visible operative trait modifiers.
3. All matching operative affinity modifiers.
4. District modifiers.
5. Venue modifiers.
6. Normalize the projected pressure delta.
7. Calculate risk from the same context and applied sources.
8. Roll complication.
9. Apply complication delta.
10. Apply final pressure effects and resource cost.
11. Apply operative stress.
12. Update assignment history.
13. Apply district Control and Local Heat.
14. Apply rival pressure.
15. Append logs and diagnostics.
```

This order replaces the identity-specific action modifier map. Preview and resolution
must call the same steps through shared pure functions. Random complication effects are
the only allowed difference between preview and a clean resolution.

## Risk Calculation

Risk remains clamped to `3..45`.

```text
risk =
  base action risk
  + operative skill adjustment
  + operative loyalty adjustment
  + stress tier modifier
  + trait risk modifiers
  + affinity risk modifiers
  + local district heat adjustment
  - local district control adjustment
```

Preserve the current skill and Loyalty calculations unless tuning requires an explicit
balance change:

```ts
risk -= Math.floor((relevantSkill - 50) / 4);
risk -= Math.floor(loyalty / 20);
```

Remove:

```ts
risk += Math.floor(stress / 10);

if (stress >= 60) {
  risk += 10;
}
```

Replace it with:

```ts
function stressRiskModifier(stress: number): number {
  if (stress < 40) return 0;
  if (stress < 60) return 2;
  if (stress < 80) return 5;
  return 10;
}
```

The action preview displays the final risk and may show the operative contribution:

```text
Base risk
Skill fit
Loyalty
Stress tier
Trait/affinity modifiers
Territory modifiers
Final risk
```

The normal card does not need to expose the full arithmetic. The selected-operative
explanation and debug view should make the contributing sources inspectable.

## Stress Tiers

```ts
type StressTier = 'stable' | 'strained' | 'unstable' | 'breaking';

function getStressTier(stress: number): StressTier {
  if (stress < 40) return 'stable';
  if (stress < 60) return 'strained';
  if (stress < 80) return 'unstable';
  return 'breaking';
}
```

Mechanical behavior:

| Tier | Range | Risk modifier | Event behavior |
| --- | ---: | ---: | --- |
| Stable | 0-39 | +0 | Normal eligibility |
| Strained | 40-59 | +2 | Normal eligibility |
| Unstable | 60-79 | +5 | Eligible for stress events |
| Breaking | 80-100 | +10 | Eligible for severe operative events |

Breaking operatives remain selectable and assignable. Do not mark them unavailable,
compromised, or refusing solely because of Stress.

UI warning states may use stronger color and copy at Unstable and Breaking, but the
assignment remains a player decision.

## Stress Changes and Recovery

Preserve the current base stress behavior:

```text
Normal assignment: existing normal stress gain
Dangerous assignment: existing dangerous stress gain
Lay Low assignment: -8 Stress
Idle operative: -2 Stress/week
```

Calculate assignment Stress as:

```text
base action stress
+ definition stress profile modifier
+ matching trait stress modifiers
+ matching affinity stress modifiers
+ complication stress, when applicable
```

Clamp Stress to `0..100`.

Optional Loyalty/Heat recovery modifiers from the vision are excluded from the initial
implementation. Add them only during balancing if the simpler model cannot meet event
frequency and stress-tier goals.

After resolution, assigned operatives return to `available` regardless of Stress.

## Assignment History

After every resolved assigned order:

```text
increment weeksAssigned once per week in which the operative was assigned
append one RecentAssignment entry per resolved order
record action, target, target tags, complication, and final stress delta
```

An operative cannot be assigned to multiple queued orders in one week under the current
queue rules, but `weeksAssigned` should still be calculated by unique week rather than by
assuming that constraint.

Keep assignments from the current and previous two weeks:

```ts
assignment.week >= currentWeek - 2
```

This history powers:

- Operative-event eligibility.
- UI recent-assignment summaries.
- Agent context.
- Harness usage reporting.

Long-term run statistics belong in harness accumulators, not unbounded `GameState`
history.

## Operative-Specific Events

v0.3 adds six initial signature events:

```text
event_mara_ghost_debt
event_juno_static_in_her_voice
event_saint_lie_comes_due
event_knox_blood_applause
event_iris_velvet_access
event_orchid_route_memory
```

The first implementation uses the choices and broad trigger conditions defined in
`v0.3.md`. Exact weights and numeric effects remain authored content constants and may be
tuned through the harness.

The four newly added operatives may ship without signature events in v0.3. Their traits,
affinities, liabilities, and roster effects must still establish distinct identities.

## Operative Event Model

Extend event definitions without creating a second event system:

```ts
type OperativeEventPredicate =
  | { type: 'operative_stress_at_least'; amount: number }
  | { type: 'operative_loyalty_at_most'; amount: number }
  | { type: 'operative_assigned_within_weeks'; weeks: number }
  | { type: 'operative_assignment_count'; count: number; actionId?: ActionId }
  | { type: 'recent_assignment_tag'; tag: string; count?: number }
  | { type: 'global_pressure_at_least'; pressure: PressureId; amount: number }
  | { type: 'global_pressure_at_most'; pressure: PressureId; amount: number }
  | { type: 'rival_pressure_at_least'; rivalId: RivalId; amount: number };

type OperativeEventTrigger = {
  mode: 'all' | 'any';
  predicates: OperativeEventPredicate[];
};

type OperativeEventDefinition = EventDefinition & {
  kind: 'operative';
  operativeId: OperativeId;
  trigger: OperativeEventTrigger;
  severeAtBreaking?: boolean;
};
```

Existing city events receive:

```ts
kind: 'city';
```

The event registry may expose a common union:

```ts
type AnyEventDefinition = CityEventDefinition | OperativeEventDefinition;
```

## Operative Event Eligibility

An operative event is eligible only when:

- Its operative is in the active roster.
- Its event ID is not in `seenSignatureEventIds`.
- Its trigger evaluates true.
- Any existing event-specific weight rule also evaluates true.

Hire candidates cannot trigger events.

Event eligibility must be a pure selector:

```ts
function isOperativeEventEligible(
  state: GameState,
  event: OperativeEventDefinition,
): boolean;
```

Specific trigger formulas remain absent from normal UI. Visible liability descriptions
should qualitatively warn the player about the relevant risk.

## Weekly Event Selection

There remains exactly one weekly event.

```text
1. Calculate eligible city/rival/location events.
2. Calculate eligible operative events.
3. Apply all normal weighting and recent-event penalties.
4. Select one event using the current seeded RNG cursor.
5. If it is an operative event, add its ID to seenSignatureEventIds.
6. Present the event through the existing EVENT_CHOICE phase.
```

Operative events compete in the same weighted pool. They are not guaranteed merely
because they become eligible.

Initial operative-event base weights should target an operative event in 25-45% of
complete runs. No event may have a weight so high that becoming eligible makes it
effectively guaranteed.

Event diagnostics add:

```ts
type EventWeightModifierId =
  | ExistingModifierIds
  | 'operative_eligible'
  | 'operative_stress'
  | 'operative_recent_assignment';
```

Reports should distinguish eligibility from actual selection.

## Operative Event Choice Effects

Extend event choices:

```ts
type OperativeStateDelta = {
  loyalty?: number;
  stress?: number;
  status?: OperativeStatus;
  hiddenFlags?: Record<string, boolean | number | string>;
};

type EventChoiceDefinition = {
  // existing fields
  operativeEffects?: OperativeStateDelta;
  rivalPressure?: Partial<Record<RivalId, number>>;
};
```

For an operative event, `operativeEffects` apply to the event definition's operative.
City events may use an explicit target operative ID only if a future generic event
requires it; that is not necessary for v0.3.

Resolution order:

```text
1. Validate and pay choice cost.
2. Apply global pressure effects.
3. Apply operative loyalty/stress/status/hidden-flag effects.
4. Apply rival-pressure effects.
5. Record choice flags.
6. Append player-facing log entries.
7. Check win/loss.
8. Advance to the next week when the run continues.
```

Clamp operative Loyalty and Stress to `0..100`. Operative Loyalty does not independently
remove an operative or end the run in v0.3.

## Canonical Week Resolution

The v0.3 week order is:

```text
1. Validate and queue orders with operative and target.
2. Player advances the week.
3. Resolve each queued order in order:
   a. base action effects
   b. operative traits
   c. operative affinities
   d. district and venue modifiers
   e. risk calculation
   f. complication
   g. global effects and cost
   h. operative stress and assignment history
   i. district Control and Local Heat
   j. rival pressure
   k. logs and diagnostics
4. Apply idle operative stress recovery.
5. Prune operative assignment history.
6. Apply global weekly drift.
7. Cool local district heat.
8. Apply passive rival effects.
9. Prune global recent activity.
10. Build the combined city and operative event pool.
11. Select and present exactly one weekly event.
12. Player resolves one event choice.
13. Apply global, operative, rival, and flag effects.
14. Check win/loss.
15. Increment the week if the run continues.
```

Loss conditions continue to take precedence when victory and loss thresholds are crossed
simultaneously.

## Action Preview

Extend the current preview:

```ts
type ActionPreview = {
  // existing fields
  selectedOperative?: OperativeAssignmentPreview;
};

type OperativeAssignmentPreview = {
  operativeId: OperativeId;
  name: string;
  relevantSkill?: OperativeSkill;
  relevantSkillValue?: number;
  stress: number;
  stressTier: StressTier;
  projectedStress: number;
  projectedStressTier: StressTier;
  appliedSources: AppliedModifierSource[];
};
```

The preview must include:

- Final effects after all matching traits and affinities.
- Final resource cost.
- Final risk.
- Current and projected Stress tier.
- Player-safe explanations for matched traits and affinities.
- Recruit candidate identity when the action targets a hire.

Preview must not expose:

- Exact operative-event trigger formulas.
- Hidden flags.
- Secret counters.
- Future event selection weights.

## Operative Selectors

Add pure selectors:

```ts
function selectRosterViews(state: GameState): OperativeRosterView[];
function selectOperativeDetail(
  state: GameState,
  operativeId: OperativeId,
): OperativeDetailView | undefined;
function selectHirePoolViews(state: GameState): HireCandidateView[];
function selectAssignmentOptions(
  state: GameState,
  actionId: ActionId,
  target?: ActionTarget,
): OperativeAssignmentOption[];
```

Roster view:

```ts
type OperativeRosterView = {
  id: OperativeId;
  name: string;
  archetype: string;
  rarity: OperativeRarity;
  roleTags: OperativeRoleTag[];
  loyalty: number;
  stress: number;
  stressTier: StressTier;
  status: OperativeStatus;
  signatureTrait: TraitView;
  liabilityTrait?: TraitView;
};
```

Detail view additionally contains:

```text
dossier
quote
all four base stats
affinity descriptions
recent assignments
projected or current stress explanation
```

Hire candidate view contains:

```text
identity
rarity
role tags
base stats
starting Loyalty and Stress
visible signature/liability summaries
recruit cost
whether the candidate is currently recruitable
```

## Angular State and Facade

The facade adds:

```ts
readonly roster = computed(() => selectRosterViews(this.stateSignal()));
readonly hirePool = computed(() => selectHirePoolViews(this.stateSignal()));
readonly selectedOperativeDetail = computed(...);
readonly compatibilityNotice = signal<string | undefined>(...);

selectOperative(operativeId: OperativeId | undefined): void;
getOperativeDetail(operativeId: OperativeId): OperativeDetailView | undefined;
```

Candidate targeting continues through the existing target option and queue APIs. Do not
add a direct `recruit()` facade method that bypasses the Command system.

## UI Changes

v0.3 extends the current dashboard.

### Release identity

Update the release eyebrow from:

```text
Rival Territory
```

to:

```text
The Roster
```

### Roster panel

Replace the current raw operative cards with roster views showing:

```text
name
archetype
rarity
role tags
Loyalty
Stress number and tier
status
signature trait
visible liability
```

Stress tiers use distinct but restrained warning states. Breaking must look dangerous
without looking disabled.

Selecting a roster entry opens an operative detail surface. Use an accessible dialog or
side drawer rather than expanding every card and destabilizing the dashboard grid.

### Operative detail

The detail surface shows:

```text
dossier
stats
role tags
visible traits and liabilities
affinities
recent assignments
current Stress tier and consequences
```

It closes through an explicit close control, Escape, and backdrop interaction where
appropriate.

### Hire pool

Add a persistent hire-pool section beneath the active roster or within the operative
column.

Candidates are visible from the start. They are not buttons that recruit outside the
Command loop. Selecting a candidate may open the same detail surface in candidate mode.

When a candidate is recruited:

- Remove the candidate from the hire-pool section.
- Add the operative to the active roster.
- Preserve the remaining pool order.

When the roster reaches five:

- Keep remaining candidates visible for run context.
- Mark recruitment unavailable.
- Explain that the roster is full.

### Action assignment

Keep the assignment control compact. After an operative is selected, show an explanation
strip containing only matched, player-visible information:

```text
Mara Voss
Stable -> Stable
Clean Entry: -1 Heat, -3 Risk
Nightlife affinity: +2 Intel, -1 Risk
```

Do not attempt to place multi-line modifier explanations inside native `<option>`
elements.

### Recruit action

The Recruit target control lists only hire candidates.

The selected candidate preview should show:

```text
name
rarity
role tags
resulting roster count
```

The full candidate dossier remains available in the hire-pool detail surface.

### Field Guide

Extend the guide with:

- Starting roster and hire-pool assembly.
- Rarity as appearance frequency, not raw power.
- Role tags.
- Stress tiers and risk effects.
- Breaking operatives remaining assignable.
- Visible traits, liabilities, and affinity previews.
- Recruitment consuming a normal queued order.

Do not document exact event trigger formulas.

### Debug panel

Retain the hidden `Ctrl+Shift+D` / `Cmd+Shift+D` toggle.

Add:

```text
generated starting roster IDs
hire-pool IDs
operative mutable state
recent assignments
matched modifier sources
eligible operative events and weights
seen signature event IDs
save schema version
```

## Persistence

Introduce a versioned envelope:

```ts
const CURRENT_SAVE_SCHEMA_VERSION = 3;
const CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.3:current-run';
const LEGACY_V02_STORAGE_KEY = 'haunted-apex:v0.2:current-run';

type StoredRunEnvelope = {
  schemaVersion: 3;
  gameVersion: '0.3.0';
  savedAt: string;
  state: GameState;
};
```

`GameState.schemaVersion` and envelope `schemaVersion` must agree.

Loading returns a discriminated result:

```ts
type LoadCurrentRunResult =
  | { status: 'loaded'; state: GameState }
  | { status: 'empty' }
  | { status: 'incompatible'; foundVersion?: number }
  | { status: 'invalid' };
```

Load behavior:

```text
1. Check the v0.3 key.
2. If present, parse and validate the envelope and state.
3. If invalid or wrong-version, clear it and return incompatible/invalid.
4. If no v0.3 save exists but the v0.2 key exists, remove the v0.2 key and return incompatible.
5. The facade creates a new v0.3 run after incompatible or invalid load.
6. Expose a one-time compatibility notice to the UI.
```

Compatibility copy:

```text
This save was created with an older prototype version and is not compatible with
v0.3.0 - The Roster. A new run has been started with the updated roster system.
```

The message must not block play and should be dismissible.

Validation must confirm:

- Schema version.
- All operative and hire-pool IDs exist in the static registry.
- Active and hire-pool IDs are unique and disjoint.
- Active roster size is `1..5`.
- Hire pool size is `0..4`.
- Operative mutable fields and assignment histories are valid.
- Queued recruit targets still exist in the hire pool.
- Seen signature event IDs exist in the event registry.
- Existing district, rival, pressure, queue, and recent-activity contracts remain valid.

No v0.2-to-v0.3 state migration is implemented.

## Deployment and Release Metadata

GitHub Pages remains the public runtime for v0.3.

Preserve:

```text
production base href: /haunted-apex/
artifact: dist/haunted-apex/browser
deployment trigger: tested push to main
runtime dependencies: static files and browser-local storage only
```

Update:

```text
package.json version: 0.3.0
package-lock.json version: 0.3.0
release eyebrow: The Roster
release tag: v0.3.0
```

The README continues linking to the same Pages URL. No route, backend, secret, or hosting
change is required.

The deployment workflow must continue running tests before building and uploading the
artifact. The release tag should be created only after the deployed build passes a
manual smoke test covering roster generation, one recruitment, save/reload, and a
complete run.

## Harness Agent Updates

All agents continue selecting from fully legal action-operative-target combinations.

Legal order generation must include:

- Every available operative assignment.
- Every legal district, venue, rival, and recruit target.
- Shared previews containing stress and modifier explanations.

### RandomBot

- Select a random legal order option.
- Recruit random candidates at the same rate implied by random legal selection.
- Select random legal event choices.

### CautiousBot

- Prefer Stable and Strained operatives.
- Penalize projected Unstable and Breaking assignments.
- Prefer heat-control, stability, and low-risk affinities.
- Use Lay Low with highly stressed operatives.
- Recruit when the roster lacks Heat control or current operatives are highly stressed.
- Continue favoring survival over Dominion.

### AggressiveBot

- Prefer Dominion, violence, money, and Control outcomes.
- Prefer operatives whose traits or affinities improve those outcomes.
- Ignore moderate Stress.
- Penalize Breaking only when the projected move cannot materially advance victory.
- Recruit violence or money specialists when affordable.

### GreedyBot

- Prefer Resources and Intel.
- Prefer money, violence, and lucrative venue affinities.
- Recruit candidates with strong economic value when the cost does not create immediate
  bankruptcy.
- Continue using the existing Heat and cash-reserve brakes.

### OperatorBot

Score:

```text
survival margin
Dominion progress
final action risk
operative relevant skill
operative stress and projected tier
matched trait/affinity value
current role coverage
candidate role-gap value
recruit cost and roster capacity
rival/territory consequences
```

Operator recruits when:

- A candidate fills a missing useful role.
- A candidate directly addresses the current worst pressure.
- Existing suitable operatives are Unstable or Breaking.
- Recruitment does not create a projected loss.

No agent may inspect hidden event triggers or secret flags. Agents use the same
player-visible definitions and previews available to the UI.

## Harness Run Data

Extend each run result:

```ts
type OperativeRunStats = {
  operativeId: OperativeId;
  started: boolean;
  recruited: boolean;
  hirePoolPresent: boolean;
  assignments: number;
  complications: number;
  finalStress?: number;
  highestStress?: number;
  finalStressTier?: StressTier;
  heatContribution: number;
  ruinContribution: number;
  eventEligibleCount: number;
  eventSelectedCount: number;
};

type HarnessRunResult = {
  // existing fields
  startingRosterIds: OperativeId[];
  initialHirePoolIds: OperativeId[];
  operativeStats: Record<OperativeId, OperativeRunStats>;
};
```

Track the original generated pools before recruitment mutates state.

Heat and Ruin contribution are attribution diagnostics based on resolved assigned action
deltas and operative-event choices. They are not new gameplay state.

## Harness Reporting

Preserve all current CSV sections and add:

```text
roster_compositions
operative_presence
operative_recruitment
operative_usage
operative_stress
operative_danger
operative_events
hire_pool_selection
```

Recommended columns:

```text
roster_compositions
agent,rosterKey,runs,wins,losses,winRate,avgWeeks

operative_presence
agent,operativeId,operativeName,presentRuns,wins,losses,winRate

operative_recruitment
agent,operativeId,operativeName,availableRuns,recruitedRuns,recruitRate,wins,losses

operative_usage
agent,operativeId,operativeName,assignments,avgAssignments,complications,complicationRate

operative_stress
agent,operativeId,operativeName,avgFinalStress,avgHighestStress,strainedRuns,unstableRuns,breakingRuns

operative_danger
agent,operativeId,operativeName,avgHeatContribution,avgRuinContribution

operative_events
agent,eventId,operativeId,eligibleRuns,selections,selectionRate

hire_pool_selection
agent,operativeId,operativeName,poolAppearances,recruits,selectionRate
```

Roster keys use sorted operative IDs joined by `+` so equivalent compositions aggregate
regardless of generation order.

Reports with small samples remain diagnostic. The balance pass should run enough seeds to
produce meaningful per-roster and per-operative counts.

## Logging and Diagnostics

Player-facing logs add:

- Recruited operative name.
- Assigned operative Stress change and resulting tier when it changes tier.
- Trait or affinity summary when it materially changes an outcome.
- Operative-event presentation and choice consequences.

Avoid flooding the normal event feed with every arithmetic source. Detailed applied
sources remain in previews and debug diagnostics.

Engine diagnostics should make these inspectable:

```text
roster generation candidate order
roster validation result
applied trait IDs
applied affinity IDs
stress modifier and tier
operative-event eligibility predicates
event weights
recruit target validation
```

## Testing Strategy

### Content tests

- Exactly ten operative definitions exist.
- Every operative ID is unique.
- All rarity, role-tag, trait, affinity, and event references are valid.
- Mother Neon is rare, not legendary.
- All visible trait descriptions are non-empty.
- Every operative has one signature trait and at most one liability.
- Starting Loyalty and Stress are in range.
- No operative starts Unstable or Breaking.

### Roster generation tests

- Generation is deterministic by seed.
- Starting roster size is three.
- Hire pool size is four.
- Pools contain unique IDs and do not overlap.
- Every starting roster covers all required tag groups.
- At most one rare starts.
- Additional rares may appear in the hire pool.
- Common operatives appear more often than rare operatives across a large deterministic
  seed sample.
- Generator advances and returns RNG cursor.
- Invalid registry coverage fails with a descriptive error.

### Recruitment tests

- Recruit requires a recruit target.
- Only current hire candidates are legal targets.
- District, venue, and rival targets are illegal for Recruit.
- Selected candidate, not first candidate, joins the roster.
- Recruited candidate is removed from the hire pool.
- No replacement candidate appears.
- Duplicate candidate recruitment cannot be queued.
- Roster cap includes queued recruit orders.
- Recruit does not change territory or rival pressure.

### Modifier tests

- Matching trait modifiers apply.
- Matching affinities apply.
- Multiple matching affinities stack.
- Combined action and target conditions require both matches.
- Rival affinity applies to direct and controlled-property targets.
- Non-matching modifiers do not apply.
- Preview and clean resolution produce the same adjusted effects, cost, risk, and Stress.
- No identity-specific action map remains in use.

### Stress tests

- Tier boundaries resolve at `39/40`, `59/60`, and `79/80`.
- Risk modifiers are exactly `0/2/5/10`.
- Continuous Stress risk is removed.
- Breaking operatives remain legal assignments.
- Normal and dangerous assignments gain expected Stress.
- Lay Low and idle recovery reduce Stress.
- Stress clamps to `0..100`.
- Tier-change logs are produced only when the tier changes.

### Assignment history tests

- Resolved assignments record action, target, tags, complication, and Stress delta.
- `weeksAssigned` increments once per assigned week.
- Histories prune entries older than two weeks.
- Unassigned orders do not create operative assignment entries.

### Operative event tests

- Only active roster members can make an event eligible.
- Hire candidates cannot trigger events.
- Every predicate type evaluates correctly.
- `all` and `any` trigger modes work.
- Seen signature events cannot re-enter the pool.
- Event is marked seen when presented.
- Eligible operative events compete with city events in the same weighted pool.
- Exactly one weekly event is presented.
- Operative choice effects update the correct operative.
- Rival-pressure choice effects update the correct rival.
- Stress and Loyalty clamp after event effects.

### UI tests

- Release identity reads `The Roster`.
- Roster cards show rarity, roles, visible traits, and Stress tier.
- Breaking appears dangerous but remains assignable.
- Operative detail opens and closes accessibly.
- Hire pool is visible from the start.
- Recruit target options match the hire pool.
- Selected assignment explanation shows matched visible sources.
- Hidden triggers and flags do not appear in normal UI.
- Field Guide explains roster generation, recruitment, traits, affinities, and Stress.
- Debug panel remains hidden by default and shows roster diagnostics when toggled.

### Persistence tests

- v0.3 envelope round-trips a valid state.
- Schema mismatch is rejected.
- Legacy v0.2 key is removed and reported as incompatible.
- Invalid operative IDs are rejected.
- Duplicate or overlapping pools are rejected.
- Invalid queued recruit targets are rejected.
- Incompatible load starts a new run and exposes the compatibility notice.

### Harness tests

- Every agent completes runs across varied rosters.
- Agents produce only legal operative and recruit selections.
- Operator recruitment responds to role gaps and Stress.
- Reports contain all new operative sections.
- Composition keys aggregate independent of order.
- Event eligibility and selection counts are distinct.
- Fixed seed batches produce stable reports.

### Regression and deployment tests

- Existing district, venue, rival, event, win/loss, and target tests continue to pass.
- Package metadata reports `0.3.0`.
- Production build succeeds with base href `/haunted-apex/`.
- Generated `index.html` contains the repository-subpath base href.
- GitHub Pages workflow uploads `dist/haunted-apex/browser`.
- The deployed game can start, save, reload, recruit, and complete a run without a
  backend.

## Balance Targets

Preserve the broad v0.2 strategy profile:

```text
Operator:   55-75%
Aggressive: viable but volatile
Greedy:     viable but swingy
Cautious:   low, usually Dominion shortfall
Random:     bad but occasionally lucky
```

Roster-specific targets:

```text
No adequately sampled starting roster puts Operator below 40%.
No single operative is required for Operator success.
No candidate is recruited by Operator in nearly every appearance.
Rare operatives are exciting but not strict upgrades.
Operative-specific events appear in 25-45% of complete runs.
At least one operative reaches Strained in most runs.
Breaking occurs sometimes but not in most sane runs.
High-power operatives create identifiable Heat, Ruin, Loyalty, Stress, or cost tradeoffs.
```

Because ten operatives create many three-person combinations, do not treat tiny roster
samples as balance failures. Report sample counts and aggregate by operative presence,
role coverage, and composition.

## Acceptance Criteria

v0.3.0 is complete when:

- A new run no longer always starts with the same three operatives.
- Starting roster and hire pool are deterministic by seed.
- Exactly ten curated operatives exist.
- Every starting roster satisfies role coverage and the one-rare maximum.
- The hire pool is visible from the start.
- Recruit targets a chosen candidate and respects the five-operative cap.
- Signature traits and mechanical liabilities are visible.
- All matching affinities affect both preview and resolution.
- Stress tiers are visible and use discrete risk modifiers.
- Breaking operatives remain assignable.
- Assignment history can trigger operative events.
- At least six operative-specific events exist and at least four can be observed under
  normal deterministic test scenarios.
- Exactly one event occurs each week.
- Signature operative events occur at most once per run.
- Existing territory and rival mechanics remain functional.
- All five agents operate with varied rosters and candidate recruitment.
- Harness CSV reports operative composition, use, Stress, recruitment, danger, and
  events.
- Incompatible v0.2 saves are cleared with a visible notice.
- The Angular UI remains usable at supported desktop and mobile widths.
- Tests and production GitHub Pages build pass.

## Open Design Status

No blocking product questions remain for implementation planning.

The following are intentionally deferred:

- Additional events for Vant Black, Echo Saint, Rook Vale, and Mother Neon.
- Operative injuries, death, refusal, dismissal, or replacement.
- Relationship graphs and inter-operative affinities.
- Dynamic Loyalty consequences beyond authored events.
- Roster unlock progression and rarity changes.
- Portrait assets.
- Exact long-term ownership of operative history.
- Save migration after v0.3.

These questions must not expand v0.3 implementation unless a discovered contradiction
prevents the locked design from functioning.
