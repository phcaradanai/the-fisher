export type TurnCombatPhase = 'ready' | 'player-turn' | 'caught' | 'escaped' | 'line-break';

export type TurnFishingAction = 'reel' | 'pull' | 'release' | 'brace' | 'observe';

export type FishArchetype =
  | 'calm'
  | 'sprinter'
  | 'diver'
  | 'bruiser'
  | 'trickster'
  | 'endurance'
  | 'berserker';

export type FishIntentType = 'steady-pull' | 'power-dash' | 'deep-dive' | 'thrash' | 'recover';

export type CheckMode = 'advantage' | 'normal' | 'disadvantage';

export type CheckOutcome =
  | 'critical-failure'
  | 'failure'
  | 'partial-success'
  | 'success'
  | 'critical-success';

export type CheckModeReason =
  | 'observed-insight'
  | 'brace-counter'
  | 'poor-response'
  | 'recovery-window'
  | 'neutral';

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
  sizeRangeCm: {
    min: number;
    max: number;
  };
  catchDistance?: number;
  bossPhases?: {
    frenzyAt: number;
    desperateAt: number;
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
  modeReason: CheckModeReason;
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
  | 'line-damaged'
  | 'caught'
  | 'escaped'
  | 'line-break';

/** Ephemeral, ordered cues for the presentation layer. Never include in saves. */
export type TurnPresentationEventType =
  | 'CAST'
  | 'PLAYER_ACTION_RESOLVED'
  | 'CHECK_RESOLVED'
  | 'AP_CHANGED'
  | 'STAMINA_DAMAGED'
  | 'LINE_DAMAGED'
  | 'FISH_ACTION_RESOLVED'
  | 'INTENT_REVEALED'
  | 'FISH_CAUGHT'
  | 'ESCAPED'
  | 'LINE_BREAK';

export interface TurnPresentationEvent {
  type: TurnPresentationEventType;
  /** Combat event sequence at which this cue was produced. */
  sequence: number;
  /** Position within one action resolution, starting at zero. */
  order: number;
  action?: TurnFishingAction;
  intent?: FishIntentType;
  check?: SkillCheckResult;
  previousValue?: number;
  amount?: number;
  value?: number;
}

export interface TurnCatchResult {
  fishId: string;
  lengthCm: number;
  weightKg: number;
}

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
  bossPhase: 1 | 2 | 3 | null;
  braced: boolean;
  releasedThisTurn: boolean;
  insight: boolean;
  lastAction: TurnFishingAction | null;
  lastIntent: FishIntentType | null;
  lastCheck: SkillCheckResult | null;
  lastEvent: TurnCombatEvent | null;
  eventSequence: number;
  result: TurnCatchResult | null;
}

export interface TurnActionResolution {
  session: TurnFishingSession;
  observationSucceeded: boolean;
  events: TurnPresentationEvent[];
}

export interface TurnActionPreview {
  mode: CheckMode | null;
  modeReason: CheckModeReason | null;
  modifier: number;
  difficulty: number | null;
}
