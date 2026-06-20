# Haunted Apex v0.9.1 Signal Clarity TDD

## Purpose

This document defines the technical design for **Haunted Apex v0.9.1: Signal Clarity**.

v0.9.0 made the game teachable:

```text
Current GameState + legal previews + Handler policy
  -> exact recommendations
  + visible guidance
  + validated Training and Standard runs
```

v0.9.1 makes the game diagnosable and media-ready:

```text
Harness runs + major source attribution
  -> Strategic Fingerprint
  + command usage
  + source breakdown
  + system engagement
  + dominant loop warnings

Static media registry + optional entity references
  -> campaign splash
  + operative thumbnails
  + operative hero images
  + safe fallbacks
```

The release succeeds when future balance work can be driven by evidence and the UI has safe,
reusable places for artwork without a full immersion redesign.

## Source Documents

- [`v0.9.1.md`](./v0.9.1.md): Signal Clarity vision, telemetry goals, media slots, scope, and
  acceptance criteria.
- [`v0.9.1A.md`](./v0.9.1A.md): locked clarifications for telemetry scope, privacy, report format,
  attribution precision, media pathing, and validation policy.
- [`Handler-TDD.md`](../v0.9-the-handler/Handler-TDD.md): HandlerBot, Advisor, Training, and
  validation architecture.
- [`Handler-ImplementationPlan.md`](../v0.9-the-handler/Handler-ImplementationPlan.md): current
  release gate and validation precedent.
- [`CityWakes-TDD.md`](../v0.8-the-city-wakes/CityWakes-TDD.md): Campaign Tension, opening
  briefing, and campaign harness architecture.
- [`Accords-TDD.md`](../v0.7-the-accords/Accords-TDD.md): Faction and Accord systems.
- [`Fronts-TDD.md`](../v0.6-fronts/Fronts-TDD.md): Front ownership, yields, and exposure.
- [`Entanglements-TDD.md`](../v0.5-entanglements/Entanglements-TDD.md): Contact services and
  relationship metrics.
- [`BlackLedger-TDD.md`](../v0.4-the-black-ledger/BlackLedger-TDD.md): Ledger entries and use
  options.
- [`Roster-TDD.md`](../v0.3-the-roster/Roster-TDD.md): Operative definitions, state, and stress.

When these documents differ, `v0.9.1A.md` is canonical for v0.9.1 behavior.

## Goals

- Add a harness-first Strategic Fingerprint report.
- Extend readable CSV-style harness output; do not add JSON export in v0.9.1.
- Track command usage by agent and Campaign Tension.
- Track same-week command pairs and repeated dominant loops.
- Track major-source pressure attribution for Dominion, Heat, Resources, and other pressures.
- Track system engagement for Fronts, Accords, Ledger, Contacts, Bribe, and Lay Low.
- Report wins without Fronts, Accords, Ledger, or Contacts.
- Generate non-failing loop warnings.
- Keep telemetry fully local; do not add remote analytics, user tracking, beacons, or Pages
  collection.
- Keep Handler validation as a documented local/manual release gate.
- Add a static media registry.
- Add optional media references to Campaign Tension, Operative, and Rival definitions.
- Render campaign splash art when available.
- Render operative thumbnails when available.
- Render operative hero images in operative detail when available.
- Preserve safe fallbacks when media is missing.
- Use runtime asset paths under `assets/media/images/...`.
- Avoid major balance changes.

## Non-Goals

- Remote telemetry.
- Product analytics.
- GitHub Pages event collection.
- JSON export.
- Charting.
- Player-facing analytics dashboard.
- Perfect forensic micro-delta attribution.
- Splitting every action result into base, operative, target, campaign, trait, and affinity deltas.
- Full immersion redesign.
- Audio player.
- Large media library requirement.
- Runtime media loading from a CDN.
- Image upload tooling.
- Asset conversion pipeline.
- Rival media rendering unless implementation discovers a trivial existing surface.
- Apex Capacity, Dominion caps, diminishing returns, or command rebalance.
- Save schema invalidation unless implementation introduces a real `GameState` shape change.

## Current Architecture Summary

The current app has the right boundaries for v0.9.1:

```text
Angular App
  -> GameFacade
  -> pure TypeScript engine
  -> localStorage persistence

Harness Agents
  -> public engine commands/selectors
  -> HarnessRunResult
  -> HarnessBatchReport
  -> formatBatchReport()
```

Important current facts:

- `simulateHarnessRun()` already records per-run action usage, target usage, contacts, ledger,
  fronts, factions, operatives, and Handler validation diagnostics.
- `formatBatchReport()` already emits multi-section CSV-style output.
- `advanceWeek()` returns `orderResolutions`, including each queued order and its resolved pressure
  delta.
- Weekly front yields, accord effects, drift, local cooling, and rival passive effects occur inside
  `advanceWeek()` after order resolution.
- `resolveEventChoice()` applies event-choice effects after the pending event is selected.
- Campaign Tensions already have opening briefing UI.
- Operatives already have compact cards and a detail modal.
- Angular asset configuration copies files from `public/`.

v0.9.1 should extend this architecture. Telemetry should live in the pure engine and be displayed by
the existing debug/harness UI. Media definitions should be static content metadata with Angular UI
rendering only the selected asset references.

## High-Level Architecture

Add a small analytics domain under the engine:

```text
src/app/engine/analytics/
  telemetry-types.ts
  pressure-attribution.ts
  command-usage-report.ts
  command-pair-report.ts
  source-breakdown-report.ts
  system-engagement-report.ts
  dominant-loop-detection.ts
  strategic-fingerprint-report.ts
  index.ts
```

Extend the harness to collect and aggregate analytics:

```text
src/app/engine/harness/simulation-harness.ts
  HarnessRunResult.telemetry
  AgentBatchSummary.strategicFingerprint
  AgentBatchSummary.commandUsageReports
  AgentBatchSummary.commandPairReports
  AgentBatchSummary.sourceBreakdownReports
  AgentBatchSummary.systemEngagementReport
  AgentBatchSummary.loopWarnings
```

Add media support through content/model/UI helpers:

```text
src/app/engine/model/media.ts
src/app/engine/content/media-assets.ts
src/app/engine/media/media-selectors.ts

src/app/ui/media/
  media-image.component.ts
  entity-thumb.component.ts
  hero-image.component.ts
  campaign-splash.component.ts
```

The exact component file layout can adapt to the current Angular style. If standalone components are
too much ceremony for this patch, equivalent template helpers in `App` are acceptable as an
intermediate implementation, provided the media registry and selectors remain engine/content
concerns.

## Telemetry Model

Telemetry is local runtime data produced by harness runs. It is not persisted in saves and is not
transmitted anywhere.

```ts
export type TelemetryActorType = 'bot' | 'player';

export type PressureChangeSourceKind =
  | 'action'
  | 'event'
  | 'contact'
  | 'ledger'
  | 'front'
  | 'faction'
  | 'accord'
  | 'campaign'
  | 'drift'
  | 'rival'
  | 'system';

export type TelemetryEntryKind =
  | 'command_used'
  | 'event_choice_used'
  | 'pressure_delta'
  | 'system_engaged'
  | 'operative_assigned';

export type PressureAttributionEntry = {
  kind: 'pressure_delta';
  week: number;
  sourceKind: PressureChangeSourceKind;
  sourceId: string;
  sourceLabel: string;
  pressure: PressureId;
  delta: number;
};

export type CommandUsedTelemetryEntry = {
  kind: 'command_used';
  week: number;
  actionId: ActionId;
  actionLabel: string;
  targetKey?: string;
  assignedOperativeId?: OperativeId;
};

export type SystemEngagedTelemetryEntry = {
  kind: 'system_engaged';
  week: number;
  system:
    | 'front'
    | 'front_upgrade'
    | 'accord'
    | 'ledger'
    | 'contact'
    | 'bribe'
    | 'lay_low';
  sourceId: string;
};

export type RunTelemetry = {
  runId: string;
  actorType: TelemetryActorType;
  botId?: string;
  campaignTensionId: CampaignTensionId;
  seed: string;
  entries: TelemetryEntry[];
};
```

`RunTelemetry` should be generic enough for future player-run analysis, but v0.9.1 reporting targets
bot/harness runs only.

## Major-Source Attribution

v0.9.1 uses major-source attribution. It should answer strategic questions, not create perfect
accounting.

Required attribution:

```text
Queued order resolved delta -> action
Event choice delta -> event
Contact option use -> contact
Ledger use -> ledger
Front weekly yield / upgrade -> front
Accord broker / weekly effect -> accord
Weekly drift -> drift
Rival passive effect -> rival
Campaign setup/modifier effect -> campaign when visible in harness setup
```

Allowed simplification:

```text
If an action result includes operative, target, campaign, trait, or affinity modifiers, attribute
the resolved command delta to action.
```

Operative contribution should be reported separately through assignment and engagement metrics, not
by splitting each action delta.

### Pressure Diff Helper

Add a reusable helper:

```ts
export function diffPressures(
  before: Pressures,
  after: Pressures,
): readonly PressureDeltaEntry[];
```

This helper should return only non-zero deltas and should preserve signed values. Report builders can
then filter:

```text
Dominion source breakdown: pressure === 'dominion' and delta > 0
Heat relief breakdown: pressure === 'heat' and delta < 0
Resources gained breakdown: pressure === 'resources' and delta > 0
```

### Instrumentation Points

Preferred implementation order:

1. Use `advanceWeek().orderResolutions` for per-order action attribution.
2. Add before/after pressure snapshots around `resolveEventChoice()` in the harness for event
   attribution.
3. Add coarse before/after snapshots inside `advanceWeek()` or a companion diagnostic helper for:
   - weekly accord effects,
   - weekly front yields,
   - weekly drift,
   - local cooling,
   - rival passive effects.
4. Use existing contact, ledger, front, and accord run stats to add system engagement entries where
   direct pressure attribution is too invasive.

If instrumenting every weekly sub-step inside `advanceWeek()` creates too much churn, v0.9.1 may
ship with action/event attribution plus system engagement reports, then broaden source attribution in
a later patch. The TDD target is major-source attribution where practical without destabilizing
simulation code.

## Command Usage Reports

Command usage already exists as `actionUsage`. v0.9.1 should turn it into campaign-aware report rows.

```ts
export type CommandUsageReport = {
  agentId: string;
  agentLabel: string;
  campaignId: CampaignTensionId | 'all';
  campaignName: string;
  actionId: ActionId;
  actionLabel: string;
  count: number;
  percentage: number;
};
```

Percentage denominator:

```text
All commands used by that agent in that campaign group.
```

The report should include `all` campaign rows and per-campaign rows.

## Command Pair Reports

Track pairs of commands used in the same week. Order does not matter for v0.9.1.

```ts
export type CommandPairReport = {
  agentId: string;
  agentLabel: string;
  campaignId: CampaignTensionId | 'all';
  actionA: ActionId;
  actionB: ActionId;
  actionALabel: string;
  actionBLabel: string;
  count: number;
  percentageOfWeeks: number;
};
```

Pair collection rules:

- Use the queued orders resolved by `advanceWeek()`.
- Sort action ids before forming the pair key.
- If a week has two commands, record one pair.
- If a future balance pass allows three or more commands, record each unordered two-command
  combination.
- Do not count weeks with fewer than two commands.

## Dominant Loop Detection

Loop warnings are diagnostic. They must not fail tests, builds, or validation.

```ts
export type LoopWarningReport = {
  agentId: string;
  agentLabel: string;
  campaignId: CampaignTensionId | 'all';
  warningType:
    | 'dominant_pair'
    | 'top_two_command_share'
    | 'wins_without_fronts'
    | 'wins_without_accords'
    | 'wins_without_ledger'
    | 'wins_without_contacts';
  value: number;
  threshold: number;
  message: string;
};
```

Initial warning thresholds:

```text
Dominant pair appears in more than 35% of resolved weeks.
Top two commands account for more than 60% of commands.
Winning runs without Front investment exceed 75%.
Winning runs without Accord brokered exceed 75%.
Winning runs without Ledger use exceed 75%.
Winning runs without Contact service exceed 75%.
```

Thresholds are report heuristics, not balance rules.

## Source Breakdown Reports

Aggregate `pressure_delta` telemetry entries by source kind and source id.

```ts
export type SourceBreakdownReport = {
  agentId: string;
  agentLabel: string;
  campaignId: CampaignTensionId | 'all';
  pressure: PressureId;
  sourceKind: PressureChangeSourceKind;
  sourceId: string;
  sourceLabel: string;
  totalDelta: number;
  positiveDelta: number;
  negativeDelta: number;
};
```

CSV output should be broad enough for all pressures but especially useful for:

```text
Dominion gained by source.
Heat relief by source.
Resources gained by source.
```

The formatter should either emit one `source_breakdown` section for all pressures or named sections
for the headline pressures. Prefer one section first to keep the output regular.

## System Engagement Reports

System engagement counts whether a run used each system at least once.

```ts
export type SystemEngagementReport = {
  agentId: string;
  agentLabel: string;
  campaignId: CampaignTensionId | 'all';
  runs: number;
  wins: number;
  runsWithFrontInvestment: number;
  runsWithFrontUpgrade: number;
  runsWithAccordBrokered: number;
  runsWithLedgerUse: number;
  runsWithContactService: number;
  runsWithBribe: number;
  runsWithLayLow: number;
  winsWithNoFronts: number;
  winsWithNoAccords: number;
  winsWithNoLedger: number;
  winsWithNoContacts: number;
};
```

Detection rules:

```text
Front investment: command target or result establishes a front.
Front upgrade: existing front upgrade command/effect is used.
Accord brokered: Broker Accord succeeds.
Ledger use: Work the Ledger succeeds with a Ledger target.
Contact service: Manage Contact succeeds with a Contact target.
Bribe: Bribe an Official command succeeds.
Lay Low: Lay Low command succeeds.
```

Use action ids and resolved order diagnostics where possible; fall back to existing run stats when
that is lower-risk.

## Strategic Fingerprint Report

Strategic Fingerprint is the high-level diagnosis for a bot/campaign group.

```ts
export type StrategicFingerprintReport = {
  agentId: string;
  agentLabel: string;
  campaignId: CampaignTensionId | 'all';
  campaignName: string;
  runs: number;
  wins: number;
  winRate: number;
  totalCommands: number;
  averageCommandsUsed: number;
  topCommand?: CommandUsageReport;
  topPair?: CommandPairReport;
  topDominionSource?: SourceBreakdownReport;
  topHeatReliefSource?: SourceBreakdownReport;
  dominantLoopWarning?: LoopWarningReport;
};
```

The report should be compact enough to scan before the detailed sections.

## Harness Output Format

Extend `formatBatchReport()` with these sections:

```text
strategic_fingerprint
agent,agentLabel,campaign,runs,wins,winRate,totalCommands,avgCommands,topCommand,topCommandPct,topPair,topPairPct,topDominionSource,topHeatReliefSource,warning

command_usage
agent,agentLabel,campaign,actionId,actionLabel,count,percentage

command_pairs
agent,agentLabel,campaign,actionA,actionB,pairLabel,count,percentageOfWeeks

source_breakdown
agent,agentLabel,campaign,pressure,sourceKind,sourceId,sourceLabel,totalDelta,positiveDelta,negativeDelta

system_engagement
agent,agentLabel,campaign,runs,wins,runsWithFrontInvestment,runsWithFrontUpgrade,runsWithAccordBrokered,runsWithLedgerUse,runsWithContactService,runsWithBribe,runsWithLayLow,winsWithNoFronts,winsWithNoAccords,winsWithNoLedger,winsWithNoContacts

loop_warnings
agent,agentLabel,campaign,warningType,value,threshold,message
```

The existing report sections should remain. v0.9.1 adds sections; it should not remove older
sections unless a section is truly redundant and tests are updated intentionally.

## Player-Facing Summary

Player-facing telemetry is optional and low priority in v0.9.1.

Allowed compact hook in completed run summary:

```text
Top command used
Main Dominion source
Main Heat relief source
Systems used: Fronts / Accords / Ledger / Contacts
```

Do not add a player-facing analytics dashboard. If the compact hook creates layout risk, defer it.

## Media Model

Add media types under `engine/model/media.ts`:

```ts
export type MediaAssetId = string & { readonly __brand: 'MediaAssetId' };

export type MediaAssetKind = 'thumb' | 'hero' | 'splash';

export type MediaAsset = {
  id: MediaAssetId;
  kind: MediaAssetKind;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  focalPoint?: {
    x: number;
    y: number;
  };
  tags?: readonly string[];
};
```

If the repo avoids branded string types in nearby model files, plain `string` aliases are acceptable:

```ts
export type MediaAssetId = string;
```

The important contract is stable ids plus runtime paths.

## Media Registry

Add static registry content:

```text
src/app/engine/content/media-assets.ts
```

Example:

```ts
export const MEDIA_ASSETS: Record<MediaAssetId, MediaAsset> = {
  op_mara_voss_thumb: {
    id: 'op_mara_voss_thumb',
    kind: 'thumb',
    src: 'assets/media/images/thumb/op-mara-voss.webp',
    alt: 'Mara Voss portrait',
  },
  campaign_ghostline_signal_splash: {
    id: 'campaign_ghostline_signal_splash',
    kind: 'splash',
    src: 'assets/media/images/splash/campaign-ghostline-signal.webp',
    alt: 'Ghostline Signal campaign splash',
  },
};
```

Runtime assets live under:

```text
public/assets/media/images/
  splash/
  thumb/
  hero/
```

The registry can contain references before every asset exists, but UI rendering must tolerate
missing asset ids. Browser-level 404s from committed registry entries should be avoided when
possible by only wiring assets that exist.

## Entity Media References

Extend static definitions only. Do not add media fields to mutable `GameState`.

```ts
export type EntityMediaReference = {
  thumbImageId?: MediaAssetId;
  heroImageId?: MediaAssetId;
};

export type CampaignMediaReference = {
  splashImageId?: MediaAssetId;
};
```

Extend definitions:

```ts
type CampaignTensionDefinition = {
  // existing fields
  media?: CampaignMediaReference;
};

type OperativeDefinition = {
  // existing fields
  media?: EntityMediaReference;
};

type RivalDefinition = {
  // existing fields
  media?: EntityMediaReference;
};
```

Rival media rendering is not required for v0.9.1.

## Media Selectors

Add lookup helpers:

```ts
export function getMediaAsset(assetId: MediaAssetId | undefined): MediaAsset | undefined;

export function selectCampaignSplash(
  campaign: CampaignTensionDefinition | undefined,
): MediaAsset | undefined;

export function selectOperativeThumb(
  operative: OperativeDefinition | undefined,
): MediaAsset | undefined;

export function selectOperativeHero(
  operative: OperativeDefinition | undefined,
): MediaAsset | undefined;
```

Selectors should validate kind where practical. For example, if an operative thumb references a
`hero` asset, return `undefined` and let the fallback render.

## Media UI

### Campaign Splash

Opening briefing behavior:

```text
If selected Campaign Tension has a valid splash asset:
  render splash image in the briefing panel.
Else:
  render existing styled briefing treatment.
```

Splash design rules:

- Do not make the briefing full-screen.
- Keep existing briefing copy readable.
- Use `object-fit: cover`.
- Use a stable aspect ratio.
- Use gradient overlay only if text sits over the image.
- Add `loading="lazy"` unless the image is immediately above the fold and lazy loading creates
  visible delay.

### Operative Thumbnail

Operative card behavior:

```text
If operative has valid thumb asset:
  render thumbnail.
Else:
  render current initials fallback.
```

Thumbnail design rules:

- Do not enlarge cards dramatically.
- Preserve existing roster scanability.
- Use fixed dimensions or aspect ratio.
- Use `object-fit: cover`.
- Keep initials fallback visually aligned with image thumbnails.

### Operative Detail Hero

Operative detail behavior:

```text
If operative has valid hero asset:
  render hero image at the top of the detail view.
Else:
  omit hero or render a restrained placeholder.
```

Hero design rules:

- Detail views carry immersion; compact cards stay functional.
- Use a stable aspect ratio.
- Lazy-load the image because detail views open on demand.
- Do not require every operative to have a hero image.

## Fallback and Error Handling

Required fallback behavior:

- Missing media reference returns `undefined`.
- Missing media registry entry returns `undefined`.
- Wrong asset kind returns `undefined`.
- UI falls back to existing initials/styled panels.
- Image `alt` text is always present when an image renders.
- Layout dimensions are stable before the image loads.

Optional enhancement:

```text
If an image emits an error event, hide the failed image and show the fallback.
```

This is useful but not required if only committed assets are wired.

## Persistence and Versioning

v0.9.1 should not persist telemetry or media state.

Default persistence decision:

```text
CURRENT_SAVE_SCHEMA_VERSION remains 9.
CURRENT_RUN_STORAGE_KEY remains haunted-apex:v0.9:current-run.
Existing v0.9 saves remain compatible.
```

Package metadata should become `0.9.1` during release readiness.

`CURRENT_GAME_VERSION` may become `0.9.1` only if the existing storage envelope semantics require
it. If changing it would invalidate saves or create unnecessary migration churn, leave save metadata
at the v0.9-compatible value and document that v0.9.1 is a non-schema patch.

If implementation introduces a real `GameState` shape change, revisit this decision explicitly in
the implementation plan before coding.

## CI and Release Validation

Keep heavy validation out of automatic CI.

Pages deployment should remain deterministic:

```text
npm ci
npm run check:docs
npx tsc -p tsconfig.app.json --noEmit
npm run build -- --configuration production --base-href /haunted-apex/
artifact verification
deploy
```

Browser tests remain manual in GitHub Actions because Chrome Headless is flaky in hosted CI.

Local/manual release gate before tagging v0.9.1:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
npm run check:docs
npm run validate:handler
git diff --check
```

Manual release review:

```text
Review Strategic Fingerprint output.
Confirm Handler validation remains 500/500 Standard and 1/1 Training.
Confirm missing media fallbacks render.
Confirm at least one campaign splash renders if an asset is available.
Confirm at least one operative thumb and hero render if assets are available.
Confirm Pages artifact has /haunted-apex/ base href.
```

## Test Plan

### Analytics Unit Tests

- `diffPressures()` returns only non-zero signed pressure deltas.
- Command usage report counts actions correctly.
- Command usage report groups by Campaign Tension.
- Command pair report counts same-week unordered pairs.
- Command pair report handles future three-command weeks by counting all unordered pairs.
- Dominant loop detector flags a pair above threshold.
- Dominant loop detector flags top-two command share above threshold.
- Source breakdown aggregates Dominion gains by source.
- Source breakdown aggregates Heat relief by source.
- Source breakdown preserves positive and negative totals.
- System engagement report counts runs with Front investment.
- System engagement report counts runs with Accord brokered.
- System engagement report counts runs with Ledger use.
- System engagement report counts runs with Contact service.
- System engagement report counts Bribe and Lay Low use.
- System engagement report counts wins without Fronts, Accords, Ledger, and Contacts.
- Strategic Fingerprint selects top command, top pair, top Dominion source, and top Heat relief
  source.

### Harness Tests

- `simulateHarnessRun()` includes telemetry for command use.
- `simulateHarnessRun()` includes action pressure attribution from resolved orders.
- Event-choice resolution creates event pressure attribution where harness can observe it.
- `runHarnessBatch()` includes Strategic Fingerprint reports.
- `formatBatchReport()` emits `strategic_fingerprint`.
- `formatBatchReport()` emits `command_usage`.
- `formatBatchReport()` emits `command_pairs`.
- `formatBatchReport()` emits `source_breakdown`.
- `formatBatchReport()` emits `system_engagement`.
- `formatBatchReport()` emits `loop_warnings`.
- Handler validation still passes in the dedicated validation runner.

### Media Tests

- Media registry lookup returns configured asset.
- Missing media id returns `undefined`.
- Wrong-kind media reference returns `undefined`.
- Campaign splash selector returns configured splash.
- Campaign splash selector falls back safely.
- Operative thumb selector returns configured thumb.
- Operative thumb selector falls back safely.
- Operative hero selector returns configured hero.
- Operative hero selector falls back safely.
- Media component renders image `src` and `alt`.
- Media component renders fallback content when no asset exists.
- Operative card renders thumbnail when available.
- Operative card renders initials fallback when missing.
- Operative detail renders hero when available.
- Campaign briefing renders splash when available.

## Acceptance Criteria

v0.9.1 is complete when:

- Strategic Fingerprint appears in harness/debug output.
- Command usage by action and Campaign Tension is visible.
- Top command pairs are reported.
- Dominion source breakdown is reported at major-source level.
- Heat relief source breakdown is reported at major-source level.
- System engagement reports show runs/wins with and without Fronts, Accords, Ledger, Contacts,
  Bribe, and Lay Low.
- Dominant loop warnings exist and do not fail the build.
- No remote telemetry, user tracking, analytics beacon, or Pages collection is introduced.
- Media registry exists.
- Campaign Tensions can reference splash media.
- Operatives can reference thumb and hero media.
- Rivals can optionally reference media without requiring rendering.
- Campaign briefing can render splash media.
- Operative cards can render thumbnails.
- Operative detail can render hero media.
- Missing media falls back safely.
- Media paths use `public/assets/media/images` files and `assets/media/images/...` runtime paths.
- UI remains playable and not significantly more crowded.
- No major balance changes are included.
- Handler validation remains a documented local/manual release gate.
