import { nextRandomFloat } from './random';
import type { CheckMode, CheckModeReason, CheckOutcome, SkillCheckResult } from './turn-types';

function rollOne(seed: number): { seed: number; die: number } {
  const next = nextRandomFloat(seed);
  return {
    seed: next.seed,
    die: Math.floor(next.value * 20) + 1,
  };
}

function classifyOutcome(die: number, total: number, difficulty: number): CheckOutcome {
  if (die === 1) return 'critical-failure';
  if (die === 20) return 'critical-success';

  const margin = total - difficulty;
  if (margin >= 5) return 'critical-success';
  if (margin >= 0) return 'success';
  if (margin >= -4) return 'partial-success';
  return 'failure';
}

export function resolveSkillCheck(
  seed: number,
  mode: CheckMode,
  modifier: number,
  difficulty: number,
  modeReason: CheckModeReason = 'neutral',
): { seed: number; result: SkillCheckResult } {
  const first = rollOne(seed);
  let finalSeed = first.seed;
  let die = first.die;
  const rolls = [first.die];

  if (mode !== 'normal') {
    const second = rollOne(first.seed);
    finalSeed = second.seed;
    rolls.push(second.die);
    die = mode === 'advantage'
      ? Math.max(first.die, second.die)
      : Math.min(first.die, second.die);
  }

  const safeModifier = Number.isFinite(modifier) ? Math.trunc(modifier) : 0;
  const safeDifficulty = Math.max(1, Math.trunc(Number.isFinite(difficulty) ? difficulty : 10));
  const total = die + safeModifier;

  return {
    seed: finalSeed,
    result: {
      mode,
      modeReason,
      rolls,
      die,
      modifier: safeModifier,
      total,
      difficulty: safeDifficulty,
      outcome: classifyOutcome(die, total, safeDifficulty),
    },
  };
}
