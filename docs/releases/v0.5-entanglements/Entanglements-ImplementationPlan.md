# Haunted Apex v0.5.0 Entanglements Implementation Plan

## Purpose

This plan breaks **v0.5.0: Entanglements** into reviewable implementation phases.

It follows [`Entanglements-TDD.md`](./Entanglements-TDD.md) and preserves the project
rules established by District Zero, Rival Territory, The Roster, and The Black Ledger:

- Keep the engine pure TypeScript.
- Keep Angular out of simulation rules.
- Keep static content separate from mutable run state.
- Keep seeded generation and simulation deterministic.
- Keep preview and resolution calculations shared.
- Keep every phase buildable and testable.
- Keep contact effects explicit and previewable.
- Keep contacts visible, useful, risky, trackable, and reportable without expanding into
  dialogue trees, romance, faction diplomacy, or procedural NPC simulation.
- Use the harness to evaluate balance rather than tuning from isolated examples.

## Completion Target

The release is complete when an eight-week run supports:

```text
Seeded active contacts
  -> Manage Contact target + option
  -> Pressure outcome + relationship change
  -> Ledger/event hooks
  -> Contact-aware reports and balance signals
```

The player should be able to:

```text
see three active outsiders in the Contacts panel
understand Trust, Leverage, Volatility, and Exposure
Cultivate, Pressure, or request services through Manage Contact
preview exact contact, pressure, Ledger, and rival consequences
see contacts shape events and Ledger entries
burn a contact and understand that the relationship door is closed
read final run contact outcomes
```

The harness must report whether contacts are used, which services dominate, whether
Pressure is too efficient, whether Volatility matters, and whether the broad v0.4 balance
profile remains recognizable.

The tested production build remains playable at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

## Phase 0: Baseline and Documentation Lock

### Objective

Establish a clean v0.4 baseline, lock the v0.5 design inputs, and verify the repository
before changing save-state or action contracts.

### Scope

- Confirm the repository is based on the approved and tagged v0.4 release.
- Keep the v0.5 vision, clarifications, TDD, and implementation plan together under:

```text
docs/releases/v0.5-entanglements/
```

- Update docs indexes so v0.5 documents are discoverable.
- Run the existing test suite.
- Run the standard production build.
- Run the GitHub Pages subpath build.
- Run the docs link checker.
- Record the current test count and representative v0.4 harness baseline.
- Record the current storage key and save schema version.
- Confirm no dev, Karma, or browser-debug process remains running.

### Implementation Notes

- Do not change gameplay behavior in this phase.
- Do not update package version to `0.5.0` yet.
- Treat `v0.5.md`, `v0.5A.md`, and `Entanglements-TDD.md` as locked inputs unless
  implementation reveals a contradiction.
- Preserve the v0.4 balance output as the comparison point for Phase 10.
- Keep the TypeScript config cleanup from the post-v0.4 pass if it remains green.

### Deliverables

- Complete v0.5 design set.
- Green v0.4 baseline.
- Recorded pre-Contact harness results.
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
```

### Completion Record

Completed June 9, 2026:

- Runtime validation used Node `24.16.0` from `.nvmrc` and npm `11.13.0`.
- Development baseline is `main` at commit `8427ad9`, which is tagged remotely and
  locally as `v0.4.0` after fetching tags from `github`.
- The branch is tracking `github/main`.
- The v0.5 documentation set is organized under:

```text
docs/releases/v0.5-entanglements/
```

- Added the v0.5 direction, clarifications, TDD, and implementation plan to
  `docs/README.md`.
- Added the v0.5 release folder to the root README development-documentation list.
- Current package metadata remains `0.0.0`; version `0.5.0` is reserved for release
  readiness.
- Current persistence key is `haunted-apex:v0.4:current-run`.
- Current save schema version is `4`.
- Current `GameState` has no Contact state. Phase 2 owns the schema version increase,
  `haunted-apex:v0.5:current-run`, and v0.4 save invalidation.
- The post-v0.4 TypeScript config cleanup remains in place:
  - `tsconfig.app.json` uses `rootDir: "./src"`.
  - `tsconfig.spec.json` uses `rootDir: "./src/app"`.
- Captured a deterministic 100-runs-per-agent baseline using seed prefix
  `V05-PHASE0-BASELINE`:

```text
Random:           1% wins, 0 incomplete, avg 6.79 weeks
Aggressive:      40% wins, 0 incomplete, avg 4.92 weeks
Cautious:         0% wins, 0 incomplete, avg 7.92 weeks
Greedy:          45% wins, 0 incomplete, avg 7.41 weeks
Operator / Sane: 75% wins, 0 incomplete, avg 6.00 weeks
```

- Primary baseline loss patterns:

```text
Random:     44 out of time, 43 bankrupt, 12 Heat lockdown
Aggressive: 45 Heat lockdown, 12 bankrupt, 2 out of time, 1 Loyalty collapse
Cautious:   96 out of time, 4 bankrupt
Greedy:     44 out of time, 9 Heat lockdown, 2 bankrupt
Operator:   15 bankrupt, 8 Heat lockdown, 2 out of time
```

- Ledger baseline summary:

```text
Random:     2.23 entries created, 0.45 consumed, 0.55 unresolved Debts
Aggressive: 2.43 entries created, 0.84 consumed, 0.94 unresolved Debts
Cautious:   3.15 entries created, 1.31 consumed, 0.00 unresolved Debts
Greedy:     5.06 entries created, 1.00 consumed, 1.74 unresolved Debts
Operator:   1.96 entries created, 0.72 consumed, 0.04 unresolved Debts
```

- All 320 existing tests passed in ChromeHeadless.
- Both application and specification TypeScript projects passed `--noEmit` checks.
- The standard production build passed.
- The production build with base href `/haunted-apex/` passed.
- The structural documentation check passed for five release folders.
- `git diff --check` passed.
- No development server, persistent Karma watcher, temporary harness file, or
  browser-debug process was left running.

### Review Gate

Confirm baseline and docs before adding the Contact model.

## Phase 1: Contact Models, Static Content, and Status Helpers

### Objective

Introduce the Contact domain contracts and authored v0.5 content without changing runtime
behavior.

### Scope

- Add Contact model types:
  - `ContactId`
  - `ContactStatus`
  - `ContactArchetype`
  - `ContactRoleTag`
  - `ContactGenerationTag`
  - `ContactMetricDelta`
  - `ContactInteraction`
  - `ContactState`
  - `ContactDefinition`
  - `ContactServiceDefinition`
  - `ContactServiceRequirement`
- Add the six Contact definitions:
  - Veyra Lux
  - Captain Rafe Hollis
  - Dr. Mercy Iram
  - Ciro Moth
  - Mina Glass
  - Father Static
- Add universal option constants for `Cultivate` and `Pressure`.
- Add content registry helpers and barrel exports.
- Add `deriveContactStatus`.
- Add contact metric clamp helpers.
- Add content validation tests.
- Do not add Contact state to live runs yet unless required by types.

### Implementation Notes

- Definitions contain authored data only.
- Runtime state references definitions by id.
- Include `social` and `stability` in `ContactRoleTag`.
- Keep "may create" service wording out of authored data. Ledger effects should be
  deterministic and previewable.
- Keep `status` out of `ContactState`.
- Contact descriptions must be player-readable because the UI will display them later.

### Deliverables

- Contact model file.
- Contact content registry.
- Status and clamp helpers.
- Exported public engine APIs.
- Static content test coverage.

### Verification

Unit tests:

- Exactly six Contact definitions exist.
- Contact ids are unique.
- Every Contact has valid archetype, role tags, base metrics, services, and flavor.
- `social` and `stability` are valid role tags.
- Every service has stable id, label, description, and explicit effects.
- `Cultivate` and `Pressure` constants match `v0.5A.md`.
- `deriveContactStatus` returns correct labels for major metric combinations.
- Contact metric clamp helper keeps metrics between 0 and 100.

### Completion Record

Completed June 9, 2026:

- Added Contact model contracts in `src/app/engine/model/contacts.ts`.
- Added explicit types for:
  - Contact ids, status labels, archetypes, role tags, generation tags, option ids, and
    service ids.
  - Contact metric deltas, runtime state, interactions, service costs, service
    requirements, service definitions, Ledger effect hooks, and universal option
    definitions.
- Added `social` and `stability` to `ContactRoleTag`.
- Added pure Contact helpers:
  - `deriveContactStatus`.
  - `clampContactMetric`.
  - `applyContactMetricDelta`.
- Added the six v0.5 Contact definitions in `src/app/engine/content/contacts.ts`:
  - Veyra Lux
  - Captain Rafe Hollis
  - Dr. Mercy Iram
  - Ciro Moth
  - Mina Glass
  - Father Static
- Added the locked universal Contact options:

```text
Cultivate: Resources -600, Trust +10, Volatility -6, Exposure +2
Pressure:  Intel +4, Ruin +2, Leverage +10, Trust -6, Volatility +8
```

- Kept service Ledger hooks deterministic and tied only to existing v0.4 Ledger
  definitions for this phase:
  - Veyra can create `debt_owes_liaison`.
  - Ciro can create `secret_dead_channel_trace`.
  - Mina can create `debt_contaminated_money`.
- Added static content validation in `contact-content.spec.ts`.
- Added helper coverage in `derive-contact-status.spec.ts` and `contact-metrics.spec.ts`.
- Exported Contact content, model types, and helper APIs through existing engine barrels.
- Did not add Contact state to `GameState`, did not alter save schema, and did not change
  runtime gameplay behavior.

Validation:

```text
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/content/contact-content.spec.ts --include=src/app/engine/contacts/derive-contact-status.spec.ts --include=src/app/engine/contacts/contact-metrics.spec.ts
npm run build
npm run check:docs
git diff --check
```

Focused Contact tests passed: 11 specs.
Full browser suite passed: 331 specs.

### Review Gate

Review authored contacts, services, and labels before generating runtime Contact state.

## Phase 2: Contact Generation, GameState, and Persistence Schema

### Objective

Add mutable Contact state to new runs and invalidate v0.4 saves through schema versioning.

### Scope

- Add `contacts` and `activeContactIds` to `GameState`.
- Add deterministic contact generation using existing seeded RNG utilities.
- Select exactly three active contacts per run.
- Enforce required role coverage:

```text
heat_control/security/stability
intel/ledger/nightlife/social
weird/ruin/rival_pressure
```

- Initialize `ContactState` from definitions.
- Keep inactive contacts in state only if useful for simpler persistence; normal selectors
  must hide them.
- Increment save schema version and storage key for v0.5.
- Invalidate v0.4 saves through the existing compatibility flow.
- Add selectors for active contacts and contact lookup.

### Implementation Notes

- Same seed and same content registry must produce the same active Contact set.
- Use all six static definitions as the selection pool.
- Do not expose inactive contacts in normal UI selectors.
- Do not migrate v0.4 saves.
- Keep generation independent of UI order quirks. Sort presentation separately if needed.

### Deliverables

- Contact generation module.
- Updated `newGame`.
- Updated persistence version/key.
- Active Contact selectors.
- Save incompatibility coverage.

### Verification

Unit tests:

- Contact generation is deterministic by seed.
- Exactly three active contacts are selected.
- Generated set satisfies all required coverage groups.
- Contact state initializes from definition base metrics.
- Derived status is available through selectors.
- Inactive contacts do not appear in normal selectors.
- v0.4 saves are rejected or reset by schema compatibility logic.
- New v0.5 saves round-trip Contact state.

### Review Gate

Confirm generated contact sets feel varied and coverage-complete before wiring actions.

### Phase 2 Completion Record

- Added deterministic Contact network generation in `src/app/engine/contacts/generate-contacts.ts`.
- New runs now carry schema `5`, full six-contact mutable state, and exactly three active
  Contacts selected from coverage-complete combinations.
- Active Contact selectors expose only active Contacts for normal UI/engine consumers while
  still allowing raw state lookup for internals.
- Bumped local persistence to:

```ts
CURRENT_SAVE_SCHEMA_VERSION = 5;
CURRENT_GAME_VERSION = '0.5.0';
CURRENT_RUN_STORAGE_KEY = 'haunted-apex:v0.5:current-run';
```

- Added `haunted-apex:v0.4:current-run` as a legacy incompatible key and updated the
  compatibility notice for Entanglements.
- Storage validation now rejects malformed Contact state, invalid active sets, and missing
  inactive Contact records.

Validation:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/contacts/generate-contacts.spec.ts --include=src/app/engine/selectors/contacts.spec.ts --include=src/app/engine/simulation/new-game.spec.ts --include=src/app/game/game-storage.service.spec.ts --include=src/app/game/game.facade.spec.ts
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm run check:docs
git diff --check
```

Focused Phase 2 tests passed: 47 specs.
Full browser suite passed: 340 specs.

## Phase 3: Contact Options, Affordability, and Preview Pipeline

### Objective

Build the shared Contact option preview pipeline before queueing or resolving `Manage
Contact`.

### Scope

- Add `ContactOptionKind`, `ContactOptionId`, `ContactOptionPreview`, and unavailable
  reason types.
- Generate universal `Cultivate` and `Pressure` options for every active non-burned
  contact.
- Generate service options from Contact definitions.
- Implement affordability checks for:
  - Resources
  - Intel
  - Trust
  - Leverage
  - service requirements
  - burned contacts
  - inactive contacts
  - special service constraints
- Implement `Quiet Treatment` target selection.
- Disable `Quiet Treatment` when all current roster operatives have `0` Stress.
- Add risk calculation hooks for contact options.
- Add target option rows for `Manage Contact`.

### Implementation Notes

- Preview and resolution must share core contact option calculation.
- Contact metric costs are not global pressure costs; keep them explicit in the contact
  pipeline.
- The command board should eventually use one target dropdown:

```text
Veyra Lux - Cultivate
Veyra Lux - Pressure
Veyra Lux - Private Room Access
```

- Do not change `resolveAction` in this phase unless needed for compile-time wiring.

### Deliverables

- Contact option preview module.
- Quiet Treatment helper.
- Contact target option selector.
- Focused unit tests.

### Verification

Unit tests:

- `Cultivate` and `Pressure` are available for every active non-burned contact.
- Burned contacts expose no queueable target options.
- Inactive contacts expose no normal target options.
- Unaffordable Resource and Intel costs disable service options.
- Trust and Leverage requirements disable service options.
- `Quiet Treatment` selects the highest-stress roster operative deterministically.
- `Quiet Treatment` is disabled when no operative has Stress.
- Contact option preview includes pressure effects, contact effects, costs, Ledger
  effects, rival pressure effects, and risk.

### Review Gate

Review preview output shape before adding the new command action.

### Phase 3 Completion Record

- Added shared Contact option preview logic in `src/app/engine/contacts/contact-options.ts`.
- Contact previews now cover:
  - universal `Cultivate` and `Pressure` options;
  - contact service options;
  - Resource, Intel, Trust, and Leverage cost checks;
  - service requirements;
  - inactive and burned Contact handling;
  - pressure effects and resolved pressure deltas;
  - Contact metric effects and resolved Contact metric deltas;
  - deterministic Ledger effect previews;
  - rival pressure effect previews;
  - contact-option risk hooks.
- Added deterministic `Quiet Treatment` targeting for the highest-stress current roster
  operative, with disabled previews when no operative has Stress.
- Extended `ActionTarget` with the v0.5 Contact target shape:

```ts
{ type: 'contact'; contactId: ContactId; optionId: ContactOptionId }
```

- Added neutral compile-time support for Contact targets in existing UI, Ledger, secret
  discovery, and harness helpers. Contact targets are not command-board actions yet.
- Added `selectManageContactTargetOptions` to produce future `Manage Contact` target rows
  like `Veyra Lux - Cultivate`.
- Added focused Contact option coverage in
  `src/app/engine/contacts/contact-options.spec.ts`.

Validation:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/contacts/contact-options.spec.ts --include=src/app/engine/contacts/generate-contacts.spec.ts --include=src/app/engine/selectors/contacts.spec.ts
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm run check:docs
git diff --check
```

Focused Contact pipeline tests passed: 13 specs.
Full browser suite passed: 348 specs.

## Phase 4: Manage Contact Queueing and Resolution

### Objective

Add `Manage Contact` as a playable command-phase action and resolve Contact options
through the shared pipeline.

### Scope

- Add `manage_contact` to action definitions.
- Extend `ActionTarget` with `{ type: 'contact'; contactId; optionId }`.
- Make `Manage Contact`:
  - command cost 1
  - resource cost 0
  - base risk 10
  - requires target
  - allowed target type `contact`
  - assignment `none`
  - stress type `none`
- Update queue validation for contact targets and no-assignment behavior.
- Route `resolveAction` to Contact option resolution.
- Apply costs, pressure effects, contact effects, special effects, rival pressure effects,
  and event logs.
- Record recent contact interactions.
- Add contact effect rows to action preview and queued order views.

### Implementation Notes

- Resolution order:
  1. Validate target and option.
  2. Pay Resource, Intel, Trust, and Leverage costs.
  3. Apply pressure effects.
  4. Apply contact metric effects.
  5. Apply special effects such as Quiet Treatment.
  6. Apply rival pressure effects.
  7. Apply Ledger effects if already available.
  8. Record interaction.
  9. Add event log entries.
- If Ledger integration is deferred to Phase 5, stub or skip Ledger effects without
  hiding them from tests that belong in Phase 5.
- Clamps apply after costs and effects.

### Deliverables

- Queueable `Manage Contact` action.
- Contact resolution pipeline.
- Recent interaction recording.
- Contact action logs.
- Tests for queueing and resolution.

### Verification

Unit tests:

- `Manage Contact` rejects missing contact target.
- `Manage Contact` rejects assigned operatives.
- `Manage Contact` rejects burned and inactive contacts.
- `Manage Contact` rejects unknown option ids.
- `Manage Contact` rejects unaffordable options.
- `Cultivate` changes Resources, Trust, Volatility, and Exposure exactly as previewed.
- `Pressure` changes Intel, Ruin, Leverage, Trust, and Volatility exactly as previewed.
- Contact services apply pressure and contact effects.
- Recent interactions record week, option id, kind, label, and contact deltas.
- Quiet Treatment reduces selected operative Stress by 10.

### Review Gate

Confirm `Manage Contact` is mechanically playable in engine tests before connecting it to
Ledger and UI.

### Phase 4 Completion Record

- Added `manage_contact` to the action registry:

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

- Wired Contact targets into normal target selection so the command board can show rows
  such as `Veyra Lux - Cultivate`.
- Added queue validation for:
  - missing Contact target;
  - assigned operative rejection;
  - inactive Contacts;
  - burned Contacts;
  - unknown Contact option ids;
  - Resource, Intel, Trust, Leverage, and service requirement failures;
  - queued Contact costs against already queued orders.
- Added `resolveContactOption` in `src/app/engine/simulation/resolve-contact.ts`.
- `Manage Contact` resolution now:
  - consumes Resource, Intel, Trust, and Leverage costs through the shared preview;
  - applies pressure effects;
  - applies Contact metric effects;
  - applies deterministic Quiet Treatment Stress relief;
  - applies rival pressure effects;
  - records recent Contact interactions;
  - emits order resolution and complication logs.
- Contact service Ledger creation is intentionally deferred to Phase 5, while previews and
  resolution logs preserve visible Ledger hook information.
- Added Contact cost/effect rows to command-card previews and queued-order views.

Validation:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/simulation/queue-order.spec.ts --include=src/app/engine/simulation/resolve-contact.spec.ts --include=src/app/engine/selectors/previews.spec.ts --include=src/app/engine/contacts/contact-options.spec.ts
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm run check:docs
git diff --check
```

Focused Phase 4 tests passed: 72 specs.
Full browser suite passed: 357 specs.
The production build, documentation link check, and whitespace diff check passed.

## Phase 5: Contact-Ledger Integration

### Objective

Connect Contacts to the Black Ledger through explicit, previewable links and declared
contact effects.

### Scope

- Add `relatedContactId` to runtime `LedgerEntry`.
- Extend Ledger effect creation to support Contact context.
- Add deterministic Contact service Ledger effects:
  - Veyra service can create `Owes the Liaison`.
  - Mina service can create a private investor Debt.
  - Ciro/Father Static services can create a relevant Secret.
  - Hollis-related Favor can link to Hollis when active.
- Add contact effects to selected Ledger use options.
- Show contact-linked Ledger consequences in Contact option previews.
- Apply contact effects from Ledger use only when declared.
- Display related contact labels in Ledger selectors.

### Implementation Notes

- `relatedContactId` creates the relationship.
- `relatedContactEffects` define the consequence.
- Do not apply automatic generic contact deltas just because an entry is linked.
- Prefer reusing existing Ledger definitions where practical. Add a small number of new
  definitions only when the content needs a distinct named entry.
- If a service creates a Ledger entry tied to an inactive contact, omit the link or avoid
  that service path by construction.

### Deliverables

- Ledger model extension.
- Contact-aware Ledger creation.
- Contact-aware Ledger use effects.
- Contact-linked Ledger UI selector data.
- Tests covering declared-only contact consequences.

### Verification

Unit tests:

- Contact service Ledger effects create entries with `relatedContactId`.
- Ledger panel selectors expose related contact labels.
- Using a contact-linked Ledger entry applies contact effects when declared.
- Using a contact-linked Ledger entry does not modify the contact when no contact effects
  are declared.
- Event logs and previews show contact consequences from Ledger use.

### Review Gate

Review whether Ledger links feel legible and non-magical before adding weekly events.

### Phase 5 Completion Record

- Added `relatedContactId` to runtime `LedgerEntry` and `AddLedgerEntryRequest`.
- Added `relatedContactEffects` to `LedgerUseOptionDefinition`.
- Contact service Ledger hooks now create real linked entries:
  - Veyra Lux `Private Room Access` creates `Owes the Liaison`.
  - Captain Rafe Hollis `Clean Passage` creates `Checkpoint Captain`.
  - Ciro Moth `Hidden Route` creates `Dead Channel Trace`.
  - Mina Glass `Quiet Investor` creates `Contaminated Money`.
- Selected Ledger use options now declare Contact consequences when used through a linked
  entry:
  - `Owes the Liaison`
  - `Contaminated Money`
  - `Dead Channel Trace`
  - `Checkpoint Captain`
- `Work the Ledger` previews, selector views, UI summaries, and resolution logs expose
  declared linked Contact effects.
- Linked Ledger entries with no declared `relatedContactEffects` intentionally leave the
  Contact unchanged.

Validation:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/engine/simulation/resolve-contact.spec.ts --include=src/app/engine/ledger/ledger-use.spec.ts --include=src/app/engine/ledger/ledger-selectors.spec.ts --include=src/app/engine/content/contact-content.spec.ts
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm run check:docs
git diff --check
```

Focused Phase 5 tests passed: 27 specs.
Full browser suite passed: 361 specs.
The production build, documentation link check, and whitespace diff check passed.
The post-suite Karma process was explicitly terminated after reporting success.

## Phase 6: Contact Events and Existing Event Hooks

### Objective

Make Contacts matter outside explicit player actions by adding Contact-aware event
selection, previews, and resolution.

### Scope

- Extend event choice definitions and previews with contact effects.
- Add Contact event eligibility helpers.
- Add signature event once-per-run tracking.
- Add generic event repeat cooldown and downweighting.
- Add at least four Contact-specific events, preferably:
  - `Contact Wants Assurance`
  - `Veyra's Room`
  - `Hollis Is Being Watched`
  - `Mercy's Bill`
  - `Ciro's Route Remembers`
  - `Confession Leak`
- Update selected existing events:
  - Liaison Offers a Favor / Veyra Offers a Favor
  - Corp Patrol Sweep / Hollis effects
  - Unexpected Windfall / Ciro or Father Static links
- Add contact event weighting into the existing single weekly event slot.

### Implementation Notes

- Contact events must require active non-burned contacts.
- Signature events fire at most once per run.
- Generic contact event cannot repeat within two weeks.
- Generic contact event weight is reduced by 50% after first firing.
- Event choice previews and resolution must use the same declared effects.
- Event logs should identify the affected contact by name.
- Avoid hardcoding Contact ids in simulation code where a definition or context can drive
  behavior. Hand-authored event definitions are fine.

### Deliverables

- Contact event content.
- Contact event eligibility and weighting.
- Contact effect event preview/resolution.
- Existing event integrations.
- Tests for recurrence and active-contact constraints.

### Verification

Unit tests:

- Contact events only trigger for active non-burned contacts.
- Signature Contact events fire at most once per run.
- Generic Contact events respect two-week cooldown.
- Generic Contact events downweight after firing.
- Contact event eligibility responds to Trust, Volatility, Exposure, recent use, and
  related context where implemented.
- Event choice previews show exact contact effects.
- Event resolution applies the same contact effects shown in preview.
- Burned contacts are excluded from normal contact event eligibility.

### Review Gate

Review event frequency and event copy before UI work makes the system more visible.

## Phase 7: Contact Selectors and UI Panel

### Objective

Expose active Contacts in the UI without redesigning the game shell.

### Scope

- Add Contact card selectors:
  - name
  - archetype
  - status
  - associations
  - metrics
  - services
  - related Ledger entries
  - recent interactions
  - burned state
- Add a Contacts panel or tab to the current one-screen layout.
- Show active contacts only, including burned contacts.
- Add selected Contact detail if the panel needs more room.
- Use title-case display text for statuses and tags.
- Display metric rows or compact meters for Trust, Leverage, Volatility, and Exposure.
- Show disabled/burned service state.
- Keep debug flags hidden unless debug mode is visible.

### Implementation Notes

- Avoid an animated graph or large redesign.
- Avoid nested cards.
- Keep page density consistent with the v0.4 panels.
- If vertical space becomes strained, use a scrollable inner area with themed scrollbar
  styling consistent with Field Guide and Event Feed.
- Keep inactive contacts out of normal UI.

### Deliverables

- Contact panel selectors.
- Contact panel UI.
- Burned contact visual treatment.
- Contact detail/recent interaction display.
- Component tests for visible content.

### Verification

Component tests:

- Contacts panel renders three active contacts.
- Inactive contacts are absent.
- Burned contacts render muted and unusable.
- Contact statuses are display-formatted.
- Contact metrics and services appear.
- Recent interactions appear after contact use.
- Related Ledger entries display when present.

### Review Gate

Manual UI review: confirm Contact cards are readable and do not make the one-screen layout
feel like an enterprise dashboard.

## Phase 8: Command Board and Event Choice UX

### Objective

Make Contact actions and consequences understandable at decision time.

### Scope

- Add `Manage Contact` to the command board.
- Render contact target options in the existing target dropdown.
- Keep Assign hidden because `Manage Contact` uses `assignment: 'none'`.
- Show Contact option preview blocks:
  - selected contact
  - option kind
  - pressure effects
  - contact effects
  - Resource/Intel costs
  - Trust/Leverage costs
  - Ledger effects
  - rival pressure effects
  - Quiet Treatment target
  - risk
- Show Contact effects in queued order summaries.
- Show exact Contact effects on event choice cards.
- Show Contact effects in Event Feed entries.
- Update Field Guide with a compact Entanglements section.

### Implementation Notes

- Match existing command-card style.
- Do not add a second dropdown for service selection in v0.5; use target rows like
  `Work the Ledger`.
- Use explicit labels such as `Veyra: Trust +2, Volatility +6`.
- Keep effect chips from wrapping badly; use nowrap for metric-value units where needed.

### Deliverables

- Playable `Manage Contact` UI.
- Contact effect previews.
- Contact effect event-choice display.
- Contact Field Guide update.
- Component tests.

### Verification

Component tests:

- `Manage Contact` appears on the command board.
- Target dropdown includes active contact options and excludes inactive/burned options.
- Assign dropdown is absent for `Manage Contact`.
- Selected Contact option updates preview.
- Disabled options show clear unavailable copy.
- Quiet Treatment preview shows target operative name.
- Event choices show Contact effects.

Manual checks:

- Queue and resolve Cultivate.
- Queue and resolve Pressure.
- Queue and resolve at least one service.
- Trigger or seed-test at least one Contact event.
- Confirm no UI overlap at common desktop/mobile widths.

### Review Gate

Manual playthrough review: confirm players can understand what Contacts do before
committing actions or event choices.

## Phase 9: Agents and Harness Reports

### Objective

Make the simulation harness Contact-aware so v0.5 can be tuned iteratively.

### Scope

- Update all agents with basic Contact option handling.
- Teach `OperatorBot` to use Contacts to solve specific pressure problems.
- Teach `CautiousBot`, `AggressiveBot`, `GreedyBot`, and `RandomBot` their documented
  Contact tendencies.
- Extend simulation collection with Contact usage metrics.
- Add report sections:
  - `contact_usage`
  - `contact_outcomes`
  - `contact_events`
  - `contact_ledger`
  - `contact_sets`
- Include burned contact counts.
- Include average final Trust, Leverage, Volatility, and Exposure.

### Implementation Notes

- Agents should use the same public selectors and queue APIs as UI-equivalent decision
  makers.
- Do not let agents inspect private implementation details that a UI bot could not infer.
- Keep reports CSV-compatible.
- Avoid over-optimizing OperatorBot before the first balance run.

### Deliverables

- Contact-aware agents.
- Contact-aware harness reports.
- Report tests.
- Initial v0.5 harness snapshot.

### Verification

Unit/integration tests:

- Harness completes simulations with Contacts enabled.
- Each agent can queue valid Contact actions when appropriate.
- Contact report sections are emitted.
- Contact set win-rate report groups runs deterministically.
- Burned contact counts and average metrics are reported.
- No report section breaks CSV parsing.

Recommended harness:

```text
100 runs per agent
500 total runs
full detailed report copied from UI harness
```

### Review Gate

Review first Contact harness output before balance changes.

## Phase 10: Balance and Tuning

### Objective

Tune Contact services, event weights, and agent behavior until Contacts are meaningful
without becoming mandatory.

### Scope

- Compare v0.5 harness output against v0.4 baseline.
- Tune Contact service costs/effects.
- Tune universal `Cultivate` and `Pressure` only if the locked values are clearly causing
  bad outcomes.
- Tune Contact event weights and recurrence.
- Tune Contact-linked Ledger effects.
- Tune agents enough for useful measurement.
- Preserve broad v0.4 balance profile:

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
No single contact is mandatory for OperatorBot
Pressure is powerful but visibly corrosive
Cultivate is useful in longer or strained runs, but not always necessary
```

### Implementation Notes

- Treat first-pass numbers as provisional.
- If OperatorBot never uses Contacts, services are too weak or strategy hooks are too
  narrow.
- If OperatorBot always uses the same Contact, that service is too efficient.
- If Volatility never matters, event weights are too low.
- If Contact events dominate the run, event weights are too high.
- If Pressure is always optimal, Trust needs more value or Pressure needs sharper
  consequences.
- If Cultivate is never used, relationships recover too easily or services are too cheap.

### Deliverables

- Tuned Contact content and event weights.
- Updated harness snapshot.
- Implementation plan completion notes for tuning decisions.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

Harness:

```text
100+ runs per agent after each meaningful tuning pass
compare win rates, loss causes, Contact use rates, event rates, burned counts
```

### Review Gate

Manual and harness review: confirm Contacts are useful, risky, and not mandatory.

## Phase 11: Release Readiness, Documentation, and Pages Build

### Objective

Prepare v0.5 for merge, deployment, smoke testing, and tagging.

### Scope

- Update README/docs links if any new v0.5 docs were added.
- Add v0.5 release notes draft.
- Update Field Guide copy if playtesting reveals missing explanations.
- Ensure debug-only Contact data remains hidden in normal play.
- Run full validation suite.
- Run production Pages build.
- Run docs checker.
- Run final harness snapshot.
- Confirm no dev, Karma, or browser-debug process remains running.
- Leave package version policy unchanged unless explicitly decided otherwise.

### Implementation Notes

- GitHub tags and Releases remain the source of truth for release identity.
- README should link to the playable build and docs, not claim a mutable "current
  development target."
- Do not introduce deployment changes unless the existing Pages workflow fails.
- Keep release notes concise and player-facing.

### Deliverables

- v0.5 release notes draft.
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
inspect Contacts panel
queue Cultivate
queue Pressure
queue one service
observe a Contact event or deterministic test seed
use a Contact-linked Ledger entry
finish or force-end a run
inspect run-end Contact report
```

### Review Gate

Merge to `main`, wait for Pages deployment, smoke test the deployed build, then tag
`v0.5.0` when satisfied.
