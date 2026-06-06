import type { ActionId, ActionTarget } from './actions';
import type { RivalId } from './rivals';

export type RecentActivityEntry = {
  id: string;
  week: number;
  actionId: ActionId;
  target?: ActionTarget;
  targetTags: string[];
  rivalId?: RivalId;
  heatDelta: number;
  dominionDelta: number;
};
