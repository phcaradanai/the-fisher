import { nextRandomFloat } from './random';
import { resolveSkillCheck } from './skill-check';
import type {
  CheckMode,
  CheckOutcome,
  FishIntent,
  FishIntentType,
  TurnActionResolution,
  TurnFishProfile,
  TurnFishingAction,
  TurnFishingSession,
  TurnGearStats,
} from './turn-types';

const DEFAULT_AP = 2;
const DEFAULT_DISTANCE = 45;
const DEFAULT_TENSION = 35;
const DEFAULT_MAX_DISTANCE = 100;
const DEFAULT_LINE_DURABILITY = 100;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const rating = (value: number): number => clamp(value, 0, 100);
const gear = (value: number): number => clamp(value, -10, 20);

function outcomeScale(outcome: CheckOutcome): number {
  switch (outcome) {
    case 'critical-failure':
      return 0;
    case 'failure':
      return 0.25;
    case 'partial-success':
      return 0.6;
    case 'success':
      return 1;
    case 'critical-success':
      return 1.5;
  }
}

function intentDifficulty(type: FishIntentType, fish: TurnFishProfile): number {
  const power = rating(fish.stats.power);
  const speed = rating(fish.stats.speed);
  const technique = rating(fish.stats.technique);
  const resistance = rating(fish.stats.resistance);

  switch (type) {
    case 'steady-pull':
      return 9 + Math.round((power + technique) / 40);
    case 'power-dash':
      return 10 + Math.round((power + speed) / 32);
    case 'deep-dive':
      return 10 + Math.round((power + resistance) / 32);
    case 'thrash':
      return 10 + Math.round((power + technique) / 30);
    case 'recover':
      return 9 + Math.round((technique + resistance) / 42);
  }
}

function weightedIntent(seed: number, fish: TurnFishProfile, staminaRatio: number): {
  seed: number;
  intent: FishIntent;
} {
  const random = nextRandomFloat(seed);
  const weights: Record<FishIntentType, number> = {
    'steady-pull': 20,
    'power-dash': 20,
    'deep-dive': 20,
    thrash: 20,
    recover: 20,
  };

  switch (fish.archetype) {
    case 'calm':
      Object.assign(weights, { 'steady-pull': 45, 'power-dash': 12, 'deep-dive': 12, thrash: 12, recover: 19 });
      break;
    case 'sprinter':
      Object.assign(weights, { 'steady-pull': 15, 'power-dash': 48, 'deep-dive': 10, thrash: 17, recover: 10 });
      break;
    case 'diver':
      Object.assign(weights, { 'steady-pull': 15, 'power-dash': 12, 'deep-dive': 50, thrash: 13, recover: 10 });
      break;
    case 'bruiser':
      Object.assign(weights, { 'steady-pull': 24, 'power-dash': 12, 'deep-dive': 15, thrash: 41, recover: 8 });
      break;
    case 'trickster':
      Object.assign(weights, { 'steady-pull': 18, 'power-dash': 28, 'deep-dive': 24, thrash: 22, recover: 8 });
      break;
    case 'endurance':
      Object.assign(weights, { 'steady-pull': 29, 'power-dash': 10, 'deep-dive': 16, thrash: 15, recover: 30 });
      break;
    case 'berserker':
      if (staminaRatio <= 0.5) {
        Object.assign(weights, { 'steady-pull': 8, 'power-dash': 38, 'deep-dive': 18, thrash: 31, recover: 5 });
      } else {
        Object.assign(weights, { 'steady-pull': 20, 'power-dash': 26, 'deep-dive': 20, thrash: 24, recover: 10 });
      }
      break;
  }

  const entries = Object.entries(weights) as Array<[FishIntentType, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random.value * total;
  let selected: FishIntentType = entries[0]?.[0] ?? 'steady-pull';

  for (const [type, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) {
      selected = type;
      break;
    }
  }

  return {
    seed: random.seed,
    intent: {
      type: selected,
      difficulty: intentDifficulty(selected, fish),
    },
  };
}

function actionMode(
  action: TurnFishingAction,
  intent: FishIntentType,
  insight: boolean,
): CheckMode {
  if (insight) return 'advantage';

  if (action === 'brace' && ['power-dash', 'deep-dive', 'thrash'].includes(intent)) {
    return 'advantage';
  }
  if (action === 'reel' && ['power-dash', 'deep-dive'].includes(intent)) {
    return 'disadvantage';
  }
  if (action === 'pull' && ['power-dash', 'deep-dive', 'thrash'].includes(intent)) {
    return 'disadvantage';
  }
  if ((action === 'pull' || action === 'reel') && intent === 'recover') {
    return 'advantage';
  }

  return 'normal';
}

function actionModifier(action: TurnFishingAction, stats: TurnGearStats): number {
  const luck = Math.floor(gear(stats.luck) / 4);
  switch (action) {
    case 'reel':
      return Math.round((gear(stats.control) + gear(stats.reelSpeed)) / 2) + luck;
    case 'pull':
      return Math.round((gear(stats.power) + gear(stats.control) * 0.4)) + luck;
    case 'brace':
      return Math.round((gear(stats.control) + gear(stats.lineStrength)) / 2) + luck;
    case 'observe':
      return gear(stats.instinct) + luck;
    case 'release':
      return gear(stats.control);
  }
}

function actionDifficulty(action: TurnFishingAction, intent: FishIntent, fish: TurnFishProfile): number {
  if (action === 'observe') {
    return 9 + Math.round(rating(fish.stats.technique) / 18);
  }
  if (action === 'brace') {
    return Math.max(8, intent.difficulty - 1);
  }
  return intent.difficulty;
}

function applyCheckAction(
  session: TurnFishingSession,
  action: Exclude<TurnFishingAction, 'release'>,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): { session: TurnFishingSession; knowledgeDiscovered: boolean } {
  const mode = actionMode(action, session.currentIntent.type, session.insight);
  const checked = resolveSkillCheck(
    session.seed,
    mode,
    actionModifier(action, stats),
    actionDifficulty(action, session.currentIntent, fish),
  );
  const scale = outcomeScale(checked.result.outcome);

  let stamina = session.stamina;
  let distance = session.distance;
  let tension = session.tension;
  let braced = session.braced;
  let insight = false;
  let knowledgeDiscovered = false;

  if (action === 'reel') {
    if (checked.result.outcome === 'critical-failure') {
      distance += 5;
      tension += 12;
    } else {
      distance -= (7 + gear(stats.reelSpeed) * 0.7) * scale;
      stamina -= (1.5 + Math.max(0, gear(stats.power)) * 0.25) * scale;
      tension += Math.max(2, 8 - gear(stats.control) * 0.35) * (1.15 - scale * 0.15);
    }
  }

  if (action === 'pull') {
    if (checked.result.outcome === 'critical-failure') {
      distance += 3;
      tension += 18;
    } else {
      stamina -= (8 + Math.max(0, gear(stats.power)) * 0.9) * scale;
      distance -= (4 + Math.max(0, gear(stats.power)) * 0.25) * scale;
      tension += Math.max(5, 14 - gear(stats.control) * 0.35) * (1.2 - scale * 0.2);
    }
  }

  if (action === 'brace') {
    braced = checked.result.outcome !== 'critical-failure' && checked.result.outcome !== 'failure';
    if (checked.result.outcome === 'critical-success') tension -= 6;
    else if (checked.result.outcome === 'critical-failure') tension += 8;
  }

  if (action === 'observe') {
    knowledgeDiscovered = checked.result.outcome !== 'critical-failure' && checked.result.outcome !== 'failure';
    insight = knowledgeDiscovered;
    if (checked.result.outcome === 'critical-success') tension -= 4;
  }

  return {
    knowledgeDiscovered,
    session: {
      ...session,
      seed: checked.seed,
      stamina: clamp(stamina, 0, session.maxStamina),
      distance: clamp(distance, 0, session.maxDistance),
      tension: clamp(tension, 0, 100),
      braced,
      insight,
      lastCheck: checked.result,
      lastEvent: action === 'reel'
        ? 'action-reel'
        : action === 'pull'
          ? 'action-pull'
          : action === 'brace'
            ? 'action-brace'
            : 'action-observe',
    },
  };
}

function resolveFishAction(
  session: TurnFishingSession,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): TurnFishingSession {
  const intent = session.currentIntent.type;
  const fishPower = rating(fish.stats.power);
  const fishSpeed = rating(fish.stats.speed);
  let distance = session.distance;
  let tension = session.tension;
  let stamina = session.stamina;
  let lineDurability = session.lineDurability;

  let distancePressure = 0;
  let tensionPressure = 0;
  let lineDamage = 0;

  switch (intent) {
    case 'steady-pull':
      distancePressure = 5 + fishSpeed * 0.025;
      tensionPressure = 6 + fishPower * 0.035;
      break;
    case 'power-dash':
      distancePressure = 12 + fishSpeed * 0.055;
      tensionPressure = 10 + fishPower * 0.045;
      break;
    case 'deep-dive':
      distancePressure = 8 + fishSpeed * 0.03;
      tensionPressure = 15 + fishPower * 0.055;
      break;
    case 'thrash':
      distancePressure = 3 + fishSpeed * 0.02;
      tensionPressure = 18 + fishPower * 0.06;
      lineDamage = 4 + fishPower * 0.045;
      break;
    case 'recover':
      stamina += 6 + rating(fish.stats.resistance) * 0.05;
      tension -= 3;
      break;
  }

  if (session.braced && ['power-dash', 'deep-dive', 'thrash'].includes(intent)) {
    distancePressure *= 0.45;
    tensionPressure *= 0.5;
    lineDamage *= 0.35;
  }

  if (session.releasedThisTurn && ['deep-dive', 'thrash'].includes(intent)) {
    tensionPressure *= 0.35;
    distancePressure *= 1.2;
  }

  distance += distancePressure;
  tension += tensionPressure;

  if (tension < 10 && intent !== 'recover') {
    distance += 5;
  }

  const dangerThreshold = clamp(78 + gear(stats.lineStrength) * 0.8, 68, 94);
  if (tension > dangerThreshold) {
    lineDamage += (tension - dangerThreshold) * 0.8;
  }

  lineDurability -= lineDamage;

  const next: TurnFishingSession = {
    ...session,
    stamina: clamp(stamina, 0, session.maxStamina),
    distance: clamp(distance, 0, session.maxDistance),
    tension: clamp(tension, 0, 100),
    lineDurability: clamp(lineDurability, 0, session.maxLineDurability),
    lastEvent: lineDamage > 0 ? 'line-damaged' : 'fish-action',
  };

  if (next.lineDurability <= 0 || next.tension >= 100) {
    return { ...next, phase: 'line-break', lastEvent: 'line-break' };
  }
  if (next.distance >= next.maxDistance) {
    return { ...next, phase: 'escaped', lastEvent: 'escaped' };
  }
  if (next.stamina <= 0 && next.distance <= 15) {
    return { ...next, phase: 'caught', lastEvent: 'caught' };
  }

  return next;
}

function beginNextTurn(session: TurnFishingSession, fish: TurnFishProfile): TurnFishingSession {
  const nextIntent = weightedIntent(
    session.seed,
    fish,
    session.maxStamina > 0 ? session.stamina / session.maxStamina : 0,
  );

  return {
    ...session,
    seed: nextIntent.seed,
    turn: session.turn + 1,
    ap: session.maxAp,
    currentIntent: nextIntent.intent,
    braced: false,
    releasedThisTurn: false,
    insight: false,
    lastCheck: null,
    lastEvent: 'fish-intent',
  };
}

function settleAfterPlayerAction(
  session: TurnFishingSession,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): TurnFishingSession {
  if (session.stamina <= 0 && session.distance <= 15) {
    return { ...session, phase: 'caught', lastEvent: 'caught' };
  }
  if (session.tension >= 100 || session.lineDurability <= 0) {
    return { ...session, phase: 'line-break', lastEvent: 'line-break' };
  }
  if (session.distance >= session.maxDistance) {
    return { ...session, phase: 'escaped', lastEvent: 'escaped' };
  }
  if (session.ap > 0) return session;

  const afterFish = resolveFishAction(session, fish, stats);
  if (afterFish.phase !== 'player-turn') return afterFish;
  return beginNextTurn(afterFish, fish);
}

export function createTurnFishingSession(
  seed: number,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): TurnFishingSession {
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
  const maxStamina = Math.max(1, rating(fish.stats.stamina));
  const maxLineDurability = clamp(
    DEFAULT_LINE_DURABILITY + gear(stats.lineStrength) * 2,
    60,
    150,
  );
  const firstIntent = weightedIntent(safeSeed, fish, 1);

  return {
    phase: 'player-turn',
    seed: firstIntent.seed,
    fishId: fish.id,
    turn: 1,
    ap: DEFAULT_AP,
    maxAp: DEFAULT_AP,
    stamina: maxStamina,
    maxStamina,
    tension: DEFAULT_TENSION,
    distance: DEFAULT_DISTANCE,
    maxDistance: DEFAULT_MAX_DISTANCE,
    lineDurability: maxLineDurability,
    maxLineDurability,
    currentIntent: firstIntent.intent,
    braced: false,
    releasedThisTurn: false,
    insight: false,
    lastCheck: null,
    lastEvent: 'fish-intent',
  };
}

export function applyTurnFishingAction(
  session: TurnFishingSession,
  action: TurnFishingAction,
  fish: TurnFishProfile,
  stats: TurnGearStats,
): TurnActionResolution {
  if (session.phase !== 'player-turn' || session.ap <= 0 || session.fishId !== fish.id) {
    return { session, knowledgeDiscovered: false };
  }

  let next = session;
  let knowledgeDiscovered = false;

  if (action === 'release') {
    next = {
      ...session,
      tension: clamp(session.tension - (18 + gear(stats.control) * 0.7), 0, 100),
      distance: clamp(session.distance + 5 + rating(fish.stats.speed) * 0.025, 0, session.maxDistance),
      releasedThisTurn: true,
      insight: false,
      lastCheck: null,
      lastEvent: 'action-release',
    };
  } else {
    const resolved = applyCheckAction(session, action, fish, stats);
    next = resolved.session;
    knowledgeDiscovered = resolved.knowledgeDiscovered;
  }

  next = {
    ...next,
    ap: Math.max(0, session.ap - 1),
  };

  return {
    knowledgeDiscovered,
    session: settleAfterPlayerAction(next, fish, stats),
  };
}

export function isTurnCombatTerminal(session: TurnFishingSession): boolean {
  return session.phase === 'caught' || session.phase === 'escaped' || session.phase === 'line-break';
}
