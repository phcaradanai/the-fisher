import { nextRandomFloat } from './random';
import { resolveSkillCheck } from './skill-check';
import type {
  CheckMode,
  CheckModeReason,
  CheckOutcome,
  FishIntent,
  FishIntentType,
  TurnActionPreview,
  TurnActionResolution,
  TurnCatchResult,
  TurnCombatEvent,
  TurnFishingAction,
  TurnFishingSession,
  TurnFishProfile,
  TurnGearStats,
  TurnPresentationEvent,
} from './turn-types';

const AP_PER_TURN = 2;
const START_DISTANCE = 44;
const START_TENSION = 34;
const MAX_DISTANCE = 100;
const CATCH_DISTANCE = 15;
const INTENT_ORDER: FishIntentType[] = [
  'steady-pull',
  'power-dash',
  'deep-dive',
  'thrash',
  'recover',
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function outcomeScale(outcome: CheckOutcome): number {
  switch (outcome) {
    case 'critical-failure':
      return 0;
    case 'failure':
      return 0.35;
    case 'partial-success':
      return 0.7;
    case 'success':
      return 1;
    case 'critical-success':
      return 1.25;
  }
}

function bossPhaseFor(
  fish: TurnFishProfile,
  stamina: number,
  currentPhase: 1 | 2 | 3 | null = null,
): 1 | 2 | 3 | null {
  const phases = fish.bossPhases;
  if (!phases) return currentPhase;

  const staminaRatio = stamina / Math.max(1, fish.stats.stamina);
  const targetPhase = staminaRatio <= phases.desperateAt
    ? 3
    : staminaRatio <= phases.frenzyAt ? 2 : 1;
  if (currentPhase === null) return targetPhase;
  if (targetPhase <= currentPhase) return currentPhase;
  return Math.min(currentPhase + 1, targetPhase) as 1 | 2 | 3;
}

function intentDifficulty(
  type: FishIntentType,
  fish: TurnFishProfile,
  phase: 1 | 2 | 3 | null,
): number {
  const phasePressure = phase === 3 ? 2 : phase === 2 ? 1 : 0;
  let difficulty: number;

  switch (type) {
    case 'steady-pull':
      difficulty = 7 + fish.stats.technique * 0.05 + fish.stats.resistance * 0.02;
      break;
    case 'power-dash':
      difficulty = 8 + fish.stats.power * 0.05 + fish.stats.speed * 0.035;
      break;
    case 'deep-dive':
      difficulty = 8 + fish.stats.resistance * 0.04 + fish.stats.technique * 0.025;
      break;
    case 'thrash':
      difficulty = 8 + fish.stats.power * 0.04 + fish.stats.technique * 0.035;
      break;
    case 'recover':
      difficulty = 8 + fish.stats.technique * 0.05;
      break;
  }

  return clamp(Math.round(difficulty + phasePressure), 5, 35);
}

function intentWeights(
  archetype: TurnFishProfile['archetype'],
  staminaRatio: number,
  phase: 1 | 2 | 3 | null,
): Record<FishIntentType, number> {
  const weights: Record<FishIntentType, number> = {
    'steady-pull': 20,
    'power-dash': 20,
    'deep-dive': 20,
    thrash: 20,
    recover: 20,
  };

  switch (archetype) {
    case 'calm':
      weights['steady-pull'] = 42;
      weights.recover = staminaRatio < 0.72 ? 30 : 18;
      weights['power-dash'] = 12;
      weights['deep-dive'] = 8;
      weights.thrash = 8;
      break;
    case 'sprinter':
      weights['power-dash'] = 44;
      weights['steady-pull'] = 18;
      weights['deep-dive'] = 18;
      weights.thrash = 12;
      weights.recover = 8;
      break;
    case 'diver':
      weights['deep-dive'] = 44;
      weights['steady-pull'] = 17;
      weights['power-dash'] = 14;
      weights.thrash = 15;
      weights.recover = 10;
      break;
    case 'bruiser':
      weights.thrash = 42;
      weights['power-dash'] = 18;
      weights['steady-pull'] = 17;
      weights['deep-dive'] = 13;
      weights.recover = 10;
      break;
    case 'trickster':
      weights['deep-dive'] = 24;
      weights['power-dash'] = 22;
      weights.thrash = 22;
      weights['steady-pull'] = 18;
      weights.recover = 14;
      break;
    case 'endurance':
      weights['steady-pull'] = 30;
      weights.recover = staminaRatio < 0.8 ? 30 : 18;
      weights['deep-dive'] = 20;
      weights.thrash = 12;
      weights['power-dash'] = 10;
      break;
    case 'berserker':
      if (phase === 3) {
        weights['power-dash'] = 38;
        weights.thrash = 27;
        weights['deep-dive'] = 16;
        weights['steady-pull'] = 7;
        weights.recover = 12;
      } else if (phase === 2) {
        weights['power-dash'] = 30;
        weights.thrash = 28;
        weights['deep-dive'] = 24;
        weights['steady-pull'] = 8;
        weights.recover = 10;
      } else {
        weights['steady-pull'] = 28;
        weights['deep-dive'] = 24;
        weights['power-dash'] = 20;
        weights.thrash = 18;
        weights.recover = 10;
      }
      break;
  }

  return weights;
}

function weightedIntent(
  seed: number,
  fish: TurnFishProfile,
  staminaRatio: number,
  phase: 1 | 2 | 3 | null,
): { seed: number; intent: FishIntent } {
  const weights = intentWeights(fish.archetype, staminaRatio, phase);
  const roll = nextRandomFloat(seed);
  const total = INTENT_ORDER.reduce((sum, type) => sum + weights[type], 0);
  let threshold = roll.value * total;
  let selected: FishIntentType = 'recover';

  for (const type of INTENT_ORDER) {
    threshold -= weights[type];
    if (threshold < 0) {
      selected = type;
      break;
    }
  }

  return {
    seed: roll.seed,
    intent: {
      type: selected,
      difficulty: intentDifficulty(selected, fish, phase),
    },
  };
}

function nextIntent(
  seed: number,
  fish: TurnFishProfile,
  stamina: number,
  currentPhase: 1 | 2 | 3 | null,
): { seed: number; phase: 1 | 2 | 3 | null; intent: FishIntent } {
  const phase = bossPhaseFor(fish, stamina, currentPhase);
  const staminaRatio = clamp(stamina / Math.max(1, fish.stats.stamina), 0, 1);
  const weighted = weightedIntent(seed, fish, staminaRatio, phase);
  return { ...weighted, phase };
}

function isBraceCounterIntent(intent: FishIntentType): boolean {
  return intent === 'power-dash' || intent === 'thrash';
}

function intentMode(action: TurnFishingAction, session: TurnFishingSession): {
  mode: CheckMode;
  reason: CheckModeReason;
} {
  if (session.insight) return { mode: 'advantage', reason: 'observed-insight' };

  const intent = session.currentIntent.type;
  const aggressive = intent === 'power-dash' || intent === 'deep-dive' || intent === 'thrash';

  if (action === 'brace' && !session.braced && aggressive) {
    return { mode: 'advantage', reason: 'brace-counter' };
  }
  if ((action === 'pull' || action === 'reel') && session.braced && isBraceCounterIntent(intent)) {
    return { mode: 'advantage', reason: 'brace-counter' };
  }
  if ((action === 'pull' || action === 'reel') && intent === 'recover') {
    return { mode: 'advantage', reason: 'recovery-window' };
  }
  if ((action === 'reel' && intent === 'power-dash' && session.stamina > 0)
    || (action === 'pull' && aggressive)) {
    return { mode: 'disadvantage', reason: 'poor-response' };
  }

  return { mode: 'normal', reason: 'neutral' };
}

function actionModifier(action: TurnFishingAction, stats: TurnGearStats): number {
  let modifier = 0;

  switch (action) {
    case 'reel':
      modifier = stats.control * 0.3 + stats.reelSpeed * 0.25;
      break;
    case 'pull':
      modifier = stats.power * 0.4 + stats.control * 0.1;
      break;
    case 'brace':
      modifier = stats.control * 0.35 + stats.lineStrength * 0.15;
      break;
    case 'observe':
      modifier = stats.instinct * 0.55 + stats.control * 0.1;
      break;
    case 'release':
      return 0;
  }

  return Math.round(modifier + Math.floor(stats.luck / 4));
}

function actionDifficulty(action: TurnFishingAction, session: TurnFishingSession): number {
  if (action === 'observe') return Math.max(7, session.currentIntent.difficulty - 1);
  if (action === 'brace') return Math.max(7, session.currentIntent.difficulty - 2);
  return session.currentIntent.difficulty;
}

function presentationEvents(
  before: TurnFishingSession,
  afterPlayerAction: TurnFishingSession,
  after: TurnFishingSession,
  action: TurnFishingAction,
  fishActionResolved: boolean,
): TurnPresentationEvent[] {
  const events: TurnPresentationEvent[] = [];
  const add = (event: Omit<TurnPresentationEvent, 'order' | 'sequence'>) => {
    events.push({ ...event, sequence: after.eventSequence, order: events.length });
  };

  add({ type: 'PLAYER_ACTION_RESOLVED', action });
  if (afterPlayerAction.lastCheck) add({ type: 'CHECK_RESOLVED', check: afterPlayerAction.lastCheck });
  if (afterPlayerAction.stamina < before.stamina) {
    add({
      type: 'STAMINA_DAMAGED',
      amount: before.stamina - afterPlayerAction.stamina,
      value: afterPlayerAction.stamina,
    });
  }
  add({
    type: 'AP_CHANGED',
    amount: 1,
    previousValue: before.ap,
    value: afterPlayerAction.ap,
  });
  if (fishActionResolved) {
    add({ type: 'FISH_ACTION_RESOLVED', intent: before.currentIntent.type });
  }
  if (after.lineDurability < afterPlayerAction.lineDurability) {
    add({
      type: 'LINE_DAMAGED',
      amount: afterPlayerAction.lineDurability - after.lineDurability,
      value: after.lineDurability,
    });
  }
  if (fishActionResolved && after.turn > before.turn) {
    add({ type: 'INTENT_REVEALED', intent: after.currentIntent.type, value: after.currentIntent.difficulty });
  }
  if (after.phase === 'caught') add({ type: 'FISH_CAUGHT' });
  else if (after.phase === 'escaped') add({ type: 'ESCAPED' });
  else if (after.phase === 'line-break') add({ type: 'LINE_BREAK' });
  return events;
}

export function previewTurnFishingAction(
  session: TurnFishingSession,
  action: TurnFishingAction,
  _fish: TurnFishProfile,
  stats: TurnGearStats,
): TurnActionPreview {
  if (action === 'release') {
    return { mode: null, modeReason: null, modifier: 0, difficulty: null };
  }

  const intent = intentMode(action, session);
  return {
    mode: intent.mode,
    modeReason: intent.reason,
    modifier: actionModifier(action, stats),
    difficulty: actionDifficulty(action, session),
  };
}

function markEvent(session: TurnFishingSession, event: TurnCombatEvent): TurnFishingSession {
  return {
    ...session,
    lastEvent: event,
    eventSequence: session.eventSequence + 1,
  };
}

function finishCaught(session: TurnFishingSession, fish: TurnFishProfile): TurnFishingSession {
  const roll = nextRandomFloat(session.seed);
  const low = Math.max(1, Math.min(fish.sizeRangeCm.min, fish.sizeRangeCm.max));
  const high = Math.max(low, Math.max(fish.sizeRangeCm.min, fish.sizeRangeCm.max));
  const lengthCm = Math.round(low + roll.value * (high - low));
  const result: TurnCatchResult = {
    fishId: fish.id,
    lengthCm,
    weightKg: Math.round((lengthCm ** 3 / 100_000) * 100) / 100,
  };

  return markEvent({
    ...session,
    seed: roll.seed,
    phase: 'caught',
    result,
  }, 'caught');
}

function finishFailure(
  session: TurnFishingSession,
  phase: 'escaped' | 'line-break',
): TurnFishingSession {
  return markEvent({ ...session, phase }, phase);
}

function applyCheckAction(
  session: TurnFishingSession,
  action: Exclude<TurnFishingAction, 'release'>,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): { seed: number; session: TurnFishingSession; observationSucceeded: boolean } {
  const preview = previewTurnFishingAction(session, action, fish, stats);
  const check = resolveSkillCheck(
    session.seed,
    preview.mode ?? 'normal',
    preview.modifier,
    preview.difficulty ?? session.currentIntent.difficulty,
    preview.modeReason ?? 'neutral',
  );
  const scale = outcomeScale(check.result.outcome);
  let stamina = session.stamina;
  let distance = session.distance;
  let tension = session.tension;
  let braced = session.braced;
  let insight = false;
  let observationSucceeded = false;

  switch (action) {
    case 'reel':
      if (scale === 0) {
        distance += 2;
        tension += 12;
      } else {
        distance -= (8.5 + stats.reelSpeed * 0.8) * scale;
        stamina -= (1.5 + Math.max(0, stats.power) * 0.15) * scale;
        tension += Math.max(1, 6 - stats.control * 0.35) * (1.15 - scale * 0.15);
      }
      break;
    case 'pull': {
      if (scale === 0) {
        distance += 3;
        tension += 13;
      } else {
        const phaseDamageMultiplier = fish.archetype === 'berserker'
          ? session.bossPhase === 3 ? 1.7 : session.bossPhase === 2 ? 1.4 : 1
          : 1;
        stamina -= (9 + Math.max(0, stats.power) * 0.75) * scale * phaseDamageMultiplier;
        distance -= (7.5 + Math.max(0, stats.power) * 0.35) * scale;
        tension += Math.max(3, 9 - stats.control * 0.35 - stats.lineStrength * 0.2)
          * (1.15 - scale * 0.18);
      }
      break;
    }
    case 'brace':
      braced = scale > 0;
      if (check.result.outcome === 'critical-success') tension -= 8;
      else if (scale > 0) tension -= 4;
      if (scale === 0) tension += 9;
      break;
    case 'observe':
      observationSucceeded = check.result.outcome !== 'critical-failure' && check.result.outcome !== 'failure';
      insight = observationSucceeded;
      if (check.result.outcome === 'critical-success') tension -= 4;
      break;
  }

  const next = markEvent({
    ...session,
    seed: check.seed,
    stamina: clamp(stamina, 0, session.maxStamina),
    distance: clamp(distance, 0, MAX_DISTANCE),
    tension: clamp(tension, 0, 120),
    braced,
    insight,
    lastAction: action,
    lastIntent: session.currentIntent.type,
    lastCheck: check.result,
  }, `action-${action}`);

  return { seed: check.seed, session: next, observationSucceeded };
}

function resolveFishAction(
  session: TurnFishingSession,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): TurnFishingSession {
  const intent = session.currentIntent.type;
  let distancePressure = 0;
  let tensionPressure = 0;
  let staminaRecovery = 0;

  switch (intent) {
    case 'steady-pull':
      distancePressure = 3 + fish.stats.speed * 0.035;
      tensionPressure = 2 + fish.stats.resistance * 0.02;
      break;
    case 'power-dash':
      distancePressure = 7 + fish.stats.speed * 0.06 + fish.stats.power * 0.025;
      tensionPressure = 8 + fish.stats.power * 0.05;
      break;
    case 'deep-dive':
      distancePressure = 6 + fish.stats.speed * 0.05;
      tensionPressure = 11 + fish.stats.resistance * 0.035;
      break;
    case 'thrash':
      distancePressure = 2 + fish.stats.speed * 0.02;
      tensionPressure = 13 + fish.stats.power * 0.05;
      break;
    case 'recover':
      tensionPressure = -12;
      staminaRecovery = fish.archetype === 'berserker'
        ? 3
        : 5 + fish.stats.resistance * 0.04;
      break;
  }

  if (session.bossPhase === 2) {
    distancePressure *= 1.2;
    tensionPressure *= 1.12;
  } else if (session.bossPhase === 3) {
    distancePressure *= 1.8;
    tensionPressure *= 1.15;
  }

  let lineDamageMultiplier = 1;
  if (session.braced && (intent === 'power-dash' || intent === 'deep-dive' || intent === 'thrash')) {
    distancePressure *= 0.25;
    tensionPressure *= 0.42;
    lineDamageMultiplier *= 0.4;
  }
  if (session.releasedThisTurn && (intent === 'deep-dive' || intent === 'thrash')) {
    tensionPressure *= 0.38;
    lineDamageMultiplier *= 0.5;
  }

  const tension = clamp(session.tension + tensionPressure, 0, 120);
  const distance = clamp(session.distance + distancePressure, 0, MAX_DISTANCE);
  const stamina = clamp(session.stamina + staminaRecovery, 0, session.maxStamina);
  const dangerLine = 78 + stats.lineStrength * 0.8;

  let lineDamage = 0;
  if (tension >= dangerLine) lineDamage += 2 + (tension - dangerLine) * 0.2;
  if (intent === 'thrash' && tension >= 45) lineDamage += 2 + fish.stats.power * 0.04;
  lineDamage *= lineDamageMultiplier;
  const lineDurability = clamp(session.lineDurability - lineDamage, 0, session.maxLineDurability);

  let next: TurnFishingSession = {
    ...session,
    stamina,
    distance,
    tension,
    lineDurability,
    braced: false,
    releasedThisTurn: false,
  };

  if (tension >= 100 || lineDurability <= 0) return finishFailure(next, 'line-break');
  if (distance >= MAX_DISTANCE) return finishFailure(next, 'escaped');
  if (stamina <= 0 && distance <= (fish.catchDistance ?? CATCH_DISTANCE)) return finishCaught(next, fish);

  const intentRoll = nextIntent(next.seed, fish, next.stamina, session.bossPhase);
  next = {
    ...next,
    seed: intentRoll.seed,
    turn: next.turn + 1,
    ap: next.maxAp,
    currentIntent: intentRoll.intent,
    bossPhase: intentRoll.phase,
    releasedThisTurn: false,
  };
  return markEvent(next, lineDamage > 0 ? 'line-damaged' : 'fish-action');
}

function settleAfterPlayerAction(
  session: TurnFishingSession,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): { session: TurnFishingSession; fishActionResolved: boolean } {
  if (session.stamina <= 0 && session.distance <= (fish.catchDistance ?? CATCH_DISTANCE)) {
    return { session: finishCaught(session, fish), fishActionResolved: false };
  }
  if (session.tension >= 100 || session.lineDurability <= 0) {
    return { session: finishFailure(session, 'line-break'), fishActionResolved: false };
  }
  if (session.distance >= MAX_DISTANCE) return { session: finishFailure(session, 'escaped'), fishActionResolved: false };
  if (session.ap > 0) return { session, fishActionResolved: false };
  return { session: resolveFishAction(session, fish, stats), fishActionResolved: true };
}

export function createTurnFishingSession(
  seed: number,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): TurnFishingSession {
  const safeSeed = Math.trunc(Number.isFinite(seed) ? seed : 1) >>> 0;
  const maxStamina = clamp(fish.stats.stamina, 1, 500);
  const maxLineDurability = clamp(100 + stats.lineStrength * 2.3, 60, 150);
  const initialPhase = bossPhaseFor(fish, maxStamina);
  const roll = weightedIntent(safeSeed, fish, 1, initialPhase);

  return {
    phase: 'player-turn',
    seed: roll.seed,
    fishId: fish.id,
    turn: 1,
    ap: AP_PER_TURN,
    maxAp: AP_PER_TURN,
    stamina: maxStamina,
    maxStamina,
    tension: START_TENSION,
    distance: START_DISTANCE,
    maxDistance: MAX_DISTANCE,
    lineDurability: maxLineDurability,
    maxLineDurability,
    currentIntent: roll.intent,
    bossPhase: initialPhase,
    braced: false,
    releasedThisTurn: false,
    insight: false,
    lastAction: null,
    lastIntent: null,
    lastCheck: null,
    lastEvent: 'fish-intent',
    eventSequence: 1,
    result: null,
  };
}

export function createTurnFishingSessionEvents(session: TurnFishingSession): TurnPresentationEvent[] {
  return [
    {
      type: 'CAST',
      sequence: session.eventSequence,
      order: 0,
      value: session.distance,
    },
    {
      type: 'INTENT_REVEALED',
      sequence: session.eventSequence,
      order: 1,
      intent: session.currentIntent.type,
      value: session.currentIntent.difficulty,
    },
  ];
}

export function applyTurnFishingAction(
  session: TurnFishingSession,
  action: TurnFishingAction,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): TurnActionResolution {
  if (session.phase !== 'player-turn' || session.ap <= 0 || session.fishId !== fish.id) {
    return { session, observationSucceeded: false, events: [] };
  }

  let next: TurnFishingSession;
  let observationSucceeded = false;

  if (action === 'release') {
    next = markEvent({
      ...session,
      ap: session.ap - 1,
      tension: clamp(session.tension - (18 + stats.control * 0.7), 0, 120),
      distance: clamp(session.distance + 5 + fish.stats.speed * 0.025, 0, MAX_DISTANCE),
      releasedThisTurn: true,
      lastAction: action,
      lastIntent: session.currentIntent.type,
      lastCheck: null,
      insight: false,
    }, 'action-release');
  } else {
    const result = applyCheckAction(session, action, fish, stats);
    next = { ...result.session, ap: session.ap - 1 };
    observationSucceeded = result.observationSucceeded;
  }

  const settlement = settleAfterPlayerAction(next, fish, stats);
  return {
    session: settlement.session,
    observationSucceeded,
    events: presentationEvents(session, next, settlement.session, action, settlement.fishActionResolved),
  };
}

export function isTurnCombatTerminal(phase: TurnFishingSession['phase']): boolean {
  return phase === 'caught' || phase === 'escaped' || phase === 'line-break';
}
