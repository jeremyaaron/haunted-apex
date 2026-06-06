# Haunted Apex v0.3.0 The Roster Implementation Plan

## Purpose

This plan breaks **v0.3.0: The Roster** into reviewable implementation phases.

It follows [`Roster-TDD.md`](./Roster-TDD.md) and preserves the project rules established
by District Zero and Rival Territory:

- Keep the engine pure TypeScript.
- Keep Angular out of simulation rules.
- Keep static content separate from mutable run state.
- Keep seeded generation and simulation deterministic.
- Keep preview and resolution calculations shared.
- Keep every phase buildable and testable.
- Review engine contracts before wiring dependent UI.
- Use the harness to evaluate balance rather than tuning from isolated examples.
- Do not expand into relationships, leveling, injury, death, dismissal, or portraits.

## Completion Target

The release is complete when an eight-week run supports:

```text
Seeded roster + visible hire pool
  -> Action + operative identity + operative condition + target
  -> Shared preview and resolution modifiers
  -> Stress and assignment history
  -> Operative-specific event eligibility
  -> Strategic recruitment and roster-aware simulation
```

The player should be able to:

```text
recognize operative identities
understand why an operative fits an order
see the danger of overuse
choose from a visible hire pool
form a run strategy around the available crew
```

The harness must report whether roster composition, operative usage, recruitment, Stress,
and signature events materially affect outcomes.

The tested production build remains playable at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

## Phase 0: Baseline and Documentation Lock

### Objective

Establish a clean v0.2 baseline and lock the v0.3 design inputs before changing operative
or save-state contracts.

### Scope

- Confirm the repository is based on the approved v0.2 release commit or tag.
- Keep the v0.3 vision, clarifications, TDD, and implementation plan together under:

```text
docs/releases/v0.3-the-roster/
```

- Run the existing test suite.
- Run the standard production build.
- Run the GitHub Pages subpath build.
- Record the current test count and representative harness baseline.
- Record the current v0.2 storage key and operative state shape.
- Confirm no dev, Karma, or browser-debug process remains running.

### Implementation Notes

- Do not change runtime behavior in this phase.
- Do not update package version to `0.3.0` yet.
- Preserve the current balance output as the comparison point for Phase 10.
- Treat the v0.3 documents as locked unless implementation reveals a contradiction.

### Deliverables

- Complete v0.3 design set.
- Green v0.2 baseline.
- Recorded pre-roster harness results.
- No accidental generated or temporary files.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
npm run build -- --configuration production --base-href /haunted-apex/
git diff --check
```

Recommended baseline:

```text
100 runs per agent
win rates
loss causes
average final pressures
current target/rival reports
```

### Review Gate

Confirm the baseline and documentation before replacing the operative model.

---

## Phase 1: Operative Models, Trait Models, and Curated Content

### Objective

Introduce the static roster architecture and authored content without changing roster
generation or action behavior.

### Scope

- Add explicit domain types:
  - `OperativeId`
  - `OperativeRarity`
  - `OperativeRoleTag`
  - `OperativeStats`
  - `OperativeDefinition`
  - `OperativeState`
  - `StressProfile`
  - `StressTier`
  - `TraitId`
  - `TraitKind`
  - `TraitDefinition`
  - `TraitModifier`
  - `ModifierCondition`
  - `OperativeAffinity`
  - `RecentAssignment`
- Add the ten-operative static registry.
- Add the visible trait registry.
- Add content lookup helpers.
- Add pure Stress-tier helpers.
- Preserve all current base stats for the existing six operatives.
- Add authored starting Loyalty and Stress values.
- Add the initial role tags, signature traits, liabilities, affinities, and modifier
  anchors from the TDD.
- Export the new APIs through engine barrel files.

### Implementation Notes

- Do not store full definitions in `GameState`.
- Do not implement seeded roster generation yet.
- Do not remove the existing starting roster or recruit pool until Phase 2 can replace
  them atomically.
- Traits and affinities are data, not operative-ID branches.
- Array conditions use any-match semantics; different condition fields combine with AND.
- Content descriptions must be player-readable because the UI will display them later.

### Deliverables

- Ten internally valid operative definitions.
- Complete trait and affinity references.
- Pure Stress-tier calculation.
- Existing runtime remains functional through temporary compatibility adapters where
  necessary.

### Verification

Unit tests:

- Exactly ten unique operative IDs exist.
- Mother Neon is rare.
- All rarities and role tags are valid.
- Every signature and liability reference resolves.
- Every affinity has a stable ID.
- Every operative has exactly one signature and at most one liability.
- Starting Loyalty and Stress are in `0..100`.
- No operative begins Unstable or Breaking.
- Existing six stats match the current release.
- Stress tiers resolve correctly at `39/40`, `59/60`, and `79/80`.

### Review Gate

Review every operative definition as a game piece. Each should have a legible role,
benefit, and cost before generation or resolution depends on the registry.

---

## Phase 2: Seeded Roster Assembly and New Game State

### Objective

Replace the fixed crew and recruit pool with deterministic seeded campaign assembly.

### Scope

- Add roster-generation configuration and result types.
- Add rarity-weighted ordering without replacement.
- Add starting-roster coverage validation.
- Add deterministic fallback combination search.
- Generate:
  - three starting operatives
  - four hire candidates
  - no overlap
  - at most one starting rare
- Advance and preserve the RNG cursor used by roster generation.
- Replace mutable `Operative` copies with `OperativeState`.
- Replace `recruitPool` definitions with `hirePool: OperativeId[]`.
- Add `seenSignatureEventIds`.
- Add `schemaVersion: 3` to new game state.
- Materialize starting state from authored definition values.
- Remove fixed-starting-roster initialization.

### Implementation Notes

- Use the existing seeded RNG only.
- Do not use `Math.random`.
- Do not use an unbounded retry loop.
- Generate one weighted ordering and derive both pools from it.
- Candidate order must remain stable for the same seed.
- Store IDs in the hire pool, not duplicate content objects.
- New game must consume roster-generation RNG before later event rolls.

### Deliverables

- The same seed always produces the same complete initial state.
- Different seeds produce varied valid rosters and hire pools.
- Every generated opening remains strategically viable by role coverage.
- New state remains JSON-serializable.

### Verification

Unit tests:

- Starting roster size is three.
- Hire pool size is four.
- IDs are unique and disjoint.
- Every roster covers all required tag groups.
- At most one rare starts.
- Rare operatives can appear in the hire pool.
- Same seed produces the same roster, pool, state, and RNG cursor.
- A deterministic seed sample contains varied compositions.
- Common operatives appear more frequently than rares across a large seed sample.
- Invalid registry coverage throws a descriptive error.
- Separate new games do not share mutable operative arrays, flags, or histories.

### Review Gate

Inspect a representative seed set and confirm that generated openings are varied,
recognizable, and never obviously broken before implementing recruitment.

---

## Phase 3: Hire Targets and Recruitment Resolution

### Objective

Make the visible hire pool actionable through the existing Command system.

### Scope

- Add recruit targets to `ActionTarget`.
- Change `Recruit Operative` to:
  - require a target
  - allow only `recruit`
  - retain its current Command and base pressure costs
- Add recruit target options from `GameState.hirePool`.
- Add recruit-specific validation:
  - target exists in hire pool
  - target is not already queued
  - active roster plus queued recruits does not exceed five
- Add recruit-specific unavailable reasons.
- Resolve the selected candidate rather than the first pool entry.
- Remove the selected candidate from the hire pool.
- Materialize the selected candidate's authored starting state.
- Preserve remaining hire-pool order.
- Ensure recruitment does not affect territory, Local Heat, or rival pressure.
- Add recruit target parsing and validation to engine helpers.

### Implementation Notes

- Recruitment remains a normal queued order.
- Do not add a direct recruit command outside `queueOrder`.
- Do not add candidate replacement after hiring.
- Do not add dismissal or roster swapping.
- Multiple recruit orders may be queued only when they target different candidates and
  fit the final roster cap.
- Recruit target tags must not affect city event weighting.

### Deliverables

- Pure engine commands can recruit a selected candidate.
- Invalid or duplicate recruit targets fail consistently.
- The five-operative cap accounts for queued orders.
- Existing district, venue, and rival targeting remains unchanged.

### Verification

Unit tests:

- Recruit is unavailable without a candidate.
- District, venue, and rival targets are rejected.
- Unknown and absent candidate IDs are rejected.
- Selected candidate joins the roster.
- First-pool candidate is not recruited when another candidate is selected.
- Candidate leaves the hire pool.
- No replacement appears.
- Duplicate candidate recruitment cannot queue.
- Two distinct recruits may queue only when cap permits.
- Full roster disables recruitment.
- Recruitment creates no district, Local Heat, rival-pressure, or recent-target context.

### Review Gate

Review the queue and target contracts before candidate-specific modifiers and UI depend
on them.

---

## Phase 4: Operative Modifier, Stress Risk, and Preview Pipeline

### Objective

Make operative identity and condition visibly change action previews through one shared,
data-driven calculation pipeline.

### Scope

- Add generic trait-condition evaluation.
- Add generic affinity matching.
- Add candidate-conditioned recruitment modifiers.
- Add shared `calculateOperativeModifiers`.
- Add applied modifier source diagnostics.
- Replace the identity-specific operative action modifier map.
- Refactor adjusted effects and costs to use:
  1. base action
  2. operative traits
  3. all matching affinities
  4. district modifiers
  5. venue modifiers
- Replace continuous Stress risk with tier risk:
  - Stable: `+0`
  - Strained: `+2`
  - Unstable: `+5`
  - Breaking: `+10`
- Preserve skill, Loyalty, Local Heat, and Control risk components.
- Keep Breaking operatives legal.
- Extend previews with:
  - relevant skill
  - current/projected Stress and tier
  - matched visible traits and affinities
  - final effects, cost, and risk
- Extend assignment option views with Stress tier and fit context.

### Implementation Notes

- All matching affinities stack.
- A modifier may introduce a new pressure as authored operative behavior.
- District and venue modifiers continue modifying only pressure keys present after
  operative modifiers.
- Preview code must not reveal hidden event triggers or flags.
- Keep risk clamped to `3..45`.
- Do not implement operative events in this phase.

### Deliverables

- Selecting different operatives materially changes previews.
- Player-safe explanations identify why a preview changed.
- Stress risk is legible and discrete.
- Breaking operatives remain selectable.
- No runtime operative-ID branch is needed for action modifiers.

### Verification

Unit tests:

- Every initial modifier anchor from the TDD applies.
- Non-matching traits and affinities do not apply.
- Action and target conditions combine correctly.
- Multiple matching affinities stack.
- Direct rival and rival-controlled targets satisfy rival affinity.
- District conditions apply to venues in that district.
- Candidate recruitment modifiers apply to the selected candidate.
- Stress risk is exactly `0/2/5/10`.
- Continuous Stress risk is removed.
- Breaking operative assignment remains available.
- Risk remains clamped.
- Applied sources contain only visible, matched information.

### Review Gate

Inspect representative previews for all ten operatives. The player should be able to
answer:

> Why is this operative good or dangerous for this order?

Do not proceed to resolution until that answer is consistent and testable.

---

## Phase 5: Action Resolution, Stress, and Assignment History

### Objective

Apply the shared operative pipeline during real order resolution and track the
consequences of repeated use.

### Scope

- Use the Phase 4 modifier pipeline in `resolveQueuedOrder`.
- Apply final operative-modified effects, costs, risk, and complications.
- Calculate Stress from:
  - action Stress type
  - definition Stress profile
  - trait modifiers
  - affinity modifiers
  - complication side effects
- Remove automatic `compromised` status at Stress 80.
- Return assigned operatives to `available` after resolution.
- Preserve Lay Low and idle Stress recovery.
- Add `RecentAssignment` records.
- Increment `weeksAssigned` once per assigned week.
- Record:
  - action
  - target
  - target tags
  - complication
  - final Stress delta
- Prune assignment history to the current and prior two weeks.
- Add tier-change logs.
- Keep preview and clean resolution contracts aligned.

### Implementation Notes

- Breaking is a risk and event state, not an availability state.
- Stress remains clamped to `0..100`.
- Assignment history belongs to the operative state.
- Harness-long statistics must not accumulate as unbounded game history.
- Existing territory and rival resolution order remains intact.
- Random complication is the only expected difference between preview and a clean
  resolution.

### Deliverables

- Operative identity affects actual resolution exactly as previewed.
- Repeated assignments create persistent, bounded operative history.
- Stress can rise through tiers without taking control away from the player.
- Logs identify meaningful Stress-tier transitions.

### Verification

Unit tests:

- Preview and non-complication resolution agree on effects, cost, risk, and Stress.
- Normal and dangerous assignments apply expected Stress.
- Trait and affinity Stress modifiers apply.
- Lay Low recovery applies.
- Idle recovery applies only to unused operatives.
- Breaking operatives resolve orders normally.
- Stress clamps at both bounds.
- Assignment records contain final target context and complication status.
- `weeksAssigned` increments once per week.
- Old assignments prune at the correct boundary.
- Tier-change logs are emitted only when the tier changes.
- Existing district, venue, and rival outcomes still resolve correctly.

### Review Gate

Run several headless weeks with different operatives and inspect preview, resolved state,
history, and logs before adding operative-event consequences.

---

## Phase 6: Operative Events and Extended Event Effects

### Objective

Make operative condition and assignment history influence the existing single weekly
event slot.

### Scope

- Extend event definitions with `kind`.
- Add generic operative-event trigger predicates.
- Add trigger evaluation with `all` and `any` modes.
- Add six initial signature events:
  - Mara Voss: Ghost Debt
  - Juno Hex: Static in Her Voice
  - Saint Calder: The Lie Comes Due
  - Knox Riven: Blood Applause
  - Iris Vale: Velvet Access
  - Orchid Seven: Route Memory
- Add operative event eligibility rules.
- Restrict eligibility to current roster members.
- Exclude hire candidates.
- Exclude already seen signature events.
- Merge eligible operative events into the existing weighted event pool.
- Mark signature events seen when presented.
- Preserve exactly one weekly event.
- Add `operativeEffects` to event choices.
- Add event-choice rival-pressure effects.
- Clamp operative Loyalty and Stress after choices.
- Add event eligibility and weight diagnostics.

### Implementation Notes

- Operative events compete with city events; they are not guaranteed.
- Exact trigger formulas remain hidden from normal UI.
- Visible liabilities should provide qualitative warning.
- No event may repeat within a run.
- Vant, Echo, Rook, and Mother Neon do not require signature events in v0.3.
- Do not add a second event phase or event queue.

### Deliverables

- Assignment and Stress history can create signature drama.
- Operative events use the existing event-choice flow.
- Event choice can affect the relevant operative and rival pressure.
- Seeded selection remains deterministic.

### Verification

Unit tests:

- Every predicate type works.
- `all` and `any` trigger modes work.
- Current roster membership is required.
- Hire-pool presence is insufficient.
- Seen events become ineligible.
- Event is marked seen when presented.
- Eligible event is weighted rather than guaranteed.
- City and operative events share one pool.
- Exactly one event is presented.
- Operative effects update the correct operative.
- Rival-pressure effects update the correct rival.
- Loyalty and Stress clamp.
- Same state and RNG cursor select the same event.
- Existing event repetition penalties still apply.

### Review Gate

Force each signature event through deterministic tests and inspect one natural multi-week
run. Confirm the events feel caused by player behavior rather than arbitrary betrayal.

---

## Phase 7: Versioned Persistence and Facade Integration

### Objective

Persist the expanded v0.3 state safely, invalidate old saves clearly, and expose roster
selectors through the Angular application layer.

### Scope

- Add the v0.3 storage key.
- Add the legacy v0.2 key constant.
- Add the versioned save envelope:
  - schema version
  - game version
  - saved timestamp
  - state
- Change storage loading to a discriminated result.
- Validate:
  - operative IDs
  - mutable operative fields
  - active/hire-pool uniqueness
  - roster/pool bounds
  - assignment histories
  - recruit targets
  - seen signature event IDs
  - existing territory/rival state
- Remove incompatible legacy saves.
- Start a fresh v0.3 run after incompatibility.
- Expose a dismissible compatibility notice.
- Add facade selectors for:
  - active roster
  - hire pool
  - operative detail
  - assignment options
- Preserve autosave after all meaningful transitions.

### Implementation Notes

- No v0.2 state migration.
- Keep localStorage isolated in the storage service.
- Do not silently accept partially valid operative state.
- Compatibility notice must not block play.
- Candidate recruitment continues through the existing queue API.
- Do not add a facade method that bypasses Command costs.

### Deliverables

- Complete v0.3 runs round-trip through localStorage.
- Old saves are cleared with explicit player-facing notice.
- Angular can consume complete roster and hire-pool view models.
- Reset and New Run produce complete seeded v0.3 state.

### Verification

Unit tests:

- Valid envelope round-trips.
- Saved timestamp and versions serialize correctly.
- Schema mismatch is rejected.
- v0.2 key is removed and reported incompatible.
- Invalid operative ID is rejected.
- Duplicate active IDs are rejected.
- Active/hire overlap is rejected.
- Invalid assignment history is rejected.
- Invalid queued recruit target is rejected.
- Invalid seen event ID is rejected.
- Facade exposes roster and hire-pool views.
- Incompatible load creates a new run and notice.
- Dismissing notice does not alter game state.

### Review Gate

Inspect one serialized save and exercise a legacy-save load before UI work makes the
state harder to diagnose.

---

## Phase 8: Roster, Hire Pool, and Operative UI

### Objective

Make The Roster fully playable and understandable through the Black Ledger.

### Scope

- Update release identity to `The Roster`.
- Replace raw operative cards with roster view models.
- Show:
  - name
  - archetype
  - rarity
  - role tags
  - Loyalty
  - Stress number and tier
  - status
  - signature trait
  - visible liability
- Add an accessible operative detail dialog or drawer.
- Reuse the detail surface for hire candidates.
- Add a persistent hire-pool section.
- Show full-roster recruitment state.
- Add Recruit candidate selection to the action card.
- Show selected candidate summary and projected roster count.
- Add selected-operative explanation strips to action cards.
- Show matched traits, affinities, Stress transition, and risk.
- Add restrained tier warning styles.
- Keep Breaking visually dangerous but enabled.
- Extend the Field Guide.
- Extend the hidden debug panel.
- Add compatibility notice UI.
- Preserve current responsive dashboard structure.

### Implementation Notes

- Do not redesign the entire screen.
- Do not place complex explanations inside native `<option>` elements.
- Do not make hire-pool cards recruit directly.
- Use selectors rather than reading content registries throughout the template.
- Keep cards at established dimensions and avoid nested cards.
- Ensure detail surfaces close with explicit control and Escape.
- Do not expose exact operative-event triggers or hidden flags outside debug mode.

### Deliverables

- A player can understand the generated crew and available hires.
- A player can reason about operative fit before queueing.
- Recruitment is fully playable through the UI.
- Stress and Breaking state are legible.
- The existing territory, rival, event, and guide surfaces remain usable.

### Verification

Component tests:

- Release identity reads `The Roster`.
- Three active operatives and four candidates render at run start.
- Rarity, roles, traits, liabilities, and Stress tier render.
- Detail surface opens for roster and candidate entries.
- Detail surface closes accessibly.
- Recruit target list matches the hire pool.
- Recruiting moves candidate between UI sections.
- Full roster explains why recruitment is unavailable.
- Assignment explanation changes with operative and target.
- Breaking remains selectable.
- Compatibility notice renders and dismisses.
- Hidden triggers do not render in normal UI.
- Debug roster data appears only after the secret toggle.

Manual checks:

- Complete at least one full UI run.
- Recruit a non-first candidate.
- Save and reload after recruitment.
- Trigger or force one operative event.
- Verify desktop and true mobile widths.
- Verify no horizontal overflow or text overlap.
- Stop all temporary validation processes.

### Review Gate

Review the central v0.3 question:

> Who do I trust to do it?

If operative identity is not quickly readable from the board, do not proceed directly to
balance.

---

## Phase 9: Roster-Aware Harness Agents

### Objective

Restore competent automated play across varied crews and candidate pools.

### Scope

- Generate complete legal action-operative-target combinations.
- Include recruit candidates in legal target generation.
- Make all agents roster-aware:
  - RandomBot
  - CautiousBot
  - AggressiveBot
  - GreedyBot
  - OperatorBot
- Add Stress and role coverage to agent scoring.
- Add candidate and recruitment scoring.
- Preserve existing territory and rival policies.
- Prevent agents from reading hidden event triggers or secret flags.
- Ensure agents do not stall with unfamiliar roster compositions.

### Agent Contracts

Random:

- Random legal action, operative, target, and event response.

Cautious:

- Prefer Stable/Strained operatives.
- Prefer heat-control and stability.
- Use Lay Low for highly stressed operatives.
- Recruit to fill Heat-control gaps or relieve roster Stress.

Aggressive:

- Prefer Dominion, Control, violence, and money.
- Tolerate Stress until Breaking unless the move advances victory.
- Recruit aggressive specialists when affordable.

Greedy:

- Prefer Resources, Intel, and economic affinities.
- Recruit economically valuable candidates without immediate bankruptcy.
- Retain existing Heat and reserve brakes.

Operator:

- Score survival, Dominion, final risk, relevant skill, Stress, affinity value, role
  coverage, candidate gap value, recruitment cost, and territory/rival consequences.
- Recruit when it solves a meaningful problem without creating a projected loss.

### Implementation Notes

- Agents consume legal engine options and shared previews.
- Do not duplicate trait or affinity math in agents.
- Tie-breaking remains seeded.
- Recruitment should be a choice, not a mandatory scripted opening.
- Keep policies generic by role tags and previews rather than operative IDs where
  possible.

### Deliverables

- All five agents complete varied-roster runs.
- Operator demonstrates competent recruitment and Stress management.
- Naive agents retain distinct identities.
- Fixed seeds remain reproducible.

### Verification

Unit tests:

- Every agent produces legal orders across a broad seed set.
- No agent targets an absent candidate.
- No agent exceeds roster cap.
- Breaking operatives remain available to agent option generation.
- Cautious avoids unnecessary Breaking assignments.
- Aggressive accepts justified Stress.
- Greedy respects immediate bankruptcy.
- Operator recruits for role gaps and dangerous Stress states.
- Agents complete runs without `agent_stalled`.
- Same seed and agent produce the same trace.

### Review Gate

Run a representative batch and inspect traces from weak and strong roster compositions.
Correct agent blindness before adding reports or tuning content.

---

## Phase 10: Operative Harness Reporting and First Balance Pass

### Objective

Measure roster effects, identify mandatory or harmful pieces, and tune v0.3 without
destroying the established strategy profile.

### Scope

- Track original starting roster and hire pool per run.
- Track per-operative:
  - starting presence
  - hire-pool presence
  - recruitment
  - assignments
  - complications
  - final/highest Stress
  - final Stress tier
  - Heat contribution
  - Ruin contribution
  - event eligibility
  - event selection
- Add CSV sections:
  - `roster_compositions`
  - `operative_presence`
  - `operative_recruitment`
  - `operative_usage`
  - `operative_stress`
  - `operative_danger`
  - `operative_events`
  - `hire_pool_selection`
- Preserve all existing report sections.
- Establish a pre-tuning v0.3 baseline.
- Tune:
  - roster weights
  - operative modifiers
  - starting Loyalty/Stress
  - signature-event weights/effects
  - agent recruitment policies
- Run multiple independent deterministic batches.

### Initial Balance Targets

```text
Operator:   55-75%
Aggressive: viable but volatile
Greedy:     viable but swingy
Cautious:   low, usually Dominion shortfall
Random:     bad but occasionally lucky
```

Roster-specific:

```text
No adequately sampled starting roster puts Operator below 40%.
No operative is mandatory for sane play.
No candidate is an automatic Operator recruit in nearly every appearance.
Rare operatives are not strict upgrades.
Operative events appear in 25-45% of complete runs.
At least one operative reaches Strained in most runs.
Breaking occurs sometimes but not in most Operator runs.
Powerful operatives create visible pressure, Stress, cost, or liability elsewhere.
```

### Implementation Notes

- Always include sample counts with composition conclusions.
- Aggregate sparse compositions by operative presence and role coverage.
- Do not tune around one 100-run batch.
- Distinguish bad game balance from bad bot behavior.
- Update TDD content tables when numeric content changes.
- Do not weaken identity until every operative converges into the same safe choice.

### Deliverables

- Complete operative CSV diagnostics.
- Stable multi-seed balance results.
- No obvious mandatory operative.
- No generated roster that makes competent play systematically nonviable.
- Signature events appear often enough to matter without dominating the event pool.

### Verification

Automated:

- Report sections and columns are stable.
- Composition keys aggregate independent of order.
- Eligibility and event selection counts remain distinct.
- Per-operative totals reconcile with run totals.
- Fixed batches produce identical reports.
- No incomplete or stalled runs.

Manual analysis:

- Compare at least four independent batches.
- Inspect highest and lowest Operator composition samples.
- Inspect recruitment frequency by candidate.
- Inspect operative event selection rates.
- Inspect Strained, Unstable, and Breaking rates.
- Complete at least one manual tuned run.

### Review Gate

Review whether the roster creates different viable stories rather than one solved crew.
Do not move to release solely because aggregate win rates look acceptable.

---

## Phase 11: Usability, Deployment, and v0.3.0 Release

### Objective

Finalize The Roster as a polished, tested, deployed release.

### Scope

- Address UI observations from manual roster play.
- Refine Field Guide wording where new concepts remain unclear.
- Verify operative descriptions match actual mechanics.
- Verify hidden information remains hidden.
- Update:
  - `package.json` version to `0.3.0`
  - `package-lock.json` version to `0.3.0`
  - README release references if needed
  - implementation-plan completion records
- Run the complete test suite.
- Run TypeScript checks.
- Run the Pages production build.
- Commit and push the final release candidate.
- Confirm the GitHub Pages workflow succeeds.
- Smoke-test the deployed build:
  - new seeded roster
  - visible hire pool
  - recruitment
  - save/reload
  - operative assignment preview
  - operative event
  - complete run
- Tag the approved commit:

```text
v0.3.0
```

### Implementation Notes

- Do not tag before deployed smoke testing.
- Do not leave validation servers or browser-debug processes running.
- The live URL and base href remain unchanged.
- No backend or hosting migration belongs in this release.
- Release fixes should remain scoped; defer new systems to v0.4.

### Deliverables

- Versioned v0.3 package metadata.
- Green tests and production build.
- Successful Pages deployment.
- Deployed smoke test.
- Approved `v0.3.0` tag.
- Completed release record.

### Verification

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.spec.json
npm run build -- --configuration production --base-href /haunted-apex/
git diff --check
```

Deployment checks:

```text
workflow succeeds
index.html uses /haunted-apex/
scripts and styles load
no backend requests are required
new run and saved run both work
```

### Review Gate

Approve and tag only when the release answers:

> Who do I send, why do I trust them, and what will continued reliance cost me?

---

## Recommended Execution Order

Implement sequentially:

```text
Phase 0  Baseline/documentation
Phase 1  Models/traits/curated content
Phase 2  Seeded roster assembly/new-game state
Phase 3  Recruit targets/resolution
Phase 4  Modifier/risk/preview pipeline
Phase 5  Resolution/Stress/assignment history
Phase 6  Operative events
Phase 7  Persistence/facade
Phase 8  UI
Phase 9  Roster-aware agents
Phase 10 Reporting/balance
Phase 11 Usability/deployment/release
```

Do not begin Phase 8 before the Phase 4-7 engine and application contracts are reviewed.

Do not begin Phase 10 tuning before Phase 9 agents complete varied-roster runs without
stalling.

## Cross-Phase Guardrails

- No Angular imports in the engine.
- No localStorage access in the engine.
- No mutation of static operative, trait, or event definitions.
- No duplicate trait/affinity math between preview and resolution.
- No operative-ID branches for normal modifiers.
- No hidden event triggers in player-facing selectors.
- No agent access to hidden triggers or secret flags.
- No unbounded roster-generation retries.
- No `Math.random` in roster generation or simulation.
- No recruit bypass outside the Command queue.
- No automatic unavailability at Breaking Stress.
- No multiple weekly events.
- No v0.2 save migration framework.
- No relationship, leveling, inventory, injury, death, dismissal, or portrait systems.
- No unrelated visual redesign.
- No backend dependency in the Pages build.
- No deployment artifact that has not passed tests.

## Primary Risk Areas

### Content architecture becoming identity branches

Mitigation:

- Generic condition and modifier evaluators.
- Trait and affinity registries.
- Content-reference tests.
- Explicit review for operative IDs in engine simulation code.

### Preview and resolution divergence

Mitigation:

- One operative modifier result.
- Shared effect, cost, risk, and Stress functions.
- Direct preview-to-clean-resolution regression tests.

### Seeded generation producing false variety

Mitigation:

- Required role coverage.
- Rarity-weighted sampling without replacement.
- Large deterministic seed-distribution tests.
- Harness reports by composition and operative presence.

### RNG changes breaking deterministic behavior

Mitigation:

- Return and store roster-generation RNG cursor.
- Stable registry ordering.
- Fixed-seed state and trace tests.
- Avoid incidental RNG calls in selectors or UI.

### Recruitment becoming an automatic best move

Mitigation:

- Normal Command and Resource costs.
- Five-operative cap.
- Four visible candidates but only two available roster slots.
- Recruitment-rate reports by agent and candidate.

### Breaking Stress feeling like a hidden disable

Mitigation:

- Discrete visible tiers.
- Explicit `+10 Risk` guide text.
- Breaking remains assignable.
- Severe event eligibility is qualitatively warned through visible liabilities.

### Operative events feeling arbitrary

Mitigation:

- Assignment, Stress, Loyalty, and recent-activity predicates.
- Visible liability descriptions.
- One event slot and once-per-run limits.
- Eligibility and selection diagnostics.

### Event pool dilution

Mitigation:

- Start with six signature events.
- Measure eligibility separately from selection.
- Tune event weights toward 25-45% of complete runs.
- Avoid guaranteed selection when eligible.

### UI density

Mitigation:

- Compact roster summaries.
- Reusable detail dialog/drawer.
- Explanation strips only for the selected operative.
- Persistent but compact hire pool.
- Responsive screenshot and overflow checks.

### Save invalidation confusing players

Mitigation:

- Explicit schema envelope.
- One-time non-blocking compatibility notice.
- Clear old key and immediately create a valid new run.
- Persistence tests for every incompatible path.

### Harness conclusions from sparse compositions

Mitigation:

- Always report sample counts.
- Aggregate by operative presence and role coverage.
- Use multiple seed batches.
- Treat individual composition results as diagnostic until adequately sampled.

### Scope expansion into character simulation

Mitigation:

- One signature and at most one liability per operative.
- Six initial operative events.
- Bounded recent assignment history.
- Explicitly defer relationships, quests, death, leveling, and procedural generation.
