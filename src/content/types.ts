import type { FishProfile, GearEffects } from '../game/core/fishing/types';
import type { FishArchetype } from '../game/core/fishing/turn-types';

export interface LocalizedText {
  th: string;
  en: string;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'king';
export type GearCategory = 'rod' | 'reel' | 'line' | 'hook' | 'bait';
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export interface FishDefinition extends FishProfile {
  name: LocalizedText;
  description: LocalizedText;
  areaId: string;
  spotIds: string[];
  tier: number;
  rarity: Rarity;
  habitat: string[];
  activeTime: TimeOfDay[];
  preferredBaitIds: string[];
  sellValue: number;
  rewards: {
    money: number;
    reputation: number;
  };
  collection: {
    entry: LocalizedText;
    silhouette: string;
  };
  weightFactor: number;
  combat?: {
    archetype: FishArchetype;
    resistance?: number;
  };
}

export interface FishingSpotDefinition {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  fishIds: string[];
  unlockAfter?: string;
  risk: number;
}

export interface AreaDefinition {
  id: string;
  name: LocalizedText;
  chapter: number;
  description: LocalizedText;
  spotIds: string[];
}

export interface GearDefinition {
  id: string;
  category: GearCategory;
  name: LocalizedText;
  description: LocalizedText;
  tier: number;
  rarity: Exclude<Rarity, 'king'>;
  price: number;
  effects: Partial<GearEffects>;
  unlockAfter?: string;
  baitTargets?: string[];
}

export interface StoryEventDefinition {
  id: string;
  trigger: 'chapter-start' | 'first-catch' | 'fish-discovered' | 'spot-unlocked' | 'king-caught';
  title: LocalizedText;
  body: LocalizedText;
  npc?: LocalizedText;
}
