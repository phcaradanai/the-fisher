import { create } from 'zustand';
import { AREAS, FISH, FISHING_SPOTS, GEAR, STORY_EVENTS, getFishById, getFishingSpotById, getGearById } from '../../content';
import type { FishDefinition, FishingSpotDefinition, GearCategory, GearDefinition, StoryEventDefinition } from '../../content/types';
import { advanceFishingSession, applyFishingAction, castLine, createFishingSession } from '../core/fishing/engine';
import { nextRandomFloat } from '../core/fishing/random';
import type { FishingAction, FishingSession, GearEffects } from '../core/fishing/types';
import { createDefaultSave, decodeSave, encodeSave } from './save';
import type { FishRecord, SaveData } from './save';

export type GameTab = 'fishing' | 'collection' | 'gear' | 'story';
export type GameNotice =
  | 'locked-spot'
  | 'not-enough-coins'
  | 'gear-locked'
  | 'already-owned'
  | 'no-fish'
  | 'not-caught'
  | 'sold'
  | 'kept'
  | null;

export type SaveStatus = 'saved' | 'unavailable';

export interface GameStore extends SaveData {
  session: FishingSession;
  activeTab: GameTab;
  notice: GameNotice;
  saveStatus: SaveStatus;
  cast(): void;
  advance(deltaMs: number): void;
  act(action: Exclude<FishingAction, 'cast'>): void;
  selectSpot(spotId: string): void;
  setTab(tab: GameTab): void;
  buyGear(gearId: string): void;
  equipGear(gearId: string): void;
  settleCatch(disposition: 'sell' | 'keep'): void;
  restartSession(): void;
  setLocale(locale: SaveData['locale']): void;
  setSoundEnabled(enabled: boolean): void;
  setReducedMotion(enabled: boolean): void;
  dismissNotice(): void;
}

const STORAGE_KEY = 'village-canal-save-v1';
const GEAR_CATEGORIES: GearCategory[] = ['rod', 'reel', 'line', 'hook', 'bait'];

const EFFECT_KEYS: (keyof GearEffects)[] = ['power', 'control', 'lineStrength', 'reelSpeed', 'attraction', 'skillPower'];
const RARITY_WEIGHT: Record<FishDefinition['rarity'], number> = {
  common: 42,
  uncommon: 22,
  rare: 10,
  king: 14,
};
const EMPTY_EFFECTS: GearEffects = {
  power: 0,
  control: 0,
  lineStrength: 0,
  reelSpeed: 0,
  attraction: 0,
  skillPower: 0,
};

function createFreshSave(): SaveData {
  const save = createDefaultSave();

  for (const category of GEAR_CATEGORIES) {
    const starter = GEAR.find((item) => item.category === category && item.tier === 1 && item.price === 0);
    if (!starter) throw new Error(`Catalog has no free starter ${category}.`);
    save.ownedGearIds.push(starter.id);
    save.equippedGear[category] = starter.id;
    if (category === 'bait') save.selectedBaitId = starter.id;
  }

  const opening = STORY_EVENTS.find((event) => event.trigger === 'chapter-start');
  if (opening) save.seenStoryEvents.push(opening.id);
  save.unlockedSpotIds = unlockedSpots(save.seenStoryEvents);
  return save;
}

function unlockedSpots(seenStoryEvents: string[]): string[] {
  const seen = new Set(seenStoryEvents);
  const huntEvent = STORY_EVENTS.find((event) => event.trigger === 'spot-unlocked');
  const huntUnlocked = huntEvent ? seen.has(huntEvent.id) : false;
  return FISHING_SPOTS
    .filter((spot) => {
      if (spot.unlockAfter && !seen.has(spot.unlockAfter)) return false;
      const containsKing = spot.fishIds.some((fishId) => FISH.some((fish) => fish.id === fishId && fish.rarity === 'king'));
      return !containsKing || huntUnlocked;
    })
    .map((spot) => spot.id);
}

function reconcileSave(saved: SaveData): SaveData {
  const fresh = createFreshSave();
  const validGear = new Map(GEAR.map((gear) => [gear.id, gear]));
  const validFishIds = new Set(FISH.map((fish) => fish.id));
  const validEventIds = new Set(STORY_EVENTS.map((event) => event.id));
  const ownedGearIds = new Set(saved.ownedGearIds.filter((id) => validGear.has(id)));
  for (const id of fresh.ownedGearIds) ownedGearIds.add(id);

  const equippedGear = { ...fresh.equippedGear };
  for (const category of GEAR_CATEGORIES) {
    const savedItem = validGear.get(saved.equippedGear[category]);
    if (savedItem?.category === category && ownedGearIds.has(savedItem.id)) {
      equippedGear[category] = savedItem.id;
    }
  }

  const seenStoryEvents = [...new Set(saved.seenStoryEvents.filter((id) => validEventIds.has(id)))];
  const fishCollection: SaveData['fishCollection'] = {};
  for (const [fishId, record] of Object.entries(saved.fishCollection)) {
    if (validFishIds.has(fishId)) fishCollection[fishId] = record;
  }

  const unlockedSpotIds = unlockedSpots(seenStoryEvents);
  const selectedSpotId = unlockedSpotIds.includes(saved.selectedSpotId) ? saved.selectedSpotId : fresh.selectedSpotId;
  const equippedBaitId = equippedGear.bait;
  const savedBait = validGear.get(saved.selectedBaitId);
  const selectedBaitId = savedBait?.category === 'bait' && ownedGearIds.has(savedBait.id)
    ? savedBait.id
    : equippedBaitId;
  equippedGear.bait = selectedBaitId;

  return {
    ...saved,
    ownedGearIds: [...ownedGearIds],
    equippedGear,
    fishCollection,
    seenStoryEvents,
    unlockedSpotIds,
    selectedSpotId,
    selectedBaitId,
  };
}

function readInitialSave(): { save: SaveData; status: SaveStatus } {
  const fresh = createFreshSave();
  if (typeof window === 'undefined') return { save: fresh, status: 'unavailable' };

  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (serialized === null) return { save: fresh, status: persistSave(fresh) ? 'saved' : 'unavailable' };
    const decoded = decodeSave(serialized);
    return decoded
      ? { save: reconcileSave(decoded), status: 'saved' }
      : { save: fresh, status: 'unavailable' };
  } catch {
    return { save: fresh, status: 'unavailable' };
  }
}

function getGearEffects(equippedGear: SaveData['equippedGear']): GearEffects {
  const effects: GearEffects = { ...EMPTY_EFFECTS };
  for (const category of GEAR_CATEGORIES) {
    const gear = getGearById(equippedGear[category]);
    if (!gear) continue;
    for (const key of EFFECT_KEYS) {
      effects[key] += gear.effects[key] ?? 0;
    }
  }
  return effects;
}

function pickEncounter(
  spot: FishingSpotDefinition,
  baitId: string,
  seed: number,
): { fish: FishDefinition | null; seed: number } {
  const draw = nextRandomFloat(seed);
  const bait = getGearById(baitId);
  let totalWeight = 0;

  for (const fishId of spot.fishIds) {
    const fish = getFishById(fishId);
    if (!fish) continue;
    const rarityWeight = RARITY_WEIGHT[fish.rarity];
    const riskMultiplier = 1 + spot.risk * (fish.rarity === 'king' ? 1.6 : fish.rarity === 'rare' ? 0.7 : 0);
    const baitMultiplier = bait && (bait.baitTargets?.includes(fish.id) || fish.preferredBaitIds.includes(bait.id)) ? 1.7 : 1;
    totalWeight += rarityWeight * riskMultiplier * baitMultiplier;
  }

  if (totalWeight === 0) return { fish: null, seed: draw.seed };

  let remainingWeight = draw.value * totalWeight;
  for (const fishId of spot.fishIds) {
    const fish = getFishById(fishId);
    if (!fish) continue;
    const rarityWeight = RARITY_WEIGHT[fish.rarity];
    const riskMultiplier = 1 + spot.risk * (fish.rarity === 'king' ? 1.6 : fish.rarity === 'rare' ? 0.7 : 0);
    const baitMultiplier = bait && (bait.baitTargets?.includes(fish.id) || fish.preferredBaitIds.includes(bait.id)) ? 1.7 : 1;
    remainingWeight -= rarityWeight * riskMultiplier * baitMultiplier;
    if (remainingWeight <= 0) return { fish, seed: draw.seed };
  }

  return { fish: null, seed: draw.seed };
}

function triggeredEvents(seenEventIds: string[], trigger: StoryEventDefinition['trigger']): string[] {
  const seen = new Set(seenEventIds);
  for (const event of STORY_EVENTS) {
    if (event.trigger === trigger && !seen.has(event.id)) seen.add(event.id);
  }
  return [...seen];
}

function saveProjection(state: GameStore): SaveData {
  return {
    version: state.version,
    coins: state.coins,
    reputation: state.reputation,
    ownedGearIds: state.ownedGearIds,
    equippedGear: state.equippedGear,
    fishCollection: state.fishCollection,
    seenStoryEvents: state.seenStoryEvents,
    unlockedSpotIds: state.unlockedSpotIds,
    selectedSpotId: state.selectedSpotId,
    selectedBaitId: state.selectedBaitId,
    locale: state.locale,
    soundEnabled: state.soundEnabled,
    reducedMotion: state.reducedMotion,
    keptFish: state.keptFish,
  };
}

function persistSave(save: SaveData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing !== null && decodeSave(existing) === null) return false;
    window.localStorage.setItem(STORAGE_KEY, encodeSave(save));
    return true;
  } catch {
    return false;
  }
}

function makeSessionSeed(): number {
  return (Date.now() >>> 0) || 1;
}

const initial = readInitialSave();

export const useGameStore = create<GameStore>((set, get) => {
  const commitSave = (patch: Partial<SaveData>, runtime: Partial<Pick<GameStore, 'session' | 'notice'>> = {}) => {
    const nextSave = { ...saveProjection(get()), ...patch };
    const persisted = persistSave(nextSave);
    set({ ...patch, ...runtime, saveStatus: persisted ? 'saved' : 'unavailable' });
  };

  let equippedGearCache: SaveData['equippedGear'] | undefined;
  let effectsCache: GearEffects = EMPTY_EFFECTS;
  const effects = () => {
    const equippedGear = get().equippedGear;
    if (equippedGear !== equippedGearCache) {
      equippedGearCache = equippedGear;
      effectsCache = getGearEffects(equippedGear);
    }
    return effectsCache;
  };

  const recordCatch = (session: FishingSession) => {
    const state = get();
    const result = session.result;
    if (!result) return;
    const fish = getFishById(result.fishId);
    if (!fish) return;

    const previousRecord = state.fishCollection[fish.id];
    const record: FishRecord = {
      caught: (previousRecord?.caught ?? 0) + 1,
      bestWeightKg: Math.max(previousRecord?.bestWeightKg ?? 0, result.weightKg),
      largestLengthCm: Math.max(previousRecord?.largestLengthCm ?? 0, result.lengthCm),
    };
    const fishCollection = { ...state.fishCollection, [fish.id]: record };
    const firstCatch = Object.keys(state.fishCollection).length === 0;
    let seenStoryEvents = firstCatch ? triggeredEvents(state.seenStoryEvents, 'first-catch') : state.seenStoryEvents;
    if (!previousRecord) seenStoryEvents = triggeredEvents(seenStoryEvents, 'fish-discovered');

    const uniqueFishCount = Object.keys(fishCollection).length;
    const hasRumor = STORY_EVENTS.some((event) => event.trigger === 'fish-discovered' && seenStoryEvents.includes(event.id));
    const needsSpotUnlock = STORY_EVENTS.some((event) => event.trigger === 'spot-unlocked' && !seenStoryEvents.includes(event.id));
    if (uniqueFishCount >= 4 && hasRumor && needsSpotUnlock) {
      seenStoryEvents = triggeredEvents(seenStoryEvents, 'spot-unlocked');
    }
    if (fish.rarity === 'king') seenStoryEvents = triggeredEvents(seenStoryEvents, 'king-caught');

    const unlockedSpotIds = unlockedSpots(seenStoryEvents);
    const selectedSpotId = unlockedSpotIds.includes(state.selectedSpotId) ? state.selectedSpotId : 'shallow-bank';
    commitSave({
      fishCollection,
      reputation: state.reputation + fish.rewards.reputation,
      seenStoryEvents,
      unlockedSpotIds,
      selectedSpotId,
    }, { session, notice: null });
  };

  return {
    ...initial.save,
    session: createFishingSession(makeSessionSeed()),
    activeTab: 'fishing',
    notice: null,
    saveStatus: initial.status,
    cast() {
      const state = get();
      const spot = getFishingSpotById(state.selectedSpotId);
      if (!spot || !state.unlockedSpotIds.includes(spot.id)) {
        set({ notice: 'locked-spot' });
        return;
      }
      if (state.session.phase !== 'ready' && state.session.phase !== 'escaped' && state.session.phase !== 'line-break') {
        set({ notice: 'not-caught' });
        return;
      }

      const readySession = state.session.phase === 'ready' ? state.session : createFishingSession(state.session.seed);
      const encounter = pickEncounter(spot, state.selectedBaitId, readySession.seed);
      if (!encounter.fish) {
        set({ notice: 'no-fish' });
        return;
      }
      const seededSession = { ...readySession, seed: encounter.seed };
      const session = castLine(seededSession, encounter.fish, effects());
      set({ session, notice: null });
    },
    advance(deltaMs) {
      const state = get();
      if (state.session.phase !== 'casting' && state.session.phase !== 'waiting' && state.session.phase !== 'bite' && state.session.phase !== 'fighting') return;
      const fish = state.session.fishId ? getFishById(state.session.fishId) : undefined;
      if (!fish) return;
      const session = advanceFishingSession(state.session, deltaMs, fish, effects());
      if (session.phase === 'caught') {
        recordCatch(session);
      } else {
        set({ session });
      }
    },
    act(action) {
      const state = get();
      const fish = state.session.fishId ? getFishById(state.session.fishId) : undefined;
      if (!fish) {
        set({ notice: 'not-caught' });
        return;
      }
      const session = applyFishingAction(state.session, action, fish, effects());
      if (state.session.phase !== 'caught' && session.phase === 'caught') {
        recordCatch(session);
      } else {
        set({ session, notice: null });
      }
    },
    selectSpot(spotId) {
      const state = get();
      if (!state.unlockedSpotIds.includes(spotId)) {
        set({ notice: 'locked-spot' });
        return;
      }
      if (state.session.phase === 'fighting' || state.session.phase === 'bite' || state.session.phase === 'caught') {
        set({ notice: 'not-caught' });
        return;
      }
      const nextSave = { selectedSpotId: spotId };
      const session = createFishingSession(state.session.seed);
      commitSave(nextSave, { session, notice: null });
    },
    setTab(tab) {
      set({ activeTab: tab, notice: null });
    },
    buyGear(gearId) {
      const state = get();
      const gear = getGearById(gearId);
      if (!gear) return;
      if (state.ownedGearIds.includes(gear.id)) {
        set({ notice: 'already-owned' });
        return;
      }
      if (gear.unlockAfter && !state.seenStoryEvents.includes(gear.unlockAfter)) {
        set({ notice: 'gear-locked' });
        return;
      }
      if (state.coins < gear.price) {
        set({ notice: 'not-enough-coins' });
        return;
      }
      commitSave({ coins: state.coins - gear.price, ownedGearIds: [...state.ownedGearIds, gear.id] }, { notice: null });
    },
    equipGear(gearId) {
      const state = get();
      const gear = getGearById(gearId);
      if (!gear || !state.ownedGearIds.includes(gear.id)) {
        set({ notice: 'gear-locked' });
        return;
      }
      const equippedGear = { ...state.equippedGear, [gear.category]: gear.id };
      const patch: Partial<SaveData> = { equippedGear };
      if (gear.category === 'bait') patch.selectedBaitId = gear.id;
      commitSave(patch, { notice: null });
    },
    settleCatch(disposition) {
      const state = get();
      const result = state.session.result;
      if (state.session.phase !== 'caught' || !result) {
        set({ notice: 'not-caught' });
        return;
      }
      const fish = getFishById(result.fishId);
      if (!fish) {
        set({ notice: 'no-fish' });
        return;
      }
      const nextSession = createFishingSession(state.session.seed);
      if (disposition === 'sell') {
        commitSave({ coins: state.coins + fish.sellValue }, { session: nextSession, notice: 'sold' });
      } else {
        commitSave({ keptFish: state.keptFish + 1 }, { session: nextSession, notice: 'kept' });
      }
    },
    restartSession() {
      const state = get();
      if (state.session.phase !== 'escaped' && state.session.phase !== 'line-break') return;
      set({ session: createFishingSession(state.session.seed), notice: null });
    },
    setLocale(locale) {
      commitSave({ locale });
    },
    setSoundEnabled(soundEnabled) {
      commitSave({ soundEnabled });
    },
    setReducedMotion(reducedMotion) {
      commitSave({ reducedMotion });
    },
    dismissNotice() {
      set({ notice: null });
    },
  };
});

export function getActiveFish(session: FishingSession): FishDefinition | null {
  return session.fishId ? getFishById(session.fishId) ?? null : null;
}

export function hasCaughtKing(state: Pick<GameStore, 'fishCollection'>): boolean {
  return FISH.some((fish) => fish.rarity === 'king' && (state.fishCollection[fish.id]?.caught ?? 0) > 0);
}

export function getAreaForSpot(spotId: string) {
  return AREAS.find((area) => area.spotIds.includes(spotId));
}

export function getEquippedGearItems(state: Pick<GameStore, 'equippedGear'>): GearDefinition[] {
  const items: GearDefinition[] = [];
  for (const category of GEAR_CATEGORIES) {
    const gear = getGearById(state.equippedGear[category]);
    if (gear) items.push(gear);
  }
  return items;
}
