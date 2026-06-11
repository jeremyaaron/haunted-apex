import type { FrontStatus } from '../model';

export function deriveFrontStatus(exposure: number): FrontStatus {
  if (exposure < 30) {
    return 'quiet';
  }

  if (exposure < 60) {
    return 'noticed';
  }

  if (exposure < 80) {
    return 'hot';
  }

  return 'compromised';
}
