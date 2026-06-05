export type OperativeSkill = 'violence' | 'charm' | 'tech' | 'subtlety';

export type OperativeStatus = 'available' | 'assigned' | 'idle' | 'injured' | 'compromised';

export type Operative = {
  id: string;
  name: string;
  archetype: string;
  loyalty: number;
  stress: number;
  violence: number;
  charm: number;
  tech: number;
  subtlety: number;
  traitIds: string[];
  status: OperativeStatus;
};

export type RecruitCandidate = {
  id: string;
  name: string;
  archetype: string;
  violence: number;
  charm: number;
  tech: number;
  subtlety: number;
  traitIds: string[];
};

