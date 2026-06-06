# Haunted Apex District Zero Implementation Plan

## Purpose

This plan breaks the District Zero prototype into reviewable implementation phases. It follows `DistrictZero-TDD.md` and keeps every phase focused on a runnable, testable increment.

The goal is not to build the whole future game. The goal is to reach a playable browser prototype where the full 8-week District Zero loop can be completed, replayed by seed, saved locally, and tuned.

## Guiding Rules

- Keep the game engine pure TypeScript.
- Keep Angular components out of simulation rules.
- Keep content definitions data-driven enough to tune without rewriting engine code.
- Keep Electron, SQLite, cloud services, telemetry, and full campaign systems deferred.
- Prefer a working ugly loop over a beautiful incomplete loop.
- End each phase with a runnable app or executable test suite.

## Phase 0: Project Scaffold

### Objective

Create the Angular application foundation and establish the intended source layout.

### Scope

- Scaffold Angular app in the project root.
- Add basic app shell.
- Add initial directory structure for `game/` and `engine/`.
- Add formatting/lint/test scripts using Angular defaults unless there is a clear reason to customize.
- Add a minimal placeholder Black Ledger screen.

### Deliverables

- Angular app runs on `localhost:4200`.
- Root component renders a placeholder for **The Black Ledger**.
- Engine folder exists but contains no meaningful game logic yet.

### Verification

- `npm install` succeeds.
- `npm start` or equivalent dev command starts the app.
- `npm test` or equivalent test command runs the default test setup.
- Browser displays the placeholder app.

### Review Gate

Review project structure before adding game logic. This is the best point to correct Angular configuration or folder layout.

## Phase 1: Engine Model, Content, and New Game

### Objective

Define the core domain model and create deterministic starting game state.

### Scope

- Add core TypeScript types:
  - `GameState`
  - `Pressures`
  - `TurnPhase`
  - `Operative`
  - `QueuedOrder`
  - `ActionDefinition`
  - `EventDefinition`
  - `GameLogEntry`
  - `GameOverState`
- Add District Zero tuning constants.
- Add starting pressures.
- Add starting operatives:
  - Mara Voss
  - Juno Hex
  - Saint Calder
- Add recruit pool:
  - Iris Vale
  - Knox Riven
  - Orchid Seven
- Add deterministic seeded RNG.
- Add `newGame(config)` engine function.

### Deliverables

- `newGame({ seed })` returns a complete serializable `GameState`.
- Same seed produces identical starting state.
- No engine code imports Angular or browser APIs.

### Verification

Unit tests:

- new game creates expected starting pressures.
- new game creates week `1`, max weeks `8`, and phase `COMMAND`.
- new game creates 3 starting operatives and 3 recruit candidates.
- same seed creates identical initial state.
- generated seed exists when no seed is provided.

### Review Gate

Review state shape before implementing actions. This is where later pain is cheapest to avoid.

## Phase 2: Command Queue and Action Previews

### Objective

Implement the command phase rules and preview system without resolving turns yet.

### Scope

- Add six v0 action definitions:
  - Gather Intel
  - Run a Small Job
  - Bribe an Official
  - Recruit an Operative
  - Expand Influence
  - Lay Low
- Add operative action modifiers.
- Add queue/remove order functions.
- Enforce command point rules.
- Enforce operative assignment rules.
- Add action availability checks.
- Add risk calculation and qualitative risk labels.
- Add preview selectors for base and adjusted effects.

### Deliverables

- Orders can be queued and removed through pure engine functions.
- Player cannot exceed 2 command points.
- One operative cannot be assigned to two actions in the same week.
- Previews update when an operative is assigned.
- Unavailable reasons are generated consistently.

### Verification

Unit tests:

- can queue one legal action.
- can queue two legal actions.
- cannot queue a third action.
- can remove queued action and regain command availability.
- cannot assign same operative twice.
- action preview includes resource cost and pressure effects.
- Mara modifies Gather Intel preview.
- Juno modifies Gather Intel preview.
- Saint modifies Bribe Official preview.
- risk label mapping matches TDD thresholds.

### Review Gate

Review action data and preview clarity before implementing resolution. This is the first point where dominant or confusing actions may be visible.

## Phase 3: Action Resolution, Stress, Drift, and Win/Loss

### Objective

Implement the weekly action resolution pipeline up to, but not including, event choice.

### Scope

- Add `advanceWeek(state)` through pending-event creation boundary.
- Resolve queued action costs and effects.
- Resolve risk/complication rolls during Advance Week.
- Implement required `bribe_official` failure behavior.
- Implement generic complications for other failed risks.
- Apply operative stress.
- Apply idle operative stress recovery.
- Apply Lay Low stress recovery.
- Apply weekly drift.
- Clamp pressures.
- Add win/loss checking utility, even if event phase will use it fully later.

### Deliverables

- Queued actions can resolve deterministically.
- Pressures change according to action effects, modifiers, risk, stress, and drift.
- Logs describe resolved orders and complications.
- State remains serializable.

### Verification

Unit tests:

- Gather Intel applies expected base effects.
- Run a Small Job applies expected base effects.
- Bribe Official success applies Heat reduction.
- Bribe Official failure applies Heat penalty and `bribe_exposed`.
- Expand Influence applies Dominion/Heat/Loyalty effects.
- Recruit Operative adds candidate and respects roster cap.
- Lay Low can resolve without operative.
- assigned normal action adds stress.
- dangerous action adds higher stress where configured.
- idle operative recovers 2 stress.
- Lay Low assigned operative recovers 8 stress.
- weekly drift subtracts upkeep and applies conditional changes.
- pressure clamps work.
- win/loss utility detects all configured outcomes.

### Review Gate

Review the first headless resolved week. At this point, the simulation should already be able to produce interesting pressure movement in tests.

## Phase 4: Weekly Events and Event Choices

### Objective

Complete the turn loop by selecting one reactive weekly event and resolving the player's response.

### Scope

- Add the 10 v0 event definitions:
  - Corp Patrol Sweep
  - Rival Tests Your Border
  - Liaison Offers a Favor
  - Operative Wants More
  - Blackmail Lead Emerges
  - Job Goes Loud
  - Heat Cools Temporarily
  - Safehouse Compromised
  - Unexpected Windfall
  - The Rival Sends Flowers
- Implement event weighting from current state.
- Implement deterministic weighted event selection.
- Add simple event director guardrails against repeated punitive tags.
- Store selected event as `pendingEvent`.
- Implement `resolveEventChoice(state, eventId, choiceId)`.
- Apply event costs, effects, and flags.
- Check win/loss after event choice.
- Increment week or end game.

### Deliverables

- Full headless turn loop works:
  - queue orders
  - advance week
  - receive event
  - choose response
  - continue or game over
- Runs can reach victory, loss, or out-of-time failure.
- Event log records presented event and chosen response.

### Verification

Unit tests:

- same seed and same choices select same events.
- high Heat increases relevant event likelihood.
- `bribe_exposed` increases Safehouse Compromised likelihood.
- event choice applies pressure effects.
- event choice applies flags.
- event choice cost prevents or marks unavailable choices where relevant.
- Week increments after event choice when game continues.
- Victory triggers at `dominion >= 60`.
- Heat loss triggers at `heat >= 100`.
- Loyalty loss triggers at `loyalty <= 0`.
- Bankruptcy loss triggers at `resources < 0`.
- Out-of-time loss triggers after Week 8 without victory.

### Review Gate

Review a complete headless playthrough transcript from the event log. If the transcript is incoherent, fix the engine/log before building the UI.

## Phase 5: Angular Facade and Persistence

### Objective

Connect the pure engine to Angular state management and local save/load.

### Scope

- Add `GameFacade` or equivalent app-facing service.
- Store current `GameState` reactively.
- Expose view model selectors or facade read methods.
- Add methods:
  - start new game
  - load current run
  - reset current run
  - queue order
  - remove order
  - advance week
  - resolve event choice
- Add localStorage adapter behind an interface.
- Validate loaded save enough to avoid crashes.
- Save after meaningful state transitions.

### Deliverables

- Angular app can create and mutate game state through the facade.
- Refreshing the browser can restore the current run.
- Engine remains free of Angular and localStorage dependencies.

### Verification

Tests:

- facade starts new game.
- facade queues and removes an order.
- facade advances to event choice.
- facade resolves event choice.
- storage adapter round-trips state.
- invalid save data is ignored or reset safely.

Manual check:

- Start app, create run, queue action, refresh, confirm state persists.

### Review Gate

Review facade API before building the full dashboard. The UI should have a clean surface to consume.

## Phase 6: Black Ledger Playable UI

### Objective

Build the one-screen playable dashboard.

### Scope

- Implement Black Ledger layout:
  - header
  - pressure panel
  - action board
  - operative roster
  - queued orders
  - event panel
  - event log
- Add action queue interactions.
- Add operative assignment control.
- Add action previews.
- Add Advance Week button behavior.
- Add event choice behavior.
- Add game-over state.
- Add New Game and Reset Run controls.

### Deliverables

- The player can play from Week 1 to victory or loss in the browser.
- The full v0 state is visible enough for balancing.
- UI blocks command changes while event choice is pending.
- Advance Week is disabled unless the phase and queue are valid.

### Verification

Manual playthrough:

- Start a new run.
- Queue two actions with different operatives.
- Remove one queued action.
- Queue a different action.
- Advance week.
- Choose event response.
- Continue until win or loss.

UI tests, if practical:

- app renders Black Ledger.
- action can be queued.
- operative can be assigned.
- Advance Week reaches event choice.
- event choice returns to command phase or game over.

### Review Gate

Review the playable loop before styling polish. The main question is whether the player understands the state and consequences.

## Phase 7: Debug and Tuning Harness

### Objective

Make balancing easier before investing in atmosphere polish.

### Scope

- Add debug panel:
  - seed
  - RNG cursor
  - phase
  - pressures JSON
  - flags
  - pending event id
  - queued orders
  - recent event tags
  - exact risk values if available
- Add a basic headless simulation harness if time allows.
- Add simple strategy agents if harness is included:
  - RandomBot
  - AggressiveBot
  - CautiousBot
  - GreedyBot
- Add CSV or console summary output for simulated runs.

### Deliverables

- Debug panel supports manual tuning.
- Optional harness can run many games without Angular UI.
- Suspicious strategy outcomes can be observed quickly.

### Verification

Manual check:

- Debug panel updates after each state transition.
- Seed shown in UI can reproduce a run.

Harness check, if implemented:

- Run at least 100 simulations per simple strategy.
- Produce win rate, average final pressures, common loss reasons, and action usage counts.

### Review Gate

Review balance signals. Adjust obvious broken numbers before visual polish.

## Phase 8: Atmosphere and Usability Pass

### Objective

Make the prototype feel like Haunted Apex while preserving tuning clarity.

### Scope

- Apply cyber-noir command-interface styling.
- Improve pressure warning states.
- Make **Advance Week** visually important.
- Improve event log readability.
- Improve card hierarchy and spacing.
- Add portrait/event-art slots with placeholders.
- Add light motion only where it clarifies state changes.
- Add empty/loading/disabled states.
- Ensure responsive behavior is acceptable on desktop and tolerable on smaller screens.

### Deliverables

- The prototype no longer feels like a generic admin dashboard.
- The UI remains dense, readable, and useful for balancing.
- Visual design supports the fantasy without hiding the mechanics.

### Verification

Manual checks:

- No text overlap at common desktop widths.
- Pressure warnings are obvious.
- Event choices are readable.
- Queued orders and assigned operatives are easy to scan.
- Full playthrough remains usable.

### Review Gate

Review whether the prototype now communicates the intended fantasy: the UI is the throne.

## Phase 9: First Balance Pass

### Objective

Tune the first playable version against the intended 10-15 minute experience.

### Scope

- Play several manual runs using different strategies.
- Use harness output if available.
- Adjust action effects, event weights, and drift values.
- Check whether:
  - random play wins too often
  - cautious play fails mostly by Dominion
  - aggressive play risks Heat loss
  - Lay Low is useful but not mandatory every week
  - Gather Intel unlocks meaningful event choices
  - recruitment is situationally useful
  - no operative is always optimal
  - events feel reactive rather than random

### Deliverables

- Tuned v0 constants.
- Brief balance notes summarizing what changed and why.
- Known issues list for the next iteration.

### Verification

Target first-test profile:

- experienced thoughtful play win rate: roughly `50-70%`
- random play win rate: roughly `10-25%`
- cautious play: often survives but misses Dominion target
- aggressive play: can win but risks Heat collapse

These are directional, not hard requirements.

### Review Gate

Review whether District Zero answers the core question:

> Does the player care before clicking Advance Week?

## Suggested Implementation Sequence

Use this sequence when asking Codex to implement:

1. Implement Phase 0 only.
2. Review scaffold and scripts.
3. Implement Phase 1 only.
4. Review engine state shape.
5. Implement Phase 2 only.
6. Review action queue and previews.
7. Implement Phase 3 only.
8. Review action resolution logs.
9. Implement Phase 4 only.
10. Review full headless playthrough.
11. Implement Phase 5 only.
12. Review facade and persistence.
13. Implement Phase 6 only.
14. Review playable browser loop.
15. Implement Phase 7 if tuning needs it immediately.
16. Implement Phase 8.
17. Run Phase 9 balance pass.

## Stop Conditions

Stop and revise the plan if any of these happen:

- Engine code needs Angular to work.
- UI components duplicate major simulation rules.
- Randomness cannot be reproduced by seed.
- The player can get stuck with no legal action and no game-over state.
- Event choices cannot express costs/effects cleanly.
- Save/load requires special-case reconstruction of non-serializable state.
- The dashboard cannot show enough state to tune the game.

## Deferred Follow-Up Plans

After District Zero v0 is playable, likely next planning documents:

- `DistrictZero-BalanceReport.md`: results from manual and simulated runs.
- `Electron-SQLite-TDD.md`: packaging and persistence design after the browser loop proves itself.
- `ContentPipeline-TDD.md`: art/music metadata, asset selection, and future authoring workflow.
- `SimulationHarness-TDD.md`: if balance agents become a serious part of development.

Do not write these before the playable loop exists unless the prototype exposes a concrete need.
