export type TurnCombatPhase =
  | 'player-turn'
  | 'caught'
  | 'escaped'
  | 'line-break';

export type TurnFishingAction = 'reel' | 'pull' | 'release' | 'brace' | 'observe';

export type FishArchetype =
  | 'calm'
  | 'sprinter'
  | 'diver'
  | 'bruiser'
  | 'trickster'
  | 'endurance'
  | 'berserker';

export type FishIntentType =
  | 'steady-pull'
  | 'power-dash'
  | 'deep-dive'
  | 'thrash'
  | 'recover';

export type CheckMode = 'advantage' | 'normal' | 'disadvantage';

export type CheckOutcome =
  | 'critical-failure'
  | 'failure'
  | 'partial-success'
  | 'success'
  | 'critical-success';

export interface TurnFishProfile {
  id: string;
  archetype: FishArchetype;
  stats: {
    power: number;
    stamina: number;
    speed: number;
    technique: number;
    resistance: number;
  };
}

export interface TurnGearStats {
  power: number;
  control: number;
  lineStrength: number;
  reelSpeed: number;
  instinct: number;
  luck: number;
}

export interface FishIntent {
  type: FishIntentType;
  difficulty: number;
}

export interface SkillCheckResult {
  mode: CheckMode;
  rolls: number[];
  die: number;
  modifier: number;
  total: number;
  difficulty: number;
  outcome: CheckOutcome;
}

export type TurnCombatEvent =
  | 'action-reel'
  | 'action-pull'
  | 'action-release'
  | 'action-brace'
  | 'action-observe'
  | 'fish-action'
  | 'fish-intent'
  | 'fish-staggered'
  | 'tension-warning'
  | 'line-damaged'
  | 'caught'
  | 'escaped'
  | 'line-break';

export interface TurnFishingSession {
  phase: TurnCombatPhase;
  seed: number;
  fishId: string;
  turn: number;
  ap: number;
  maxAp: number;
  stamina: number;
  maxStamina: number;
  tension: number;
  distance: number;
  maxDistance: number;
  lineDurability: number;
  maxLineDurability: number;
  currentIntent: FishIntent;
  braced: boolean;
  releasedThisTurn: boolean;
  insight: boolean;
  lastCheck: SkillCheckResult | null;
  lastEvent: TurnCombatEvent | null;
}

export interface TurnActionResolution {
  session: TurnFishingSession;
  knowledgeDiscovered: boolean;
}
