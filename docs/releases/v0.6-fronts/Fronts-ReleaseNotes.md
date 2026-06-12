# v0.6.0: Fronts

## Headline

Fronts adds owned infrastructure to Haunted Apex. Runs now begin with The Pale Circuit as an
active operation, then offer new opportunities to establish, upgrade, profit from, and cool exposed
Fronts across the city.

## Player-Facing Changes

- Added the Front Network panel with owned Fronts and available openings.
- Added Front Level, Exposure, status, weekly yield, location, rival context, and role tags.
- Added Invest in Front as a command action for establishing new Fronts and upgrading owned ones.
- Added Front-targeted Lay Low to cool Exposure on a specific owned operation.
- Added weekly Front yields for Resources, Dominion, Loyalty, Intel, Heat movement, district
  Control, and rival pressure where appropriate.
- Added Front-specific weekly events that reference the selected owned Front.
- Added Front outcomes to run-end reporting.
- Expanded the Field Guide with Front terminology, weekly flow, Exposure, and Lay Low behavior.
- Refined Available Front exposure wording so establish previews show starting Exposure directly.

## Simulation and Tuning

- Added Front-aware harness reporting for ownership, establishments, upgrades, yields, Exposure
  bands, events, opportunity sets, and Front outcomes.
- Updated Random, Aggressive, Cautious, Greedy, and Operator agents so they can evaluate Front
  investments and Front-targeted cooling.
- Tuned Front costs, yields, Exposure, and agent scoring so Fronts are useful without becoming a
  mandatory purchase path.
- Made Zero Mercy Cut the most profitable and dangerous high-risk Front, with higher Heat,
  Exposure, and Knox pressure.
- Reduced automatic upgrade value so upgrades are a commitment instead of a default move.

## Final Harness Snapshot

100 runs per agent, seed prefix `PHASE12-FINAL`:

```text
agent      winRate  avgWeeks  avgDominion  avgHeat  avgLoyalty  avgResources  avgIntel  avgRuin
random     0.000    6.81      47.81        31.16    61.34       1144.50       48.21     16.44
aggressive 0.320    5.30      84.92        95.99    40.61       2645.00       26.08     12.40
cautious   0.000    8.00      23.17        1.13     95.30       1554.60       34.78     11.36
greedy     0.290    7.43      83.93        80.47    45.90       4757.10       82.47     33.00
operator   0.710    6.82      90.58        81.70    48.54       1664.90       14.79     19.02
```

Front summary from the same run:

```text
agent      avgOwnedFronts  avgEstablishedFronts  avgUpgrades  avgLayLowOrders  avgYieldResources  avgFinalExposure  avgFrontEvents
random     1.79            0.79                  0.25         0.10             2590.00            31.38             0.17
aggressive 1.93            0.93                  0.60         0.66             3520.50            47.01             0.25
cautious   2.00            1.00                  0.00         0.00             2480.00            31.21             0.09
greedy     2.05            1.05                  0.54         0.00             5265.00            56.60             0.38
operator   1.94            0.94                  0.00         0.59             4001.50            45.58             0.32
```

## Validation

- TypeScript app and spec configs pass.
- Full Angular test suite passes.
- Standard production build passes.
- GitHub Pages production build with `/haunted-apex/` base href passes.
- Documentation link check passes.
- Whitespace diff check passes.

## Known Limits

- Fronts are local to the current eight-week run and do not yet form a long-term campaign layer.
- Front opportunities are seeded and authored rather than generated from a full economy sim.
- Venue and Front names sometimes intentionally overlap but remain separate model concepts.
- Front events use the normal weekly event slot and are still sparse in current harness samples.
- Random remains below the aspirational win-rate target; the game was not globally softened just
  to make naive random play win more often.
