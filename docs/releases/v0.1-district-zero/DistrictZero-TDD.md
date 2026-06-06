# Haunted Apex District Zero TDD

## Purpose

This document defines the technical design for the first playable Haunted Apex prototype: **District Zero**.

District Zero is a browser-based Angular prototype proving the core loop:

> The player can win only by becoming dangerous, but becoming dangerous makes the city push back.

The prototype should be playable in a 10-15 minute session. It should prioritize deterministic simulation, fast tuning, and a complete turn loop over production packaging, large-scale persistence, or full game architecture.

## Source Documents

- `../../foundation/Layer1.md`: product identity, core fantasy, pressure model, procedural direction, UI philosophy.
- `../../foundation/Layer1A.md`: District Zero rules, starting values, actions, operatives, events, risk/stress tuning.
- `v0.md`: playable UI shape, turn model, determinism, action preview, assignment rules.

## Goals

- Build a runnable Angular prototype with one main screen: **The Black Ledger**.
- Implement a pure TypeScript game engine independent of Angular components.
- Support seeded deterministic runs: same seed plus same choices produces the same outcome.
- Implement the 8-week District Zero campaign.
- Implement pressure tracking for Dominion, Heat, Loyalty, Resources, Intel, and Ruin.
- Implement two command points per week with queued actions.
- Implement operative assignment, action modifiers, risk resolution, and stress.
- Implement one weekly event after actions and drift resolve.
- Implement win/loss states.
- Support local save/load for the current run.
- Make tuning straightforward by keeping content in data definitions.

## Non-Goals

- Electron packaging.
- SQLite persistence.
- Backend API endpoints.
- Cloud services, telemetry, accounts, or multiplayer.
- Full city map.
- Relationship web screen.
- Faction screen.
- Inventory, equipment, fronts, or upgrades.
- Audio system beyond placeholder hooks.
- Procedural campaign generation beyond seed-based deterministic variation where useful.
- Complex animation or asset pipeline.

## Runtime Target

V0 runs as an Angular web app on `localhost:4200`.

The implementation should leave room for Electron later by avoiding direct browser APIs inside the game engine. Browser-specific concerns belong in Angular services or adapters.

## Architecture

Use a layered structure:

```text
Angular UI
  Renders The Black Ledger
  Captures player commands
  Shows previews, event choices, logs, and game-over state

Application Store / Facade
  Owns current GameState in the Angular app
  Calls pure engine functions
  Handles save/load through persistence adapter

Pure TypeScript Game Engine
  Owns deterministic state transitions
  Resolves actions, risks, drift, events, win/loss
  Does not import Angular or browser APIs

Content Definitions
  Actions
  Operatives
  Recruit pool
  Events
  Tuning constants

Persistence Adapter
  V0: localStorage JSON
  Later: Electron IPC + SQLite
```

Recommended Angular project layout after scaffold:

```text
src/app/
  app.component.*
  game/
    game.facade.ts
    game-storage.service.ts
    components/
      black-ledger/
      pressure-panel/
      action-board/
      operative-roster/
      queued-orders/
      event-panel/
      event-log/
      debug-panel/
  engine/
    model/
      game-state.ts
      actions.ts
      operatives.ts
      events.ts
      pressures.ts
    content/
      district-zero-actions.ts
      district-zero-events.ts
      district-zero-operatives.ts
      district-zero-tuning.ts
    rng/
      seeded-rng.ts
    selectors/
      previews.ts
      view-models.ts
    simulation/
      new-game.ts
      queue-order.ts
      resolve-week.ts
      resolve-action.ts
      resolve-event.ts
      weekly-drift.ts
      win-loss.ts
      clamps.ts
```

The exact file names can change during implementation, but the dependency direction should not:

```text
UI -> facade -> engine
engine -> content/model/rng only
engine -/-> Angular
engine -/-> localStorage
engine -/-> DOM
```

## Core Game State

V0 state should be compact and serializable as JSON.

```ts
type GameState = {
  id: string;
  seed: string;
  rngCursor: number;
  week: number;
  maxWeeks: number;
  phase: TurnPhase;
  commandPointsPerWeek: number;
  pressures: Pressures;
  operatives: Operative[];
  recruitPool: RecruitCandidate[];
  queuedOrders: QueuedOrder[];
  pendingEvent?: GameEventInstance;
  eventLog: GameLogEntry[];
  flags: Record<string, boolean | number | string>;
  gameOver?: GameOverState;
};
```

```ts
type TurnPhase =
  | "COMMAND"
  | "RESOLVING_ACTIONS"
  | "EVENT_CHOICE"
  | "WEEK_COMPLETE"
  | "GAME_OVER";
```

V0 may not need to expose `RESOLVING_ACTIONS` or `WEEK_COMPLETE` as long-lived UI phases, but they are useful domain concepts.

```ts
type Pressures = {
  dominion: number;
  heat: number;
  loyalty: number;
  resources: number;
  intel: number;
  ruin: number;
};
```

Pressure clamps:

- `dominion`: `0..100`
- `heat`: `0..100`
- `loyalty`: `0..100`
- `resources`: can go below `0` before loss check
- `intel`: `0..100`
- `ruin`: `0..100`

## Starting State

```ts
const initialPressures = {
  dominion: 12,
  heat: 18,
  loyalty: 68,
  resources: 5000,
  intel: 10,
  ruin: 0,
};
```

Campaign constants:

```ts
week = 1;
maxWeeks = 8;
commandPointsPerWeek = 2;
maxOperatives = 5;
```

Starting operatives:

- Mara Voss: subtle infiltrator, lowers exposure, hidden ghost debt.
- Juno Hex: high-tech ghost hacker, increases Intel but adds Ruin/stress.
- Saint Calder: charm fixer, strong bribes and influence, hidden debt risk.

Recruit pool:

- Iris Vale: Socialite.
- Knox Riven: Enforcer.
- Orchid Seven: Courier.

Recruitment adds specialist coverage and stress resilience. It does **not** increase command points in v0.

## Determinism

Every run has:

```ts
seed: string;
rngCursor: number;
```

Requirements:

- If no seed is supplied, generate one.
- Same seed plus same player choices must produce the same outcomes.
- RNG use must be centralized through the engine.
- Engine functions that consume randomness must return updated RNG state.
- The debug panel should show seed and cursor.

Avoid direct `Math.random()` anywhere in engine code.

Suggested RNG API:

```ts
type RngState = {
  seed: string;
  cursor: number;
};

type RngResult<T> = {
  value: T;
  rng: RngState;
};
```

The concrete RNG can be simple for v0, provided it is deterministic and stable.

## Turn Flow

V0 uses this exact order:

1. Player queues up to 2 actions.
2. Player clicks **Advance Week**.
3. Queued actions resolve.
4. Action risks/complications resolve.
5. Operative stress changes apply.
6. Idle operative stress recovery applies.
7. Weekly drift applies.
8. One weekly event is selected from updated state.
9. Event choice is presented.
10. Player chooses event response.
11. Event effects apply.
12. Win/loss is checked.
13. If game continues, week increments and phase returns to `COMMAND`.

Events are selected after actions and drift so the city reacts to the player's current behavior.

## Command Phase

Rules:

- Player starts each week with 2 command points.
- Each v0 action costs 1 command point.
- Player may advance with only 1 queued action.
- Player may remove queued actions before advancing.
- Each queued action may have zero or one assigned operative.
- Each operative can be assigned to only one action per week.
- Actions can define whether an operative is required, optional, or disallowed.

```ts
type QueuedOrder = {
  id: string;
  actionId: ActionId;
  assignedOperativeId?: string;
};
```

Advance Week button is enabled when:

```ts
phase === "COMMAND" && queuedOrders.length > 0
```

## Actions

All six v0 actions are available from week 1:

- Gather Intel
- Run a Small Job
- Bribe an Official
- Recruit an Operative
- Expand Influence
- Lay Low

Action definition shape:

```ts
type ActionDefinition = {
  id: ActionId;
  label: string;
  commandCost: number;
  resourceCost: number;
  effects: Partial<Pressures>;
  operativeSkill?: OperativeSkill;
  baseRisk: number;
  stressType?: "normal" | "dangerous" | "recovery" | "none";
  assignment: "optional" | "required" | "none";
};
```

Resource costs should be represented separately from pressure effects for preview clarity, but resolution can apply both through the same pressure delta helper.

### Action Preview

Action cards show:

- command cost
- resource cost
- base expected effects
- adjusted expected effects when an operative is selected
- qualitative risk
- assignment requirement
- unavailable reason, if any

Do not show exact percentages in the main v0 UI.

Risk labels:

```ts
type RiskLabel = "Very Low" | "Low" | "Moderate" | "High" | "Severe";

function riskLabel(chance: number): RiskLabel {
  if (chance <= 6) return "Very Low";
  if (chance <= 14) return "Low";
  if (chance <= 24) return "Moderate";
  if (chance <= 34) return "High";
  return "Severe";
}
```

The debug panel may show exact values later.

## Operatives

```ts
type Operative = {
  id: string;
  name: string;
  archetype: string;
  loyalty: number;
  stress: number;
  violence: number;
  charm: number;
  tech: number;
  subtlety: number;
  traitIds: string[];
  status: OperativeStatus;
};

type OperativeStatus =
  | "available"
  | "assigned"
  | "idle"
  | "injured"
  | "compromised";

type OperativeSkill = "violence" | "charm" | "tech" | "subtlety";
```

Status handling:

- `available`: can be assigned.
- `assigned`: already used this week.
- `idle`: not assigned during the current week; mostly a UI state.
- `injured`: cannot be assigned.
- `compromised`: cannot be assigned or has restricted assignment, depending on tuning.

For v0, `injured` and `compromised` can be produced by complications but do not need elaborate recovery systems.

### Stress

Assignment stress:

```ts
normalActionStress = +6;
dangerousActionStress = +10;
layLowStressRecovery = -8;
idleStressRecovery = -2;
```

Rules:

- Assigned operatives gain action stress.
- Idle operatives recover 2 stress if stress is above 0.
- Lay Low can be used without an operative.
- If an operative is assigned to Lay Low, that operative recovers 8 stress.

Stress thresholds:

```text
stress >= 60: complication chance +10
stress >= 80: may become injured, compromised, or refuse assignment
```

V0 should implement the `>= 60` complication modifier. The `>= 80` consequence can be simple and event-log driven.

## Risk Resolution

When an action uses an operative, calculate risk from action base risk, operative skill, stress, and loyalty.

```ts
riskChance = action.baseRisk - Math.floor((skill - 50) / 4);
riskChance += Math.floor(op.stress / 10);
riskChance -= Math.floor(op.loyalty / 20);
riskChance = clamp(riskChance, 3, 45);
```

If no operative is assigned, use the base risk with any action-specific fallback modifier. For v0, unassigned non-Lay-Low actions should usually be allowed only if the action definition says assignment is optional.

Risk resolves during **Advance Week**, never when queueing an action.

Complications should:

- add log entries
- apply bounded pressure penalties
- set flags where defined
- occasionally affect operative status/stress

Required v0 special case:

- Failed `bribe_official`: Heat `+6` instead of `-12`, and `bribe_exposed` flag is set.

Other actions can use generic complications in v0, such as extra Heat, stress, or minor Loyalty loss.

## Operative Modifiers

Operative modifiers should be content-driven.

Examples from `../../foundation/Layer1A.md`:

```ts
const operativeActionModifiers = {
  op_mara_voss: {
    gather_intel: { effects: { heat: -1 } },
    expand_influence: { effects: { heat: -2 } },
    run_small_job: { effects: { resources: -400, heat: -2 } },
  },
  op_juno_hex: {
    gather_intel: { effects: { intel: 3, ruin: 1 }, stress: 5 },
    run_small_job: { effects: { intel: 2, ruin: 1 } },
    expand_influence: { effects: { intel: 2, ruin: 1 } },
  },
  op_saint_calder: {
    bribe_official: { resourceCost: -300 },
    expand_influence: { effects: { dominion: 3 } },
    gather_intel: { chanceRelationshipLead: 0.1 },
  },
};
```

For v0, relationship leads can be represented as event-log entries or flags. No relationship screen is required.

## Weekly Drift

After queued actions resolve:

```ts
resources -= 650;
heat -= 2;
loyalty -= 1;

if (dominion >= 40) {
  heat += 2;
}

if (heat >= 70) {
  loyalty -= 3;
}

if (resources <= 1000) {
  loyalty -= 3;
}
```

Then clamp pressures and continue to event selection.

## Events

Each week, select one event after actions and drift.

V0 event pool:

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

Event definition shape:

```ts
type EventDefinition = {
  id: string;
  title: string;
  text: string;
  tags: EventTag[];
  baseWeight: number;
  weightRules?: EventWeightRule[];
  choices: EventChoiceDefinition[];
};

type EventChoiceDefinition = {
  id: string;
  label: string;
  cost?: Partial<Pressures> | SpecialCost;
  effects: Partial<Pressures>;
  flags?: string[];
};
```

Events should be selected by weighted deterministic randomness.

The first implementation can keep conditions simple:

- calculate a weight for every event
- discard events with weight `<= 0`
- weighted-pick one event
- store it as `pendingEvent`

### Event Director Guardrails

Avoid making the prototype feel randomly punitive.

V0 should track recent event tags in the log or state and reduce weights for repeated pressure punishment.

Simple rule:

```text
If the last two weekly events shared a major negative tag, reduce matching event weights by 50%.
```

Major negative tags:

- `HEAT`
- `LOYALTY`
- `RESOURCE`
- `VIOLENCE`
- `SAFEHOUSE`

This does not need to be sophisticated. It only needs to avoid obvious bad streaks during tuning.

## Win/Loss

Victory:

```ts
dominion >= 60
```

Loss:

```ts
heat >= 100
loyalty <= 0
resources < 0
```

Week limit:

- The player has 8 weeks.
- If the player completes Week 8 without `dominion >= 60`, the run ends in failure.

Check timing:

- After event choice effects apply.
- Before incrementing the week.

Soft warning states:

```ts
heat >= 80;
loyalty <= 25;
resources <= 750;
```

Soft warnings should be visible in pressure meter styling and/or alert text.

```ts
type GameOverState = {
  result: "victory" | "loss";
  reason:
    | "dominion_victory"
    | "heat_lockdown"
    | "loyalty_collapse"
    | "bankrupt"
    | "out_of_time";
};
```

## Logging

The event log is part of both UX and testability.

```ts
type GameLogEntry = {
  id: string;
  week: number;
  type:
    | "order_queued"
    | "order_resolved"
    | "complication"
    | "drift"
    | "event_presented"
    | "event_choice"
    | "win_loss";
  title: string;
  body?: string;
  pressureDelta?: Partial<Pressures>;
  tags?: string[];
};
```

The log should make a run understandable after the fact:

- what the player ordered
- what changed
- what went wrong
- what event fired
- what choice was made
- why the game ended

## UI Design

V0 uses one screen: **The Black Ledger**.

Layout:

```text
[Header: Week / CP / Status / Advance Week]

[Pressure Meters] [Action Cards + Queued Orders] [Operatives]

[Event Feed / Weekly Fallout]
```

Optional internal tabs:

- Command
- Operatives
- Log
- Debug

Do not build separate routes for City Map, Relationships, Factions, Inventory, Settings, or Districts.

### Header

Displays:

- `Week X / 8`
- command points remaining
- active phase
- win/loss warning if relevant
- seed in debug-friendly form if space allows
- **Advance Week** button

### Pressure Panel

Displays:

- Dominion
- Heat
- Loyalty
- Resources
- Intel
- Ruin

Each pressure should show:

- label
- current value
- meter/bar
- status text or visual state
- recent trend if available

Resources should be formatted as currency-like numeric text, but remain a pressure internally.

Ruin is visible in v0 for tuning, even if a later version hides or reveals it gradually.

### Action Board

Each action card shows:

- label
- cost
- base effects
- adjusted effects when assigning an operative
- qualitative risk
- assignment control
- queue/remove control
- unavailable reason

Action card states:

- Available
- Unavailable: not enough resources
- Unavailable: not enough command points
- Unavailable: requires operative but none available
- Queued

### Queued Orders

Shows queued orders for the current week:

- action label
- assigned operative, if any
- adjusted expected effects
- risk label
- remove button

### Operative Roster

Displays:

- name
- archetype
- status
- stress
- loyalty
- skills
- trait labels
- current assignment state

The player must be able to understand why Mara, Juno, or Saint changes a decision.

### Event Panel

When `phase === "EVENT_CHOICE"`:

- show pending event title and text
- show choices
- show choice costs/effects
- allow one choice

Do not allow action queue changes while an event is pending.

### Debug Panel

Debug panel can be an internal tab or collapsible panel.

Displays:

- seed
- RNG cursor
- full pressures JSON
- flags
- queued orders
- pending event id
- recent event tags
- exact risk percentages if available

The debug panel is for development and tuning, not final player feel.

## View Models

Angular components should receive view models instead of raw state where practical.

Useful selectors:

```ts
selectDashboardView(state): DashboardView
selectActionCards(state): ActionCardView[]
selectOperativeRoster(state): OperativeView[]
selectQueuedOrders(state): QueuedOrderView[]
selectPendingEvent(state): EventChoiceView | undefined
```

Example:

```ts
type ActionCardView = {
  id: ActionId;
  label: string;
  state: "available" | "queued" | "unavailable";
  unavailableReason?: string;
  commandCost: number;
  resourceCost: number;
  baseEffects: PressureDeltaView[];
  adjustedEffects: PressureDeltaView[];
  selectedOperativeId?: string;
  availableOperatives: OperativeOptionView[];
  riskLabel: RiskLabel;
};
```

This keeps UI components from duplicating engine rules.

## Persistence

V0 persistence uses localStorage.

Storage service:

```ts
interface GameStorage {
  saveCurrentRun(state: GameState): void;
  loadCurrentRun(): GameState | undefined;
  clearCurrentRun(): void;
}
```

Storage key:

```text
haunted-apex:v0:current-run
```

Persistence rules:

- Save after meaningful state transitions.
- Load on app start if a valid save exists.
- Provide New Game and Reset Run controls.
- Validate loaded JSON enough to avoid crashing on stale data.

The game engine must not call localStorage directly.

## Styling Direction

V0 should feel like a cyber-noir command interface, but readability and tuning speed matter more than final art direction.

Principles:

- Dense but readable.
- Dashboard-first, not landing-page-like.
- The whole prototype state should be visible at once on desktop.
- Use restrained motion.
- Avoid decorative clutter that hides pressure changes.
- Make warning states obvious.
- Make **Advance Week** feel important.

Visual assets are optional for v0. Reserve clear slots for portraits or event art, but do not block gameplay on asset integration.

## Testing Strategy

Prioritize engine tests first.

Recommended unit tests:

- new game creates expected starting state
- command points and queue rules
- cannot assign one operative to two actions
- action preview reflects operative modifiers
- risk calculation clamps correctly
- action resolution applies costs/effects
- bribe failure sets `bribe_exposed`
- weekly drift applies correctly
- idle stress recovery applies
- Lay Low stress recovery applies
- event selection is deterministic for a seed
- event choice applies cost/effects/flags
- win triggers at `dominion >= 60`
- heat loss triggers at `heat >= 100`
- loyalty loss triggers at `loyalty <= 0`
- bankruptcy loss triggers at `resources < 0`
- out-of-time loss triggers after Week 8 without victory
- localStorage adapter round-trips a state object

For UI tests, start lighter:

- app renders Black Ledger
- action can be queued
- Advance Week reaches event choice
- event choice returns to command phase or game over

## Acceptance Criteria

District Zero v0 is complete when:

- A new run can be started.
- The dashboard shows week, command points, pressures, actions, operatives, queue, and log.
- The player can queue up to 2 actions.
- The player can assign available operatives according to v0 rules.
- Action previews update for operative modifiers.
- Advance Week resolves actions, risks, stress, drift, and one event.
- The player can choose an event response.
- The run advances week by week.
- Victory and all loss conditions work.
- Runs are deterministic by seed.
- The current run can be saved and loaded locally.
- The game can be played from Week 1 to a victory or loss without developer intervention.

## Deferred Architecture

Electron later:

- Angular remains renderer UI.
- Engine remains pure TypeScript.
- Persistence adapter changes from localStorage to Electron IPC.
- SQLite lives behind an Electron-side service.

SQLite later:

- Save files can be modeled as local databases.
- Content definitions may remain code/data files until they need authoring tools.
- Run state can be persisted in structured tables once the state shape stabilizes.

Possible future SQLite areas:

- campaigns
- runs
- event log
- operatives
- districts
- factions
- relationships
- assets
- settings

Do not design those tables for v0. The current priority is proving the loop.

## Implementation Notes

Start with engine and content before UI polish.

Recommended build order:

1. Scaffold Angular app.
2. Add engine model/content files.
3. Implement deterministic new game.
4. Implement queue/remove order logic.
5. Implement previews.
6. Implement action resolution, stress, drift, and win/loss.
7. Implement event selection and event choices.
8. Wire the facade and localStorage.
9. Build The Black Ledger dashboard.
10. Add debug panel.
11. Add focused tests.
12. Tune after playing several complete runs.

The first implementation should stay inside this TDD unless a missing rule blocks the playable loop.
