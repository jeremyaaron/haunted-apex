# v0.4.0: The Black Ledger

## Headline

The Black Ledger adds persistent leverage to Haunted Apex. Runs can now generate Secrets, Debts,
and Favors through targeted intelligence work and event choices, then spend or resolve those entries
through the new Work the Ledger command.

## Player-Facing Changes

- Added the Black Ledger panel with active Secrets, Debts, Favors, and spent/resolved history.
- Added targeted Secret discovery previews to Gather Intel.
- Added Work the Ledger as a command action for using Secrets, settling Debts, and calling Favors.
- Added Ledger consequences to event choice previews and event resolution logs.
- Added Ledger-specific weekly events that reference active entries.
- Expanded run-end reports with Ledger counts and unresolved Debts.
- Expanded the Field Guide with Ledger flow and terminology.

## Simulation and Tuning

- Added Ledger-aware harness agents and Ledger CSV report sections.
- Tuned Favor generation so Favors appear as occasional comeback tools instead of being absent.
- Raised Debt Comes Due weighting so active Debts matter more without becoming automatic losses.
- Preserved the broad v0.3 profile: Operator remains competent, Aggressive and Greedy are volatile,
  Cautious usually loses by tempo, and Random usually loses.

## Final Harness Snapshot

100 runs per agent, seed prefix `PHASE11-TUNED-2`:

```text
agent      winRate  avgEntries  avgSecrets  avgDebts  avgFavors  avgConsumed
random     0.000    2.17        1.27        0.79      0.11       0.41
aggressive 0.380    2.20        0.63        1.13      0.44       0.74
cautious   0.000    2.95        2.46        0.00      0.49       1.20
greedy     0.470    4.71        2.34        1.72      0.65       0.90
operator   0.710    1.80        0.95        0.26      0.59       0.80
```

Operator's average entry count is slightly below the 2-5 texture target because it wins faster and
spends entries aggressively, but the profile is close enough for v0.4.0.

## Validation

- TypeScript app and spec configs pass.
- Full Angular test suite passes.
- Production and GitHub Pages builds pass.
- Documentation link check passes.

## Known Limits

- Rival territory ownership is still fixed.
- The Ledger is local to a run and has no long-term campaign persistence.
- Favors are intentionally sparse and may need more distinct sources in v0.5+.
- The harness is available through the debug panel rather than a permanent command-line script.
