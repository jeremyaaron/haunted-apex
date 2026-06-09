import type { ActionId, ActionTarget } from './actions';
import type { DistrictId } from './districts';
import type { EventId } from './events';
import type { OperativeId } from './operatives';
import type { PressureDelta, Pressures } from './pressures';
import type { RivalId } from './rivals';
import type { VenueId } from './venues';

export type LedgerEntryKind = 'secret' | 'debt' | 'favor';

export type LedgerEntryDefinitionId =
  | 'secret_patrol_schedule'
  | 'secret_magistrate_glass_room'
  | 'secret_nyx_velvet_ledger'
  | 'secret_knox_route_manifests'
  | 'secret_ghostline_buyer_list'
  | 'secret_dead_channel_trace'
  | 'debt_owes_liaison'
  | 'debt_unfunded_promise'
  | 'debt_contaminated_money'
  | 'debt_saints_payment_trail'
  | 'favor_checkpoint_captain'
  | 'favor_hidden_route';

export type LedgerEntryId = string;
export type LedgerUseOptionId = string;
export type LedgerEntryRarity = 'common' | 'uncommon' | 'rare';
export type LedgerPotency = 1 | 2 | 3;

export type LedgerPressureCost = Partial<Pick<Pressures, 'resources' | 'intel'>>;

export type LedgerDiscoveryProfile = {
  targetTags?: readonly string[];
  rivalIds?: readonly RivalId[];
  districtIds?: readonly DistrictId[];
  venueIds?: readonly VenueId[];
  minIntel?: number;
  baseWeight: number;
};

export type LedgerUseOptionDefinition = {
  id: LedgerUseOptionId;
  label: string;
  description?: string;
  cost?: LedgerPressureCost;
  effects: PressureDelta;
  consumesEntry: boolean;
  riskModifier?: number;
  tags?: readonly string[];
};

export type LedgerEntryDefinition = {
  id: LedgerEntryDefinitionId;
  kind: LedgerEntryKind;
  name: string;
  description: string;
  rarity: LedgerEntryRarity;
  tags: readonly string[];
  useOptions: readonly LedgerUseOptionDefinition[];
  discovery?: LedgerDiscoveryProfile;
  unique?: boolean;
  repeatWeightMultiplier?: number;
  flavor?: {
    shortLabel?: string;
    visualTags?: readonly string[];
  };
};

export type LedgerEntrySource =
  | {
      type: 'event';
      eventId: EventId;
      choiceId: string;
    }
  | {
      type: 'action';
      actionId: ActionId;
      target?: ActionTarget;
    }
  | {
      type: 'operative_event';
      operativeId: OperativeId;
      eventId: EventId;
    };

export type LedgerConsumptionSource =
  | {
      type: 'action';
      actionId: 'work_the_ledger';
      useOptionId: LedgerUseOptionId;
    }
  | {
      type: 'event';
      eventId: EventId;
      choiceId: string;
    };

export type LedgerEntry = {
  id: LedgerEntryId;
  definitionId: LedgerEntryDefinitionId;
  kind: LedgerEntryKind;
  createdWeek: number;
  source: LedgerEntrySource;
  potency: LedgerPotency;
  revealed: boolean;
  consumed: boolean;
  consumedWeek?: number;
  consumedBy?: LedgerConsumptionSource;
  relatedTarget?: ActionTarget;
  relatedOperativeId?: OperativeId;
  relatedRivalId?: RivalId;
  flags?: Record<string, boolean | number | string>;
};

export type LedgerState = {
  entries: LedgerEntry[];
  discoveredCount: number;
  consumedCount: number;
};
