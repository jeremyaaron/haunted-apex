# v0.7.0: The Accords

## Headline

The Accords adds institutional power to Haunted Apex. Runs now include active Factions with
Standing, Suspicion, and Obligation, letting you broker short-term advantages from city powers
while accepting political debt and scrutiny.

## Player-Facing Changes

- Added the Faction Network panel with active Factions, roles, related city entities, available
  Accords, active Accord timers, and recent interactions.
- Added Broker Accord as a command action for cutting temporary deals with active Factions.
- Added Accord previews for costs, immediate effects, weekly effects, Faction consequences, rival
  pressure, Ledger hooks, and Front hooks.
- Added active Accord weekly ticks and expiration behavior.
- Added Faction-linked Ledger entries and Ledger use effects.
- Added Faction weekly events tied to Standing, Suspicion, Obligation, active Accords, and related
  rival pressure.
- Added Faction and Accord outcomes to run-end reporting and harness output.
- Expanded the Field Guide with Faction, Accord, Standing, Suspicion, Obligation, and weekly-flow
  explanations.

## Simulation and Tuning

- Added Faction-aware harness reporting for Accord use, active Accord pressure, Faction outcomes,
  Faction events, and active Faction sets.
- Updated Random, Aggressive, Cautious, Greedy, and Operator agents so they can evaluate Broker
  Accord targets.
- Tuned Accord costs, yields, Faction consequences, and agent scoring so Accords are useful
  without becoming a mandatory two-order sequence.
- Increased Obligation and Suspicion consequences on high-value Accords so relying on institutions
  creates visible political pressure.
- Added agent brakes against chaining multiple Broker Accords in the same command week.

## Final Harness Snapshot

100 runs per agent, seed prefix `V07-PHASE13-FINAL`:

```text
agent      winRate  avgWeeks  avgDominion  avgHeat  avgLoyalty  avgResources  avgIntel  avgRuin
random     0.000    6.89      46.43        26.35    59.87       1214.75       44.60     15.42
aggressive 0.440    5.61      89.14        93.96    41.47       2001.90       32.56     13.40
cautious   0.000    8.00      23.60        0.85     95.24       1596.80       25.86     11.98
greedy     0.260    7.37      84.44        81.66    40.70       6018.00       77.88     32.86
operator   0.600    7.20      88.93        80.42    47.04       1652.80       11.40     18.75
```

Accord and Faction summary from the same run:

```text
agent      avgBrokerAccordUses  avgUsedAccords  avgMaxActiveAccords  avgActiveAccordsAtEnd  avgHighSuspicionFactions  avgHighObligationFactions  avgFactionEvents
random     1.58                 1.58            1.08                 0.54                   0.00                      0.13                       0.17
aggressive 1.57                 1.57            1.53                 0.04                   0.00                      0.02                       0.21
cautious   1.00                 1.00            1.00                 0.00                   0.00                      0.00                       0.14
greedy     1.52                 1.52            1.52                 0.01                   0.00                      0.00                       0.17
operator   1.68                 1.68            1.27                 0.28                   0.00                      0.00                       0.28
```

## Validation

- TypeScript app and spec configs pass.
- Full Angular test suite passes.
- Standard production build passes.
- GitHub Pages production build with `/haunted-apex/` base href passes.
- Documentation link check passes.
- Whitespace diff check passes.

## Known Limits

- Factions are local to the current eight-week run and do not yet form a long-term campaign layer.
- Accords are authored deals rather than negotiated diplomacy.
- High Obligation appears in some harness runs but remains rare; future versions may need more
  demand hooks if Factions should feel more politically dangerous.
- Faction events use the normal weekly event slot and are still sparse in current harness samples.
- The debug panel remains hidden behind the existing keyboard shortcut and is not part of normal
  play.
