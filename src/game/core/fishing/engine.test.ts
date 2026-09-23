import { describe, expect, it } from 'vitest';
import type { FishProfile, FishingSession, GearEffects } from './types';
import {
  advanceFishingSession,
  applyFishingAction,
  castLine,
  createFishingSession,
  isTerminalSession,
} from './engine';

const commonFish: FishProfile = {
  id: 'canal-perch',
  behavior: 'steady',
  stats: { power: 20, stamina: 18, speed: 20, technique: 20 },
  sizeRangeCm: { min: 20, max: 30 },
};

const balancedGear: GearEffects = {
  power: 8,
  control: 8,
  lineStrength: 8,
  reelSpeed: 8,
  attraction: 8,
  skillPower: 8,
};

function reachBite(
  fish: FishProfile = commonFish,
  gear: GearEffects = balancedGear,
  seed = 17,
): FishingSession {
  let session = castLine(createFishingSession(seed), fish, gear);
  for (let step = 0; step < 20 && (session.phase === 'casting' || session.phase === 'waiting'); step += 1) {
    const elapsed = session.phase === 'waiting' ? session.waitMs : 1_000;
    session = advanceFishingSession(session, elapsed, fish, gear);
  }
  return session;
}

function startFight(
  fish: FishProfile = commonFish,
  gear: GearEffects = balancedGear,
  seed = 17,
): FishingSession {
  return applyFishingAction(reachBite(fish, gear, seed), 'hook', fish, gear);
}

describe('fishing session engine', () => {
  it('follows cast, waiting, bite, and hook phases without mutating prior sessions', () => {
    const ready = createFishingSession(17);
    const casting = castLine(ready, commonFish, balancedGear);
    expect(ready.phase).toBe('ready');
    expect(casting.phase).toBe('casting');

    const actionCast = applyFishingAction(createFishingSession(18), 'cast', commonFish, balancedGear);
    expect(actionCast.phase).toBe('casting');
    const firstHalf = advanceFishingSession(casting, 350, commonFish, balancedGear);
    const splitCast = advanceFishingSession(firstHalf, 350, commonFish, balancedGear);
    const wholeCast = advanceFishingSession(casting, 700, commonFish, balancedGear);
    expect(firstHalf.phase).toBe('casting');
    expect(splitCast).toEqual(wholeCast);
    expect(splitCast.phase).toBe('waiting');

    const waiting = advanceFishingSession(casting, 1_000, commonFish, balancedGear);
    expect(waiting.phase).toBe('waiting');
    const bite = reachBite(commonFish, balancedGear, 17);
    expect(bite.phase).toBe('bite');
    expect(applyFishingAction(bite, 'hook', commonFish, balancedGear).phase).toBe('fighting');
  });

  it('catches an exhausted fish and resolves a seeded catch record', () => {
    let session = startFight();
    for (let pull = 0; pull < 10 && session.phase === 'fighting'; pull += 1) {
      session = applyFishingAction(session, 'pull', commonFish, balancedGear);
    }

    expect(session.phase).toBe('caught');
    expect(isTerminalSession(session)).toBe(true);
    expect(session.result?.fishId).toBe(commonFish.id);
    expect(session.result?.lengthCm).toBeGreaterThanOrEqual(commonFish.sizeRangeCm.min);
    expect(session.result?.lengthCm).toBeLessThanOrEqual(commonFish.sizeRangeCm.max);
    expect(Number.isFinite(session.result?.weightKg)).toBe(true);
  });

  it('expires a missed bite into an escape and keeps huge deltas bounded', () => {
    const bite = reachBite();
    const missed = advanceFishingSession(bite, bite.biteWindowMs, commonFish, balancedGear);
    expect(missed.phase).toBe('escaped');
    expect(missed.event).toBe('escaped');
    expect(isTerminalSession(missed)).toBe(true);

    const cast = castLine(createFishingSession(31), commonFish, balancedGear);
    const largeDelta = advanceFishingSession(cast, 1_000_000_000, commonFish, balancedGear);
    expect(largeDelta.phase).toBe('escaped');
    expect(Number.isFinite(largeDelta.totalElapsedMs)).toBe(true);
    expect(largeDelta.totalElapsedMs).toBeLessThan(1_000_000_000);
    expect(largeDelta.tension).toBeGreaterThanOrEqual(0);
    expect(largeDelta.tension).toBeLessThanOrEqual(100);
    expect(largeDelta.distance).toBeGreaterThanOrEqual(0);
    expect(largeDelta.distance).toBeLessThanOrEqual(100);
    const hugeFight = advanceFishingSession(
      startFight(commonFish, balancedGear, 31),
      1_000_000_000,
      commonFish,
      balancedGear,
    );
    expect(isTerminalSession(hugeFight)).toBe(true);
  });

  it('breaks a weak line under repeated hard pulls', () => {
    const powerfulFish: FishProfile = {
      ...commonFish,
      stats: { power: 100, stamina: 100, speed: 80, technique: 100 },
    };
    const weakGear: GearEffects = {
      power: -3,
      control: -3,
      lineStrength: -3,
      reelSpeed: -3,
      attraction: 0,
      skillPower: 0,
    };
    let session = startFight(powerfulFish, weakGear, 23);
    for (let pull = 0; pull < 5 && session.phase === 'fighting'; pull += 1) {
      session = applyFishingAction(session, 'pull', powerfulFish, weakGear);
    }

    expect(session.phase).toBe('line-break');
    expect(session.event).toBe('line-break');
    expect(isTerminalSession(session)).toBe(true);
  });

  it('makes REEL, PULL, RELEASE, and SKILL change different fight values', () => {
    const fight = startFight();
    const reeled = applyFishingAction(fight, 'reel', commonFish, balancedGear);
    const pulled = applyFishingAction(fight, 'pull', commonFish, balancedGear);
    const released = applyFishingAction(pulled, 'release', commonFish, balancedGear);
    const skilled = applyFishingAction(fight, 'skill', commonFish, balancedGear);

    expect(reeled.tension).toBeGreaterThan(fight.tension);
    expect(pulled.tension).toBeGreaterThan(reeled.tension);
    expect(pulled.stamina).toBeLessThan(reeled.stamina);
    expect(released.tension).toBeLessThan(pulled.tension);
    expect(released.distance).toBeGreaterThan(pulled.distance);
    expect(skilled.event).toBe('skill-used');
    expect(skilled.skillCooldownMs).toBeGreaterThan(0);
    expect(applyFishingAction(skilled, 'skill', commonFish, balancedGear)).toBe(skilled);
    expect(skilled.stamina).toBeLessThan(fight.stamina);
    expect(skilled.tension).toBeLessThan(fight.tension);
  });

  it('gives King fish distinct burst and dive pressure with release counterplay', () => {
    const king: FishProfile = { ...commonFish, id: 'canal-king', behavior: 'king' };
    const kingFight = startFight(king, balancedGear, 41);
    const steadyFight = startFight(commonFish, balancedGear, 41);
    const kingBurst = advanceFishingSession(kingFight, 1_100, king, balancedGear);
    const splitBurst = advanceFishingSession(
      advanceFishingSession(kingFight, 550, king, balancedGear),
      550,
      king,
      balancedGear,
    );
    const steadyTime = advanceFishingSession(steadyFight, 1_100, commonFish, balancedGear);

    expect(kingBurst.event).toBe('fish-dash');
    expect(kingBurst.tension).toBeGreaterThan(steadyTime.tension);
    expect(kingBurst.distance).toBeGreaterThan(steadyTime.distance);
    expect(kingBurst.stamina).toBeLessThan(kingFight.stamina);
    expect(kingBurst.stamina).toBeLessThan(steadyTime.stamina);
    expect(splitBurst.phase).toBe(kingBurst.phase);
    expect(splitBurst.event).toBe(kingBurst.event);
    expect(splitBurst.tension).toBeCloseTo(kingBurst.tension, 10);
    expect(splitBurst.distance).toBeCloseTo(kingBurst.distance, 10);
    expect(splitBurst.stamina).toBeCloseTo(kingBurst.stamina, 10);
    expect(splitBurst.totalElapsedMs).toBe(kingBurst.totalElapsedMs);
    const countered = applyFishingAction(kingBurst, 'release', king, balancedGear);
    expect(countered.phase).toBe('fighting');
    expect(countered.tension).toBeLessThan(kingBurst.tension);
  });

  it('replays the same seeded encounter and catch identically', () => {
    function resolve(seed: number): FishingSession {
      let session = startFight(commonFish, balancedGear, seed);
      for (let pull = 0; pull < 10 && session.phase === 'fighting'; pull += 1) {
        session = applyFishingAction(session, 'pull', commonFish, balancedGear);
      }
      return session;
    }

    expect(resolve(5)).toEqual(resolve(5));
  });
});
