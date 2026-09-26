import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useGameStore } from '../game/state/game-store';
import type { TurnCombatEvent, TurnPresentationEvent } from '../game/core/fishing/turn-types';

type FishingPresentationState = {
  activeEvent: TurnPresentationEvent | null;
  events: TurnPresentationEvent[];
  busy: boolean;
};

const FishingPresentationContext = createContext<FishingPresentationState>({
  activeEvent: null,
  events: [],
  busy: false,
});

const EVENT_DURATION_MS: Record<TurnPresentationEvent['type'], number> = {
  CAST: 680,
  PLAYER_ACTION_RESOLVED: 180,
  CHECK_RESOLVED: 150,
  AP_CHANGED: 40,
  STAMINA_DAMAGED: 80,
  LINE_DAMAGED: 100,
  FISH_ACTION_RESOLVED: 180,
  INTENT_REVEALED: 180,
  FISH_CAUGHT: 850,
  ESCAPED: 320,
  LINE_BREAK: 340,
};

export function FishingPresentationProvider({ children }: { children: ReactNode }) {
  const events = useGameStore((state) => state.presentationEvents);
  const reducedMotion = useGameStore((state) => state.reducedMotion);
  const consumePresentationEvent = useGameStore((state) => state.consumePresentationEvent);
  const activeEvent = events[0] ?? null;

  useEffect(() => {
    if (!activeEvent) return;
    const delay = reducedMotion ? 12 : EVENT_DURATION_MS[activeEvent.type];
    const timeout = window.setTimeout(
      () => consumePresentationEvent(activeEvent.sequence, activeEvent.order),
      delay,
    );
    return () => window.clearTimeout(timeout);
  }, [activeEvent, consumePresentationEvent, reducedMotion]);

  return (
    <FishingPresentationContext.Provider value={{ activeEvent, events, busy: events.length > 0 }}>
      {children}
    </FishingPresentationContext.Provider>
  );
}

export function useFishingPresentation(): FishingPresentationState {
  return useContext(FishingPresentationContext);
}

export function presentationCombatEvent(event: TurnPresentationEvent | null): TurnCombatEvent | null {
  if (!event) return null;
  switch (event.type) {
    case 'CAST':
      return 'cast';
    case 'INTENT_REVEALED':
      return 'fish-intent';
    case 'PLAYER_ACTION_RESOLVED':
      return event.action ? `action-${event.action}` : null;
    case 'FISH_ACTION_RESOLVED':
    case 'STAMINA_DAMAGED':
      return 'fish-action';
    case 'LINE_DAMAGED':
      return 'line-damaged';
    case 'FISH_CAUGHT':
      return 'caught';
    case 'ESCAPED':
      return 'escaped';
    case 'LINE_BREAK':
      return 'line-break';
    case 'CHECK_RESOLVED':
    case 'AP_CHANGED':
      return null;
  }
}
