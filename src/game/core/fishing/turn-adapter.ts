import type { FishDefinition, GearDefinition } from '../../content/types';
import type { FishArchetype, TurnFishProfile, TurnGearStats } from './turn-types';

function fallbackArchetype(behavior: FishDefinition['behavior']): FishArchetype {
  switch (behavior) {
    case 'steady':
      return 'calm';
    case 'darting':
      return 'sprinter';
    case 'ambush':
      return 'diver';
    case 'king':
      return 'berserker';
  }
}

export function toTurnFishProfile(fish: FishDefinition): TurnFishProfile {
  return {
    id: fish.id,
    archetype: fish.combat?.archetype ?? fallbackArchetype(fish.behavior),
    stats: {
      power: fish.stats.power,
      stamina: fish.stats.stamina,
      speed: fish.stats.speed,
      technique: fish.stats.technique,
      resistance: fish.combat?.resistance
        ?? Math.round((fish.stats.power + fish.stats.technique) / 2),
    },
  };
}

export function toTurnGearStats(items: readonly GearDefinition[]): TurnGearStats {
  return items.reduce<TurnGearStats>((stats, item) => ({
    power: stats.power + (item.effects.power ?? 0),
    control: stats.control + (item.effects.control ?? 0),
    lineStrength: stats.lineStrength + (item.effects.lineStrength ?? 0),
    reelSpeed: stats.reelSpeed + (item.effects.reelSpeed ?? 0),
    instinct: stats.instinct + (item.effects.skillPower ?? 0),
    luck: stats.luck,
  }), {
    power: 0,
    control: 0,
    lineStrength: 0,
    reelSpeed: 0,
    instinct: 0,
    luck: 0,
  });
}
