# Haunted Apex v0.2.0 Rival Territory TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.2.0: Rival Territory**.

District Zero proved the pressure loop:

```text
Action + Operative -> Outcome
```

Rival Territory adds a spatial and political layer:

```text
Action + Operative + Target -> Modified Outcome + Local Change + Rival Reaction
```

The iteration succeeds when the player must consider where an action happens and who controls that territory, while the game remains a compact, deterministic eight-week run.

## Source Documents

- [`v0.2.md`](./v0.2.md): product direction, content definitions, target rules, UI scope, and balance expectations.
- [`v0.2A.md`](./v0.2A.md): implementation clarifications and canonical turn order.
- [`DistrictZero-TDD.md`](../v0.1-district-zero/DistrictZero-TDD.md): existing v0.1 architecture and engine behavior.
- [`Layer1.md`](../../foundation/Layer1.md): long-term product identity and simulation philosophy.

## Goals

- Add three districts, four venues, and two rivals.
- Add optional and required action targets.
- Make action previews reflect operative and target modifiers.
- Track mutable district control and local heat.
- Track rival pressure and disposition.
- Increase rival pressure when the player operates in controlled territory.
- Apply simple passive rival effects at defined pressure thresholds.
- Make existing events respond to recent targets and rival pressure.
- Preserve seeded deterministic simulation.
- Update all harness agents with target-selection behavior.
- Report target and rival impact across simulated runs.
- Preserve the one-screen Black Ledger architecture.
- Publish a production browser build through GitHub Pages.
- Keep deployment automated, static, and independent of backend availability.

## Non-Goals

- City map.
- Procedural district, venue, or rival generation.
- Rival turns, plans, operations, or pathfinding.
- Venue ownership changes.
- District conquest or a new win condition.
- Full diplomacy or relationship systems.
- New operatives.
- New events unless a small addition is required to make a mechanic testable.
- Multi-week operations.
- Inventory or equipment.
- Electron packaging.
- SQLite migration.
- Save-file migration from v0.1.
- Custom domain.
- Telemetry, analytics, authentication, or cloud saves.
- Backend services required by the playable build.

## Architectural Direction

The current dependency direction remains:

```text
Angular UI -> GameFacade -> Pure Engine
Pure Engine -> Model + Content + RNG
Persistence Adapter -> serialized GameState
Harness Agents -> public engine commands and selectors
GitHub Actions -> production Angular artifact -> GitHub Pages
```

No targeting, district, or rival rule belongs in Angular components.

Static definitions and mutable runtime state must remain separate:

```text
Content definitions:
  names
  archetypes
  base values
  tags
  venue modifiers
  rival traits

GameState overlays:
  district control
  district current heat
  rival pressure
  rival disposition
  recent activity
```

## Recommended Source Layout

```text
src/app/engine/
  model/
    actions.ts
    districts.ts
    venues.ts
    rivals.ts
    activity.ts
    game-state.ts
  content/
    district-zero-actions.ts
    rival-territory-districts.ts
    rival-territory-venues.ts
    rival-territory-rivals.ts
    district-zero-events.ts
    district-zero-tuning.ts
  selectors/
    previews.ts
    targets.ts
    territory.ts
    rivals.ts
  simulation/
    new-game.ts
    queue-order.ts
    resolve-action.ts
    resolve-week.ts
    district-effects.ts
    rival-effects.ts
    recent-activity.ts
    select-weekly-event.ts
  harness/
    agents.ts
    simulation-harness.ts
```

Exact file boundaries may vary, but territory rules should not accumulate in one large component or simulation function.

## Domain Identifiers

Use explicit identifier unions for v0.2 content:

```ts
type DistrictId =
  | 'district_violet_ward'
  | 'district_chrome_narrows'
  | 'district_ghostline_market';

type VenueId =
  | 'venue_pale_circuit'
  | 'venue_glass_saint'
  | 'venue_zero_mercy'
  | 'venue_black_halo_exchange';

type RivalId = 'rival_nyx_ardent' | 'rival_knox_marrow';
```

The content registries may derive these unions from readonly definitions if doing so remains readable.

## Static Content Models

```ts
type DistrictArchetype =
  | 'pleasure_district'
  | 'industrial_corridor'
  | 'black_market';

type DistrictDefinition = {
  id: DistrictId;
  name: string;
  archetype: DistrictArchetype;
  baseControl: number;
  baseHeat: number;
  wealth: number;
  secrecy: number;
  volatility: number;
  rivalId?: RivalId;
  venueIds: VenueId[];
  tags: string[];
};
```

```ts
type VenueArchetype =
  | 'failing_lounge'
  | 'memory_lounge'
  | 'fight_club'
  | 'secret_auction';

type VenueDefinition = {
  id: VenueId;
  name: string;
  archetype: VenueArchetype;
  districtId: DistrictId;
  wealthMod: number;
  intelMod: number;
  heatMod: number;
  loyaltyMod: number;
  ruinMod: number;
  controllingRivalId?: RivalId;
  tags: string[];
};
```

```ts
type RivalArchetype = 'velvet_tyrant' | 'chrome_butcher';

type RivalDefinition = {
  id: RivalId;
  name: string;
  archetype: RivalArchetype;
  power: number;
  aggression: number;
  subtlety: number;
  socialControl: number;
  baseDisposition: number;
  preferredPressureAttack: 'heat' | 'loyalty' | 'resources' | 'intel' | 'dominion';
  controlledDistrictIds: DistrictId[];
  controlledVenueIds: VenueId[];
  traits: string[];
};
```

The exact v0.2 content values come from `v0.2.md`.

## Mutable State Models

```ts
type DistrictState = {
  id: DistrictId;
  control: number;
  heat: number;
};

type RivalState = {
  id: RivalId;
  pressure: number;
  disposition: number;
  active: boolean;
};
```

Venue ownership remains static for v0.2. Do not add mutable venue state until ownership can actually change.

```ts
type RecentActivityEntry = {
  id: string;
  week: number;
  actionId: ActionId;
  target?: ActionTarget;
  targetTags: string[];
  rivalId?: RivalId;
  heatDelta: number;
  dominionDelta: number;
};
```

`GameState` gains:

```ts
type GameState = {
  // existing fields
  districts: Record<DistrictId, DistrictState>;
  rivals: Record<RivalId, RivalState>;
  recentActivity: RecentActivityEntry[];
};
```

All new state must remain JSON serializable.

## New Game Initialization

`newGame()` initializes district and rival overlays from static definitions:

```ts
districts[definition.id] = {
  id: definition.id,
  control: definition.baseControl,
  heat: definition.baseHeat,
};

rivals[definition.id] = {
  id: definition.id,
  pressure: 0,
  disposition: definition.baseDisposition,
  active: true,
};
```

`recentActivity` starts empty.

The same seed must still produce identical starting state.

## Action Targets

```ts
type ActionTarget =
  | { type: 'district'; id: DistrictId }
  | { type: 'venue'; id: VenueId }
  | { type: 'rival'; id: RivalId };
```

`QueuedOrder` gains:

```ts
type QueuedOrder = {
  id: string;
  actionId: ActionId;
  assignedOperativeId?: string;
  target?: ActionTarget;
};
```

`ActionDefinition` gains:

```ts
type ActionDefinition = {
  // existing fields
  requiresTarget: boolean;
  allowedTargetTypes: ActionTarget['type'][];
};
```

Target rules:

| Action | Requirement | Allowed types |
| --- | --- | --- |
| Gather Intel | Optional | district, venue, rival |
| Run a Small Job | Required | district, venue |
| Bribe an Official | Optional | district, rival |
| Recruit an Operative | Optional | district, venue |
| Expand Influence | Required | district, venue |
| Lay Low | Optional | district, venue |

## Target Validation

Queue validation must reject:

- Missing target for a required-target action.
- Target on an action whose allowed types do not include that target type.
- Unknown district, venue, or rival ID.
- Inactive rival targets.

Add unavailable reasons:

```ts
type QueueOrderUnavailableReason =
  | ExistingReasons
  | 'target_required'
  | 'target_not_allowed'
  | 'target_not_found'
  | 'target_inactive';
```

Optional actions default to no target. Required actions remain unavailable until a valid target is selected.

## Target Selectors

The engine should expose target options rather than making Angular infer them:

```ts
type ActionTargetOption = {
  target: ActionTarget;
  label: string;
  targetType: ActionTarget['type'];
  districtName?: string;
  rivalName?: string;
  controlledByRivalId?: RivalId;
  controlledByRivalName?: string;
};

function selectActionTargetOptions(
  state: GameState,
  actionId: ActionId,
): ActionTargetOption[];
```

Options should have stable ordering:

1. Districts in content order.
2. Venues grouped under their district in content order.
3. Rivals in content order.

The UI may render these in a native select for v0.2.

## Territory Resolution Helpers

Provide shared helpers:

```ts
function resolveTargetDistrictId(target?: ActionTarget): DistrictId | undefined;
function getTargetTags(target?: ActionTarget): string[];
function getTargetControllerId(target?: ActionTarget): RivalId | undefined;
```

Rules:

- District target resolves to itself.
- Venue target resolves to its parent district.
- Rival target has no district.
- Venue controller takes precedence over the parent district controller.
- Rival target is controlled by that rival.
- Target tags include the target definition tags.
- Venue target tags may include both venue and parent district tags, deduplicated.

## Modifier Order

Action preview and resolution must use the same modifier pipeline:

```text
1. Base action effects.
2. Operative effect modifiers.
3. District modifiers, if target resolves to a district.
4. Venue modifiers, if target is a venue.
5. Resource cost as a separate cost delta during resolution.
6. Complication delta during resolution.
```

The preview displays target-modified expected effects before complication.

Do not duplicate this pipeline between preview and resolution. A shared pure function should calculate adjusted effects.

## District Modifiers

```ts
function applyDistrictModifiers(
  effects: PressureDelta,
  districtDefinition: DistrictDefinition,
): PressureDelta;
```

Rules:

- If `resources` exists in the effect delta, add `round((wealth - 50) * 8)`.
- If `intel` exists, add `round((secrecy - 50) / 15)`.
- If positive `heat` exists, add `round(currentDistrictHeat / 20)`.
- Negative Heat is not made more negative by district heat.
- Missing pressure keys remain missing.

Use current district heat for the Heat modifier and static wealth/secrecy for reward modifiers.

## Venue Modifiers

```ts
function applyVenueModifiers(
  effects: PressureDelta,
  venue: VenueDefinition,
): PressureDelta;
```

Rules:

- Apply `wealthMod * 150` only when the action already changes Resources.
- Apply `intelMod` only when the action already changes Intel.
- Apply `heatMod` only when the action already changes Heat.
- Apply `loyaltyMod` only when the action already changes Loyalty.
- Apply `ruinMod` only when the action already changes Ruin.
- Modifiers may improve or worsen negative effects.
- Zero results may be omitted from the normalized delta.

This preserves action identity: a venue does not cause an unrelated action to suddenly generate every pressure.

## Risk Calculation

Risk remains based on:

- Action base risk.
- Assigned operative skill.
- Operative stress and loyalty.
- Local district heat.
- District control.

Target additions:

```ts
localHeatRisk = Math.floor(
  Math.max(0, districtState.heat - districtDefinition.baseHeat) / 10,
);

controlRiskReduction =
  districtState.control >= 70 ? 4 :
  districtState.control >= 40 ? 2 :
  0;
```

Final risk:

```ts
risk = existingRisk + localHeatRisk - controlRiskReduction;
```

Continue clamping risk to the existing minimum and maximum.

Rival pressure does not directly modify action risk in v0.2. It is shown as attention and affects passive consequences/events.

## Rival Pressure

Base pressure gain:

```ts
const RIVAL_PRESSURE_BY_ACTION: Record<ActionId, number> = {
  gather_intel: 4,
  run_small_job: 8,
  bribe_official: 5,
  recruit_operative: 3,
  expand_influence: 12,
  lay_low: 0,
};
```

Pressure is added only when `getTargetControllerId(target)` returns a rival.

```ts
nextPressure = clamp(currentPressure + gain, 0, 100);
```

No pressure decay is required in v0.2.

Pressure tiers:

```ts
type RivalPressureTier = 'watching' | 'interested' | 'provoked' | 'retaliating';

pressure < 25  -> watching
pressure < 50  -> interested
pressure < 75  -> provoked
otherwise      -> retaliating
```

The preview must show:

- Rival name.
- Exact pressure gain.
- Projected pressure.
- Projected tier.

## Local District Changes

After each resolved targeted order:

### Control

```ts
expand_influence:
  district target -> +12
  venue target -> +8

run_small_job:
  district or venue target -> +3

gather_intel:
  district or venue target -> +1
```

Other actions add no control by default.

Clamp district control to `0..100`.

### Local heat

If the resolved action has positive global Heat and resolves to a district:

```ts
localHeatGain = Math.ceil(resolvedPositiveHeat / 3);
```

Use the final resolved action Heat delta after operative, target, and complication modifiers.

Negative global Heat does not lower district heat through this rule.

At weekly cooling:

```ts
district.heat = Math.max(definition.baseHeat, district.heat - 1);
```

Clamp local heat to `0..100`.

## Recent Activity

Record one `RecentActivityEntry` after each resolved order.

It captures:

- Week.
- Action.
- Target.
- Target tags.
- Rival controller.
- Final action Heat delta.
- Final action Dominion delta.

At the end of the week, prune entries older than two weeks:

```ts
entry.week >= currentWeek - 2
```

Recent activity is mechanical context, not player prose. The event log remains the player-facing history.

## Passive Rival Effects

Apply passive rival effects after global drift and local district cooling.

Nyx Ardent:

```ts
if (nyx.active && nyx.pressure >= 60 && state.pressures.intel < 20) {
  loyalty -= 3;
}
```

Knox Marrow:

```ts
if (knox.active && knox.pressure >= 60) {
  heat += 3;
}
```

Each applied passive effect creates an event log entry with:

- Rival name.
- Reason.
- Exact pressure delta.
- Rival-related tags where appropriate.

Apply pressure clamps after passive effects.

Passive effects happen at most once per rival per week.

## Canonical Week Resolution

The v0.2 order is:

```text
1. Validate and queue orders with operative and target.
2. Player advances the week.
3. For each queued order:
   a. resolve base action effects
   b. apply operative modifiers
   c. apply district modifiers
   d. apply venue modifiers
   e. calculate risk
   f. resolve complication
   g. apply global effects and cost
   h. update local district control
   i. update local district heat
   j. add rival pressure
   k. record recent activity
   l. append player-facing logs
4. Apply idle operative stress recovery.
5. Apply global weekly drift.
6. Cool local district heat.
7. Apply passive rival threshold effects.
8. Select the weekly event using current state and recent activity.
9. Player resolves one event choice.
10. Apply event effects.
11. Check win/loss.
12. Increment the week if the run continues.
```

The existing rule remains: loss conditions take precedence if victory and loss thresholds are crossed simultaneously.

For v0.2, action, drift, and passive rival effects may put the run into a failing state, but the weekly event response still resolves before the final win/loss check. This follows the canonical order in `v0.2A.md`.

## Event Weighting

Keep the existing event list.

Extend event weighting with:

```ts
type EventWeightContext = {
  recentTargetTags: Set<string>;
  recentRivalIds: Set<RivalId>;
  rivalPressures: Record<RivalId, number>;
  districtHeat: Record<DistrictId, number>;
};
```

Context additions:

| Condition | Event adjustment |
| --- | --- |
| Recent `nightlife` target | Liaison Favor +8 |
| Recent `violence` target | Job Goes Loud +8 |
| Recent `memory` target | Unexpected Windfall +8, Blackmail Lead +8 |
| Nyx pressure >= 50 | Liaison Favor +10, Operative Wants More +10 |
| Knox pressure >= 50 | Rival Tests Border +10, Job Goes Loud +10 |

Local district heat may increase existing Heat-tagged event weights:

```text
Any recently targeted district with current heat >= 60:
Heat-tagged events +4
```

Apply the existing recent-negative-event penalty after all positive context modifiers.

Weighted selection remains deterministic through the existing seeded RNG cursor.

## Action Preview

Extend `ActionPreview`:

```ts
type ActionPreview = {
  // existing fields
  selectedTarget?: ActionTarget;
  targetLabel?: string;
  adjustedEffects: PressureDelta;
  riskChance: number;
  riskLabel: RiskLabel;
  rivalAttention?: {
    rivalId: RivalId;
    rivalName: string;
    pressureGain: number;
    currentPressure: number;
    projectedPressure: number;
    projectedTier: RivalPressureTier;
  };
  localImpact?: {
    districtId: DistrictId;
    districtName: string;
    controlGain: number;
    localHeatGain: number;
  };
};
```

Preview and resolution must agree for deterministic non-complication effects.

## Angular State

Selected targets are transient UI state, like currently selected operatives:

```ts
selectedTargets: Signal<Partial<Record<ActionId, ActionTarget | undefined>>>;
```

Queued orders store their target permanently in `GameState`.

When an order queues successfully:

- Clear that action card's selected operative.
- Clear that action card's selected target.

New Run and Reset clear all transient selections.

## UI Changes

Keep the current one-screen Black Ledger.

### Action cards

Add:

- Target selector.
- Required-target disabled state.
- Target-adjusted effects.
- Rival attention warning.
- Local control/heat preview.

Target selector labels should distinguish venues from districts:

```text
Violet Ward
Violet Ward / The Pale Circuit
Violet Ward / The Glass Saint
Nyx Ardent
```

### Territory panel

Add a compact location panel showing:

- District name and archetype.
- Current control.
- Current/base local heat.
- Controlling rival, if any.
- Venues and their meaningful modifiers.

No map is required.

### Rival panel

Show:

- Rival name.
- Pressure and tier.
- Disposition.
- Attack style.
- Controlled district/venue summary.

### Queued orders

Show target label next to operative assignment.

### Event log

Show rival passive-effect entries and relevant target/rival names.

### Debug panel

Add:

- District state JSON.
- Rival state JSON.
- Recent activity JSON.
- Exact target modifier preview.

## Persistence

The v0.2 state schema is not compatible with v0.1 saves.

Use a new storage key:

```text
haunted-apex:v0.2:current-run
```

The storage validator must require:

- Complete district overlay records.
- Complete rival overlay records.
- `recentActivity` array.
- Valid target shapes on queued orders.

Do not migrate the v0.1 current run. A missing v0.2 save starts a new run.

Future versions should introduce an explicit schema version before save compatibility becomes important.

## GitHub Pages Deployment

v0.2 adds a public, playable static build at the repository project-site URL:

```text
https://jeremyaaron.github.io/haunted-apex/
```

GitHub Pages is a valid deployment target while Haunted Apex remains a client-rendered Angular application with browser-local persistence and no required backend.

### Build contract

The production build must use the repository subpath as its base href:

```bash
npm run build -- --configuration production --base-href /haunted-apex/
```

With the current Angular application builder, the Pages artifact is:

```text
dist/haunted-apex/browser
```

Scripts, styles, fonts, images, and other runtime assets must resolve beneath `/haunted-apex/`. Root-relative application asset paths are not permitted.

### Routing

The v0.2 application does not use Angular Router, so no SPA fallback or hash-routing configuration is required.

If client-side routes are introduced before release, Pages compatibility must be preserved by using hash routing for v0.2. A `404.html` rewrite workaround is not required for this release.

### Workflow

Add:

```text
.github/workflows/deploy-pages.yml
```

The workflow must:

1. Run on pushes to the release branch used for Pages, expected to be `main`.
2. Support `workflow_dispatch` for manual recovery and verification.
3. Check out the repository.
4. Install the Node version from `.nvmrc`.
5. Install dependencies with `npm ci`.
6. Run the automated tests in non-watch mode.
7. Build with the `/haunted-apex/` base href.
8. Upload `dist/haunted-apex/browser` as the Pages artifact.
9. Deploy through the `github-pages` environment.

Use the official GitHub Pages Actions:

```text
actions/configure-pages
actions/upload-pages-artifact
actions/deploy-pages
```

The deployment job requires:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

Do not add third-party Angular deployment packages when the official artifact workflow is sufficient.

### Save behavior

The Pages build continues using localStorage. Saves are browser- and origin-local:

- A localhost save is not available on the Pages origin.
- Saves do not synchronize across browsers or devices.
- Clearing site data removes the save.
- The existing v0.2 storage key and validation rules remain unchanged.

These constraints are acceptable for the prototype and should not be disguised as cloud persistence.

### Operational constraints

The deployment must remain a static prototype:

- No secrets or API credentials in the Angular bundle.
- No required backend, telemetry endpoint, or external runtime service.
- No sensitive or commercial transactions.
- Build artifact size should be reported in CI and reviewed as art/audio are introduced.
- Asset paths must be tested against the repository subpath, not only localhost root hosting.

GitHub currently documents a 1 GB published-site limit, a 10-minute deployment timeout, and a soft 100 GB monthly bandwidth limit. These are monitoring thresholds, not targets. Reassess Pages before large art or music libraries approach those constraints.

### Repository documentation

After the first successful deployment, the root README must link directly to the playable prototype. Until then, it should identify the planned URL without implying that deployment is live.

### References

- [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Angular deployment guidance](https://angular.dev/tools/cli/deployment)

## Harness Agent Updates

All agents choose from legal action-operative-target combinations.

### RandomBot

- Select random legal order option.
- Select random legal target as part of that option.

### CautiousBot

- Prefer low local heat.
- Prefer uncontrolled targets and The Pale Circuit.
- Avoid rival-controlled targets.
- Continue prioritizing survival over Dominion.

### AggressiveBot

- Prefer the highest Dominion outcome.
- Prefer high-control gains.
- Ignore rival pressure until global Heat >= 85.

### GreedyBot

- Prefer highest net Resources.
- Prefer high Intel when it creates economic event options.
- Favor Zero Mercy and Black Halo Exchange.
- Continue accepting dangerous pressure.

### OperatorBot

Report label:

```text
Operator / Sane
```

Policy:

- Score the full projected outcome.
- Prefer the best reward/risk combination.
- Avoid rival-controlled targets when that rival is at pressure >= 60 unless the move can immediately win.
- Prefer low-heat targets when global Heat >= 65.
- Spend safety margin on Dominion when stable.

The agent interface should receive fully legal order options. Agents should not duplicate target validation.

## Harness Reporting

Preserve existing report fields and add:

```ts
type TargetReport = {
  targetId: string;
  selections: number;
  complications: number;
  complicationRate: number;
  wins: number;
  losses: number;
};
```

Batch summaries should include:

- Most selected target.
- Most dangerous target by complication rate, with a minimum sample threshold.
- Average final Nyx pressure.
- Average final Knox pressure.
- Average district control and local heat.
- Loss causes.
- Count of event selections receiving rival-pressure weight.
- Count of event selections receiving target-tag weight.

CSV output may use separate sections rather than forcing all values into one wide row.

## Logging and Diagnostics

Action resolution logs should include:

- Action label.
- Operative.
- Target.
- Risk and roll.
- Global pressure delta.
- District control delta.
- District local heat delta.
- Rival pressure delta.

This detail may remain in debug/prototype copy and can be made more atmospheric later.

## Testing Strategy

### Model/content tests

- All district venue IDs resolve.
- All venue district IDs resolve.
- All rival controlled IDs resolve.
- District and rival overlays initialize from definitions.

### Target validation tests

- Required action cannot queue without target.
- Optional action can queue without target.
- Unsupported target type is rejected.
- Unknown target ID is rejected.
- Queued order preserves target.

### Modifier tests

- District wealth modifies a Resource-producing action.
- District secrecy modifies an Intel-producing action.
- Current district heat modifies positive Heat.
- Venue modifiers apply after district modifiers.
- Venue does not add unrelated pressure keys.
- Operative, district, and venue modifiers compose predictably.

### Risk tests

- Local heat increases risk.
- Control at 40 reduces risk by 2.
- Control at 70 reduces risk by 4.
- Risk remains clamped.

### Resolution tests

- Targeted action updates district control.
- Positive Heat updates local heat.
- Local heat cools but never below base.
- Rival-controlled target increases the correct rival pressure.
- Uncontrolled target does not increase rival pressure.
- Recent activity records structured target context.
- Recent activity prunes old entries.

### Rival tests

- Nyx passive applies only at pressure >= 60 and Intel < 20.
- Knox passive applies only at pressure >= 60.
- Passive effects apply once per week.
- Pressure tiers resolve at exact boundaries.

### Event tests

- Recent nightlife increases Liaison Favor weight.
- Recent violence increases Job Goes Loud weight.
- Recent memory increases both intended event weights.
- Nyx and Knox pressure adjust intended events.
- Same seed/state/context selects the same event.

### UI tests

- Required-target queue button is disabled without target.
- Selecting target updates preview.
- Rival warning renders for controlled target.
- Queued order renders its target.
- Territory and rival panels render starting content.

### Persistence tests

- v0.2 state round-trips.
- v0.1-shaped save is rejected.
- Invalid target in stored queued order is rejected.

### Harness tests

- Every agent produces valid targeted orders.
- No strategy stalls because a required target is missing.
- Batch report includes all five agents.
- Target and rival report sections contain samples.

### Deployment tests

- Production build succeeds with base href `/haunted-apex/`.
- Generated `index.html` contains the repository-subpath base href.
- Pages workflow cannot deploy before tests and build succeed.
- Uploaded artifact is `dist/haunted-apex/browser`.
- Deployed scripts, styles, and assets return successfully.
- localStorage save survives refresh on the Pages origin.
- Deployed game remains functional without backend requests.

## Balance Targets

Initial v0.2 targets:

```text
Operator:   55-75%
Aggressive: 35-60%
Greedy:     30-55%
Cautious:   low, usually Dominion shortfall
Random:     5-12%
```

Interpretation:

- Operator below 45% means targets/rivals are too punitive.
- Aggressive above 75% means rival pressure and Heat consequences are too soft.
- Cautious winning frequently means safe targets are too rewarding.
- Similar outcomes across targets mean target modifiers are too weak.
- Nearly universal avoidance of rival territory means rival pressure is too punitive.

These are tuning guides, not acceptance tests.

## Acceptance Criteria

v0.2.0 is complete when:

- An eight-week run remains playable through the Angular UI.
- Required actions cannot queue without a target.
- Every target visibly changes preview or territorial/rival context.
- Rival-controlled actions increase the correct rival pressure.
- District control and local heat visibly change.
- Rival passive effects can trigger and are logged.
- Existing event selection responds to target tags and rival pressure.
- All five agents complete deterministic simulations.
- Harness output reports target and rival impact.
- A production build loads successfully from `/haunted-apex/`.
- GitHub Actions deploys the tested browser artifact to GitHub Pages.
- The deployed game starts, saves, reloads, and completes a run without a backend.
- The repository README links to the live prototype after deployment succeeds.
- Build and tests pass.
- No map, full rival AI, or ownership system has entered scope.

## Open Design Status

No blocking product questions remain for implementation planning.

The following are intentionally deferred:

- How district control ultimately interacts with ownership.
- Whether local heat can create district-specific failure states.
- How rival disposition changes.
- Whether rival pressure decays.
- How fixed costs become player-selected assets such as venues, fronts, or penthouses.

Those questions should not be answered by v0.2 implementation unless required by a discovered contradiction.
