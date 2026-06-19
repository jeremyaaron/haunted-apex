import type {
  ActionId,
  ActionTarget,
  EventId,
  OperativeId,
  RunMode,
  RunValidationStatus,
} from '../model';
import type { ActionPreview } from '../selectors';
import type { DominionPaceView } from './dominion-pace';

export type AdvisorMode = 'off' | 'hints' | 'coach' | 'handler';

export type AdvisorConfidence = 'high' | 'medium' | 'low';

export type HandlerRecommendationPhase = 'command' | 'event' | 'game_over';

export type HandlerReasonCode =
  | 'dominion_pace'
  | 'heat_crisis'
  | 'resource_danger'
  | 'loyalty_danger'
  | 'useful_ledger'
  | 'front_exposure'
  | 'faction_obligation'
  | 'contact_volatility'
  | 'operative_stress'
  | 'campaign_priority'
  | 'plan_warning'
  | 'training_safety';

export type AdvisorMessageTone = 'info' | 'good' | 'warning' | 'danger';

export type AdvisorMessage = {
  id: string;
  tone: AdvisorMessageTone;
  text: string;
  reasonCode?: HandlerReasonCode;
};

export type AdvisorRecommendationView = {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  chips: string[];
  confidence: AdvisorConfidence;
  recommendedActionId?: ActionId;
  recommendedTargetKey?: string;
  recommendedOperativeId?: OperativeId;
  recommendedEventChoiceId?: string;
};

export type AdvisorViewModel = {
  mode: AdvisorMode;
  runMode: RunMode;
  validationStatus: RunValidationStatus;
  phase: HandlerRecommendationPhase;
  title: string;
  summary: string;
  dominionPace: DominionPaceView;
  currentRead: AdvisorMessage[];
  recommendations: AdvisorRecommendationView[];
  warnings: AdvisorMessage[];
  opportunities: AdvisorMessage[];
  confidence: AdvisorConfidence;
};

export type HandlerRecommendedOrder = {
  actionId: ActionId;
  actionLabel: string;
  target?: ActionTarget;
  targetLabel?: string;
  assignedOperativeId?: OperativeId;
  operativeName?: string;
  preview: ActionPreview;
  confidence: AdvisorConfidence;
  reason: string;
  reasonCodes: HandlerReasonCode[];
  warnings: AdvisorMessage[];
};

export type HandlerEventRecommendation = {
  eventId: EventId;
  choiceId: string;
  choiceLabel: string;
  confidence: AdvisorConfidence;
  reason: string;
  reasonCodes: HandlerReasonCode[];
  warnings: AdvisorMessage[];
};

export type HandlerInvalidRecommendation = {
  id: string;
  reason: string;
};

export type HandlerRecommendation = {
  phase: HandlerRecommendationPhase;
  confidence: AdvisorConfidence;
  currentRead: AdvisorMessage[];
  recommendedOrders: HandlerRecommendedOrder[];
  eventRecommendation?: HandlerEventRecommendation;
  warnings: AdvisorMessage[];
  opportunities: AdvisorMessage[];
  planAssessment?: string;
  invalidRecommendations: HandlerInvalidRecommendation[];
};
