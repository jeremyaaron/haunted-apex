import {
  ACCORD_DEFINITIONS,
  CAMPAIGN_TENSION_DEFINITIONS,
  DISTRICT_ZERO_ACTIONS,
  FACTION_DEFINITIONS,
  FRONT_DEFINITIONS,
  getActionDefinition,
  ROSTER_OPERATIVES,
  RIVAL_TERRITORY_DISTRICTS,
  RIVAL_TERRITORY_RIVALS,
  getAccordDefinition,
  getDistrictDefinition,
  getContactDefinition,
  getEventDefinition,
  getFactionDefinition,
  getFrontDefinition,
  getLedgerEntryDefinition,
  getOperativeDefinition,
  getRivalDefinition,
  getVenueDefinition,
} from '../content';
import {
  selectLegalEventChoiceOptions,
  selectLegalOrderOptions,
  type AdvisorConfidence,
} from '../advisor';
import type {
  AnalyticsRunReportInput,
  CommandPairReport,
  CommandUsageReport,
  LoopWarningReport,
  PressureAttributionEntry,
  RunTelemetry,
  SourceBreakdownReport,
  StrategicFingerprintReport,
  StrategicSystemId,
  SystemEngagementReport,
  TelemetryEntry,
  PressureChangeSourceKind,
} from '../analytics';
import {
  buildCommandPairReports,
  buildCommandUsageReports,
  buildLoopWarningReports,
  buildSourceBreakdownReports,
  buildStrategicFingerprintReports,
  buildSystemEngagementReports,
} from '../analytics';
import { deriveFactionStatus } from '../factions';
import { deriveFrontStatus } from '../fronts';
import type {
  AccordId,
  ActionId,
  ActionTarget,
  CampaignTensionId,
  ContactId,
  ContactOptionKind,
  DistrictId,
  EventChoiceDefinition,
  EventId,
  FactionId,
  FactionStatus,
  FrontDefinitionId,
  GameLogEntry,
  GameOverReason,
  GameState,
  LedgerEntryDefinitionId,
  LedgerEntryKind,
  OperativeId,
  PressureDelta,
  PressureId,
  Pressures,
  RivalId,
  RunMode,
  StressTier,
  VenueId,
} from '../model';
import { PRESSURE_IDS } from '../model';
import { createRng, nextInt } from '../rng';
import { getStressTier } from '../roster';
import { getCommandPointsRemaining } from '../selectors';
import {
  advanceWeek,
  newGame,
  queueOrder,
  resolveEventChoice,
  type EventSelection,
  type OrderResolutionDiagnostic,
  type WeightedEvent,
} from '../simulation';
import {
  createEmptyActionUsage,
  chooseHandlerEventChoice,
  chooseHandlerOrder,
  type AgentDecisionContext,
  type LegalEventChoiceOption,
  type LegalOrderOption,
  type StrategyAgent,
} from './agents';

export type HarnessRunOptions = {
  seed: string;
  agent: StrategyAgent;
  campaignTensionId?: CampaignTensionId;
  runMode?: RunMode;
  collectTrace?: boolean;
};

export type HarnessTraceEntry = {
  week: number;
  phase: GameState['phase'];
  message: string;
};

export type HarnessRunResult = {
  agentId: string;
  agentLabel: string;
  seed: string;
  finalState: GameState;
  outcome: 'victory' | 'loss' | 'incomplete';
  reason?: HarnessFailureReason;
  weeksPlayed: number;
  actionUsage: Record<ActionId, number>;
  targetUsage: Record<string, TargetRunStats>;
  eventChoiceUsage: Record<string, number>;
  contextualEvents: ContextualEventCounts;
  startingRosterIds: OperativeId[];
  initialHirePoolIds: OperativeId[];
  operativeStats: Record<OperativeId, OperativeRunStats>;
  operativeEventStats: Partial<Record<EventId, OperativeEventRunStats>>;
  ledgerStats: LedgerRunStats;
  contactStats: ContactRunStats;
  frontStats: FrontRunStats;
  factionStats: FactionRunStats;
  handlerStats?: HandlerRunStats;
  telemetry: RunTelemetry;
  trace: HarnessTraceEntry[];
};

export type HarnessFailureReason =
  | GameOverReason
  | 'agent_stalled'
  | 'invalid_recommendation'
  | 'softlock';

type AnalyticsReportSet = {
  strategicFingerprintReports: StrategicFingerprintReport[];
  commandUsageReports: CommandUsageReport[];
  commandPairReports: CommandPairReport[];
  sourceBreakdownReports: SourceBreakdownReport[];
  systemEngagementReports: SystemEngagementReport[];
  loopWarnings: LoopWarningReport[];
};

export type HarnessBatchOptions = {
  agents: readonly StrategyAgent[];
  runsPerAgent: number;
  seedPrefix?: string;
  campaignTensionId?: CampaignTensionId;
  campaignTensionIds?: readonly CampaignTensionId[];
  runMode?: RunMode;
};

export type AgentBatchSummary = {
  agentId: string;
  agentLabel: string;
  runs: number;
  wins: number;
  losses: number;
  incomplete: number;
  winRate: number;
  averageWeeksPlayed: number;
  averageFinalPressures: Pressures;
  lossReasons: Partial<Record<HarnessFailureReason, number>>;
  actionUsage: Record<ActionId, number>;
  targetReports: TargetReport[];
  mostSelectedTarget?: TargetReport;
  mostDangerousTarget?: TargetReport;
  eventChoiceUsage: Record<string, number>;
  averageFinalRivalPressures: Record<RivalId, number>;
  averageFinalDistricts: Record<DistrictId, DistrictAverage>;
  contextualEvents: ContextualEventCounts;
  rosterCompositionReports: RosterCompositionReport[];
  operativePresenceReports: OperativePresenceReport[];
  operativeRecruitmentReports: OperativeRecruitmentReport[];
  operativeUsageReports: OperativeUsageReport[];
  operativeStressReports: OperativeStressReport[];
  operativeDangerReports: OperativeDangerReport[];
  operativeEventReports: OperativeEventReport[];
  hirePoolSelectionReports: HirePoolSelectionReport[];
  ledgerSummary: LedgerSummaryReport;
  ledgerUsageReports: LedgerUsageReport[];
  ledgerOutcomeReports: LedgerOutcomeReport[];
  secretDiscoveryReport: SecretDiscoveryReport;
  ledgerEventReports: LedgerEventReport[];
  contactSummary: ContactSummaryReport;
  contactUsageReports: ContactUsageReport[];
  contactOutcomeReports: ContactOutcomeReport[];
  contactEventReports: ContactEventReport[];
  contactLedgerReports: ContactLedgerReport[];
  contactSetReports: ContactSetReport[];
  frontSummary: FrontSummaryReport;
  frontOutcomeReports: FrontOutcomeReport[];
  frontEventReports: FrontEventReport[];
  frontOpportunitySetReports: FrontOpportunitySetReport[];
  frontExposureBandReports: FrontExposureBandReport[];
  factionSummary: FactionSummaryReport;
  accordUsageReports: AccordUsageReport[];
  factionOutcomeReports: FactionOutcomeReport[];
  factionEventReports: FactionEventReport[];
  factionSetReports: FactionSetReport[];
  strategicFingerprintReports: StrategicFingerprintReport[];
  commandUsageReports: CommandUsageReport[];
  commandPairReports: CommandPairReport[];
  sourceBreakdownReports: SourceBreakdownReport[];
  systemEngagementReports: SystemEngagementReport[];
  loopWarnings: LoopWarningReport[];
};

export type HarnessBatchReport = {
  runsPerAgent: number;
  totalRuns: number;
  summaries: AgentBatchSummary[];
  campaignSummaries: CampaignBatchSummary[];
  campaignAgentSummaries: CampaignAgentBatchSummary[];
  campaignLossCauses: CampaignLossCauseReport[];
  campaignActionUsage: CampaignActionUsageReport[];
  campaignEvents: CampaignEventReport[];
  campaignSystemUsage: CampaignSystemUsageReport[];
  handlerValidationSummary: HandlerValidationSummaryReport[];
  handlerCampaignSummary: HandlerCampaignSummaryReport[];
  handlerLossCauses: HandlerLossCauseReport[];
  handlerInvalidRecommendations: HandlerInvalidRecommendationReport[];
  handlerConfidenceDistribution: HandlerConfidenceDistributionReport[];
  handlerTrainingValidation: HandlerTrainingValidationReport[];
  handlerOperatorDelta: HandlerOperatorDeltaReport[];
  strategicFingerprintReports: StrategicFingerprintReport[];
  commandUsageReports: CommandUsageReport[];
  commandPairReports: CommandPairReport[];
  sourceBreakdownReports: SourceBreakdownReport[];
  systemEngagementReports: SystemEngagementReport[];
  loopWarnings: LoopWarningReport[];
};

export type CampaignBatchSummary = {
  campaignId: CampaignTensionId;
  campaignName: string;
  runs: number;
  wins: number;
  losses: number;
  incomplete: number;
  winRate: number;
  averageWeeksPlayed: number;
  averageFinalPressures: Pressures;
};

export type CampaignAgentBatchSummary = CampaignBatchSummary & {
  agentId: string;
  agentLabel: string;
};

export type CampaignLossCauseReport = {
  campaignId: CampaignTensionId;
  campaignName: string;
  agentId: string;
  cause: HarnessFailureReason | 'none';
  count: number;
};

export type CampaignActionUsageReport = {
  campaignId: CampaignTensionId;
  campaignName: string;
  agentId: string;
  actionId: ActionId;
  uses: number;
  averageUses: number;
};

export type CampaignEventReport = {
  campaignId: CampaignTensionId;
  campaignName: string;
  eventTitle: string;
  presentations: number;
  averagePresentations: number;
};

export type CampaignSystemUsageReport = {
  campaignId: CampaignTensionId;
  campaignName: string;
  agentId: string;
  runs: number;
  averageBrokerAccordUses: number;
  averageManageContactUses: number;
  averageFrontEstablishments: number;
  averageFrontUpgrades: number;
  averageFrontLayLowOrders: number;
  averageLedgerDiscoveries: number;
  averageLedgerUses: number;
  averageSecretDiscoveries: number;
  averageFactionEvents: number;
  averageFrontEvents: number;
  averageContactEvents: number;
  averageOperativeEvents: number;
};

export type HandlerRunStats = {
  invalidRecommendationCount: number;
  decisionCount: number;
  softlockCount: number;
  confidenceCounts: Record<AdvisorConfidence, number>;
};

export type HandlerValidationSummaryReport = {
  agentId: string;
  agentLabel: string;
  runs: number;
  wins: number;
  losses: number;
  incomplete: number;
  winRate: number;
  invalidRecommendations: number;
  softlocks: number;
  stalls: number;
};

export type HandlerCampaignSummaryReport = {
  campaignId: CampaignTensionId;
  campaignName: string;
  runs: number;
  wins: number;
  losses: number;
  incomplete: number;
  winRate: number;
  invalidRecommendations: number;
  softlocks: number;
  stalls: number;
};

export type HandlerLossCauseReport = {
  agentId: string;
  cause: HarnessFailureReason | 'none';
  count: number;
};

export type HandlerInvalidRecommendationReport = {
  agentId: string;
  seed: string;
  campaignId: CampaignTensionId;
  runMode: RunMode;
  outcome: HarnessRunResult['outcome'];
  reason: HarnessFailureReason | 'none';
  invalidRecommendations: number;
};

export type HandlerConfidenceDistributionReport = {
  agentId: string;
  confidence: AdvisorConfidence;
  count: number;
  share: number;
};

export type HandlerTrainingValidationReport = {
  agentId: string;
  runs: number;
  wins: number;
  losses: number;
  incomplete: number;
  invalidRecommendations: number;
  softlocks: number;
  stalls: number;
  passed: boolean;
};

export type HandlerOperatorDeltaReport = {
  campaignId: CampaignTensionId;
  campaignName: string;
  metric: 'winRate' | 'averageWeeksPlayed' | 'averageDominion' | 'averageHeat';
  handlerValue: number;
  operatorValue: number;
  delta: number;
};

export type TargetRunStats = {
  targetType: ActionTarget['type'];
  targetId: string;
  selections: number;
  complications: number;
};

export type TargetReport = TargetRunStats & {
  targetLabel: string;
  complicationRate: number;
  wins: number;
  losses: number;
};

export type DistrictAverage = {
  control: number;
  heat: number;
};

export type ContextualEventCounts = {
  influencedSelections: number;
  targetTagInfluenced: number;
  rivalPressureInfluenced: number;
  localHeatInfluenced: number;
};

export type OperativeRunStats = {
  operativeId: OperativeId;
  started: boolean;
  recruited: boolean;
  hirePoolPresent: boolean;
  assignments: number;
  complications: number;
  finalStress?: number;
  highestStress?: number;
  finalStressTier?: StressTier;
  heatContribution: number;
  ruinContribution: number;
  eventEligibleCount: number;
  eventSelectedCount: number;
};

export type OperativeEventRunStats = {
  eventId: EventId;
  operativeId: OperativeId;
  eligibleCount: number;
  selectedCount: number;
};

export type RosterCompositionReport = {
  rosterKey: string;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageWeeksPlayed: number;
};

export type OperativePresenceReport = {
  operativeId: OperativeId;
  operativeName: string;
  presentRuns: number;
  wins: number;
  losses: number;
  winRate: number;
};

export type OperativeRecruitmentReport = {
  operativeId: OperativeId;
  operativeName: string;
  availableRuns: number;
  recruitedRuns: number;
  recruitmentRate: number;
  wins: number;
  losses: number;
};

export type OperativeUsageReport = {
  operativeId: OperativeId;
  operativeName: string;
  assignments: number;
  complications: number;
  complicationRate: number;
  averageAssignments: number;
};

export type OperativeStressReport = {
  operativeId: OperativeId;
  operativeName: string;
  averageFinalStress: number;
  averageHighestStress: number;
  strainedRuns: number;
  unstableRuns: number;
  breakingRuns: number;
};

export type OperativeDangerReport = {
  operativeId: OperativeId;
  operativeName: string;
  averageHeatContribution: number;
  averageRuinContribution: number;
};

export type OperativeEventReport = {
  operativeId: OperativeId;
  operativeName: string;
  eventId: EventId;
  eventTitle: string;
  eligibleRuns: number;
  selections: number;
  selectionRate: number;
};

export type HirePoolSelectionReport = {
  operativeId: OperativeId;
  operativeName: string;
  poolAppearances: number;
  recruits: number;
  selectionRate: number;
};

export type LedgerRunStats = {
  entriesCreated: number;
  secretsCreated: number;
  debtsCreated: number;
  favorsCreated: number;
  entriesConsumed: number;
  unresolvedDebts: number;
  targetedGatherIntelOrders: number;
  secretDiscoveries: number;
  secretDefinitionsCreated: Partial<Record<LedgerEntryDefinitionId, number>>;
  usage: Record<string, LedgerUsageRunStats>;
  ledgerEventEligibility: Partial<Record<EventId, number>>;
  ledgerEventSelections: Partial<Record<EventId, number>>;
};

export type LedgerUsageRunStats = {
  kind: LedgerEntryKind;
  definitionId: LedgerEntryDefinitionId;
  name: string;
  created: number;
  consumed: number;
  activeAtEnd: number;
};

export type LedgerSummaryReport = {
  averageEntriesCreated: number;
  averageSecretsCreated: number;
  averageDebtsCreated: number;
  averageFavorsCreated: number;
  averageEntriesConsumed: number;
  averageUnresolvedDebts: number;
};

export type LedgerUsageReport = LedgerUsageRunStats & {
  wins: number;
  losses: number;
};

export type LedgerOutcomeReport = {
  debtCount: number;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageWeeksPlayed: number;
  averageFinalPressures: Pick<Pressures, 'dominion' | 'heat' | 'loyalty' | 'ruin'>;
};

export type SecretDiscoveryReport = {
  targetedGatherIntelOrders: number;
  discoveries: number;
  discoveryRate: number;
  mostCommonSecret: string;
};

export type LedgerEventReport = {
  eventId: EventId;
  eventTitle: string;
  eligibleRuns: number;
  selections: number;
  selectionRate: number;
};

export type ContactRunStats = {
  activeContactIds: ContactId[];
  usage: Record<string, ContactUsageRunStats>;
  contactEventsEligible: Partial<Record<EventId, number>>;
  contactEventsSelected: Partial<Record<EventId, number>>;
  finalContacts: Record<ContactId, ContactFinalRunStats>;
  ledgerLinks: Record<string, ContactLedgerRunStats>;
};

export type ContactUsageRunStats = {
  contactId: ContactId;
  contactName: string;
  optionId: string;
  optionLabel: string;
  optionKind: ContactOptionKind;
  uses: number;
  complications: number;
};

export type ContactFinalRunStats = {
  contactId: ContactId;
  contactName: string;
  burned: boolean;
  trust: number;
  leverage: number;
  volatility: number;
  exposure: number;
};

export type ContactLedgerRunStats = {
  contactId: ContactId;
  contactName: string;
  definitionId: LedgerEntryDefinitionId;
  name: string;
  kind: LedgerEntryKind;
  created: number;
  consumed: number;
  activeAtEnd: number;
};

export type ContactSummaryReport = {
  averageManageContactUses: number;
  averageBurnedContacts: number;
  averageFinalTrust: number;
  averageFinalLeverage: number;
  averageFinalVolatility: number;
  averageFinalExposure: number;
};

export type ContactUsageReport = ContactUsageRunStats & {
  wins: number;
  losses: number;
  winRate: number;
};

export type ContactOutcomeReport = ContactFinalRunStats & {
  presentRuns: number;
  burnedRuns: number;
  burnedRate: number;
  wins: number;
  losses: number;
  winRate: number;
  averageTrust: number;
  averageLeverage: number;
  averageVolatility: number;
  averageExposure: number;
};

export type ContactEventReport = {
  eventId: EventId;
  eventTitle: string;
  eligibleRuns: number;
  selections: number;
  selectionRate: number;
};

export type ContactLedgerReport = ContactLedgerRunStats & {
  wins: number;
  losses: number;
};

export type ContactSetReport = {
  contactSetKey: string;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageWeeksPlayed: number;
  averageBurnedContacts: number;
};

export type FrontExposureBand = 'none' | 'quiet' | 'noticed' | 'hot' | 'compromised';

export type FrontRunStats = {
  opportunitySetKey: string;
  establishOrders: number;
  upgradeOrders: number;
  layLowOrders: number;
  finalOwnedFronts: number;
  finalAverageExposure: number;
  finalExposureBand: FrontExposureBand;
  frontEventsEligible: Partial<Record<EventId, number>>;
  frontEventsSelected: Partial<Record<EventId, number>>;
  totalYield: Pressures;
  fronts: Record<FrontDefinitionId, FrontOutcomeRunStats>;
};

export type FrontOutcomeRunStats = {
  frontId: FrontDefinitionId;
  frontName: string;
  ownedAtStart: boolean;
  ownedAtEnd: boolean;
  established: boolean;
  upgraded: boolean;
  ignored: boolean;
  finalExposure: number;
  status: FrontExposureBand;
  yieldTotals: Pressures;
};

export type FrontSummaryReport = {
  averageOwnedFronts: number;
  averageEstablishedFronts: number;
  establishmentRate: number;
  averageUpgrades: number;
  upgradeRate: number;
  averageLayLowOrders: number;
  averageYieldResources: number;
  averageYieldDominion: number;
  averageYieldHeatDelta: number;
  averageFinalExposure: number;
  averageFrontEvents: number;
};

export type FrontOutcomeReport = {
  frontId: FrontDefinitionId;
  frontName: string;
  ownedRuns: number;
  establishedRuns: number;
  upgradedRuns: number;
  ignoredRuns: number;
  wins: number;
  losses: number;
  winRate: number;
  averageFinalExposure: number;
  averageYieldResources: number;
  averageYieldDominion: number;
  averageYieldHeatDelta: number;
};

export type FrontEventReport = {
  eventId: EventId;
  eventTitle: string;
  eligibleRuns: number;
  selections: number;
  selectionRate: number;
};

export type FrontOpportunitySetReport = {
  opportunitySetKey: string;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageOwnedFronts: number;
};

export type FrontExposureBandReport = {
  band: FrontExposureBand;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageOwnedFronts: number;
};

export type FactionRunStats = {
  activeFactionSetKey: string;
  brokerAccordOrders: number;
  maxActiveAccords: number;
  weeklyYieldTotals: Pressures;
  factionEventsEligible: Partial<Record<EventId, number>>;
  factionEventsSelected: Partial<Record<EventId, number>>;
  accordUsage: Record<AccordId, AccordUsageRunStats>;
  finalFactions: Record<FactionId, FactionFinalRunStats>;
};

export type AccordUsageRunStats = {
  factionId: FactionId;
  factionName: string;
  accordId: AccordId;
  accordLabel: string;
  uses: number;
  activeAtEnd: number;
};

export type FactionFinalRunStats = {
  factionId: FactionId;
  factionName: string;
  active: boolean;
  status: FactionStatus;
  standing: number;
  suspicion: number;
  obligation: number;
  usedAccords: number;
  activeAccords: number;
  highSuspicion: boolean;
  highObligation: boolean;
};

export type FactionSummaryReport = {
  averageBrokerAccordUses: number;
  averageMaxActiveAccords: number;
  averageUsedAccords: number;
  averageActiveAccordsAtEnd: number;
  averageHighSuspicionFactions: number;
  averageHighObligationFactions: number;
  averageWeeklyYieldDominion: number;
  averageWeeklyYieldHeatDelta: number;
  averageWeeklyYieldResources: number;
  averageWeeklyYieldIntel: number;
};

export type AccordUsageReport = AccordUsageRunStats & {
  wins: number;
  losses: number;
  winRate: number;
};

export type FactionOutcomeReport = {
  factionId: FactionId;
  factionName: string;
  presentRuns: number;
  wins: number;
  losses: number;
  winRate: number;
  averageStanding: number;
  averageSuspicion: number;
  averageObligation: number;
  averageUsedAccords: number;
  averageActiveAccords: number;
  highSuspicionRuns: number;
  highObligationRuns: number;
};

export type FactionEventReport = {
  eventId: EventId;
  eventTitle: string;
  eligibleRuns: number;
  selections: number;
  selectionRate: number;
};

export type FactionSetReport = {
  factionSetKey: string;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageBrokerAccordUses: number;
};

const MAX_HARNESS_STEPS = 64;
const DANGEROUS_TARGET_MINIMUM_SELECTIONS = 5;
const TARGET_TAG_MODIFIERS = new Set([
  'recent_nightlife',
  'recent_violence',
  'recent_memory',
]);
const RIVAL_PRESSURE_MODIFIERS = new Set(['nyx_pressure', 'knox_pressure']);

export function simulateRun(options: HarnessRunOptions): HarnessRunResult {
  let state = newGame({
    seed: options.seed,
    campaignTensionId: options.campaignTensionId,
    runMode: options.runMode,
  });
  const startingRosterIds = state.operatives.map((operative) => operative.id);
  const initialHirePoolIds = [...state.hirePool];
  const operativeStats = createInitialOperativeStats(startingRosterIds, initialHirePoolIds);
  const operativeEventStats: Partial<Record<EventId, OperativeEventRunStats>> = {};
  updateOperativeStressSnapshots(operativeStats, state);
  const actionUsage = createEmptyActionUsage();
  const targetUsage: Record<string, TargetRunStats> = {};
  const eventChoiceUsage: Record<string, number> = {};
  const contextualEvents = createEmptyContextualEventCounts();
  const ledgerStats = createEmptyLedgerRunStats();
  const contactStats = createEmptyContactRunStats(state);
  const frontStats = createEmptyFrontRunStats(state);
  const factionStats = createEmptyFactionRunStats(state);
  const telemetry: RunTelemetry = {
    runId: `${options.agent.id}:${state.seed}`,
    actorType: 'bot',
    botId: options.agent.id,
    campaignTensionId: state.campaign.tensionId,
    seed: state.seed,
    entries: [],
  };
  const trace: HarnessTraceEntry[] = [];
  const context = createAgentDecisionContext(`${state.seed}:${options.agent.id}`);
  const handlerStats = createHandlerRunStats();
  let stalled = false;
  let failureReason: HarnessFailureReason | undefined;

  for (let step = 0; step < MAX_HARNESS_STEPS && !state.gameOver && !stalled; step += 1) {
    if (state.phase === 'COMMAND') {
      const queuedResult = queueAgentOrders(
        state,
        options.agent,
        context,
        actionUsage,
        targetUsage,
        ledgerStats,
        contactStats,
        frontStats,
        factionStats,
        telemetry.entries,
        trace,
        options.collectTrace,
        handlerStats,
      );
      state = queuedResult.state;

      if (queuedResult.failureReason) {
        stalled = true;
        failureReason = queuedResult.failureReason;
        break;
      }

      if (state.queuedOrders.length === 0) {
        stalled = true;
        failureReason = 'agent_stalled';
        appendTrace(trace, options.collectTrace, state, 'Agent stalled with no queued orders.');
        break;
      }

      const preAdvanceLogCount = state.eventLog.length;
      const advanced = advanceWeek(state);

      if (!advanced.ok) {
        stalled = true;
        failureReason = 'agent_stalled';
        appendTrace(trace, options.collectTrace, state, `Advance failed: ${advanced.error}.`);
        break;
      }

      recordOrderPressureAttribution(telemetry.entries, advanced.orderResolutions, state.week);
      recordLogPressureAttribution(telemetry.entries, advanced.state, preAdvanceLogCount);
      recordOrderComplications(targetUsage, advanced.orderResolutions);
      recordOperativeOrderStats(operativeStats, advanced.orderResolutions, advanced.state);
      recordOperativeEventEligibility(
        operativeStats,
        operativeEventStats,
        advanced.eventCandidates,
      );
      recordOperativeEventSelection(
        operativeStats,
        operativeEventStats,
        advanced.eventSelection,
      );
      recordLedgerEventStats(
        ledgerStats,
        advanced.eventCandidates,
        advanced.eventSelection,
      );
      recordContactOrderComplications(contactStats, advanced.orderResolutions);
      recordContactEventStats(
        contactStats,
        advanced.eventCandidates,
        advanced.eventSelection,
      );
      recordFrontEventStats(
        frontStats,
        advanced.eventCandidates,
        advanced.eventSelection,
      );
      recordFactionEventStats(
        factionStats,
        advanced.eventCandidates,
        advanced.eventSelection,
      );
      recordContextualEvent(contextualEvents, advanced.eventSelection);
      state = advanced.state;
      recordFactionSnapshot(factionStats, state);
      appendTrace(trace, options.collectTrace, state, 'Advanced week and presented event.');
    }

    if (state.phase === 'EVENT_CHOICE') {
      const optionsForEvent = getLegalEventChoiceOptions(state);
      const choice = getAgentEventChoice(
        state,
        options.agent,
        optionsForEvent,
        context,
        handlerStats,
        trace,
        options.collectTrace,
      );

      if (!choice) {
        stalled = true;
        failureReason =
          options.agent.id === 'handler' ? 'invalid_recommendation' : 'agent_stalled';
        appendTrace(
          trace,
          options.collectTrace,
          state,
          options.agent.id === 'handler'
            ? 'Handler recommendation could not be applied to event choice.'
            : 'Agent stalled with no event choice.',
        );
        break;
      }

      const preChoiceLogCount = state.eventLog.length;
      const resolved = resolveEventChoice(state, choice.eventId, choice.choice.id);

      if (!resolved.ok) {
        stalled = true;
        failureReason =
          options.agent.id === 'handler' ? 'invalid_recommendation' : 'agent_stalled';
        appendTrace(trace, options.collectTrace, state, `Event choice failed: ${resolved.error}.`);
        break;
      }

      eventChoiceUsage[choice.choice.id] = (eventChoiceUsage[choice.choice.id] ?? 0) + 1;
      recordEventChoiceTelemetry(
        telemetry.entries,
        resolved.state,
        preChoiceLogCount,
        choice.eventId,
        choice.choice,
      );
      recordOperativeEventChoiceContribution(operativeStats, state, choice.choice);
      state = resolved.state;
      recordFactionSnapshot(factionStats, state);
      appendTrace(trace, options.collectTrace, state, `Chose event option: ${choice.choice.label}.`);
    }
  }

  if (!state.gameOver && !failureReason && !stalled) {
    failureReason = 'softlock';
    if (options.agent.id === 'handler') {
      handlerStats.softlockCount += 1;
    }
    appendTrace(trace, options.collectTrace, state, 'Harness reached max steps without terminal state.');
  }

  finalizeOperativeStats(operativeStats, state);
  finalizeLedgerRunStats(ledgerStats, state);
  finalizeContactRunStats(contactStats, state);
  finalizeFrontRunStats(frontStats, state);
  finalizeFactionRunStats(factionStats, state);

  return {
    agentId: options.agent.id,
    agentLabel: options.agent.label,
    seed: state.seed,
    finalState: state,
    outcome: state.gameOver?.result ?? (stalled ? 'incomplete' : 'incomplete'),
    reason: state.gameOver?.reason ?? failureReason,
    weeksPlayed: state.week,
    actionUsage,
    targetUsage,
    eventChoiceUsage,
    contextualEvents,
    startingRosterIds,
    initialHirePoolIds,
    operativeStats,
    operativeEventStats,
    ledgerStats,
    contactStats,
    frontStats,
    factionStats,
    handlerStats: options.agent.id === 'handler' ? handlerStats : undefined,
    telemetry,
    trace,
  };
}

export function simulateBatch(options: HarnessBatchOptions): HarnessBatchReport {
  const seedPrefix = options.seedPrefix ?? 'HARNESS';
  const campaignTensionIds = resolveHarnessCampaignTensionIds(options);
  const allRuns: HarnessRunResult[] = [];
  const summaries = options.agents.map((agent) => {
    const runs: HarnessRunResult[] = [];

    for (const campaignTensionId of campaignTensionIds) {
      for (let index = 0; index < options.runsPerAgent; index += 1) {
        const campaignSeedSegment = campaignTensionId ? `-${campaignTensionId}` : '';
        runs.push(
          simulateRun({
            agent,
            campaignTensionId,
            runMode: options.runMode,
            seed: `${seedPrefix}-${agent.id}${campaignSeedSegment}-${index + 1}`,
          }),
        );
      }
    }

    allRuns.push(...runs);

    return summarizeAgentRuns(agent, runs);
  });
  const campaignAgentSummaries = summarizeCampaignAgentRuns(allRuns);
  const analyticsReports = buildAnalyticsReportSet(allRuns);

  return {
    runsPerAgent: options.runsPerAgent,
    totalRuns: allRuns.length,
    summaries,
    campaignSummaries: summarizeCampaignRuns(allRuns),
    campaignAgentSummaries,
    campaignLossCauses: summarizeCampaignLossCauses(allRuns),
    campaignActionUsage: summarizeCampaignActionUsage(allRuns),
    campaignEvents: summarizeCampaignEvents(allRuns),
    campaignSystemUsage: summarizeCampaignSystemUsage(allRuns),
    handlerValidationSummary: summarizeHandlerValidation(allRuns),
    handlerCampaignSummary: summarizeHandlerCampaigns(allRuns),
    handlerLossCauses: summarizeHandlerLossCauses(allRuns),
    handlerInvalidRecommendations: summarizeHandlerInvalidRecommendations(allRuns),
    handlerConfidenceDistribution: summarizeHandlerConfidenceDistribution(allRuns),
    handlerTrainingValidation: summarizeHandlerTrainingValidation(allRuns),
    handlerOperatorDelta: summarizeHandlerOperatorDelta(campaignAgentSummaries),
    ...analyticsReports,
  };
}

function resolveHarnessCampaignTensionIds(
  options: HarnessBatchOptions,
): readonly (CampaignTensionId | undefined)[] {
  if (options.campaignTensionIds) {
    return options.campaignTensionIds;
  }

  if (options.campaignTensionId) {
    return [options.campaignTensionId];
  }

  return [undefined];
}

export function formatBatchReport(report: HarnessBatchReport): string {
  const lines = [
    `runsPerAgent,totalRuns`,
    `${report.runsPerAgent},${report.totalRuns}`,
    '',
    'agent,runs,wins,losses,incomplete,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgResources,avgIntel,avgRuin',
  ];

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.runs,
        summary.wins,
        summary.losses,
        summary.incomplete,
        summary.winRate.toFixed(3),
        summary.averageWeeksPlayed.toFixed(2),
        summary.averageFinalPressures.dominion.toFixed(2),
        summary.averageFinalPressures.heat.toFixed(2),
        summary.averageFinalPressures.loyalty.toFixed(2),
        summary.averageFinalPressures.resources.toFixed(2),
        summary.averageFinalPressures.intel.toFixed(2),
        summary.averageFinalPressures.ruin.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'target_highlights',
    'agent,agentLabel,mostSelectedTarget,selections,mostDangerousTarget,complicationRate',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.agentLabel,
        summary.mostSelectedTarget?.targetLabel ?? '',
        summary.mostSelectedTarget?.selections ?? 0,
        summary.mostDangerousTarget?.targetLabel ?? '',
        summary.mostDangerousTarget?.complicationRate.toFixed(3) ?? '',
      ].join(','),
    );
  }

  lines.push(
    '',
    'target_details',
    'agent,targetType,targetId,targetLabel,selections,complications,complicationRate,wins,losses',
  );

  for (const summary of report.summaries) {
    for (const target of summary.targetReports) {
      lines.push(
        [
          summary.agentId,
          target.targetType,
          target.targetId,
          target.targetLabel,
          target.selections,
          target.complications,
          target.complicationRate.toFixed(3),
          target.wins,
          target.losses,
        ].join(','),
      );
    }
  }

  lines.push('', 'rival_pressure', 'agent,rivalId,rivalName,averageFinalPressure');

  for (const summary of report.summaries) {
    for (const rival of RIVAL_TERRITORY_RIVALS) {
      lines.push(
        [
          summary.agentId,
          rival.id,
          rival.name,
          summary.averageFinalRivalPressures[rival.id].toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push('', 'district_state', 'agent,districtId,districtName,averageControl,averageHeat');

  for (const summary of report.summaries) {
    for (const district of RIVAL_TERRITORY_DISTRICTS) {
      const average = summary.averageFinalDistricts[district.id];
      lines.push(
        [
          summary.agentId,
          district.id,
          district.name,
          average.control.toFixed(2),
          average.heat.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push('', 'loss_causes', 'agent,cause,count');

  for (const summary of report.summaries) {
    const entries = Object.entries(summary.lossReasons);

    if (entries.length === 0) {
      lines.push([summary.agentId, 'none', 0].join(','));
      continue;
    }

    for (const [reason, count] of entries) {
      lines.push([summary.agentId, reason, count].join(','));
    }
  }

  lines.push(
    '',
    'contextual_events',
    'agent,influencedSelections,targetTagInfluenced,rivalPressureInfluenced,localHeatInfluenced',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.contextualEvents.influencedSelections,
        summary.contextualEvents.targetTagInfluenced,
        summary.contextualEvents.rivalPressureInfluenced,
        summary.contextualEvents.localHeatInfluenced,
      ].join(','),
    );
  }

  lines.push(
    '',
    'ledger_summary',
    'agent,avgEntriesCreated,avgSecretsCreated,avgDebtsCreated,avgFavorsCreated,avgEntriesConsumed,avgUnresolvedDebts',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.ledgerSummary.averageEntriesCreated.toFixed(2),
        summary.ledgerSummary.averageSecretsCreated.toFixed(2),
        summary.ledgerSummary.averageDebtsCreated.toFixed(2),
        summary.ledgerSummary.averageFavorsCreated.toFixed(2),
        summary.ledgerSummary.averageEntriesConsumed.toFixed(2),
        summary.ledgerSummary.averageUnresolvedDebts.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'ledger_usage',
    'agent,kind,definitionId,name,created,consumed,activeAtEnd,wins,losses',
  );

  for (const summary of report.summaries) {
    for (const ledger of summary.ledgerUsageReports) {
      lines.push(
        [
          summary.agentId,
          ledger.kind,
          ledger.definitionId,
          csvCell(ledger.name),
          ledger.created,
          ledger.consumed,
          ledger.activeAtEnd,
          ledger.wins,
          ledger.losses,
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'ledger_outcomes',
    'agent,debtCount,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgRuin',
  );

  for (const summary of report.summaries) {
    for (const outcome of summary.ledgerOutcomeReports) {
      lines.push(
        [
          summary.agentId,
          outcome.debtCount,
          outcome.winRate.toFixed(3),
          outcome.averageWeeksPlayed.toFixed(2),
          outcome.averageFinalPressures.dominion.toFixed(2),
          outcome.averageFinalPressures.heat.toFixed(2),
          outcome.averageFinalPressures.loyalty.toFixed(2),
          outcome.averageFinalPressures.ruin.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'secret_discovery',
    'agent,targetedGatherIntelOrders,discoveries,discoveryRate,mostCommonSecret',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.secretDiscoveryReport.targetedGatherIntelOrders,
        summary.secretDiscoveryReport.discoveries,
        summary.secretDiscoveryReport.discoveryRate.toFixed(3),
        csvCell(summary.secretDiscoveryReport.mostCommonSecret),
      ].join(','),
    );
  }

  lines.push(
    '',
    'ledger_events',
    'agent,eventId,eventTitle,eligibleRuns,selections,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const event of summary.ledgerEventReports) {
      lines.push(
        [
          summary.agentId,
          event.eventId,
          csvCell(event.eventTitle),
          event.eligibleRuns,
          event.selections,
          event.selectionRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'contact_summary',
    'agent,avgManageContactUses,avgBurnedContacts,avgFinalTrust,avgFinalLeverage,avgFinalVolatility,avgFinalExposure',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.contactSummary.averageManageContactUses.toFixed(2),
        summary.contactSummary.averageBurnedContacts.toFixed(2),
        summary.contactSummary.averageFinalTrust.toFixed(2),
        summary.contactSummary.averageFinalLeverage.toFixed(2),
        summary.contactSummary.averageFinalVolatility.toFixed(2),
        summary.contactSummary.averageFinalExposure.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'contact_usage',
    'agent,contactId,contactName,optionId,optionLabel,optionKind,uses,complications,complicationRate,wins,losses,winRate',
  );

  for (const summary of report.summaries) {
    for (const contact of summary.contactUsageReports) {
      lines.push(
        [
          summary.agentId,
          contact.contactId,
          csvCell(contact.contactName),
          contact.optionId,
          csvCell(contact.optionLabel),
          contact.optionKind,
          contact.uses,
          contact.complications,
          (contact.uses > 0 ? contact.complications / contact.uses : 0).toFixed(3),
          contact.wins,
          contact.losses,
          contact.winRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'contact_outcomes',
    'agent,contactId,contactName,presentRuns,burnedRuns,burnedRate,wins,losses,winRate,avgTrust,avgLeverage,avgVolatility,avgExposure',
  );

  for (const summary of report.summaries) {
    for (const contact of summary.contactOutcomeReports) {
      lines.push(
        [
          summary.agentId,
          contact.contactId,
          csvCell(contact.contactName),
          contact.presentRuns,
          contact.burnedRuns,
          contact.burnedRate.toFixed(3),
          contact.wins,
          contact.losses,
          contact.winRate.toFixed(3),
          contact.averageTrust.toFixed(2),
          contact.averageLeverage.toFixed(2),
          contact.averageVolatility.toFixed(2),
          contact.averageExposure.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'contact_events',
    'agent,eventId,eventTitle,eligibleRuns,selections,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const event of summary.contactEventReports) {
      lines.push(
        [
          summary.agentId,
          event.eventId,
          csvCell(event.eventTitle),
          event.eligibleRuns,
          event.selections,
          event.selectionRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'contact_ledger',
    'agent,contactId,contactName,kind,definitionId,name,created,consumed,activeAtEnd,wins,losses',
  );

  for (const summary of report.summaries) {
    for (const ledger of summary.contactLedgerReports) {
      lines.push(
        [
          summary.agentId,
          ledger.contactId,
          csvCell(ledger.contactName),
          ledger.kind,
          ledger.definitionId,
          csvCell(ledger.name),
          ledger.created,
          ledger.consumed,
          ledger.activeAtEnd,
          ledger.wins,
          ledger.losses,
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'contact_sets',
    'agent,contactSetKey,runs,wins,losses,winRate,avgWeeks,avgBurnedContacts',
  );

  for (const summary of report.summaries) {
    for (const contactSet of summary.contactSetReports) {
      lines.push(
        [
          summary.agentId,
          contactSet.contactSetKey,
          contactSet.runs,
          contactSet.wins,
          contactSet.losses,
          contactSet.winRate.toFixed(3),
          contactSet.averageWeeksPlayed.toFixed(2),
          contactSet.averageBurnedContacts.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'front_summary',
    'agent,avgOwnedFronts,avgEstablishedFronts,establishmentRate,avgUpgrades,upgradeRate,avgLayLowOrders,avgYieldResources,avgYieldDominion,avgYieldHeatDelta,avgFinalExposure,avgFrontEvents',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.frontSummary.averageOwnedFronts.toFixed(2),
        summary.frontSummary.averageEstablishedFronts.toFixed(2),
        summary.frontSummary.establishmentRate.toFixed(3),
        summary.frontSummary.averageUpgrades.toFixed(2),
        summary.frontSummary.upgradeRate.toFixed(3),
        summary.frontSummary.averageLayLowOrders.toFixed(2),
        summary.frontSummary.averageYieldResources.toFixed(2),
        summary.frontSummary.averageYieldDominion.toFixed(2),
        summary.frontSummary.averageYieldHeatDelta.toFixed(2),
        summary.frontSummary.averageFinalExposure.toFixed(2),
        summary.frontSummary.averageFrontEvents.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'front_highlights',
    'agent,mostProfitableFront,avgYieldResources,mostDangerousFront,avgFinalExposure,mostIgnoredFront,ignoredRuns',
  );

  for (const summary of report.summaries) {
    const mostProfitable = selectMostProfitableFront(summary.frontOutcomeReports);
    const mostDangerous = selectMostDangerousFront(summary.frontOutcomeReports);
    const mostIgnored = selectMostIgnoredFront(summary.frontOutcomeReports);

    lines.push(
      [
        summary.agentId,
        csvCell(mostProfitable?.frontName ?? ''),
        mostProfitable?.averageYieldResources.toFixed(2) ?? '',
        csvCell(mostDangerous?.frontName ?? ''),
        mostDangerous?.averageFinalExposure.toFixed(2) ?? '',
        csvCell(mostIgnored?.frontName ?? ''),
        mostIgnored?.ignoredRuns ?? '',
      ].join(','),
    );
  }

  lines.push(
    '',
    'front_outcomes',
    'agent,frontId,frontName,ownedRuns,establishedRuns,upgradedRuns,ignoredRuns,wins,losses,winRate,avgFinalExposure,avgYieldResources,avgYieldDominion,avgYieldHeatDelta',
  );

  for (const summary of report.summaries) {
    for (const front of summary.frontOutcomeReports) {
      lines.push(
        [
          summary.agentId,
          front.frontId,
          csvCell(front.frontName),
          front.ownedRuns,
          front.establishedRuns,
          front.upgradedRuns,
          front.ignoredRuns,
          front.wins,
          front.losses,
          front.winRate.toFixed(3),
          front.averageFinalExposure.toFixed(2),
          front.averageYieldResources.toFixed(2),
          front.averageYieldDominion.toFixed(2),
          front.averageYieldHeatDelta.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'front_events',
    'agent,eventId,eventTitle,eligibleRuns,selections,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const event of summary.frontEventReports) {
      lines.push(
        [
          summary.agentId,
          event.eventId,
          csvCell(event.eventTitle),
          event.eligibleRuns,
          event.selections,
          event.selectionRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'front_opportunity_sets',
    'agent,frontSetKey,runs,wins,losses,winRate,avgOwnedFronts',
  );

  for (const summary of report.summaries) {
    for (const opportunitySet of summary.frontOpportunitySetReports) {
      lines.push(
        [
          summary.agentId,
          csvCell(opportunitySet.opportunitySetKey),
          opportunitySet.runs,
          opportunitySet.wins,
          opportunitySet.losses,
          opportunitySet.winRate.toFixed(3),
          opportunitySet.averageOwnedFronts.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'front_exposure_bands',
    'agent,band,runs,wins,losses,winRate,avgOwnedFronts',
  );

  for (const summary of report.summaries) {
    for (const band of summary.frontExposureBandReports) {
      lines.push(
        [
          summary.agentId,
          band.band,
          band.runs,
          band.wins,
          band.losses,
          band.winRate.toFixed(3),
          band.averageOwnedFronts.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'faction_summary',
    'agent,avgBrokerAccordUses,avgMaxActiveAccords,avgUsedAccords,avgActiveAccordsAtEnd,avgHighSuspicionFactions,avgHighObligationFactions,avgWeeklyYieldDominion,avgWeeklyYieldHeatDelta,avgWeeklyYieldResources,avgWeeklyYieldIntel',
  );

  for (const summary of report.summaries) {
    lines.push(
      [
        summary.agentId,
        summary.factionSummary.averageBrokerAccordUses.toFixed(2),
        summary.factionSummary.averageMaxActiveAccords.toFixed(2),
        summary.factionSummary.averageUsedAccords.toFixed(2),
        summary.factionSummary.averageActiveAccordsAtEnd.toFixed(2),
        summary.factionSummary.averageHighSuspicionFactions.toFixed(2),
        summary.factionSummary.averageHighObligationFactions.toFixed(2),
        summary.factionSummary.averageWeeklyYieldDominion.toFixed(2),
        summary.factionSummary.averageWeeklyYieldHeatDelta.toFixed(2),
        summary.factionSummary.averageWeeklyYieldResources.toFixed(2),
        summary.factionSummary.averageWeeklyYieldIntel.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'accord_usage',
    'agent,factionId,factionName,accordId,accordLabel,uses,activeAtEnd,wins,losses,winRate',
  );

  for (const summary of report.summaries) {
    for (const accord of summary.accordUsageReports) {
      lines.push(
        [
          summary.agentId,
          accord.factionId,
          csvCell(accord.factionName),
          accord.accordId,
          csvCell(accord.accordLabel),
          accord.uses,
          accord.activeAtEnd,
          accord.wins,
          accord.losses,
          accord.winRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'faction_outcomes',
    'agent,factionId,factionName,presentRuns,wins,losses,winRate,avgStanding,avgSuspicion,avgObligation,avgUsedAccords,avgActiveAccords,highSuspicionRuns,highObligationRuns',
  );

  for (const summary of report.summaries) {
    for (const faction of summary.factionOutcomeReports) {
      lines.push(
        [
          summary.agentId,
          faction.factionId,
          csvCell(faction.factionName),
          faction.presentRuns,
          faction.wins,
          faction.losses,
          faction.winRate.toFixed(3),
          faction.averageStanding.toFixed(2),
          faction.averageSuspicion.toFixed(2),
          faction.averageObligation.toFixed(2),
          faction.averageUsedAccords.toFixed(2),
          faction.averageActiveAccords.toFixed(2),
          faction.highSuspicionRuns,
          faction.highObligationRuns,
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'faction_events',
    'agent,eventId,eventTitle,eligibleRuns,selections,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const event of summary.factionEventReports) {
      lines.push(
        [
          summary.agentId,
          event.eventId,
          csvCell(event.eventTitle),
          event.eligibleRuns,
          event.selections,
          event.selectionRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'faction_sets',
    'agent,factionSetKey,runs,wins,losses,winRate,avgBrokerAccordUses',
  );

  for (const summary of report.summaries) {
    for (const set of summary.factionSetReports) {
      lines.push(
        [
          summary.agentId,
          csvCell(set.factionSetKey),
          set.runs,
          set.wins,
          set.losses,
          set.winRate.toFixed(3),
          set.averageBrokerAccordUses.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'roster_compositions',
    'agent,rosterKey,runs,wins,losses,winRate,avgWeeks',
  );

  for (const summary of report.summaries) {
    for (const roster of summary.rosterCompositionReports) {
      lines.push(
        [
          summary.agentId,
          roster.rosterKey,
          roster.runs,
          roster.wins,
          roster.losses,
          roster.winRate.toFixed(3),
          roster.averageWeeksPlayed.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_presence',
    'agent,operativeId,operativeName,presentRuns,wins,losses,winRate',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativePresenceReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.presentRuns,
          operative.wins,
          operative.losses,
          operative.winRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_recruitment',
    'agent,operativeId,operativeName,availableRuns,recruitedRuns,recruitmentRate,wins,losses',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativeRecruitmentReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.availableRuns,
          operative.recruitedRuns,
          operative.recruitmentRate.toFixed(3),
          operative.wins,
          operative.losses,
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_usage',
    'agent,operativeId,operativeName,assignments,complications,complicationRate,avgAssignments',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativeUsageReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.assignments,
          operative.complications,
          operative.complicationRate.toFixed(3),
          operative.averageAssignments.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_stress',
    'agent,operativeId,operativeName,avgFinalStress,avgHighestStress,strainedRuns,unstableRuns,breakingRuns',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativeStressReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.averageFinalStress.toFixed(2),
          operative.averageHighestStress.toFixed(2),
          operative.strainedRuns,
          operative.unstableRuns,
          operative.breakingRuns,
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_danger',
    'agent,operativeId,operativeName,avgHeatContribution,avgRuinContribution',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.operativeDangerReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.averageHeatContribution.toFixed(2),
          operative.averageRuinContribution.toFixed(2),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'operative_events',
    'agent,operativeId,operativeName,eventId,eventTitle,eligibleRuns,selections,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const event of summary.operativeEventReports) {
      lines.push(
        [
          summary.agentId,
          event.operativeId,
          event.operativeName,
          event.eventId,
          event.eventTitle,
          event.eligibleRuns,
          event.selections,
          event.selectionRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'hire_pool_selection',
    'agent,operativeId,operativeName,poolAppearances,recruits,selectionRate',
  );

  for (const summary of report.summaries) {
    for (const operative of summary.hirePoolSelectionReports) {
      lines.push(
        [
          summary.agentId,
          operative.operativeId,
          operative.operativeName,
          operative.poolAppearances,
          operative.recruits,
          operative.selectionRate.toFixed(3),
        ].join(','),
      );
    }
  }

  lines.push(
    '',
    'campaign_summary',
    'campaignId,campaignName,runs,wins,losses,incomplete,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgResources,avgIntel,avgRuin',
  );

  for (const summary of report.campaignSummaries) {
    lines.push(formatCampaignSummaryRow(summary));
  }

  lines.push(
    '',
    'campaign_agent_summary',
    'agent,campaignId,campaignName,runs,wins,losses,incomplete,winRate,avgWeeks,avgDominion,avgHeat,avgLoyalty,avgResources,avgIntel,avgRuin',
  );

  for (const summary of report.campaignAgentSummaries) {
    lines.push([summary.agentId, ...formatCampaignSummaryCells(summary)].join(','));
  }

  lines.push(
    '',
    'campaign_loss_causes',
    'campaignId,campaignName,agent,cause,count',
  );

  for (const loss of report.campaignLossCauses) {
    lines.push(
      [
        loss.campaignId,
        csvCell(loss.campaignName),
        loss.agentId,
        loss.cause,
        loss.count,
      ].join(','),
    );
  }

  lines.push(
    '',
    'campaign_action_usage',
    'campaignId,campaignName,agent,actionId,uses,avgUses',
  );

  for (const action of report.campaignActionUsage) {
    lines.push(
      [
        action.campaignId,
        csvCell(action.campaignName),
        action.agentId,
        action.actionId,
        action.uses,
        action.averageUses.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'campaign_events',
    'campaignId,campaignName,eventTitle,presentations,avgPresentations',
  );

  for (const event of report.campaignEvents) {
    lines.push(
      [
        event.campaignId,
        csvCell(event.campaignName),
        csvCell(event.eventTitle),
        event.presentations,
        event.averagePresentations.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'campaign_system_usage',
    'campaignId,campaignName,agent,runs,avgBrokerAccordUses,avgManageContactUses,avgFrontEstablishments,avgFrontUpgrades,avgFrontLayLowOrders,avgLedgerDiscoveries,avgLedgerUses,avgSecretDiscoveries,avgFactionEvents,avgFrontEvents,avgContactEvents,avgOperativeEvents',
  );

  for (const usage of report.campaignSystemUsage) {
    lines.push(
      [
        usage.campaignId,
        csvCell(usage.campaignName),
        usage.agentId,
        usage.runs,
        usage.averageBrokerAccordUses.toFixed(2),
        usage.averageManageContactUses.toFixed(2),
        usage.averageFrontEstablishments.toFixed(2),
        usage.averageFrontUpgrades.toFixed(2),
        usage.averageFrontLayLowOrders.toFixed(2),
        usage.averageLedgerDiscoveries.toFixed(2),
        usage.averageLedgerUses.toFixed(2),
        usage.averageSecretDiscoveries.toFixed(2),
        usage.averageFactionEvents.toFixed(2),
        usage.averageFrontEvents.toFixed(2),
        usage.averageContactEvents.toFixed(2),
        usage.averageOperativeEvents.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'handler_validation_summary',
    'agent,agentLabel,runs,wins,losses,incomplete,winRate,invalidRecommendations,softlocks,stalls',
  );

  for (const summary of report.handlerValidationSummary) {
    lines.push(
      [
        summary.agentId,
        csvCell(summary.agentLabel),
        summary.runs,
        summary.wins,
        summary.losses,
        summary.incomplete,
        summary.winRate.toFixed(3),
        summary.invalidRecommendations,
        summary.softlocks,
        summary.stalls,
      ].join(','),
    );
  }

  lines.push(
    '',
    'handler_campaign_summary',
    'campaignId,campaignName,runs,wins,losses,incomplete,winRate,invalidRecommendations,softlocks,stalls',
  );

  for (const summary of report.handlerCampaignSummary) {
    lines.push(
      [
        summary.campaignId,
        csvCell(summary.campaignName),
        summary.runs,
        summary.wins,
        summary.losses,
        summary.incomplete,
        summary.winRate.toFixed(3),
        summary.invalidRecommendations,
        summary.softlocks,
        summary.stalls,
      ].join(','),
    );
  }

  lines.push('', 'handler_loss_causes', 'agent,cause,count');

  for (const loss of report.handlerLossCauses) {
    lines.push([loss.agentId, loss.cause, loss.count].join(','));
  }

  lines.push(
    '',
    'handler_invalid_recommendations',
    'agent,seed,campaignId,runMode,outcome,reason,invalidRecommendations',
  );

  for (const invalid of report.handlerInvalidRecommendations) {
    lines.push(
      [
        invalid.agentId,
        invalid.seed,
        invalid.campaignId,
        invalid.runMode,
        invalid.outcome,
        invalid.reason,
        invalid.invalidRecommendations,
      ].join(','),
    );
  }

  lines.push('', 'handler_confidence_distribution', 'agent,confidence,count,share');

  for (const confidence of report.handlerConfidenceDistribution) {
    lines.push(
      [
        confidence.agentId,
        confidence.confidence,
        confidence.count,
        confidence.share.toFixed(3),
      ].join(','),
    );
  }

  lines.push(
    '',
    'handler_training_validation',
    'agent,runs,wins,losses,incomplete,invalidRecommendations,softlocks,stalls,passed',
  );

  for (const validation of report.handlerTrainingValidation) {
    lines.push(
      [
        validation.agentId,
        validation.runs,
        validation.wins,
        validation.losses,
        validation.incomplete,
        validation.invalidRecommendations,
        validation.softlocks,
        validation.stalls,
        validation.passed,
      ].join(','),
    );
  }

  lines.push(
    '',
    'handler_operator_delta',
    'campaignId,campaignName,metric,handlerValue,operatorValue,delta',
  );

  for (const delta of report.handlerOperatorDelta) {
    lines.push(
      [
        delta.campaignId,
        csvCell(delta.campaignName),
        delta.metric,
        delta.handlerValue.toFixed(3),
        delta.operatorValue.toFixed(3),
        delta.delta.toFixed(3),
      ].join(','),
    );
  }

  lines.push(
    '',
    'strategic_fingerprint',
    'agent,agentLabel,campaignId,campaignName,runs,wins,winRate,totalCommands,avgCommands,topCommand,topCommandPct,topPair,topPairPct,topDominionSource,topHeatReliefSource,warning',
  );

  for (const fingerprint of report.strategicFingerprintReports) {
    lines.push(
      [
        fingerprint.agentId,
        csvCell(fingerprint.agentLabel),
        fingerprint.campaignId,
        csvCell(fingerprint.campaignName),
        fingerprint.runs,
        fingerprint.wins,
        fingerprint.winRate.toFixed(3),
        fingerprint.totalCommands,
        fingerprint.averageCommandsUsed.toFixed(2),
        csvCell(fingerprint.topCommand?.actionLabel ?? ''),
        fingerprint.topCommand?.percentage.toFixed(3) ?? '',
        csvCell(fingerprint.topPair?.pairLabel ?? ''),
        fingerprint.topPair?.percentageOfWeeks.toFixed(3) ?? '',
        csvCell(formatSourceLabel(fingerprint.topDominionSource)),
        csvCell(formatSourceLabel(fingerprint.topHeatReliefSource)),
        csvCell(fingerprint.dominantLoopWarning?.message ?? ''),
      ].join(','),
    );
  }

  lines.push(
    '',
    'command_usage',
    'agent,agentLabel,campaignId,campaignName,actionId,actionLabel,count,percentage',
  );

  for (const usage of report.commandUsageReports) {
    lines.push(
      [
        usage.agentId,
        csvCell(usage.agentLabel),
        usage.campaignId,
        csvCell(usage.campaignName),
        usage.actionId,
        csvCell(usage.actionLabel),
        usage.count,
        usage.percentage.toFixed(3),
      ].join(','),
    );
  }

  lines.push(
    '',
    'command_pairs',
    'agent,agentLabel,campaignId,campaignName,actionA,actionB,pairLabel,count,percentageOfWeeks',
  );

  for (const pair of report.commandPairReports) {
    lines.push(
      [
        pair.agentId,
        csvCell(pair.agentLabel),
        pair.campaignId,
        csvCell(pair.campaignName),
        pair.actionA,
        pair.actionB,
        csvCell(pair.pairLabel),
        pair.count,
        pair.percentageOfWeeks.toFixed(3),
      ].join(','),
    );
  }

  lines.push(
    '',
    'source_breakdown',
    'agent,agentLabel,campaignId,campaignName,pressure,sourceKind,sourceId,sourceLabel,totalDelta,positiveDelta,negativeDelta',
  );

  for (const source of report.sourceBreakdownReports) {
    lines.push(
      [
        source.agentId,
        csvCell(source.agentLabel),
        source.campaignId,
        csvCell(source.campaignName),
        source.pressure,
        source.sourceKind,
        csvCell(source.sourceId),
        csvCell(source.sourceLabel),
        source.totalDelta.toFixed(2),
        source.positiveDelta.toFixed(2),
        source.negativeDelta.toFixed(2),
      ].join(','),
    );
  }

  lines.push(
    '',
    'system_engagement',
    'agent,agentLabel,campaignId,campaignName,runs,wins,runsWithFrontInvestment,runsWithFrontUpgrade,runsWithAccordBrokered,runsWithLedgerUse,runsWithContactService,runsWithBribe,runsWithLayLow,winsWithNoFronts,winsWithNoAccords,winsWithNoLedger,winsWithNoContacts',
  );

  for (const engagement of report.systemEngagementReports) {
    lines.push(
      [
        engagement.agentId,
        csvCell(engagement.agentLabel),
        engagement.campaignId,
        csvCell(engagement.campaignName),
        engagement.runs,
        engagement.wins,
        engagement.runsWithFrontInvestment,
        engagement.runsWithFrontUpgrade,
        engagement.runsWithAccordBrokered,
        engagement.runsWithLedgerUse,
        engagement.runsWithContactService,
        engagement.runsWithBribe,
        engagement.runsWithLayLow,
        engagement.winsWithNoFronts,
        engagement.winsWithNoAccords,
        engagement.winsWithNoLedger,
        engagement.winsWithNoContacts,
      ].join(','),
    );
  }

  lines.push(
    '',
    'loop_warnings',
    'agent,agentLabel,campaignId,warningType,value,threshold,message',
  );

  for (const warning of report.loopWarnings) {
    lines.push(
      [
        warning.agentId,
        csvCell(warning.agentLabel),
        warning.campaignId,
        warning.warningType,
        warning.value.toFixed(3),
        warning.threshold.toFixed(3),
        csvCell(warning.message),
      ].join(','),
    );
  }

  return lines.join('\n');
}

function formatCampaignSummaryRow(summary: CampaignBatchSummary): string {
  return formatCampaignSummaryCells(summary).join(',');
}

function formatCampaignSummaryCells(summary: CampaignBatchSummary): string[] {
  return [
    summary.campaignId,
    csvCell(summary.campaignName),
    `${summary.runs}`,
    `${summary.wins}`,
    `${summary.losses}`,
    `${summary.incomplete}`,
    summary.winRate.toFixed(3),
    summary.averageWeeksPlayed.toFixed(2),
    summary.averageFinalPressures.dominion.toFixed(2),
    summary.averageFinalPressures.heat.toFixed(2),
    summary.averageFinalPressures.loyalty.toFixed(2),
    summary.averageFinalPressures.resources.toFixed(2),
    summary.averageFinalPressures.intel.toFixed(2),
    summary.averageFinalPressures.ruin.toFixed(2),
  ];
}

export function getLegalOrderOptions(state: GameState): LegalOrderOption[] {
  return selectLegalOrderOptions(state);
}

export function getLegalEventChoiceOptions(state: GameState): LegalEventChoiceOption[] {
  return selectLegalEventChoiceOptions(state);
}

type QueueAgentOrdersResult = {
  state: GameState;
  failureReason?: HarnessFailureReason;
};

function queueAgentOrders(
  state: GameState,
  agent: StrategyAgent,
  context: AgentDecisionContext,
  actionUsage: Record<ActionId, number>,
  targetUsage: Record<string, TargetRunStats>,
  ledgerStats: LedgerRunStats,
  contactStats: ContactRunStats,
  frontStats: FrontRunStats,
  factionStats: FactionRunStats,
  telemetryEntries: TelemetryEntry[],
  trace: HarnessTraceEntry[],
  collectTrace: boolean | undefined,
  handlerStats: HandlerRunStats,
): QueueAgentOrdersResult {
  let next = state;

  while (getCommandPointsRemaining(next) > 0) {
    const legalOptions = getLegalOrderOptions(next);
    const decision = getAgentOrderChoice(
      next,
      agent,
      legalOptions,
      context,
      handlerStats,
      trace,
      collectTrace,
    );

    if (!decision) {
      return {
        state: next,
        failureReason: agent.id === 'handler' ? 'invalid_recommendation' : undefined,
      };
    }

    const queued = queueOrder(next, {
      actionId: decision.actionId,
      assignedOperativeId: decision.assignedOperativeId,
      target: decision.target,
    });

    if (!queued.ok) {
      appendTrace(trace, collectTrace, next, `Queue failed: ${queued.error}.`);
      return {
        state: next,
        failureReason: agent.id === 'handler' ? 'invalid_recommendation' : undefined,
      };
    }

    next = queued.state;
    recordQueuedOrderTelemetry(telemetryEntries, next.week, decision);
    actionUsage[decision.actionId] += 1;
    recordTargetSelection(targetUsage, decision.target);
    recordLedgerOrderStats(ledgerStats, decision);
    recordContactOrderStats(contactStats, decision);
    recordFrontOrderStats(frontStats, decision);
    recordFactionOrderStats(factionStats, decision);
    recordFactionSnapshot(factionStats, next);
    appendTrace(trace, collectTrace, next, `Queued order: ${decision.preview.label}.`);
  }

  return { state: next };
}

function getAgentOrderChoice(
  state: GameState,
  agent: StrategyAgent,
  legalOptions: readonly LegalOrderOption[],
  context: AgentDecisionContext,
  handlerStats: HandlerRunStats,
  trace: HarnessTraceEntry[],
  collectTrace: boolean | undefined,
): LegalOrderOption | undefined {
  if (agent.id !== 'handler') {
    return agent.chooseOrder(state, legalOptions, context);
  }

  const decision = chooseHandlerOrder(state, legalOptions);
  recordHandlerRecommendation(handlerStats, decision.recommendation.confidence);
  handlerStats.invalidRecommendationCount += decision.invalidRecommendationCount;

  if (decision.invalidRecommendationCount > 0 || !decision.order) {
    const invalidReasons = decision.recommendation.invalidRecommendations
      .map((invalid) => invalid.reason)
      .join('; ');
    appendTrace(
      trace,
      collectTrace,
      state,
      `Handler command recommendation could not be applied${
        invalidReasons ? `: ${invalidReasons}` : '.'
      }`,
    );
    return undefined;
  }

  return decision.order;
}

function getAgentEventChoice(
  state: GameState,
  agent: StrategyAgent,
  legalOptions: readonly LegalEventChoiceOption[],
  context: AgentDecisionContext,
  handlerStats: HandlerRunStats,
  trace: HarnessTraceEntry[],
  collectTrace: boolean | undefined,
): LegalEventChoiceOption | undefined {
  if (agent.id !== 'handler') {
    return agent.chooseEventChoice(state, legalOptions, context);
  }

  const decision = chooseHandlerEventChoice(state, legalOptions);
  recordHandlerRecommendation(handlerStats, decision.recommendation.confidence);
  handlerStats.invalidRecommendationCount += decision.invalidRecommendationCount;

  if (decision.invalidRecommendationCount > 0 || !decision.eventChoice) {
    const invalidReasons = decision.recommendation.invalidRecommendations
      .map((invalid) => invalid.reason)
      .join('; ');
    appendTrace(
      trace,
      collectTrace,
      state,
      `Handler event recommendation could not be applied${
        invalidReasons ? `: ${invalidReasons}` : '.'
      }`,
    );
    return undefined;
  }

  return decision.eventChoice;
}

function createHandlerRunStats(): HandlerRunStats {
  return {
    invalidRecommendationCount: 0,
    decisionCount: 0,
    softlockCount: 0,
    confidenceCounts: {
      high: 0,
      medium: 0,
      low: 0,
    },
  };
}

function recordHandlerRecommendation(
  handlerStats: HandlerRunStats,
  confidence: AdvisorConfidence,
): void {
  handlerStats.decisionCount += 1;
  handlerStats.confidenceCounts[confidence] += 1;
}

function summarizeAgentRuns(agent: StrategyAgent, runs: readonly HarnessRunResult[]): AgentBatchSummary {
  const pressureTotals = PRESSURE_IDS.reduce(
    (totals, pressure) => ({
      ...totals,
      [pressure]: 0,
    }),
    {} as Pressures,
  );
  const actionUsage = createEmptyActionUsage();
  const targetReportsByKey = new Map<string, TargetReport>();
  const eventChoiceUsage: Record<string, number> = {};
  const lossReasons: Partial<Record<HarnessFailureReason, number>> = {};
  const rivalPressureTotals = createEmptyRivalPressureTotals();
  const districtTotals = createEmptyDistrictTotals();
  const contextualEvents = createEmptyContextualEventCounts();
  const rosterCompositionReports = new Map<string, RosterCompositionReport>();
  const operativePresenceReports = new Map<OperativeId, OperativePresenceReport>();
  const operativeRecruitmentReports = new Map<OperativeId, OperativeRecruitmentReport>();
  const operativeUsageReports = new Map<OperativeId, OperativeUsageReport>();
  const operativeStressTotals = new Map<
    OperativeId,
    OperativeStressReport & { finalStressSamples: number; highestStressSamples: number }
  >();
  const operativeDangerReports = new Map<OperativeId, OperativeDangerReport>();
  const operativeEventReports = new Map<string, OperativeEventReport>();
  const hirePoolSelectionReports = new Map<OperativeId, HirePoolSelectionReport>();
  const ledgerSummaryTotals = createEmptyLedgerSummaryTotals();
  const ledgerUsageReports = new Map<LedgerEntryDefinitionId, LedgerUsageReport>();
  const ledgerOutcomeReports = new Map<number, LedgerOutcomeReport & { pressureTotals: Pressures }>();
  const secretDiscoveryTotals = createEmptySecretDiscoveryTotals();
  const ledgerEventReports = new Map<EventId, LedgerEventReport>();
  const contactSummaryTotals = createEmptyContactSummaryTotals();
  const contactUsageReports = new Map<string, ContactUsageReport>();
  const contactOutcomeReports = new Map<ContactId, ContactOutcomeReport>();
  const contactEventReports = new Map<EventId, ContactEventReport>();
  const contactLedgerReports = new Map<string, ContactLedgerReport>();
  const contactSetReports = new Map<string, ContactSetReport & { burnedContacts: number }>();
  const frontSummaryTotals = createEmptyFrontSummaryTotals();
  const frontOutcomeReports = new Map<FrontDefinitionId, FrontOutcomeReport>();
  const frontEventReports = new Map<EventId, FrontEventReport>();
  const frontOpportunitySetReports = new Map<
    string,
    FrontOpportunitySetReport & { ownedFronts: number }
  >();
  const frontExposureBandReports = new Map<
    FrontExposureBand,
    FrontExposureBandReport & { ownedFronts: number }
  >();
  const factionSummaryTotals = createEmptyFactionSummaryTotals();
  const accordUsageReports = new Map<AccordId, AccordUsageReport>();
  const factionOutcomeReports = new Map<FactionId, FactionOutcomeReport>();
  const factionEventReports = new Map<EventId, FactionEventReport>();
  const factionSetReports = new Map<
    string,
    FactionSetReport & { brokerAccordUses: number }
  >();
  let weeksTotal = 0;
  let wins = 0;
  let losses = 0;
  let incomplete = 0;

  for (const run of runs) {
    weeksTotal += run.weeksPlayed;

    if (run.outcome === 'victory') {
      wins += 1;
    } else if (run.outcome === 'loss') {
      losses += 1;
    } else {
      incomplete += 1;
    }

    if (run.reason && run.outcome !== 'victory') {
      lossReasons[run.reason] = (lossReasons[run.reason] ?? 0) + 1;
    }

    for (const pressure of PRESSURE_IDS) {
      pressureTotals[pressure] += run.finalState.pressures[pressure];
    }

    for (const rival of RIVAL_TERRITORY_RIVALS) {
      rivalPressureTotals[rival.id] += run.finalState.rivals[rival.id].pressure;
    }

    for (const district of RIVAL_TERRITORY_DISTRICTS) {
      districtTotals[district.id].control += run.finalState.districts[district.id].control;
      districtTotals[district.id].heat += run.finalState.districts[district.id].heat;
    }

    for (const action of DISTRICT_ZERO_ACTIONS) {
      actionUsage[action.id] += run.actionUsage[action.id];
    }

    for (const [key, target] of Object.entries(run.targetUsage)) {
      const current = targetReportsByKey.get(key) ?? {
        targetType: target.targetType,
        targetId: target.targetId,
        selections: 0,
        complications: 0,
        targetLabel: getTargetReportLabel(target),
        complicationRate: 0,
        wins: 0,
        losses: 0,
      };
      current.selections += target.selections;
      current.complications += target.complications;

      if (run.outcome === 'victory') {
        current.wins += 1;
      } else if (run.outcome === 'loss') {
        current.losses += 1;
      }

      targetReportsByKey.set(key, current);
    }

    for (const [choiceId, count] of Object.entries(run.eventChoiceUsage)) {
      eventChoiceUsage[choiceId] = (eventChoiceUsage[choiceId] ?? 0) + count;
    }

    addContextualEventCounts(contextualEvents, run.contextualEvents);
    addRosterCompositionReport(rosterCompositionReports, run);
    addOperativePresenceReports(operativePresenceReports, run);
    addOperativeRecruitmentReports(operativeRecruitmentReports, run);
    addOperativeUsageReports(operativeUsageReports, run, runs.length);
    addOperativeStressReports(operativeStressTotals, run);
    addOperativeDangerReports(operativeDangerReports, run, runs.length);
    addOperativeEventReports(operativeEventReports, run);
    addHirePoolSelectionReports(hirePoolSelectionReports, run);
    addLedgerSummaryTotals(ledgerSummaryTotals, run.ledgerStats);
    addLedgerUsageReports(ledgerUsageReports, run);
    addLedgerOutcomeReports(ledgerOutcomeReports, run);
    addSecretDiscoveryTotals(secretDiscoveryTotals, run.ledgerStats);
    addLedgerEventReports(ledgerEventReports, run.ledgerStats);
    addContactSummaryTotals(contactSummaryTotals, run.contactStats);
    addContactUsageReports(contactUsageReports, run);
    addContactOutcomeReports(contactOutcomeReports, run);
    addContactEventReports(contactEventReports, run.contactStats);
    addContactLedgerReports(contactLedgerReports, run);
    addContactSetReports(contactSetReports, run);
    addFrontSummaryTotals(frontSummaryTotals, run.frontStats);
    addFrontOutcomeReports(frontOutcomeReports, run);
    addFrontEventReports(frontEventReports, run.frontStats);
    addFrontOpportunitySetReports(frontOpportunitySetReports, run);
    addFrontExposureBandReports(frontExposureBandReports, run);
    addFactionSummaryTotals(factionSummaryTotals, run.factionStats);
    addAccordUsageReports(accordUsageReports, run);
    addFactionOutcomeReports(factionOutcomeReports, run);
    addFactionEventReports(factionEventReports, run.factionStats);
    addFactionSetReports(factionSetReports, run);
  }

  const targetReports = [...targetReportsByKey.values()]
    .map((target) => ({
      ...target,
      complicationRate:
        target.selections > 0 ? target.complications / target.selections : 0,
    }))
    .sort((left, right) => left.targetLabel.localeCompare(right.targetLabel));
  const analyticsReports = buildAnalyticsReportSet(runs);

  return {
    agentId: agent.id,
    agentLabel: agent.label,
    runs: runs.length,
    wins,
    losses,
    incomplete,
    winRate: runs.length > 0 ? wins / runs.length : 0,
    averageWeeksPlayed: runs.length > 0 ? weeksTotal / runs.length : 0,
    averageFinalPressures: averagePressures(pressureTotals, runs.length),
    lossReasons,
    actionUsage,
    targetReports,
    mostSelectedTarget: selectMostSelectedTarget(targetReports),
    mostDangerousTarget: selectMostDangerousTarget(targetReports),
    eventChoiceUsage,
    averageFinalRivalPressures: averageRivalPressures(rivalPressureTotals, runs.length),
    averageFinalDistricts: averageDistricts(districtTotals, runs.length),
    contextualEvents,
    rosterCompositionReports: finalizeRosterCompositionReports(rosterCompositionReports),
    operativePresenceReports: sortByOperativeName([...operativePresenceReports.values()]),
    operativeRecruitmentReports: sortByOperativeName([...operativeRecruitmentReports.values()]),
    operativeUsageReports: sortByOperativeName([...operativeUsageReports.values()]),
    operativeStressReports: finalizeOperativeStressReports(operativeStressTotals),
    operativeDangerReports: sortByOperativeName([...operativeDangerReports.values()]),
    operativeEventReports: sortOperativeEventReports([...operativeEventReports.values()]),
    hirePoolSelectionReports: sortByOperativeName([...hirePoolSelectionReports.values()]),
    ledgerSummary: finalizeLedgerSummaryReport(ledgerSummaryTotals, runs.length),
    ledgerUsageReports: sortLedgerUsageReports([...ledgerUsageReports.values()]),
    ledgerOutcomeReports: finalizeLedgerOutcomeReports(ledgerOutcomeReports),
    secretDiscoveryReport: finalizeSecretDiscoveryReport(secretDiscoveryTotals),
    ledgerEventReports: sortLedgerEventReports([...ledgerEventReports.values()]),
    contactSummary: finalizeContactSummaryReport(contactSummaryTotals, runs.length),
    contactUsageReports: sortContactUsageReports([...contactUsageReports.values()]),
    contactOutcomeReports: sortContactOutcomeReports([...contactOutcomeReports.values()]),
    contactEventReports: sortContactEventReports([...contactEventReports.values()]),
    contactLedgerReports: sortContactLedgerReports([...contactLedgerReports.values()]),
    contactSetReports: finalizeContactSetReports(contactSetReports),
    frontSummary: finalizeFrontSummaryReport(frontSummaryTotals, runs.length),
    frontOutcomeReports: sortFrontOutcomeReports([...frontOutcomeReports.values()]),
    frontEventReports: sortFrontEventReports([...frontEventReports.values()]),
    frontOpportunitySetReports: finalizeFrontOpportunitySetReports(frontOpportunitySetReports),
    frontExposureBandReports: finalizeFrontExposureBandReports(frontExposureBandReports),
    factionSummary: finalizeFactionSummaryReport(factionSummaryTotals, runs.length),
    accordUsageReports: sortAccordUsageReports([...accordUsageReports.values()]),
    factionOutcomeReports: sortFactionOutcomeReports([...factionOutcomeReports.values()]),
    factionEventReports: sortFactionEventReports([...factionEventReports.values()]),
    factionSetReports: finalizeFactionSetReports(factionSetReports),
    ...analyticsReports,
  };
}

function buildAnalyticsReportSet(runs: readonly HarnessRunResult[]): AnalyticsReportSet {
  const reportInput = runs.map(toAnalyticsRunReportInput);
  const commandUsageReports = buildCommandUsageReports(reportInput);
  const commandPairReports = buildCommandPairReports(reportInput);
  const sourceBreakdownReports = buildSourceBreakdownReports(reportInput);
  const systemEngagementReports = buildSystemEngagementReports(reportInput);
  const loopWarnings = buildLoopWarningReports({
    commandUsageReports,
    commandPairReports,
    systemEngagementReports,
  });
  const strategicFingerprintReports = buildStrategicFingerprintReports({
    commandUsageReports,
    commandPairReports,
    sourceBreakdownReports,
    systemEngagementReports,
    loopWarnings,
  });

  return {
    strategicFingerprintReports,
    commandUsageReports,
    commandPairReports,
    sourceBreakdownReports,
    systemEngagementReports,
    loopWarnings,
  };
}

function toAnalyticsRunReportInput(run: HarnessRunResult): AnalyticsRunReportInput {
  const campaignId = run.finalState.campaign.tensionId;

  return {
    agentId: run.agentId,
    agentLabel: run.agentLabel,
    campaignId,
    campaignName: getCampaignName(campaignId),
    outcome: run.outcome,
    telemetry: run.telemetry,
  };
}

type CampaignSummaryAccumulator = {
  campaignId: CampaignTensionId;
  campaignName: string;
  runs: number;
  wins: number;
  losses: number;
  incomplete: number;
  weeksPlayed: number;
  pressureTotals: Pressures;
};

type CampaignAgentSummaryAccumulator = CampaignSummaryAccumulator & {
  agentId: string;
  agentLabel: string;
};

type CampaignSystemUsageAccumulator = {
  campaignId: CampaignTensionId;
  campaignName: string;
  agentId: string;
  runs: number;
  brokerAccordUses: number;
  manageContactUses: number;
  frontEstablishments: number;
  frontUpgrades: number;
  frontLayLowOrders: number;
  ledgerDiscoveries: number;
  ledgerUses: number;
  secretDiscoveries: number;
  factionEvents: number;
  frontEvents: number;
  contactEvents: number;
  operativeEvents: number;
};

function summarizeCampaignRuns(runs: readonly HarnessRunResult[]): CampaignBatchSummary[] {
  const reports = new Map<CampaignTensionId, CampaignSummaryAccumulator>();

  for (const run of runs) {
    addCampaignSummaryRun(reports, run);
  }

  return sortCampaignReports([...reports.values()].map(finalizeCampaignSummary));
}

function summarizeCampaignAgentRuns(runs: readonly HarnessRunResult[]): CampaignAgentBatchSummary[] {
  const reports = new Map<string, CampaignAgentSummaryAccumulator>();

  for (const run of runs) {
    const campaignId = run.finalState.campaign.tensionId;
    const key = `${run.agentId}:${campaignId}`;
    const current = reports.get(key) ?? {
      ...createCampaignSummaryAccumulator(campaignId),
      agentId: run.agentId,
      agentLabel: run.agentLabel,
    };
    addRunToCampaignSummary(current, run);
    reports.set(key, current);
  }

  return [...reports.values()]
    .map((report) => ({
      ...finalizeCampaignSummary(report),
      agentId: report.agentId,
      agentLabel: report.agentLabel,
    }))
    .sort(
      (left, right) =>
        left.agentId.localeCompare(right.agentId) ||
        compareCampaignIds(left.campaignId, right.campaignId),
    );
}

function summarizeCampaignLossCauses(
  runs: readonly HarnessRunResult[],
): CampaignLossCauseReport[] {
  const grouped = new Map<string, CampaignLossCauseReport>();
  const campaignAgentKeys = new Map<string, { campaignId: CampaignTensionId; agentId: string }>();

  for (const run of runs) {
    const campaignId = run.finalState.campaign.tensionId;
    campaignAgentKeys.set(`${campaignId}:${run.agentId}`, { campaignId, agentId: run.agentId });

    if (!run.reason || run.outcome === 'victory') {
      continue;
    }

    const key = `${campaignId}:${run.agentId}:${run.reason}`;
    const current = grouped.get(key) ?? {
      campaignId,
      campaignName: getCampaignName(campaignId),
      agentId: run.agentId,
      cause: run.reason,
      count: 0,
    };
    current.count += 1;
    grouped.set(key, current);
  }

  for (const { campaignId, agentId } of campaignAgentKeys.values()) {
    const hasLoss = [...grouped.values()].some(
      (report) => report.campaignId === campaignId && report.agentId === agentId,
    );

    if (!hasLoss) {
      grouped.set(`${campaignId}:${agentId}:none`, {
        campaignId,
        campaignName: getCampaignName(campaignId),
        agentId,
        cause: 'none',
        count: 0,
      });
    }
  }

  return [...grouped.values()].sort(
    (left, right) =>
      compareCampaignIds(left.campaignId, right.campaignId) ||
      left.agentId.localeCompare(right.agentId) ||
      left.cause.localeCompare(right.cause),
  );
}

function summarizeCampaignActionUsage(
  runs: readonly HarnessRunResult[],
): CampaignActionUsageReport[] {
  const grouped = new Map<string, { runs: number; uses: Record<ActionId, number> }>();

  for (const run of runs) {
    const campaignId = run.finalState.campaign.tensionId;
    const key = `${campaignId}:${run.agentId}`;
    const current = grouped.get(key) ?? {
      runs: 0,
      uses: createEmptyActionUsage(),
    };
    current.runs += 1;

    for (const action of DISTRICT_ZERO_ACTIONS) {
      current.uses[action.id] += run.actionUsage[action.id];
    }

    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .flatMap(([key, value]) => {
      const [campaignId, agentId] = key.split(':') as [CampaignTensionId, string];

      return DISTRICT_ZERO_ACTIONS.map((action) => ({
        campaignId,
        campaignName: getCampaignName(campaignId),
        agentId,
        actionId: action.id,
        uses: value.uses[action.id],
        averageUses: averageCount(value.uses[action.id], value.runs),
      }));
    })
    .sort(
      (left, right) =>
        compareCampaignIds(left.campaignId, right.campaignId) ||
        left.agentId.localeCompare(right.agentId) ||
        left.actionId.localeCompare(right.actionId),
    );
}

function summarizeCampaignEvents(runs: readonly HarnessRunResult[]): CampaignEventReport[] {
  const campaignRuns = countRunsByCampaign(runs);
  const grouped = new Map<string, CampaignEventReport>();

  for (const run of runs) {
    const campaignId = run.finalState.campaign.tensionId;

    for (const entry of run.finalState.eventLog) {
      if (entry.type !== 'event_presented') {
        continue;
      }

      const key = `${campaignId}:${entry.title}`;
      const current = grouped.get(key) ?? {
        campaignId,
        campaignName: getCampaignName(campaignId),
        eventTitle: entry.title,
        presentations: 0,
        averagePresentations: 0,
      };
      current.presentations += 1;
      grouped.set(key, current);
    }
  }

  return [...grouped.values()]
    .map((event) => ({
      ...event,
      averagePresentations: averageCount(
        event.presentations,
        campaignRuns.get(event.campaignId) ?? 0,
      ),
    }))
    .sort(
      (left, right) =>
        compareCampaignIds(left.campaignId, right.campaignId) ||
        left.eventTitle.localeCompare(right.eventTitle),
    );
}

function summarizeCampaignSystemUsage(
  runs: readonly HarnessRunResult[],
): CampaignSystemUsageReport[] {
  const grouped = new Map<string, CampaignSystemUsageAccumulator>();

  for (const run of runs) {
    const campaignId = run.finalState.campaign.tensionId;
    const key = `${campaignId}:${run.agentId}`;
    const current = grouped.get(key) ?? {
      campaignId,
      campaignName: getCampaignName(campaignId),
      agentId: run.agentId,
      runs: 0,
      brokerAccordUses: 0,
      manageContactUses: 0,
      frontEstablishments: 0,
      frontUpgrades: 0,
      frontLayLowOrders: 0,
      ledgerDiscoveries: 0,
      ledgerUses: 0,
      secretDiscoveries: 0,
      factionEvents: 0,
      frontEvents: 0,
      contactEvents: 0,
      operativeEvents: 0,
    };
    current.runs += 1;
    current.brokerAccordUses += run.factionStats.brokerAccordOrders;
    current.manageContactUses += sumContactUses(run.contactStats);
    current.frontEstablishments += run.frontStats.establishOrders;
    current.frontUpgrades += run.frontStats.upgradeOrders;
    current.frontLayLowOrders += run.frontStats.layLowOrders;
    current.ledgerDiscoveries += run.ledgerStats.entriesCreated;
    current.ledgerUses += run.ledgerStats.entriesConsumed;
    current.secretDiscoveries += run.ledgerStats.secretDiscoveries;
    current.factionEvents += sumRecordValues(run.factionStats.factionEventsSelected);
    current.frontEvents += sumRecordValues(run.frontStats.frontEventsSelected);
    current.contactEvents += sumRecordValues(run.contactStats.contactEventsSelected);
    current.operativeEvents += sumOperativeEventSelections(run.operativeEventStats);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((usage) => ({
      campaignId: usage.campaignId,
      campaignName: usage.campaignName,
      agentId: usage.agentId,
      runs: usage.runs,
      averageBrokerAccordUses: averageCount(usage.brokerAccordUses, usage.runs),
      averageManageContactUses: averageCount(usage.manageContactUses, usage.runs),
      averageFrontEstablishments: averageCount(usage.frontEstablishments, usage.runs),
      averageFrontUpgrades: averageCount(usage.frontUpgrades, usage.runs),
      averageFrontLayLowOrders: averageCount(usage.frontLayLowOrders, usage.runs),
      averageLedgerDiscoveries: averageCount(usage.ledgerDiscoveries, usage.runs),
      averageLedgerUses: averageCount(usage.ledgerUses, usage.runs),
      averageSecretDiscoveries: averageCount(usage.secretDiscoveries, usage.runs),
      averageFactionEvents: averageCount(usage.factionEvents, usage.runs),
      averageFrontEvents: averageCount(usage.frontEvents, usage.runs),
      averageContactEvents: averageCount(usage.contactEvents, usage.runs),
      averageOperativeEvents: averageCount(usage.operativeEvents, usage.runs),
    }))
    .sort(
      (left, right) =>
        compareCampaignIds(left.campaignId, right.campaignId) ||
        left.agentId.localeCompare(right.agentId),
    );
}

function summarizeHandlerValidation(
  runs: readonly HarnessRunResult[],
): HandlerValidationSummaryReport[] {
  const handlerRuns = getHandlerRuns(runs);

  if (handlerRuns.length === 0) {
    return [];
  }

  const wins = handlerRuns.filter((run) => run.outcome === 'victory').length;
  const losses = handlerRuns.filter((run) => run.outcome === 'loss').length;
  const incomplete = handlerRuns.filter((run) => run.outcome === 'incomplete').length;

  return [
    {
      agentId: 'handler',
      agentLabel: handlerRuns[0]?.agentLabel ?? 'HandlerBot',
      runs: handlerRuns.length,
      wins,
      losses,
      incomplete,
      winRate: handlerRuns.length > 0 ? wins / handlerRuns.length : 0,
      invalidRecommendations: sumHandlerInvalidRecommendations(handlerRuns),
      softlocks: countHandlerReason(handlerRuns, 'softlock'),
      stalls: countHandlerReason(handlerRuns, 'agent_stalled'),
    },
  ];
}

function summarizeHandlerCampaigns(
  runs: readonly HarnessRunResult[],
): HandlerCampaignSummaryReport[] {
  const reports = new Map<CampaignTensionId, HandlerCampaignSummaryReport>();

  for (const run of getHandlerRuns(runs)) {
    const campaignId = run.finalState.campaign.tensionId;
    const current = reports.get(campaignId) ?? {
      campaignId,
      campaignName: getCampaignName(campaignId),
      runs: 0,
      wins: 0,
      losses: 0,
      incomplete: 0,
      winRate: 0,
      invalidRecommendations: 0,
      softlocks: 0,
      stalls: 0,
    };
    current.runs += 1;
    current.wins += run.outcome === 'victory' ? 1 : 0;
    current.losses += run.outcome === 'loss' ? 1 : 0;
    current.incomplete += run.outcome === 'incomplete' ? 1 : 0;
    current.invalidRecommendations += run.handlerStats?.invalidRecommendationCount ?? 0;
    current.softlocks += run.reason === 'softlock' ? 1 : 0;
    current.stalls += run.reason === 'agent_stalled' ? 1 : 0;
    current.winRate = current.runs > 0 ? current.wins / current.runs : 0;
    reports.set(campaignId, current);
  }

  return sortCampaignReports([...reports.values()]);
}

function summarizeHandlerLossCauses(
  runs: readonly HarnessRunResult[],
): HandlerLossCauseReport[] {
  const grouped = new Map<HarnessFailureReason | 'none', HandlerLossCauseReport>();

  for (const run of getHandlerRuns(runs)) {
    if (!run.reason || run.outcome === 'victory') {
      continue;
    }

    const current = grouped.get(run.reason) ?? {
      agentId: run.agentId,
      cause: run.reason,
      count: 0,
    };
    current.count += 1;
    grouped.set(run.reason, current);
  }

  if (getHandlerRuns(runs).length > 0 && grouped.size === 0) {
    grouped.set('none', {
      agentId: 'handler',
      cause: 'none',
      count: 0,
    });
  }

  return [...grouped.values()].sort((left, right) => left.cause.localeCompare(right.cause));
}

function summarizeHandlerInvalidRecommendations(
  runs: readonly HarnessRunResult[],
): HandlerInvalidRecommendationReport[] {
  return getHandlerRuns(runs)
    .filter((run) => (run.handlerStats?.invalidRecommendationCount ?? 0) > 0)
    .map((run) => {
      const reason: HandlerInvalidRecommendationReport['reason'] = run.reason ?? 'none';

      return {
        agentId: run.agentId,
        seed: run.seed,
        campaignId: run.finalState.campaign.tensionId,
        runMode: run.finalState.run.mode,
        outcome: run.outcome,
        reason,
        invalidRecommendations: run.handlerStats?.invalidRecommendationCount ?? 0,
      };
    })
    .sort(
      (left, right) =>
        compareCampaignIds(left.campaignId, right.campaignId) ||
        left.seed.localeCompare(right.seed),
    );
}

function summarizeHandlerConfidenceDistribution(
  runs: readonly HarnessRunResult[],
): HandlerConfidenceDistributionReport[] {
  const totals: Record<AdvisorConfidence, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const run of getHandlerRuns(runs)) {
    for (const confidence of Object.keys(totals) as AdvisorConfidence[]) {
      totals[confidence] += run.handlerStats?.confidenceCounts[confidence] ?? 0;
    }
  }

  const totalDecisions = Object.values(totals).reduce((total, count) => total + count, 0);

  return (Object.keys(totals) as AdvisorConfidence[]).map((confidence) => ({
    agentId: 'handler',
    confidence,
    count: totals[confidence],
    share: totalDecisions > 0 ? totals[confidence] / totalDecisions : 0,
  }));
}

function summarizeHandlerTrainingValidation(
  runs: readonly HarnessRunResult[],
): HandlerTrainingValidationReport[] {
  const trainingRuns = getHandlerRuns(runs).filter(
    (run) => run.finalState.run.mode === 'training',
  );

  if (trainingRuns.length === 0) {
    return [];
  }

  const wins = trainingRuns.filter((run) => run.outcome === 'victory').length;
  const losses = trainingRuns.filter((run) => run.outcome === 'loss').length;
  const incomplete = trainingRuns.filter((run) => run.outcome === 'incomplete').length;
  const invalidRecommendations = sumHandlerInvalidRecommendations(trainingRuns);
  const softlocks = countHandlerReason(trainingRuns, 'softlock');
  const stalls = countHandlerReason(trainingRuns, 'agent_stalled');

  return [
    {
      agentId: 'handler',
      runs: trainingRuns.length,
      wins,
      losses,
      incomplete,
      invalidRecommendations,
      softlocks,
      stalls,
      passed:
        wins === trainingRuns.length &&
        invalidRecommendations === 0 &&
        softlocks === 0 &&
        stalls === 0,
    },
  ];
}

function summarizeHandlerOperatorDelta(
  campaignAgentSummaries: readonly CampaignAgentBatchSummary[],
): HandlerOperatorDeltaReport[] {
  const reports: HandlerOperatorDeltaReport[] = [];

  for (const campaign of CAMPAIGN_TENSION_DEFINITIONS) {
    const handler = campaignAgentSummaries.find(
      (summary) => summary.campaignId === campaign.id && summary.agentId === 'handler',
    );
    const operator = campaignAgentSummaries.find(
      (summary) => summary.campaignId === campaign.id && summary.agentId === 'operator',
    );

    if (!handler || !operator) {
      continue;
    }

    reports.push(
      createHandlerOperatorDelta(campaign.id, 'winRate', handler.winRate, operator.winRate),
      createHandlerOperatorDelta(
        campaign.id,
        'averageWeeksPlayed',
        handler.averageWeeksPlayed,
        operator.averageWeeksPlayed,
      ),
      createHandlerOperatorDelta(
        campaign.id,
        'averageDominion',
        handler.averageFinalPressures.dominion,
        operator.averageFinalPressures.dominion,
      ),
      createHandlerOperatorDelta(
        campaign.id,
        'averageHeat',
        handler.averageFinalPressures.heat,
        operator.averageFinalPressures.heat,
      ),
    );
  }

  return reports;
}

function createHandlerOperatorDelta(
  campaignId: CampaignTensionId,
  metric: HandlerOperatorDeltaReport['metric'],
  handlerValue: number,
  operatorValue: number,
): HandlerOperatorDeltaReport {
  return {
    campaignId,
    campaignName: getCampaignName(campaignId),
    metric,
    handlerValue,
    operatorValue,
    delta: handlerValue - operatorValue,
  };
}

function getHandlerRuns(runs: readonly HarnessRunResult[]): HarnessRunResult[] {
  return runs.filter((run) => run.agentId === 'handler');
}

function sumHandlerInvalidRecommendations(runs: readonly HarnessRunResult[]): number {
  return runs.reduce(
    (total, run) => total + (run.handlerStats?.invalidRecommendationCount ?? 0),
    0,
  );
}

function countHandlerReason(
  runs: readonly HarnessRunResult[],
  reason: HarnessFailureReason,
): number {
  return runs.filter((run) => run.reason === reason).length;
}

function addCampaignSummaryRun(
  reports: Map<CampaignTensionId, CampaignSummaryAccumulator>,
  run: HarnessRunResult,
): void {
  const campaignId = run.finalState.campaign.tensionId;
  const current = reports.get(campaignId) ?? createCampaignSummaryAccumulator(campaignId);
  addRunToCampaignSummary(current, run);
  reports.set(campaignId, current);
}

function createCampaignSummaryAccumulator(
  campaignId: CampaignTensionId,
): CampaignSummaryAccumulator {
  return {
    campaignId,
    campaignName: getCampaignName(campaignId),
    runs: 0,
    wins: 0,
    losses: 0,
    incomplete: 0,
    weeksPlayed: 0,
    pressureTotals: createEmptyPressureTotals(),
  };
}

function addRunToCampaignSummary(
  summary: CampaignSummaryAccumulator,
  run: HarnessRunResult,
): void {
  summary.runs += 1;
  summary.wins += run.outcome === 'victory' ? 1 : 0;
  summary.losses += run.outcome === 'loss' ? 1 : 0;
  summary.incomplete += run.outcome === 'incomplete' ? 1 : 0;
  summary.weeksPlayed += run.weeksPlayed;

  for (const pressure of PRESSURE_IDS) {
    summary.pressureTotals[pressure] += run.finalState.pressures[pressure];
  }
}

function finalizeCampaignSummary(summary: CampaignSummaryAccumulator): CampaignBatchSummary {
  return {
    campaignId: summary.campaignId,
    campaignName: summary.campaignName,
    runs: summary.runs,
    wins: summary.wins,
    losses: summary.losses,
    incomplete: summary.incomplete,
    winRate: summary.runs > 0 ? summary.wins / summary.runs : 0,
    averageWeeksPlayed: averageCount(summary.weeksPlayed, summary.runs),
    averageFinalPressures: averagePressures(summary.pressureTotals, summary.runs),
  };
}

function sortCampaignReports<T extends { campaignId: CampaignTensionId }>(reports: T[]): T[] {
  return reports.sort((left, right) => compareCampaignIds(left.campaignId, right.campaignId));
}

function countRunsByCampaign(
  runs: readonly HarnessRunResult[],
): Map<CampaignTensionId, number> {
  const counts = new Map<CampaignTensionId, number>();

  for (const run of runs) {
    const campaignId = run.finalState.campaign.tensionId;
    counts.set(campaignId, (counts.get(campaignId) ?? 0) + 1);
  }

  return counts;
}

function getCampaignName(campaignId: CampaignTensionId): string {
  return (
    CAMPAIGN_TENSION_DEFINITIONS.find((campaign) => campaign.id === campaignId)?.name ??
    campaignId
  );
}

function compareCampaignIds(left: CampaignTensionId, right: CampaignTensionId): number {
  return campaignSortIndex(left) - campaignSortIndex(right) || left.localeCompare(right);
}

function campaignSortIndex(campaignId: CampaignTensionId): number {
  const index = CAMPAIGN_TENSION_DEFINITIONS.findIndex(
    (campaign) => campaign.id === campaignId,
  );

  return index >= 0 ? index : CAMPAIGN_TENSION_DEFINITIONS.length;
}

function sumContactUses(stats: ContactRunStats): number {
  return Object.values(stats.usage).reduce((sum, usage) => sum + usage.uses, 0);
}

function sumRecordValues(values: Partial<Record<string, number>>): number {
  let sum = 0;

  for (const value of Object.values(values)) {
    sum += value ?? 0;
  }

  return sum;
}

function sumOperativeEventSelections(
  stats: Partial<Record<EventId, OperativeEventRunStats>>,
): number {
  return Object.values(stats).reduce((sum, event) => sum + (event?.selectedCount ?? 0), 0);
}

function averageCount(value: number, runs: number): number {
  return runs > 0 ? value / runs : 0;
}

export function getRosterCompositionKey(operativeIds: readonly OperativeId[]): string {
  return [...operativeIds].sort().join('+');
}

function createInitialOperativeStats(
  startingRosterIds: readonly OperativeId[],
  initialHirePoolIds: readonly OperativeId[],
): Record<OperativeId, OperativeRunStats> {
  const startingIds = new Set(startingRosterIds);
  const hirePoolIds = new Set(initialHirePoolIds);

  return ROSTER_OPERATIVES.reduce(
    (stats, operative) => ({
      ...stats,
      [operative.id]: {
        operativeId: operative.id,
        started: startingIds.has(operative.id),
        recruited: false,
        hirePoolPresent: hirePoolIds.has(operative.id),
        assignments: 0,
        complications: 0,
        heatContribution: 0,
        ruinContribution: 0,
        eventEligibleCount: 0,
        eventSelectedCount: 0,
      },
    }),
    {} as Record<OperativeId, OperativeRunStats>,
  );
}

function recordOperativeOrderStats(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  resolutions: readonly OrderResolutionDiagnostic[],
  state: GameState,
): void {
  for (const resolution of resolutions) {
    if (
      resolution.order.actionId === 'recruit_operative' &&
      resolution.order.target?.type === 'recruit'
    ) {
      const recruitedId = resolution.order.target.id;

      if (state.operatives.some((operative) => operative.id === recruitedId)) {
        operativeStats[recruitedId as OperativeId].recruited = true;
      }
    }

    const operativeId = resolution.order.assignedOperativeId;

    if (!operativeId) {
      continue;
    }

    const stats = operativeStats[operativeId as OperativeId];
    stats.assignments += 1;
    stats.complications += resolution.complication ? 1 : 0;
    stats.heatContribution += resolution.resolvedDelta.heat ?? 0;
    stats.ruinContribution += resolution.resolvedDelta.ruin ?? 0;
  }

  updateOperativeStressSnapshots(operativeStats, state);
}

function recordOperativeEventEligibility(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  operativeEventStats: Partial<Record<EventId, OperativeEventRunStats>>,
  candidates: readonly WeightedEvent[],
): void {
  for (const candidate of candidates) {
    if (candidate.event.kind !== 'operative') {
      continue;
    }

    operativeStats[candidate.event.operativeId].eventEligibleCount += 1;
    getOperativeEventRunStats(
      operativeEventStats,
      candidate.event.id,
      candidate.event.operativeId,
    ).eligibleCount += 1;
  }
}

function recordOperativeEventSelection(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  operativeEventStats: Partial<Record<EventId, OperativeEventRunStats>>,
  selection: EventSelection,
): void {
  if (selection.definition.kind !== 'operative') {
    return;
  }

  operativeStats[selection.definition.operativeId].eventSelectedCount += 1;
  getOperativeEventRunStats(
    operativeEventStats,
    selection.definition.id,
    selection.definition.operativeId,
  ).selectedCount += 1;
}

function recordOperativeEventChoiceContribution(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  state: GameState,
  choice: EventChoiceDefinition,
): void {
  const pendingEvent = state.pendingEvent;

  if (!pendingEvent) {
    return;
  }

  const definition = getEventDefinition(pendingEvent.definitionId);

  if (definition?.kind !== 'operative') {
    return;
  }

  const delta = getEventChoicePressureDelta(choice);
  const stats = operativeStats[definition.operativeId];
  stats.heatContribution += delta.heat ?? 0;
  stats.ruinContribution += delta.ruin ?? 0;
}

function finalizeOperativeStats(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  state: GameState,
): void {
  updateOperativeStressSnapshots(operativeStats, state);

  for (const operative of state.operatives) {
    const stats = operativeStats[operative.id];
    stats.finalStress = operative.stress;
    stats.finalStressTier = getStressTier(operative.stress);
  }
}

function updateOperativeStressSnapshots(
  operativeStats: Record<OperativeId, OperativeRunStats>,
  state: GameState,
): void {
  for (const operative of state.operatives) {
    const stats = operativeStats[operative.id];
    stats.highestStress = Math.max(stats.highestStress ?? operative.stress, operative.stress);
  }
}

function getOperativeEventRunStats(
  eventStats: Partial<Record<EventId, OperativeEventRunStats>>,
  eventId: EventId,
  operativeId: OperativeId,
): OperativeEventRunStats {
  eventStats[eventId] ??= {
    eventId,
    operativeId,
    eligibleCount: 0,
    selectedCount: 0,
  };

  return eventStats[eventId];
}

function getEventChoicePressureDelta(choice: EventChoiceDefinition): Partial<Pressures> {
  const delta: Partial<Pressures> = { ...choice.effects };

  if (choice.cost && !('type' in choice.cost)) {
    for (const pressure of PRESSURE_IDS) {
      const amount = choice.cost[pressure];

      if (amount !== undefined) {
        delta[pressure] = (delta[pressure] ?? 0) - amount;
      }
    }
  }

  return delta;
}

function createEmptyLedgerRunStats(): LedgerRunStats {
  return {
    entriesCreated: 0,
    secretsCreated: 0,
    debtsCreated: 0,
    favorsCreated: 0,
    entriesConsumed: 0,
    unresolvedDebts: 0,
    targetedGatherIntelOrders: 0,
    secretDiscoveries: 0,
    secretDefinitionsCreated: {},
    usage: {},
    ledgerEventEligibility: {},
    ledgerEventSelections: {},
  };
}

function recordLedgerOrderStats(stats: LedgerRunStats, decision: LegalOrderOption): void {
  if (
    decision.actionId === 'gather_intel' &&
    decision.target &&
    decision.target.type !== 'ledger' &&
    decision.target.type !== 'recruit' &&
    decision.target.type !== 'front_opportunity' &&
    decision.target.type !== 'front' &&
    decision.target.type !== 'faction'
  ) {
    stats.targetedGatherIntelOrders += 1;
  }
}

function recordLedgerEventStats(
  stats: LedgerRunStats,
  candidates: readonly WeightedEvent[],
  selection: EventSelection,
): void {
  for (const candidate of candidates) {
    if (!candidate.event.tags.includes('LEDGER')) {
      continue;
    }

    stats.ledgerEventEligibility[candidate.event.id] =
      (stats.ledgerEventEligibility[candidate.event.id] ?? 0) + 1;
  }

  if (selection.definition.tags.includes('LEDGER')) {
    stats.ledgerEventSelections[selection.definition.id] =
      (stats.ledgerEventSelections[selection.definition.id] ?? 0) + 1;
  }
}

function finalizeLedgerRunStats(stats: LedgerRunStats, state: GameState): void {
  for (const entry of state.ledger.entries) {
    const definition = getLedgerEntryDefinition(entry.definitionId);

    if (!definition) {
      continue;
    }

    stats.entriesCreated += 1;
    stats.entriesConsumed += entry.consumed ? 1 : 0;
    stats.unresolvedDebts += entry.kind === 'debt' && !entry.consumed ? 1 : 0;

    if (entry.kind === 'secret') {
      stats.secretsCreated += 1;
      stats.secretDefinitionsCreated[entry.definitionId] =
        (stats.secretDefinitionsCreated[entry.definitionId] ?? 0) + 1;

      if (entry.source.type === 'action' && entry.source.actionId === 'gather_intel') {
        stats.secretDiscoveries += 1;
      }
    } else if (entry.kind === 'debt') {
      stats.debtsCreated += 1;
    } else {
      stats.favorsCreated += 1;
    }

    const usage = stats.usage[entry.definitionId] ?? {
      kind: entry.kind,
      definitionId: entry.definitionId,
      name: definition.name,
      created: 0,
      consumed: 0,
      activeAtEnd: 0,
    };
    usage.created += 1;
    usage.consumed += entry.consumed ? 1 : 0;
    usage.activeAtEnd += entry.consumed ? 0 : 1;
    stats.usage[entry.definitionId] = usage;
  }
}

function createEmptyLedgerSummaryTotals(): LedgerSummaryReport {
  return {
    averageEntriesCreated: 0,
    averageSecretsCreated: 0,
    averageDebtsCreated: 0,
    averageFavorsCreated: 0,
    averageEntriesConsumed: 0,
    averageUnresolvedDebts: 0,
  };
}

function addLedgerSummaryTotals(totals: LedgerSummaryReport, stats: LedgerRunStats): void {
  totals.averageEntriesCreated += stats.entriesCreated;
  totals.averageSecretsCreated += stats.secretsCreated;
  totals.averageDebtsCreated += stats.debtsCreated;
  totals.averageFavorsCreated += stats.favorsCreated;
  totals.averageEntriesConsumed += stats.entriesConsumed;
  totals.averageUnresolvedDebts += stats.unresolvedDebts;
}

function finalizeLedgerSummaryReport(
  totals: LedgerSummaryReport,
  runs: number,
): LedgerSummaryReport {
  if (runs === 0) {
    return totals;
  }

  return {
    averageEntriesCreated: totals.averageEntriesCreated / runs,
    averageSecretsCreated: totals.averageSecretsCreated / runs,
    averageDebtsCreated: totals.averageDebtsCreated / runs,
    averageFavorsCreated: totals.averageFavorsCreated / runs,
    averageEntriesConsumed: totals.averageEntriesConsumed / runs,
    averageUnresolvedDebts: totals.averageUnresolvedDebts / runs,
  };
}

function addLedgerUsageReports(
  reports: Map<LedgerEntryDefinitionId, LedgerUsageReport>,
  run: HarnessRunResult,
): void {
  for (const usage of Object.values(run.ledgerStats.usage)) {
    const report = reports.get(usage.definitionId) ?? {
      ...usage,
      created: 0,
      consumed: 0,
      activeAtEnd: 0,
      wins: 0,
      losses: 0,
    };
    report.created += usage.created;
    report.consumed += usage.consumed;
    report.activeAtEnd += usage.activeAtEnd;
    report.wins += run.outcome === 'victory' ? 1 : 0;
    report.losses += run.outcome === 'loss' ? 1 : 0;
    reports.set(usage.definitionId, report);
  }
}

function addLedgerOutcomeReports(
  reports: Map<number, LedgerOutcomeReport & { pressureTotals: Pressures }>,
  run: HarnessRunResult,
): void {
  const debtCount = run.ledgerStats.unresolvedDebts;
  const report = reports.get(debtCount) ?? {
    debtCount,
    runs: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageWeeksPlayed: 0,
    averageFinalPressures: {
      dominion: 0,
      heat: 0,
      loyalty: 0,
      ruin: 0,
    },
    pressureTotals: createEmptyPressureTotals(),
  };
  report.runs += 1;
  report.wins += run.outcome === 'victory' ? 1 : 0;
  report.losses += run.outcome === 'loss' ? 1 : 0;
  report.averageWeeksPlayed += run.weeksPlayed;

  for (const pressure of PRESSURE_IDS) {
    report.pressureTotals[pressure] += run.finalState.pressures[pressure];
  }

  reports.set(debtCount, report);
}

function finalizeLedgerOutcomeReports(
  reports: Map<number, LedgerOutcomeReport & { pressureTotals: Pressures }>,
): LedgerOutcomeReport[] {
  return [...reports.values()]
    .map((report) => ({
      debtCount: report.debtCount,
      runs: report.runs,
      wins: report.wins,
      losses: report.losses,
      winRate: report.runs > 0 ? report.wins / report.runs : 0,
      averageWeeksPlayed: report.runs > 0 ? report.averageWeeksPlayed / report.runs : 0,
      averageFinalPressures: {
        dominion: report.runs > 0 ? report.pressureTotals.dominion / report.runs : 0,
        heat: report.runs > 0 ? report.pressureTotals.heat / report.runs : 0,
        loyalty: report.runs > 0 ? report.pressureTotals.loyalty / report.runs : 0,
        ruin: report.runs > 0 ? report.pressureTotals.ruin / report.runs : 0,
      },
    }))
    .sort((left, right) => left.debtCount - right.debtCount);
}

function createEmptySecretDiscoveryTotals(): SecretDiscoveryReport & {
  secretCounts: Partial<Record<LedgerEntryDefinitionId, number>>;
} {
  return {
    targetedGatherIntelOrders: 0,
    discoveries: 0,
    discoveryRate: 0,
    mostCommonSecret: '',
    secretCounts: {},
  };
}

function addSecretDiscoveryTotals(
  totals: SecretDiscoveryReport & {
    secretCounts: Partial<Record<LedgerEntryDefinitionId, number>>;
  },
  stats: LedgerRunStats,
): void {
  totals.targetedGatherIntelOrders += stats.targetedGatherIntelOrders;
  totals.discoveries += stats.secretDiscoveries;

  for (const [definitionId, count] of Object.entries(stats.secretDefinitionsCreated)) {
    const id = definitionId as LedgerEntryDefinitionId;
    totals.secretCounts[id] = (totals.secretCounts[id] ?? 0) + count;
  }
}

function finalizeSecretDiscoveryReport(
  totals: SecretDiscoveryReport & {
    secretCounts: Partial<Record<LedgerEntryDefinitionId, number>>;
  },
): SecretDiscoveryReport {
  const mostCommonSecretId = Object.entries(totals.secretCounts).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]?.[0] as LedgerEntryDefinitionId | undefined;

  return {
    targetedGatherIntelOrders: totals.targetedGatherIntelOrders,
    discoveries: totals.discoveries,
    discoveryRate:
      totals.targetedGatherIntelOrders > 0
        ? totals.discoveries / totals.targetedGatherIntelOrders
        : 0,
    mostCommonSecret: mostCommonSecretId
      ? getLedgerEntryDefinition(mostCommonSecretId)?.name ?? mostCommonSecretId
      : '',
  };
}

function addLedgerEventReports(
  reports: Map<EventId, LedgerEventReport>,
  stats: LedgerRunStats,
): void {
  const eventIds = new Set<EventId>([
    ...Object.keys(stats.ledgerEventEligibility),
    ...Object.keys(stats.ledgerEventSelections),
  ] as EventId[]);

  for (const eventId of eventIds) {
    const report = reports.get(eventId) ?? {
      eventId,
      eventTitle: getEventTitle(eventId),
      eligibleRuns: 0,
      selections: 0,
      selectionRate: 0,
    };
    report.eligibleRuns += stats.ledgerEventEligibility[eventId] ?? 0;
    report.selections += stats.ledgerEventSelections[eventId] ?? 0;
    reports.set(eventId, report);
  }
}

function sortLedgerUsageReports(reports: LedgerUsageReport[]): LedgerUsageReport[] {
  return reports.sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.name.localeCompare(right.name) ||
      left.definitionId.localeCompare(right.definitionId),
  );
}

function sortLedgerEventReports(reports: LedgerEventReport[]): LedgerEventReport[] {
  return reports
    .map((report) => ({
      ...report,
      selectionRate: report.eligibleRuns > 0 ? report.selections / report.eligibleRuns : 0,
    }))
    .sort((left, right) => left.eventTitle.localeCompare(right.eventTitle));
}

function createEmptyContactRunStats(state: GameState): ContactRunStats {
  return {
    activeContactIds: [...state.activeContactIds],
    usage: {},
    contactEventsEligible: {},
    contactEventsSelected: {},
    finalContacts: {} as Record<ContactId, ContactFinalRunStats>,
    ledgerLinks: {},
  };
}

function recordContactOrderStats(stats: ContactRunStats, decision: LegalOrderOption): void {
  const contact = decision.preview.contactUse;

  if (!contact?.ok) {
    return;
  }

  const usage = getContactUsageRunStats(stats, contact.contactId, contact.id, {
    contactName: contact.contactName,
    optionLabel: contact.label,
    optionKind: contact.kind,
  });
  usage.uses += 1;
}

function recordContactOrderComplications(
  stats: ContactRunStats,
  resolutions: readonly OrderResolutionDiagnostic[],
): void {
  for (const resolution of resolutions) {
    const target = resolution.order.target;

    if (target?.type !== 'contact' || !resolution.complication) {
      continue;
    }

    const usage = getContactUsageRunStats(stats, target.contactId, target.optionId);
    usage.complications += 1;
  }
}

function recordContactEventStats(
  stats: ContactRunStats,
  candidates: readonly WeightedEvent[],
  selection: EventSelection,
): void {
  for (const candidate of candidates) {
    if (!isContactEvent(candidate.event)) {
      continue;
    }

    stats.contactEventsEligible[candidate.event.id] =
      (stats.contactEventsEligible[candidate.event.id] ?? 0) + 1;
  }

  if (isContactEvent(selection.definition)) {
    stats.contactEventsSelected[selection.definition.id] =
      (stats.contactEventsSelected[selection.definition.id] ?? 0) + 1;
  }
}

function finalizeContactRunStats(stats: ContactRunStats, state: GameState): void {
  for (const contactId of stats.activeContactIds) {
    const contact = state.contacts[contactId];
    const definition = getContactDefinition(contactId);

    if (!contact) {
      continue;
    }

    stats.finalContacts[contactId] = {
      contactId,
      contactName: definition?.name ?? contactId,
      burned: contact.burned,
      trust: contact.trust,
      leverage: contact.leverage,
      volatility: contact.volatility,
      exposure: contact.exposure,
    };
  }

  for (const entry of state.ledger.entries) {
    if (!entry.relatedContactId) {
      continue;
    }

    const definition = getLedgerEntryDefinition(entry.definitionId);

    if (!definition) {
      continue;
    }

    const key = getContactLedgerKey(entry.relatedContactId, entry.definitionId);
    const report = stats.ledgerLinks[key] ?? {
      contactId: entry.relatedContactId,
      contactName: getContactName(entry.relatedContactId),
      definitionId: entry.definitionId,
      name: definition.name,
      kind: entry.kind,
      created: 0,
      consumed: 0,
      activeAtEnd: 0,
    };
    report.created += 1;
    report.consumed += entry.consumed ? 1 : 0;
    report.activeAtEnd += entry.consumed ? 0 : 1;
    stats.ledgerLinks[key] = report;
  }
}

function createEmptyContactSummaryTotals(): ContactSummaryReport & {
  finalContactSamples: number;
} {
  return {
    averageManageContactUses: 0,
    averageBurnedContacts: 0,
    averageFinalTrust: 0,
    averageFinalLeverage: 0,
    averageFinalVolatility: 0,
    averageFinalExposure: 0,
    finalContactSamples: 0,
  };
}

function addContactSummaryTotals(
  totals: ContactSummaryReport & { finalContactSamples: number },
  stats: ContactRunStats,
): void {
  totals.averageManageContactUses += Object.values(stats.usage).reduce(
    (sum, usage) => sum + usage.uses,
    0,
  );
  totals.averageBurnedContacts += Object.values(stats.finalContacts).filter(
    (contact) => contact.burned,
  ).length;

  for (const contact of Object.values(stats.finalContacts)) {
    totals.averageFinalTrust += contact.trust;
    totals.averageFinalLeverage += contact.leverage;
    totals.averageFinalVolatility += contact.volatility;
    totals.averageFinalExposure += contact.exposure;
    totals.finalContactSamples += 1;
  }
}

function finalizeContactSummaryReport(
  totals: ContactSummaryReport & { finalContactSamples: number },
  runs: number,
): ContactSummaryReport {
  const samples = totals.finalContactSamples;

  return {
    averageManageContactUses: runs > 0 ? totals.averageManageContactUses / runs : 0,
    averageBurnedContacts: runs > 0 ? totals.averageBurnedContacts / runs : 0,
    averageFinalTrust: samples > 0 ? totals.averageFinalTrust / samples : 0,
    averageFinalLeverage: samples > 0 ? totals.averageFinalLeverage / samples : 0,
    averageFinalVolatility: samples > 0 ? totals.averageFinalVolatility / samples : 0,
    averageFinalExposure: samples > 0 ? totals.averageFinalExposure / samples : 0,
  };
}

function addContactUsageReports(
  reports: Map<string, ContactUsageReport>,
  run: HarnessRunResult,
): void {
  for (const usage of Object.values(run.contactStats.usage)) {
    const key = getContactUsageKey(usage.contactId, usage.optionId);
    const report = reports.get(key) ?? {
      ...usage,
      uses: 0,
      complications: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };
    report.uses += usage.uses;
    report.complications += usage.complications;
    report.wins += run.outcome === 'victory' ? 1 : 0;
    report.losses += run.outcome === 'loss' ? 1 : 0;
    reports.set(key, report);
  }
}

function sortContactUsageReports(reports: ContactUsageReport[]): ContactUsageReport[] {
  return reports
    .map((report) => ({
      ...report,
      winRate: report.wins + report.losses > 0 ? report.wins / (report.wins + report.losses) : 0,
    }))
    .sort(
      (left, right) =>
        left.contactName.localeCompare(right.contactName) ||
        left.optionLabel.localeCompare(right.optionLabel) ||
        left.optionId.localeCompare(right.optionId),
    );
}

function addContactOutcomeReports(
  reports: Map<ContactId, ContactOutcomeReport>,
  run: HarnessRunResult,
): void {
  for (const contact of Object.values(run.contactStats.finalContacts)) {
    const report = reports.get(contact.contactId) ?? {
      ...contact,
      presentRuns: 0,
      burnedRuns: 0,
      burnedRate: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageTrust: 0,
      averageLeverage: 0,
      averageVolatility: 0,
      averageExposure: 0,
    };
    report.presentRuns += 1;
    report.burnedRuns += contact.burned ? 1 : 0;
    report.wins += run.outcome === 'victory' ? 1 : 0;
    report.losses += run.outcome === 'loss' ? 1 : 0;
    report.averageTrust += contact.trust;
    report.averageLeverage += contact.leverage;
    report.averageVolatility += contact.volatility;
    report.averageExposure += contact.exposure;
    reports.set(contact.contactId, report);
  }
}

function sortContactOutcomeReports(reports: ContactOutcomeReport[]): ContactOutcomeReport[] {
  return reports
    .map((report) => {
      const averageTrust = report.presentRuns > 0 ? report.averageTrust / report.presentRuns : 0;
      const averageLeverage =
        report.presentRuns > 0 ? report.averageLeverage / report.presentRuns : 0;
      const averageVolatility =
        report.presentRuns > 0 ? report.averageVolatility / report.presentRuns : 0;
      const averageExposure =
        report.presentRuns > 0 ? report.averageExposure / report.presentRuns : 0;

      return {
        ...report,
        burned: report.burnedRuns > 0,
        trust: averageTrust,
        leverage: averageLeverage,
        volatility: averageVolatility,
        exposure: averageExposure,
        burnedRate: report.presentRuns > 0 ? report.burnedRuns / report.presentRuns : 0,
        winRate:
          report.wins + report.losses > 0 ? report.wins / (report.wins + report.losses) : 0,
        averageTrust,
        averageLeverage,
        averageVolatility,
        averageExposure,
      };
    })
    .sort((left, right) => left.contactName.localeCompare(right.contactName));
}

function addContactEventReports(
  reports: Map<EventId, ContactEventReport>,
  stats: ContactRunStats,
): void {
  const eventIds = new Set<EventId>([
    ...Object.keys(stats.contactEventsEligible),
    ...Object.keys(stats.contactEventsSelected),
  ] as EventId[]);

  for (const eventId of eventIds) {
    const report = reports.get(eventId) ?? {
      eventId,
      eventTitle: getEventTitle(eventId),
      eligibleRuns: 0,
      selections: 0,
      selectionRate: 0,
    };
    report.eligibleRuns += stats.contactEventsEligible[eventId] ?? 0;
    report.selections += stats.contactEventsSelected[eventId] ?? 0;
    reports.set(eventId, report);
  }
}

function sortContactEventReports(reports: ContactEventReport[]): ContactEventReport[] {
  return reports
    .map((report) => ({
      ...report,
      selectionRate: report.eligibleRuns > 0 ? report.selections / report.eligibleRuns : 0,
    }))
    .sort((left, right) => left.eventTitle.localeCompare(right.eventTitle));
}

function addContactLedgerReports(
  reports: Map<string, ContactLedgerReport>,
  run: HarnessRunResult,
): void {
  for (const ledger of Object.values(run.contactStats.ledgerLinks)) {
    const key = getContactLedgerKey(ledger.contactId, ledger.definitionId);
    const report = reports.get(key) ?? {
      ...ledger,
      created: 0,
      consumed: 0,
      activeAtEnd: 0,
      wins: 0,
      losses: 0,
    };
    report.created += ledger.created;
    report.consumed += ledger.consumed;
    report.activeAtEnd += ledger.activeAtEnd;
    report.wins += run.outcome === 'victory' ? 1 : 0;
    report.losses += run.outcome === 'loss' ? 1 : 0;
    reports.set(key, report);
  }
}

function sortContactLedgerReports(reports: ContactLedgerReport[]): ContactLedgerReport[] {
  return reports.sort(
    (left, right) =>
      left.contactName.localeCompare(right.contactName) ||
      left.kind.localeCompare(right.kind) ||
      left.name.localeCompare(right.name),
  );
}

function addContactSetReports(
  reports: Map<string, ContactSetReport & { burnedContacts: number }>,
  run: HarnessRunResult,
): void {
  const key = getContactSetKey(run.contactStats.activeContactIds);
  const report = reports.get(key) ?? {
    contactSetKey: key,
    runs: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageWeeksPlayed: 0,
    averageBurnedContacts: 0,
    burnedContacts: 0,
  };
  report.runs += 1;
  report.wins += run.outcome === 'victory' ? 1 : 0;
  report.losses += run.outcome === 'loss' ? 1 : 0;
  report.averageWeeksPlayed += run.weeksPlayed;
  report.burnedContacts += Object.values(run.contactStats.finalContacts).filter(
    (contact) => contact.burned,
  ).length;
  reports.set(key, report);
}

function finalizeContactSetReports(
  reports: Map<string, ContactSetReport & { burnedContacts: number }>,
): ContactSetReport[] {
  return [...reports.values()]
    .map((report) => ({
      contactSetKey: report.contactSetKey,
      runs: report.runs,
      wins: report.wins,
      losses: report.losses,
      winRate: report.runs > 0 ? report.wins / report.runs : 0,
      averageWeeksPlayed: report.runs > 0 ? report.averageWeeksPlayed / report.runs : 0,
      averageBurnedContacts: report.runs > 0 ? report.burnedContacts / report.runs : 0,
    }))
    .sort((left, right) => left.contactSetKey.localeCompare(right.contactSetKey));
}

function getContactUsageRunStats(
  stats: ContactRunStats,
  contactId: ContactId,
  optionId: string,
  metadata?: {
    contactName: string;
    optionLabel: string;
    optionKind: ContactOptionKind;
  },
): ContactUsageRunStats {
  const key = getContactUsageKey(contactId, optionId);
  stats.usage[key] ??= {
    contactId,
    contactName: metadata?.contactName ?? getContactName(contactId),
    optionId,
    optionLabel: metadata?.optionLabel ?? optionId,
    optionKind: metadata?.optionKind ?? inferContactOptionKind(optionId),
    uses: 0,
    complications: 0,
  };

  return stats.usage[key];
}

function getContactUsageKey(contactId: ContactId, optionId: string): string {
  return `${contactId}:${optionId}`;
}

function getContactLedgerKey(
  contactId: ContactId,
  definitionId: LedgerEntryDefinitionId,
): string {
  return `${contactId}:${definitionId}`;
}

function getContactSetKey(contactIds: readonly ContactId[]): string {
  return [...contactIds].sort().join('+');
}

function getContactName(contactId: ContactId): string {
  return getContactDefinition(contactId)?.name ?? contactId;
}

function inferContactOptionKind(optionId: string): ContactOptionKind {
  if (optionId === 'cultivate') {
    return 'cultivate';
  }

  if (optionId === 'pressure') {
    return 'pressure';
  }

  return 'request_service';
}

function isContactEvent(event: WeightedEvent['event'] | EventSelection['definition']): boolean {
  return event.tags.includes('CONTACT') || event.contact !== undefined;
}

function createEmptyFrontRunStats(state: GameState): FrontRunStats {
  return {
    opportunitySetKey: getFrontOpportunitySetKey(state),
    establishOrders: 0,
    upgradeOrders: 0,
    layLowOrders: 0,
    finalOwnedFronts: 0,
    finalAverageExposure: 0,
    finalExposureBand: 'none',
    frontEventsEligible: {},
    frontEventsSelected: {},
    totalYield: createEmptyPressureTotals(),
    fronts: FRONT_DEFINITIONS.reduce(
      (fronts, definition) => {
        const front = state.fronts[definition.id];

        fronts[definition.id] = {
          frontId: definition.id,
          frontName: definition.name,
          ownedAtStart: Boolean(front?.active),
          ownedAtEnd: false,
          established: false,
          upgraded: false,
          ignored: false,
          finalExposure: 0,
          status: 'none',
          yieldTotals: createEmptyPressureTotals(),
        };

        return fronts;
      },
      {} as Record<FrontDefinitionId, FrontOutcomeRunStats>,
    ),
  };
}

function recordFrontOrderStats(stats: FrontRunStats, decision: LegalOrderOption): void {
  if (decision.actionId === 'lay_low' && decision.target?.type === 'front') {
    stats.layLowOrders += 1;
    return;
  }

  const investment = decision.preview.frontInvestment;

  if (!investment?.ok) {
    return;
  }

  const frontStats = stats.fronts[investment.definition.id];

  if (investment.mode === 'establish') {
    stats.establishOrders += 1;
    frontStats.established = true;
  } else {
    stats.upgradeOrders += 1;
    frontStats.upgraded = true;
  }
}

function recordFrontEventStats(
  stats: FrontRunStats,
  candidates: readonly WeightedEvent[],
  selection: EventSelection,
): void {
  for (const candidate of candidates) {
    if (!isFrontEvent(candidate.event)) {
      continue;
    }

    stats.frontEventsEligible[candidate.event.id] =
      (stats.frontEventsEligible[candidate.event.id] ?? 0) + 1;
  }

  if (isFrontEvent(selection.definition)) {
    stats.frontEventsSelected[selection.definition.id] =
      (stats.frontEventsSelected[selection.definition.id] ?? 0) + 1;
  }
}

function finalizeFrontRunStats(stats: FrontRunStats, state: GameState): void {
  const activeFronts = Object.values(state.fronts).filter((front) => front?.active);
  const exposureTotal = activeFronts.reduce((sum, front) => sum + front.exposure, 0);

  stats.finalOwnedFronts = activeFronts.length;
  stats.finalAverageExposure = activeFronts.length > 0 ? exposureTotal / activeFronts.length : 0;
  stats.finalExposureBand = getFrontExposureBand(stats.finalAverageExposure);

  for (const front of activeFronts) {
    const definition = getFrontDefinition(front.definitionId);

    if (!definition) {
      continue;
    }

    const frontStats = stats.fronts[front.definitionId];
    const yieldTotals = sumFrontYieldHistory(front.yieldHistory);

    frontStats.ownedAtEnd = true;
    frontStats.established ||= front.establishedWeek > 1;
    frontStats.upgraded ||= front.level > 1;
    frontStats.finalExposure = front.exposure;
    frontStats.status = getFrontExposureBand(front.exposure);
    frontStats.yieldTotals = yieldTotals;

    for (const pressure of PRESSURE_IDS) {
      stats.totalYield[pressure] += yieldTotals[pressure];
    }
  }

  for (const frontStats of Object.values(stats.fronts)) {
    frontStats.ignored =
      !frontStats.ownedAtStart &&
      !frontStats.ownedAtEnd &&
      !frontStats.established &&
      !frontStats.upgraded;
  }
}

function createEmptyFactionRunStats(state: GameState): FactionRunStats {
  return {
    activeFactionSetKey: getFactionSetKey(state.activeFactionIds),
    brokerAccordOrders: 0,
    maxActiveAccords: Object.keys(state.activeAccords).length,
    weeklyYieldTotals: createEmptyPressureTotals(),
    factionEventsEligible: {},
    factionEventsSelected: {},
    accordUsage: ACCORD_DEFINITIONS.reduce(
      (usage, accord) => {
        const faction = getFactionDefinition(accord.factionId);
        usage[accord.id] = {
          factionId: accord.factionId,
          factionName: faction?.name ?? accord.factionId,
          accordId: accord.id,
          accordLabel: accord.label,
          uses: 0,
          activeAtEnd: 0,
        };
        return usage;
      },
      {} as Record<AccordId, AccordUsageRunStats>,
    ),
    finalFactions: FACTION_DEFINITIONS.reduce(
      (factions, faction) => {
        factions[faction.id] = {
          factionId: faction.id,
          factionName: faction.name,
          active: state.activeFactionIds.includes(faction.id),
          status: 'neutral',
          standing: 0,
          suspicion: 0,
          obligation: 0,
          usedAccords: 0,
          activeAccords: 0,
          highSuspicion: false,
          highObligation: false,
        };
        return factions;
      },
      {} as Record<FactionId, FactionFinalRunStats>,
    ),
  };
}

function recordFactionOrderStats(stats: FactionRunStats, decision: LegalOrderOption): void {
  if (decision.actionId !== 'broker_accord' || decision.target?.type !== 'faction') {
    return;
  }

  const accordStats = stats.accordUsage[decision.target.accordId];
  stats.brokerAccordOrders += 1;
  accordStats.uses += 1;
}

function recordFactionSnapshot(stats: FactionRunStats, state: GameState): void {
  stats.maxActiveAccords = Math.max(
    stats.maxActiveAccords,
    Object.keys(state.activeAccords).length,
  );
}

function recordFactionEventStats(
  stats: FactionRunStats,
  candidates: readonly WeightedEvent[],
  selection: EventSelection,
): void {
  for (const candidate of candidates) {
    if (!isFactionEvent(candidate.event)) {
      continue;
    }

    stats.factionEventsEligible[candidate.event.id] =
      (stats.factionEventsEligible[candidate.event.id] ?? 0) + 1;
  }

  if (isFactionEvent(selection.definition)) {
    stats.factionEventsSelected[selection.definition.id] =
      (stats.factionEventsSelected[selection.definition.id] ?? 0) + 1;
  }
}

function finalizeFactionRunStats(stats: FactionRunStats, state: GameState): void {
  recordFactionSnapshot(stats, state);

  for (const entry of state.eventLog) {
    if (entry.type !== 'accord' || !entry.pressureDelta) {
      continue;
    }

    for (const pressure of PRESSURE_IDS) {
      stats.weeklyYieldTotals[pressure] += entry.pressureDelta[pressure] ?? 0;
    }
  }

  for (const activeAccord of Object.values(state.activeAccords)) {
    stats.accordUsage[activeAccord.definitionId].activeAtEnd += 1;
  }

  for (const definition of FACTION_DEFINITIONS) {
    const faction = state.factions[definition.id];

    if (!faction) {
      continue;
    }

    stats.finalFactions[definition.id] = {
      factionId: definition.id,
      factionName: definition.name,
      active: true,
      status: deriveFactionStatus(faction),
      standing: faction.standing,
      suspicion: faction.suspicion,
      obligation: faction.obligation,
      usedAccords: faction.usedAccordIds.length,
      activeAccords: faction.activeAccordIds.length,
      highSuspicion: faction.suspicion >= 70,
      highObligation: faction.obligation >= 70,
    };
  }
}

function createEmptyFrontSummaryTotals(): FrontSummaryReport & {
  frontEventTotal: number;
  exposureSamples: number;
} {
  return {
    averageOwnedFronts: 0,
    averageEstablishedFronts: 0,
    establishmentRate: 0,
    averageUpgrades: 0,
    upgradeRate: 0,
    averageLayLowOrders: 0,
    averageYieldResources: 0,
    averageYieldDominion: 0,
    averageYieldHeatDelta: 0,
    averageFinalExposure: 0,
    averageFrontEvents: 0,
    frontEventTotal: 0,
    exposureSamples: 0,
  };
}

function addFrontSummaryTotals(
  totals: FrontSummaryReport & { frontEventTotal: number; exposureSamples: number },
  stats: FrontRunStats,
): void {
  totals.averageOwnedFronts += stats.finalOwnedFronts;
  totals.averageEstablishedFronts += stats.establishOrders;
  totals.establishmentRate += stats.establishOrders > 0 ? 1 : 0;
  totals.averageUpgrades += stats.upgradeOrders;
  totals.upgradeRate += stats.upgradeOrders > 0 ? 1 : 0;
  totals.averageLayLowOrders += stats.layLowOrders;
  totals.averageYieldResources += stats.totalYield.resources;
  totals.averageYieldDominion += stats.totalYield.dominion;
  totals.averageYieldHeatDelta += stats.totalYield.heat;
  totals.frontEventTotal += Object.values(stats.frontEventsSelected).reduce(
    (sum, count) => sum + count,
    0,
  );

  if (stats.finalOwnedFronts > 0) {
    totals.averageFinalExposure += stats.finalAverageExposure;
    totals.exposureSamples += 1;
  }
}

function finalizeFrontSummaryReport(
  totals: FrontSummaryReport & { frontEventTotal: number; exposureSamples: number },
  runs: number,
): FrontSummaryReport {
  return {
    averageOwnedFronts: runs > 0 ? totals.averageOwnedFronts / runs : 0,
    averageEstablishedFronts: runs > 0 ? totals.averageEstablishedFronts / runs : 0,
    establishmentRate: runs > 0 ? totals.establishmentRate / runs : 0,
    averageUpgrades: runs > 0 ? totals.averageUpgrades / runs : 0,
    upgradeRate: runs > 0 ? totals.upgradeRate / runs : 0,
    averageLayLowOrders: runs > 0 ? totals.averageLayLowOrders / runs : 0,
    averageYieldResources: runs > 0 ? totals.averageYieldResources / runs : 0,
    averageYieldDominion: runs > 0 ? totals.averageYieldDominion / runs : 0,
    averageYieldHeatDelta: runs > 0 ? totals.averageYieldHeatDelta / runs : 0,
    averageFinalExposure:
      totals.exposureSamples > 0 ? totals.averageFinalExposure / totals.exposureSamples : 0,
    averageFrontEvents: runs > 0 ? totals.frontEventTotal / runs : 0,
  };
}

function addFrontOutcomeReports(
  reports: Map<FrontDefinitionId, FrontOutcomeReport>,
  run: HarnessRunResult,
): void {
  for (const front of Object.values(run.frontStats.fronts)) {
    const report = reports.get(front.frontId) ?? {
      frontId: front.frontId,
      frontName: front.frontName,
      ownedRuns: 0,
      establishedRuns: 0,
      upgradedRuns: 0,
      ignoredRuns: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageFinalExposure: 0,
      averageYieldResources: 0,
      averageYieldDominion: 0,
      averageYieldHeatDelta: 0,
    };
    report.ownedRuns += front.ownedAtEnd ? 1 : 0;
    report.establishedRuns += front.established ? 1 : 0;
    report.upgradedRuns += front.upgraded ? 1 : 0;
    report.ignoredRuns += front.ignored ? 1 : 0;
    report.averageFinalExposure += front.ownedAtEnd ? front.finalExposure : 0;
    report.averageYieldResources += front.yieldTotals.resources;
    report.averageYieldDominion += front.yieldTotals.dominion;
    report.averageYieldHeatDelta += front.yieldTotals.heat;

    if (front.ownedAtEnd || front.established || front.upgraded) {
      report.wins += run.outcome === 'victory' ? 1 : 0;
      report.losses += run.outcome === 'loss' ? 1 : 0;
    }

    reports.set(front.frontId, report);
  }
}

function sortFrontOutcomeReports(reports: FrontOutcomeReport[]): FrontOutcomeReport[] {
  return reports
    .map((report) => ({
      ...report,
      winRate:
        report.wins + report.losses > 0 ? report.wins / (report.wins + report.losses) : 0,
      averageFinalExposure:
        report.ownedRuns > 0 ? report.averageFinalExposure / report.ownedRuns : 0,
      averageYieldResources: report.averageYieldResources / Math.max(1, report.ownedRuns),
      averageYieldDominion: report.averageYieldDominion / Math.max(1, report.ownedRuns),
      averageYieldHeatDelta: report.averageYieldHeatDelta / Math.max(1, report.ownedRuns),
    }))
    .sort((left, right) => left.frontName.localeCompare(right.frontName));
}

function selectMostProfitableFront(
  reports: readonly FrontOutcomeReport[],
): FrontOutcomeReport | undefined {
  return [...reports]
    .filter((front) => front.ownedRuns > 0)
    .sort(
      (left, right) =>
        right.averageYieldResources - left.averageYieldResources ||
        right.averageYieldDominion - left.averageYieldDominion ||
        left.frontName.localeCompare(right.frontName),
    )[0];
}

function selectMostDangerousFront(
  reports: readonly FrontOutcomeReport[],
): FrontOutcomeReport | undefined {
  return [...reports]
    .filter((front) => front.ownedRuns > 0)
    .sort(
      (left, right) =>
        right.averageFinalExposure - left.averageFinalExposure ||
        left.frontName.localeCompare(right.frontName),
    )[0];
}

function selectMostIgnoredFront(
  reports: readonly FrontOutcomeReport[],
): FrontOutcomeReport | undefined {
  return [...reports].sort(
    (left, right) =>
      right.ignoredRuns - left.ignoredRuns || left.frontName.localeCompare(right.frontName),
  )[0];
}

function addFrontEventReports(
  reports: Map<EventId, FrontEventReport>,
  stats: FrontRunStats,
): void {
  const eventIds = new Set<EventId>([
    ...Object.keys(stats.frontEventsEligible),
    ...Object.keys(stats.frontEventsSelected),
  ] as EventId[]);

  for (const eventId of eventIds) {
    const report = reports.get(eventId) ?? {
      eventId,
      eventTitle: getEventTitle(eventId),
      eligibleRuns: 0,
      selections: 0,
      selectionRate: 0,
    };
    report.eligibleRuns += stats.frontEventsEligible[eventId] ?? 0;
    report.selections += stats.frontEventsSelected[eventId] ?? 0;
    reports.set(eventId, report);
  }
}

function sortFrontEventReports(reports: FrontEventReport[]): FrontEventReport[] {
  return reports
    .map((report) => ({
      ...report,
      selectionRate: report.eligibleRuns > 0 ? report.selections / report.eligibleRuns : 0,
    }))
    .sort((left, right) => left.eventTitle.localeCompare(right.eventTitle));
}

function addFrontOpportunitySetReports(
  reports: Map<string, FrontOpportunitySetReport & { ownedFronts: number }>,
  run: HarnessRunResult,
): void {
  const key = run.frontStats.opportunitySetKey;
  const report = reports.get(key) ?? {
    opportunitySetKey: key,
    runs: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageOwnedFronts: 0,
    ownedFronts: 0,
  };
  report.runs += 1;
  report.wins += run.outcome === 'victory' ? 1 : 0;
  report.losses += run.outcome === 'loss' ? 1 : 0;
  report.ownedFronts += run.frontStats.finalOwnedFronts;
  reports.set(key, report);
}

function finalizeFrontOpportunitySetReports(
  reports: Map<string, FrontOpportunitySetReport & { ownedFronts: number }>,
): FrontOpportunitySetReport[] {
  return [...reports.values()]
    .map((report) => ({
      opportunitySetKey: report.opportunitySetKey,
      runs: report.runs,
      wins: report.wins,
      losses: report.losses,
      winRate: report.runs > 0 ? report.wins / report.runs : 0,
      averageOwnedFronts: report.runs > 0 ? report.ownedFronts / report.runs : 0,
    }))
    .sort((left, right) => left.opportunitySetKey.localeCompare(right.opportunitySetKey));
}

function addFrontExposureBandReports(
  reports: Map<FrontExposureBand, FrontExposureBandReport & { ownedFronts: number }>,
  run: HarnessRunResult,
): void {
  const band = run.frontStats.finalExposureBand;
  const report = reports.get(band) ?? {
    band,
    runs: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageOwnedFronts: 0,
    ownedFronts: 0,
  };
  report.runs += 1;
  report.wins += run.outcome === 'victory' ? 1 : 0;
  report.losses += run.outcome === 'loss' ? 1 : 0;
  report.ownedFronts += run.frontStats.finalOwnedFronts;
  reports.set(band, report);
}

function finalizeFrontExposureBandReports(
  reports: Map<FrontExposureBand, FrontExposureBandReport & { ownedFronts: number }>,
): FrontExposureBandReport[] {
  return [...reports.values()]
    .map((report) => ({
      band: report.band,
      runs: report.runs,
      wins: report.wins,
      losses: report.losses,
      winRate: report.runs > 0 ? report.wins / report.runs : 0,
      averageOwnedFronts: report.runs > 0 ? report.ownedFronts / report.runs : 0,
    }))
    .sort((left, right) => frontExposureBandRank(left.band) - frontExposureBandRank(right.band));
}

function isFrontEvent(event: WeightedEvent['event'] | EventSelection['definition']): boolean {
  return event.tags.includes('FRONT');
}

function getFrontOpportunitySetKey(state: GameState): string {
  return state.frontOpportunities
    .map((opportunity) => getFrontDefinition(opportunity.definitionId)?.name ?? opportunity.definitionId)
    .sort()
    .join('+');
}

function sumFrontYieldHistory(
  yieldHistory: readonly { effects: Partial<Pressures> }[],
): Pressures {
  const totals = createEmptyPressureTotals();

  for (const entry of yieldHistory) {
    for (const pressure of PRESSURE_IDS) {
      totals[pressure] += entry.effects[pressure] ?? 0;
    }
  }

  return totals;
}

function getFrontExposureBand(exposure: number): FrontExposureBand {
  if (exposure <= 0) {
    return 'none';
  }

  return deriveFrontStatus(exposure);
}

function frontExposureBandRank(band: FrontExposureBand): number {
  switch (band) {
    case 'none':
      return 0;
    case 'quiet':
      return 1;
    case 'noticed':
      return 2;
    case 'hot':
      return 3;
    case 'compromised':
      return 4;
  }
}

function createEmptyFactionSummaryTotals(): FactionSummaryReport {
  return {
    averageBrokerAccordUses: 0,
    averageMaxActiveAccords: 0,
    averageUsedAccords: 0,
    averageActiveAccordsAtEnd: 0,
    averageHighSuspicionFactions: 0,
    averageHighObligationFactions: 0,
    averageWeeklyYieldDominion: 0,
    averageWeeklyYieldHeatDelta: 0,
    averageWeeklyYieldResources: 0,
    averageWeeklyYieldIntel: 0,
  };
}

function addFactionSummaryTotals(
  totals: FactionSummaryReport,
  stats: FactionRunStats,
): void {
  const finalFactions = Object.values(stats.finalFactions).filter((faction) => faction.active);

  totals.averageBrokerAccordUses += stats.brokerAccordOrders;
  totals.averageMaxActiveAccords += stats.maxActiveAccords;
  totals.averageUsedAccords += finalFactions.reduce(
    (sum, faction) => sum + faction.usedAccords,
    0,
  );
  totals.averageActiveAccordsAtEnd += finalFactions.reduce(
    (sum, faction) => sum + faction.activeAccords,
    0,
  );
  totals.averageHighSuspicionFactions += finalFactions.filter(
    (faction) => faction.highSuspicion,
  ).length;
  totals.averageHighObligationFactions += finalFactions.filter(
    (faction) => faction.highObligation,
  ).length;
  totals.averageWeeklyYieldDominion += stats.weeklyYieldTotals.dominion;
  totals.averageWeeklyYieldHeatDelta += stats.weeklyYieldTotals.heat;
  totals.averageWeeklyYieldResources += stats.weeklyYieldTotals.resources;
  totals.averageWeeklyYieldIntel += stats.weeklyYieldTotals.intel;
}

function finalizeFactionSummaryReport(
  totals: FactionSummaryReport,
  runs: number,
): FactionSummaryReport {
  return {
    averageBrokerAccordUses: runs > 0 ? totals.averageBrokerAccordUses / runs : 0,
    averageMaxActiveAccords: runs > 0 ? totals.averageMaxActiveAccords / runs : 0,
    averageUsedAccords: runs > 0 ? totals.averageUsedAccords / runs : 0,
    averageActiveAccordsAtEnd: runs > 0 ? totals.averageActiveAccordsAtEnd / runs : 0,
    averageHighSuspicionFactions:
      runs > 0 ? totals.averageHighSuspicionFactions / runs : 0,
    averageHighObligationFactions:
      runs > 0 ? totals.averageHighObligationFactions / runs : 0,
    averageWeeklyYieldDominion:
      runs > 0 ? totals.averageWeeklyYieldDominion / runs : 0,
    averageWeeklyYieldHeatDelta:
      runs > 0 ? totals.averageWeeklyYieldHeatDelta / runs : 0,
    averageWeeklyYieldResources:
      runs > 0 ? totals.averageWeeklyYieldResources / runs : 0,
    averageWeeklyYieldIntel: runs > 0 ? totals.averageWeeklyYieldIntel / runs : 0,
  };
}

function addAccordUsageReports(
  reports: Map<AccordId, AccordUsageReport>,
  run: HarnessRunResult,
): void {
  for (const accord of Object.values(run.factionStats.accordUsage)) {
    if (accord.uses === 0 && accord.activeAtEnd === 0) {
      continue;
    }

    const report = reports.get(accord.accordId) ?? {
      ...accord,
      uses: 0,
      activeAtEnd: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };

    report.uses += accord.uses;
    report.activeAtEnd += accord.activeAtEnd;

    if (accord.uses > 0 || accord.activeAtEnd > 0) {
      report.wins += run.outcome === 'victory' ? 1 : 0;
      report.losses += run.outcome === 'loss' ? 1 : 0;
    }

    reports.set(accord.accordId, report);
  }
}

function sortAccordUsageReports(reports: AccordUsageReport[]): AccordUsageReport[] {
  return reports
    .map((report) => ({
      ...report,
      winRate:
        report.wins + report.losses > 0 ? report.wins / (report.wins + report.losses) : 0,
    }))
    .sort(
      (left, right) =>
        left.factionName.localeCompare(right.factionName) ||
        left.accordLabel.localeCompare(right.accordLabel),
    );
}

function addFactionOutcomeReports(
  reports: Map<FactionId, FactionOutcomeReport>,
  run: HarnessRunResult,
): void {
  for (const faction of Object.values(run.factionStats.finalFactions)) {
    if (!faction.active) {
      continue;
    }

    const report = reports.get(faction.factionId) ?? {
      factionId: faction.factionId,
      factionName: faction.factionName,
      presentRuns: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageStanding: 0,
      averageSuspicion: 0,
      averageObligation: 0,
      averageUsedAccords: 0,
      averageActiveAccords: 0,
      highSuspicionRuns: 0,
      highObligationRuns: 0,
    };

    report.presentRuns += 1;
    report.wins += run.outcome === 'victory' ? 1 : 0;
    report.losses += run.outcome === 'loss' ? 1 : 0;
    report.averageStanding += faction.standing;
    report.averageSuspicion += faction.suspicion;
    report.averageObligation += faction.obligation;
    report.averageUsedAccords += faction.usedAccords;
    report.averageActiveAccords += faction.activeAccords;
    report.highSuspicionRuns += faction.highSuspicion ? 1 : 0;
    report.highObligationRuns += faction.highObligation ? 1 : 0;
    reports.set(faction.factionId, report);
  }
}

function sortFactionOutcomeReports(reports: FactionOutcomeReport[]): FactionOutcomeReport[] {
  return reports
    .map((report) => ({
      ...report,
      winRate:
        report.wins + report.losses > 0 ? report.wins / (report.wins + report.losses) : 0,
      averageStanding:
        report.presentRuns > 0 ? report.averageStanding / report.presentRuns : 0,
      averageSuspicion:
        report.presentRuns > 0 ? report.averageSuspicion / report.presentRuns : 0,
      averageObligation:
        report.presentRuns > 0 ? report.averageObligation / report.presentRuns : 0,
      averageUsedAccords:
        report.presentRuns > 0 ? report.averageUsedAccords / report.presentRuns : 0,
      averageActiveAccords:
        report.presentRuns > 0 ? report.averageActiveAccords / report.presentRuns : 0,
    }))
    .sort((left, right) => left.factionName.localeCompare(right.factionName));
}

function addFactionEventReports(
  reports: Map<EventId, FactionEventReport>,
  stats: FactionRunStats,
): void {
  const eventIds = new Set<EventId>([
    ...Object.keys(stats.factionEventsEligible),
    ...Object.keys(stats.factionEventsSelected),
  ] as EventId[]);

  for (const eventId of eventIds) {
    const report = reports.get(eventId) ?? {
      eventId,
      eventTitle: getEventTitle(eventId),
      eligibleRuns: 0,
      selections: 0,
      selectionRate: 0,
    };
    report.eligibleRuns += stats.factionEventsEligible[eventId] ?? 0;
    report.selections += stats.factionEventsSelected[eventId] ?? 0;
    reports.set(eventId, report);
  }
}

function sortFactionEventReports(reports: FactionEventReport[]): FactionEventReport[] {
  return reports
    .map((report) => ({
      ...report,
      selectionRate: report.eligibleRuns > 0 ? report.selections / report.eligibleRuns : 0,
    }))
    .sort((left, right) => left.eventTitle.localeCompare(right.eventTitle));
}

function addFactionSetReports(
  reports: Map<string, FactionSetReport & { brokerAccordUses: number }>,
  run: HarnessRunResult,
): void {
  const key = run.factionStats.activeFactionSetKey;
  const report = reports.get(key) ?? {
    factionSetKey: key,
    runs: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageBrokerAccordUses: 0,
    brokerAccordUses: 0,
  };

  report.runs += 1;
  report.wins += run.outcome === 'victory' ? 1 : 0;
  report.losses += run.outcome === 'loss' ? 1 : 0;
  report.brokerAccordUses += run.factionStats.brokerAccordOrders;
  reports.set(key, report);
}

function finalizeFactionSetReports(
  reports: Map<string, FactionSetReport & { brokerAccordUses: number }>,
): FactionSetReport[] {
  return [...reports.values()]
    .map((report) => ({
      factionSetKey: report.factionSetKey,
      runs: report.runs,
      wins: report.wins,
      losses: report.losses,
      winRate: report.runs > 0 ? report.wins / report.runs : 0,
      averageBrokerAccordUses:
        report.runs > 0 ? report.brokerAccordUses / report.runs : 0,
    }))
    .sort((left, right) => left.factionSetKey.localeCompare(right.factionSetKey));
}

function isFactionEvent(event: WeightedEvent['event'] | EventSelection['definition']): boolean {
  return event.tags.includes('FACTION');
}

function getFactionSetKey(factionIds: readonly FactionId[]): string {
  return factionIds
    .map((factionId) => getFactionDefinition(factionId)?.name ?? factionId)
    .sort()
    .join('+');
}

function addRosterCompositionReport(
  reports: Map<string, RosterCompositionReport>,
  run: HarnessRunResult,
): void {
  const rosterKey = getRosterCompositionKey(run.startingRosterIds);
  const report = reports.get(rosterKey) ?? {
    rosterKey,
    runs: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageWeeksPlayed: 0,
  };
  report.runs += 1;
  report.wins += run.outcome === 'victory' ? 1 : 0;
  report.losses += run.outcome === 'loss' ? 1 : 0;
  report.averageWeeksPlayed += run.weeksPlayed;
  reports.set(rosterKey, report);
}

function addOperativePresenceReports(
  reports: Map<OperativeId, OperativePresenceReport>,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (!stats.started && !stats.recruited) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      presentRuns: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };
    report.presentRuns += 1;
    report.wins += run.outcome === 'victory' ? 1 : 0;
    report.losses += run.outcome === 'loss' ? 1 : 0;
    reports.set(stats.operativeId, report);
  }
}

function addOperativeRecruitmentReports(
  reports: Map<OperativeId, OperativeRecruitmentReport>,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (!stats.hirePoolPresent) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      availableRuns: 0,
      recruitedRuns: 0,
      recruitmentRate: 0,
      wins: 0,
      losses: 0,
    };
    report.availableRuns += 1;
    report.recruitedRuns += stats.recruited ? 1 : 0;

    if (stats.recruited) {
      report.wins += run.outcome === 'victory' ? 1 : 0;
      report.losses += run.outcome === 'loss' ? 1 : 0;
    }

    reports.set(stats.operativeId, report);
  }
}

function addOperativeUsageReports(
  reports: Map<OperativeId, OperativeUsageReport>,
  run: HarnessRunResult,
  totalRuns: number,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (stats.assignments === 0 && stats.complications === 0) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      assignments: 0,
      complications: 0,
      complicationRate: 0,
      averageAssignments: 0,
    };
    report.assignments += stats.assignments;
    report.complications += stats.complications;
    report.averageAssignments += stats.assignments / Math.max(1, totalRuns);
    reports.set(stats.operativeId, report);
  }
}

function addOperativeStressReports(
  reports: Map<
    OperativeId,
    OperativeStressReport & { finalStressSamples: number; highestStressSamples: number }
  >,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (stats.finalStress === undefined && stats.highestStress === undefined) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      averageFinalStress: 0,
      averageHighestStress: 0,
      strainedRuns: 0,
      unstableRuns: 0,
      breakingRuns: 0,
      finalStressSamples: 0,
      highestStressSamples: 0,
    };

    if (stats.finalStress !== undefined) {
      report.averageFinalStress += stats.finalStress;
      report.finalStressSamples += 1;
    }

    if (stats.highestStress !== undefined) {
      report.averageHighestStress += stats.highestStress;
      report.highestStressSamples += 1;
      const highestTier = getStressTier(stats.highestStress);
      report.strainedRuns += stressTierRank(highestTier) >= stressTierRank('strained') ? 1 : 0;
      report.unstableRuns += stressTierRank(highestTier) >= stressTierRank('unstable') ? 1 : 0;
      report.breakingRuns += stressTierRank(highestTier) >= stressTierRank('breaking') ? 1 : 0;
    }

    reports.set(stats.operativeId, report);
  }
}

function addOperativeDangerReports(
  reports: Map<OperativeId, OperativeDangerReport>,
  run: HarnessRunResult,
  totalRuns: number,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (stats.heatContribution === 0 && stats.ruinContribution === 0) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      averageHeatContribution: 0,
      averageRuinContribution: 0,
    };
    report.averageHeatContribution += stats.heatContribution / Math.max(1, totalRuns);
    report.averageRuinContribution += stats.ruinContribution / Math.max(1, totalRuns);
    reports.set(stats.operativeId, report);
  }
}

function addOperativeEventReports(
  reports: Map<string, OperativeEventReport>,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeEventStats)) {
    const key = `${stats.operativeId}:${stats.eventId}`;
    const report = reports.get(key) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      eventId: stats.eventId,
      eventTitle: getEventTitle(stats.eventId),
      eligibleRuns: 0,
      selections: 0,
      selectionRate: 0,
    };
    report.eligibleRuns += stats.eligibleCount;
    report.selections += stats.selectedCount;
    reports.set(key, report);
  }
}

function addHirePoolSelectionReports(
  reports: Map<OperativeId, HirePoolSelectionReport>,
  run: HarnessRunResult,
): void {
  for (const stats of Object.values(run.operativeStats)) {
    if (!stats.hirePoolPresent) {
      continue;
    }

    const report = reports.get(stats.operativeId) ?? {
      operativeId: stats.operativeId,
      operativeName: getOperativeName(stats.operativeId),
      poolAppearances: 0,
      recruits: 0,
      selectionRate: 0,
    };
    report.poolAppearances += 1;
    report.recruits += stats.recruited ? 1 : 0;
    reports.set(stats.operativeId, report);
  }
}

function finalizeRosterCompositionReports(
  reports: Map<string, RosterCompositionReport>,
): RosterCompositionReport[] {
  return [...reports.values()]
    .map((report) => ({
      ...report,
      winRate: report.runs > 0 ? report.wins / report.runs : 0,
      averageWeeksPlayed: report.runs > 0 ? report.averageWeeksPlayed / report.runs : 0,
    }))
    .sort((left, right) => left.rosterKey.localeCompare(right.rosterKey));
}

function finalizeOperativeStressReports(
  reports: Map<
    OperativeId,
    OperativeStressReport & { finalStressSamples: number; highestStressSamples: number }
  >,
): OperativeStressReport[] {
  return sortByOperativeName(
    [...reports.values()].map((report) => ({
      operativeId: report.operativeId,
      operativeName: report.operativeName,
      averageFinalStress:
        report.finalStressSamples > 0 ? report.averageFinalStress / report.finalStressSamples : 0,
      averageHighestStress:
        report.highestStressSamples > 0
          ? report.averageHighestStress / report.highestStressSamples
          : 0,
      strainedRuns: report.strainedRuns,
      unstableRuns: report.unstableRuns,
      breakingRuns: report.breakingRuns,
    })),
  );
}

function sortByOperativeName<T extends { operativeName: string }>(reports: T[]): T[] {
  return reports
    .map((report) => finalizeReportRates(report))
    .sort((left, right) => left.operativeName.localeCompare(right.operativeName)) as T[];
}

function sortOperativeEventReports(reports: OperativeEventReport[]): OperativeEventReport[] {
  return reports
    .map((report) => ({
      ...report,
      selectionRate: report.eligibleRuns > 0 ? report.selections / report.eligibleRuns : 0,
    }))
    .sort(
      (left, right) =>
        left.operativeName.localeCompare(right.operativeName) ||
        left.eventTitle.localeCompare(right.eventTitle),
    );
}

function finalizeReportRates<T extends object>(report: T): T {
  if ('presentRuns' in report && 'wins' in report && 'winRate' in report) {
    const presenceReport = report as unknown as OperativePresenceReport;
    presenceReport.winRate =
      presenceReport.presentRuns > 0 ? presenceReport.wins / presenceReport.presentRuns : 0;
  }

  if ('availableRuns' in report && 'recruitedRuns' in report && 'recruitmentRate' in report) {
    const recruitmentReport = report as unknown as OperativeRecruitmentReport;
    recruitmentReport.recruitmentRate =
      recruitmentReport.availableRuns > 0
        ? recruitmentReport.recruitedRuns / recruitmentReport.availableRuns
        : 0;
  }

  if ('assignments' in report && 'complications' in report && 'complicationRate' in report) {
    const usageReport = report as unknown as OperativeUsageReport;
    usageReport.complicationRate =
      usageReport.assignments > 0 ? usageReport.complications / usageReport.assignments : 0;
  }

  if ('poolAppearances' in report && 'recruits' in report && 'selectionRate' in report) {
    const hireReport = report as unknown as HirePoolSelectionReport;
    hireReport.selectionRate =
      hireReport.poolAppearances > 0 ? hireReport.recruits / hireReport.poolAppearances : 0;
  }

  return report;
}

function getOperativeName(operativeId: OperativeId): string {
  return getOperativeDefinition(operativeId)?.name ?? operativeId;
}

function getEventTitle(eventId: EventId): string {
  return getEventDefinition(eventId)?.title ?? eventId;
}

function stressTierRank(tier: StressTier): number {
  switch (tier) {
    case 'stable':
      return 0;
    case 'strained':
      return 1;
    case 'unstable':
      return 2;
    case 'breaking':
      return 3;
  }
}

function recordTargetSelection(
  targetUsage: Record<string, TargetRunStats>,
  target: ActionTarget | undefined,
): void {
  if (!target) {
    return;
  }

  const key = getTargetKey(target);
  const current = targetUsage[key] ?? {
    targetType: target.type,
    targetId: getTargetReportId(target),
    selections: 0,
    complications: 0,
  };
  current.selections += 1;
  targetUsage[key] = current;
}

function recordQueuedOrderTelemetry(
  entries: TelemetryEntry[],
  week: number,
  decision: LegalOrderOption,
): void {
  entries.push({
    kind: 'command_used',
    week,
    actionId: decision.actionId,
    actionLabel: decision.actionLabel,
    ...(decision.target ? { targetKey: getTargetKey(decision.target) } : {}),
    ...(decision.assignedOperativeId
      ? { assignedOperativeId: decision.assignedOperativeId as OperativeId }
      : {}),
  });

  if (decision.assignedOperativeId) {
    entries.push({
      kind: 'operative_assigned',
      week,
      operativeId: decision.assignedOperativeId as OperativeId,
      actionId: decision.actionId,
    });
  }

  for (const system of getStrategicSystemsForOrder(decision)) {
    entries.push({
      kind: 'system_engaged',
      week,
      system,
      sourceId: decision.target ? getTargetKey(decision.target) : decision.actionId,
    });
  }
}

function recordOrderPressureAttribution(
  entries: TelemetryEntry[],
  resolutions: readonly OrderResolutionDiagnostic[],
  week: number,
): void {
  for (const resolution of resolutions) {
    const source = getOrderPressureSource(resolution.order);
    entries.push(
      ...pressureDeltaToAttributionEntries({
        week,
        sourceKind: source.sourceKind,
        sourceId: source.sourceId,
        sourceLabel: source.sourceLabel,
        pressureDelta: resolution.resolvedDelta,
      }),
    );
  }
}

function recordLogPressureAttribution(
  entries: TelemetryEntry[],
  state: GameState,
  preLogCount: number,
): void {
  for (const entry of state.eventLog.slice(preLogCount)) {
    const source = getLogPressureSource(entry);

    if (!source || !entry.pressureDelta) {
      continue;
    }

    entries.push(
      ...pressureDeltaToAttributionEntries({
        week: entry.week,
        sourceKind: source.sourceKind,
        sourceId: source.sourceId,
        sourceLabel: source.sourceLabel,
        pressureDelta: entry.pressureDelta,
      }),
    );
  }
}

function recordEventChoiceTelemetry(
  entries: TelemetryEntry[],
  state: GameState,
  preLogCount: number,
  eventId: string,
  choice: EventChoiceDefinition,
): void {
  const eventDefinition = getEventDefinition(eventId);
  const eventChoiceLog = state.eventLog
    .slice(preLogCount)
    .find((entry) => entry.type === 'event_choice');

  entries.push({
    kind: 'event_choice_used',
    week: eventChoiceLog?.week ?? state.week,
    eventId,
    eventTitle: eventDefinition?.title ?? eventId,
    choiceId: choice.id,
    choiceLabel: choice.label,
  });

  if (!eventChoiceLog?.pressureDelta) {
    return;
  }

  entries.push(
    ...pressureDeltaToAttributionEntries({
      week: eventChoiceLog.week,
      sourceKind: 'event',
      sourceId: eventId,
      sourceLabel: choice.label,
      pressureDelta: eventChoiceLog.pressureDelta,
    }),
  );
}

function getStrategicSystemsForOrder(decision: LegalOrderOption): StrategicSystemId[] {
  switch (decision.actionId) {
    case 'bribe_official':
      return ['bribe'];
    case 'lay_low':
      return ['lay_low'];
    case 'manage_contact':
      return ['contact'];
    case 'work_the_ledger':
      return ['ledger'];
    case 'broker_accord':
      return ['accord'];
    case 'invest_front':
      return [decision.target?.type === 'front' ? 'front_upgrade' : 'front'];
    default:
      return [];
  }
}

function getOrderPressureSource(order: OrderResolutionDiagnostic['order']): {
  sourceKind: PressureChangeSourceKind;
  sourceId: string;
  sourceLabel: string;
} {
  const action = getActionDefinition(order.actionId);

  if (order.actionId === 'manage_contact' && order.target?.type === 'contact') {
    return {
      sourceKind: 'contact',
      sourceId: getTargetKey(order.target),
      sourceLabel: getContactDefinition(order.target.contactId)?.name ?? action?.label ?? order.actionId,
    };
  }

  if (order.actionId === 'work_the_ledger' && order.target?.type === 'ledger') {
    return {
      sourceKind: 'ledger',
      sourceId: getTargetKey(order.target),
      sourceLabel: action?.label ?? order.actionId,
    };
  }

  if (order.actionId === 'invest_front' && order.target?.type === 'front_opportunity') {
    const frontDefinitionId = order.target.id.replace(
      /^front_opportunity_/,
      '',
    ) as FrontDefinitionId;

    return {
      sourceKind: 'front',
      sourceId: getTargetKey(order.target),
      sourceLabel: getFrontDefinition(frontDefinitionId)?.name ?? action?.label ?? order.actionId,
    };
  }

  if (order.actionId === 'invest_front' && order.target?.type === 'front') {
    const front = getFrontDefinition(order.target.id as FrontDefinitionId);

    return {
      sourceKind: 'front',
      sourceId: getTargetKey(order.target),
      sourceLabel: front?.name ?? action?.label ?? order.actionId,
    };
  }

  if (order.actionId === 'broker_accord' && order.target?.type === 'faction') {
    return {
      sourceKind: 'accord',
      sourceId: getTargetKey(order.target),
      sourceLabel: getAccordDefinition(order.target.accordId)?.label ?? action?.label ?? order.actionId,
    };
  }

  return {
    sourceKind: 'action',
    sourceId: order.actionId,
    sourceLabel: action?.label ?? order.actionId,
  };
}

function getLogPressureSource(entry: GameLogEntry): {
  sourceKind: PressureChangeSourceKind;
  sourceId: string;
  sourceLabel: string;
} | undefined {
  switch (entry.type) {
    case 'front_yield':
      return {
        sourceKind: 'front',
        sourceId: 'front_network_yield',
        sourceLabel: entry.title,
      };
    case 'accord':
      return {
        sourceKind: 'accord',
        sourceId: 'accord_weekly_effects',
        sourceLabel: entry.title,
      };
    case 'drift':
      return {
        sourceKind: 'drift',
        sourceId: 'weekly_drift',
        sourceLabel: entry.title,
      };
    case 'rival_effect':
      return {
        sourceKind: 'rival',
        sourceId: entry.tags?.find((tag) => tag.startsWith('rival_')) ?? entry.id,
        sourceLabel: entry.title,
      };
    default:
      return undefined;
  }
}

function pressureDeltaToAttributionEntries({
  week,
  sourceKind,
  sourceId,
  sourceLabel,
  pressureDelta,
}: {
  week: number;
  sourceKind: PressureChangeSourceKind;
  sourceId: string;
  sourceLabel: string;
  pressureDelta: PressureDelta;
}): PressureAttributionEntry[] {
  return PRESSURE_IDS.flatMap((pressure) => {
    const delta = pressureDelta[pressure] ?? 0;

    return delta === 0
      ? []
      : [
          {
            kind: 'pressure_delta',
            week,
            sourceKind,
            sourceId,
            sourceLabel,
            pressure,
            delta,
          },
        ];
  });
}

function recordOrderComplications(
  targetUsage: Record<string, TargetRunStats>,
  resolutions: readonly OrderResolutionDiagnostic[],
): void {
  for (const resolution of resolutions) {
    const target = resolution.order.target;

    if (!target || !resolution.complication) {
      continue;
    }

    const usage = targetUsage[getTargetKey(target)];

    if (usage) {
      usage.complications += 1;
    }
  }
}

function recordContextualEvent(
  counts: ContextualEventCounts,
  selection: EventSelection,
): void {
  const modifierIds = new Set(
    selection.diagnostics.contextModifiers.map((modifier) => modifier.id),
  );

  if (modifierIds.size > 0) {
    counts.influencedSelections += 1;
  }

  if ([...modifierIds].some((id) => TARGET_TAG_MODIFIERS.has(id))) {
    counts.targetTagInfluenced += 1;
  }

  if ([...modifierIds].some((id) => RIVAL_PRESSURE_MODIFIERS.has(id))) {
    counts.rivalPressureInfluenced += 1;
  }

  if (modifierIds.has('recent_high_local_heat')) {
    counts.localHeatInfluenced += 1;
  }
}

function getTargetKey(target: ActionTarget): string {
  if (target.type === 'ledger') {
    return `ledger:${target.entryId}:${target.useOptionId}`;
  }

  if (target.type === 'contact') {
    return `contact:${target.contactId}:${target.optionId}`;
  }

  if (target.type === 'faction') {
    return `faction:${target.factionId}:${target.accordId}`;
  }

  return `${target.type}:${target.id}`;
}

function getTargetReportId(target: ActionTarget): string {
  if (target.type === 'ledger') {
    return `${target.entryId}:${target.useOptionId}`;
  }

  if (target.type === 'contact') {
    return `${target.contactId}:${target.optionId}`;
  }

  if (target.type === 'faction') {
    return `${target.factionId}:${target.accordId}`;
  }

  return target.id;
}

function getTargetReportLabel(target: TargetRunStats): string {
  switch (target.targetType) {
    case 'district':
      return getDistrictDefinition(target.targetId as DistrictId)?.name ?? target.targetId;
    case 'venue':
      return getVenueDefinition(target.targetId as VenueId)?.name ?? target.targetId;
    case 'rival':
      return getRivalDefinition(target.targetId as RivalId)?.name ?? target.targetId;
    case 'recruit':
      return getOperativeDefinition(target.targetId as OperativeId)?.name ?? target.targetId;
    case 'ledger':
      return target.targetId;
    case 'contact':
      return target.targetId;
    case 'front_opportunity':
    case 'front':
      return target.targetId;
    case 'faction':
      return getFactionTargetLabel(target.targetId);
  }
}

function getFactionTargetLabel(targetId: string): string {
  const [factionId, accordId] = targetId.split(':') as [FactionId, AccordId];
  const faction = getFactionDefinition(factionId)?.name ?? factionId;
  const accord = getAccordDefinition(accordId)?.label ?? accordId;

  return `${faction} - ${accord}`;
}

function selectMostSelectedTarget(targets: readonly TargetReport[]): TargetReport | undefined {
  return [...targets].sort(
    (left, right) =>
      right.selections - left.selections || left.targetLabel.localeCompare(right.targetLabel),
  )[0];
}

function selectMostDangerousTarget(targets: readonly TargetReport[]): TargetReport | undefined {
  return [...targets]
    .filter((target) => target.selections >= DANGEROUS_TARGET_MINIMUM_SELECTIONS)
    .sort(
      (left, right) =>
        right.complicationRate - left.complicationRate ||
        right.selections - left.selections ||
        left.targetLabel.localeCompare(right.targetLabel),
    )[0];
}

function createEmptyRivalPressureTotals(): Record<RivalId, number> {
  return RIVAL_TERRITORY_RIVALS.reduce(
    (totals, rival) => ({
      ...totals,
      [rival.id]: 0,
    }),
    {} as Record<RivalId, number>,
  );
}

function createEmptyDistrictTotals(): Record<DistrictId, DistrictAverage> {
  return RIVAL_TERRITORY_DISTRICTS.reduce(
    (totals, district) => ({
      ...totals,
      [district.id]: {
        control: 0,
        heat: 0,
      },
    }),
    {} as Record<DistrictId, DistrictAverage>,
  );
}

function createEmptyContextualEventCounts(): ContextualEventCounts {
  return {
    influencedSelections: 0,
    targetTagInfluenced: 0,
    rivalPressureInfluenced: 0,
    localHeatInfluenced: 0,
  };
}

function addContextualEventCounts(
  totals: ContextualEventCounts,
  counts: ContextualEventCounts,
): void {
  totals.influencedSelections += counts.influencedSelections;
  totals.targetTagInfluenced += counts.targetTagInfluenced;
  totals.rivalPressureInfluenced += counts.rivalPressureInfluenced;
  totals.localHeatInfluenced += counts.localHeatInfluenced;
}

function createEmptyPressureTotals(): Pressures {
  return PRESSURE_IDS.reduce(
    (totals, pressure) => ({
      ...totals,
      [pressure]: 0,
    }),
    {} as Pressures,
  );
}

function averageRivalPressures(
  totals: Record<RivalId, number>,
  runs: number,
): Record<RivalId, number> {
  return RIVAL_TERRITORY_RIVALS.reduce(
    (averages, rival) => ({
      ...averages,
      [rival.id]: runs > 0 ? totals[rival.id] / runs : 0,
    }),
    {} as Record<RivalId, number>,
  );
}

function averageDistricts(
  totals: Record<DistrictId, DistrictAverage>,
  runs: number,
): Record<DistrictId, DistrictAverage> {
  return RIVAL_TERRITORY_DISTRICTS.reduce(
    (averages, district) => ({
      ...averages,
      [district.id]: {
        control: runs > 0 ? totals[district.id].control / runs : 0,
        heat: runs > 0 ? totals[district.id].heat / runs : 0,
      },
    }),
    {} as Record<DistrictId, DistrictAverage>,
  );
}

function averagePressures(totals: Pressures, runs: number): Pressures {
  if (runs === 0) {
    return { ...totals };
  }

  return PRESSURE_IDS.reduce(
    (average, pressure) => ({
      ...average,
      [pressure]: totals[pressure] / runs,
    }),
    {} as Pressures,
  );
}

function createAgentDecisionContext(seed: string): AgentDecisionContext {
  let rng = createRng(seed);

  return {
    nextInt: (minInclusive, maxInclusive) => {
      const roll = nextInt(rng, minInclusive, maxInclusive);
      rng = roll.rng;
      return roll.value;
    },
    pick: (items) => {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty list.');
      }

      const index = nextInt(rng, 0, items.length - 1);
      rng = index.rng;
      return items[index.value];
    },
  };
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function formatSourceLabel(source: SourceBreakdownReport | undefined): string {
  if (!source) {
    return '';
  }

  return `${source.sourceLabel} (${source.sourceKind})`;
}

function appendTrace(
  trace: HarnessTraceEntry[],
  collectTrace: boolean | undefined,
  state: GameState,
  message: string,
): void {
  if (!collectTrace) {
    return;
  }

  trace.push({
    week: state.week,
    phase: state.phase,
    message,
  });
}
