export type FishingPhase =
  | 'ready'
  | 'casting'
  | 'waiting'
  | 'bite'
  | 'fighting'
  | 'caught'
  | 'escaped'
  | 'line-break';

export type FishBehavior = 'steady' | 'darting' | 'ambush' | 'king';

export interface FishProfile {
  id: string;
  behavior: FishBehavior;
  stats: {
    power: number;
    stamina: number;
    speed: number;
    technique: number;
  };
  sizeRangeCm: {
    min: number;
    max: number;
  };
}

export interface GearEffects {
  power: number;
  control: number;
  lineStrength: number;
  reelSpeed: number;
  attraction: number;
  skillPower: number;
}

export type FishingAction = 'cast' | 'hook' | 'reel' | 'pull' | 'release' | 'skill';

export type FishingEvent =
  | 'cast'
  | 'splash'
  | 'bite'
  | 'hooked'
  | 'fish-dash'
  | 'tension-warning'
  | 'skill-used'
  | 'caught'
  | 'escaped'
  | 'line-break';

export interface CatchResult {
  fishId: string;
  lengthCm: number;
  weightKg: number;
}

export interface FishingSession {
  phase: FishingPhase;
  seed: number;
  totalElapsedMs: number;
  phaseElapsedMs: number;
  fishId: string | null;
  stamina: number;
  maxStamina: number;
  tension: number;
  distance: number;
  waitMs: number;
  biteWindowMs: number;
  skillCooldownMs: number;
  fishDirection: -1 | 1;
  event: FishingEvent | null;
  result: CatchResult | null;
}
