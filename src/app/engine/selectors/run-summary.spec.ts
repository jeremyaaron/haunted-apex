import type { ActiveAccordId, FrontState, GameState } from '../model';
import { addLedgerEntry } from '../ledger';
import { newGame } from '../simulation';
import { buildRunSummary, formatRunSummary } from './run-summary';

describe('run summary report', () => {
  it('includes seed, result, week, final pressures, roster, Ledger stats, Front stats, and unresolved debts', () => {
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
    expect(report.fronts.owned).toBe(2);
    expect(report.fronts.established).toBe(1);
    expect(report.fronts.upgrades).toBe(1);
    expect(report.fronts.eventsTriggered).toBe(1);
    expect(report.fronts.resourcesGenerated).toBe(1200);
    expect(report.fronts.dominionGenerated).toBe(3);
    expect(report.fronts.heatDelta).toBe(-3);
    expect(report.fronts.entries.map((front) => front.name)).toEqual([
      'Shell Gallery',
      'The Pale Circuit',
    ]);
    expect(report.factions.active).toBe(4);
    expect(report.factions.brokeredAccords).toBe(1);
    expect(report.factions.activeAccords).toBe(1);
    expect(report.factions.highSuspicion).toBe(1);
    expect(report.factions.highObligation).toBe(1);
    expect(report.factions.eventsTriggered).toBe(1);
    expect(report.factions.entries.find((faction) => faction.name === 'Ashline Bureau')).toEqual(
      jasmine.objectContaining({
        status: 'entangled',
        usedAccords: ['Clean Corridor'],
        activeAccords: ['Clean Corridor'],
        highSuspicion: true,
        highObligation: true,
      }),
    );
    expect(report.majorEvents).toContain('Week 5: Debt Comes Due: Owes the Liaison');
    expect(report.text).toContain('Seed: RUN-SUMMARY-VICTORY');
    expect(report.text).toContain('Unresolved Debts: 1');
    expect(report.text).toContain('Front Network:');
    expect(report.text).toContain('New Fronts Established: 1');
    expect(report.text).toContain('The Pale Circuit: Level 2');
    expect(report.text).toContain('Faction Network:');
    expect(report.text).toContain('Brokered Accords: 1');
    expect(report.text).toContain('Ashline Bureau: Entangled');
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
  const activeAccordId: ActiveAccordId = 'active_accord_ashline_clean_corridor_1';
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
    fronts: buildFronts(withDebt),
    activeAccords: {
      [activeAccordId]: {
        id: activeAccordId,
        definitionId: 'accord_ashline_clean_corridor',
        factionId: 'faction_ashline_bureau',
        startedWeek: 4,
        remainingWeeks: 1,
        firstWeeklyEffectWeek: 5,
        source: {
          type: 'broker_accord',
        },
      },
    },
    factions: {
      ...withDebt.factions,
      faction_ashline_bureau: {
        ...withDebt.factions.faction_ashline_bureau!,
        standing: 72,
        suspicion: 74,
        obligation: 76,
        usedAccordIds: ['accord_ashline_clean_corridor'],
        activeAccordIds: [activeAccordId],
      },
    },
    eventLog: [
      ...withDebt.eventLog,
      {
        id: 'log_major_event',
        week: 5,
        type: 'event_presented',
        title: 'Debt Comes Due: Owes the Liaison',
      },
      {
        id: 'log_front_event',
        week: 5,
        type: 'event_presented',
        title: 'Front Inspection: Shell Gallery',
        tags: ['FRONT', 'HEAT'],
      },
      {
        id: 'log_faction_event',
        week: 5,
        type: 'event_presented',
        title: 'Faction Audit: Ashline Bureau',
        tags: ['FACTION', 'HEAT'],
      },
    ],
  };
}

function buildFronts(state: GameState): GameState['fronts'] {
  const paleCircuit = state.fronts.front_pale_circuit;
  const shellGallery: FrontState = {
    id: 'front_shell_gallery',
    definitionId: 'front_shell_gallery',
    districtId: 'district_violet_ward',
    venueId: 'venue_glass_saint',
    relatedRivalId: 'rival_nyx_ardent',
    level: 1,
    exposure: 36,
    establishedWeek: 3,
    compromised: false,
    active: true,
    flags: {},
    yieldHistory: [
      {
        week: 4,
        effects: {
          resources: 300,
          heat: -2,
        },
        exposureDelta: 2,
      },
    ],
  };

  return {
    ...state.fronts,
    front_pale_circuit: paleCircuit
      ? {
          ...paleCircuit,
          level: 2,
          exposure: 28,
          yieldHistory: [
            {
              week: 4,
              effects: {
                resources: 500,
                loyalty: 2,
                dominion: 1,
              },
              exposureDelta: 3,
            },
            {
              week: 5,
              effects: {
                resources: 400,
                loyalty: 2,
                dominion: 2,
                heat: -1,
              },
              exposureDelta: 3,
            },
          ],
        }
      : paleCircuit,
    front_shell_gallery: shellGallery,
  };
}
