import { describe, expect, it } from 'vitest';
import { createDefaultSave, decodeSave, encodeSave } from './save';

describe('local save format', () => {
  it('preserves player progress and settings across a reload', () => {
    const save = createDefaultSave();
    save.coins = 840;
    save.reputation = 72;
    save.fishCollection['reed-carp'] = { caught: 3, bestWeightKg: 1.4, largestLengthCm: 42, knowledgeLevel: 0 };
    save.unlockedSpotIds.push('wooden-bridge');
    save.locale = 'en';
    save.keptFish = 1;

    expect(decodeSave(encodeSave(save))).toEqual(save);
  });
  it('defaults new knowledge history for existing version-one collection entries', () => {
    const legacy = {
      ...createDefaultSave(),
      fishCollection: {
        'river-minnow': { caught: 1, bestWeightKg: 0.04, largestLengthCm: 16 },
      },
    };

    expect(decodeSave(JSON.stringify(legacy))?.fishCollection['river-minnow']).toEqual({
      caught: 1,
      bestWeightKg: 0.04,
      largestLengthCm: 16,
      knowledgeLevel: 0,
    });
  });

  it('does not load saves from an unsupported schema version', () => {
    const oldOrFutureSave = JSON.stringify({ ...createDefaultSave(), version: 99 });

    expect(decodeSave(oldOrFutureSave)).toBeNull();
  });

  it('rejects malformed records without accepting partial progress', () => {
    const malformed = JSON.stringify({
      ...createDefaultSave(),
      fishCollection: { 'reed-carp': { caught: -1, bestWeightKg: 1, largestLengthCm: 42 } },
    });

    expect(decodeSave(malformed)).toBeNull();
  });
});
