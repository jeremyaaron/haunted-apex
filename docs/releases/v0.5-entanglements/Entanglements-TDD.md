# Haunted Apex v0.5.0 Entanglements TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.5.0: Entanglements**.

District Zero established the pressure loop:

```text
Action -> Pressure Outcome
```

Rival Territory added spatial and political context:

```text
Action + Target -> Outcome + Local Change + Rival Reaction
```

The Roster made crew identity and condition matter:

```text
Action + Operative + Target -> Outcome + Stress + Personal Consequence
```

The Black Ledger made consequences persistent and spendable:

```text
Action/Event -> Secret/Debt/Favor -> Later Use or Later Pressure
```

Entanglements adds the first relationship layer:

```text
Action/Event/Ledger + Contact State
  -> Pressure Outcome
  + Relationship Change
  + Future Hook
```

The iteration succeeds when recurring non-roster characters feel strategically useful,
emotionally dangerous, and readable enough that players can reason about them before
they pay the price.

## Source Documents

- [`v0.5.md`](./v0.5.md): product vision, contact model, roster, events, UI scope,
  reports, and balance goals.
- [`v0.5A.md`](./v0.5A.md): locked mechanical decisions and canonical answers to open
  questions.
- [`BlackLedger-TDD.md`](../v0.4-the-black-ledger/BlackLedger-TDD.md): current Ledger,
  event, report, persistence, and release architecture.
- [`Roster-TDD.md`](../v0.3-the-roster/Roster-TDD.md): operative stress and roster
  architecture.
- [`RivalTerritory-TDD.md`](../v0.2-rival-territory/RivalTerritory-TDD.md): targeting,
  territory, rival, and GitHub Pages architecture.
- [`DistrictZero-TDD.md`](../v0.1-district-zero/DistrictZero-TDD.md): original pressure
  loop and deterministic simulation architecture.
- [`Layer1.md`](../../foundation/Layer1.md): long-term product identity and simulation
  philosophy.

When these documents differ, `v0.5A.md` is canonical for v0.5 mechanical behavior.

## Goals

- Add Contacts as a first-class engine entity.
- Add static contact definitions for six v0.5 contacts.
- Generate exactly three active contacts per new run from the static registry.
- Keep inactive contacts invisible in normal UI.
- Track Trust, Leverage, Volatility, Exposure, burned state, flags, and recent
  interactions per active contact.
- Derive Contact status in selectors instead of persisting it.
- Add `Manage Contact` as a command-phase action with no operative assignment.
- Support contact targets with a contact id and option id.
- Give every active non-burned contact universal `Cultivate` and `Pressure` options.
- Support contact-specific request-service options.
- Preview and resolve pressure effects, contact metric effects, Ledger effects, rival
  pressure effects, costs, and risk through one shared pipeline.
- Disable unaffordable or invalid contact options before queueing.
- Implement `Quiet Treatment` as a deterministic highest-stress operative service.
- Link selected Ledger entries to contacts through `relatedContactId`.
- Apply contact effects from Ledger uses only when those effects are explicitly declared.
- Add contact-aware versions or branches for selected existing events.
- Add at least four contact-specific weekly events.
- Enforce signature contact event once-per-run rules.
- Enforce generic contact event repeat cooldown and downweighting.
- Add a Contacts panel to the existing one-screen UI.
- Show exact contact effects in action previews, event choices, logs, and reports.
- Update agents to use contacts in basic, strategy-aligned ways.
- Extend harness output with contact usage and outcome metrics.
- Preserve deterministic seeded simulation.
- Preserve the broad v0.4 balance profile.
- Invalidate v0.4 saves through schema versioning.

## Non-Goals

- Romance systems.
- Conversation trees.
- Full faction diplomacy.
- Animated relationship graphs.
- Contact portraits or art pipeline work.
- Procedural contact generation.
- Hidden social networks.
- Contact death or recovery arcs.
- Recruiting contacts as operatives.
- Multi-stage NPC questlines.
- Multi-run contact continuity.
- Player-created contacts.
- Backend services.
- Cloud saves.
- Electron packaging.
- SQLite integration.
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

Contact rules belong in the pure engine. Angular may display contacts, contact options,
selected previews, event consequences, and reports, but it must not calculate contact
availability, affordability, status, option effects, event eligibility, or report metrics.

Static definitions and mutable runtime state must remain separate:

```text
Static Contact definition:
  identity
  archetype
  role tags
  associations
  base metrics
  services
  event hooks
  generation tags
  flavor metadata

Mutable Contact state:
  contact id
  Trust
  Leverage
  Volatility
  Exposure
  burned flag
  recent interactions
  runtime flags
```

The same Contact registry and option pipeline must power:

```text
new-game contact generation
action target options
action previews
action resolution
event eligibility
event choice previews
event resolution
Ledger linking
UI contact cards
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
    game-state.ts
    ledger.ts
  content/
    contact-events.ts
    contact-services.ts
    contacts.ts
    district-zero-actions.ts
    district-zero-events.ts
    ledger-entries.ts
  contacts/
    apply-contact-effects.ts
    contact-event-eligibility.ts
    contact-options.ts
    contact-reports.ts
    contact-selectors.ts
    derive-contact-status.ts
    generate-contacts.ts
    quiet-treatment.ts
    resolve-contact-option.ts
  ledger/
    ledger-use.ts
  selectors/
    previews.ts
    run-summary.ts
  simulation/
    queue-order.ts
    resolve-action.ts
    resolve-event.ts
    select-weekly-event.ts
  harness/
    agents.ts
    simulation-harness.ts
```

Exact file boundaries may vary. The important boundaries are:

- Contact definitions contain authored contact data, not mutable run state.
- Contact option preview and resolution share the same logic.
- Event definitions declare contact effects; event resolution applies them centrally.
- Ledger entries can reference contacts, but declared contact effects define consequences.
- The UI consumes selectors and facade commands instead of reconstructing contact rules.

## Domain Model

Add contact identifiers and state to the model layer.

```ts
type ContactId =
  | 'contact_veyra_lux'
  | 'contact_captain_hollis'
  | 'contact_dr_mercy_iram'
  | 'contact_ciro_moth'
  | 'contact_mina_glass'
  | 'contact_father_static';

type ContactStatus =
  | 'cold'
  | 'useful'
  | 'trusted'
  | 'pressured'
  | 'entangled'
  | 'volatile'
  | 'burned';

type ContactMetricDelta = {
  trust?: number;
  leverage?: number;
  volatility?: number;
  exposure?: number;
};

type ContactState = {
  id: ContactId;
  trust: number;
  leverage: number;
  volatility: number;
  exposure: number;
  burned: boolean;
  recentInteractions: ContactInteraction[];
  flags: Record<string, boolean | number | string>;
};

type ContactInteraction = {
  week: number;
  optionId: ContactOptionId;
  kind: ContactOptionKind;
  label: string;
  effectsSummary: ContactMetricDelta;
};
```

Add contact state to `GameState`:

```ts
type GameState = {
  // existing fields...
  contacts: Record<ContactId, ContactState>;
  activeContactIds: ContactId[];
};
```

Contacts should be clamped to the 0-100 range for all four relationship metrics.

## Contact Definitions

Contact definitions are static content.

```ts
type ContactDefinition = {
  id: ContactId;
  name: string;
  archetype: ContactArchetype;
  roleTags: ContactRoleTag[];
  associatedDistrictId?: DistrictId;
  associatedVenueId?: VenueId;
  associatedRivalId?: RivalId;
  baseTrust: number;
  baseLeverage: number;
  baseVolatility: number;
  baseExposure: number;
  services: ContactServiceDefinition[];
  eventIds: EventId[];
  generationTags: ContactGenerationTag[];
  flavor: {
    dossier: string;
    quote?: string;
    visualTags?: string[];
  };
};
```

Role tags:

```ts
type ContactRoleTag =
  | 'heat_control'
  | 'intel'
  | 'loyalty'
  | 'resources'
  | 'ruin'
  | 'ledger'
  | 'rival_pressure'
  | 'nightlife'
  | 'security'
  | 'weird'
  | 'social'
  | 'stability';
```

Initial content should include:

- Veyra Lux.
- Captain Rafe Hollis.
- Dr. Mercy Iram.
- Ciro Moth.
- Mina Glass.
- Father Static.

## Contact Generation

Each new run selects exactly three active contacts from the six definitions.

The generator must be deterministic:

```ts
function generateContacts(seed: string, definitions: ContactDefinition[]): ContactId[];
```

Coverage groups:

```ts
const REQUIRED_CONTACT_GROUPS = [
  ['heat_control', 'security', 'stability'],
  ['intel', 'ledger', 'nightlife', 'social'],
  ['weird', 'ruin', 'rival_pressure'],
];
```

Every active contact set must satisfy all groups. The generator should use existing seeded
RNG utilities and avoid `Math.random`.

Initialize `ContactState` from base metrics for all contacts, but normal selectors should
only expose active contacts.

## Derived Status

Status is derived, not persisted.

```ts
function deriveContactStatus(contact: ContactState): ContactStatus {
  if (contact.burned) return 'burned';
  if (contact.volatility >= 75) return 'volatile';
  if (contact.trust >= 70 && contact.leverage < 50) return 'trusted';
  if (contact.leverage >= 65 && contact.trust < 50) return 'pressured';
  if (contact.trust >= 50 && contact.leverage >= 50) return 'entangled';
  if (contact.trust < 25 && contact.leverage < 25) return 'cold';
  return 'useful';
}
```

Selectors should present the derived status with title-case display text.

## Manage Contact Action

Add one new action:

```ts
{
  id: 'manage_contact',
  label: 'Manage Contact',
  commandCost: 1,
  resourceCost: 0,
  effects: {},
  baseRisk: 10,
  stressType: 'none',
  assignment: 'none',
  requiresTarget: true,
  allowedTargetTypes: ['contact'],
}
```

Extend `ActionTarget`:

```ts
type ActionTarget =
  | { type: 'district'; id: DistrictId }
  | { type: 'venue'; id: VenueId }
  | { type: 'rival'; id: RivalId }
  | { type: 'recruit'; id: OperativeId }
  | { type: 'ledger'; entryId: LedgerEntryId; useOptionId: LedgerUseOptionId }
  | { type: 'contact'; contactId: ContactId; optionId: ContactOptionId };
```

Queue validation must reject:

- Missing contact target.
- Unknown contact id.
- Inactive contact id.
- Burned contact id.
- Unknown option id.
- Unaffordable option.
- Assigned operative on `Manage Contact`.

## Contact Options

Every active non-burned contact exposes:

- `Cultivate`.
- `Pressure`.
- Contact-specific services.

```ts
type ContactOptionKind = 'cultivate' | 'pressure' | 'request_service';

type ContactOptionPreview = {
  id: ContactOptionId;
  kind: ContactOptionKind;
  label: string;
  description?: string;
  affordable: boolean;
  unavailableReason?: ContactOptionUnavailableReason;
  cost?: PressureCost;
  effects: PressureDelta;
  contactEffects: ContactMetricDelta;
  ledgerEffects?: LedgerEffectPreview[];
  rivalPressureEffects?: Partial<Record<RivalId, number>>;
  quietTreatmentTargetName?: string;
  riskChance: number;
};
```

Universal option effects:

```text
Cultivate:
Resources -600
Trust +10
Volatility -6
Exposure +2

Pressure:
Intel +4
Ruin +2
Leverage +10
Trust -6
Volatility +8
```

Service definitions should use the same preview and resolution path:

```ts
type ContactServiceDefinition = {
  id: ContactServiceId;
  label: string;
  description: string;
  requirements?: ContactServiceRequirement[];
  cost?: {
    resources?: number;
    intel?: number;
    trust?: number;
    leverage?: number;
  };
  effects: PressureDelta;
  contactEffects?: ContactMetricDelta;
  ledgerEffects?: LedgerEffect[];
  rivalPressureEffects?: Partial<Record<RivalId, number>>;
  riskModifier?: number;
  specialEffect?: 'quiet_treatment';
};
```

Do not implement multiple payment paths in v0.5 unless it falls out naturally from the
existing Ledger use option structure. Keep each service as one option with one explicit
cost profile.

## Quiet Treatment

`Quiet Treatment` is a contact service on Dr. Mercy Iram.

It automatically targets the current roster operative with the highest Stress above zero.
If all current roster operatives have `0` Stress, the option is disabled.

Selection rule:

```ts
function selectQuietTreatmentTarget(state: GameState): OperativeId | undefined {
  return currentRosterOperatives(state)
    .filter((operative) => operative.stress > 0)
    .sort((a, b) => b.stress - a.stress)[0]?.id;
}
```

Preview should show the selected operative by name:

```text
Juno Hex Stress -10
```

Resolution should reduce that operative's Stress by 10, clamped at 0, and log the effect.

## Burned Contacts

Burned contacts remain visible but are no longer usable.

Rules:

- Remain in Contacts panel.
- Keep recent interaction history.
- Cannot be targeted by `Manage Contact`.
- Cannot provide services.
- Are excluded from normal contact event eligibility.
- Remain in final reports.
- Do not recover in v0.5.

The UI should present burned contacts as muted cards with disabled services and status
`Burned`.

## Ledger Integration

Add optional contact linkage to Ledger entries:

```ts
type LedgerEntry = {
  // existing fields...
  relatedContactId?: ContactId;
};
```

Ledger effects may create entries related to a contact:

```ts
type LedgerEffect = {
  // existing fields...
  relatedContactId?: ContactId;
  relatedContactStrategy?: 'active_contact' | 'contact_from_context';
};
```

Contact service Ledger effects must be deterministic and previewable in v0.5.

Good:

```text
Creates Debt: Private Investor Terms
Creates Secret: Dead Channel Trace
```

Avoid:

```text
May create a Debt
```

Ledger use options may declare contact effects:

```ts
type LedgerUseOptionDefinition = {
  // existing fields...
  relatedContactEffects?: ContactMetricDelta;
};
```

When a Ledger entry has `relatedContactId`, Ledger resolution applies contact effects only
when the chosen use option or event outcome declares them. Do not add automatic generic
contact changes.

## Event Integration

Event choice definitions should support contact effects:

```ts
type EventChoiceDefinition = {
  // existing fields...
  contactEffects?: Partial<Record<ContactId, ContactMetricDelta>>;
  contactEffectStrategy?: 'selected_contact' | 'related_contact' | 'specific_contact';
};
```

The implementation can choose a shape that fits existing event context, but the behavior
must satisfy:

- Event choice previews show exact contact effects.
- Event resolution applies the same contact effects shown in preview.
- Contact effect logs identify the contact by name.
- Burned contacts are not selected for normal contact events.

Update selected existing events:

- `Liaison Offers a Favor` can become Veyra-linked when Veyra is active.
- `Corp Patrol Sweep` can affect Hollis when Hollis is active.
- `Unexpected Windfall` can link to Ciro or Father Static when active.

Do not update every event.

## Contact Events

Add at least four contact-specific events from the v0.5 roster. Recommended initial set:

- `Contact Wants Assurance` generic event.
- `Veyra's Room`.
- `Hollis Is Being Watched`.
- `Mercy's Bill`.
- `Ciro's Route Remembers`.
- `Confession Leak`.

Signature events fire at most once per run:

```text
Veyra's Room
Hollis Is Being Watched
Mercy's Bill
Ciro's Route Remembers
Confession Leak
```

Generic contact events may repeat, but:

```text
Generic contact events cannot repeat within 2 weeks.
After firing once, their weight is reduced by 50% for the rest of the run.
```

Contact events use the existing single weekly event slot and enter the normal weighted
event pool.

Contact event weight should respond to:

- High Volatility.
- Low Trust.
- High Exposure.
- Recent contact use.
- Related rival pressure.
- Related district or venue activity.
- Related Ledger entries.

## Selectors and Previews

Add selectors for:

- Active contacts.
- Contact cards.
- Contact detail view.
- Contact option previews.
- Contact target options for `Manage Contact`.
- Contact-linked Ledger entries.
- Contact run summary metrics.

`ActionPreview` should be extended with optional contact preview data:

```ts
type ActionPreview = {
  // existing fields...
  contactUse?: ContactOptionPreview;
};
```

The command board target dropdown for `Manage Contact` should show option-level targets:

```text
Veyra Lux - Cultivate
Veyra Lux - Pressure
Veyra Lux - Private Room Access
```

This mirrors the v0.4 `Work the Ledger` pattern and avoids adding a second dropdown.

## Resolution

`resolveAction` should route `manage_contact` to contact option resolution.

Resolution order:

1. Validate target and option.
2. Pay resource, Intel, Trust, and Leverage costs.
3. Apply pressure effects.
4. Apply contact metric effects.
5. Apply special effects, such as Quiet Treatment.
6. Apply rival pressure effects.
7. Apply Ledger effects.
8. Record recent interaction.
9. Add event log entries.

Contact metric costs and effects should be clamped after application.

The preview path and resolution path must share core logic so previewed outcomes match
resolved outcomes.

## UI Scope

Do not redesign the game.

Add a Contacts panel to the existing one-screen structure. It should show active contacts
only, including burned contacts.

Each contact card should show:

- Name.
- Archetype.
- Status.
- Associated district, venue, and/or rival.
- Trust.
- Leverage.
- Volatility.
- Exposure.
- Primary services.
- Recent interaction summary.

Selected contact detail should show:

- Dossier.
- Metrics.
- Services.
- Related Ledger entries.
- Related rival or location.
- Recent interactions.
- Debug flags only if debug mode is enabled.

`Manage Contact` action previews should show:

- Command cost.
- Resource and Intel costs.
- Trust and Leverage costs.
- Pressure effects.
- Contact metric effects.
- Ledger effects.
- Rival pressure effects.
- Quiet Treatment target, when relevant.
- Risk.

Event choices should show exact contact effects. Avoid vague relationship copy.

## Persistence

Increment save schema version for v0.5.

v0.4 saves should be invalidated through the existing compatibility path. No migration is
required.

Persist:

- Contact metric state.
- Active contact ids.
- Burned state.
- Contact flags.
- Recent contact interactions.
- Ledger `relatedContactId`.

Do not persist derived Contact status.

## Agents

Update harness agents with basic contact awareness.

`OperatorBot`:

- Use Heat-control contacts when Heat is dangerous and the service is affordable.
- Use Dr. Mercy when Loyalty is low or stress treatment is valuable.
- Use Veyra/Mina for Dominion when behind schedule and relationship risk is acceptable.
- Avoid Volatility >= 75 unless desperate.
- Cultivate when a useful contact is close to a future service threshold.
- Pressure when the Intel/Dominion gap is urgent and Ruin/Volatility remain acceptable.

`CautiousBot`:

- Cultivate contacts.
- Avoid Pressure.
- Avoid high-Volatility services.
- Use contacts mostly for Heat and Loyalty stabilization.

`AggressiveBot`:

- Pressure contacts.
- Use services for Dominion and Intel.
- Ignore Volatility until severe.

`GreedyBot`:

- Use contacts for Resources.
- Accept deterministic debt-generating services.
- Pressure contacts when money or Dominion follows.

`RandomBot`:

- Random valid contact action and option.

## Reports

Extend simulation output with contact sections:

```text
contact_usage
agent,contactId,contactName,uses,cultivates,pressures,services,burnedCount

contact_outcomes
agent,contactId,contactName,avgTrust,avgLeverage,avgVolatility,avgExposure,burnedRuns

contact_events
agent,eventId,eventLabel,triggers

contact_ledger
agent,contactId,contactName,linkedEntriesCreated

contact_sets
activeContactSet,runs,wins,losses,winRate
```

Useful tuning signals:

- Contacts rarely used means services are too weak or UI is unclear.
- One contact dominating OperatorBot means that contact is too efficient.
- Volatility never mattering means contact event weights are too low.
- Contact events dominating means weights are too high.
- Pressure always winning means Trust needs more value or Pressure needs sharper
  consequences.
- Cultivate never used means relationships recover too easily or services are too cheap.

## Balance Targets

Preserve broad v0.4 tuning:

```text
OperatorBot: 55-75% win rate
CautiousBot: low win rate, usually Dominion shortfall
RandomBot: 5-12% win rate
AggressiveBot: viable but volatile
GreedyBot: viable but swingy
```

Contact-specific targets:

```text
Average Manage Contact uses per run: 1-3
Average contact-specific events per run: 0-2
At least one contact metric changes meaningfully in most runs
Contacts should help stabilize bad runs but create future hooks
No single contact should be mandatory for OperatorBot
Pressure should be powerful but visibly corrosive
Cultivate should be useful in longer or strained runs, but not always necessary
```

Players should be able to win while ignoring contacts, but contacts should make runs more
interesting and provide comeback paths.

## Test Plan

Unit and integration tests should cover:

- Contact generation is deterministic by seed.
- Exactly three active contacts are selected.
- Active contact set satisfies role coverage.
- Role coverage recognizes `social` and `stability`.
- Contact state initializes from definitions.
- Inactive contacts do not appear in normal selectors.
- `deriveContactStatus` returns correct labels.
- `Cultivate` and `Pressure` are available for every active non-burned contact.
- Burned contacts cannot be targeted.
- `Manage Contact` rejects assigned operatives.
- `Manage Contact` requires a valid active contact target and option.
- Contact service affordability disables invalid options.
- Contact option preview and resolution use the same pipeline.
- `Cultivate` applies Resources, Trust, Volatility, and Exposure changes.
- `Pressure` applies Intel, Ruin, Leverage, Trust, and Volatility changes.
- Contact services apply pressure effects and contact effects.
- `Quiet Treatment` selects the highest-stress operative deterministically.
- `Quiet Treatment` is disabled when no current roster operative has Stress.
- Contact-linked Ledger entries include `relatedContactId`.
- Contact-linked Ledger uses modify contacts only when contact effects are declared.
- Contact event choices preview and resolve exact contact effects.
- Contact events only trigger for active non-burned contacts.
- Signature contact events fire at most once per run.
- Generic contact event cooldown and downweighting work.
- Agents can complete simulations with contacts enabled.
- Reports include contact usage and outcome metrics.
- v0.4 saves are invalidated by schema versioning.

## Acceptance Criteria

v0.5.0 is complete when:

```text
The game has a Contacts panel.
Each new run has 3 active contacts selected from at least 6 definitions.
Each active contact has Trust, Leverage, Volatility, and Exposure.
Contact status is visible and derived.
Burned contacts remain visible but unusable.
Manage Contact exists and has no operative assignment.
Manage Contact can Cultivate, Pressure, or request contact services.
Contact options preview pressure, contact, Ledger, rival, and special effects.
Quiet Treatment works as a deterministic highest-stress operative service.
At least 4 contact-specific events can trigger.
At least 2 existing events are contact-aware.
Some Ledger entries can be linked to contacts.
Run-end summary includes contact outcomes.
Simulation agents understand basic contact usage.
Reports include contact usage and outcome data.
The broad v0.4 balance profile remains recognizable.
```
