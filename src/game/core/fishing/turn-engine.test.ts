import { describe, expect, it } from 'vitest';
import { resolveSkillCheck } from './skill-check';
import {
  applyTurnFishingAction,
  createTurnFishingSession,
  isTurnCombatTerminal,
  previewTurnFishingAction,
} from './turn-engine';
import type {
  FishIntent,
  TurnActionResolution,
  TurnFishProfile,
  TurnFishingSession,
  TurnGearStats,
  TurnFishingAction,
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
  sizeRangeCm: { min: 4, max: 11 },
  catchDistance: 24,
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
  sizeRangeCm: { min: 32, max: 71 },
  catchDistance: 18,
};
const pikeFish: TurnFishProfile = {
  id: 'river-pike',
  archetype: 'sprinter',
  stats: {
    power: 48,
    stamina: 39,
    speed: 44,
    technique: 47,
    resistance: 46,
  },
  sizeRangeCm: { min: 32, max: 71 },
  catchDistance: 15,
};

const bossFish: TurnFishProfile = {
  id: 'old-river-king',
  archetype: 'berserker',
  stats: {
    power: 96,
    stamina: 100,
    speed: 68,
    technique: 92,
    resistance: 96,
  },
  sizeRangeCm: { min: 118, max: 186 },
  catchDistance: 12,
  bossPhases: { frenzyAt: 0.6, desperateAt: 0.25 },
};

const balancedGear: TurnGearStats = {
  power: 3,
  control: 4,
  lineStrength: 4,
  reelSpeed: 3,
  instinct: 3,
  luck: 1,
};
const starterGear: TurnGearStats = {
  power: 0,
  control: 10,
  lineStrength: -2,
  reelSpeed: -1,
  instinct: 3,
  luck: 2,
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
    expect(second.lastEvent).toBe('fish-action');
    expect(second.eventSequence).toBe(initial.eventSequence + 3);
  });

  it('makes RELEASE trade lower tension for more distance', () => {
    const initial = createTurnFishingSession(17, diverFish, balancedGear);
    const released = applyTurnFishingAction(initial, 'release', diverFish, balancedGear).session;

    expect(released.tension).toBeLessThan(initial.tension);
    expect(released.distance).toBeGreaterThan(initial.distance);
    expect(released.releasedThisTurn).toBe(true);
    expect(released.lastCheck).toBe(initial.lastCheck);
  });

  it('clears a prior check when RELEASE has no roll', () => {
    const initial = withIntent(createTurnFishingSession(18, diverFish, balancedGear), 'steady-pull');
    const checked = applyTurnFishingAction(initial, 'pull', diverFish, balancedGear).session;
    expect(checked.lastCheck).not.toBeNull();

    const released = applyTurnFishingAction(checked, 'release', diverFish, balancedGear).session;
    expect(released.lastAction).toBe('release');
    expect(released.lastCheck).toBeNull();
  });

  it('previews the reason for matchup advantage and disadvantage', () => {
    const initial = createTurnFishingSession(21, diverFish, balancedGear);
    const dash = withIntent(initial, 'power-dash', 15);
    const brace = previewTurnFishingAction(dash, 'brace', diverFish, balancedGear);
    const pull = previewTurnFishingAction(dash, 'pull', diverFish, balancedGear);

    expect(brace).toMatchObject({ mode: 'advantage', modeReason: 'brace-counter' });
    expect(pull).toMatchObject({ mode: 'disadvantage', modeReason: 'poor-response' });
    const bracedPull = previewTurnFishingAction({ ...dash, braced: true }, 'pull', diverFish, balancedGear);
    const bracedReel = previewTurnFishingAction({ ...dash, braced: true }, 'reel', diverFish, balancedGear);
    expect(bracedPull).toMatchObject({ mode: 'advantage', modeReason: 'brace-counter' });
    expect(bracedReel).toMatchObject({ mode: 'advantage', modeReason: 'brace-counter' });
  });

  it('penalizes PULL against a dive but rewards attacking a recovering fish', () => {
    const dive = withIntent(createTurnFishingSession(31, diverFish, balancedGear), 'deep-dive', 15);
    const againstDive = applyTurnFishingAction(dive, 'pull', diverFish, balancedGear).session;
    expect(againstDive.lastCheck?.mode).toBe('disadvantage');
    expect(againstDive.lastCheck?.modeReason).toBe('poor-response');

    const recover = withIntent(createTurnFishingSession(31, diverFish, balancedGear), 'recover', 12);
    const againstRecover = applyTurnFishingAction(recover, 'pull', diverFish, balancedGear).session;
    expect(againstRecover.lastCheck?.mode).toBe('advantage');
    expect(againstRecover.lastCheck?.modeReason).toBe('recovery-window');
  });

  it('rewards reading the Pike instead of repeating PULL or REEL', () => {
    const fight = (seed: number, choose: (session: TurnFishingSession) => TurnFishingAction) => {
      let session = createTurnFishingSession(seed, pikeFish, starterGear);
      for (let actionCount = 0; actionCount < 100 && session.phase === 'player-turn'; actionCount += 1) {
        session = applyTurnFishingAction(session, choose(session), pikeFish, starterGear).session;
      }
      return session.phase === 'caught';
    };
    let pullOnlyWins = 0;
    let reelOnlyWins = 0;
    let intentAwareWins = 0;

    for (let sample = 1; sample <= 64; sample += 1) {
      const seed = Math.imul(sample, 0x9e3779b1) >>> 0;
      if (fight(seed, () => 'pull')) pullOnlyWins += 1;
      if (fight(seed, () => 'reel')) reelOnlyWins += 1;
      if (fight(seed, (session) => {
        const aggressive = ['power-dash', 'deep-dive', 'thrash'].includes(session.currentIntent.type);
        if (aggressive && session.ap === 2) return 'brace';
        if (session.tension > 84 || session.lineDurability < session.maxLineDurability * 0.32) return 'release';
        return session.stamina === 0 ? 'reel' : 'pull';
      })) intentAwareWins += 1;
    }

    expect(pullOnlyWins).toBeLessThan(48);
    expect(reelOnlyWins).toBeLessThan(intentAwareWins);
    expect(intentAwareWins).toBeGreaterThan(48);
  });

  it('OBSERVE records useful knowledge and grants advantage to the next action', () => {
    let observed: TurnActionResolution | undefined;

    for (let seed = 1; seed < 200; seed += 1) {
      const initial = withIntent(createTurnFishingSession(seed, calmFish, balancedGear), 'steady-pull', 8);
      const attempt = applyTurnFishingAction(initial, 'observe', calmFish, balancedGear);
      if (attempt.observationSucceeded) {
        observed = attempt;
        break;
      }
    }

    expect(observed).toBeDefined();
    if (!observed) return;

    expect(observed.session.insight).toBe(true);
    const next = applyTurnFishingAction(observed.session, 'pull', calmFish, balancedGear).session;
    expect(next.lastCheck?.mode).toBe('advantage');
    expect(next.lastCheck?.modeReason).toBe('observed-insight');
  });

  it('reduces distance and tension pressure when BRACE meets a telegraphed surge', () => {
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
    const braceAction = applyTurnFishingAction(base, 'brace', diverFish, balancedGear).session;
    expect(braceAction.braced).toBe(true);
    expect(braceAction.tension).toBeLessThan(base.tension);

    const bracedResult = applyTurnFishingAction(prepared, 'release', diverFish, balancedGear).session;
    const openResult = applyTurnFishingAction(unprepared, 'release', diverFish, balancedGear).session;

    expect(bracedResult.turn).toBe(2);
    expect(openResult.turn).toBe(2);
    expect(bracedResult.distance).toBeLessThan(openResult.distance);
    expect(bracedResult.tension).toBeLessThan(openResult.tension);
  });

  it('catches an exhausted fish only when close and records a seeded catch', () => {
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
    expect(result.result).toMatchObject({ fishId: calmFish.id });
    expect(result.result?.lengthCm).toBeGreaterThanOrEqual(calmFish.sizeRangeCm.min);
    expect(result.result?.lengthCm).toBeLessThanOrEqual(calmFish.sizeRangeCm.max);
    expect(isTurnCombatTerminal(result.phase)).toBe(true);
  });

  it('ends the encounter when distance reaches escape or line-break limits', () => {
    const initial = withIntent(createTurnFishingSession(61, diverFish, balancedGear), 'power-dash', 20);
    const nearEscape: TurnFishingSession = {
      ...initial,
      distance: 99,
      ap: 1,
    };
    const escaped = applyTurnFishingAction(nearEscape, 'release', diverFish, balancedGear).session;
    expect(escaped.phase).toBe('escaped');
    expect(escaped.lastEvent).toBe('escaped');

    const nearBreak: TurnFishingSession = {
      ...initial,
      tension: 99,
      distance: 50,
      stamina: initial.maxStamina,
      ap: 1,
    };
    const broken = applyTurnFishingAction(nearBreak, 'pull', diverFish, balancedGear).session;
    expect(broken.phase).toBe('line-break');
    expect(broken.lastEvent).toBe('line-break');
  });

  it('advances the Moon Shadow Snakehead through frenzy and desperate phases', () => {
    const opening = createTurnFishingSession(71, bossFish, balancedGear);
    expect(opening.bossPhase).toBe(1);

    const frenzy = applyTurnFishingAction({
      ...opening,
      ap: 1,
      stamina: 50,
      distance: 40,
      tension: 20,
    }, 'release', bossFish, balancedGear).session;
    expect(frenzy.bossPhase).toBe(2);

    const desperate = applyTurnFishingAction({
      ...opening,
      ap: 1,
      stamina: 10,
      distance: 40,
      tension: 20,
    }, 'release', bossFish, balancedGear).session;
    expect(desperate.bossPhase).toBe(3);
  });

  it('makes the boss desperate phase press harder on distance', () => {
    const base = withIntent(createTurnFishingSession(73, bossFish, balancedGear), 'power-dash', 8);
    const opening: TurnFishingSession = {
      ...base,
      ap: 1,
      bossPhase: 1,
      stamina: 80,
      distance: 40,
      tension: 20,
    };
    const desperate = { ...opening, bossPhase: 3 as const };

    const openingRun = applyTurnFishingAction(opening, 'release', bossFish, balancedGear).session;
    const desperateRun = applyTurnFishingAction(desperate, 'release', bossFish, balancedGear).session;

    expect(desperateRun.distance).toBeGreaterThan(openingRun.distance);
  });

  it('gives fish archetypes distinct seeded intent profiles', () => {
    let calmDashes = 0;
    let sprinterDashes = 0;
    const sprinter: TurnFishProfile = { ...diverFish, archetype: 'sprinter' };

    for (let seed = 1; seed <= 160; seed += 1) {
      if (createTurnFishingSession(seed, calmFish, balancedGear).currentIntent.type === 'power-dash') calmDashes += 1;
      if (createTurnFishingSession(seed, sprinter, balancedGear).currentIntent.type === 'power-dash') sprinterDashes += 1;
    }

    expect(sprinterDashes).toBeGreaterThan(calmDashes * 2);
  });

  it('is deterministic for the same seed and action sequence', () => {
    function replay(seed: number): TurnFishingSession {
      let session = createTurnFishingSession(seed, diverFish, balancedGear);
      for (const action of ['brace', 'reel', 'release', 'observe', 'pull', 'reel'] as const) {
        if (isTurnCombatTerminal(session.phase)) break;
        session = applyTurnFishingAction(session, action, diverFish, balancedGear).session;
      }
      return session;
    }

    expect(replay(77)).toEqual(replay(77));
  });
});
