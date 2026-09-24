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

    const minnowProfile = toTurnFishProfile(beginner);
    const pikeProfile = toTurnFishProfile(intermediate);
    const kingProfile = toTurnFishProfile(king);
    expect(minnowProfile.archetype).toBe('calm');
    expect(pikeProfile.archetype).toBe('bruiser');
    expect(pikeProfile.stats.power).toBeGreaterThan(pikeProfile.stats.speed);
    expect(pikeProfile.stats.resistance).toBeGreaterThan(pikeProfile.stats.speed);
    expect(kingProfile.archetype).toBe('berserker');
    expect(kingProfile.stats.resistance).toBeGreaterThan(minnowProfile.stats.resistance);
    expect(kingProfile.bossPhases).toEqual({ frenzyAt: 0.6, desperateAt: 0.25 });
    expect(pikeProfile.catchDistance).toBeLessThan(minnowProfile.catchDistance ?? 100);
  });

  it('derives turn stats from equipped gear without species-specific conditionals', () => {
    const selected = GEAR.filter((item) =>
      ['reed-rod', 'hand-reel', 'fine-cotton-line', 'barbless-hook', 'bread-crumbs'].includes(item.id),
    );
    const stats = toTurnGearStats(selected);

    expect(stats.control).toBeGreaterThan(0);
    expect(stats.instinct).toBeGreaterThan(0);
    expect(stats.luck).toBeGreaterThan(0);
  });

  it('keeps control and power rod setups meaningfully distinct', () => {
    const controlRod = GEAR.find((item) => item.id === 'reed-rod');
    const powerRod = GEAR.find((item) => item.id === 'canal-caster');
    expect(controlRod).toBeDefined();
    expect(powerRod).toBeDefined();
    if (!controlRod || !powerRod) return;

    const controlSetup = toTurnGearStats([controlRod]);
    const powerSetup = toTurnGearStats([powerRod]);
    expect(controlSetup.control).toBeGreaterThan(powerSetup.control);
    expect(powerSetup.power).toBeGreaterThan(controlSetup.power);
  });
});
