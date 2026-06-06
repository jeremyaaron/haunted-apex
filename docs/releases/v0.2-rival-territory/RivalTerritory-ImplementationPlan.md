# Haunted Apex v0.2.0 Rival Territory Implementation Plan

## Purpose

This plan breaks **v0.2.0: Rival Territory** into reviewable implementation phases.

It follows [`RivalTerritory-TDD.md`](./RivalTerritory-TDD.md) and preserves the existing development rules:

- Keep the engine pure TypeScript.
- Keep Angular out of simulation rules.
- Keep static content separate from mutable game state.
- Keep seeded runs deterministic.
- Keep every phase buildable and testable.
- Review engine contracts before wiring dependent UI.
- Do not expand into a map, ownership simulation, or rival AI.

## Completion Target

The release is complete when an eight-week run supports:

```text
Action + Operative + Target
  -> Target-modified outcome
  -> District control/local heat
  -> Rival pressure
  -> Contextual weekly event
```

The one-screen Black Ledger must remain playable, and the simulation harness must report whether target and rival systems materially affect strategy.

The tested production build must also be playable from:

```text
https://jeremyaaron.github.io/haunted-apex/
```

## Phase 0: Baseline and Documentation Lock

### Objective

Establish a clean v0.1 baseline and lock the v0.2 design inputs before changing engine contracts.

### Scope

- Confirm the repository is based on the tagged `v0.1.0` District Zero release.
- Preserve the organized documentation structure.
- Add this implementation plan to the v0.2 document index.
- Run the existing build and test suite.
- Record the current harness baseline if useful for later comparison.
- Confirm no dev server remains running after verification.

### Deliverables

- v0.2 direction, clarifications, TDD, and plan live together.
- Existing v0.1 behavior is green before implementation begins.
- The worktree contains no accidental generated or server artifacts.

### Verification

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

Optional baseline:

```text
100 runs per existing agent
Current win rates and average final pressures
```

### Completion Record

Completed June 5, 2026:

- `main` and remote tag `v0.1.0` both resolve to commit `182e270`.
- Documentation is organized under `docs/`; only `README.md` remains at the project root.
- Runtime validation used Node `24.16.0` from `.nvmrc` and npm `11.13.0`.
- `npm ci` completed with zero reported vulnerabilities.
- All 76 existing tests passed in ChromeHeadless.
- The standard production build passed.
- The production build with base href `/haunted-apex/` passed.
- The Pages browser artifact was 272 KB at baseline.
- `dist`, `.angular`, and `node_modules` remain ignored.
- No Angular dev server or Karma server was left running.
- The optional harness baseline was not repeated; Phase 9 will establish the targeted-system baseline before balance work.

### Review Gate

Confirm the documentation and phase boundaries before changing the state model.

---

## Phase 1: Territory Models, Content, and New Game State

### Objective

Introduce districts, venues, rivals, and mutable overlays without changing action behavior yet.

### Scope

- Add identifier and model types:
  - `DistrictId`
  - `VenueId`
  - `RivalId`
  - `DistrictDefinition`
  - `VenueDefinition`
  - `RivalDefinition`
  - `DistrictState`
  - `RivalState`
  - `RecentActivityEntry`
- Add static content registries:
  - three districts
  - four venues
  - two rivals
- Add content lookup helpers:
  - `getDistrictDefinition`
  - `getVenueDefinition`
  - `getRivalDefinition`
- Extend `GameState` with:
  - `districts`
  - `rivals`
  - `recentActivity`
- Initialize mutable overlays in `newGame()`.
- Export the new model/content APIs through existing barrel files.

### Implementation Notes

- Do not store full content definitions in `GameState`.
- Keep venue ownership static in v0.2.
- Preserve JSON serializability.
- Use records keyed by explicit IDs for mutable overlays.
- Clone mutable collections when creating a new game.

### Deliverables

- New games contain complete district/rival state.
- Static content references are internally valid.
- Existing un-targeted game behavior still compiles.

### Verification

Unit tests:

- All district venue IDs resolve.
- Every venue resolves to a district.
- Every rival-controlled district/venue resolves.
- New game initializes base control and heat.
- New game initializes rival pressure/disposition.
- `recentActivity` starts empty.
- Same seed creates identical state.

### Completion Record

Completed June 6, 2026:

- Added explicit district, venue, rival, and recent-activity model types.
- Added the three district, four venue, and two rival static content registries.
- Added typed lookup helpers and public engine exports for the new content.
- Extended `GameState` with district overlays, rival overlays, and recent activity.
- `newGame()` initializes mutable overlays from static base values.
- Separate new games do not share mutable territory or rival state.
- Added `ActionTarget` as a type-only prerequisite for `RecentActivityEntry`; queued orders and targeting behavior remain unchanged until Phase 2.
- All 83 tests pass.
- Standard and Pages-subpath production builds pass.

### Review Gate

Review the model and content boundary. Correct state shape problems before adding targets to queued orders.

---

## Phase 2: Action Targets and Queue Validation

### Objective

Add targets as a legal command-phase concept, without applying target modifiers yet.

### Scope

- Add `ActionTarget`.
- Extend `QueuedOrder` with optional `target`.
- Extend `ActionDefinition` with:
  - `requiresTarget`
  - `allowedTargetTypes`
- Configure target rules for all six actions.
- Extend queue requests to accept a target.
- Add target validation:
  - required target
  - allowed type
  - known ID
  - active rival
- Add target-specific unavailable reasons.
- Preserve targets when orders are queued.
- Add territory lookup helpers:
  - resolve target district
  - resolve controller
  - resolve target tags
- Add `selectActionTargetOptions(state, actionId)`.

### Implementation Notes

- Optional actions remain legal without a target.
- Required actions are unavailable without one.
- Angular should eventually consume target options from selectors, not content registries directly.
- Stable target option ordering is part of the selector contract.

### Deliverables

- Pure engine commands can queue legal targeted orders.
- Invalid targets are rejected consistently.
- Existing command-point and operative-assignment rules still apply.

### Verification

Unit tests:

- Run Small Job cannot queue without target.
- Expand Influence cannot queue without target.
- Gather Intel can queue without target.
- Unsupported target type is rejected.
- Unknown target ID is rejected.
- Rival target must be active.
- Queued order preserves its target.
- Removing a targeted order restores normal availability.
- Target options contain the expected districts, venues, and rivals.

### Completion Record

Completed June 6, 2026:

- Added target requirements and allowed target types to all six action definitions.
- Extended queue requests and queued orders with typed district, venue, or rival targets.
- Added target validation for requirements, allowed types, known IDs, and active rivals.
- Added shared helpers for target district, tags, and controlling rival.
- Added stable action target options with district and controller metadata.
- Required targets now block queueing until a legal target is provided.
- Optional target actions remain legal without a target.
- The simulation harness enumerates legal target combinations so existing agents continue to complete runs; target-aware policies remain deferred to Phase 9.
- Added 15 Phase 2 tests; all 98 tests pass.
- The Pages-subpath production build passes.

### Review Gate

Review queue API and unavailable reasons before previews and UI depend on them.

---

## Phase 3: Target Modifiers, Risk, and Preview Pipeline

### Objective

Make target choice visibly change expected outcomes and risk.

### Scope

- Refactor adjusted-effect calculation into one shared pipeline:
  1. base action effects
  2. operative modifiers
  3. district modifiers
  4. venue modifiers
- Add district reward/heat modifiers.
- Add venue pressure modifiers.
- Extend risk calculation with:
  - local district heat
  - district control thresholds
- Extend `ActionPreview` with:
  - selected target
  - target label
  - target-modified effects
  - rival attention projection
  - local control/heat projection
- Extend queued-order views with target labels.
- Add rival pressure tier selector.

### Implementation Notes

- Preview and resolution must call the same target-effect helpers.
- Venue modifiers apply after district modifiers.
- A target modifier only changes pressure keys already present.
- Resource cost remains distinct from action effects.
- Preview local heat is based on expected positive Heat before complication.
- Rival attention shows exact gain and projected tier.

### Deliverables

- Selecting a target changes preview effects where appropriate.
- Targeted risk reflects local heat and control.
- Controlled targets display rival attention.
- Queued order view models include target context.

### Verification

Unit tests:

- District wealth modifies Resource-producing actions.
- District secrecy modifies Intel-producing actions.
- Current local heat increases positive Heat.
- Venue modifiers compose after district modifiers.
- Venue modifiers do not introduce unrelated pressure keys.
- Operative plus target modifiers compose correctly.
- Control 40 reduces risk by 2.
- Control 70 reduces risk by 4.
- Risk remains clamped.
- Controlled targets project the correct rival pressure.
- Preview and expected resolution effects agree.

### Completion Record

Completed June 6, 2026:

- Added one shared operative, district, and venue effect pipeline used by previews and resolution.
- Added district wealth, secrecy, and current-local-Heat modifiers.
- Added venue pressure modifiers that preserve the action's existing pressure keys.
- Extended risk with excess local Heat and the control 40/70 reductions.
- Added rival pressure gains and the four pressure-tier thresholds.
- Extended action previews with selected target, target label, rival attention, and local impact.
- Extended queued-order views with target labels and target-adjusted effects.
- Updated the harness to score the target-adjusted preview for each legal option.
- Target effects now change global action resolution, but district control, local Heat, and rival pressure remain projection-only until Phase 4.
- Added 12 Phase 3 tests; all 110 tests pass.
- TypeScript and the Pages-subpath production build pass.

### Review Gate

Inspect representative previews for each venue and district. Target choice should matter without making effects difficult to understand.

---

## Phase 4: Targeted Action Resolution and Recent Activity

### Objective

Apply territorial consequences when targeted orders resolve.

### Scope

- Use the shared target modifier pipeline in `resolveQueuedOrder`.
- Apply district control gains:
  - Expand Influence: district +12, venue +8
  - Run Small Job: +3
  - Gather Intel: +1
- Apply local heat gain from final positive action Heat.
- Increase the controlling rival's pressure.
- Record structured `RecentActivityEntry` values.
- Add detailed target/rival information to action logs.
- Add weekly local district cooling.
- Prune recent activity to the required window.
- Clamp district control, local heat, and rival pressure.

### Implementation Notes

- Local heat uses the final resolved action Heat delta, including complication.
- Local heat does not fall below the district base heat.
- Rival pressure does not decay.
- Rival-targeted actions can add pressure without a district impact.
- Venue controller takes precedence over district controller.
- Record recent activity after the final action result is known.

### Deliverables

- Targeted orders mutate district and rival overlays.
- Recent activity contains compact event-weighting context.
- Logs explain global and local outcomes.

### Verification

Unit tests:

- District-targeted Expand Influence adds 12 control.
- Venue-targeted Expand Influence adds 8 control.
- Small Job and Gather Intel add expected control.
- Positive Heat increases local heat by `ceil(heat / 3)`.
- Negative Heat does not reduce local heat.
- Local cooling subtracts one but respects base heat.
- Controlled target increases the correct rival pressure.
- Uncontrolled target adds no rival pressure.
- Rival target adds pressure without changing district state.
- Recent activity captures tags and deltas.
- Old activity is pruned.

### Completion Record

Completed June 6, 2026:

- Targeted actions now mutate district control and local Heat using the shared Phase 3 projections.
- Local Heat uses the final resolved Heat delta, including complications.
- Controlled targets add the configured pressure to the correct rival and clamp at 100.
- Direct rival targets add rival pressure without changing district overlays.
- Uncontrolled territory adds no rival pressure.
- Every resolved order records compact recent activity with target tags, rival context, and final Heat/Dominion deltas.
- Recent activity is pruned to the current week plus the prior two weeks before event selection.
- Weekly local cooling runs after global drift and does not fall below district base Heat.
- Action logs now name targets, local effects, and rival attention.
- Added 12 Phase 4 tests; all 122 tests pass.
- TypeScript and the Pages-subpath production build pass.

### Review Gate

Resolve one full targeted week headlessly and inspect state/log changes before adding passive rival consequences.

---

## Phase 5: Rival Passive Effects and Week Resolution Order

### Objective

Make accumulated rival pressure produce simple weekly consequences.

### Scope

- Add rival pressure tier helpers.
- Add passive rival resolution:
  - Nyx pressure >= 60 and Intel < 20: Loyalty -3
  - Knox pressure >= 60: Heat +3
- Add rival passive-effect log entries.
- Integrate local cooling and rival effects into `advanceWeek`.
- Match the canonical v0.2 order:
  1. resolve targeted orders
  2. idle stress recovery
  3. global drift
  4. local cooling
  5. passive rival effects
  6. weekly event selection
- Keep final win/loss evaluation after event response as specified by `v0.2A.md`.

### Implementation Notes

- Passive effects occur at most once per rival each week.
- Inactive rivals do nothing.
- Clamp global pressures after passive effects.
- Do not add rival plans, turns, or direct operations.

### Deliverables

- High rival pressure affects the global pressure loop.
- Rival effects are deterministic and logged.
- Week resolution follows one documented sequence.

### Verification

Unit tests:

- Nyx does nothing below pressure 60.
- Nyx does nothing when Intel is at least 20.
- Nyx applies Loyalty -3 under the full condition.
- Knox applies Heat +3 at pressure 60.
- Passive effects happen once per week.
- Inactive rival has no effect.
- Local cooling occurs before rival effects.
- Event selection occurs after rival effects.

### Completion Record

Completed June 6, 2026:

- Added deterministic passive resolution for Nyx Ardent and Knox Marrow at pressure 60.
- Nyx reduces Loyalty by 3 only while Intel is below 20; Knox increases Heat by 3.
- Inactive rivals do nothing, and rival-tagged logs prevent duplicate effects within one week.
- Passive pressure deltas use the shared global pressure clamps.
- Weekly resolution now runs actions, recovery, drift, local cooling, rival effects, activity pruning, and event selection in canonical order.
- Removed the pre-event win/loss checkpoint so the weekly event response resolves before final outcome evaluation.
- Added a dedicated `rival_effect` log type with rival name, reason, exact delta, and rival tags.
- Added 7 Phase 5 tests; all 129 tests pass.
- TypeScript and the Pages-subpath production build pass.

### Review Gate

Review whether rival pressure has a legible consequence without behaving like full rival AI.

---

## Phase 6: Contextual Event Weighting

### Objective

Make existing weekly events respond to recent locations and rival pressure.

### Scope

- Build `EventWeightContext` from:
  - recent target tags
  - recent rival IDs
  - current rival pressure
  - current local district heat
- Apply target-tag modifiers:
  - nightlife
  - violence
  - memory
- Apply Nyx and Knox pressure modifiers.
- Apply local high-heat modifier to Heat-tagged events.
- Preserve existing pressure/flag weighting.
- Preserve recent-negative-event penalties.
- Add diagnostics indicating which context modifiers affected a selected event.

### Implementation Notes

- Positive context modifiers apply before the recent-event penalty.
- Do not add new event definitions unless implementation exposes an unavoidable content gap.
- Event selection remains seeded and deterministic.
- Diagnostics may live in the selection result or debug metadata rather than permanent game state.

### Deliverables

- Existing events become location/rival-sensitive.
- Same state, recent activity, and seed produce the same event.
- Harness reporting can later count context-influenced events.

### Verification

Unit tests:

- Nightlife raises Liaison Favor weight.
- Violence raises Job Goes Loud weight.
- Memory raises Windfall and Blackmail weights.
- Nyx pressure raises intended event weights.
- Knox pressure raises intended event weights.
- Recently targeted high-heat district raises Heat event weights.
- Recent penalty still applies after additions.
- Deterministic selection remains stable.

### Review Gate

Compare event weights across at least three recent-activity contexts. Confirm that context matters without making one event inevitable.

---

## Phase 7: Persistence and Facade Integration

### Objective

Make the expanded state safely persist and expose targeted commands through the Angular application layer.

### Scope

- Change storage key to:

```text
haunted-apex:v0.2:current-run
```

- Extend storage validation for:
  - district overlays
  - rival overlays
  - recent activity
  - queued-order targets
- Reject v0.1-shaped saves.
- Extend `GameFacade.queueOrder` with target.
- Expose target option selectors and territory/rival views as needed.
- Preserve autosave after meaningful state transitions.
- Confirm reset/new-run behavior starts complete v0.2 state.

### Implementation Notes

- Do not migrate the v0.1 current run.
- Keep localStorage access isolated in the storage service.
- Prefer validating referenced IDs against content registries.
- Do not add a general migration framework in this phase.

### Deliverables

- v0.2 games save and reload.
- Old/incomplete saves fail safely.
- Angular can issue fully targeted engine commands through the facade.

### Verification

Unit tests:

- Complete v0.2 state round-trips.
- v0.1-shaped state is rejected.
- Missing district or rival records are rejected.
- Invalid queued target is rejected.
- Facade queues and persists a targeted order.
- Reset clears saved v0.2 state and transient selections.

### Review Gate

Inspect serialized state once before wiring the full UI.

---

## Phase 8: Target Selection and Territory UI

### Objective

Make Rival Territory fully playable through the Black Ledger.

### Scope

- Add transient selected-target state per action card.
- Add target selectors to action cards.
- Disable required-target actions until a valid target is selected.
- Recompute previews when target or operative changes.
- Show:
  - target-adjusted effects
  - exact risk
  - rival attention
  - local control/heat impact
- Show target on queued orders.
- Add compact territory panel:
  - districts
  - current/base heat
  - control
  - controlling rival
  - venue modifiers
- Add compact rival panel:
  - pressure
  - tier
  - disposition
  - attack style
  - controlled territory
- Extend debug panel with territory, rival, and activity JSON.
- Preserve responsive behavior and current visual hierarchy.

### Implementation Notes

- Use selectors/view models instead of reading content registries throughout the template.
- Native selects are acceptable for v0.2.
- Labels must distinguish districts, venues, and rivals.
- Keep the territory panel dense; do not create a fake map.
- Clear transient target selection after successful queue, reset, or new run.

### Deliverables

- A player can complete a targeted eight-week run through the UI.
- Target choice visibly changes previews.
- Rival and territory state remain visible while planning.
- Required-target disabled states explain what is missing.

### Verification

Component tests:

- Target selectors render expected options.
- Required action queue button is disabled without target.
- Selecting a target updates effects/risk.
- Controlled target renders rival warning.
- Queued order renders its target.
- Territory panel renders three districts and four venues.
- Rival panel renders Nyx and Knox.
- New Run clears selected targets.

Manual checks:

- Complete one full run.
- No target/operative selector overlap.
- Queued orders remain easy to scan.
- Territory and rival panels remain tolerable at narrower widths.
- No dev server remains running after validation.

### Review Gate

Review the central v0.2 question:

> I know what I want to do, but where do I dare do it?

If target choice is not legible in the UI, do not proceed directly to balance.

---

## Phase 9: Harness Target Policies and Reporting

### Objective

Restore the harness as the primary balance instrument for the expanded decision space.

### Scope

- Generate legal action-operative-target combinations.
- Update all five agents:
  - RandomBot
  - CautiousBot
  - AggressiveBot
  - GreedyBot
  - OperatorBot
- Label Operator as `Operator / Sane` in reports.
- Track per-run:
  - target selection counts
  - target complications
  - final rival pressures
  - final district control/heat
  - context-influenced event counts
- Extend batch summaries with:
  - most selected target
  - most dangerous target
  - average rival pressure
  - average district control/heat
  - loss causes
  - contextual event counts
- Extend CSV output with separate readable sections.
- Preserve deterministic runs.

### Implementation Notes

- Agents receive legal options; they do not reimplement validation.
- Operator should avoid pressure >= 60 rival territory unless justified.
- Aggressive should prioritize Dominion/control and tolerate rival attention.
- Greedy should favor Resource/Intel targets and remain risky.
- Cautious should prefer Pale Circuit, low heat, and uncontrolled territory.
- Random should sample all legal targets.

### Deliverables

- All agents complete targeted runs without stalling.
- Reports reveal whether locations and rivals are strategically meaningful.
- The UI Run Harness action exposes the expanded output.

### Verification

Automated checks:

- Run at least 100 games per strategy.
- No incomplete/stalled runs.
- Every agent selects valid targets.
- Target report contains selections.
- Rival averages are populated.
- Contextual event counters are populated.
- Same batch seed prefix produces identical summaries.

Manual analysis:

- Are some targets never selected?
- Is one target dominant across all agents?
- Does rival territory meaningfully increase danger?
- Do target choices alter event distributions?

### Review Gate

Review system behavior before modifying balance values. Distinguish policy bugs from game-number problems.

---

## Phase 10: GitHub Pages Deployment

### Objective

Publish a tested production build as a public, backend-independent prototype.

### Scope

- Add `.github/workflows/deploy-pages.yml`.
- Trigger deployment from pushes to `main`.
- Add `workflow_dispatch` for manual deployment.
- Use `.nvmrc` as the workflow Node version source.
- Install dependencies with `npm ci`.
- Run the automated test suite in non-watch mode.
- Build with:

```bash
npm run build -- --configuration production --base-href /haunted-apex/
```

- Upload:

```text
dist/haunted-apex/browser
```

- Deploy through the `github-pages` environment using official GitHub Pages Actions.
- Report the uncompressed deployment artifact size in the workflow log.
- Configure the repository Pages source as GitHub Actions.
- Verify the deployed application at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

- Replace the README's planned-deployment wording with a direct playable link after the first successful deployment.

### Implementation Notes

- The application currently has no Angular routes, so hash routing is not required.
- If Angular Router is introduced before release, configure hash routing rather than relying on unavailable server rewrite rules.
- Do not add `angular-cli-ghpages` or another deployment package; the official Pages artifact workflow is sufficient.
- The deploy job requires `contents: read`, `pages: write`, and `id-token: write`.
- Keep build and deploy as separate jobs so deployment cannot begin before verification succeeds.
- Use deployment concurrency so a newer deployment supersedes stale queued work without interrupting a deployment already in progress.
- Do not place secrets, API keys, or private content in the browser bundle.
- localStorage saves remain origin-local; localhost and Pages saves are intentionally separate.

### Deliverables

- Committed GitHub Pages workflow.
- Successful Actions build, test, artifact upload, and deployment.
- Public playable v0.2 build at the repository project URL.
- README link to the live prototype.
- CI output showing deployment artifact size.

### Verification

Local production artifact:

```bash
npm run build -- --configuration production --base-href /haunted-apex/
```

Inspect `dist/haunted-apex/browser/index.html` and confirm its base href is `/haunted-apex/`.

Deployment checks:

- Workflow runs successfully on `main`.
- Pages serves JavaScript, CSS, fonts, and images without 404 responses.
- The game starts without network-dependent initialization.
- New Run works.
- A queued action can be resolved.
- A save survives a browser refresh on the Pages origin.
- One complete run can be played through the deployed build.
- Browser console contains no asset-path or runtime errors.
- The deployment artifact remains well below the documented 1 GB Pages limit.

### Review Gate

Confirm the public build behaves like the validated local production build before advertising it from the README.

---

## Phase 11: v0.2 Balance, Usability, and Release

### Objective

Tune Rival Territory to the intended strategy spread and prepare the release.

### Scope

- Run iterative harness batches.
- Tune:
  - target modifiers
  - local heat growth/cooling
  - control risk reduction
  - rival pressure gains
  - passive rival thresholds/effects
  - contextual event weights
- Preserve the v0 pressure-loop balance where possible.
- Fix misleading UI copy or previews discovered during play.
- Conduct manual full-run checks.
- Re-run the deployed-build smoke test after final balance changes.
- Update release notes/document status.
- Prepare semantic version tag `v0.2.0`.

### Initial Balance Targets

```text
Operator / Sane: 55-75%
Aggressive:      35-60%
Greedy:          30-55%
Cautious:        low, usually Dominion shortfall
Random:          5-12%
```

These ranges guide tuning; they are not test assertions.

### Tuning Questions

- Does target selection materially change outcomes?
- Is rival-controlled territory worth touching?
- Can Operator win without avoiding the new systems?
- Does Aggressive trigger high Heat/rival-pressure losses?
- Is Greedy swingy rather than reliably optimal?
- Does Cautious usually lose from low Dominion instead of accidental bankruptcy?
- Are local heat and control visible but subordinate to global pressures?

### Deliverables

- Stable, playable v0.2 run.
- Useful strategy differentiation.
- No obvious dominant target or naive strategy.
- Final harness report captured for release review.
- Release documentation reflects implemented behavior.

### Verification

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

Additional checks:

- At least 100 simulations per agent.
- At least one complete manual victory.
- At least one observed rival passive effect.
- At least one run meaningfully influenced by target-tag event weighting.
- GitHub Pages deployment succeeds from the release commit.
- The README playable link resolves to the deployed game.
- No text overlap at common desktop widths.
- No lingering dev-server/test processes.

### Review Gate

Approve and tag:

```text
v0.2.0 - Rival Territory
```

---

## Recommended Execution Order

Implement sequentially:

```text
Phase 0  Baseline/documentation
Phase 1  Models/content/state
Phase 2  Targets/queue validation
Phase 3  Modifiers/risk/previews
Phase 4  Resolution/local/rival activity
Phase 5  Passive rivals/week order
Phase 6  Contextual events
Phase 7  Persistence/facade
Phase 8  UI
Phase 9  Harness/reporting
Phase 10 GitHub Pages deployment
Phase 11 Balance/release
```

Do not begin Phase 8 before the Phase 3-7 engine and application contracts are reviewed.

## Cross-Phase Guardrails

- No Angular imports in the engine.
- No localStorage access in the engine.
- No mutation of static content definitions.
- No duplicate target-modifier math between preview and resolution.
- No agent-specific bypass of normal engine validation.
- No map, venue takeover, or rival turn system.
- No save migration framework unless a concrete need appears.
- No secrets or required backend services in the Pages build.
- No root-relative runtime asset paths.
- No deployment of an artifact that has not passed tests.
- No unrelated refactors during release implementation.

## Primary Risk Areas

### Preview/resolution divergence

Mitigation:

- Shared effect and risk calculators.
- Direct tests comparing previews to clean resolutions.

### State explosion

Mitigation:

- Static definitions outside `GameState`.
- Compact mutable overlays.
- Bounded recent-activity history.

### Target option overload

Mitigation:

- Only three districts, four venues, and two rivals.
- Action-specific legal option selectors.
- Clear labels and stable ordering.

### Rival pressure becoming punitive bookkeeping

Mitigation:

- Passive effects only.
- Exact preview warnings.
- Harness reports for pressure distribution.

### Harness policies becoming stale

Mitigation:

- Legal option generation centralized in the engine.
- Review agent behavior before balance tuning.
- Keep Operator as the competent benchmark.

### Event weighting becoming opaque

Mitigation:

- Weight diagnostics.
- Deterministic tests for each context modifier.
- Debug display/report counters.

### Repository-subpath asset failures

Mitigation:

- Build with `/haunted-apex/` as the base href.
- Upload the Angular browser output directory, not the parent `dist` directory.
- Smoke-test the deployed origin for asset 404s.

### Pages becoming an accidental production backend

Mitigation:

- Keep the deployment fully static and browser-local.
- Add no secrets, authentication, telemetry dependency, or cloud save requirement.
- Reassess hosting when art/audio size or distribution requirements exceed Pages constraints.
