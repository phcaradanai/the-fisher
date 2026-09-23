import { beforeEach, describe, expect, it } from 'vitest';
import { FISH, STORY_EVENTS } from '../../content';
import { createFishingSession } from '../core/fishing/engine';
import type { FishingSession } from '../core/fishing/types';
import { useGameStore } from './game-store';

const initialState = useGameStore.getState();
const minnow = FISH.find((fish) => fish.id === 'river-minnow')!;
const firstCatchEvent = STORY_EVENTS.find((event) => event.trigger === 'first-catch')!;
const rumorEvent = STORY_EVENTS.find((event) => event.trigger === 'fish-discovered')!;
const huntEvent = STORY_EVENTS.find((event) => event.trigger === 'spot-unlocked')!;
const silverBarb = FISH.find((fish) => fish.id === 'silver-barb')!;

beforeEach(() => {
  const session: FishingSession = {
    ...createFishingSession(17),
    phase: 'fighting',
    fishId: minnow.id,
    stamina: 1,
    maxStamina: minnow.stats.stamina,
    tension: 0,
    distance: 50,
  };

  useGameStore.setState({
    ...initialState,
    fishCollection: {},
    reputation: 0,
    session,
    notice: null,
  });
});

describe('game store catch settlement', () => {
  it('records fish, reputation, and story when action completes fight', () => {
    useGameStore.getState().act('pull');

    const state = useGameStore.getState();
    expect(state.session.phase).toBe('caught');
    expect(state.fishCollection[minnow.id]?.caught).toBe(1);
    expect(state.reputation).toBe(minnow.rewards.reputation);
    expect(state.seenStoryEvents).toContain(firstCatchEvent.id);
    expect(state.coins).toBe(initialState.coins);
  });

  it('opens King hunt after four distinct fish are recorded', () => {
    const knownFishIds = ['river-minnow', 'reed-perch', 'mud-carp'];
    const fishCollection = Object.fromEntries(knownFishIds.map((fishId) => [
      fishId,
      { caught: 1, bestWeightKg: 0.2, largestLengthCm: 20 },
    ]));
    const session: FishingSession = {
      ...createFishingSession(23),
      phase: 'fighting',
      fishId: silverBarb.id,
      stamina: 1,
      maxStamina: silverBarb.stats.stamina,
      tension: 0,
      distance: 50,
    };

    useGameStore.setState({
      fishCollection,
      seenStoryEvents: [...initialState.seenStoryEvents, rumorEvent.id],
      session,
    });
    useGameStore.getState().act('pull');

    const state = useGameStore.getState();
    expect(state.fishCollection[silverBarb.id]?.caught).toBe(1);
    expect(state.seenStoryEvents).toContain(huntEvent.id);
    expect(state.unlockedSpotIds).toContain('deep-pool');
  });

  it('lands the King Fish and records both chapter ending stories', () => {
    const king = FISH.find((fish) => fish.id === 'old-river-king')!;
    const knownFishIds = ['river-minnow', 'reed-perch', 'mud-carp', 'silver-barb'];
    const fishCollection = Object.fromEntries(knownFishIds.map((fishId) => [
      fishId,
      { caught: 1, bestWeightKg: 0.2, largestLengthCm: 20 },
    ]));
    const endingEvents = STORY_EVENTS.filter((event) => event.trigger === 'king-caught');
    useGameStore.setState({
      fishCollection,
      seenStoryEvents: [...initialState.seenStoryEvents, firstCatchEvent.id, rumorEvent.id, huntEvent.id],
      unlockedSpotIds: [...initialState.unlockedSpotIds, 'wooden-bridge', 'lotus-bed', 'deep-pool'],
      selectedSpotId: 'deep-pool',
      session: createFishingSession(41),
    });

    useGameStore.getState().cast();
    let state = useGameStore.getState();
    for (let tick = 0; tick < 180 && state.session.phase !== 'bite'; tick += 1) {
      state.advance(50);
      state = useGameStore.getState();
    }
    expect(state.session.phase).toBe('bite');
    expect(state.session.fishId).toBe(king.id);
    state.act('hook');

    for (let action = 0; action < 120; action += 1) {
      state = useGameStore.getState();
      if (state.session.phase !== 'fighting') break;
      const move = state.session.skillCooldownMs <= 0
        ? 'skill'
        : state.session.tension >= 40 ? 'release' : 'pull';
      state.act(move);
      useGameStore.getState().advance(50);
    }

    state = useGameStore.getState();
    expect(state.session.phase).toBe('caught');
    expect(state.fishCollection[king.id]?.caught).toBe(1);
    expect(state.seenStoryEvents).toEqual(expect.arrayContaining(endingEvents.map((event) => event.id)));
  });
});
