# Haunted Apex v0.9.1 Signal Clarity Implementation Plan

## Purpose

This plan breaks **v0.9.1: Signal Clarity** into reviewable implementation phases.

It follows [`SignalClarity-TDD.md`](./SignalClarity-TDD.md), [`v0.9.1.md`](./v0.9.1.md), and
[`v0.9.1A.md`](./v0.9.1A.md).

The release has two connected goals:

```text
Strategic Telemetry
  -> make bot and harness play diagnosable
  -> expose dominant loops and ignored systems
  -> preserve local-only analytics

First Media Slots
  -> add safe media plumbing
  -> render campaign and operative art where available
  -> keep compact gameplay surfaces usable
```

## Completion Target

The release is complete when the harness can answer:

```text
Which commands does Handler actually use?
Which command pairs dominate winning weeks?
Where does Dominion come from?
Where does Heat relief come from?
Which systems are ignored in winning runs?
Which loops deserve balance attention in v0.9.2?
```

The release should also prove:

```text
Campaign splash art can render safely.
Operative thumbnails can render safely.
Operative detail hero art can render safely.
Missing media falls back cleanly.
The UI remains playable and not significantly more crowded.
```

Release constraints:

```text
No remote telemetry.
No Pages analytics.
No major balance changes.
No required JSON export.
No save invalidation unless GameState shape actually changes.
Handler validation remains local/manual.
```

## Phase 0: Baseline and Documentation Lock

### Objective

Confirm the v0.9.1 design set is organized, the repository is clean enough to begin implementation,
and the current v0.9 release behavior is the baseline.

### Scope

- Keep v0.9.1 docs under:

```text
docs/releases/v0.9.1-signal-clarity/
```

- Ensure the release folder includes:
  - `v0.9.1.md`
  - `v0.9.1A.md`
  - `SignalClarity-TDD.md`
  - `SignalClarity-ImplementationPlan.md`
- Update root and docs indexes.
- Confirm current package metadata and save metadata before implementation.
- Confirm automatic CI remains lightweight and Pages deployment does not run flaky Chrome tests.
- Run baseline docs/typecheck/build checks.
- Do not change gameplay behavior.

### Deliverables

- Organized v0.9.1 documentation set.
- Baseline verification output.
- Known current save/package metadata.

### Verification

```bash
npm run check:docs
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
git diff --check
```

Optional local-only check:

```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

### Completion Record

Completed June 20, 2026.

- Current branch is `main`.
- Baseline commit is `1e01c62`, described as `v0.9.0-dirty` because the v0.9.1 documentation set
  is present but not yet committed.
- The v0.9.1 documentation set is organized under:

```text
docs/releases/v0.9.1-signal-clarity/
```

- Release folder contains:
  - `v0.9.1.md`
  - `v0.9.1A.md`
  - `SignalClarity-TDD.md`
  - `SignalClarity-ImplementationPlan.md`
- Root README and docs README link the v0.9.1 release folder.
- Updated `scripts/check-docs.mjs` so patch-release folders such as
  `v0.9.1-signal-clarity` are included in documentation link validation.
- Current package metadata remains:

```text
package.json version: 0.9.0
```

- Current save metadata remains:

```text
CURRENT_SAVE_SCHEMA_VERSION = 9
CURRENT_GAME_VERSION = 0.9.0
CURRENT_RUN_STORAGE_KEY = haunted-apex:v0.9:current-run
```

- Confirmed automatic Pages CI remains lightweight:
  - docs check,
  - app typecheck,
  - production Pages build,
  - artifact verification,
  - deploy.
- Confirmed browser tests remain manual-only in GitHub Actions.
- No gameplay behavior changed in this phase.
- Verification passed:

```bash
npm run check:docs
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
git diff --check
```

- `npm run check:docs` now reports:

```text
Documentation links verified for 10 release folders.
```

- Production build size at baseline:

```text
main:      690.39 kB raw, 152.08 kB estimated transfer
polyfills:  34.59 kB raw,  11.33 kB estimated transfer
initial:   725.13 kB raw, 163.57 kB estimated transfer
```

- Pages artifact was smoke-checked:

```text
dist/haunted-apex/browser/index.html exists
<base href="/haunted-apex/"> is present
```

- The optional Chrome Headless suite was not run for Phase 0 because browser tests are currently a
  manual/local release signal due hosted-CI flakiness.

## Phase 1: Analytics Model and Pressure Diff Helpers

### Objective

Add the pure telemetry types and low-level pressure diff helpers without changing harness output yet.

### Scope

- Add `src/app/engine/analytics/`.
- Add telemetry entry types:
  - command used,
  - event choice used,
  - pressure delta,
  - system engaged,
  - operative assigned.
- Add `PressureChangeSourceKind`.
- Add `RunTelemetry`.
- Add `diffPressures(before, after)`.
- Export analytics APIs through `engine/analytics/index.ts` and `engine/index.ts`.
- Keep telemetry local and in-memory only.

### Implementation Notes

- Do not add telemetry to `GameState`.
- Do not persist telemetry.
- Do not add remote reporting.
- Prefer plain TypeScript data structures over classes.

### Deliverables

- Analytics model.
- Pressure diff helper.
- Focused unit tests.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/analytics/**/*.spec.ts
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Completed June 20, 2026.

- Added `src/app/engine/analytics/`.
- Added telemetry model types:
  - `TelemetryActorType`,
  - `PressureChangeSourceKind`,
  - `TelemetryEntryKind`,
  - `StrategicSystemId`,
  - `PressureAttributionEntry`,
  - `CommandUsedTelemetryEntry`,
  - `EventChoiceUsedTelemetryEntry`,
  - `SystemEngagedTelemetryEntry`,
  - `OperativeAssignedTelemetryEntry`,
  - `TelemetryEntry`,
  - `RunTelemetry`.
- Added `diffPressures(before, after)`.
- Added `PressureDeltaEntry`.
- Exported analytics APIs through `src/app/engine/analytics/index.ts` and
  `src/app/engine/index.ts`.
- Added focused tests for:
  - canonical pressure order,
  - signed positive and negative deltas,
  - zero-delta filtering,
  - local bot-run telemetry shape without persistence fields.
- No harness behavior, gameplay behavior, persistence behavior, or remote telemetry changed.

Verification passed:

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/analytics/**/*.spec.ts'
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

## Phase 2: Harness Telemetry Capture

### Objective

Capture per-run telemetry inside harness simulations while preserving current harness behavior and
agent strategies.

### Scope

- Extend `HarnessRunResult` with `telemetry`.
- Record `command_used` entries from resolved orders.
- Record `operative_assigned` entries when orders use operatives.
- Record same-week command group data needed for pair reports.
- Record action pressure attribution from `advanceWeek().orderResolutions`.
- Record event choice pressure attribution from harness-visible before/after pressure snapshots.
- Record basic system engagement for:
  - Bribe,
  - Lay Low,
  - Contact service,
  - Ledger use,
  - Front investment,
  - Front upgrade,
  - Accord brokered.

### Implementation Notes

- Do not change agent choice logic.
- Do not change queueing, resolution, or event selection rules.
- Attribute resolved command deltas mostly to `action`.
- Track contact/ledger/front/accord engagement even if exact pressure attribution is deferred.

### Deliverables

- Harness run telemetry.
- Tests proving representative telemetry entries are created.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/harness/simulation-harness.spec.ts
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Completed June 20, 2026.

- Added `HarnessRunResult.telemetry`.
- `simulateRun()` now initializes local bot `RunTelemetry` with:
  - run id,
  - bot id,
  - seed,
  - Campaign Tension id,
  - in-memory telemetry entries.
- Queueing orders now records:
  - `command_used`,
  - `operative_assigned`,
  - `system_engaged`.
- System engagement is captured for:
  - Bribe,
  - Lay Low,
  - Contact service,
  - Ledger use,
  - Front investment,
  - Front upgrade,
  - Accord brokered.
- Resolved order deltas now produce `pressure_delta` telemetry.
- Event choices now record `event_choice_used`.
- Event-choice pressure deltas now produce `pressure_delta` telemetry attributed to `event`.
- Added harness tests proving:
  - telemetry is deterministic for repeated runs,
  - command and event telemetry counts match existing run usage counters,
  - action, event, and drift pressure attribution appears,
  - command-family system engagement appears,
  - front command pressure can be attributed to `front`.
- No agent strategy, game resolution, persistence, or UI behavior changed.

Verification completed:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/harness/simulation-harness.spec.ts
```

The focused Karma run reported `45 SUCCESS`; the runner then hung after completion and was
terminated with Ctrl-C so no browser process was left running.

## Phase 3: Weekly Major-Source Attribution

### Objective

Broaden pressure attribution for major weekly systems where practical without destabilizing the
simulation engine.

### Scope

- Attribute weekly front yield pressure changes to `front`.
- Attribute weekly accord effects to `accord`.
- Attribute weekly drift pressure changes to `drift`.
- Attribute rival passive pressure changes to `rival` where observable.
- Attribute local district cooling to `system` or `rival` only if useful and low-risk.
- Preserve action/event attribution from Phase 2.

### Implementation Notes

- Prefer diagnostic wrappers or explicit before/after snapshots around existing simulation steps.
- Avoid invasive rewrites of `advanceWeek()`.
- If a source cannot be separated cleanly, document the limitation and leave it out rather than
  guessing.
- The goal is strategic diagnosis, not perfect accounting.

### Deliverables

- Expanded `pressure_delta` telemetry for major weekly sources.
- Unit coverage for at least front, accord, and drift attribution.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/simulation/**/*.spec.ts --include=src/app/engine/harness/simulation-harness.spec.ts
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Completed June 20, 2026.

- Added major-source pressure attribution for harness-visible weekly systems.
- Weekly event-log pressure deltas are now converted into telemetry for:
  - `front_yield` as `front`,
  - `accord` weekly effects as `accord`,
  - `drift` as `drift`,
  - `rival_effect` as `rival`.
- Order pressure attribution now uses strategic source kinds where the current order makes the
  source obvious:
  - `manage_contact` with a Contact target -> `contact`,
  - `work_the_ledger` with a Ledger target -> `ledger`,
  - `invest_front` with Front/Front opportunity target -> `front`,
  - `broker_accord` with Faction/Accord target -> `accord`,
  - other command deltas -> `action`.
- Source attribution remains major-source level. It does not split base action, operative, target,
  campaign, trait, or affinity micro-deltas.
- The implementation reuses existing simulation diagnostics and event-log pressure deltas rather
  than changing `GameState` or resolver behavior.

Verification completed:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/harness/simulation-harness.spec.ts
```

The focused Karma run reported `45 SUCCESS`; the runner then hung after completion and was
terminated with Ctrl-C so no browser process was left running.

## Phase 4: Command Usage and Command Pair Reports

### Objective

Aggregate telemetry into command usage and same-week command pair reports by agent and Campaign
Tension.

### Scope

- Add command usage report builder.
- Add command pair report builder.
- Report `all` campaign and per-campaign rows.
- Calculate percentages against clear denominators:
  - command usage: all commands for the group,
  - command pairs: resolved weeks with at least two commands.
- Sort output by agent, campaign, and descending count.

### Implementation Notes

- Reuse existing action definitions for labels.
- Keep action ids in the report so output remains machine-readable.
- Pair order should be stable and unordered.

### Deliverables

- `CommandUsageReport`.
- `CommandPairReport`.
- Aggregation tests.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/analytics/**/*.spec.ts --include=src/app/engine/harness/simulation-harness.spec.ts
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Completed June 20, 2026.

- Added shared analytics report input types for agent/campaign telemetry aggregation.
- Added `buildCommandUsageReports()` with `all` campaign and per-Campaign Tension rows.
- Added `buildCommandPairReports()` with unordered same-week command pairs.
- Command usage percentages use all commands in the agent/campaign group as the denominator.
- Command pair percentages use resolved weeks with at least two commands in the group as the
  denominator.
- Reports reuse action definitions for display labels while preserving action ids.
- Added focused aggregation tests for usage totals, per-campaign splits, pair ordering, three-command
  weeks, and single-command week omission.
- Verification passed:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/analytics/**/*.spec.ts' --include='src/app/engine/harness/simulation-harness.spec.ts'
npm run check:docs
git diff --check
```

- The focused browser run reported `TOTAL: 53 SUCCESS`; the Karma process remained attached after
  success and was manually stopped so no test server or browser process was left running.

## Phase 5: Source Breakdown and System Engagement Reports

### Objective

Aggregate telemetry into source breakdown and system engagement reports that reveal what systems
actually contribute to wins.

### Scope

- Add source breakdown builder grouped by:
  - agent,
  - campaign,
  - pressure,
  - source kind,
  - source id.
- Track total, positive, and negative deltas.
- Add system engagement builder for:
  - front investment,
  - front upgrade,
  - accord brokered,
  - ledger use,
  - contact service,
  - bribe,
  - lay low.
- Count wins without Fronts, Accords, Ledger, and Contacts.

### Implementation Notes

- Dominion source and Heat relief are derived from the same source breakdown rows.
- Use run-level booleans for system engagement.
- A run can count multiple systems.

### Deliverables

- `SourceBreakdownReport`.
- `SystemEngagementReport`.
- Unit tests for positive/negative pressure aggregation and wins-without-system counts.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/analytics/**/*.spec.ts
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Completed June 20, 2026.

- Added `buildSourceBreakdownReports()` with `all` campaign and per-Campaign Tension rows.
- Source breakdown rows group by agent, campaign, pressure, source kind, and source id.
- Source breakdown preserves signed `totalDelta`, `positiveDelta`, and `negativeDelta` values.
- Added `buildSystemEngagementReports()` with run-level system usage counts.
- System engagement counts Front investment, Front upgrade, Accord brokered, Ledger use, Contact
  service, Bribe, and Lay Low once per run.
- Winning-run diagnostics count wins without Fronts, Accords, Ledger, and Contacts.
- Front upgrade counts as Front engagement for `winsWithNoFronts` diagnostics.
- Added focused aggregation tests for pressure source totals, Heat relief, mixed positive/negative
  deltas, per-campaign grouping, repeated system entries, and wins-without-system counts.
- Verification passed:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/analytics/**/*.spec.ts'
npm run check:docs
git diff --check
```

## Phase 6: Strategic Fingerprint and Loop Warnings

### Objective

Generate the high-level Strategic Fingerprint and non-failing diagnostic warnings from the lower
level reports.

### Scope

- Add Strategic Fingerprint report builder.
- Select top command.
- Select top command pair.
- Select top Dominion source.
- Select top Heat relief source.
- Add dominant loop warnings:
  - dominant pair over threshold,
  - top-two command share over threshold,
  - wins without Fronts over threshold,
  - wins without Accords over threshold,
  - wins without Ledger over threshold,
  - wins without Contacts over threshold.
- Keep warnings diagnostic only.

### Implementation Notes

- Thresholds come from `SignalClarity-TDD.md`.
- Warning text should be readable in CSV output.
- Do not fail Handler validation because a loop warning exists.

### Deliverables

- `StrategicFingerprintReport`.
- `LoopWarningReport`.
- Tests for warning thresholds and top-source selection.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/analytics/**/*.spec.ts
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Completed June 20, 2026.

- Added `buildLoopWarningReports()` with diagnostic-only warnings for:
  - dominant command pair,
  - top-two command share,
  - wins without Fronts,
  - wins without Accords,
  - wins without Ledger,
  - wins without Contacts.
- Centralized the TDD warning thresholds in `LOOP_WARNING_THRESHOLDS`.
- Warning thresholds use strict `>` behavior, so values exactly at threshold do not warn.
- Added `buildStrategicFingerprintReports()` with compact per-agent/campaign summaries.
- Strategic fingerprints select top command, top command pair, top Dominion source, top Heat relief
  source, and the most dominant loop warning by threshold overage.
- Added focused tests for warning thresholds, wins-without-system diagnostics, top source selection,
  total/average command calculations, and empty-supporting-report behavior.
- Verification passed:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/analytics/**/*.spec.ts'
```

## Phase 7: Harness Output Integration

### Objective

Expose the new analytics through the existing readable harness/debug output.

### Scope

- Extend `HarnessBatchReport` and `AgentBatchSummary` with analytics reports.
- Add formatter sections:
  - `strategic_fingerprint`,
  - `command_usage`,
  - `command_pairs`,
  - `source_breakdown`,
  - `system_engagement`,
  - `loop_warnings`.
- Preserve existing report sections.
- Update harness-related UI/spec expectations.
- Keep player-facing summary changes out of scope unless trivial.

### Implementation Notes

- Keep CSV-style output consistent with existing harness sections.
- Escape labels with the existing CSV helper.
- The debug panel remains the primary surface.

### Deliverables

- Full Strategic Fingerprint output in harness report.
- Updated harness formatter tests.
- Updated app harness UI test if needed.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/harness/simulation-harness.spec.ts --include=src/app/app.spec.ts
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

Manual smoke:

```text
Open debug panel.
Run harness.
Confirm Strategic Fingerprint and related sections appear.
Confirm old report sections still appear.
```

### Completion Record

Pending.

## Phase 8: Media Model, Registry, and Selectors

### Objective

Add reusable media plumbing without rendering images yet.

### Scope

- Add media model:
  - `MediaAssetId`,
  - `MediaAssetKind`,
  - `MediaAsset`.
- Add static media registry.
- Add runtime path convention:

```text
assets/media/images/...
```

- Add optional media references to:
  - Campaign Tension definitions,
  - Operative definitions,
  - Rival definitions.
- Add media selectors:
  - `getMediaAsset`,
  - `selectCampaignSplash`,
  - `selectOperativeThumb`,
  - `selectOperativeHero`.
- Add placeholder asset directory structure under `public/assets/media/images/` only if actual
  assets or keepable placeholders are available.

### Implementation Notes

- Do not add media fields to mutable `GameState`.
- Do not wire registry entries to files that do not exist unless the UI handles the missing image
  by design.
- Rival media fields are type support only in v0.9.1.

### Deliverables

- Media model and registry.
- Optional entity media references.
- Selector tests.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/content/**/*.spec.ts --include=src/app/engine/media/**/*.spec.ts
npx tsc -p tsconfig.spec.json --noEmit
git diff --check
```

### Completion Record

Pending.

## Phase 9: Media UI Components and Fallbacks

### Objective

Render media safely in the UI while preserving current gameplay density.

### Scope

- Add media image/fallback rendering helpers or components.
- Add campaign splash rendering in the opening briefing.
- Add operative thumbnail rendering on operative cards.
- Add operative hero rendering in operative detail.
- Preserve initials fallback when operative media is missing.
- Preserve existing styled briefing fallback when campaign splash is missing.
- Add stable dimensions/aspect ratios.
- Add alt text.
- Add `loading="lazy"` where appropriate.

### Implementation Notes

- Compact cards stay playable.
- Detail views carry immersion.
- Do not turn the Command Board into an image surface.
- Avoid layout shifts.
- Avoid global layout redesign.

### Deliverables

- Campaign splash UI.
- Operative thumbnail UI.
- Operative detail hero UI.
- Fallback tests.
- Responsive checks.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/app*.spec.ts --include=src/app/engine/media/**/*.spec.ts
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
git diff --check
```

Manual smoke:

```text
Start a run with media-backed campaign.
Open campaign briefing.
Inspect operative cards with and without thumbnails.
Open operative detail with and without hero media.
Check narrow viewport layout.
```

### Completion Record

Pending.

## Phase 10: First Asset Slice and Content Wiring

### Objective

Wire the first actual media content slice, if assets are available, and prove missing media remains
safe.

### Scope

- Add available optimized WebP assets under:

```text
public/assets/media/images/
  splash/
  thumb/
  hero/
```

- Wire available campaign splash entries.
- Wire available operative thumb/hero entries.
- Keep the release unblocked if the full ideal media set is not ready.
- Add content tests that only require committed assets.

### Implementation Notes

- Minimum useful asset set:
  - one campaign splash,
  - one to three operative thumbnails,
  - one to three operative hero images.
- Do not commit large originals.
- Do not introduce runtime image generation.
- If no final assets are ready, ship plumbing with no wired registry entries and explicit fallback
  tests.

### Deliverables

- First media registry entries backed by committed assets, or documented fallback-only state.
- Asset path checks.
- UI smoke coverage for available media.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/content/**/*.spec.ts --include=src/app/app*.spec.ts
npm run build -- --configuration production --base-href /haunted-apex/
git diff --check
```

Manual smoke:

```text
Verify images load from dist/haunted-apex/browser/assets/media/images.
Verify missing-media entities render fallbacks.
Verify image dimensions do not shift layout.
```

### Completion Record

Pending.

## Phase 11: Documentation, Release Notes, and Checklist

### Objective

Update project documentation and release notes so Signal Clarity can be reviewed and released
without losing the local validation requirements.

### Scope

- Add or update v0.9.1 release notes.
- Update root README and docs README if needed.
- Document local-only analytics posture.
- Document manual Handler validation release gate.
- Document media asset path rules.
- Confirm Pages workflow remains deterministic and does not run browser tests automatically.
- Confirm manual Browser Tests workflow remains manual-only.

### Implementation Notes

- Keep README current but avoid volatile "current target" statements.
- Do not claim remote analytics exists.
- Do not claim every entity has art.

### Deliverables

- Release notes draft.
- Updated docs indexes.
- Release checklist.

### Verification

```bash
npm run check:docs
git diff --check
```

### Completion Record

Pending.

## Phase 12: Release Readiness

### Objective

Prove v0.9.1 is shippable, including the local Handler validation gate and Pages production build.

### Scope

- Update package metadata to `0.9.1`.
- Confirm save schema decision:
  - keep schema version `9` if no `GameState` shape changed,
  - document any explicit exception if implementation required a schema change.
- Run full automated local verification.
- Run full Handler validation.
- Run GitHub Pages subpath build.
- Review Strategic Fingerprint output.
- Confirm no dev server, test runner, browser test process, or validation process from this phase
  remains running.

### Verification

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

Manual release smoke:

```text
Start Training Run.
Start Standard Run.
Open campaign briefing with and without media.
Inspect operative cards and operative detail with and without media.
Run harness and review Strategic Fingerprint.
Confirm loop warnings are diagnostic only.
Confirm Pages artifact contains /haunted-apex/ base href.
```

Handler validation target:

```text
Training fixed config: 1/1 Handler win.
Standard validation set: 500/500 Handler wins.
Invalid recommendations: 0.
Softlocks/stalls: 0.
Failures: 0.
```

### Completion Record

Pending.

## Release Acceptance Criteria

v0.9.1 is releasable when:

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
