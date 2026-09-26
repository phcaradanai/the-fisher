import { beforeEach, describe, expect, it } from 'vitest';
import { FISH, FISHING_SPOTS, STORY_EVENTS } from '../../content';
import { createTurnFishingSession } from '../core/fishing/turn-engine';
import { toTurnFishProfile } from '../core/fishing/turn-adapter';
import type { TurnFishingSession, TurnGearStats } from '../core/fishing/turn-types';
import { useGameStore } from './game-store';

const initialState = useGameStore.getState();
const minnow = FISH.find((fish) => fish.id === 'river-minnow')!;
const silverBarb = FISH.find((fish) => fish.id === 'silver-barb')!;
const firstCatchEvent = STORY_EVENTS.find((event) => event.trigger === 'first-catch')!;
const rumorEvent = STORY_EVENTS.find((event) => event.trigger === 'fish-discovered')!;
const huntEvent = STORY_EVENTS.find((event) => event.trigger === 'spot-unlocked')!;
const balancedGear: TurnGearStats = {
  power: 2,
  control: 5,
  lineStrength: 2,
  reelSpeed: 1,
  instinct: 2,
  luck: 2,
};

function makeSession(fishId: string, seed: number): TurnFishingSession {
  const fish = FISH.find((entry) => entry.id === fishId)!;
  return createTurnFishingSession(seed, toTurnFishProfile(fish), balancedGear);
}

function freshState() {
  useGameStore.setState({
    ...initialState,
    fishCollection: {},
    reputation: 0,
    seenStoryEvents: [...initialState.seenStoryEvents],
    unlockedSpotIds: ['shallow-bank'],
    selectedSpotId: 'shallow-bank',
    selectedBaitId: 'bread-crumbs',
    equippedGear: { ...initialState.equippedGear, bait: 'bread-crumbs' },
    session: null,
    presentationEvents: [],
    sessionSeed: 17,
    notice: null,
  });
}

beforeEach(freshState);

describe('turn-based fishing progression', () => {
  it('casts directly into a seeded two-AP duel with a fish from the chosen spot', () => {
    useGameStore.getState().cast();

    const state = useGameStore.getState();
    const spot = FISHING_SPOTS.find((entry) => entry.id === state.selectedSpotId)!;
    expect(state.session?.phase).toBe('player-turn');
    expect(state.session?.ap).toBe(2);
    expect(spot.fishIds).toContain(state.session?.fishId);
    expect(state.presentationEvents.map((event) => event.type)).toEqual(['CAST', 'INTENT_REVEALED']);
  });

  it('consumes presentation events in order and blocks actions while queued', () => {
    useGameStore.getState().cast();
    const casted = useGameStore.getState();
    const [head, next] = casted.presentationEvents;
    expect(head).toBeDefined();
    expect(next).toBeDefined();
    if (!head || !next) return;

    casted.act('release');
    expect(useGameStore.getState().session?.ap).toBe(2);
    useGameStore.getState().consumePresentationEvent(head.sequence, head.order + 1);
    expect(useGameStore.getState().presentationEvents).toHaveLength(2);
    useGameStore.getState().consumePresentationEvent(head.sequence, head.order);
    expect(useGameStore.getState().presentationEvents[0]).toEqual(next);
    useGameStore.getState().consumePresentationEvent(next.sequence, next.order);
    expect(useGameStore.getState().presentationEvents).toHaveLength(0);
  });

  it('records the catch, reputation, and story before settling its sell reward', () => {
    const session: TurnFishingSession = {
      ...makeSession(minnow.id, 17),
      stamina: 0,
      distance: 0,
      tension: 0,
    };
    useGameStore.setState({ session, sessionSeed: session.seed });

    useGameStore.getState().act('release');

    const landed = useGameStore.getState();
    expect(landed.session?.phase).toBe('caught');
    expect(landed.session?.result?.fishId).toBe(minnow.id);
    expect(landed.presentationEvents.map((event) => event.type)).toEqual(['PLAYER_ACTION_RESOLVED', 'AP_CHANGED', 'FISH_CAUGHT']);
    expect(landed.fishCollection[minnow.id]).toMatchObject({ caught: 1, knowledgeLevel: 1 });
    expect(landed.reputation).toBe(minnow.rewards.reputation);
    expect(landed.seenStoryEvents).toContain(firstCatchEvent.id);
    expect(landed.coins).toBe(initialState.coins);

    landed.settleCatch('sell');
    const settled = useGameStore.getState();
    expect(settled.coins).toBe(initialState.coins + minnow.sellValue);
    expect(settled.session).toBeNull();
  });

  it('stores OBSERVE knowledge without counting it as a catch or unlocking the hunt', () => {
    let discovered = false;

    for (let seed = 1; seed < 200; seed += 1) {
      const session = {
        ...makeSession(minnow.id, seed),
        currentIntent: { type: 'steady-pull' as const, difficulty: 8 },
      };
      useGameStore.setState({ session, sessionSeed: session.seed });
      useGameStore.getState().act('observe');
      if ((useGameStore.getState().fishCollection[minnow.id]?.knowledgeLevel ?? 0) > 0) {
        discovered = true;
        break;
      }
    }

    const state = useGameStore.getState();
    expect(discovered).toBe(true);
    expect(state.fishCollection[minnow.id]).toMatchObject({ caught: 0, knowledgeLevel: 1 });
    expect(state.reputation).toBe(0);
    expect(state.seenStoryEvents).toContain(rumorEvent.id);
    expect(state.seenStoryEvents).not.toContain(firstCatchEvent.id);
    expect(state.unlockedSpotIds).not.toContain('deep-pool');
  });

  it('opens Deep Pool after four distinct catches, not four observations', () => {
    const knownFishIds = ['river-minnow', 'reed-perch', 'mud-carp'];
    const fishCollection = Object.fromEntries(knownFishIds.map((fishId) => [
      fishId,
      { caught: 1, bestWeightKg: 0.2, largestLengthCm: 20, knowledgeLevel: 1 },
    ]));
    const session: TurnFishingSession = {
      ...makeSession(silverBarb.id, 23),
      stamina: 0,
      distance: 0,
      tension: 0,
    };

    useGameStore.setState({
      fishCollection,
      seenStoryEvents: [...initialState.seenStoryEvents, rumorEvent.id],
      session,
      sessionSeed: session.seed,
    });
    useGameStore.getState().act('release');

    const state = useGameStore.getState();
    expect(state.fishCollection[silverBarb.id]?.caught).toBe(1);
    expect(state.seenStoryEvents).toContain(huntEvent.id);
    expect(state.unlockedSpotIds).toContain('deep-pool');
  });

  it('lands the Moon Shadow Snakehead and records both ending story events', () => {
    const kingId = 'old-river-king';
    const knownFishIds = ['river-minnow', 'reed-perch', 'mud-carp', 'silver-barb'];
    const fishCollection = Object.fromEntries(knownFishIds.map((fishId) => [
      fishId,
      { caught: 1, bestWeightKg: 0.2, largestLengthCm: 20, knowledgeLevel: 1 },
    ]));
    const endingEvents = STORY_EVENTS.filter((event) => event.trigger === 'king-caught');
    const session: TurnFishingSession = {
      ...makeSession(kingId, 41),
      stamina: 0,
      distance: 0,
      tension: 0,
    };
    useGameStore.setState({
      fishCollection,
      seenStoryEvents: [...initialState.seenStoryEvents, firstCatchEvent.id, rumorEvent.id, huntEvent.id],
      unlockedSpotIds: [...initialState.unlockedSpotIds, 'wooden-bridge', 'lotus-bed', 'deep-pool'],
      selectedSpotId: 'deep-pool',
      session,
      sessionSeed: session.seed,
    });

    useGameStore.getState().act('release');
    const state = useGameStore.getState();
    expect(state.session?.phase).toBe('caught');
    expect(state.fishCollection[kingId]?.caught).toBe(1);
    expect(state.seenStoryEvents).toEqual(expect.arrayContaining(endingEvents.map((event) => event.id)));
  });

  it('uses selected bait to raise its target fish encounter frequency', () => {
    const baitTargetCount = (baitId: string) => {
      let count = 0;
      for (let sample = 1; sample <= 512; sample += 1) {
        const seed = Math.imul(sample, 0x9e3779b1) >>> 0;
        useGameStore.setState({
          ...initialState,
          selectedSpotId: 'lotus-bed',
          unlockedSpotIds: ['shallow-bank', 'wooden-bridge', 'lotus-bed'],
          selectedBaitId: baitId,
          equippedGear: { ...initialState.equippedGear, bait: baitId },
          ownedGearIds: [...new Set([...initialState.ownedGearIds, baitId])],
          session: null,
          sessionSeed: seed,
        });
        useGameStore.getState().cast();
        if (useGameStore.getState().session?.fishId === 'river-pike') count += 1;
      }
      return count;
    };

    const targeted = baitTargetCount('shiny-spinner');
    const untargeted = baitTargetCount('lotus-grub');
    expect(targeted).toBeGreaterThan(untargeted);
  });
});
