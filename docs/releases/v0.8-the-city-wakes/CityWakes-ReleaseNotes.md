# v0.8.0: The City Wakes

## Headline

The City Wakes turns Haunted Apex runs into campaign-shaped city problems. New runs now assemble
a Campaign Tension, city identity, active content set, starting modifiers, briefing, and harness
reports around a coherent pressure pattern.

## Player-Facing Changes

- Added Campaign Tension selection for Random, Corp Crackdown, Nightlife War, Ghostline Signal,
  Industrial Cut, and Dirty Capital runs.
- Added generated city identity and opening Campaign briefing content.
- Added player-facing starting modifier summaries for pressure, rivals, contacts, and factions.
- Added Campaign panels that distinguish active content in the run from content favored by the
  selected tension.
- Added Campaign-aware run-end summaries and final city notes.
- Added Ghostline Signal's targeted Gather Intel secret-discovery bonus.
- Updated the event feed so Campaign tags render as player-facing labels instead of enum ids.

## Simulation and Tuning

- Added Campaign definitions, deterministic selection, active content assembly, and v0.8 save
  schema support.
- Added Campaign-weighted roster, contact, faction, and Front selection.
- Added Campaign event weighting and campaign-aware harness reporting.
- Updated strategy agents for Campaign context, including OperatorBot handling for Front exposure,
  low Resources, Nightlife contact tempo, and Ghostline Intel/Dominion pacing.
- Tuned Campaign balance so the same core agents remain recognizable while tensions produce
  distinct loss patterns and system usage.

## Final Harness Snapshot

100 random Campaign runs per agent, seed prefix `V08-PHASE14-FINAL-RANDOM`:

```text
agent      winRate  avgWeeks  avgDominion  avgHeat  avgLoyalty  avgResources  avgIntel  avgRuin
random     0.000    7.43      46.66        29.65    61.29       1433.25       43.47     15.10
aggressive 0.340    5.33      87.14        94.89    40.41       2592.20       28.87     15.63
cautious   0.000    7.72      16.84        2.08     94.22       1401.60       29.01     11.81
greedy     0.170    7.54      79.56        79.26    47.03       5429.90       70.11     30.08
operator   0.570    6.69      86.82        81.34    49.44       2774.90       19.19     20.55
```

OperatorBot by Campaign Tension, 100 runs each, seed prefix `V08-PHASE14-FINAL-CAMPAIGN`:

```text
campaign          winRate  avgWeeks  avgDominion  avgHeat  avgLoyalty  avgResources  avgIntel  avgRuin
Corp Crackdown    0.720    7.18      90.03        62.01    67.28       1735.80       15.71     24.66
Nightlife War     0.430    7.15      83.48        83.91    51.72       1822.60       14.79     14.97
Ghostline Signal  0.510    7.03      87.12        89.18    38.36       1984.40       27.77     24.16
Industrial Cut    0.700    7.09      89.85        73.07    48.68       3836.80       20.47     22.50
Dirty Capital     0.750    7.22      90.62        81.60    41.78       2972.90       7.72      18.43
```

Campaign texture from the same run:

```text
Corp Crackdown keeps Heat pressure visible without making OperatorBot brittle.
Nightlife War is the lowest OperatorBot campaign and punishes contact tempo under pressure.
Ghostline Signal produces higher Ruin and Ledger activity with meaningful Heat risk.
Industrial Cut produces high Resources and recurring Heat pressure.
Dirty Capital produces the highest Front and Faction event activity in the final snapshot.
```

## Validation

- TypeScript app and spec configs pass.
- Full Angular test suite passes.
- Standard production build passes.
- GitHub Pages production build with `/haunted-apex/` base href passes.
- Documentation link check passes.
- Campaign smoke script passes.
- Whitespace diff check passes.

## Known Limits

- Campaigns assemble and weight a single eight-week run; there is not yet long-term campaign
  progression between runs.
- Campaign Tensions use authored content pools and weighted selection, not a deep procedural city
  generator.
- The current Campaign roster/contact/front/faction set is intentionally small and will benefit
  from a later lore and content pass.
- Harness balance is informative, not authoritative; player experience may still find some
  Campaign Tensions easier or harder than the agents do.
