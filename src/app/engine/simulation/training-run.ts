import type { NewGameConfig } from '../model';

export const TRAINING_RUN_CONFIG = {
  runMode: 'training',
  seed: 'TRAINING-GLASS-CROWN-001',
  campaignTensionId: 'campaign_dirty_capital',
  customSeed: false,
} as const satisfies NewGameConfig;
