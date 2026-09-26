import type { Rarity } from '../../content/types';
import type { TurnCombatEvent, TurnCombatPhase, TurnFishingAction, FishIntentType } from '../../game/core/fishing/turn-types';

export const SCENE_WIDTH = 1200;
export const SCENE_HEIGHT = 800;

export const ASSET_PATHS = {
  background: '/images/background_art_a/คลองหมอกจันทร์กับเงาอสูรใต้น้ำ.png',
  foregroundLeft: '/theme_games/village-canal/foreground-left.png',
  foregroundRight: '/theme_games/village-canal/foreground-right.png',
  mistNear: '/theme_games/village-canal/mist-near.png',
  waterMask: '/theme_games/village-canal/water-mask.png',
  reflectionMask: '/theme_games/village-canal/reflection-mask.png',
} as const;

export const MOON_CENTER = { x: 401, y: 95 } as const;

export type LanternSpot = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  intensity: number;
};

export const LANTERN_SPOTS: readonly LanternSpot[] = [
  { x: 26, y: 288, radius: 26, phase: 0.1, intensity: 1.2 },    // Main left dock lantern
  { x: 171, y: 33, radius: 18, phase: 1.4, intensity: 0.85 },   // Left house upper eave
  { x: 128, y: 30, radius: 14, phase: 2.1, intensity: 0.7 },    // Left house roof
  { x: 176, y: 244, radius: 20, phase: 3.5, intensity: 0.95 },  // Left house porch
  { x: 599, y: 61, radius: 16, phase: 0.7, intensity: 0.8 },    // Right house upper
  { x: 633, y: 118, radius: 18, phase: 2.8, intensity: 0.85 },  // Right house window
  { x: 711, y: 9, radius: 12, phase: 4.2, intensity: 0.6 },     // Distant village right
  { x: 366, y: 252, radius: 14, phase: 1.9, intensity: 0.7 },   // Arched bridge lantern
];

export type ArtworkProfile = {
  scale: number;
  x: number;
  y: number;
  tilt: number;
  focusX: number;
  focusY: number;
  anchorX: number;
  anchorY: number;
  encounterSize: 'small' | 'standard' | 'large' | 'king';
};

export function createArtworkProfile(
  scale: number,
  x: number,
  y: number,
  tilt: number,
  focusX: number,
  focusY: number,
  encounterSize: ArtworkProfile['encounterSize'],
  anchorX = 0.5,
  anchorY = 0.5,
): ArtworkProfile {
  return { scale, x, y, tilt, focusX, focusY, anchorX, anchorY, encounterSize };
}

export const DEFAULT_ARTWORK_PROFILE = createArtworkProfile(0.64, 0, 0, 0, 0.5, 0.5, 'standard');

export const ARTWORK_PROFILES: Record<string, ArtworkProfile> = {
  'river-minnow': createArtworkProfile(0.42, -12, 8, 0.02, 0.5, 0.54, 'small'),
  'reed-perch': createArtworkProfile(0.5, 28, -8, 0.016, 0.56, 0.48, 'standard'),
  'mud-carp': createArtworkProfile(0.66, 18, 12, -0.008, 0.5, 0.55, 'large'),
  'silver-barb': createArtworkProfile(0.46, -8, 3, 0.012, 0.48, 0.5, 'small'),
  bluegill: createArtworkProfile(0.54, 16, 6, -0.006, 0.52, 0.52, 'standard'),
  'lotus-goby': createArtworkProfile(0.44, 8, 12, 0.01, 0.5, 0.54, 'small'),
  'glass-catfish': createArtworkProfile(0.52, -6, -2, 0.008, 0.48, 0.48, 'standard'),
  'golden-carp': createArtworkProfile(0.62, 20, -4, 0.008, 0.52, 0.48, 'large'),
  'river-pike': createArtworkProfile(0.74, 12, 8, -0.012, 0.54, 0.52, 'large'),
  'lantern-catfish': createArtworkProfile(0.64, 12, 4, 0.006, 0.5, 0.5, 'large'),
  'moon-koi': createArtworkProfile(0.7, 8, -2, 0.004, 0.52, 0.49, 'large'),
  'old-river-king': createArtworkProfile(0.96, 6, 4, 0, 0.52, 0.52, 'king'),
};

export function getArtworkProfile(fishId: string | null, rarity: Rarity | null): ArtworkProfile {
  const matched = fishId ? ARTWORK_PROFILES[fishId] : undefined;
  if (matched) return matched;
  const size = rarity === 'king' ? 'king' : rarity === 'rare' ? 'large' : rarity === 'uncommon' ? 'standard' : 'small';
  const scale = rarity === 'king' ? 0.96 : rarity === 'rare' ? 0.76 : rarity === 'uncommon' ? 0.68 : 0.58;
  return { ...DEFAULT_ARTWORK_PROFILE, scale, encounterSize: size };
}

export type SceneRenderState = {
  artwork: string | null;
  fishId: string | null;
  event: TurnCombatEvent | null;
  eventSequence: number;
  fishAction: TurnFishingAction | null;
  fishDistance: number;
  fishTension: number;
  fishIntent: FishIntentType | null;
  fishRarity: Rarity | null;
  phase: TurnCombatPhase;
  bossPhase: 1 | 2 | 3 | null;
  reducedMotion: boolean;
  showEncounter: boolean;
};
