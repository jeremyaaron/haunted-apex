Here is a concrete **District Zero prototype spec** Codex can implement.

# Haunted Apex — District Zero Prototype Rules

## Prototype goal

The player has **8 weeks** to establish control over one district.

Win:

```ts
dominion >= 60;
```

Loss:

```ts
heat >= 100;
loyalty <= 0;
resources < 0;
```

Soft-loss warning states:

```ts
heat >= 80; // lockdown danger
loyalty <= 25; // betrayal danger
resources <= 750; // desperation danger
```

---

# Starting values

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

Starting week:

```ts
week = 1;
maxWeeks = 8;
```

Starting command capacity:

```ts
commandPointsPerWeek = 2;
```

Most actions cost **1 command point**. This forces choice immediately.

---

# First three operatives

Each operative should have one obvious strength, one liability, and one emotional/mechanical hook.

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
  status: "available" | "assigned" | "injured" | "compromised";
};
```

## 1. Mara Voss — Infiltrator

```ts
{
  id: 'op_mara_voss',
  name: 'Mara Voss',
  archetype: 'Infiltrator',
  loyalty: 72,
  stress: 18,
  violence: 35,
  charm: 58,
  tech: 45,
  subtlety: 82,
  traitIds: ['ghost_debt', 'clean_entry']
}
```

Mechanical identity:

```text
Best at low-heat, high-intel operations.
Lower exposure risk on Gather Intel and Blackmail jobs.
```

Trait:

```ts
clean_entry: {
  effect: "Reduce heat gain from Gather Intel by 1.";
}
```

Hidden liability:

```ts
ghost_debt: {
  effect: "If ruin >= 25 or loyalty <= 35, chance of a debt-related complication.";
}
```

## 2. Juno Hex — Ghost Hacker

```ts
{
  id: 'op_juno_hex',
  name: 'Juno Hex',
  archetype: 'Ghost Hacker',
  loyalty: 61,
  stress: 32,
  violence: 20,
  charm: 35,
  tech: 90,
  subtlety: 55,
  traitIds: ['brilliant_unstable', 'ghost_touch']
}
```

Mechanical identity:

```text
Generates more Intel, but increases Ruin and stress risk.
```

Trait:

```ts
brilliant_unstable: {
  effect: "+3 Intel on Gather Intel, but +5 stress.";
}
```

Trait:

```ts
ghost_touch: {
  effect: "Certain events reveal hidden options, but Ruin increases faster.";
}
```

## 3. Saint Calder — Fixer

```ts
{
  id: 'op_saint_calder',
  name: 'Saint Calder',
  archetype: 'Fixer',
  loyalty: 66,
  stress: 20,
  violence: 45,
  charm: 78,
  tech: 35,
  subtlety: 62,
  traitIds: ['silver_tongue', 'probably_lying']
}
```

Mechanical identity:

```text
Best at relationships, bribes, and reducing Heat.
```

Trait:

```ts
silver_tongue: {
  effect: "Reduce cost of Bribe Official by 300 resources.";
}
```

Hidden liability:

```ts
probably_lying: {
  effect: "When Resources drop below 1000, chance Saint has concealed a debt.";
}
```

---

# First six actions

All six actions should be available from Week 1.

Use these exact numbers first. They are tunable later.

## 1. Gather Intel

Purpose: safer setup action; enables better future outcomes.

```ts
{
  id: 'gather_intel',
  label: 'Gather Intel',
  commandCost: 1,
  resourceCost: 400,
  effects: {
    intel: +10,
    heat: +2
  },
  operativeSkill: 'subtlety',
  baseRisk: 10
}
```

Operative modifiers:

```text
Mara: heat gain reduced by 1.
Juno: +3 extra Intel, +5 stress, +1 Ruin.
Saint: 10% chance to reveal a relationship opportunity.
```

Regret:

```text
Feels safe, but spending too many weeks gathering intel lets rivals advance.
```

Comeback use:

```text
Intel unlocks better event choices and can convert bad events into recoverable ones.
```

---

## 2. Run a Small Job

Purpose: basic money/power action.

```ts
{
  id: 'run_small_job',
  label: 'Run a Small Job',
  commandCost: 1,
  resourceCost: 0,
  effects: {
    resources: +1400,
    dominion: +5,
    heat: +8,
    loyalty: -2
  },
  operativeSkill: 'violence',
  baseRisk: 22
}
```

Operative modifiers:

```text
Mara: -2 Heat, but only +1000 Resources.
Juno: +2 Intel, but +1 Ruin.
Saint: +2 Dominion from social leverage.
```

Regret:

```text
Solves cash pressure now, but Heat climbs fast. Repeated jobs create a crackdown spiral.
```

Comeback use:

```text
Emergency cash when nearly broke.
```

---

## 3. Bribe an Official

Purpose: direct Heat relief at financial cost.

```ts
{
  id: 'bribe_official',
  label: 'Bribe an Official',
  commandCost: 1,
  resourceCost: 1200,
  effects: {
    heat: -12,
    intel: +2,
    ruin: +1
  },
  operativeSkill: 'charm',
  baseRisk: 14
}
```

Operative modifiers:

```text
Saint: cost reduced to 900.
Mara: +2 Intel from watching the handoff.
Juno: no bonus.
```

Risk:

```text
If failed, Heat +6 instead of -12 and event flag 'bribe_exposed' is set.
```

Regret:

```text
Feels clean, but it burns resources and adds low-level Ruin.
```

Comeback use:

```text
Primary way to escape Heat danger without waiting.
```

---

## 4. Recruit an Operative

Purpose: expand capacity, but strains loyalty/resources.

```ts
{
  id: 'recruit_operative',
  label: 'Recruit an Operative',
  commandCost: 1,
  resourceCost: 1600,
  effects: {
    loyalty: -4,
    dominion: +3
  },
  baseRisk: 12
}
```

Prototype behavior:

```text
Adds one generated operative from a tiny pool.
Max roster size in prototype: 5.
```

Recruit pool:

```ts
[
  {
    name: "Iris Vale",
    archetype: "Socialite",
    violence: 15,
    charm: 88,
    tech: 30,
    subtlety: 68,
    traitIds: ["velvet_access"],
  },
  {
    name: "Knox Riven",
    archetype: "Enforcer",
    violence: 86,
    charm: 25,
    tech: 20,
    subtlety: 38,
    traitIds: ["loud_solution"],
  },
  {
    name: "Orchid Seven",
    archetype: "Courier",
    violence: 30,
    charm: 52,
    tech: 50,
    subtlety: 78,
    traitIds: ["knows_the_routes"],
  },
];
```

Regret:

```text
More people means more capacity later, but immediate loyalty drops because the original crew feels diluted.
```

Comeback use:

```text
Can recover a bad run if the player needs more specialists.
```

---

## 5. Expand Influence

Purpose: main Dominion push.

```ts
{
  id: 'expand_influence',
  label: 'Expand Influence',
  commandCost: 1,
  resourceCost: 900,
  effects: {
    dominion: +10,
    heat: +7,
    loyalty: -3
  },
  operativeSkill: 'charm',
  baseRisk: 18
}
```

Operative modifiers:

```text
Saint: +3 Dominion.
Mara: -2 Heat.
Juno: +2 Intel but +1 Ruin.
```

Regret:

```text
This is how you win, but every push makes you louder and stretches the network.
```

Comeback use:

```text
Allows late-game sprint to victory if Heat can be managed.
```

---

## 6. Lay Low

Purpose: recovery action; buys time but loses momentum.

```ts
{
  id: 'lay_low',
  label: 'Lay Low',
  commandCost: 1,
  resourceCost: 300,
  effects: {
    heat: -10,
    loyalty: +4,
    dominion: -2
  },
  baseRisk: 4
}
```

Operative optional:

```text
Can be used without assigning an operative.
If an operative is assigned, reduce their stress by 8.
```

Regret:

```text
You survive, but rivals advance and the city forgets you.
```

Comeback use:

```text
Primary stabilizer. It should feel useful, but not exciting.
```

---

# Passive weekly drift

After actions resolve, apply drift:

```ts
function applyWeeklyDrift(state) {
  state.pressures.resources -= 650; // upkeep
  state.pressures.heat -= 2; // natural cooling
  state.pressures.loyalty -= 1; // baseline fatigue

  if (state.pressures.dominion >= 40) {
    state.pressures.heat += 2; // powerful networks attract attention
  }

  if (state.pressures.heat >= 70) {
    state.pressures.loyalty -= 3; // fear corrodes the crew
  }

  if (state.pressures.resources <= 1000) {
    state.pressures.loyalty -= 3; // broke kingpins are not inspiring
  }

  clampPressures();
}
```

This makes the board move even when the player plays safely.

---

# First 10 events

Each week, trigger **one event**, chosen by weighted conditions. Some are good, some bad, some mixed.

## Event 1: Corp Patrol Sweep

Trigger weight:

```text
Higher if Heat >= 40
Very high if Heat >= 70
```

```ts
{
  id: 'corp_patrol_sweep',
  title: 'Corp Patrol Sweep',
  text: 'Private security floods the lower avenues, checking faces against a list they insist does not exist.',
  effects: { heat: +6, intel: -2 },
  choices: [
    {
      label: 'Pay for clean passage',
      cost: { resources: 1000 },
      effects: { heat: -8 }
    },
    {
      label: 'Feed them a rival name',
      cost: { intel: 6 },
      effects: { heat: -5, dominion: +2, ruin: +2 }
    },
    {
      label: 'Let the sweep pass',
      effects: { heat: +4, loyalty: -2 }
    }
  ]
}
```

Regret:

```text
All options hurt. Money, Intel/Ruin, or Heat/Loyalty.
```

---

## Event 2: Rival Tests Your Border

Trigger:

```text
Baseline event. More likely if Dominion < 35.
```

```ts
{
  id: 'rival_tests_border',
  title: 'Rival Tests Your Border',
  text: 'A rival crew starts collecting protection money two blocks from your safehouse.',
  choices: [
    {
      label: 'Answer publicly',
      effects: { dominion: +6, heat: +8, loyalty: +3 }
    },
    {
      label: 'Handle it quietly',
      cost: { intel: 4 },
      effects: { dominion: +3, heat: +2 }
    },
    {
      label: 'Ignore it for now',
      effects: { dominion: -5, loyalty: -4 }
    }
  ]
}
```

Regret:

```text
Public strength creates Heat. Quiet strength costs Intel. Ignoring it hurts.
```

---

## Event 3: Liaison Offers a Favor

Trigger:

```text
More likely if Intel >= 12 or Saint exists.
```

```ts
{
  id: 'liaison_favor',
  title: 'A Favor in Violet Light',
  text: 'A dangerous liaison offers access to an elite room where people trade secrets like perfume.',
  choices: [
    {
      label: 'Accept the favor',
      effects: { intel: +10, dominion: +3, ruin: +2 },
      flags: ['owes_liaison']
    },
    {
      label: 'Pay instead of owing',
      cost: { resources: 1300 },
      effects: { intel: +7 }
    },
    {
      label: 'Decline gracefully',
      effects: { loyalty: +2 }
    }
  ]
}
```

Regret:

```text
The best option creates a future debt.
```

---

## Event 4: Operative Wants More

Trigger:

```text
More likely if Loyalty < 55 or Resources > 3000.
```

```ts
{
  id: 'operative_wants_more',
  title: 'Someone Wants More',
  text: 'One of your people has noticed the city getting richer around you and asks why their cut still feels symbolic.',
  choices: [
    {
      label: 'Pay them',
      cost: { resources: 900 },
      effects: { loyalty: +8 }
    },
    {
      label: 'Promise future rewards',
      effects: { loyalty: +3, heat: +1 },
      flags: ['made_unfunded_promise']
    },
    {
      label: 'Remind them who built this',
      effects: { loyalty: -8, dominion: +3, ruin: +2 }
    }
  ]
}
```

Regret:

```text
Short-term loyalty may create future promise debt.
```

---

## Event 5: Blackmail Lead Emerges

Trigger:

```text
More likely if Intel >= 15.
```

```ts
{
  id: 'blackmail_lead',
  title: 'A Name Behind the Glass',
  text: 'Your surveillance finds a corporate magistrate entering a room that officially does not exist.',
  choices: [
    {
      label: 'Exploit immediately',
      effects: { dominion: +7, resources: +800, heat: +6, ruin: +2 }
    },
    {
      label: 'Save it for later',
      effects: { intel: +5 },
      flags: ['stored_blackmail']
    },
    {
      label: 'Trade it quietly',
      effects: { resources: +1200, intel: -4 }
    }
  ]
}
```

Regret:

```text
Using leverage gives power but makes the player dirtier and louder.
```

---

## Event 6: Job Goes Loud

Trigger:

```text
More likely if Run Small Job used this week or Heat >= 50.
```

```ts
{
  id: 'job_goes_loud',
  title: 'The Job Goes Loud',
  text: 'Someone fires when they were supposed to smile. The street remembers the sound.',
  choices: [
    {
      label: 'Extract your people first',
      effects: { loyalty: +5, heat: +10, resources: -500 }
    },
    {
      label: 'Erase the witnesses',
      effects: { heat: -2, loyalty: -4, ruin: +6 }
    },
    {
      label: 'Abandon the exposed asset',
      effects: { heat: -8, loyalty: -10, ruin: +4 }
    }
  ]
}
```

Regret:

```text
This is the first truly ugly event. Every choice says something about the player.
```

---

## Event 7: Heat Cools Temporarily

Trigger:

```text
More likely if player used Lay Low or Heat < 45.
```

```ts
{
  id: 'heat_cools',
  title: 'A Bigger Fire Elsewhere',
  text: 'For once, the city looks away. Someone more theatrical has made themselves useful.',
  choices: [
    {
      label: 'Use the quiet to expand',
      effects: { dominion: +5, heat: +3 }
    },
    {
      label: 'Use the quiet to recover',
      effects: { heat: -8, loyalty: +3 }
    },
    {
      label: 'Use the quiet to listen',
      effects: { intel: +8 }
    }
  ]
}
```

Comeback:

```text
A clean recovery/opportunity event that does not feel like charity because the player still chooses the benefit.
```

---

## Event 8: Safehouse Compromised

Trigger:

```text
More likely if Heat >= 65 or bribe_exposed flag exists.
```

```ts
{
  id: 'safehouse_compromised',
  title: 'The Safehouse Is No Longer Safe',
  text: 'The lock is untouched. The camera is untouched. The ash on the table is arranged in your private signal.',
  choices: [
    {
      label: 'Move immediately',
      cost: { resources: 1500 },
      effects: { heat: -10, loyalty: +2 }
    },
    {
      label: 'Set a trap',
      cost: { intel: 6 },
      effects: { dominion: +5, heat: +4 }
    },
    {
      label: 'Stay and project strength',
      effects: { dominion: +4, loyalty: -6, heat: +6 }
    }
  ]
}
```

Regret:

```text
Moving is safest but expensive. Standing firm is emotionally satisfying and strategically dangerous.
```

---

## Event 9: Unexpected Windfall

Trigger:

```text
More likely if Resources <= 1500 or stored_blackmail flag exists.
```

```ts
{
  id: 'unexpected_windfall',
  title: 'Money From a Dead Channel',
  text: 'An old account lights up. No message. No signature. Just money and the sense that someone is watching.',
  choices: [
    {
      label: 'Take it',
      effects: { resources: +1800, ruin: +2 }
    },
    {
      label: 'Trace it first',
      cost: { intel: 4 },
      effects: { resources: +1200, intel: +3 }
    },
    {
      label: 'Refuse contaminated money',
      effects: { loyalty: +4 }
    }
  ]
}
```

Comeback:

```text
Helps broke players, but carries unease or opportunity cost.
```

---

## Event 10: The Rival Sends Flowers

Trigger:

```text
More likely if Dominion >= 35.
```

```ts
{
  id: 'rival_sends_flowers',
  title: 'The Rival Sends Flowers',
  text: 'Black orchids arrive at your lounge, each stem wired with a listening device delicate enough to be art.',
  choices: [
    {
      label: 'Send them back burning',
      effects: { dominion: +5, heat: +5 }
    },
    {
      label: 'Keep the device and reverse it',
      cost: { tech_or_intel: 6 },
      effects: { intel: +8, heat: +2 }
    },
    {
      label: 'Display them',
      effects: { loyalty: +3, ruin: +1 },
      flags: ['accepted_rival_gesture']
    }
  ]
}
```

Regret:

```text
Even style has consequences.
```

---

# What makes operatives distinct?

For prototype purposes, each operative affects three things:

## 1. Action modifier

Each operative changes the effects of certain actions.

Example:

```ts
const operativeActionModifiers = {
  op_mara_voss: {
    gather_intel: { heat: -1 },
    expand_influence: { heat: -2 },
    run_small_job: { resources: -400, heat: -2 },
  },
  op_juno_hex: {
    gather_intel: { intel: +3, ruin: +1, stress: +5 },
    run_small_job: { intel: +2, ruin: +1 },
    expand_influence: { intel: +2, ruin: +1 },
  },
  op_saint_calder: {
    bribe_official: { resourceCost: -300 },
    expand_influence: { dominion: +3 },
    gather_intel: { chanceRelationshipLead: 0.1 },
  },
};
```

## 2. Risk profile

When an action uses an operative, compare action skill to operative skill.

```ts
function getSkill(op, action) {
  return op[action.operativeSkill] ?? 50;
}
```

Simple success/risk formula:

```ts
riskChance = action.baseRisk - Math.floor((skill - 50) / 4);
riskChance += Math.floor(op.stress / 10);
riskChance -= Math.floor(op.loyalty / 20);
riskChance = clamp(riskChance, 3, 45);
```

So:

- high skill lowers complications
- high stress raises complications
- high loyalty slightly lowers complications

## 3. Stress accumulation

Every assignment adds stress.

```ts
normalActionStress = +6;
dangerousActionStress = +10;
layLowStressRecovery = -8;
```

If stress crosses thresholds:

```ts
stress >= 60: complication chance +10
stress >= 80: may become injured/compromised/refuse assignment
```

This makes operatives feel alive quickly.

---

# What choices create regret?

You need regret in four flavors.

## 1. Clean tactical regret

```text
I spent Intel too early and now I cannot handle the patrol sweep.
```

## 2. Moral/aesthetic regret

```text
I erased witnesses to reduce Heat, and now Ruin is climbing.
```

## 3. Relationship regret

```text
I accepted the liaison’s favor, and now they own a future piece of me.
```

## 4. Strategic timing regret

```text
I laid low too many times, and now I do not have enough Dominion by Week 8.
```

The key is that regret should usually come from **a choice that made sense at the time**.

Bad regret:

```text
Random event kills you.
```

Good regret:

```text
You used violence to solve three problems. Now everyone treats you like a violent solution.
```

---

# Comeback potential without feeling soft

Comebacks should not be free mercy. They should be **dirty lifelines**.

Use these.

## 1. Heat comeback

When Heat is high, offer relief that costs something.

```text
Frame a rival: -18 Heat, +8 Ruin, -5 Loyalty
Burn asset: -20 Heat, -12 Loyalty, +6 Ruin
Pay massive bribe: -15 Heat, -1800 Resources
```

## 2. Resource comeback

When broke, offer money with hooks.

```text
Take contaminated money: +2200 Resources, +3 Ruin, future event flag
Accept liaison debt: +1600 Resources, relationship volatility +8
Run desperate job: +2500 Resources, +15 Heat
```

## 3. Loyalty comeback

When loyalty is low, offer costly trust repair.

```text
Share the spoils: -1200 Resources, +12 Loyalty
Take the blame publicly: -5 Dominion, +10 Loyalty, +5 Heat
Rest the crew: -3 Dominion, -500 Resources, +10 Loyalty
```

## 4. Dominion comeback

When behind schedule, offer dangerous expansion.

```text
Openly challenge rival: +15 Dominion, +15 Heat
Exploit blackmail: +12 Dominion, +6 Heat, +4 Ruin
Accept corp-backed opportunity: +10 Dominion, +2000 Resources, faction debt
```

Comebacks should feel like:

> “I can still survive, but I just sold part of the future.”

That is the Haunted Apex tone.

---

# Recommended action/event tuning for first test

For the first playable prototype, the player should usually experience:

```text
Week 1–2: learning, small gains
Week 3–4: Heat or Resources becomes uncomfortable
Week 5–6: first serious regret from earlier choices
Week 7–8: sprint toward Dominion or desperate stabilization
```

Target first-test win rate:

```text
Experienced designer playing thoughtfully: 50–70%
Random clicking: 10–25%
Cautious play: survives but often fails Dominion target
Aggressive play: can win but often triggers Heat loss
```

That tells you the pressure system is doing work.

---

# Minimal TypeScript content seed

Codex can start from something like this:

```ts
export const ACTIONS = [
  {
    id: "gather_intel",
    label: "Gather Intel",
    commandCost: 1,
    resourceCost: 400,
    effects: { intel: 10, heat: 2 },
    operativeSkill: "subtlety",
    baseRisk: 10,
  },
  {
    id: "run_small_job",
    label: "Run a Small Job",
    commandCost: 1,
    resourceCost: 0,
    effects: { resources: 1400, dominion: 5, heat: 8, loyalty: -2 },
    operativeSkill: "violence",
    baseRisk: 22,
  },
  {
    id: "bribe_official",
    label: "Bribe an Official",
    commandCost: 1,
    resourceCost: 1200,
    effects: { heat: -12, intel: 2, ruin: 1 },
    operativeSkill: "charm",
    baseRisk: 14,
  },
  {
    id: "recruit_operative",
    label: "Recruit an Operative",
    commandCost: 1,
    resourceCost: 1600,
    effects: { loyalty: -4, dominion: 3 },
    baseRisk: 12,
  },
  {
    id: "expand_influence",
    label: "Expand Influence",
    commandCost: 1,
    resourceCost: 900,
    effects: { dominion: 10, heat: 7, loyalty: -3 },
    operativeSkill: "charm",
    baseRisk: 18,
  },
  {
    id: "lay_low",
    label: "Lay Low",
    commandCost: 1,
    resourceCost: 300,
    effects: { heat: -10, loyalty: 4, dominion: -2 },
    baseRisk: 4,
  },
] as const;
```

---

# The prototype’s design thesis

This first version should prove one sentence:

> **The player can win only by becoming dangerous, but becoming dangerous makes the city push back.**

If the numbers create that feeling, they are good enough.

If the player feels like they are merely optimizing meters, add more consequences.

If the player feels randomly punished, make events more conditional.

If the player always chooses the same action, sharpen the tradeoffs.

If the player never uses Lay Low, Heat is too forgiving.

If the player always uses Lay Low, Dominion target is too easy or Heat is too punitive.

If the player ignores Intel, event choices need stronger Intel gates.

If the player ignores operatives, make stress/skill modifiers matter more.

This is enough for Codex to make a playable prototype.
