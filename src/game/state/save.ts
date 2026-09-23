import { z } from 'zod';

export const SAVE_VERSION = 1 as const;

const FishRecordSchema = z.object({
  caught: z.number().int().nonnegative(),
  bestWeightKg: z.number().nonnegative(),
  largestLengthCm: z.number().nonnegative(),
}).strict();

export type FishRecord = z.infer<typeof FishRecordSchema>;

const EquippedGearSchema = z.object({
  rod: z.string(),
  reel: z.string(),
  line: z.string(),
  hook: z.string(),
  bait: z.string(),
}).strict();

const SaveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  coins: z.number().nonnegative(),
  reputation: z.number().nonnegative(),
  ownedGearIds: z.array(z.string()),
  equippedGear: EquippedGearSchema,
  fishCollection: z.record(z.string(), FishRecordSchema),
  seenStoryEvents: z.array(z.string()),
  unlockedSpotIds: z.array(z.string()),
  selectedSpotId: z.string(),
  selectedBaitId: z.string(),
  locale: z.enum(['th', 'en']),
  soundEnabled: z.boolean(),
  reducedMotion: z.boolean(),
  keptFish: z.number().int().nonnegative(),
}).strict();

export type SaveData = z.infer<typeof SaveSchema>;

export function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 120,
    reputation: 0,
    ownedGearIds: [],
    equippedGear: { rod: '', reel: '', line: '', hook: '', bait: '' },
    fishCollection: {},
    seenStoryEvents: [],
    unlockedSpotIds: ['shallow-bank'],
    selectedSpotId: 'shallow-bank',
    selectedBaitId: '',
    locale: 'th',
    soundEnabled: true,
    reducedMotion: false,
    keptFish: 0,
  };
}

export function encodeSave(save: SaveData): string {
  return JSON.stringify(SaveSchema.parse({ ...save, version: SAVE_VERSION }));
}

export function decodeSave(serialized: string | null): SaveData | null {
  if (serialized === null || serialized.length === 0) return null;

  let input: unknown;
  try {
    input = JSON.parse(serialized) as unknown;
  } catch {
    return null;
  }

  const parsed = SaveSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
