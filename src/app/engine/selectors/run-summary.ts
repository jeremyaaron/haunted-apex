import {
  getLedgerEntryDefinition,
  getOperativeDefinition,
  getRivalDefinition,
} from '../content';
import type {
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

function selectMajorEvents(state: GameState): string[] {
  const majorTypes = new Set<GameLogEntry['type']>([
    'event_presented',
    'event_choice',
    'ledger',
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

function formatToken(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
