export type PressureId = 'dominion' | 'heat' | 'loyalty' | 'resources' | 'intel' | 'ruin';

export type Pressures = Record<PressureId, number>;

export type PressureDelta = Partial<Pressures>;

export const PRESSURE_IDS: readonly PressureId[] = [
  'dominion',
  'heat',
  'loyalty',
  'resources',
  'intel',
  'ruin',
] as const;

