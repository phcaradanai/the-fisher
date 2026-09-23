import { describe, expect, it } from 'vitest';
import { resolveSkillCheck } from './skill-check';
import {
  applyTurnFishingAction,
  createTurnFishingSession,
  isTurnCombatTerminal,
} from './turn-engine';
import type {
  FishIntent,
  TurnFishProfile,
  TurnFishingSession,
  TurnGearStats,
} from './turn-types';

const calmFish: TurnFishProfile = {
  id: 'river-minnow',
  archetype: 'calm',
  stats: {
    power: 18,
    stamina: 24,
    speed: 20,
    technique: 18,
    resistance: 18,
  },
};

const diverFish: TurnFishProfile = {
  id: 'canal-diver',
  archetype: 'diver',
  stats: {
    power: 52,
    stamina: 58,
    speed: 48,
    technique: 45,
    resistance: 54,
  },
};

const balancedGear: TurnGearStats = {
  power: 3,
  control: 4,
  lineStrength: 4,
  reelSpeed: 3,
  instinct: 3,
  luck: 1,
};

function withIntent(session: TurnFishingSession, type: FishIntent['type'], difficulty = 14): TurnFishingSession {
  return {
    ...session,
    currentIntent: { type, difficulty },
  };
}

describe('turn fishing skill checks', () => {
  it('replays the same seeded check exactly', () => {
    expect(resolveSkillCheck(42, 'advantage', 3, 14)).toEqual(
      resolveSkillCheck(42, 'advantage', 3, 14),
    );
  });

  it('advantage keeps the higher die and disadvantage keeps the lower die', () => {
    const advantage = resolveSkillCheck(8, 'advantage', 0, 10);
    const disadvantage = resolveSkillCheck(8, 'disadvantage', 0, 10);

    expect(advantage.result.rolls).toHaveLength(2);
    expect(disadvantage.result.rolls).toHaveLength(2);
    expect(advantage.result.die).toBe(Math.max(...advantage.result.rolls));
    expect(disadvantage.result.die).toBe(Math.min(...disadvantage.result.rolls));
  });
});

describe('turn fishing engine', () => {
  it('starts with two AP and advances the fish only after the second player action', () => {
    const initial = withIntent(createTurnFishingSession(11, calmFish, balancedGear), 'steady-pull');
    const first = applyTurnFishingAction(initial, 'release', calmFish, balancedGear).session;

    expect(first.turn).toBe(1);
    expect(first.ap).toBe(1);
    expect(first.tension).toBeLessThan(initial.tension);

    const second = applyTurnFishingAction(first, 'reel', calmFish, balancedGear).session;
    expect(second.turn).toBe(2);
    expect(second.ap).toBe(2);
    expect(second.lastEvent).toBe('fish-intent');
  });

  it('makes RELEASE trade lower tension for more distance', () => {
    const initial = createTurnFishingSession(17, diverFish, balancedGear);
    const released = applyTurnFishingAction(initial, 'release', diverFish, balancedGear).session;

    expect(released.tension).toBeLessThan(initial.tension);
    expect(released.distance).toBeGreaterThan(initial.distance);
    expect(released.releasedThisTurn).toBe(true);
  });

  it('gives BRACE advantage against a power dash', () => {
    const initial = withIntent(createTurnFishingSession(21, diverFish, balancedGear), 'power-dash', 15);
    const braced = applyTurnFishingAction(initial, 'brace', diverFish, balancedGear).session;

    expect(braced.lastCheck?.mode).toBe('advantage');
  });

  it('penalizes PULL against a dive but rewards attacking a recovering fish', () => {
    const dive = withIntent(createTurnFishingSession(31, diverFish, balancedGear), 'deep-dive', 15);
    const againstDive = applyTurnFishingAction(dive, 'pull', diverFish, balancedGear).session;
    expect(againstDive.lastCheck?.mode).toBe('disadvantage');

    const recover = withIntent(createTurnFishingSession(31, diverFish, balancedGear), 'recover', 12);
    const againstRecover = applyTurnFishingAction(recover, 'pull', diverFish, balancedGear).session;
    expect(againstRecover.lastCheck?.mode).toBe('advantage');
  });

  it('OBSERVE can create insight that grants advantage to the next action', () => {
    let seed = 1;
    let observed: ReturnType<typeof applyTurnFishingAction> | undefined;

    for (; seed < 200; seed += 1) {
      const initial = withIntent(createTurnFishingSession(seed, calmFish, balancedGear), 'steady-pull', 8);
      const attempt = applyTurnFishingAction(initial, 'observe', calmFish, balancedGear);
      if (attempt.knowledgeDiscovered) {
        observed = attempt;
        break;
      }
    }

    expect(observed).toBeDefined();
    if (!observed) return;

    expect(observed.session.insight).toBe(true);
    const next = applyTurnFishingAction(observed.session, 'pull', calmFish, balancedGear).session;
    expect(next.lastCheck?.mode).toBe('advantage');
  });

  it('reduces fish pressure when BRACE is active for the resolving intent', () => {
    const base = withIntent(createTurnFishingSession(43, diverFish, balancedGear), 'power-dash', 1);

    const prepared: TurnFishingSession = {
      ...base,
      ap: 1,
      braced: true,
      tension: 30,
      distance: 40,
    };
    const unprepared: TurnFishingSession = {
      ...base,
      ap: 1,
      braced: false,
      tension: 30,
      distance: 40,
    };

    const bracedResult = applyTurnFishingAction(prepared, 'release', diverFish, balancedGear).session;
    const openResult = applyTurnFishingAction(unprepared, 'release', diverFish, balancedGear).session;

    expect(bracedResult.turn).toBe(2);
    expect(openResult.turn).toBe(2);
    expect(bracedResult.distance).toBeLessThan(openResult.distance);
    expect(bracedResult.tension).toBeLessThan(openResult.tension);
  });

  it('catches an exhausted fish only when it is also close enough', () => {
    const initial = createTurnFishingSession(51, calmFish, {
      ...balancedGear,
      power: 10,
    });
    const readyToLand: TurnFishingSession = {
      ...initial,
      stamina: 0,
      distance: 5,
      ap: 2,
    };

    const result = applyTurnFishingAction(readyToLand, 'release', calmFish, balancedGear).session;
    expect(result.phase).toBe('caught');
    expect(result.lastEvent).toBe('caught');
    expect(isTurnCombatTerminal(result)).toBe(true);
  });

  it('ends the encounter when distance reaches the escape limit', () => {
    const initial = withIntent(createTurnFishingSession(61, diverFish, balancedGear), 'power-dash', 20);
    const nearEscape: TurnFishingSession = {
      ...initial,
      distance: 99,
      ap: 1,
    };

    const result = applyTurnFishingAction(nearEscape, 'release', diverFish, balancedGear).session;
    expect(result.phase).toBe('escaped');
    expect(result.lastEvent).toBe('escaped');
  });

  it('is deterministic for the same seed and action sequence', () => {
    function replay(seed: number): TurnFishingSession {
      let session = createTurnFishingSession(seed, diverFish, balancedGear);
      for (const action of ['brace', 'reel', 'release', 'observe', 'pull', 'reel'] as const) {
        if (isTurnCombatTerminal(session)) break;
        session = applyTurnFishingAction(session, action, diverFish, balancedGear).session;
      }
      return session;
    }

    expect(replay(77)).toEqual(replay(77));
  });
});
