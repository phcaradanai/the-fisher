import { create } from 'zustand';
import { AREAS, FISH, FISHING_SPOTS, GEAR, STORY_EVENTS, getFishById, getFishingSpotById, getGearById } from '../../content';
import type { FishDefinition, FishingSpotDefinition, GearCategory, GearDefinition, StoryEventDefinition } from '../../content/types';
import { applyTurnFishingAction, createTurnFishingSession, createTurnFishingSessionEvents } from '../core/fishing/turn-engine';
import { nextRandomFloat } from '../core/fishing/random';
import { toTurnFishProfile, toTurnGearStats } from '../core/fishing/turn-adapter';
import type { TurnFishingAction, TurnFishingSession, TurnGearStats, TurnPresentationEvent } from '../core/fishing/turn-types';
import { createDefaultSave, decodeSave, encodeSave } from './save';
import type { SaveData } from './save';

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
  session: TurnFishingSession | null;
  /** Ordered presentation cues for the most recent cast or action. Runtime only. */
  presentationEvents: TurnPresentationEvent[];
  sessionSeed: number;
  activeTab: GameTab;
  notice: GameNotice;
  saveStatus: SaveStatus;
  cast(): void;
  act(action: TurnFishingAction): void;
  consumePresentationEvent(sequence: number, order: number): void;
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

const RARITY_WEIGHT: Record<FishDefinition['rarity'], number> = {
  common: 42,
  uncommon: 22,
  rare: 10,
  king: 14,
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
    if (validFishIds.has(fishId)) {
      fishCollection[fishId] = {
        ...record,
        knowledgeLevel: Math.max(record.knowledgeLevel, record.caught > 0 ? 1 : 0),
      };
    }
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


function encounterWeight(
  spot: FishingSpotDefinition,
  fish: FishDefinition,
  bait: GearDefinition | undefined,
  luck: number,
): number {
  const rarityWeight = RARITY_WEIGHT[fish.rarity];
  const riskMultiplier = 1 + spot.risk * (fish.rarity === 'king' ? 1.6 : fish.rarity === 'rare' ? 0.7 : 0);
  const baitMultiplier = bait
    && (bait.baitTargets?.includes(fish.id) || fish.preferredBaitIds.includes(bait.id))
    ? 1.7
    : 1;
  const luckMultiplier = 1 + Math.max(0, Math.min(luck, 20)) * fish.tier * 0.008;
  return rarityWeight * riskMultiplier * baitMultiplier * luckMultiplier;
}

function pickEncounter(
  spot: FishingSpotDefinition,
  baitId: string,
  seed: number,
  luck: number,
): { fish: FishDefinition | null; seed: number } {
  const draw = nextRandomFloat(seed);
  const bait = getGearById(baitId);
  let totalWeight = 0;

  for (const fishId of spot.fishIds) {
    const fish = getFishById(fishId);
    if (fish) totalWeight += encounterWeight(spot, fish, bait, luck);
  }

  if (totalWeight === 0) return { fish: null, seed: draw.seed };

  let remainingWeight = draw.value * totalWeight;
  for (const fishId of spot.fishIds) {
    const fish = getFishById(fishId);
    if (!fish) continue;
    remainingWeight -= encounterWeight(spot, fish, bait, luck);
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
  const commitSave = (
    patch: Partial<SaveData>,
    runtime: Partial<Pick<GameStore, 'session' | 'sessionSeed' | 'notice' | 'presentationEvents'>> = {},
  ) => {
    const nextSave = { ...saveProjection(get()), ...patch };
    const persisted = persistSave(nextSave);
    set({ ...patch, ...runtime, saveStatus: persisted ? 'saved' : 'unavailable' });
  };

  let equippedGearCache: SaveData['equippedGear'] | undefined;
  let turnGearStatsCache: TurnGearStats = {
    power: 0,
    control: 0,
    lineStrength: 0,
    reelSpeed: 0,
    instinct: 0,
    luck: 0,
  };
  const turnGearStats = () => {
    const equippedGear = get().equippedGear;
    if (equippedGear !== equippedGearCache) {
      equippedGearCache = equippedGear;
      turnGearStatsCache = toTurnGearStats(getEquippedGearItems(get()));
    }
    return turnGearStatsCache;
  };

  const recordCatch = (session: TurnFishingSession, presentationEvents: TurnPresentationEvent[]) => {
    const state = get();
    const result = session.result;
    if (!result) return;
    const fish = getFishById(result.fishId);
    if (!fish) return;

    const previousRecord = state.fishCollection[fish.id];
    const fishCollection = {
      ...state.fishCollection,
      [fish.id]: {
        caught: (previousRecord?.caught ?? 0) + 1,
        bestWeightKg: Math.max(previousRecord?.bestWeightKg ?? 0, result.weightKg),
        largestLengthCm: Math.max(previousRecord?.largestLengthCm ?? 0, result.lengthCm),
        knowledgeLevel: Math.max(previousRecord?.knowledgeLevel ?? 0, 1),
      },
    };
    const firstCatch = Object.values(state.fishCollection).every((record) => record.caught === 0);
    let seenStoryEvents = firstCatch ? triggeredEvents(state.seenStoryEvents, 'first-catch') : state.seenStoryEvents;
    if (!previousRecord || previousRecord.knowledgeLevel === 0) {
      seenStoryEvents = triggeredEvents(seenStoryEvents, 'fish-discovered');
    }

    let uniqueCaughtCount = 0;
    for (const record of Object.values(fishCollection)) {
      if (record.caught > 0) uniqueCaughtCount += 1;
    }
    const hasRumor = STORY_EVENTS.some((event) => event.trigger === 'fish-discovered' && seenStoryEvents.includes(event.id));
    const needsSpotUnlock = STORY_EVENTS.some((event) => event.trigger === 'spot-unlocked' && !seenStoryEvents.includes(event.id));
    if (uniqueCaughtCount >= 4 && hasRumor && needsSpotUnlock) {
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
    }, { session, sessionSeed: session.seed, notice: null, presentationEvents });
  };

  const recordObservation = (fishId: string, session: TurnFishingSession, presentationEvents: TurnPresentationEvent[]) => {
    const state = get();
    const previousRecord = state.fishCollection[fishId];
    const knowledgeLevel = previousRecord?.knowledgeLevel ?? 0;
    if (knowledgeLevel >= 3) {
      set({ session, sessionSeed: session.seed, notice: null, presentationEvents });
      return;
    }

    const fishCollection = {
      ...state.fishCollection,
      [fishId]: {
        caught: previousRecord?.caught ?? 0,
        bestWeightKg: previousRecord?.bestWeightKg ?? 0,
        largestLengthCm: previousRecord?.largestLengthCm ?? 0,
        knowledgeLevel: knowledgeLevel + 1,
      },
    };
    const seenStoryEvents = knowledgeLevel === 0
      ? triggeredEvents(state.seenStoryEvents, 'fish-discovered')
      : state.seenStoryEvents;
    commitSave({ fishCollection, seenStoryEvents }, { session, sessionSeed: session.seed, notice: null, presentationEvents });
  };

  return {
    ...initial.save,
    session: null,
    presentationEvents: [],
    sessionSeed: makeSessionSeed(),
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
      if (state.session?.phase === 'player-turn' || state.session?.phase === 'caught') {
        set({ notice: 'not-caught' });
        return;
      }

      const stats = turnGearStats();
      const encounter = pickEncounter(spot, state.selectedBaitId, state.sessionSeed, stats.luck);
      if (!encounter.fish) {
        set({ notice: 'no-fish' });
        return;
      }
      const session = createTurnFishingSession(
        encounter.seed,
        toTurnFishProfile(encounter.fish),
        stats,
      );
      set({ session, sessionSeed: session.seed, notice: null, presentationEvents: createTurnFishingSessionEvents(session) });
    },
    act(action) {
      const state = get();
      if (state.presentationEvents.length > 0) return;
      const currentSession = state.session;
      if (!currentSession || currentSession.phase !== 'player-turn') {
        set({ notice: 'not-caught' });
        return;
      }
      const fish = getActiveFish(currentSession);
      if (!fish) {
        set({ notice: 'not-caught' });
        return;
      }

      const resolution = applyTurnFishingAction(
        currentSession,
        action,
        toTurnFishProfile(fish),
        turnGearStats(),
      );
      if (resolution.session.phase === 'caught') {
        recordCatch(resolution.session, resolution.events);
      } else if (resolution.observationSucceeded) {
        recordObservation(fish.id, resolution.session, resolution.events);
      } else {
        set({
          session: resolution.session,
          sessionSeed: resolution.session.seed,
          presentationEvents: resolution.events,
          notice: null,
        });
      }
    },
    consumePresentationEvent(sequence, order) {
      const state = get();
      const head = state.presentationEvents[0];
      if (!head || head.sequence !== sequence || head.order !== order) return;
      set({ presentationEvents: state.presentationEvents.slice(1) });
    },
    selectSpot(spotId) {
      const state = get();
      if (!state.unlockedSpotIds.includes(spotId)) {
        set({ notice: 'locked-spot' });
        return;
      }
      if (state.session?.phase === 'player-turn' || state.session?.phase === 'caught') {
        set({ notice: 'not-caught' });
        return;
      }
      commitSave({ selectedSpotId: spotId }, {
        session: null,
        sessionSeed: state.session?.seed ?? state.sessionSeed,
        presentationEvents: [],
        notice: null,
      });
    },
    setTab(tab) {
      set({ activeTab: tab, notice: null });
    },
    buyGear(gearId) {
      const state = get();
      if (state.session?.phase === 'player-turn' || state.session?.phase === 'caught') {
        set({ notice: 'not-caught' });
        return;
      }
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
      if (state.session?.phase === 'player-turn' || state.session?.phase === 'caught') {
        set({ notice: 'not-caught' });
        return;
      }
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
      const session = state.session;
      const result = session?.result;
      if (session?.phase !== 'caught' || !result) {
        set({ notice: 'not-caught' });
        return;
      }
      const fish = getFishById(result.fishId);
      if (!fish) {
        set({ notice: 'no-fish' });
        return;
      }
      const runtime = { session: null, sessionSeed: session.seed, presentationEvents: [] };
      if (disposition === 'sell') {
        commitSave({ coins: state.coins + fish.sellValue }, { ...runtime, notice: 'sold' });
      } else {
        commitSave({ keptFish: state.keptFish + 1 }, { ...runtime, notice: 'kept' });
      }
    },
    restartSession() {
      const session = get().session;
      if (session?.phase !== 'escaped' && session?.phase !== 'line-break') return;
      set({ session: null, sessionSeed: session.seed, presentationEvents: [], notice: null });
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

export function getActiveFish(session: TurnFishingSession | null): FishDefinition | null {
  return session ? getFishById(session.fishId) ?? null : null;
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
