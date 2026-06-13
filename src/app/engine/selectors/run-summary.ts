import {
  getFrontDefinition,
  getLedgerEntryDefinition,
  getOperativeDefinition,
  getRivalDefinition,
} from '../content';
import { deriveFrontStatus } from '../fronts';
import type {
  FrontId,
  FrontStatus,
  GameLogEntry,
  GameOverState,
  GameState,
  LedgerEntry,
  LedgerEntryKind,
  OperativeId,
  Pressures,
  RivalId,
} from '../model';
import { PRESSURE_IDS } from '../model';
import { generateRoster } from '../roster';

export type RunSummaryOperative = {
  id: OperativeId;
  name: string;
  archetype: string;
  assignments: number;
  finalStress?: number;
};

export type RunSummaryRival = {
  id: RivalId;
  name: string;
  pressure: number;
};

export type RunSummaryLedgerEntry = {
  id: string;
  kind: LedgerEntryKind;
  name: string;
  status: 'active' | 'spent' | 'resolved';
  createdWeek: number;
  consumedWeek?: number;
};

export type RunSummaryFront = {
  id: FrontId;
  name: string;
  level: number;
  status: FrontStatus;
  exposure: number;
  establishedWeek: number;
  weeklyYieldTotals: Partial<Pressures>;
};

export type RunSummaryReport = {
  title: string;
  seed: string;
  result: GameOverState['result'];
  reason: GameOverState['reason'];
  endedWeek: number;
  finalPressures: Pressures;
  startingRoster: RunSummaryOperative[];
  finalRoster: RunSummaryOperative[];
  mostAssignedOperative?: RunSummaryOperative;
  mvpOperative?: RunSummaryOperative;
  mostDangerousRival?: RunSummaryRival;
  ledger: {
    created: number;
    consumed: number;
    activeSecrets: number;
    unresolvedDebts: number;
    activeFavors: number;
    entries: RunSummaryLedgerEntry[];
  };
  fronts: {
    owned: number;
    established: number;
    upgrades: number;
    eventsTriggered: number;
    resourcesGenerated: number;
    dominionGenerated: number;
    heatDelta: number;
    averageFinalExposure: number;
    entries: RunSummaryFront[];
  };
  majorEvents: string[];
  epitaph: string;
  text: string;
};

export function buildRunSummary(state: GameState): RunSummaryReport {
  const gameOver = state.gameOver ?? {
    result: 'loss' as const,
    reason: 'out_of_time' as const,
  };
  const startingRoster = generateRoster(state.seed).startingOperativeIds.map((operativeId) =>
    toOperativeSummary(state, operativeId),
  );
  const finalRoster = state.operatives.map((operative) => toOperativeSummary(state, operative.id));
  const mostAssignedOperative = selectMostAssigned(finalRoster);
  const mvpOperative = selectMvp(finalRoster);
  const ledgerEntries = state.ledger.entries.map(toLedgerReportEntry);
  const frontSummary = buildFrontSummary(state);
  const reportWithoutText = {
    title: `Haunted Apex Run Report - ${formatResult(gameOver.result)}`,
    seed: state.seed,
    result: gameOver.result,
    reason: gameOver.reason,
    endedWeek: state.week,
    finalPressures: { ...state.pressures },
    startingRoster,
    finalRoster,
    mostAssignedOperative,
    mvpOperative,
    mostDangerousRival: selectMostDangerousRival(state),
    ledger: {
      created: state.ledger.entries.length,
      consumed: state.ledger.entries.filter((entry) => entry.consumed).length,
      activeSecrets: countActiveLedgerKind(state, 'secret'),
      unresolvedDebts: countActiveLedgerKind(state, 'debt'),
      activeFavors: countActiveLedgerKind(state, 'favor'),
      entries: ledgerEntries,
    },
    fronts: frontSummary,
    majorEvents: selectMajorEvents(state),
    epitaph: selectEpitaph(state, gameOver),
  };
  const text = formatRunSummary(reportWithoutText);

  return {
    ...reportWithoutText,
    text,
  };
}

export function formatRunSummary(
  report: Omit<RunSummaryReport, 'text'> | RunSummaryReport,
): string {
  const lines = [
    report.title,
    '',
    `Result: ${formatResult(report.result)} (${formatToken(report.reason)})`,
    `Ended Week: ${report.endedWeek}`,
    `Seed: ${report.seed}`,
    '',
    'Final Pressures:',
    ...PRESSURE_IDS.map((id) => `- ${formatToken(id)}: ${report.finalPressures[id]}`),
    '',
    `Starting Roster: ${formatOperativeList(report.startingRoster)}`,
    `Final Roster: ${formatOperativeList(report.finalRoster)}`,
    `Most Assigned: ${formatOperative(report.mostAssignedOperative)}`,
    `MVP: ${formatOperative(report.mvpOperative)}`,
    `Most Dangerous Rival: ${formatRival(report.mostDangerousRival)}`,
    '',
    'Black Ledger:',
    `- Entries Gained: ${report.ledger.created}`,
    `- Entries Consumed/Resolved: ${report.ledger.consumed}`,
    `- Active Secrets: ${report.ledger.activeSecrets}`,
    `- Unresolved Debts: ${report.ledger.unresolvedDebts}`,
    `- Active Favors: ${report.ledger.activeFavors}`,
    ...formatLedgerEntries(report.ledger.entries),
    '',
    'Front Network:',
    `- Owned Fronts: ${report.fronts.owned}`,
    `- New Fronts Established: ${report.fronts.established}`,
    `- Upgrades: ${report.fronts.upgrades}`,
    `- Front Events Triggered: ${report.fronts.eventsTriggered}`,
    `- Resources From Fronts: ${report.fronts.resourcesGenerated}`,
    `- Dominion From Fronts: ${report.fronts.dominionGenerated}`,
    `- Heat Delta From Fronts: ${formatSigned(report.fronts.heatDelta)}`,
    `- Average Final Exposure: ${report.fronts.averageFinalExposure.toFixed(1)}`,
    ...formatFrontEntries(report.fronts.entries),
    '',
    'Major Events:',
    ...formatMajorEvents(report.majorEvents),
    '',
    `Epitaph: ${report.epitaph}`,
  ];

  return lines.join('\n');
}

function toOperativeSummary(
  state: GameState,
  operativeId: OperativeId,
): RunSummaryOperative {
  const definition = getOperativeDefinition(operativeId);
  const operative = state.operatives.find((candidate) => candidate.id === operativeId);

  return {
    id: operativeId,
    name: definition?.name ?? operativeId,
    archetype: definition?.archetype ?? 'Unknown',
    assignments: operative?.weeksAssigned ?? 0,
    finalStress: operative?.stress,
  };
}

function selectMostAssigned(
  operatives: readonly RunSummaryOperative[],
): RunSummaryOperative | undefined {
  return [...operatives].sort(compareOperativesByAssignment)[0];
}

function selectMvp(
  operatives: readonly RunSummaryOperative[],
): RunSummaryOperative | undefined {
  return selectMostAssigned(operatives);
}

function compareOperativesByAssignment(
  left: RunSummaryOperative,
  right: RunSummaryOperative,
): number {
  return (
    right.assignments - left.assignments ||
    (left.finalStress ?? 999) - (right.finalStress ?? 999) ||
    left.name.localeCompare(right.name)
  );
}

function selectMostDangerousRival(state: GameState): RunSummaryRival | undefined {
  return Object.values(state.rivals)
    .map((rival) => ({
      id: rival.id,
      name: getRivalDefinition(rival.id)?.name ?? rival.id,
      pressure: rival.pressure,
    }))
    .sort((left, right) => right.pressure - left.pressure || left.name.localeCompare(right.name))[0];
}

function countActiveLedgerKind(state: GameState, kind: LedgerEntryKind): number {
  return state.ledger.entries.filter((entry) => entry.kind === kind && !entry.consumed).length;
}

function toLedgerReportEntry(entry: LedgerEntry): RunSummaryLedgerEntry {
  const definition = getLedgerEntryDefinition(entry.definitionId);

  return {
    id: entry.id,
    kind: entry.kind,
    name: definition?.name ?? entry.definitionId,
    status: getLedgerStatus(entry),
    createdWeek: entry.createdWeek,
    consumedWeek: entry.consumedWeek,
  };
}

function getLedgerStatus(entry: LedgerEntry): RunSummaryLedgerEntry['status'] {
  if (!entry.consumed) {
    return 'active';
  }

  return entry.kind === 'debt' ? 'resolved' : 'spent';
}

function buildFrontSummary(state: GameState): RunSummaryReport['fronts'] {
  const fronts = Object.values(state.fronts)
    .filter((front) => front?.active)
    .map((front) => {
      const weeklyYieldTotals = sumYieldHistory(front.yieldHistory);

      return {
        id: front.id,
        name: getFrontDefinition(front.definitionId)?.name ?? front.definitionId,
        level: front.level,
        status: deriveFrontStatus(front.exposure),
        exposure: front.exposure,
        establishedWeek: front.establishedWeek,
        weeklyYieldTotals,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  const totals = fronts.reduce(
    (summary, front) => ({
      resourcesGenerated:
        summary.resourcesGenerated + (front.weeklyYieldTotals.resources ?? 0),
      dominionGenerated:
        summary.dominionGenerated + (front.weeklyYieldTotals.dominion ?? 0),
      heatDelta: summary.heatDelta + (front.weeklyYieldTotals.heat ?? 0),
      exposure: summary.exposure + front.exposure,
    }),
    {
      resourcesGenerated: 0,
      dominionGenerated: 0,
      heatDelta: 0,
      exposure: 0,
    },
  );

  return {
    owned: fronts.length,
    established: fronts.filter((front) => front.establishedWeek > 1).length,
    upgrades: fronts.reduce((sum, front) => sum + Math.max(0, front.level - 1), 0),
    eventsTriggered: state.eventLog.filter(
      (entry) => entry.type === 'event_presented' && entry.tags?.includes('FRONT'),
    ).length,
    resourcesGenerated: totals.resourcesGenerated,
    dominionGenerated: totals.dominionGenerated,
    heatDelta: totals.heatDelta,
    averageFinalExposure: fronts.length > 0 ? totals.exposure / fronts.length : 0,
    entries: fronts,
  };
}

function sumYieldHistory(
  yieldHistory: readonly { effects: Partial<Pressures> }[],
): Partial<Pressures> {
  return yieldHistory.reduce(
    (totals, entry) => {
      for (const pressure of PRESSURE_IDS) {
        const value = entry.effects[pressure];

        if (value !== undefined) {
          totals[pressure] = (totals[pressure] ?? 0) + value;
        }
      }

      return totals;
    },
    {} as Partial<Pressures>,
  );
}

function selectMajorEvents(state: GameState): string[] {
  const majorTypes = new Set<GameLogEntry['type']>([
    'event_presented',
    'event_choice',
    'ledger',
    'accord',
    'complication',
    'rival_effect',
    'win_loss',
  ]);

  return state.eventLog
    .filter((entry) => majorTypes.has(entry.type))
    .slice(-8)
    .map((entry) => `Week ${entry.week}: ${entry.title}`);
}

function selectEpitaph(state: GameState, gameOver: GameOverState): string {
  if (gameOver.result === 'victory') {
    if (state.ledger.entries.some((entry) => !entry.consumed && entry.kind === 'debt')) {
      return 'The district bowed, but the Ledger still had teeth.';
    }

    return 'Dominion came wrapped in static and signed in neon.';
  }

  switch (gameOver.reason) {
    case 'heat_lockdown':
      return 'The city looked back too long, and every door learned your name.';
    case 'loyalty_collapse':
      return 'The room emptied before the crown arrived.';
    case 'bankrupt':
      return 'The signal died under unpaid lights.';
    case 'out_of_time':
      return 'The window closed with Dominion still out of reach.';
    case 'dominion_victory':
      return 'Dominion came wrapped in static and signed in neon.';
  }
}

function formatLedgerEntries(entries: readonly RunSummaryLedgerEntry[]): string[] {
  if (entries.length === 0) {
    return ['- Entries: None'];
  }

  return [
    '- Entries:',
    ...entries.map(
      (entry) =>
        `  - ${formatToken(entry.kind)}: ${entry.name} (${formatToken(entry.status)}, Week ${
          entry.createdWeek
        })`,
    ),
  ];
}

function formatFrontEntries(entries: readonly RunSummaryFront[]): string[] {
  if (entries.length === 0) {
    return ['- Fronts: None'];
  }

  return [
    '- Fronts:',
    ...entries.map(
      (front) =>
        `  - ${front.name}: Level ${front.level}, ${formatToken(front.status)}, Exposure ${
          front.exposure
        }, Week ${front.establishedWeek}`,
    ),
  ];
}

function formatMajorEvents(events: readonly string[]): string[] {
  return events.length > 0 ? events.map((event) => `- ${event}`) : ['- None'];
}

function formatOperativeList(operatives: readonly RunSummaryOperative[]): string {
  return operatives.map((operative) => operative.name).join(', ') || 'None';
}

function formatOperative(operative: RunSummaryOperative | undefined): string {
  return operative
    ? `${operative.name} (${operative.assignments} assignments)`
    : 'None';
}

function formatRival(rival: RunSummaryRival | undefined): string {
  return rival ? `${rival.name} (${rival.pressure} Pressure)` : 'None';
}

function formatResult(result: GameOverState['result']): string {
  return result === 'victory' ? 'Victory' : 'Loss';
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatToken(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
