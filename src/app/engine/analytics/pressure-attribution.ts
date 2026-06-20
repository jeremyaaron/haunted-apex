import { PRESSURE_IDS, type PressureId, type Pressures } from '../model';

export type PressureDeltaEntry = {
  pressure: PressureId;
  before: number;
  after: number;
  delta: number;
};

export function diffPressures(before: Pressures, after: Pressures): readonly PressureDeltaEntry[] {
  return PRESSURE_IDS.flatMap((pressure) => {
    const previous = before[pressure];
    const current = after[pressure];
    const delta = current - previous;

    return delta === 0
      ? []
      : [
          {
            pressure,
            before: previous,
            after: current,
            delta,
          },
        ];
  });
}
