# Haunted Apex v0.7.0 Accords Implementation Plan

## Purpose

This plan breaks **v0.7.0: The Accords** into reviewable implementation phases.

It follows [`Accords-TDD.md`](./Accords-TDD.md) and preserves the project rules established
by District Zero, Rival Territory, The Roster, The Black Ledger, Entanglements, and Fronts:

- Keep the engine pure TypeScript.
- Keep Angular out of simulation rules.
- Keep static content separate from mutable run state.
- Keep seeded generation and simulation deterministic.
- Keep preview and resolution calculations shared.
- Keep every phase buildable and testable.
- Keep factions useful and legible without expanding into a full diplomacy simulator.
- Use the harness to evaluate balance rather than tuning from isolated examples.

## Completion Target

The release is complete when an eight-week run supports:

```text
Seeded active factions
  -> Broker Accord target + accord
  -> Immediate bargain effects
  -> Timed weekly accord effects
  -> Faction Standing/Suspicion/Obligation changes
  -> Faction events, Ledger hooks, and reportable faction outcomes
```

The player should be able to:

```text
see four active factions, always including Ashline Bureau
understand Standing, Suspicion, Obligation, and derived status
broker a time-limited accord with a faction
preview immediate effects, weekly effects, costs, duration, and faction consequences
see active accords and remaining weekly ticks
experience faction events tied to current institutional pressure
read final run faction and accord outcomes
```

The harness must report whether accords are being used, which factions dominate,
whether Obligation and Suspicion matter, whether faction events are too rare or too noisy,
and whether the broad v0.6 balance profile remains recognizable.

The tested production build remains playable at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

## Phase 0: Baseline and Documentation Lock

### Objective

Establish a clean v0.6 baseline, lock the v0.7 design inputs, and verify the repository
before changing save-state or action contracts.

### Scope

- Confirm the repository is based on the approved and tagged v0.6 release.
- Keep the v0.7 vision, clarifications, TDD, and implementation plan together under:

```text
docs/releases/v0.7-the-accords/
```

- Update docs indexes so v0.7 documents are discoverable.
- Run the existing test suite.
- Run the standard production build.
- Run the GitHub Pages subpath build.
- Run the docs link checker.
- Record the current test count and representative v0.6 harness baseline.
- Record the current storage key and save schema version.
- Confirm no dev, Karma, or browser-debug process from this phase remains running.

### Implementation Notes

- Do not change gameplay behavior in this phase.
- Do not update package version to `0.7.0` yet.
- Treat `v0.7.md`, `v0.7A.md`, and `Accords-TDD.md` as locked inputs unless
  implementation reveals a contradiction.
- Preserve the v0.6 balance output as the comparison point for Phase 11.

### Deliverables

- Complete v0.7 design set.
- Green v0.6 baseline.
- Recorded pre-Accords harness results.
- No accidental generated, temporary, or server artifacts.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
npm run check:docs
git diff --check
```

Recommended baseline:

```text
100 runs per agent
win rates
loss causes
average final pressures
Ledger usage reports
target/rival/district reports
roster/stress reports
contact reports
front reports
```

### Completion Record

Completed June 12, 2026:

- Runtime validation used Node `24.16.0` from `.nvmrc` and npm `11.13.0`.
- Development baseline is `main` at commit `8acaba6`, which is tagged locally as
  `v0.6.0`.
- Current development branch is `v0.7`.
- The v0.7 documentation set is organized under:

```text
docs/releases/v0.7-the-accords/
```

- Added the v0.7 direction, clarifications, TDD, and implementation plan to
  `docs/README.md`.
- Added the v0.7 release folder to the root README development-documentation list.
- Current package metadata remains `0.0.0`; version `0.7.0` is reserved for release
  readiness.
- Current persistence key is:

```text
haunted-apex:v0.6:current-run
```

- Current save schema version is `6`.
- Current game version is `0.6.0`.
- Current `GameState` has no Faction or Active Accord state. Phase 3 owns the schema version
  increase, `haunted-apex:v0.7:current-run`, v0.6 save invalidation, and Faction state
  validation.
- Captured a deterministic 100-runs-per-agent baseline using seed prefix
  `V07-PHASE0-BASELINE`:

```text
Random:           0% wins, 0 incomplete, avg 7.27 weeks
Aggressive:      43% wins, 0 incomplete, avg 5.55 weeks
Cautious:         0% wins, 0 incomplete, avg 8.00 weeks
Greedy:          42% wins, 0 incomplete, avg 7.45 weeks
Operator / Sane: 68% wins, 0 incomplete, avg 6.91 weeks
```

- Primary baseline loss patterns:

```text
Random:     71 out of time, 25 bankrupt, 4 Heat lockdown
Aggressive: 50 Heat lockdown, 4 Loyalty collapse, 3 out of time
Cautious:   100 out of time
Greedy:     43 out of time, 15 Heat lockdown
Operator:   23 out of time, 9 Heat lockdown
```

- Ledger baseline summary:

```text
Random:           2.45 entries created, 1.13 consumed, 0.57 unresolved Debts
Aggressive:      3.13 entries created, 1.15 consumed, 1.03 unresolved Debts
Cautious:         2.91 entries created, 1.31 consumed, 0.00 unresolved Debts
Greedy:          5.37 entries created, 1.08 consumed, 1.97 unresolved Debts
Operator / Sane: 3.67 entries created, 1.49 consumed, 0.13 unresolved Debts
```

- Contact baseline summary:

```text
Random:           2.34 Manage Contact uses/run, 0.00 burned Contacts
Aggressive:      1.06 Manage Contact uses/run, 0.00 burned Contacts
Cautious:         0.34 Manage Contact uses/run, 0.00 burned Contacts
Greedy:          0.74 Manage Contact uses/run, 0.00 burned Contacts
Operator / Sane: 2.95 Manage Contact uses/run, 0.00 burned Contacts
```

- Front baseline summary:

```text
Random:           1.92 owned Fronts, 0.92 established, 0.19 upgrades, 0.06 cools, 0.16 Front events, avg Exposure 33.91
Aggressive:      1.94 owned Fronts, 0.94 established, 0.55 upgrades, 0.83 cools, 0.33 Front events, avg Exposure 44.70
Cautious:         2.00 owned Fronts, 1.00 established, 0.00 upgrades, 0.00 cools, 0.14 Front events, avg Exposure 30.92
Greedy:          2.07 owned Fronts, 1.07 established, 0.46 upgrades, 0.00 cools, 0.37 Front events, avg Exposure 55.52
Operator / Sane: 1.92 owned Fronts, 0.92 established, 0.00 upgrades, 0.74 cools, 0.35 Front events, avg Exposure 45.63
```

- All 450 tests passed in ChromeHeadless.
- Both application and specification TypeScript projects passed `--noEmit` checks.
- The standard production build passed without bundle-budget warnings:

```text
initial bundle 553.78 kB, under the 600.00 kB warning budget
```

- The production build with base href `/haunted-apex/` passed without bundle-budget warnings.
- The structural documentation check passed for seven release folders.
- `git diff --check` passed.
- No dev, Karma, or browser-debug process from this phase was left running. An existing
  user-owned `ng serve` process with pid `31958` was detected and intentionally left alone.

### Review Gate

Confirm baseline and docs before adding the Faction model.

## Phase 1: Faction Models, Static Content, and Status Helpers

### Objective

Introduce Faction domain contracts and authored v0.7 faction content without changing
runtime behavior.

### Scope

- Add Faction model types:
  - `FactionId`
  - `FactionStatus`
  - `FactionArchetype`
  - `FactionRoleTag`
  - `FactionMetricDelta`
  - `FactionInteraction`
  - `FactionState`
  - `FactionDefinition`
- Add the five Faction definitions:
  - Ashline Bureau
  - Helix Meridian
  - Velvet House
  - Chrome Maw
  - Ghostline Communion
- Add content registry helpers and barrel exports.
- Add `deriveFactionStatus`.
- Add faction metric clamp helpers.
- Add content validation tests.
- Add direct `associatedFactionId` fields to Rival and Contact definitions.
- Populate the initial direct associations:
  - Nyx Ardent -> Velvet House
  - Knox Marrow -> Chrome Maw
  - Captain Hollis -> Ashline Bureau
  - Veyra Lux -> Velvet House
  - Ciro Moth -> Ghostline Communion
- Do not add Faction state to live runs yet unless required by types.

### Implementation Notes

- Definitions contain authored data only.
- Runtime state references definitions by id.
- Faction definitions hold district, venue, rival, contact, and front-tag associations.
- Derived status stays out of persisted `FactionState`.
- Ashline Bureau must be identifiable as the always-active faction.

### Deliverables

- Faction model file.
- Faction content registry.
- Status and clamp helpers.
- Rival and Contact association fields.
- Exported public engine APIs.
- Static content test coverage.

### Verification

Unit tests:

- Exactly five Faction definitions exist.
- Faction ids are unique.
- Ashline Bureau exists.
- Every Faction has valid archetype, role tags, base metrics, and flavor.
- Faction associations resolve to known districts, venues, rivals, contacts, and front tags.
- Rival and Contact `associatedFactionId` values resolve.
- `deriveFactionStatus` returns correct labels for major metric combinations.
- Faction metric clamp helper keeps metrics between 0 and 100.

### Completion Record

Completed June 12, 2026:

- Added Faction domain contracts in `src/app/engine/model/factions.ts`:
  - `FactionId`
  - `FactionStatus`
  - `FactionArchetype`
  - `FactionRoleTag`
  - `FactionMetricDelta`
  - `FactionInteraction`
  - `FactionState`
  - `FactionDefinition`
- Added the five v0.7 Faction definitions in `src/app/engine/content/factions.ts`:
  - Ashline Bureau
  - Helix Meridian
  - Velvet House
  - Chrome Maw
  - Ghostline Communion
- Added the `getFactionDefinition` registry helper.
- Added Faction helper APIs in `src/app/engine/factions/`:
  - `deriveFactionStatus`
  - `clampFactionMetric`
- Added model, content, and engine barrel exports.
- Added direct optional `associatedFactionId` fields to Rival and Contact definitions.
- Wired the locked Phase 1 direct associations:

```text
Nyx Ardent -> Velvet House
Knox Marrow -> Chrome Maw
Captain Hollis -> Ashline Bureau
Veyra Lux -> Velvet House
Ciro Moth -> Ghostline Communion
```

- Faction definitions now hold authored associations to existing districts, venues, rivals,
  contacts, and supported Front role tags.
- Faction event hooks are present as empty arrays for now. Phase 9 owns faction event content.
- Accord linkage is intentionally deferred. Phase 2 owns `AccordId`, Accord definitions, and
  faction-to-accord content validation.
- No Faction state was added to live `GameState`.
- No save schema, storage key, action, new-game, UI, event, harness, or balance behavior changed.
- Added focused tests for:
  - faction content registry shape and lookups
  - supported Faction archetypes and role tags
  - valid base Standing, Suspicion, and Obligation values
  - district, venue, rival, contact, and Front role-tag association resolution
  - locked direct Rival and Contact faction associations
  - `deriveFactionStatus` threshold priority
  - faction metric clamping
- Extended existing Contact and Rival Territory content specs to verify direct
  `associatedFactionId` references resolve.
- Focused Phase 1 suite passed: 22 tests.
- Full suite passed: 460 tests.
- Both application and specification TypeScript projects passed `--noEmit` checks.
- The standard production build passed without bundle-budget warnings:

```text
initial bundle 554.00 kB, under the 600.00 kB warning budget
```

- The production build with base href `/haunted-apex/` passed without bundle-budget warnings.
- The structural documentation check passed for seven release folders.
- `git diff --check` passed.
- No dev, Karma, or browser-debug process from this phase was left running. An existing
  user-owned `ng serve` process with pid `31958` was detected and intentionally left alone.

### Review Gate

Confirm the faction content slice before adding Accord definitions.

## Phase 2: Accord Models, Static Content, and Availability Primitives

### Objective

Introduce Accord contracts and authored accord content without changing runtime behavior.

### Scope

- Add Accord model types:
  - `AccordId`
  - `ActiveAccordId`
  - `AccordRequirement`
  - `AccordFrontEffect`
  - `AccordLedgerEffect`
  - `AccordDefinition`
  - `ActiveAccord`
- Add ten Accord definitions:
  - Clean Corridor
  - Inspection Delay
  - Quiet Capital
  - Permit Shell
  - Guest List Pact
  - Velvet Silence
  - Dockside Tithe
  - Muscle on Retainer
  - Dead Channel Access
  - Mercy of Static
- Add accord content registry helpers.
- Add requirement-check helpers.
- Add active-accord cap helpers.
- Add deterministic active accord id helper.
- Add front hook preview helper for Ashline `Inspection Delay`.
- Add content validation tests.

### Implementation Notes

- Accord definitions contain authored data only.
- Every accord belongs to one faction and is listed by that faction.
- `Permit Shell` must not implement front-cost discounts in v0.7.
- `Inspection Delay` should declare the highest-exposure-front cooling hook but not resolve it
  until Broker Accord resolution is implemented.
- Availability helpers should return stable reasons from the TDD reason list.

### Deliverables

- Accord model contracts.
- Accord content registry.
- Accord requirement and cap helpers.
- Static content test coverage.

### Verification

Unit tests:

- Exactly ten accord definitions exist.
- Accord ids are unique.
- Accord faction ids resolve.
- Every accord is listed by its faction definition.
- Every faction has two accord definitions.
- Durations are positive integers.
- Costs and effects are valid.
- Ledger effect definition ids resolve or are deferred until Phase 8 definitions are added.
- Rival pressure effect ids resolve.
- Front hooks use supported hook types.
- `Permit Shell` has no front-cost discount behavior.

### Completion Record

Completed June 12, 2026:

- Added Accord domain contracts in `src/app/engine/model/accords.ts`:
  - `AccordId`
  - `ActiveAccordId`
  - `AccordRequirement`
  - `AccordFrontEffect`
  - `AccordLedgerEffect`
  - `AccordCost`
  - `AccordDefinition`
  - `ActiveAccord`
- Added the ten v0.7 Accord definitions in `src/app/engine/content/accords.ts`:
  - Clean Corridor
  - Inspection Delay
  - Quiet Capital
  - Permit Shell
  - Guest List Pact
  - Velvet Silence
  - Dockside Tithe
  - Muscle on Retainer
  - Dead Channel Access
  - Mercy of Static
- Added the `getAccordDefinition` registry helper.
- Added Accord IDs to the five Faction definitions, with two accords per faction.
- Updated `FactionState.usedAccordIds` and `FactionState.activeAccordIds` to use
  `AccordId[]` and `ActiveAccordId[]`.
- Added Accord helper APIs in `src/app/engine/accords/`:
  - `ACTIVE_ACCORD_CAP`
  - `FACTION_ACTIVE_ACCORD_CAP`
  - `createActiveAccordId`
  - `isAccordUsed`
  - `hasTotalAccordCapacity`
  - `hasFactionAccordCapacity`
  - `isAccordRequirementMet`
  - `getUnmetAccordRequirements`
  - `selectHighestExposureFront`
  - `previewAccordFrontEffect`
- Added model, content, and engine barrel exports.
- Implemented Ashline `Inspection Delay` as a static front hook declaration:

```text
cool_highest_exposure_front, Exposure -10
```

- Confirmed Helix `Permit Shell` has no front-cost discount or front effect in v0.7.
- Accord-created Ledger hooks currently reference existing entries:
  - `debt_dirty_books`
  - `secret_dead_channel_trace`
- `Institutional Favor` and `Compliance Blind Spot` remain deferred to Phase 8, as planned.
- No Accord state was added to live `GameState`.
- No save schema, storage key, action, new-game, UI, event, harness, or balance behavior changed.
- Added focused tests for:
  - accord content registry shape and lookups
  - faction-to-accord and accord-to-faction linkage
  - duration, cost, pressure effect, faction metric, role tag, Ledger, rival, and front-hook
    content validity
  - active accord cap constants and helpers
  - deterministic active accord id creation
  - used-accord checks
  - metric and owned-front requirements
  - highest-exposure Front selection and deterministic tie-breaking
  - Ashline `Inspection Delay` preview clamping
  - Helix `Permit Shell` front-discount deferral
- Focused Phase 2 suite passed: 22 tests.
- Full suite passed: 475 tests.
- Both application and specification TypeScript projects passed `--noEmit` checks.
- The standard production build passed without bundle-budget warnings:

```text
initial bundle 554.00 kB, under the 600.00 kB warning budget
```

- The production build with base href `/haunted-apex/` passed without bundle-budget warnings.
- The structural documentation check passed for seven release folders.
- `git diff --check` passed.
- No dev, Karma, or browser-debug process from this phase was left running.

### Review Gate

Confirm accord content and availability primitives before changing `GameState`.

## Phase 3: New Game Generation, Persistence, and Save Invalidation

### Objective

Add Faction and Active Accord state to new runs and version persistence for v0.7.

### Scope

- Extend `GameState` with:
  - `factions`
  - `activeFactionIds`
  - `activeAccords`
- Generate active factions during new game creation:
  - always include Ashline Bureau
  - seed-select three of the remaining four factions
- Initialize active faction state from definitions.
- Initialize `usedAccordIds`, `activeAccordIds`, flags, and recent interactions as empty.
- Increment save schema and storage key for v0.7.
- Invalidate v0.6 saves with a compatibility notice.
- Extend storage validation for Faction and Active Accord state.

### Implementation Notes

- Do not migrate v0.6 saves.
- Inactive factions should not have runtime state in normal new games.
- Generation must be deterministic for the same seed.
- Validation should enforce total and per-faction active accord caps.

### Deliverables

- New-game Faction initialization.
- Seeded active faction generator.
- Persistence schema update.
- Storage validation update.
- Compatibility notice text for v0.7.

### Verification

Unit tests:

- New games have exactly four active factions.
- Ashline Bureau is always active.
- The remaining active factions are deterministic by seed.
- Active faction state initializes from definitions.
- Inactive factions do not have runtime state.
- New games start with no active accords.
- v0.7 saves round-trip Faction and Active Accord state.
- v0.6 saves are rejected with the compatibility notice.
- Malformed Faction or Active Accord state is rejected.

### Review Gate

Confirm v0.7 new runs and persistence before adding player-facing action targets.

## Phase 4: Broker Accord Action, Targets, and Preview

### Objective

Make `Broker Accord` visible as an action with legal faction/accord targets and exact previews,
without resolving accords yet.

### Scope

- Add `broker_accord` to action content.
- Extend `ActionTarget` with faction accord targets:
  - `factionId`
  - `accordId`
- Add Broker Accord target option generation.
- Include accord targets for active factions only.
- Enforce target availability reasons:
  - inactive faction
  - wrong faction
  - already used
  - already active
  - total cap reached
  - faction cap reached
  - requirement not met
  - not enough Resources or Intel
- Prevent operative assignment for `Broker Accord`.
- Add reusable accord preview model covering:
  - costs
  - immediate pressure effects
  - weekly effects
  - duration and timing copy
  - faction metric effects
  - Ledger entries
  - rival pressure
  - front hook details
  - unavailable reasons

### Implementation Notes

- Preview calculation must be reusable by Phase 5 resolution.
- `Inspection Delay` preview must select the same highest-exposure front that resolution will
  cool later.
- If multiple fronts tie for highest exposure, use a deterministic tie-breaker.
- Target labels should include faction and accord names.

### Deliverables

- `Broker Accord` action card support.
- Faction/accord target option selectors.
- Accord preview model.
- Unavailable reason copy.
- Focused preview tests.

### Verification

Unit tests:

- `Broker Accord` requires a target.
- `Broker Accord` does not allow operative assignment.
- Target options include accords for active factions.
- Target options exclude inactive factions.
- Used accords are unavailable.
- Per-faction and total active accord caps are enforced.
- Unaffordable accords are unavailable.
- Requirement failures show stable reasons.
- Preview shows costs, immediate effects, weekly effects, duration, timing, faction deltas,
  Ledger labels, rival warnings, and front hook details.

### Review Gate

Confirm preview accuracy before allowing accords to resolve.

## Phase 5: Broker Accord Resolution

### Objective

Resolve `Broker Accord` orders through the shared preview pipeline.

### Scope

- Add `resolveBrokerAccord`.
- Wire `broker_accord` into action resolution.
- Validate faction, accord, caps, one-use, requirements, and affordability.
- Spend Resource and Intel costs.
- Apply immediate pressure effects.
- Apply faction start effects.
- Apply rival pressure effects.
- Apply front start effects.
- Create Ledger entries from accord start effects where definitions exist.
- Create `ActiveAccord`.
- Add active accord id to faction state.
- Add accord id to faction `usedAccordIds`.
- Append recent faction interaction.
- Log outcome with costs, effects, faction deltas, and duration.

### Implementation Notes

- Resolution must use the same calculation as preview.
- Immediate effects apply on the broker week.
- Weekly effects do not apply until Phase 6 weekly resolution.
- If a queued order becomes invalid by resolution time, log a blocked outcome instead of
  crashing.
- Pressure, faction metrics, front exposure, and rival pressure must clamp through shared
  helpers.

### Deliverables

- Broker Accord resolution.
- Active accord creation.
- Event feed entries for brokered accords.
- Tests for preview/resolution parity.

### Verification

Unit tests:

- Brokered accords spend costs and apply immediate effects.
- Brokered accords apply faction start effects.
- Brokered accords apply rival pressure effects.
- `Inspection Delay` reduces highest-exposure owned front by 10.
- Brokered accords create an active accord with the correct timing fields.
- Brokered accords are marked used immediately.
- Same accord cannot be brokered twice.
- Different accord from the same faction can be brokered later after expiration.
- Stale invalid queued broker orders are blocked and logged.

### Review Gate

Confirm the player can broker accords through the engine before adding weekly effects.

## Phase 6: Active Accord Weekly Effects and Expiration

### Objective

Make active accords produce recurring effects, tick duration, and expire deterministically.

### Scope

- Add weekly active accord resolution.
- Apply weekly accord effects after queued orders and before front weekly yields.
- Enforce `firstWeeklyEffectWeek`.
- Decrement `remainingWeeks` only when a weekly tick applies.
- Apply weekly pressure effects.
- Apply weekly faction metric effects.
- Log weekly accord output.
- Expire accords after their ticks are consumed.
- Apply expiration faction effects where defined.
- Remove expired accords from global and faction-local active accord state.
- Log accord expiration.

### Implementation Notes

- Accord weekly effects do not apply on the broker week.
- Expiration occurs in the same weekly resolution after event handling when remaining ticks
  reach zero.
- Expiration must not remove `usedAccordIds`.
- Expired accord state must remain absent from target cap checks while the definition remains
  blocked by one-use rules.

### Deliverables

- Weekly active accord engine.
- Expiration engine.
- Weekly and expiration log entries.
- Tests for timing and cleanup.

### Verification

Unit tests:

- Weekly effects do not apply on the broker week.
- Weekly effects apply starting next Advance Week.
- Weekly effects decrement duration exactly once per weekly tick.
- Faction weekly effects apply alongside pressure weekly effects.
- Expired accords are removed from `activeAccords`.
- Expired accord ids are removed from faction `activeAccordIds`.
- Expiration effects and logs apply when present.
- Used accord ids remain after expiration.

### Review Gate

Confirm active accords behave like timed bargains before adding faction touch.

## Phase 7: Scoped Faction Touch for Fronts, Contacts, and Ledger

### Objective

Apply light faction memory to explicitly scoped systems without making ordinary targets
trigger broad faction reputation changes.

### Scope

- Add shared `applyFactionMetricDelta`.
- Add faction touch helper for front establish/upgrade in faction sphere.
- Reduce front Suspicion gain by 2 when a matching active `fronts` accord exists.
- Add faction touch for associated Contact actions:
  - Cultivate
  - Pressure
  - service use
- Add optional faction context and declared faction effects to Ledger state/definitions or
  use options, following the local Ledger architecture.
- Apply Ledger faction effects only when explicitly declared.
- Add recent interaction recording for touches.
- Add logs or preview rows where player-facing consequences are already displayed.

### Implementation Notes

- Do not add faction touch to ordinary district or venue targeting.
- Front sphere matching uses faction district ids, venue ids, and front tags.
- Contact touch uses direct `associatedFactionId`.
- Ledger effects are explicit, not inferred from every related entry.

### Deliverables

- Faction metric application helper.
- Front touch integration.
- Contact touch integration.
- Ledger faction context support.
- Focused negative tests proving broad touch does not fire.

### Verification

Unit tests:

- Front establish/upgrade in faction sphere changes faction metrics.
- Front establish/upgrade outside active faction sphere does not change faction metrics.
- Matching active fronts accord reduces front Suspicion gain.
- Cultivating an associated contact increases Standing.
- Pressuring an associated contact increases Suspicion.
- Associated contact service use applies the scoped Suspicion/Obligation effect.
- Ledger faction effects apply only when declared.
- Ordinary district and venue target actions do not apply faction touch.

### Review Gate

Confirm faction touch is useful but constrained before adding faction Ledger content.

## Phase 8: Faction Ledger Entries

### Objective

Add v0.7 faction-flavored Ledger entries and make accord-created entries usable.

### Scope

- Add Ledger entry definitions:
  - Debt: Institutional Favor
  - Secret: Compliance Blind Spot
- Add related faction labeling in Ledger views where present.
- Add Ledger uses:
  - Institutional Favor: settle with Resources
  - Institutional Favor: settle with Intel
  - Compliance Blind Spot: spend for Heat relief
- Apply declared faction effects on use.
- Ensure accord-created Ledger entries include `relatedFactionId`.
- Ensure Ledger previews and resolution include faction consequences.

### Implementation Notes

- Use existing Ledger option patterns.
- Keep requirement and affordability messaging consistent with v0.4/v0.5/v0.6 Ledger entries.
- Faction-related Ledger entries should still behave like normal entries for consumption,
  unresolved debt summaries, and reports.

### Deliverables

- New Ledger definitions.
- Ledger use options with faction effects.
- UI labels for related faction context.
- Tests for creation, preview, use, and consumption.

### Verification

Unit tests:

- `Institutional Favor` can be created with a related faction.
- `Compliance Blind Spot` can be created with a related faction.
- Ledger cards show related faction labels.
- Settling `Institutional Favor` with Resources reduces Obligation.
- Settling `Institutional Favor` with Intel changes Suspicion and Obligation.
- Using `Compliance Blind Spot` reduces Heat and faction Suspicion.
- Consumed faction Ledger entries leave normal Ledger summaries intact.

### Review Gate

Confirm accord Ledger hooks are complete before adding faction events.

## Phase 9: Faction Events

### Objective

Add faction-specific weekly events using the existing single weekly event slot.

### Scope

- Add faction event templates:
  - Faction Demand
  - Faction Scrutiny
  - Accord Terms Shift
  - Market Access
  - Proxy Conflict
  - Institutional Blind Spot
- Add faction event eligibility helpers.
- Add active faction target selection.
- Add event choice faction effects.
- Preview faction effects on event choices.
- Apply faction effects during event resolution.
- Add light faction-specific copy for selected faction context.
- Weight events by Standing, Suspicion, Obligation, active accords, associated rival pressure,
  and active-faction eligibility.

### Implementation Notes

- Faction events use the normal weekly event slot and should not dominate it.
- Only active factions can be selected.
- Event titles, body, choices, and logs should name the selected faction.
- Mechanics stay generic even when copy is faction-flavored.
- Do not add passive weekly damage in v0.7.

### Deliverables

- Faction event definitions.
- Faction event eligibility and target selection.
- Event preview/resolution support for faction effects.
- Event selection tests.

### Verification

Unit tests:

- Faction Demand requires Obligation threshold.
- Faction Scrutiny requires Suspicion threshold.
- Accord Terms Shift responds to active accord state.
- Market Access responds to high Standing.
- Proxy Conflict responds to associated rival pressure.
- Institutional Blind Spot responds to favorable Standing/Suspicion state.
- Inactive factions never trigger faction events.
- Faction event target selection is deterministic by seed.
- Event choices preview and apply faction effects.
- Faction events consume the normal weekly event slot.

### Review Gate

Confirm faction events create visible pressure without overwhelming the event feed.

## Phase 10: Faction Selectors, Facade, and UI

### Objective

Expose factions and accords to the player through the existing one-screen UI without adding
new routes.

### Scope

- Add faction selector view models:
  - faction panel view
  - faction cards
  - accord option views
  - active accord views
  - recent interaction views
  - related entity labels
- Expose `factions` through `GameFacade`.
- Add Factions to the shared secondary panel/tab system.
- Render active faction cards.
- Render Standing, Suspicion, Obligation, and status.
- Render available and unavailable accords.
- Render active accords and remaining weeks.
- Render recent interactions.
- Render related districts, venues, rivals, contacts, and front tags where space allows.
- Render Broker Accord preview details in command cards.
- Add Field Guide copy for Factions, Accords, Standing, Suspicion, Obligation, and weekly
  accord timing.

### Implementation Notes

- Active accords inside the Factions panel are sufficient; no global active accord strip is
  required.
- Keep the command board focused on queueing and selected previews.
- Keep text compact enough for the existing dense UI.
- Avoid exposing debug-only faction internals in normal play.

### Deliverables

- Factions UI panel/tab.
- Faction cards and accord detail rendering.
- Broker Accord preview rendering.
- Field Guide Accords section.
- App tests for critical display states.

### Verification

UI tests:

- Factions tab/panel renders.
- Four active factions render.
- Ashline Bureau renders.
- Standing, Suspicion, Obligation, and status render.
- Accord options render with costs, duration, and availability.
- Active accords render with remaining weeks.
- Broker Accord target dropdown shows faction-accord labels.
- Broker Accord preview shows immediate and weekly effects, timing, duration, faction deltas,
  Ledger labels, rival warnings, and front hook details.
- Field Guide explains the new concepts.
- Existing Fronts, Contacts, Ledger, Roster, Rivals, Event Feed, and Debug access remains intact.

### Review Gate

Manual UI review: confirm factions are legible, compact, and command consequences are clear.

## Phase 11: Run Summary, Harness Reporting, and Agent Behavior

### Objective

Make faction outcomes measurable and teach simulation agents enough accord behavior for useful
balance analysis.

### Scope

- Track faction run stats:
  - active faction set
  - Broker Accord uses
  - accord usage by faction and accord
  - max active accords
  - weekly accord yield totals
  - final faction metrics and statuses
  - faction event counts
  - high Suspicion and high Obligation flags
- Add faction data to run-end summary.
- Add harness CSV sections for faction and accord metrics.
- Update agents:
  - RandomBot can select valid accord targets.
  - OperatorBot uses accords to solve immediate Heat, Resource, Dominion, front exposure,
    and tempo problems.
  - CautiousBot prefers Ashline/Helix safety and reduces faction pressure.
  - AggressiveBot prefers Chrome/Velvet Dominion and ignores risk until severe.
  - GreedyBot prefers Helix/Chrome economic value and accepts Debt/Obligation.
- Add deterministic agent tests where practical.

### Implementation Notes

- Preserve existing harness CSV sections.
- Add faction sections after front/contact/ledger sections unless local formatting suggests a
  clearer order.
- Agents should score public order options and previews instead of calling private accord
  internals where possible.
- Do not overfit OperatorBot to one seed or one accord.

### Deliverables

- Faction run summary model.
- Faction harness stats.
- CSV/report formatting updates.
- Faction-aware agent scoring.
- Tests for report aggregation and agent validity.

### Verification

Unit/harness tests:

- Run summary includes active factions and active/used accords.
- Harness reports Broker Accord uses per run.
- Harness reports accord usage by faction and accord.
- Harness reports average final faction metrics.
- Harness reports faction event frequencies.
- Harness reports win rate by active faction set.
- Agents simulate without crashing.
- Random can select legal accord options.
- Operator uses a safety accord when immediate Heat/front risk is severe and affordable.
- Aggressive prefers Dominion-oriented accords when legal.
- Greedy prefers resource-oriented accords when legal.

### Review Gate

Confirm the harness can answer whether accords are being used and whether faction pressure
matters.

## Phase 12: Balance Pass and Tuning

### Objective

Tune accord costs, effects, duration, faction metric deltas, event weights, and agent scoring
against v0.7 targets.

### Scope

- Run deterministic 100-runs-per-agent harness samples.
- Compare against v0.6 baseline.
- Tune:
  - accord Resource and Intel costs
  - immediate pressure effects
  - weekly pressure effects
  - duration
  - faction metric deltas
  - Ledger creation frequency and cost
  - faction event weights
  - faction event choice effects
  - agent accord scoring
- Record before/after harness snapshots.
- Keep accords useful but not mandatory.

### Target Profile

Broad balance:

```text
OperatorBot: 55-75% win rate
CautiousBot: low win rate, usually Dominion shortfall
RandomBot: 0-10% win rate acceptable if runs remain valid
AggressiveBot: viable but volatile
GreedyBot: viable but swingy
```

Faction-specific:

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

### Implementation Notes

- If Broker Accord is never used, accords are too weak, costly, or hidden.
- If every OperatorBot run uses the same accord, that accord or pressure need is too efficient.
- If Obligation never matters, demand events are too soft or too rare.
- If Suspicion creates too many events, faction pressure is too noisy.
- If Greedy wins too often, capital accords are too generous.
- If Cautious starts winning often, safety accords are too efficient.

### Deliverables

- Tuned accord and event numbers.
- Updated agent scoring if needed.
- Recorded final pre-release harness snapshot.
- Notes on remaining balance risks.

### Verification

```bash
npm test -- --watch=false --include src/app/engine/harness/simulation-harness.spec.ts
npm test -- --watch=false
npm run build
npm run check:docs
git diff --check
```

Harness:

```text
100 runs per agent
faction report sections
accord usage sections
loss causes
win rates
average active accord count
faction event counts
final faction metrics
```

### Review Gate

Manual and harness review: confirm accords are useful, costly, and not mandatory.

## Phase 13: Release Readiness, Documentation, and Pages Build

### Objective

Prepare v0.7 for merge, deployment, smoke testing, and tagging.

### Scope

- Update README/docs links if any new v0.7 docs were added.
- Add v0.7 release notes draft.
- Update Field Guide copy if playtesting reveals missing explanations.
- Ensure debug-only Faction data remains hidden in normal play.
- Run full validation suite.
- Run production Pages build.
- Run docs checker.
- Run final harness snapshot.
- Confirm no dev, Karma, or browser-debug process from this phase remains running.
- Leave package version policy unchanged unless explicitly decided otherwise.

### Implementation Notes

- GitHub tags and Releases remain the source of truth for release identity.
- README should link to the playable build and docs, not claim a mutable current
  development target.
- Do not introduce deployment changes unless the existing Pages workflow fails.
- Keep release notes concise and player-facing.

### Deliverables

- v0.7 release notes draft.
- Final green validation.
- Final harness snapshot.
- Ready-to-merge branch.

### Verification

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
open the Factions tab
inspect all active factions
queue Broker Accord
advance week and confirm weekly accord effects start next week
confirm active accord ticks and expires
use a faction Ledger entry
trigger or simulate a faction event
finish or force-end a run
inspect faction and accord report output
```

### Review Gate

Merge to `main`, wait for Pages deployment, smoke test the deployed build, then tag
`v0.7.0` when satisfied.
