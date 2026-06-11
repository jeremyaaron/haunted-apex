# v0.5.0: Entanglements

## Headline

Entanglements adds active outside Contacts to Haunted Apex. Runs now include a small network
of fixers, patrons, operators, and liabilities who can be cultivated, pressured, or asked for
specific services.

## Player-Facing Changes

- Added the Contact Network panel with three active Contacts per run.
- Added Trust, Leverage, Volatility, Exposure, status labels, services, related Ledger links,
  and recent interaction history to Contact cards.
- Added Manage Contact as a command action for Cultivate, Pressure, and Contact-specific services.
- Added rich Contact previews showing costs, Contact metric changes, rival pressure, Ledger
  entries, and command outcomes before orders are queued.
- Added Contact-linked Ledger entries and Ledger use effects.
- Added Contact-aware weekly events and event choice previews.
- Added Contact burn consequences for relationships pushed too far.
- Expanded the Field Guide with Entanglements flow and terminology.
- Expanded run-end reporting with Contact outcomes.

## Simulation and Tuning

- Added Contact-aware harness reporting for usage, outcomes, events, Ledger links, and active
  Contact sets.
- Updated Random, Aggressive, Cautious, Greedy, and Operator agents so they can evaluate Contact
  options.
- Tuned Contact burn thresholds and agent penalties so repeat pressure is useful but volatile.
- Preserved the broad v0.4 balance profile: Random and Cautious usually lose, Aggressive and
  Greedy can win but carry risk, and Operator remains the most reliable strategy.

## Final Harness Snapshot

100 runs per agent, seed prefix `V05-PHASE11-FINAL`:

```text
agent      winRate  avgWeeks  avgDominion  avgHeat  avgLoyalty  avgResources  avgIntel  avgRuin
random     0.000    5.61      40.24        25.71    53.12       317.30        43.82     12.22
aggressive 0.540    5.20      90.74        89.99    34.71       3015.00       27.48     13.05
cautious   0.000    7.84      25.41        0.93     80.56       1222.20       37.24     12.61
greedy     0.450    7.64      88.32        75.20    22.65       4850.10       87.29     40.25
operator   0.530    6.00      88.46        78.07    50.36       941.80        15.76     20.05
```

Contact summary from the same run:

```text
agent      avgManageContactUses  avgBurnedContacts  avgFinalTrust  avgFinalLeverage  avgFinalVolatility  avgFinalExposure
random     1.90                  0.00               40.09          21.27             49.68               35.43
aggressive 1.32                  0.00               38.58          18.39             49.09               36.29
cautious   0.32                  0.00               40.13          19.29             47.73               35.81
greedy     0.88                  0.00               37.93          19.81             50.62               36.68
operator   2.09                  0.00               38.35          19.65             49.34               38.22
```

## Validation

- TypeScript app and spec configs pass.
- Full Angular test suite passes.
- Standard production build passes.
- GitHub Pages production build with `/haunted-apex/` base href passes.
- Documentation link check passes.

## Known Limits

- Contacts are local to a run and do not persist into a long-term campaign layer.
- Contacts do not yet include dialogue trees, romance, faction diplomacy, or procedural NPC sim.
- Burned Contacts are possible and covered by tests, but remain rare in current harness samples.
- Random remains below the aspirational win-rate target; the game was not globally softened just
  to make naive random play win more often.
