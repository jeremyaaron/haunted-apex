import type { GameState } from '../model';
import { addLedgerEntry } from '../ledger';
import { newGame } from '../simulation';
import { buildRunSummary, formatRunSummary } from './run-summary';

describe('run summary report', () => {
  it('includes seed, result, week, final pressures, roster, Ledger stats, and unresolved debts', () => {
    const state = buildCompletedState('victory');
    const report = buildRunSummary(state);

    expect(report.seed).toBe('RUN-SUMMARY-VICTORY');
    expect(report.result).toBe('victory');
    expect(report.reason).toBe('dominion_victory');
    expect(report.endedWeek).toBe(6);
    expect(report.finalPressures.dominion).toBe(91);
    expect(report.startingRoster.length).toBe(3);
    expect(report.finalRoster.length).toBe(state.operatives.length);
    expect(report.mostAssignedOperative?.assignments).toBeGreaterThan(0);
    expect(report.mvpOperative?.name).toBe(report.mostAssignedOperative?.name);
    expect(report.mostDangerousRival?.name).toBe('Nyx Ardent');
    expect(report.ledger.created).toBe(2);
    expect(report.ledger.consumed).toBe(1);
    expect(report.ledger.unresolvedDebts).toBe(1);
    expect(report.majorEvents).toContain('Week 5: Debt Comes Due: Owes the Liaison');
    expect(report.text).toContain('Seed: RUN-SUMMARY-VICTORY');
    expect(report.text).toContain('Unresolved Debts: 1');
  });

  it('formats deterministic report text for a fixed final state', () => {
    const report = buildRunSummary(buildCompletedState('victory'));

    expect(formatRunSummary(report)).toBe(report.text);
    expect(buildRunSummary(buildCompletedState('victory')).text).toBe(report.text);
  });

  it('builds loss summaries with a loss epitaph', () => {
    const report = buildRunSummary(buildCompletedState('loss'));

    expect(report.result).toBe('loss');
    expect(report.reason).toBe('heat_lockdown');
    expect(report.epitaph).toContain('city looked back');
    expect(report.text).toContain('Result: Loss (Heat Lockdown)');
  });
});

function buildCompletedState(result: 'victory' | 'loss'): GameState {
  const base = newGame({ seed: `RUN-SUMMARY-${result.toUpperCase()}` });
  const withSecret = addLedgerEntry(base, {
    definitionId: 'secret_dead_channel_trace',
    source: {
      type: 'action',
      actionId: 'gather_intel',
    },
  });
  const withDebt = addLedgerEntry(withSecret, {
    definitionId: 'debt_owes_liaison',
    source: {
      type: 'event',
      eventId: 'liaison_favor',
      choiceId: 'accept_the_favor',
    },
  });
  const consumedSecret = withDebt.ledger.entries[0];

  return {
    ...withDebt,
    week: result === 'victory' ? 6 : 4,
    phase: 'GAME_OVER',
    gameOver:
      result === 'victory'
        ? {
            result: 'victory',
            reason: 'dominion_victory',
          }
        : {
            result: 'loss',
            reason: 'heat_lockdown',
          },
    pressures:
      result === 'victory'
        ? {
            dominion: 91,
            heat: 48,
            loyalty: 55,
            resources: 2100,
            intel: 22,
            ruin: 12,
          }
        : {
            dominion: 42,
            heat: 100,
            loyalty: 44,
            resources: 900,
            intel: 9,
            ruin: 18,
          },
    operatives: withDebt.operatives.map((operative, index) => ({
      ...operative,
      stress: index === 0 ? 24 : operative.stress,
      weeksAssigned: index === 0 ? 3 : index === 1 ? 1 : 0,
    })),
    rivals: {
      ...withDebt.rivals,
      rival_nyx_ardent: {
        ...withDebt.rivals.rival_nyx_ardent,
        pressure: 64,
      },
      rival_knox_marrow: {
        ...withDebt.rivals.rival_knox_marrow,
        pressure: 28,
      },
    },
    ledger: {
      ...withDebt.ledger,
      entries: withDebt.ledger.entries.map((entry) =>
        entry.id === consumedSecret.id
          ? {
              ...entry,
              consumed: true,
              consumedWeek: 5,
              consumedBy: {
                type: 'action',
                actionId: 'work_the_ledger',
                useOptionId: 'open_dead_channel',
              },
            }
          : entry,
      ),
      consumedCount: 1,
    },
    eventLog: [
      ...withDebt.eventLog,
      {
        id: 'log_major_event',
        week: 5,
        type: 'event_presented',
        title: 'Debt Comes Due: Owes the Liaison',
      },
    ],
  };
}
