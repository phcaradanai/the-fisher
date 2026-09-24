import { CONTENT_CATALOGS } from './index';
import { isDataRecord, type DataRecord } from './data-record';
import type {
  AreaDefinition,
  FishDefinition,
  FishingSpotDefinition,
  GearDefinition,
  StoryEventDefinition,
} from './types';

export interface ContentCatalogs {
  areas: readonly AreaDefinition[];
  spots: readonly FishingSpotDefinition[];
  fish: readonly FishDefinition[];
  gear: readonly GearDefinition[];
  storyEvents: readonly StoryEventDefinition[];
}

export const EXPECTED_CATALOG_COUNTS = {
  areas: 1,
  spots: 4,
  fish: 12,
  gear: 18,
  storyEvents: 6,
  fishRarities: { common: 6, uncommon: 3, rare: 2, king: 1 },
  gearCategories: { rod: 4, reel: 3, line: 3, hook: 3, bait: 5 },
} as const;

const supportedArchetypes = ['calm', 'sprinter', 'diver', 'bruiser', 'trickster', 'endurance', 'berserker'];
const supportedBehaviors = ['steady', 'darting', 'ambush', 'king'];
const supportedRarities = ['common', 'uncommon', 'rare', 'king'];
const supportedGearRarities = ['common', 'uncommon', 'rare'];
const supportedCategories = ['rod', 'reel', 'line', 'hook', 'bait'];
const supportedTimes = ['morning', 'day', 'evening', 'night'];
const supportedTriggers = ['chapter-start', 'first-catch', 'fish-discovered', 'spot-unlocked', 'king-caught'];
const statNames = ['power', 'stamina', 'speed', 'technique'];
const effectNames = ['power', 'control', 'lineStrength', 'reelSpeed', 'attraction', 'skillPower'];
const languages = ['th', 'en'];


function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getRecords(value: unknown, label: string, errors: string[]): DataRecord[] {
  if (!Array.isArray(value)) {
    errors.push(`Catalog "${label}" must be an array.`);
    return [];
  }
  const records: DataRecord[] = [];
  for (const [index, record] of value.entries()) {
    if (!isDataRecord(record)) {
      errors.push(`Catalog "${label}" entry ${index} must be an object.`);
    } else {
      records.push(record);
    }
  }
  return records;
}

function validateLocalizedText(path: string, value: unknown, errors: string[]): void {
  if (!isDataRecord(value)) {
    errors.push(`${path} must provide Thai and English text.`);
    return;
  }
  for (const language of languages) {
    if (!isNonEmptyString(value[language])) {
      errors.push(`${path}.${language} must be a non-empty string.`);
    }
  }
}

function validateNonEmptyStringArray(path: string, value: unknown, errors: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must contain at least one entry.`);
    return [];
  }
  const entries: string[] = [];
  value.forEach((entry, index) => {
    if (!isNonEmptyString(entry)) {
      errors.push(`${path}[${index}] must be a non-empty string.`);
    } else {
      entries.push(entry);
    }
  });
  return entries;
}

function validateUniqueReferences(path: string, ids: readonly string[], errors: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${path} contains duplicate reference "${id}".`);
    seen.add(id);
  }
}

function indexById(label: string, records: readonly DataRecord[], errors: string[]): Map<string, DataRecord> {
  const indexed = new Map<string, DataRecord>();
  for (const [index, record] of records.entries()) {
    const id = record.id;
    if (!isNonEmptyString(id)) {
      errors.push(`${label}[${index}].id must be a non-empty string.`);
      continue;
    }
    if (indexed.has(id)) {
      errors.push(`Duplicate ${label} id "${id}".`);
      continue;
    }
    indexed.set(id, record);
  }
  return indexed;
}

function checkCount(label: string, records: readonly unknown[], expected: number, errors: string[]): void {
  if (records.length !== expected) {
    errors.push(`Expected ${expected} ${label}, found ${records.length}.`);
  }
}

function numberAtLeast(path: string, value: unknown, minimum: number, errors: string[]): void {
  if (!isFiniteNumber(value) || value < minimum) {
    errors.push(`${path} must be a finite number greater than or equal to ${minimum}.`);
  }
}

/** Return actionable content issues; an empty list means every catalog link is valid. */
export function validateContentCatalogs(catalogs: ContentCatalogs = CONTENT_CATALOGS): string[] {
  const errors: string[] = [];
  const areas = getRecords(catalogs.areas, 'areas', errors);
  const spots = getRecords(catalogs.spots, 'spots', errors);
  const fish = getRecords(catalogs.fish, 'fish', errors);
  const gear = getRecords(catalogs.gear, 'gear', errors);
  const events = getRecords(catalogs.storyEvents, 'storyEvents', errors);

  checkCount('areas', areas, EXPECTED_CATALOG_COUNTS.areas, errors);
  checkCount('spots', spots, EXPECTED_CATALOG_COUNTS.spots, errors);
  checkCount('fish', fish, EXPECTED_CATALOG_COUNTS.fish, errors);
  checkCount('gear items', gear, EXPECTED_CATALOG_COUNTS.gear, errors);
  checkCount('story events', events, EXPECTED_CATALOG_COUNTS.storyEvents, errors);

  const areasById = indexById('area', areas, errors);
  const spotsById = indexById('spot', spots, errors);
  const fishById = indexById('fish', fish, errors);
  const gearById = indexById('gear', gear, errors);
  const eventsById = indexById('story event', events, errors);
  const eventOrder = new Map<string, number>();
  events.forEach((event, index) => {
    if (isNonEmptyString(event.id) && !eventOrder.has(event.id)) eventOrder.set(event.id, index);
  });

  const spotOwners = new Map<string, string>();
  for (const area of areas) {
    const areaId = isNonEmptyString(area.id) ? area.id : '(missing id)';
    validateLocalizedText(`Area ${areaId}.name`, area.name, errors);
    validateLocalizedText(`Area ${areaId}.description`, area.description, errors);
    if (!Number.isInteger(area.chapter) || (area.chapter as number) < 1) {
      errors.push(`Area ${areaId}.chapter must be a positive integer.`);
    }
    const spotIds = validateNonEmptyStringArray(`Area ${areaId}.spotIds`, area.spotIds, errors);
    validateUniqueReferences(`Area ${areaId}.spotIds`, spotIds, errors);
    for (const spotId of spotIds) {
      if (!spotsById.has(spotId)) {
        errors.push(`Area ${areaId} references missing spot "${spotId}".`);
      } else if (spotOwners.has(spotId)) {
        errors.push(`Spot "${spotId}" belongs to more than one area.`);
      } else {
        spotOwners.set(spotId, areaId);
      }
    }
  }

  for (const spot of spots) {
    const spotId = isNonEmptyString(spot.id) ? spot.id : '(missing id)';
    validateLocalizedText(`Spot ${spotId}.name`, spot.name, errors);
    validateLocalizedText(`Spot ${spotId}.description`, spot.description, errors);
    const fishIds = validateNonEmptyStringArray(`Spot ${spotId}.fishIds`, spot.fishIds, errors);
    validateUniqueReferences(`Spot ${spotId}.fishIds`, fishIds, errors);
    if (!isFiniteNumber(spot.risk) || spot.risk < 0 || spot.risk > 1) {
      errors.push(`Spot ${spotId}.risk must be a finite number from 0 to 1.`);
    }
    if (!spotOwners.has(spotId)) errors.push(`Spot "${spotId}" is not linked from an area.`);
    for (const fishId of fishIds) {
      const fishRecord = fishById.get(fishId);
      if (!fishRecord) {
        errors.push(`Spot ${spotId} references missing fish "${fishId}".`);
      } else if (!Array.isArray(fishRecord.spotIds) || !fishRecord.spotIds.includes(spotId)) {
        errors.push(`Spot ${spotId} lists fish "${fishId}" but the fish does not link back to this spot.`);
      }
    }
    if (spot.unlockAfter !== undefined) {
      const unlockEvent = isNonEmptyString(spot.unlockAfter) ? eventsById.get(spot.unlockAfter) : undefined;
      if (!unlockEvent) {
        errors.push(`Spot ${spotId}.unlockAfter references missing story event "${String(spot.unlockAfter)}".`);
      } else if (unlockEvent.trigger !== 'first-catch' && unlockEvent.trigger !== 'fish-discovered') {
        errors.push(`Spot ${spotId}.unlockAfter must use a first-catch or fish-discovered story event.`);
      }
    }
  }

  const rarityCounts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, king: 0 };
  const kingFishIds: string[] = [];
  const fishArtworkPaths = new Set<string>();
  for (const fishRecord of fish) {
    const fishId = isNonEmptyString(fishRecord.id) ? fishRecord.id : '(missing id)';
    const artwork = fishRecord.artwork;
    if (!isNonEmptyString(artwork) || !/^\/images\/fish_art_a\/[^/]+\.png$/.test(artwork)) {
      errors.push(`Fish ${fishId}.artwork must reference a PNG under "/images/fish_art_a/".`);
    } else if (fishArtworkPaths.has(artwork)) {
      errors.push(`Fish ${fishId}.artwork duplicates artwork "${artwork}".`);
    } else {
      fishArtworkPaths.add(artwork);
    }
    validateLocalizedText(`Fish ${fishId}.name`, fishRecord.name, errors);
    validateLocalizedText(`Fish ${fishId}.description`, fishRecord.description, errors);
    if (!isNonEmptyString(fishRecord.areaId) || !areasById.has(fishRecord.areaId)) {
      errors.push(`Fish ${fishId}.areaId references missing area "${String(fishRecord.areaId)}".`);
    }
    const fishSpotIds = validateNonEmptyStringArray(`Fish ${fishId}.spotIds`, fishRecord.spotIds, errors);
    validateUniqueReferences(`Fish ${fishId}.spotIds`, fishSpotIds, errors);
    for (const spotId of fishSpotIds) {
      const spotRecord = spotsById.get(spotId);
      if (!spotRecord) {
        errors.push(`Fish ${fishId} references missing spot "${spotId}".`);
      } else if (!Array.isArray(spotRecord.fishIds) || !spotRecord.fishIds.includes(fishId)) {
        errors.push(`Fish ${fishId} links to spot "${spotId}" but the spot does not list this fish.`);
      }
      if (isNonEmptyString(fishRecord.areaId) && spotOwners.has(spotId) && spotOwners.get(spotId) !== fishRecord.areaId) {
        errors.push(`Fish ${fishId} links to spot "${spotId}" outside its area "${fishRecord.areaId}".`);
      }
    }
    if (!isDataRecord(fishRecord.stats)) {
      errors.push(`Fish ${fishId}.stats must provide power, stamina, speed, and technique.`);
    } else {
      for (const statName of statNames) {
        const value = fishRecord.stats[statName];
        if (!isFiniteNumber(value) || value <= 0 || value > 100) {
          errors.push(`Fish ${fishId}.stats.${statName} must be a finite value from 1 to 100.`);
        }
      }
    }
    if (!isDataRecord(fishRecord.sizeRangeCm)) {
      errors.push(`Fish ${fishId}.sizeRangeCm must provide min and max.`);
    } else {
      const { min, max } = fishRecord.sizeRangeCm;
      if (!isFiniteNumber(min) || min <= 0 || !isFiniteNumber(max) || max <= min) {
        errors.push(`Fish ${fishId}.sizeRangeCm must have positive min and max greater than min.`);
      }
    }
    if (!supportedBehaviors.includes(String(fishRecord.behavior))) {
      errors.push(`Fish ${fishId}.behavior is not a supported fishing behavior.`);
    }
    if (!supportedRarities.includes(String(fishRecord.rarity))) {
      errors.push(`Fish ${fishId}.rarity is not a supported rarity.`);
    } else {
      const rarity = String(fishRecord.rarity);
      rarityCounts[rarity] = (rarityCounts[rarity] ?? 0) + 1;
    }
    if (fishRecord.rarity === 'king') kingFishIds.push(fishId);
    numberAtLeast(`Fish ${fishId}.tier`, fishRecord.tier, 1, errors);
    if (!Number.isInteger(fishRecord.tier)) errors.push(`Fish ${fishId}.tier must be an integer.`);
    validateNonEmptyStringArray(`Fish ${fishId}.habitat`, fishRecord.habitat, errors);
    const activeTime = validateNonEmptyStringArray(`Fish ${fishId}.activeTime`, fishRecord.activeTime, errors);
    for (const time of activeTime) {
      if (!supportedTimes.includes(time)) errors.push(`Fish ${fishId}.activeTime contains unsupported time "${time}".`);
    }
    const preferredBaits = validateNonEmptyStringArray(`Fish ${fishId}.preferredBaitIds`, fishRecord.preferredBaitIds, errors);
    validateUniqueReferences(`Fish ${fishId}.preferredBaitIds`, preferredBaits, errors);
    const collection = isDataRecord(fishRecord.collection) ? fishRecord.collection : undefined;
    validateLocalizedText(`Fish ${fishId}.collection.entry`, collection?.entry, errors);
    if (!collection || !isNonEmptyString(collection.silhouette)) {
      errors.push(`Fish ${fishId}.collection.silhouette must be a non-empty key.`);
    }
    numberAtLeast(`Fish ${fishId}.weightFactor`, fishRecord.weightFactor, Number.MIN_VALUE, errors);
    numberAtLeast(`Fish ${fishId}.sellValue`, fishRecord.sellValue, 0, errors);
    if (!isDataRecord(fishRecord.rewards)) {
      errors.push(`Fish ${fishId}.rewards must provide money and reputation.`);
    } else {
      numberAtLeast(`Fish ${fishId}.rewards.money`, fishRecord.rewards.money, 0, errors);
      numberAtLeast(`Fish ${fishId}.rewards.reputation`, fishRecord.rewards.reputation, 0, errors);
    }
    for (const baitId of preferredBaits) {
      const bait = gearById.get(baitId);
      if (!bait) {
        errors.push(`Fish ${fishId}.preferredBaitIds references missing gear "${baitId}".`);
      } else if (bait.category !== 'bait') {
        errors.push(`Fish ${fishId}.preferredBaitIds item "${baitId}" is not bait gear.`);
      } else if (!Array.isArray(bait.baitTargets) || !bait.baitTargets.includes(fishId)) {
        errors.push(`Fish ${fishId} prefers bait "${baitId}", but that bait does not target this fish.`);
      }
    }
    if (fishRecord.combat !== undefined) {
      const combat = isDataRecord(fishRecord.combat) ? fishRecord.combat : undefined;
      if (!combat) {
        errors.push(`Fish ${fishId}.combat must be an object.`);
      } else {
        if (!supportedArchetypes.includes(String(combat.archetype))) {
          errors.push(`Fish ${fishId}.combat.archetype is not supported.`);
        }
        if (combat.resistance !== undefined
          && (!isFiniteNumber(combat.resistance) || combat.resistance <= 0 || combat.resistance > 100)) {
          errors.push(`Fish ${fishId}.combat.resistance must be a finite value from 1 to 100.`);
        }
        if (combat.bossPhases !== undefined) {
          const phases = isDataRecord(combat.bossPhases) ? combat.bossPhases : undefined;
          const frenzyAt = phases?.frenzyAt;
          const desperateAt = phases?.desperateAt;
          if (!isFiniteNumber(frenzyAt) || !isFiniteNumber(desperateAt)
            || frenzyAt <= 0 || frenzyAt >= 1 || desperateAt <= 0 || desperateAt >= frenzyAt) {
            errors.push(`Fish ${fishId}.combat.bossPhases must set 0 < desperateAt < frenzyAt < 1.`);
          }
        }
      }
    }
  }

  for (const [rarity, expected] of Object.entries(EXPECTED_CATALOG_COUNTS.fishRarities)) {
    if (rarityCounts[rarity] !== expected) {
      errors.push(`Expected ${expected} ${rarity} fish, found ${rarityCounts[rarity]}.`);
    }
  }
  if (kingFishIds.length !== 1) errors.push(`Expected exactly one King Fish, found ${kingFishIds.length}.`);
  for (const fishRecord of fish) {
    const fishId = isNonEmptyString(fishRecord.id) ? fishRecord.id : '(missing id)';
    const isKing = fishRecord.rarity === 'king';
    if (isKing !== (fishRecord.behavior === 'king')) {
      errors.push(`Fish ${fishId} must use king behavior if and only if it has king rarity.`);
    }
    if (isKing && (!Array.isArray(fishRecord.spotIds) || fishRecord.spotIds.length !== 1 || fishRecord.spotIds[0] !== 'deep-pool')) {
      errors.push(`King Fish ${fishId} must be available only in the Deep Pool (deep-pool).`);
    }
  }
  const kingProfile = fish.find((fishRecord) => fishRecord.rarity === 'king');
  if (kingProfile && isDataRecord(kingProfile.stats)) {
    const kingId = isNonEmptyString(kingProfile.id) ? kingProfile.id : '(missing id)';
    for (const statName of statNames) {
      let strongestNonKing = 0;
      for (const otherFish of fish) {
        if (otherFish.id === kingProfile.id || !isDataRecord(otherFish.stats)) continue;
        const value = otherFish.stats[statName];
        if (isFiniteNumber(value) && value > strongestNonKing) strongestNonKing = value;
      }
      const kingValue = kingProfile.stats[statName];
      if (isFiniteNumber(kingValue) && kingValue <= strongestNonKing) {
        errors.push(`King Fish ${kingId}.stats.${statName} must exceed the same stat on every other Chapter 1 fish.`);
      }
    }
  }

  const categoryCounts: Record<string, number> = { rod: 0, reel: 0, line: 0, hook: 0, bait: 0 };
  for (const item of gear) {
    const gearId = isNonEmptyString(item.id) ? item.id : '(missing id)';
    validateLocalizedText(`Gear ${gearId}.name`, item.name, errors);
    validateLocalizedText(`Gear ${gearId}.description`, item.description, errors);
    if (!supportedCategories.includes(String(item.category))) {
      errors.push(`Gear ${gearId}.category is not a supported category.`);
    } else {
      const category = String(item.category);
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }
    if (!supportedGearRarities.includes(String(item.rarity))) {
      errors.push(`Gear ${gearId}.rarity must be common, uncommon, or rare.`);
    }
    numberAtLeast(`Gear ${gearId}.tier`, item.tier, 1, errors);
    if (!Number.isInteger(item.tier)) errors.push(`Gear ${gearId}.tier must be an integer.`);
    numberAtLeast(`Gear ${gearId}.price`, item.price, 0, errors);
    if (!isDataRecord(item.effects) || Object.keys(item.effects).length === 0) {
      errors.push(`Gear ${gearId}.effects must include at least one gear effect.`);
    } else {
      for (const [effectName, value] of Object.entries(item.effects)) {
        if (!effectNames.includes(effectName) || !isFiniteNumber(value)) {
          errors.push(`Gear ${gearId}.effects.${effectName} must be a finite supported gear effect.`);
        }
      }
    }
    if (item.unlockAfter !== undefined) {
      const unlockEvent = isNonEmptyString(item.unlockAfter) ? eventsById.get(item.unlockAfter) : undefined;
      if (!unlockEvent) {
        errors.push(`Gear ${gearId}.unlockAfter references missing story event "${String(item.unlockAfter)}".`);
      } else if (unlockEvent.trigger === 'chapter-start') {
        errors.push(`Gear ${gearId}.unlockAfter cannot be gated by the chapter-start event.`);
      }
    }
    if (item.category === 'bait') {
      const targets = validateNonEmptyStringArray(`Gear ${gearId}.baitTargets`, item.baitTargets, errors);
      validateUniqueReferences(`Gear ${gearId}.baitTargets`, targets, errors);
      for (const targetId of targets) {
        const targetFish = fishById.get(targetId);
        if (!targetFish) {
          errors.push(`Bait ${gearId} targets missing fish "${targetId}".`);
        } else if (!Array.isArray(targetFish.preferredBaitIds) || !targetFish.preferredBaitIds.includes(gearId)) {
          errors.push(`Bait ${gearId} targets fish "${targetId}", but that fish does not prefer this bait.`);
        }
      }
    } else if (item.baitTargets !== undefined) {
      errors.push(`Gear ${gearId}.baitTargets is only valid for bait gear.`);
    }
  }
  for (const [category, expected] of Object.entries(EXPECTED_CATALOG_COUNTS.gearCategories)) {
    if (categoryCounts[category] !== expected) {
      errors.push(`Expected ${expected} ${category} gear items, found ${categoryCounts[category]}.`);
    }
  }

  const triggerCounts: Record<string, number> = {};
  for (const event of events) {
    const eventId = isNonEmptyString(event.id) ? event.id : '(missing id)';
    validateLocalizedText(`Story event ${eventId}.title`, event.title, errors);
    validateLocalizedText(`Story event ${eventId}.body`, event.body, errors);
    if (!supportedTriggers.includes(String(event.trigger))) {
      errors.push(`Story event ${eventId}.trigger is not supported.`);
    } else {
      triggerCounts[String(event.trigger)] = (triggerCounts[String(event.trigger)] ?? 0) + 1;
    }
    if (event.npc !== undefined) validateLocalizedText(`Story event ${eventId}.npc`, event.npc, errors);
  }
  const firstEvent = events.at(0);
  if (firstEvent && firstEvent.trigger !== 'chapter-start') {
    errors.push('The first story event must use the chapter-start trigger.');
  }
  const requiredTriggers: StoryEventDefinition['trigger'][] = [
    'chapter-start',
    'first-catch',
    'fish-discovered',
    'spot-unlocked',
    'king-caught',
  ];
  for (const trigger of requiredTriggers) {
    if (!triggerCounts[trigger]) errors.push(`Story catalog must include a ${trigger} event.`);
  }
  if (triggerCounts['chapter-start'] !== 1) errors.push('Story catalog must include exactly one chapter-start event.');

  for (const event of events) {
    if (event.trigger !== 'spot-unlocked') continue;
    const eventId = isNonEmptyString(event.id) ? event.id : '(missing id)';
    const eventIndex = eventOrder.get(eventId);
    const followsSpotUnlock = spots.some((spot) => {
      const gateId = spot.unlockAfter;
      const gateIndex = isNonEmptyString(gateId) ? eventOrder.get(gateId) : undefined;
      return eventIndex !== undefined && gateIndex !== undefined && gateIndex < eventIndex;
    });
    if (!followsSpotUnlock) {
      errors.push(`Story event ${eventId} cannot occur before any story-gated spot unlocks.`);
    }
  }

  const openSpots = spots.filter((spot) => spot.unlockAfter === undefined);
  if (openSpots.length === 0) errors.push('At least one fishing spot must be available before any story unlock.');
  if (openSpots.every((spot) => !Array.isArray(spot.fishIds) || spot.fishIds.length === 0)) {
    errors.push('At least one fish must be available in an initially unlocked spot.');
  }

  const kingFishId = kingFishIds.length === 1 ? kingFishIds[0] : undefined;
  const kingFish = kingFishId ? fishById.get(kingFishId) : undefined;
  const firstKingCatchIndex = events.findIndex((event) => event.trigger === 'king-caught');
  if (kingFish && firstKingCatchIndex >= 0 && Array.isArray(kingFish.spotIds)) {
    const kingReachableBeforeDefeat = kingFish.spotIds.some((spotId) => {
      const kingSpot = spotsById.get(spotId);
      if (!kingSpot) return false;
      if (kingSpot.unlockAfter === undefined) return true;
      const gateId = kingSpot.unlockAfter;
      const gate = isNonEmptyString(gateId) ? eventsById.get(gateId) : undefined;
      const gateIndex = isNonEmptyString(gateId) ? eventOrder.get(gateId) : undefined;
      return (gate?.trigger === 'first-catch' || gate?.trigger === 'fish-discovered') &&
        gateIndex !== undefined &&
        gateIndex < firstKingCatchIndex;
    });
    if (!kingReachableBeforeDefeat) {
      errors.push(`King Fish ${kingFishIds[0]} is locked behind an event that cannot occur before the king-caught story event.`);
    }
    if (Array.isArray(kingFish.preferredBaitIds)) {
      for (const baitId of kingFish.preferredBaitIds) {
        const bait = isNonEmptyString(baitId) ? gearById.get(baitId) : undefined;
        const gateId = bait?.unlockAfter;
        const gate = isNonEmptyString(gateId) ? eventsById.get(gateId) : undefined;
        if (gate?.trigger === 'king-caught') {
          errors.push(`King Fish preferred bait "${String(baitId)}" only unlocks after a King Fish is caught.`);
        }
      }
    }
  }

  return errors;
}
