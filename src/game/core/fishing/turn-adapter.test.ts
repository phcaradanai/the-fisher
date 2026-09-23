import { describe, expect, it } from 'vitest';
import { FISH } from '../../../content/fish';
import { GEAR } from '../../../content/gear';
import { toTurnFishProfile, toTurnGearStats } from './turn-adapter';

describe('turn combat content adapter', () => {
  it('uses explicit combat metadata for the three prototype fish', () => {
    const beginner = FISH.find((fish) => fish.id === 'river-minnow');
    const intermediate = FISH.find((fish) => fish.id === 'river-pike');
    const king = FISH.find((fish) => fish.id === 'old-river-king');

    expect(beginner).toBeDefined();
    expect(intermediate).toBeDefined();
    expect(king).toBeDefined();
    if (!beginner || !intermediate || !king) return;

    expect(toTurnFishProfile(beginner).archetype).toBe('calm');
    expect(toTurnFishProfile(intermediate).archetype).toBe('sprinter');
    expect(toTurnFishProfile(king).archetype).toBe('berserker');
    expect(toTurnFishProfile(king).stats.resistance).toBeGreaterThan(
      toTurnFishProfile(beginner).stats.resistance,
    );
  });

  it('derives turn stats from equipped gear without species-specific conditionals', () => {
    const selected = GEAR.filter((item) =>
      ['reed-rod', 'hand-reel', 'fine-cotton-line', 'barbless-hook', 'bread-crumbs'].includes(item.id),
    );
    const stats = toTurnGearStats(selected);

    expect(stats.control).toBeGreaterThan(0);
    expect(stats.instinct).toBeGreaterThan(0);
    expect(stats.luck).toBe(0);
  });
});
