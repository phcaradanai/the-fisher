import { nextRandomFloat } from './random';

import type {
  CatchResult,
  FishProfile,
  FishingAction,
  FishingSession,
  GearEffects,
} from './types';

const CAST_DURATION_MS = 700;
const MAX_BITE_WAIT_MS = 8_000;
const MAX_DELTA_MS = 900_000;
const MAX_TOTAL_ELAPSED_MS = Number.MAX_SAFE_INTEGER;
const MAX_PHASE_ELAPSED_MS = 1_000_000_000;
const EPSILON = 0.000_001;

interface Ratings {
  fishPower: number;
  fishStamina: number;
  fishSpeed: number;
  fishTechnique: number;
  power: number;
  control: number;
  lineStrength: number;
  reelSpeed: number;
  attraction: number;
  skillPower: number;
}


interface BehaviorSlice {
  tensionMultiplier: number;
  distanceMultiplier: number;
  staminaMultiplier: number;
  nextBoundaryMs: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function rating(value: number, fallback: number): number {
  return clamp(finiteNumber(value, fallback), 0, 100);
}

function gearBonus(value: number): number {
  return clamp(finiteNumber(value, 0), -12, 32);
}

// Fish stats use 1–100 ratings; gear effects aggregate four bonuses, including two percentage fields.
function getRatings(fish: FishProfile, gear: GearEffects): Ratings {
  return {
    fishPower: rating(fish.stats.power, 40),
    fishStamina: clamp(finiteNumber(fish.stats.stamina, 50), 1, 100),
    fishSpeed: rating(fish.stats.speed, 40),
    fishTechnique: rating(fish.stats.technique, 40),
    power: gearBonus(gear.power),
    control: gearBonus(gear.control),
    lineStrength: gearBonus(gear.lineStrength),
    reelSpeed: gearBonus(gear.reelSpeed),
    attraction: gearBonus(gear.attraction),
    skillPower: gearBonus(gear.skillPower),
  };
}

function lineBreakThreshold(ratings: Ratings): number {
  return clamp(70 + ratings.lineStrength + ratings.control * 0.45, 45, 95);
}

function enterBite(session: FishingSession, ratings: Ratings): FishingSession {
  return {
    ...session,
    phase: 'bite',
    phaseElapsedMs: 0,
    waitMs: 0,
    biteWindowMs: clamp(1_200 * (1 + ratings.attraction / 100) + ratings.skillPower * 8, 850, 1_800),
    event: 'bite',
  };
}

function finishEscaped(session: FishingSession): FishingSession {
  return { ...session, phase: 'escaped', event: 'escaped', result: null };
}

function finishLineBreak(session: FishingSession): FishingSession {
  return { ...session, phase: 'line-break', event: 'line-break', result: null };
}

function finishCatch(session: FishingSession, fish: FishProfile): FishingSession {
  const { value, seed } = nextRandomFloat(session.seed);
  const lower = clamp(finiteNumber(fish.sizeRangeCm.min, 1), 1, 10_000);
  const upper = clamp(finiteNumber(fish.sizeRangeCm.max, lower), lower, 10_000);
  const lengthCm = Math.round((lower + (upper - lower) * value) * 10) / 10;
  const weightKg = clamp(Math.round((lengthCm ** 3 / 100_000) * 100) / 100, 0.01, 1_000);
  const result: CatchResult = { fishId: fish.id, lengthCm, weightKg };

  return {
    ...session,
    phase: 'caught',
    seed,
    stamina: Math.max(0, session.stamina),
    distance: Math.max(0, session.distance),
    event: 'caught',
    result,
  };
}

function enterFight(session: FishingSession, ratings: Ratings): FishingSession {
  return {
    ...session,
    phase: 'fighting',
    phaseElapsedMs: 0,
    stamina: ratings.fishStamina,
    maxStamina: ratings.fishStamina,
    tension: clamp(5 + ratings.fishPower * 0.055 - ratings.control * 0.2, 2, 14),
    distance: 72,
    waitMs: 0,
    biteWindowMs: 0,
    event: 'hooked',
    result: null,
  };
}

/** Start a fresh session with a stable 32-bit seed for all later random outcomes. */
export function createFishingSession(seed: number): FishingSession {
  return {
    phase: 'ready',
    seed: Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0,
    totalElapsedMs: 0,
    phaseElapsedMs: 0,
    fishId: null,
    stamina: 0,
    maxStamina: 0,
    tension: 0,
    distance: 100,
    waitMs: 0,
    biteWindowMs: 0,
    skillCooldownMs: 0,
    fishDirection: 1,
    event: null,
    result: null,
  };
}

/** Cast once from ready; encounter timing is derived from and stored in the session seed. */
export function castLine(
  session: FishingSession,
  fish: FishProfile,
  gear: GearEffects,
): FishingSession {
  if (session.phase !== 'ready') return session;

  const ratings = getRatings(fish, gear);
  const random = nextRandomFloat(session.seed);
  const behaviorDelay = fish.behavior === 'king' ? 650 : fish.behavior === 'darting' ? -250 :
    fish.behavior === 'ambush' ? -450 : 0;
  const waitMs = clamp(
    (2_600 + random.value * 2_400 + behaviorDelay) / (1 + ratings.attraction / 100),
    650,
    MAX_BITE_WAIT_MS,
  );

  return {
    ...session,
    phase: 'casting',
    seed: random.seed,
    phaseElapsedMs: 0,
    fishId: fish.id,
    stamina: ratings.fishStamina,
    maxStamina: ratings.fishStamina,
    tension: 0,
    distance: 100,
    waitMs,
    biteWindowMs: 0,
    fishDirection: random.value < 0.5 ? -1 : 1,
    event: 'cast',
    result: null,
  };
}


function behaviorSlice(behavior: FishProfile['behavior'], elapsedMs: number): BehaviorSlice {
  if (behavior === 'steady') {
    return {
      tensionMultiplier: 0.72,
      distanceMultiplier: 0.62,
      staminaMultiplier: 0.72,
      nextBoundaryMs: Number.POSITIVE_INFINITY,
    };
  }

  if (behavior === 'darting') {
    const period = 1_800;
    const burstMs = 280;
    const position = elapsedMs % period;
    const bursting = position < burstMs;
    return {
      tensionMultiplier: bursting ? 3.1 : 0.78,
      distanceMultiplier: bursting ? 3.4 : 0.65,
      staminaMultiplier: bursting ? 1.35 : 0.78,
      nextBoundaryMs: elapsedMs + (bursting ? burstMs - position : period - position),
    };
  }

  if (behavior === 'ambush') {
    const period = 3_200;
    const lungeMs = 420;
    const position = elapsedMs % period;
    const lunging = position < lungeMs;
    return {
      tensionMultiplier: lunging ? 4.0 : 0.58,
      distanceMultiplier: lunging ? 4.2 : 0.48,
      staminaMultiplier: lunging ? 1.55 : 0.58,
      nextBoundaryMs: elapsedMs + (lunging ? lungeMs - position : period - position),
    };
  }

  const period = 5_200;
  const position = elapsedMs % period;
  if (position < 1_100) {
    return {
      tensionMultiplier: 2.1,
      distanceMultiplier: 1.8,
      staminaMultiplier: 1.25,
      nextBoundaryMs: elapsedMs + 1_100 - position,
    };
  }
  if (position < 1_900) {
    return {
      tensionMultiplier: 3.8,
      distanceMultiplier: 2.7,
      staminaMultiplier: 1.8,
      nextBoundaryMs: elapsedMs + 1_900 - position,
    };
  }
  if (position < 3_500) {
    return {
      tensionMultiplier: 0.24,
      distanceMultiplier: 0.16,
      staminaMultiplier: 0.45,
      nextBoundaryMs: elapsedMs + 3_500 - position,
    };
  }
  if (position < 4_300) {
    return {
      tensionMultiplier: 2.8,
      distanceMultiplier: 2.2,
      staminaMultiplier: 1.35,
      nextBoundaryMs: elapsedMs + 4_300 - position,
    };
  }
  return {
    tensionMultiplier: 0.62,
    distanceMultiplier: 0.52,
    staminaMultiplier: 0.7,
    nextBoundaryMs: elapsedMs + period - position,
  };
}

function isDashBoundary(behavior: FishProfile['behavior'], elapsedMs: number): boolean {
  if (elapsedMs <= 0) return false;
  const period = behavior === 'darting' ? 1_800 : behavior === 'ambush' ? 3_200 : 5_200;
  const position = elapsedMs % period;
  const targets = behavior === 'king' ? [1_100, 3_500, 0] : [0];
  return targets.some((target) => Math.min(Math.abs(position - target), Math.abs(position - period - target)) < EPSILON);
}

function finishFightAction(
  session: FishingSession,
  fish: FishProfile,
  ratings: Ratings,
  stamina: number,
  tension: number,
  distance: number,
  event: FishingSession['event'],
): FishingSession {
  const next: FishingSession = {
    ...session,
    stamina: clamp(stamina, 0, session.maxStamina),
    tension: clamp(tension, 0, 100),
    distance: clamp(distance, 0, 100),
    event,
    result: null,
  };

  if (next.tension >= lineBreakThreshold(ratings)) return finishLineBreak(next);
  if (next.distance >= 100) return finishEscaped(next);
  if (next.stamina <= 0 || next.distance <= 0) return finishCatch(next, fish);

  const warningAt = lineBreakThreshold(ratings) * 0.78;
  if (session.tension < warningAt && next.tension >= warningAt) {
    return { ...next, event: 'tension-warning' };
  }
  return next;
}

/** Apply one discrete player choice; invalid phase/action pairs leave the session untouched. */
export function applyFishingAction(
  session: FishingSession,
  action: FishingAction,
  fish: FishProfile,
  gear: GearEffects,
): FishingSession {
  if (action === 'cast') return castLine(session, fish, gear);
  if (action === 'hook') {
    if (session.phase !== 'bite' || session.biteWindowMs <= 0) return session;
    return enterFight(session, getRatings(fish, gear));
  }
  if (session.phase !== 'fighting') return session;

  const ratings = getRatings(fish, gear);
  let stamina = session.stamina;
  let tension = session.tension;
  let distance = session.distance;
  let event: FishingSession['event'] = null;
  let skillCooldownMs = session.skillCooldownMs;

  switch (action) {
    case 'reel':
      stamina -= (1.25 + ratings.power * 0.1) * (1 + ratings.reelSpeed / 100);
      distance -= (1.2 + ratings.control * 0.08) * (1 + ratings.reelSpeed / 100);
      tension += Math.max(
        0.6,
        2.7 + ratings.fishPower * 0.018 + ratings.fishTechnique * 0.012 - ratings.control * 0.2,
      );
      break;
    case 'pull':
      stamina -= 3.2 + ratings.power * 0.2 + ratings.control * 0.05;
      distance -= 3.7 + ratings.power * 0.18 + ratings.control * 0.08;
      tension += Math.max(
        2,
        8 + ratings.fishPower * 0.065 + ratings.fishTechnique * 0.045 - ratings.control * 0.3,
      );
      break;
    case 'release':
      tension -= 20 + ratings.control * 0.25;
      distance += 1.4 + ratings.fishSpeed * 0.025;
      break;
    case 'skill':
      if (session.skillCooldownMs > 0) return session;
      stamina -= 5 + ratings.skillPower * 0.15 + ratings.power * 0.1;
      distance -= Math.max(0.5, 2.5 + ratings.skillPower * 0.2 + ratings.control * 0.04);
      tension -= 13 + ratings.control * 0.25 + ratings.skillPower * 0.15;
      skillCooldownMs = clamp(6_000 - ratings.skillPower * 60, 4_000, 8_000);
      event = 'skill-used';
      break;
  }

  const next = finishFightAction(
    { ...session, skillCooldownMs },
    fish,
    ratings,
    stamina,
    tension,
    distance,
    event,
  );
  return next;
}

function advanceFight(
  session: FishingSession,
  deltaMs: number,
  fish: FishProfile,
  ratings: Ratings,
): { session: FishingSession; consumedMs: number } {
  let current = session;
  let remainingMs = deltaMs;
  let consumedMs = 0;
  const threshold = lineBreakThreshold(ratings);
  const warningAt = threshold * 0.78;

  while (remainingMs > EPSILON && current.phase === 'fighting') {
    const elapsed = current.phaseElapsedMs;
    const behavior = behaviorSlice(fish.behavior, elapsed);
    const tensionRate = Math.max(
      0.18,
      0.72 + ratings.fishPower * 0.018 + ratings.fishTechnique * 0.012 - ratings.control * 0.045,
    ) * behavior.tensionMultiplier;
    const distanceRate = Math.max(
      0.04,
      0.2 + ratings.fishSpeed * 0.009 + ratings.fishPower * 0.003 - ratings.control * 0.012,
    ) * behavior.distanceMultiplier;
    const staminaRate = Math.max(
      0.05,
      0.1 + ratings.fishTechnique * 0.002,
    ) * behavior.staminaMultiplier;

    const untilBreak = tensionRate > 0
      ? Math.max(0, (threshold - current.tension) / tensionRate * 1_000)
      : Number.POSITIVE_INFINITY;
    const untilEscape = distanceRate > 0
      ? Math.max(0, (100 - current.distance) / distanceRate * 1_000)
      : Number.POSITIVE_INFINITY;
    const untilCatch = staminaRate > 0
      ? Math.max(0, current.stamina / staminaRate * 1_000)
      : Number.POSITIVE_INFINITY;
    const stepMs = Math.min(remainingMs, behavior.nextBoundaryMs - elapsed, untilBreak, untilEscape, untilCatch);

    if (stepMs <= EPSILON) {
      if (current.tension >= threshold - EPSILON) {
        current = finishLineBreak(current);
      } else if (current.distance >= 100 - EPSILON) {
        current = finishEscaped(current);
      } else if (current.stamina <= EPSILON) {
        current = finishCatch({ ...current, stamina: 0 }, fish);
      } else {
        break;
      }
      continue;
    }

    const nextTension = clamp(current.tension + tensionRate * stepMs / 1_000, 0, 100);
    const nextDistance = clamp(current.distance + distanceRate * stepMs / 1_000, 0, 100);
    const nextStamina = clamp(current.stamina - staminaRate * stepMs / 1_000, 0, current.maxStamina);
    const nextElapsed = Math.min(MAX_PHASE_ELAPSED_MS, elapsed + stepMs);
    const crossedWarning = current.tension < warningAt && nextTension >= warningAt;
    current = {
      ...current,
      phaseElapsedMs: nextElapsed,
      tension: nextTension,
      distance: nextDistance,
      stamina: nextStamina,
      event: crossedWarning ? 'tension-warning' : current.event,
    };
    remainingMs -= stepMs;
    consumedMs += stepMs;

    if (current.tension >= threshold - EPSILON) {
      current = finishLineBreak(current);
    } else if (current.distance >= 100 - EPSILON) {
      current = finishEscaped(current);
    } else if (current.stamina <= EPSILON) {
      current = finishCatch({ ...current, stamina: 0 }, fish);
    } else if (isDashBoundary(fish.behavior, nextElapsed)) {
      current = { ...current, event: 'fish-dash' };
    }
  }

  return { session: current, consumedMs };
}

/** Advance the simulation by elapsed wall time; unusually large deltas are safely capped. */
export function advanceFishingSession(
  session: FishingSession,
  deltaMs: number,
  fish: FishProfile,
  gear: GearEffects,
): FishingSession {
  const requestedMs = clamp(finiteNumber(deltaMs, 0), 0, MAX_DELTA_MS);
  if (requestedMs <= 0 || isTerminalSession(session) || session.phase === 'ready') return session;

  const ratings = getRatings(fish, gear);
  let current = session;
  let remainingMs = requestedMs;
  let consumedMs = 0;

  while (remainingMs > EPSILON && !isTerminalSession(current)) {
    if (current.phase === 'casting') {
      const castRemaining = Math.max(0, CAST_DURATION_MS - current.phaseElapsedMs);
      if (castRemaining <= EPSILON) {
        current = { ...current, phase: 'waiting', phaseElapsedMs: 0, event: 'splash' };
        continue;
      }
      const stepMs = Math.min(remainingMs, castRemaining);
      const elapsed = current.phaseElapsedMs + stepMs;
      current = { ...current, phaseElapsedMs: Math.min(CAST_DURATION_MS, elapsed) };
      remainingMs -= stepMs;
      consumedMs += stepMs;
      if (elapsed >= CAST_DURATION_MS - EPSILON) {
        current = { ...current, phase: 'waiting', phaseElapsedMs: 0, event: 'splash' };
      }
      continue;
    }

    if (current.phase === 'waiting') {
      const waitRemaining = Math.max(0, current.waitMs);
      if (waitRemaining <= EPSILON) {
        current = enterBite(current, ratings);
        continue;
      }
      const stepMs = Math.min(remainingMs, waitRemaining);
      current = {
        ...current,
        phaseElapsedMs: Math.min(MAX_PHASE_ELAPSED_MS, current.phaseElapsedMs + stepMs),
        waitMs: Math.max(0, current.waitMs - stepMs),
      };
      remainingMs -= stepMs;
      consumedMs += stepMs;
      if (current.waitMs <= EPSILON) {
        current = enterBite(current, ratings);
      }
      continue;
    }

    if (current.phase === 'bite') {
      const biteRemaining = Math.max(0, current.biteWindowMs);
      if (biteRemaining <= EPSILON) {
        current = finishEscaped(current);
        continue;
      }
      const stepMs = Math.min(remainingMs, biteRemaining);
      current = {
        ...current,
        phaseElapsedMs: Math.min(MAX_PHASE_ELAPSED_MS, current.phaseElapsedMs + stepMs),
        biteWindowMs: Math.max(0, current.biteWindowMs - stepMs),
      };
      remainingMs -= stepMs;
      consumedMs += stepMs;
      if (current.biteWindowMs <= EPSILON) current = finishEscaped(current);
      continue;
    }

    if (current.phase === 'fighting') {
      const advanced = advanceFight(current, remainingMs, fish, ratings);
      current = advanced.session;
      remainingMs -= advanced.consumedMs;
      consumedMs += advanced.consumedMs;
      if (advanced.consumedMs <= EPSILON && current.phase === 'fighting') break;
      continue;
    }

    break;
  }

  if (consumedMs <= 0) return current;
  return {
    ...current,
    totalElapsedMs: clamp(
      finiteNumber(session.totalElapsedMs, 0) + consumedMs,
      0,
      MAX_TOTAL_ELAPSED_MS,
    ),
    skillCooldownMs: clamp(
      finiteNumber(session.skillCooldownMs, 0) - consumedMs,
      0,
      60_000,
    ),
  };
}

/** Ready has not begun; caught, escaped, and line-break are terminal outcomes. */
export function isTerminalSession(session: FishingSession): boolean {
  return session.phase === 'caught' || session.phase === 'escaped' || session.phase === 'line-break';
}
