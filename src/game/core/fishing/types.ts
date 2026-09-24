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
