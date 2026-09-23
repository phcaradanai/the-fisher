import { AREAS, FISHING_SPOTS } from './areas';
import { FISH } from './fish';
import { GEAR } from './gear';
import { STORY_EVENTS } from './story';

export { AREAS, FISHING_SPOTS, FISH, GEAR, STORY_EVENTS };
export type {
  AreaDefinition,
  FishDefinition,
  FishingSpotDefinition,
  GearDefinition,
  GearCategory,
  LocalizedText,
  Rarity,
  StoryEventDefinition,
  TimeOfDay,
} from './types';

export const CONTENT_CATALOGS = {
  areas: AREAS,
  spots: FISHING_SPOTS,
  fish: FISH,
  gear: GEAR,
  storyEvents: STORY_EVENTS,
} as const;

const areasById: Record<string, (typeof AREAS)[number]> = Object.fromEntries(AREAS.map((area) => [area.id, area] as const));
const spotsById: Record<string, (typeof FISHING_SPOTS)[number]> = Object.fromEntries(FISHING_SPOTS.map((spot) => [spot.id, spot] as const));
const fishById: Record<string, (typeof FISH)[number]> = Object.fromEntries(FISH.map((fish) => [fish.id, fish] as const));
const gearById: Record<string, (typeof GEAR)[number]> = Object.fromEntries(GEAR.map((item) => [item.id, item] as const));
const storyEventsById: Record<string, (typeof STORY_EVENTS)[number]> = Object.fromEntries(STORY_EVENTS.map((event) => [event.id, event] as const));

export const getAreaById = (id: string) => Object.hasOwn(areasById, id) ? areasById[id] : undefined;
export const getFishingSpotById = (id: string) => Object.hasOwn(spotsById, id) ? spotsById[id] : undefined;
export const getFishById = (id: string) => Object.hasOwn(fishById, id) ? fishById[id] : undefined;
export const getGearById = (id: string) => Object.hasOwn(gearById, id) ? gearById[id] : undefined;
export const getStoryEventById = (id: string) => Object.hasOwn(storyEventsById, id) ? storyEventsById[id] : undefined;

export const getSpotsForArea = (areaId: string) => {
  const area = getAreaById(areaId);
  return area ? area.spotIds.flatMap((spotId) => {
    const spot = getFishingSpotById(spotId);
    return spot ? [spot] : [];
  }) : [];
};

export const getFishForSpot = (spotId: string) => {
  const spot = getFishingSpotById(spotId);
  return spot ? spot.fishIds.flatMap((fishId) => {
    const fish = getFishById(fishId);
    return fish ? [fish] : [];
  }) : [];
};

export const getGearByCategory = (category: (typeof GEAR)[number]['category']) =>
  GEAR.filter((item) => item.category === category);
