export type RngState = {
  seed: string;
  cursor: number;
};

export type RngResult<T> = {
  value: T;
  rng: RngState;
};

export function createRng(seed: string, cursor = 0): RngState {
  return {
    seed: normalizeSeed(seed),
    cursor,
  };
}

export function normalizeSeed(seed: string): string {
  const normalized = seed.trim().toUpperCase();
  return normalized.length > 0 ? normalized : 'VIOLET-ASH-1047';
}

export function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function nextFloat(rng: RngState): RngResult<number> {
  const nextCursor = rng.cursor + 1;
  const value = unitFloat(hashSeed(rng.seed) + nextCursor);

  return {
    value,
    rng: {
      ...rng,
      cursor: nextCursor,
    },
  };
}

export function nextInt(rng: RngState, minInclusive: number, maxInclusive: number): RngResult<number> {
  const low = Math.ceil(minInclusive);
  const high = Math.floor(maxInclusive);

  if (high < low) {
    throw new Error(`Invalid integer range: ${minInclusive}..${maxInclusive}`);
  }

  const roll = nextFloat(rng);
  const value = Math.floor(roll.value * (high - low + 1)) + low;

  return {
    value,
    rng: roll.rng,
  };
}

export function createRunId(seed: string): string {
  return `run_${hashSeed(normalizeSeed(seed)).toString(36)}`;
}

export function createDefaultSeed(now = new Date()): string {
  const stamp = now.getTime().toString(36).toUpperCase();
  return `VIOLET-ASH-${stamp}`;
}

function unitFloat(input: number): number {
  let value = input >>> 0;

  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

