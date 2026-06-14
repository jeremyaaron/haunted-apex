# Haunted Apex v0.8.0 City Wakes Implementation Plan

## Purpose

This plan breaks **v0.8.0: The City Wakes** into reviewable implementation phases.

It follows [`CityWakes-TDD.md`](./CityWakes-TDD.md) and preserves the project rules established
by District Zero, Rival Territory, The Roster, The Black Ledger, Entanglements, Fronts, and
The Accords:

- Keep the engine pure TypeScript.
- Keep Angular out of simulation rules.
- Keep static content separate from mutable run state.
- Keep seeded generation and simulation deterministic.
- Keep preview and resolution calculations shared.
- Keep every phase buildable and testable.
- Keep campaigns as run identity and assembly context, not a second game.
- Use the harness to evaluate balance and texture by Campaign Tension.

## Completion Target

The release is complete when an eight-week run supports:

```text
Seed/new-run config
  -> Campaign Tension selection
  -> City identity
  -> Campaign-biased roster/contact/faction/front generation
  -> Campaign starting modifiers
  -> Opening briefing
  -> Campaign-weighted events and reports
```

The player should be able to:

```text
start a random Campaign Tension run
start a specific Campaign Tension run
see the generated city and campaign premise before acting
understand exact starting state changes
distinguish active content from favored content
reopen campaign details during the run
feel campaign texture through contacts, factions, fronts, events, and pressure
read final run campaign notes
```

The harness must report whether each Campaign Tension creates distinct texture, whether agents
still perform in recognizable v0.7 bands, and whether any campaign is too punishing or too free.

The tested production build remains playable at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

## Phase 0: Baseline and Documentation Lock

### Objective

Establish a clean v0.7 baseline, lock the v0.8 design inputs, and verify the repository before
changing save-state or new-run contracts.

### Scope

- Confirm the repository is based on the approved and tagged v0.7 release.
- Keep the v0.8 vision, clarifications, TDD, and implementation plan together under:

```text
docs/releases/v0.8-the-city-wakes/
```

- Update docs indexes so v0.8 documents are discoverable.
- Run the existing test suite.
- Run the standard production build.
- Run the GitHub Pages subpath build.
- Run the docs link checker.
- Record the current test count and representative v0.7 harness baseline.
- Record the current storage key and save schema version.
- Confirm current package version policy remains unchanged.
- Confirm no dev, Karma, or browser-debug process from this phase remains running.

### Implementation Notes

- Do not change gameplay behavior in this phase.
- Do not update package version to `0.8.0` yet.
- Treat `v0.8.md`, `v0.8A.md`, and `CityWakes-TDD.md` as locked inputs unless implementation
  reveals a contradiction.
- Preserve the v0.7 balance output as the comparison point for campaign tuning.

### Deliverables

- Complete v0.8 design set.
- Green v0.7 baseline.
- Recorded pre-City-Wakes harness results.
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
contact reports
front reports
faction/accord reports
event frequency
```

### Completion Record

Completed June 13, 2026:

- Runtime validation used Node `24.16.0` from `.nvmrc` and npm `11.13.0`.
- Development baseline is branch `v0.8` at commit `58c4ff2`, which is tagged locally as
  `v0.7.0`.
- The v0.8 documentation set is organized under:

```text
docs/releases/v0.8-the-city-wakes/
```

- Added the v0.8 direction, clarifications, TDD, and implementation plan to
  `docs/README.md`.
- Added the v0.8 release folder to the root README development-documentation list.
- Current package metadata remains `0.0.0`; version `0.8.0` is reserved for release readiness.
- Current persistence key is:

```text
haunted-apex:v0.7:current-run
```

- Current save schema version is `7`.
- Current game version is `0.7.0`.
- Phase 2 owns the Campaign state schema change, `haunted-apex:v0.8:current-run`, v0.7 save
  invalidation, and Campaign state validation.
- Captured a deterministic 100-runs-per-agent baseline using seed prefix
  `V08-PHASE0-BASELINE`:

```text
Random:           1% wins, 0 incomplete, avg 7.10 weeks
Aggressive:      33% wins, 0 incomplete, avg 5.65 weeks
Cautious:         0% wins, 0 incomplete, avg 8.00 weeks
Greedy:          19% wins, 0 incomplete, avg 7.59 weeks
Operator / Sane: 65% wins, 0 incomplete, avg 7.11 weeks
```

- Primary baseline loss patterns:

```text
Random:     66 out of time, 27 bankrupt, 6 Heat lockdown
Aggressive: 60 Heat lockdown, 4 out of time, 2 bankrupt, 1 Loyalty collapse
Cautious:   100 out of time
Greedy:     59 out of time, 22 Heat lockdown
Operator:   29 out of time, 5 Heat lockdown, 1 bankrupt
```

- Ledger baseline summary:

```text
Random:           2.82 entries created, 1.14 consumed, 0.66 unresolved Debts
Aggressive:      3.24 entries created, 1.07 consumed, 1.15 unresolved Debts
Cautious:         3.49 entries created, 1.98 consumed, 0.00 unresolved Debts
Greedy:          5.10 entries created, 0.55 consumed, 2.55 unresolved Debts
Operator / Sane: 3.87 entries created, 1.60 consumed, 0.23 unresolved Debts
```

- Contact baseline summary:

```text
Random:           1.85 Manage Contact uses/run, 0.01 burned Contacts
Aggressive:      1.23 Manage Contact uses/run, 0.00 burned Contacts
Cautious:         0.29 Manage Contact uses/run, 0.00 burned Contacts
Greedy:          0.59 Manage Contact uses/run, 0.00 burned Contacts
Operator / Sane: 2.78 Manage Contact uses/run, 0.00 burned Contacts
```

- Front baseline summary:

```text
Random:           1.77 owned Fronts, 0.77 established, 0.21 upgrades, 0.03 cools, 0.16 Front events, avg Exposure 31.46
Aggressive:      1.97 owned Fronts, 0.97 established, 0.48 upgrades, 0.68 cools, 0.25 Front events, avg Exposure 45.67
Cautious:         2.00 owned Fronts, 1.00 established, 0.01 upgrades, 0.00 cools, 0.14 Front events, avg Exposure 26.00
Greedy:          2.02 owned Fronts, 1.02 established, 0.75 upgrades, 0.00 cools, 0.41 Front events, avg Exposure 57.61
Operator / Sane: 1.91 owned Fronts, 0.91 established, 0.00 upgrades, 0.70 cools, 0.30 Front events, avg Exposure 46.08
```

- Faction and Accord baseline summary:

```text
Random:           1.87 Broker Accord uses/run, 1.25 max active, 0.63 active at end, 0.09 high-obligation Factions
Aggressive:      1.54 Broker Accord uses/run, 1.47 max active, 0.07 active at end, 0.04 high-obligation Factions
Cautious:         1.00 Broker Accord uses/run, 1.00 max active, 0.00 active at end, 0.00 high-obligation Factions
Greedy:          1.38 Broker Accord uses/run, 1.38 max active, 0.01 active at end, 0.00 high-obligation Factions
Operator / Sane: 1.57 Broker Accord uses/run, 1.18 max active, 0.37 active at end, 0.01 high-obligation Factions
```

- Representative event-choice frequency leaders:

```text
Random:           accept_the_favor 32, decline_gracefully 32, exploit_immediately 28
Aggressive:      feed_them_a_rival_name 65, accept_the_favor 59, display_them 43
Cautious:         handle_it_quietly 94, use_the_quiet_to_recover 92, trace_it_first 92
Greedy:          refuse_the_claim 71, feed_them_a_rival_name 57, save_it_for_later 50
Operator / Sane: abandon_the_exposed_asset 85, feed_them_a_rival_name 52, pay_them 37
```

- All 532 tests passed in ChromeHeadless.
- Both application and specification TypeScript projects passed `--noEmit` checks.
- The standard production build passed without bundle-budget warnings:

```text
initial bundle 625.53 kB, under the 700.00 kB warning budget
```

- The production build with base href `/haunted-apex/` passed without bundle-budget warnings.
- The structural documentation check passed for eight release folders.
- No `ng serve`, Karma, or browser-debug process from this phase was left running.

### Review Gate

Confirm baseline and docs before adding Campaign model/content.

## Phase 1: Campaign Models, Static Content, and City Identity

### Objective

Add the static Campaign Tension and City Identity layer without changing live run behavior.

### Scope

- Add campaign model types:
  - `CampaignTensionId`
  - `CampaignRoleTag`
  - `CityProfile`
  - `CampaignGenerationBias`
  - `CampaignEventWeightModifier`
  - `CampaignTensionDefinition`
  - `CampaignState`
- Add static Campaign Tension definitions:
  - Corp Crackdown
  - Nightlife War
  - Ghostline Signal
  - Industrial Cut
  - Dirty Capital
- Add city-name content and deterministic city identity generation.
- Add registry helpers:
  - `getCampaignTensionDefinition`
  - `selectCampaignTension`
  - `generateCityIdentity`
- Add content validation tests for all campaign references.
- Export new model/content/campaign helpers through established barrels.

### Implementation Notes

- Do not add `campaign` to `GameState` yet.
- Use actual registry IDs from current content.
- Map the vision's `resources` operative tag to current `money` role tag.
- Preserve current rivals as always present; model fields may support future rival weighting.
- Do not add major new content to satisfy a campaign reference.
- City identity must be deterministic and must not consume the main weekly event RNG cursor.

### Deliverables

- Campaign model contracts.
- Five locked Campaign Tension definitions.
- Deterministic city identity generator.
- Content validation coverage.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/content/*campaign*.spec.ts' --include='src/app/engine/campaign/*.spec.ts'
npm run check:docs
git diff --check
```

### Completion Record

Completed June 13, 2026:

- Added Campaign model contracts in `src/app/engine/model/campaign.ts`:
  - `CampaignTensionId`
  - `CampaignRoleTag`
  - `CityProfile`
  - `CityIdentity`
  - `CampaignGenerationBias`
  - `CampaignEventWeightModifier`
  - `CampaignTensionDefinition`
  - `CampaignState`
- Added the five locked Campaign Tension definitions in
  `src/app/engine/content/campaign-tensions.ts`:
  - Corp Crackdown
  - Nightlife War
  - Ghostline Signal
  - Industrial Cut
  - Dirty Capital
- Added deterministic city-name source content in `src/app/engine/content/city-names.ts`.
- Added `selectCampaignTension()` and `generateCityIdentity()` under
  `src/app/engine/campaign/`.
- Added `getCampaignTensionDefinition()` to the content registry.
- Exported Campaign model, content, and helper APIs through the existing engine barrels.
- Kept Campaign state unattached from `GameState`; Phase 2 still owns save-schema and storage-key
  changes.
- Kept all Campaign references scoped to existing content IDs.
- Mapped the vision's `resources` operative bias to the existing `money` operative role tag.
- Added content validation coverage for Campaign references:
  - Factions
  - Rivals
  - Contacts
  - Operatives
  - Front definitions
  - Operative role tags
  - Front role tags
  - Event tags
  - Event IDs
- Added deterministic helper coverage proving:
  - Same seed selects the same Campaign Tension.
  - Seed space can select more than one Campaign Tension.
  - Same seed and tension generate the same city identity.
  - Explicit different tensions can produce different city profiles.
  - Campaign selection and city identity generation do not consume the caller RNG cursor.
- Focused Phase 1 verification passed:

```text
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/content/campaign-content.spec.ts' --include='src/app/engine/campaign/campaign.spec.ts'
```

- Focused Campaign suites passed: 10 tests.

### Review Gate

Confirm campaign content and ID normalization before changing `GameState`.

## Phase 2: Campaign State, RunAssembler Skeleton, and Persistence Invalidation

### Objective

Add CampaignState to new runs and saves while keeping generator behavior equivalent except for
campaign identity and audit state.

### Scope

- Add `campaign: CampaignState` to `GameState`.
- Increment schema version to `8`.
- Move current `newGame()` assembly into a central RunAssembler module.
- Keep `newGame(config)` as the public entry point.
- Add `campaignTensionId?: CampaignTensionId` to `NewGameConfig`.
- Select random Campaign Tension from seed when not provided.
- Respect explicit Campaign Tension override when provided.
- Generate city identity.
- Set `openingBriefingShown = false` for new runs.
- Record active content IDs in `CampaignState.activeContent`.
- Update save key to `haunted-apex:v0.8:current-run`.
- Add v0.7 legacy key invalidation.
- Update storage validation for CampaignState.

### Implementation Notes

- This phase may add campaign identity and save invalidation but should not yet apply campaign
  modifiers or generator bias.
- Keep existing roster/contact/faction/front generation output shape intact.
- Both rivals remain present.
- If RunAssembler needs helper functions currently local to `new-game.ts`, move them without
  changing behavior.

### Deliverables

- `GameState.schemaVersion = 8`.
- `CampaignState` populated for every new run.
- Deterministic explicit and random campaign selection.
- v0.7 saves rejected through existing incompatible-save behavior.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/simulation/new-game.spec.ts' --include='src/app/game/game-storage.service.spec.ts' --include='src/app/engine/campaign/*.spec.ts'
npm run build
git diff --check
```

### Completion Record

Completed June 13, 2026:

- Added `campaign: CampaignState` to `GameState`.
- Advanced `GameState.schemaVersion` to `8`.
- Added `campaignTensionId?: CampaignTensionId` to `NewGameConfig`.
- Moved new-run assembly into `src/app/engine/campaign/assemble-new-run.ts` while preserving
  `newGame(config)` as the public simulation entry point.
- New runs now select a Campaign Tension deterministically from the seed unless an explicit
  Campaign Tension override is provided.
- New runs now generate deterministic city identity and populate `CampaignState` with:
  - `tensionId`
  - `cityName`
  - `cityProfile`
  - `openingBriefingShown: false`
  - empty `appliedModifiers`
  - active content audit IDs
  - empty campaign flags
- Kept campaign generation bias and starting modifiers out of scope for this phase.
- Updated persistence constants:

```text
save schema: 8
game version: 0.8.0
current key: haunted-apex:v0.8:current-run
legacy key invalidated: haunted-apex:v0.7:current-run
```

- Updated incompatible-save copy for v0.8.0 - The City Wakes.
- Updated storage validation for Campaign state. Campaign active-content audit IDs are validated
  as defined, unique content references; they are not required to mirror mutable live collections.
- Added storage coverage for v0.8 envelopes, v0.7 legacy invalidation, Campaign state round-trip,
  and malformed Campaign state rejection.
- Added new-run coverage for Campaign identity, city identity, active content audit state, and
  explicit Campaign Tension override.
- Focused Phase 2 verification passed:

```text
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/simulation/new-game.spec.ts' --include='src/app/game/game-storage.service.spec.ts' --include='src/app/engine/campaign/campaign.spec.ts'
```

- Full regression suite passed: 547 tests in ChromeHeadless.

### Review Gate

Confirm new runs and persistence are stable before applying campaign modifiers.

## Phase 3: Campaign Starting Modifiers and Opening Log

### Objective

Apply exact campaign starting pressure, faction, contact, and rival modifiers once during run
assembly and record that application in run history.

### Scope

- Add campaign modifier application helpers.
- Apply:
  - `startingPressureDelta`
  - `factionModifiers`
  - `rivalPressureModifiers`
  - `contactMetricModifiers`
- Clamp values through existing pressure/contact/faction helpers.
- Record applied modifiers in `CampaignState.appliedModifiers`.
- Add one concise campaign opening log entry.
- Add `campaign` to `GameLogEntryType` if needed.
- Add formatting helper for campaign applied modifier copy.

### Implementation Notes

- Generation bias remains out of scope.
- Applied modifier log should include exact deltas only, not probability biases.
- Campaign modifiers must be idempotent at assembly time: creating a run applies them once, loading
  a save never reapplies them.
- Tests should guard against double application.

### Deliverables

- Exact starting campaign modifiers in live state.
- One opening log entry per new run.
- Modifier audit in CampaignState.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/campaign/*.spec.ts' --include='src/app/engine/simulation/new-game.spec.ts'
git diff --check
```

### Completion Record

Completed June 13, 2026:

- Added `applyCampaignModifiersToRun()` under `src/app/engine/campaign/`.
- Applied Campaign starting modifiers during run assembly:
  - pressure deltas through existing pressure clamping
  - active faction metric deltas through existing faction clamping and interaction recording
  - rival pressure deltas through 0-100 pressure clamping
  - contact metric deltas through existing contact clamping
- Recorded exact applied modifier payloads in `CampaignState.appliedModifiers`.
- Kept generation bias out of scope for this phase. Faction modifiers only apply when the faction
  is present in the generated active faction network; Phase 4 owns required/weighted faction
  generation.
- Added an idempotency guard so an already-applied Campaign run cannot stack starting modifiers
  or duplicate the opening log.
- Added `campaign` as a `GameLogEntryType`.
- Added `campaign` as a faction interaction source type for Campaign-applied faction shifts.
- Added `formatCampaignModifierSummary()` for concise opening-log copy that includes exact
  applied deltas without generation-bias details.
- Updated save validation to accept persisted Campaign log entries and Campaign faction
  interactions.
- Updated existing low-level tests that previously assumed District Zero numeric baselines so
  they now assert behavior relative to the generated Campaign starting state.
- Focused Phase 3 verification passed:

```text
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/campaign/*.spec.ts' --include='src/app/engine/simulation/new-game.spec.ts'
```

- Full regression suite passed: 549 tests in ChromeHeadless.

### Review Gate

Confirm campaign modifiers are visible, exact, and one-time only before changing generation.

## Phase 4: Campaign-Biased Faction and Contact Generation

### Objective

Make Campaign Tensions influence active factions and contacts while preserving existing count and
coverage rules.

### Scope

- Extend faction generation with optional campaign bias.
- Always include Ashline Bureau.
- Include required campaign factions.
- Fill remaining faction slots by weighted seeded selection.
- Preserve exactly four active factions for all v0.8 tensions.
- Extend contact generation with optional campaign bias.
- Preserve exactly three active contacts.
- Preserve contact coverage groups.
- Weight candidate contact sets by contact ID and role-tag bias.
- Fall back safely if required contacts cannot satisfy coverage.
- Add statistical multi-seed tests for directional bias.

### Implementation Notes

- Locked v0.8 tensions should avoid required contacts; use weights for contacts.
- Campaign contact/faction weights are additive and deterministic.
- This phase should not change roster or front generation yet.
- Avoid exact percentage assertions in statistical tests; assert directional lift over baseline.

### Deliverables

- Campaign-aware active faction generation.
- Campaign-aware active contact generation.
- Coverage-preserving bias tests.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/factions/generate-factions.spec.ts' --include='src/app/engine/contacts/generate-contacts.spec.ts' --include='src/app/engine/campaign/*.spec.ts'
git diff --check
```

### Review Gate

Confirm required factions and contact bias behave correctly before changing roster/front generation.

## Phase 5: Campaign-Biased Roster and Front Opportunity Generation

### Objective

Make Campaign Tensions influence starting roster, hire pool ordering, and front opportunities while
preserving existing validity and cap rules.

### Scope

- Extend roster generation with optional campaign bias.
- Apply operative ID and role-tag weights to seeded ordering.
- Preserve roster validity:
  - starting size
  - hire pool size
  - rare cap
  - required tag groups
  - Intel capability
  - Heat-control capability
- Extend front opportunity generation with optional campaign bias.
- Preserve The Pale Circuit as starting owned Front.
- Preserve four front opportunities.
- Preserve front opportunity coverage groups.
- Weight opportunity sets by front definition ID and role-tag bias.
- Add statistical tests for directional bias.

### Implementation Notes

- Campaigns weight operatives; they do not force starting operatives in v0.8.
- Ghostline Signal should make Juno/Echo/Orchid and Surveillance Den/Black Clinic more likely,
  not guaranteed.
- Industrial Cut should increase Zero Mercy Cut and Courier Line frequency.
- Dirty Capital should favor resources/front-related opportunities through existing tags.

### Deliverables

- Campaign-aware roster generation.
- Campaign-aware front opportunity generation.
- Validity-preserving bias tests.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/roster/generate-roster.spec.ts' --include='src/app/engine/fronts/generate-front-opportunities.spec.ts' --include='src/app/engine/campaign/*.spec.ts'
git diff --check
```

### Review Gate

Confirm all generators remain deterministic and coverage-valid before campaign event weighting.

### Completion Notes

- Extended roster generation with optional Campaign bias using operative ID and operative role-tag
  weights.
- Preserved existing un-biased roster behavior while allowing Campaign tensions to steer both
  starting roster selection and hire-pool ordering.
- Kept all roster validity gates intact: starting size, hire-pool size, rare cap, required tag
  groups, Intel capability, and Heat-control capability.
- Extended front opportunity generation with optional Campaign bias using front definition ID and
  front role-tag weights.
- Preserved The Pale Circuit as the starting owned Front, four generated opportunities, and
  front opportunity coverage rules.
- Wired Campaign generation bias into `assembleNewRun` for roster and front generation.
- Added focused tests for Campaign-biased roster validity, Campaign-biased front opportunity
  validity, and statistical directional lift for weighted operatives and fronts.
- Verification completed:
  - `npx tsc -p tsconfig.app.json --noEmit`
  - `npx tsc -p tsconfig.spec.json --noEmit`
  - `npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/roster/generate-roster.spec.ts' --include='src/app/engine/fronts/generate-front-opportunities.spec.ts' --include='src/app/engine/campaign/*.spec.ts'`

## Phase 6: Campaign Event Weight Modifiers

### Objective

Make Campaign Tensions influence weekly event selection through additive event ID and event tag
modifiers.

### Scope

- Extend event weight context with campaign metadata.
- Add campaign event ID and tag modifiers to weighted event calculation.
- Add diagnostics modifier IDs for campaign contributions.
- Preserve existing rule weights, context modifiers, recent-repeat penalties, and Contact repeat
  multipliers.
- Clamp final weights through existing behavior.
- Add tests for event ID modifier, tag modifier, diagnostics, and repeat penalty interaction.

### Implementation Notes

- Event weighting must stay data-driven.
- Do not hardcode tension-specific event behavior inside unrelated systems.
- Campaign modifiers should apply before recent-repeat penalties.
- Campaign modifiers should not make eligible events impossible unless normal final clamping lands
  at zero.

### Deliverables

- Campaign-aware event weighting.
- Diagnostics that explain campaign contribution.
- Focused event weighting tests.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/simulation/select-weekly-event.spec.ts' --include='src/app/engine/content/*campaign*.spec.ts'
git diff --check
```

### Review Gate

Confirm event weighting is explainable before adding the Ghostline special hook.

## Phase 7: Ghostline Signal Targeted Intel Bonus

### Objective

Implement the one approved campaign-specific runtime mechanic: Ghostline Signal increases targeted
`Gather Intel` Secret discovery chance by 8 percentage points.

### Scope

- Add a shared campaign-aware Secret discovery chance helper or extend the existing helper.
- Apply the bonus only when:
  - Campaign Tension is Ghostline Signal.
  - action is `gather_intel`.
  - the action has a target.
- Keep untargeted `Gather Intel` unchanged.
- Keep event/contact/accord/front-created Secrets unchanged.
- Display preview copy:

```text
Campaign Bonus: Ghostline Signal +8%
```

- Ensure preview and resolution share the same calculation.

### Implementation Notes

- Do not implement other campaign-specific runtime rules.
- Clamp the final chance after adding the campaign bonus.
- If the current Secret discovery helper does not expose bonus rows cleanly, add a small structured
  preview field rather than parsing text.

### Deliverables

- Ghostline targeted Intel bonus in preview and resolution.
- Negative coverage for non-targeted/non-Ghostline cases.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/ledger/secret-discovery.spec.ts' --include='src/app/engine/selectors/previews.spec.ts' --include='src/app/engine/simulation/resolve-action.spec.ts'
git diff --check
```

### Review Gate

Confirm Ghostline bonus is narrow, previewed, and shared before UI work.

## Phase 8: Campaign Selectors, Briefing View, and GameFacade State

### Objective

Create campaign presentation selectors and facade state without final visual polish.

### Scope

- Add campaign selector/view-model helpers:
  - Campaign header view.
  - Campaign briefing view.
  - exact starting effect rows.
  - active-this-run labels.
  - favored-by-tension labels.
  - pressure pattern labels.
- Add GameFacade campaign APIs:
  - start new run with optional Campaign Tension.
  - dismiss briefing.
  - open briefing.
  - close briefing.
- Persist `openingBriefingShown` when dismissed.
- Ensure loaded saves auto-show only when `openingBriefingShown` is false.
- Add tests for selector content and facade state transitions.

### Implementation Notes

- Selectors should consume CampaignState and campaign definitions; templates should not compute
  campaign mechanics.
- Active/favored content must stay separated.
- Starting effect rows must show exact applied deltas.

### Deliverables

- Campaign briefing view model.
- Header identity view model.
- Facade controls for campaign briefing lifecycle.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/selectors/*campaign*.spec.ts' --include='src/app/game/game.facade.spec.ts'
git diff --check
```

### Review Gate

Confirm selectors and facade behavior before wiring the Angular template.

## Phase 9: Opening Briefing UI, Header Identity, and New Run Campaign Selection

### Objective

Expose Campaign Tensions in the playable UI.

### Scope

- Add New Run Campaign selector:
  - Random Campaign Tension default.
  - Specific tension options.
- Pass explicit Campaign Tension only when a specific tension is selected.
- Add opening briefing modal/panel shown when `openingBriefingShown` is false.
- Add dismiss control.
- Add Campaign button/panel to reopen details.
- Add city/tension identity to the header.
- Show exact starting modifiers.
- Show active-this-run and favored-by-tension sections separately.
- Keep debug-only details hidden in normal play.
- Add focused component/UI tests where existing app tests make sense.

### Implementation Notes

- Do not create a new route.
- Avoid raw generation weights in UI.
- Use compact, information-dense presentation consistent with current UI.
- Ensure mobile/desktop text does not overflow action or briefing containers.

### Deliverables

- Player-facing Campaign selection and briefing.
- Persistent header identity.
- Reopenable campaign detail panel.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/app.spec.ts' --include='src/app/game/game.facade.spec.ts'
npm run build
git diff --check
```

Manual smoke:

```text
start random campaign run
start specific campaign run
dismiss briefing
reopen Campaign panel
load dismissed save
load undismissed save
verify header city/tension
```

### Review Gate

Confirm the new-run and briefing flow before changing summaries and harness output.

## Phase 10: Run Summary and Player-Facing Campaign Notes

### Objective

Add concise campaign identity and campaign-relevant notes to run-end summaries.

### Scope

- Add city and Campaign Tension to run summary report model.
- Add campaign premise/subtitle line.
- Add 1-3 campaign notes by tension.
- Add campaign flavor/epitaph line where applicable.
- Keep final player summary concise.
- Preserve existing run summary fields.
- Add tests for all five Campaign Tension summary note paths.

### Implementation Notes

- Use deterministic note selection; no procedural prose generation.
- Notes should be computed from existing run state and report data:
  - final/peak pressures where available.
  - Ledger usage.
  - Contact usage.
  - Front ownership/usage.
  - Faction/Accord metrics.
  - rival pressure.
- If a metric is unavailable, prefer a simpler truthful note over adding broad new tracking.

### Deliverables

- Campaign-aware run summary model.
- Campaign-aware formatted run summary text.
- Tests for concise campaign notes.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/selectors/run-summary.spec.ts'
git diff --check
```

### Review Gate

Confirm player-facing campaign notes before expanding harness reports.

## Phase 11: Harness Campaign Grouping and Report Sections

### Objective

Extend the simulation harness so campaign texture and balance can be evaluated directly.

### Scope

- Ensure harness can run:
  - random campaign distribution.
  - a specific Campaign Tension.
  - all Campaign Tensions by agent.
- Add campaign grouping to run records.
- Add output sections:
  - `campaign_summary`
  - `campaign_agent_summary`
  - `campaign_loss_causes`
  - `campaign_action_usage`
  - `campaign_events`
  - `campaign_system_usage`
- Preserve existing harness output sections.
- Add tests for campaign grouping and CSV/text formatting.

### Implementation Notes

- Default UI harness can remain 100 runs per agent; implementation may add a separate
  all-campaign mode if useful.
- Campaign grouping should not obscure existing agent-level output.
- Reports should support tuning questions from `CityWakes-TDD.md`.

### Deliverables

- Campaign-aware harness report model.
- Campaign report output.
- Harness tests for campaign sections.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/harness/simulation-harness.spec.ts'
git diff --check
```

Recommended harness:

```text
100 runs per agent random campaigns
50-100 runs per agent per Campaign Tension
campaign_summary
campaign_agent_summary
campaign_loss_causes
campaign_events
campaign_system_usage
```

### Review Gate

Confirm campaign report shape before campaign-aware agent scoring.

## Phase 12: Campaign-Aware Agent Strategy

### Objective

Make non-random agents respond to Campaign Tension identity while preserving their broad strategy
personalities.

### Scope

- Add campaign-aware scoring to OperatorBot.
- Add smaller campaign-aware adjustments to AggressiveBot, GreedyBot, and CautiousBot.
- Leave RandomBot diagnostic.
- Tune:
  - Corp Crackdown Heat caution.
  - Nightlife War social/contact/Loyalty/rival pressure behavior.
  - Ghostline Signal targeted Intel and Ruin caution.
  - Industrial Cut early money/Dominion risk and cooling behavior.
  - Dirty Capital front investment and Obligation/Debt caution.
- Add tests for representative campaign-specific scoring differences.

### Implementation Notes

- Avoid brittle tests that require exact selected action across many tied scores.
- Test scoring preference direction with controlled state fixtures.
- Agents should read `state.campaign.tensionId`; do not create duplicate campaign inference.

### Deliverables

- Campaign-aware agent behavior.
- Focused agent strategy tests.
- Initial campaign harness snapshot.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/engine/harness/simulation-harness.spec.ts'
git diff --check
```

### Review Gate

Confirm agents can play every Campaign Tension before balance tuning.

## Phase 13: Campaign Balance and Texture Pass

### Objective

Tune Campaign Tension numbers, event weights, generation biases, and agent adjustments until the
release hits the target texture without erasing v0.7 balance.

### Scope

- Run campaign-grouped harness snapshots.
- Tune starting pressure deltas.
- Tune faction/contact/rival starting modifiers.
- Tune generation weights.
- Tune event modifiers.
- Tune Ghostline bonus only if necessary.
- Tune campaign-aware agent weights.
- Record before/after snapshots in this plan.

### Target Profile

Global:

```text
OperatorBot overall: 55-75% win rate
CautiousBot: usually fails by Dominion shortfall
RandomBot: 0-10% acceptable
AggressiveBot: viable but volatile
GreedyBot: viable but swingy
```

Campaign-specific:

```text
Each Campaign Tension: OperatorBot at least 40%
No Campaign Tension: OperatorBot above 85%
Corp Crackdown: higher Heat losses
Nightlife War: higher Loyalty/contact/rival complications
Ghostline Signal: higher Ruin and Ledger activity
Industrial Cut: higher Resources and Heat
Dirty Capital: higher Front usage and Debt/Obligation texture
```

### Implementation Notes

- Tune conservatively. Campaigns should create texture, not hard-lock play styles.
- Do not add new major content during balance unless a tiny registry entry is clearly required.
- Use the harness to find obviously naive winning paths or unwinnable campaign/agent combinations.

### Deliverables

- Tuned campaign numbers.
- Recorded final campaign harness snapshot.
- Balance notes and residual risks.

### Verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
git diff --check
```

Harness:

```text
100 runs per agent random campaigns
100 runs per agent per Campaign Tension, if runtime remains reasonable
campaign grouped report review
```

### Review Gate

Manual and harness review: confirm campaigns feel distinct and broadly playable.

## Phase 14: Release Readiness, Documentation, and Pages Build

### Objective

Prepare v0.8 for merge, deployment, smoke testing, and tagging.

### Scope

- Update README/docs links if any new v0.8 docs were added.
- Add v0.8 release notes draft.
- Update Field Guide copy if playtesting reveals missing campaign explanations.
- Run full validation suite.
- Run production Pages build.
- Run docs checker.
- Run final campaign harness snapshot.
- Run final scripted campaign smoke check.
- Confirm no dev, Karma, or browser-debug process from this phase remains running.
- Leave package version policy unchanged unless explicitly decided otherwise.

### Implementation Notes

- GitHub tags and Releases remain the source of truth for release identity.
- README should link to the playable build and docs, not claim a mutable current development
  target.
- Do not introduce deployment changes unless the existing Pages workflow fails.
- Keep release notes concise and player-facing.

### Deliverables

- v0.8 release notes draft.
- Final green validation.
- Final campaign harness snapshot.
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
start random Campaign Tension run
start each specific Campaign Tension
verify opening briefing contents
verify exact starting modifiers
verify active/favored sections are distinct
dismiss and reopen Campaign panel
queue targeted Gather Intel in Ghostline Signal and inspect bonus
advance weeks and inspect campaign-weighted event behavior
finish or force-end a run
inspect city/tension summary output
inspect campaign harness sections
```

### Review Gate

Merge to `main`, wait for Pages deployment, smoke test the deployed build, then tag `v0.8.0`
when satisfied.
