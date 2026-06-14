# Haunted Apex v0.8.0 City Wakes TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.8.0: The City Wakes**.

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

The City Wakes adds run-level identity:

```text
Seed + Campaign Tension + City Identity
  -> Coherent starting board
  + Biased generators
  + Tension-weighted events
  + Opening briefing
  + Campaign-aware reports
```

The release succeeds when a new run feels like a specific crisis in a specific city before
the player takes the first action, without replacing the existing eight-week pressure game.

## Source Documents

- [`v0.8.md`](./v0.8.md): product vision, Campaign Tension model, run assembly direction,
  UI scope, reports, and balance goals.
- [`v0.8A.md`](./v0.8A.md): locked mechanical decisions and canonical answers to open
  questions.
- [`Accords-TDD.md`](../v0.7-the-accords/Accords-TDD.md): current Faction, Accord, report,
  persistence, and release architecture.
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

When these documents differ, `v0.8A.md` is canonical for v0.8 mechanical behavior.

## Goals

- Add Campaign Tensions as first-class static content.
- Add a `CampaignState` to `GameState`.
- Add deterministic city identity generation.
- Route new-run construction through a central RunAssembler.
- Keep `newGame()` as the public engine entry point while moving assembly responsibility into
  campaign/run-assembly modules.
- Support random Campaign Tension selection by default.
- Support explicit Campaign Tension selection through `newGame({ campaignTensionId })`.
- Select random Campaign Tension deterministically from the normalized seed.
- Add exactly five v0.8 Campaign Tensions:
  - Corp Crackdown
  - Nightlife War
  - Ghostline Signal
  - Industrial Cut
  - Dirty Capital
- Apply campaign starting pressure, faction, contact, and rival modifiers exactly once.
- Preserve both current rivals as active/present in every run.
- Treat campaign rival fields as featured/pressure/event context, not active-rival selection.
- Add campaign-biased generation for factions, contacts, roster, and front opportunities.
- Preserve existing coverage and cap rules under campaign bias.
- Add campaign event-weight modifiers.
- Add Ghostline Signal's targeted `Gather Intel` secret-discovery bonus.
- Show the Ghostline Signal bonus in targeted `Gather Intel` previews.
- Add opening briefing state, view models, and UI.
- Auto-show the briefing only while `openingBriefingShown` is false.
- Allow the player to reopen campaign details during a run.
- Show city and Campaign Tension identity in the header after briefing dismissal.
- Add a concise campaign application event-log entry.
- Add campaign identity and campaign notes to the run-end summary.
- Extend harness reports with Campaign Tension grouping.
- Make agents campaign-aware without changing their broad strategy identity.
- Preserve deterministic seeded simulation.
- Preserve the broad v0.7 balance profile.
- Invalidate v0.7 saves through schema versioning.

## Non-Goals

- Longer campaign length.
- Multiple acts.
- Final boss system.
- Map generation.
- Dynamic faction wars.
- Active/inactive rival selection.
- New rival content solely for campaigns.
- New major contact, operative, front, faction, or event content solely for campaigns.
- Campaign-specific victory paths.
- Campaign-specific hard win conditions.
- New pressure meters.
- Meta-progression.
- Unlock trees.
- Runtime AI-generated text.
- Campaign-specific visual themes.
- Full procedural prose generation.
- Cloud saves.
- Multiplayer.
- Electron packaging.
- SQLite integration.
- Backend services.

## Architectural Direction

The dependency direction remains:

```text
Angular UI -> GameFacade -> Pure Engine
Pure Engine -> Model + Content + RNG
Persistence Adapter -> versioned serialized GameState envelope
Harness Agents -> public engine commands and selectors
GitHub Actions -> production Angular artifact -> GitHub Pages
```

Campaign rules belong in the pure engine. Angular may display campaign identity, briefing
view models, selected campaign config, campaign-modified previews, and reports, but it must not
calculate campaign selection, generator bias, starting modifiers, event-weight modifiers, or
campaign report metrics.

Static definitions and mutable runtime state must remain separate:

```text
Static Campaign Tension definition:
  identity
  role tags
  description
  opening briefing copy
  starting pressure modifiers
  faction/contact/rival modifiers
  generation bias
  qualitative briefing metadata
  event weight modifiers
  optional secret-discovery modifier
  run-summary flavor

Mutable Campaign state:
  tension id
  city name
  city profile
  opening briefing shown flag
  applied modifier record
  featured active content record
  runtime flags
```

The same Campaign registries and selectors must power:

```text
new-game assembly
campaign selection UI
opening briefing
header identity
event weighting
Gather Intel secret preview
run summary
harness grouping
save validation
release notes and tuning reports
```

## Recommended Source Layout

```text
src/app/engine/
  model/
    campaign.ts
    game-state.ts
  content/
    campaign-tensions.ts
    city-names.ts
  campaign/
    assemble-new-run.ts
    select-campaign-tension.ts
    generate-city-identity.ts
    campaign-modifiers.ts
    campaign-generation-bias.ts
    campaign-briefing.ts
    campaign-reports.ts
    index.ts
  contacts/
    generate-contacts.ts
  factions/
    generate-factions.ts
  fronts/
    generate-front-opportunities.ts
  roster/
    generate-roster.ts
  selectors/
    campaign.ts
    previews.ts
    run-summary.ts
  simulation/
    new-game.ts
    select-weekly-event.ts
```

This layout is a recommendation, not a requirement. The implementation should follow existing
repo patterns where a smaller local change is clearer.

## Public API

`newGame()` remains the public constructor for a playable run.

```ts
type NewGameConfig = {
  seed?: string;
  difficulty?: Difficulty;
  campaignTensionId?: CampaignTensionId;
};
```

Rules:

```text
If campaignTensionId is provided:
  use that tension.

If campaignTensionId is absent:
  select Campaign Tension deterministically from the normalized seed.

If seed is absent:
  create the default seed, then select Campaign Tension from that generated seed.
```

The RunAssembler should own the new-run sequence:

```text
1. Normalize or create seed.
2. Select Campaign Tension.
3. Generate city identity.
4. Generate campaign-biased roster.
5. Generate campaign-biased contacts.
6. Generate campaign-biased factions.
7. Generate campaign-biased front network.
8. Initialize districts.
9. Initialize all current rivals as active/present.
10. Initialize base pressures.
11. Apply campaign pressure/faction/contact/rival modifiers.
12. Create campaign opening log entry.
13. Create CampaignState.
14. Return GameState.
```

The exact order may differ if needed for clean implementation, but all modifiers must be applied
after the relevant mutable state exists and before the player can act.

## Campaign Model

Add campaign model types under `src/app/engine/model/campaign.ts`.

```ts
export type CampaignTensionId =
  | 'campaign_corp_crackdown'
  | 'campaign_nightlife_war'
  | 'campaign_ghostline_signal'
  | 'campaign_industrial_cut'
  | 'campaign_dirty_capital';

export type CampaignRoleTag =
  | 'heat'
  | 'nightlife'
  | 'ghostline'
  | 'industrial'
  | 'capital'
  | 'fronts'
  | 'ledger'
  | 'contacts'
  | 'factions'
  | 'rivals'
  | 'ruin'
  | 'resources'
  | 'dominion';

export type CityProfile =
  | 'rain_noir'
  | 'violet_nightlife'
  | 'ghost_market'
  | 'industrial_chrome'
  | 'corporate_spire';
```

Campaign definitions should support current behavior and future rival selection without forcing
active/inactive rivals in v0.8.

```ts
export type CampaignGenerationBias = {
  requiredFactionIds?: readonly FactionId[];
  weightedFactionIds?: Partial<Record<FactionId, number>>;
  featuredRivalIds?: readonly RivalId[];
  weightedRivalIds?: Partial<Record<RivalId, number>>;
  requiredContactIds?: readonly ContactId[];
  weightedContactIds?: Partial<Record<ContactId, number>>;
  weightedOperativeIds?: Partial<Record<OperativeId, number>>;
  weightedOperativeTags?: Partial<Record<OperativeRoleTag, number>>;
  weightedFrontDefinitionIds?: Partial<Record<FrontDefinitionId, number>>;
  weightedFrontTags?: Partial<Record<FrontRoleTag, number>>;
  weightedEventTags?: Partial<Record<EventTag, number>>;
};

export type CampaignEventWeightModifier = {
  eventId?: EventId;
  eventTag?: EventTag;
  weightDelta: number;
};

export type CampaignTensionDefinition = {
  id: CampaignTensionId;
  name: string;
  subtitle: string;
  roleTags: readonly CampaignRoleTag[];
  description: string;
  openingBriefing: string;
  startingPressureDelta?: PressureDelta;
  factionModifiers?: Partial<Record<FactionId, FactionMetricDelta>>;
  rivalPressureModifiers?: Partial<Record<RivalId, number>>;
  contactMetricModifiers?: Partial<Record<ContactId, ContactMetricDelta>>;
  generationBias: CampaignGenerationBias;
  eventWeightModifiers?: readonly CampaignEventWeightModifier[];
  targetedGatherIntelSecretDiscoveryBonus?: number;
  briefing: {
    pressurePattern: readonly string[];
    activeLabels: readonly string[];
    favoredLabels: readonly string[];
  };
  runSummaryFlavor?: {
    victoryLine?: string;
    lossLine?: string;
    epitaphTemplates?: readonly string[];
  };
};
```

`briefing.activeLabels` must describe guaranteed or actually active content only.
`briefing.favoredLabels` may describe weighted content qualitatively and must not expose raw
weights.

## Campaign State

Add to `GameState`:

```ts
export type CampaignState = {
  tensionId: CampaignTensionId;
  cityName: string;
  cityProfile: CityProfile;
  openingBriefingShown: boolean;
  appliedModifiers: {
    startingPressureDelta?: PressureDelta;
    factionModifiers?: Partial<Record<FactionId, FactionMetricDelta>>;
    rivalPressureModifiers?: Partial<Record<RivalId, number>>;
    contactMetricModifiers?: Partial<Record<ContactId, ContactMetricDelta>>;
  };
  activeContent: {
    factionIds: readonly FactionId[];
    rivalIds: readonly RivalId[];
    contactIds: readonly ContactId[];
    frontDefinitionIds: readonly FrontDefinitionId[];
    startingOperativeIds: readonly OperativeId[];
  };
  flags: Record<string, boolean | number | string>;
};

export type GameState = {
  // existing...
  schemaVersion: 8;
  campaign: CampaignState;
};
```

`CampaignState.appliedModifiers` is an audit record. It is not the source of live metrics after
new-game assembly.

## Locked Campaign Content

Use the current registry IDs below. If implementation discovers an ID has changed, prefer the
current registry over the conceptual vision label.

### Corp Crackdown

```text
id: campaign_corp_crackdown
name: Corp Crackdown
city profile bias: corporate_spire or rain_noir
```

Applied modifiers:

```ts
startingPressureDelta: { heat: 12, intel: -2 }
factionModifiers: {
  faction_ashline_bureau: { suspicion: 12 }
}
```

Generation bias:

```ts
requiredFactionIds: ['faction_ashline_bureau']
weightedContactIds: { contact_captain_hollis: 30 }
weightedOperativeTags: { heat_control: 20, intel: 10 }
weightedFrontTags: { heat_control: 20, security: 10 }
weightedEventTags: { HEAT: 8, CORP: 15, FRONT: 6, FACTION: 6 }
```

Event modifiers should include:

```ts
corp_patrol_sweep +15
front_inspection +12
faction_scrutiny +10
safehouse_compromised +8
```

### Nightlife War

```text
id: campaign_nightlife_war
name: Nightlife War
city profile bias: violet_nightlife
```

Applied modifiers:

```ts
startingPressureDelta: { dominion: 3, loyalty: -4, heat: 4 }
rivalPressureModifiers: {
  rival_nyx_ardent: 15
}
```

Generation bias:

```ts
requiredFactionIds: ['faction_velvet_house']
featuredRivalIds: ['rival_nyx_ardent']
weightedContactIds: { contact_veyra_lux: 35, contact_mina_glass: 25 }
weightedOperativeTags: { social: 20, intel: 15 }
weightedFrontTags: { nightlife: 25, social: 15 }
weightedEventTags: { LIAISON: 12, CONTACT: 8, RIVAL: 8, LOYALTY: 6 }
```

Event modifiers should include:

```ts
liaison_favor +15
event_veyra_room +12
rival_sends_flowers +10
contact_wants_assurance +8
operative_wants_more +6
```

### Ghostline Signal

```text
id: campaign_ghostline_signal
name: Ghostline Signal
city profile bias: ghost_market
```

Applied modifiers:

```ts
startingPressureDelta: { intel: 6, ruin: 8 }
factionModifiers: {
  faction_ghostline_communion: { standing: 5, obligation: 4 }
}
```

Generation bias:

```ts
requiredFactionIds: ['faction_ghostline_communion']
weightedContactIds: { contact_ciro_moth: 35, contact_father_static: 35 }
weightedOperativeIds: {
  op_juno_hex: 25,
  op_echo_saint: 20,
  op_orchid_seven: 15
}
weightedFrontDefinitionIds: {
  front_surveillance_den: 30,
  front_black_clinic: 15
}
weightedEventTags: { LEDGER: 15, RUIN: 15, INTEL: 8 }
targetedGatherIntelSecretDiscoveryBonus: 8
```

Event modifiers should include:

```ts
ledger_leverage_window +10
blackmail_lead +10
event_juno_static_in_her_voice +10
event_ciro_route_remembers +10
event_confession_leak +10
front_back_room_ledger +8
```

The `+8` secret discovery bonus applies only to targeted `Gather Intel`.

### Industrial Cut

```text
id: campaign_industrial_cut
name: Industrial Cut
city profile bias: industrial_chrome
```

Applied modifiers:

```ts
startingPressureDelta: { resources: 800, heat: 6, loyalty: -2 }
rivalPressureModifiers: {
  rival_knox_marrow: 12
}
```

Generation bias:

```ts
requiredFactionIds: ['faction_chrome_maw']
featuredRivalIds: ['rival_knox_marrow']
weightedOperativeTags: { violence: 25, money: 20, stability: 8 }
weightedFrontDefinitionIds: {
  front_zero_mercy_cut: 35,
  front_courier_line: 25
}
weightedFrontTags: { resources: 25, dominion: 15 }
weightedEventTags: { VIOLENCE: 12, RIVAL: 8, RESOURCE: 8, HEAT: 6 }
```

Event modifiers should include:

```ts
job_goes_loud +15
rival_tests_border +12
front_rival_leans_on_your_front +10
front_clean_money_dirty_hands +10
faction_demand +8
```

### Dirty Capital

```text
id: campaign_dirty_capital
name: Dirty Capital
city profile bias: corporate_spire
```

Applied modifiers:

```ts
startingPressureDelta: { resources: 1200, intel: -2 }
factionModifiers: {
  faction_helix_meridian: { standing: 6, suspicion: 4, obligation: 12 }
}
```

Generation bias:

```ts
requiredFactionIds: ['faction_helix_meridian']
weightedFrontTags: { resources: 25, heat_control: 10 }
weightedContactIds: { contact_mina_glass: 15, contact_captain_hollis: 10 }
weightedOperativeTags: { money: 15, social: 10 }
weightedEventTags: { FACTION: 12, ACCORD: 8, RESOURCE: 8, FRONT: 6, LEDGER: 6 }
```

Event modifiers should include:

```ts
faction_demand +12
accord_terms_shift +10
front_clean_money_dirty_hands +12
ledger_debt_comes_due +10
front_inspection +6
```

The vision's `resources` operative tag should map to the current `money` operative role tag.
No new operative role tag is required for v0.8.

## City Identity

City identity is deterministic flavor plus report identity.

```ts
export type CityIdentity = {
  name: string;
  profile: CityProfile;
};
```

Use curated seeded selection from prefix and suffix arrays. Campaign Tensions may bias or constrain
`CityProfile`, but they should not require bespoke city-name tables.

Example source:

```ts
const CITY_PREFIXES = [
  'Veyr',
  'Noct',
  'Ash',
  'Crown',
  'Vel',
  'Orchid',
  'Halcyon',
  'Black',
  'Morrow',
  'Saint',
];

const CITY_SUFFIXES = [
  'Reach',
  'Vanta',
  'Mire',
  'Spire',
  'Ward',
  'Crown',
  'Line',
  'Halo',
  'Avenue',
  'Circuit',
];
```

Rules:

```text
Same seed + same tension -> same city identity.
Same seed + explicit different tension may produce a different profile.
City name generation must not consume the main game rng cursor used by weekly events.
```

## Campaign-Biased Generation

Campaign-biased generation should extend existing generator contracts with optional bias config.

### Weighted Selection Helper

Add reusable helpers for weighted ordering/selection where useful:

```ts
type WeightedIdMap<TId extends string> = Partial<Record<TId, number>>;

function getWeight(base: number, idBias?: number, tagBias?: number): number;
```

Weights are additive and must be clamped to at least `1` for eligible candidates unless a
future definition explicitly disables content.

### Factions

Current rule:

```text
Ashline Bureau always active.
Exactly four active factions.
One optional faction omitted.
```

v0.8 rule:

```text
1. Start with Ashline Bureau.
2. Add campaign required factions.
3. Fill remaining active slots by weighted seeded selection.
4. Keep exactly four active factions for all locked v0.8 tensions.
5. Materialize active faction states only.
```

Required factions must still reference valid definitions. If a required faction is Ashline, it
must not be duplicated.

### Rivals

v0.8 does not introduce active/inactive rivals.

Rules:

```text
Nyx Ardent and Knox Marrow remain present in every run.
Campaign featuredRivalIds affect briefing and reports.
Campaign rivalPressureModifiers apply to live rival pressure after initialization.
weightedRivalIds may exist in definitions for future compatibility but should not alter active
rival presence in v0.8.
```

### Contacts

Current rule:

```text
Exactly three active contacts.
Active set must satisfy contact coverage groups.
```

v0.8 rule:

```text
1. Generate all candidate coverage-complete contact sets.
2. Exclude sets that do not include all campaign required contacts.
3. Score remaining sets by summed contact id and role bias.
4. Seed-select one set by weighted score.
5. Fall back to current unweighted covered generation if campaign constraints produce no valid set.
```

For the locked v0.8 tensions, no required contact should be necessary. Use weighted contacts so
coverage stays flexible.

### Operatives

Current roster validity rules remain:

```text
startingRosterSize: 3
hirePoolSize: 4
maxStartingRares: 1
required tag groups
at least one Intel capability
at least one Heat-control capability
```

v0.8 rule:

```text
1. Use weighted operative ordering with rarity base weights.
2. Apply campaign id and role-tag biases to ordering weights.
3. Select the first valid starting roster from the weighted ordering.
4. Fill hire pool from remaining weighted ordering.
```

Campaigns should weight operatives, not force them. Ghostline Signal makes Juno, Echo, and Orchid
more likely but not guaranteed.

### Front Opportunities

Current rule:

```text
The Pale Circuit starts owned.
Four opportunity definitions are selected from coverage-complete sets.
```

v0.8 rule:

```text
1. Preserve The Pale Circuit as the starting owned Front.
2. Build coverage-complete opportunity sets excluding The Pale Circuit.
3. Score candidate sets by summed front id and role-tag bias.
4. Seed-select one set by weighted score.
5. Preserve opportunity count and existing front cap rules.
```

## Campaign Starting Modifiers

Campaign modifiers apply during new-run assembly after mutable state is initialized.

Supported v0.8 modifier categories:

```text
startingPressureDelta
factionModifiers
rivalPressureModifiers
contactMetricModifiers
```

Rules:

```text
Apply modifiers exactly once.
Clamp pressures and relationship/faction/contact metrics using existing clamp helpers.
Record applied modifiers in CampaignState.appliedModifiers.
Create one concise event-log entry after applying modifiers.
Do not record generation bias in the event log.
```

Opening log entry shape:

```ts
{
  type: 'campaign',
  title: 'Campaign Applied: Corp Crackdown',
  body: 'Heat +12, Intel -2, Ashline Bureau Suspicion +12.',
  tags: ['CAMPAIGN', 'campaign_corp_crackdown']
}
```

Add `campaign` to `GameLogEntryType`, and add `CAMPAIGN` to `EventTag` only if it is useful for
event/report tagging. If adding `CAMPAIGN` to `EventTag` causes broad churn, keep log tags as
strings where existing typing allows it.

## Event Weighting

Extend event weighting data-drivenly.

```ts
type EventWeightContext = {
  // existing...
  campaignTensionId?: CampaignTensionId;
  campaignEventWeightModifiers?: readonly CampaignEventWeightModifier[];
};
```

Add a new diagnostics modifier id:

```ts
type EventWeightModifierId =
  // existing...
  | 'campaign_event_id'
  | 'campaign_event_tag';
```

Rules:

```text
Apply eventId modifiers to matching event IDs.
Apply eventTag modifiers to events containing the tag.
Use additive modifiers after base/rule weight and before recent-repeat penalties.
Clamp to minimum 0.
Do not make eligible events impossible unless a future definition explicitly does so.
Diagnostics must show campaign modifier contribution.
```

The existing recent-event penalty and Contact repeat multiplier should remain after campaign
weighting.

## Ghostline Signal Secret Discovery Bonus

Ghostline Signal has the only v0.8 scenario-specific runtime mechanic.

Rules:

```text
Applies only when:
  campaign.tensionId === 'campaign_ghostline_signal'
  actionId === 'gather_intel'
  target exists

Does not apply to:
  untargeted Gather Intel
  event-created secrets
  Ledger event rewards
  contact service secrets
  accord-created secrets
  front event secrets
```

Preview requirement:

```text
Targeted Gather Intel shows normal Secret Chance total.
If Ghostline bonus applies, preview also shows:
Campaign Bonus: Ghostline Signal +8%
```

The bonus should be included before final chance clamping. The preview and resolver must use the
same helper so they cannot drift.

## Opening Briefing

Add campaign selectors for UI consumption.

```ts
type CampaignBriefingView = {
  cityName: string;
  cityProfile: CityProfile;
  tensionName: string;
  tensionSubtitle: string;
  description: string;
  openingBriefing: string;
  seed: string;
  startingEffectRows: readonly CampaignEffectRow[];
  activeThisRun: readonly string[];
  favoredByTension: readonly string[];
  pressurePattern: readonly string[];
};
```

`startingEffectRows` shows exact applied state changes:

```text
Heat +12
Intel -2
Ashline Bureau Suspicion +12
Nyx Ardent Pressure +15
```

`activeThisRun` separates guaranteed or actually active content:

```text
Ashline Bureau active
Ghostline Communion active
Nyx Ardent pressured
The Pale Circuit owned
```

`favoredByTension` describes weights qualitatively:

```text
Heat-control operatives more likely
Security contacts more likely
Front Inspection events weighted upward
```

Rules:

```text
New run starts with openingBriefingShown = false.
UI auto-shows briefing when openingBriefingShown is false.
Dismiss sets openingBriefingShown = true.
Loaded save auto-shows only when openingBriefingShown is false.
Header includes City · Campaign Tension.
Campaign button/panel reopens briefing/details at any time.
```

The campaign detail panel can reuse the briefing content. It does not need a separate route.

## New Run UI

Add Campaign Tension selection to the existing new-run controls.

Behavior:

```text
Default selection: Random Campaign Tension.
Specific selections: the five locked Campaign Tensions.
Seed remains optional.
Starting a run passes campaignTensionId only for specific selections.
Random passes no campaignTensionId.
```

The UI should not expose raw generation weights.

## GameFacade Responsibilities

GameFacade should expose:

```ts
readonly campaignBriefing = computed<CampaignBriefingView>(...);
readonly campaignHeader = computed<CampaignHeaderView>(...);
startNewRun(seed?: string, campaignTensionId?: CampaignTensionId): void;
dismissCampaignBriefing(): void;
openCampaignBriefing(): void;
closeCampaignBriefing(): void;
```

The exact signal names can follow local style. The important boundary is that GameFacade calls
engine selectors and state transitions; Angular templates do not compute campaign mechanics.

## Persistence

v0.8 invalidates v0.7 saves.

Required changes:

```text
GameState.schemaVersion = 8
CURRENT_RUN_STORAGE_KEY = haunted-apex:v0.8:current-run
LEGACY_V07_STORAGE_KEY = haunted-apex:v0.7:current-run
```

No migration is required.

Save validation must require:

```text
campaign object exists
tensionId resolves to a Campaign Tension definition
cityName is non-empty
cityProfile is valid
openingBriefingShown is boolean
appliedModifiers has valid pressure/faction/contact/rival keys if present
activeContent references valid registry IDs
```

When a v0.7 save is found, the app should follow the existing incompatible-save notice behavior.

## Run Summary

Player run summary should remain concise.

Add:

```text
City
Campaign Tension
Campaign subtitle or one-line premise
Seed
1-3 campaign notes
Campaign epitaph/flavor line where available
```

Example:

```text
Campaign:
- City: Veyr Halo
- Tension: Ghostline Signal
- Premise: Ghostline Market is broadcasting something that is not a broadcast.

Campaign Notes:
- Secrets discovered: 4
- Ledger entries used: 3
- Final Ruin: 37
```

Campaign note selection should be data-driven where possible:

```text
Corp Crackdown: Heat peak, Ashline suspicion/obligation, Heat losses.
Nightlife War: Nyx pressure, Contact use, Loyalty floor.
Ghostline Signal: Secrets discovered, Ledger entries used, final Ruin.
Industrial Cut: Resources gained, Heat peak, Knox pressure.
Dirty Capital: Front count, debts/favors, Helix obligation.
```

The summary must not require long prose generation.

## Harness Reports

Extend harness output with campaign grouping.

Minimum new sections:

```text
campaign_summary
campaign_agent_summary
campaign_loss_causes
campaign_action_usage
campaign_events
campaign_system_usage
```

`campaign_summary` should aggregate by Campaign Tension across all agents:

```text
campaignId,campaignName,runs,wins,losses,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgResources,avgIntel,avgRuin
```

`campaign_agent_summary` should aggregate by agent and Campaign Tension:

```text
agent,campaignId,runs,wins,losses,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgResources,avgIntel,avgRuin
```

`campaign_system_usage` should include:

```text
Broker Accord uses
Contact uses
Front establishments/upgrades/cooling
Ledger discoveries/uses
Secret discoveries
Faction events
Front events
Contact events
Operative events
```

The existing report sections should remain, with campaign sections appended rather than replacing
the current output.

## Agent Updates

Agents should read `state.campaign.tensionId` and adjust scoring without losing their identities.

### OperatorBot

Expected campaign adjustments:

```text
Corp Crackdown:
  prioritize Heat relief, Ashline safety Accords, low-exposure choices.

Nightlife War:
  value social/contact/intel options, protect Loyalty, avoid overfeeding Nyx.

Ghostline Signal:
  target Gather Intel more often, watch Ruin, value Ruin relief and useful secrets.

Industrial Cut:
  accept more early Dominion/Resources risk, cool Heat and Knox pressure earlier.

Dirty Capital:
  invest in Fronts earlier, use resources to accelerate Dominion, watch Obligation/Debt.
```

### AggressiveBot

Should exploit Nightlife War and Industrial Cut more than the global baseline while remaining
volatile.

### GreedyBot

Should exploit Dirty Capital and Industrial Cut more than the global baseline while remaining
sensitive to Heat, Debt, and Obligation.

### CautiousBot

Should become campaign-aware but still usually lose by Dominion shortfall.

### RandomBot

No strategic campaign logic required.

## Balance Targets

Preserve broad v0.7 tuning:

```text
OperatorBot overall: 55-75% win rate
CautiousBot: usually fails by Dominion shortfall
RandomBot: diagnostic, 0-10% acceptable
AggressiveBot: viable but volatile
GreedyBot: viable but swingy
```

Campaign-specific Operator target:

```text
Each Campaign Tension: at least 40% OperatorBot win rate
No Campaign Tension: above 85% OperatorBot win rate
```

Texture targets:

```text
Corp Crackdown:
  higher Heat losses than average.

Nightlife War:
  higher Loyalty/contact/rival complications than average.

Ghostline Signal:
  higher Ruin and Ledger activity than average.

Industrial Cut:
  higher Resources, higher Heat, higher aggressive wins/losses.

Dirty Capital:
  higher Front usage, higher Debt/Obligation events.
```

The target is distinct texture, not equal difficulty.

## Testing Strategy

Add focused unit coverage before broad integration coverage.

### Content and Registry

- All five Campaign Tension definitions exist.
- Campaign IDs are unique.
- Campaign role tags are valid.
- Campaign event IDs and tags resolve.
- Campaign faction, contact, operative, front, and rival references resolve.
- Missing optional weighted references are either removed or explicitly mapped before merge.

### Selection and City Identity

- Same seed without explicit campaign selects the same tension.
- Different seeds can select different tensions.
- Explicit campaign overrides seeded selection.
- Invalid campaign ID is rejected by TypeScript and save validation.
- Same seed and tension produce the same city identity.

### New Run Assembly

- `newGame({ campaignTensionId })` uses the explicit tension.
- `newGame({ seed })` selects deterministic tension.
- `GameState.schemaVersion` is `8`.
- `GameState.campaign` is populated.
- Starting pressure modifiers apply exactly once.
- Faction modifiers apply exactly once.
- Contact modifiers apply exactly once where present.
- Rival pressure modifiers apply exactly once.
- Campaign opening log entry is created once.
- Both rivals remain present in every Campaign Tension.
- Required campaign factions are active.
- Active faction count remains four.
- Contact and Front coverage validation still passes.
- Roster validity validation still passes.

### Generation Bias

Use multi-seed statistical tests with stable thresholds.

- Corp Crackdown increases Hollis / heat-control / security content frequency over baseline.
- Nightlife War increases Veyra/Mina/nightlife/social content frequency over baseline.
- Ghostline Signal increases Ciro/Father Static/Juno/Echo/Surveillance Den frequency over baseline.
- Industrial Cut increases Chrome/Knox/Zero Mercy Cut/Courier Line/resources content frequency over
  baseline.
- Dirty Capital increases Helix/resource-front/money/social content frequency over baseline.

The tests should prove directional bias, not exact percentages.

### Event Weighting

- Campaign event ID modifiers affect matching event weights.
- Campaign event tag modifiers affect matching event weights.
- Campaign modifiers appear in diagnostics.
- Recent-event penalties still apply after campaign modifiers.
- Eligible events are not removed unless final weight reaches zero through normal clamping.

### Ghostline Bonus

- Ghostline Signal bonus applies to targeted `Gather Intel`.
- Ghostline Signal bonus does not apply to untargeted `Gather Intel`.
- Ghostline Signal bonus does not apply outside Ghostline Signal.
- Preview and resolution use the same final chance.
- Preview displays `Campaign Bonus: Ghostline Signal +8%` when applicable.

### UI Selectors

- Opening briefing view includes city, tension, description, seed, exact starting effects,
  active content, favored content, and pressure pattern.
- Active and favored content are separated.
- Header view includes city and tension.
- Dismissed briefing can be reopened.

### Persistence

- v0.8 saves round-trip CampaignState.
- v0.7 saves are invalidated.
- Malformed CampaignState is rejected.
- `openingBriefingShown` controls auto-show behavior after load.

### Reports and Harness

- Run summary includes city and Campaign Tension.
- Run summary includes campaign notes.
- Harness runs all five Campaign Tensions.
- Harness groups win rate by Campaign Tension.
- Harness groups agent performance by Campaign Tension.
- Harness groups loss causes and event/system usage by Campaign Tension.

## Rollout Notes

Implementation should proceed in small phases:

```text
1. Campaign model/content/city identity.
2. RunAssembler and GameState schema/persistence.
3. Campaign-biased generators.
4. Campaign modifiers and opening log.
5. Event-weight modifiers.
6. Ghostline targeted Intel bonus.
7. Campaign selectors and opening briefing UI.
8. Run summary and harness grouping.
9. Agent campaign-aware scoring.
10. Balance pass and release readiness.
```

The exact phase breakdown can be refined in the implementation plan.

## Acceptance Criteria

v0.8.0 is complete when:

```text
Each new run has a Campaign Tension.
Random Campaign Tension is the default new-run behavior.
Manual Campaign Tension selection is available.
At least five locked Campaign Tensions exist.
Each new run has a generated city name and city profile.
Opening briefing displays city, tension, premise, exact starting modifiers, active content,
and favored content.
Briefing auto-shows until dismissed and can be reopened later.
Header displays city and tension identity.
Campaign starting modifiers apply exactly once.
Campaign starting modifiers create one concise opening log entry.
Campaign tensions bias active factions, contacts, front opportunities, and roster generation.
Both current rivals remain present in every run.
Campaign tensions modify event weights.
Ghostline Signal applies and previews a targeted Gather Intel secret-discovery bonus.
Run-end summary includes city, tension, and campaign notes.
Simulation agents run successfully across all Campaign Tensions.
Harness reports group performance by Campaign Tension.
The broad v0.7 balance profile remains recognizable.
v0.7 saves are invalidated.
```
