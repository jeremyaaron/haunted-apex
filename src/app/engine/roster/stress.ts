import type { StressTier } from '../model';

export function getStressTier(stress: number): StressTier {
  if (stress < 40) {
    return 'stable';
  }

  if (stress < 60) {
    return 'strained';
  }

  if (stress < 80) {
    return 'unstable';
  }

  return 'breaking';
}

export function getStressRiskModifier(stress: number): number {
  switch (getStressTier(stress)) {
    case 'stable':
      return 0;
    case 'strained':
      return 2;
    case 'unstable':
      return 5;
    case 'breaking':
      return 10;
  }
}
