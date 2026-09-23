import { useState } from 'react';
import { FISH, FISHING_SPOTS, GEAR, STORY_EVENTS } from '../content';
import type { GearCategory, StoryEventDefinition } from '../content/types';
import type { FishingAction, GearEffects } from '../game/core/fishing/types';
import { getActiveFish, hasCaughtKing, useGameStore } from '../game/state/game-store';
import type { GameTab } from '../game/state/game-store';
import { unlockFishingAudio } from './audio';
import { UI_COPY, localize } from './copy';
import type { Locale } from './copy';
import { CanalScene } from './CanalScene';

type UiCopy = typeof UI_COPY.en;

const GEAR_CATEGORIES: GearCategory[] = ['rod', 'reel', 'line', 'hook', 'bait'];
const EFFECT_ORDER: (keyof GearEffects)[] = ['power', 'control', 'lineStrength', 'reelSpeed', 'attraction', 'skillPower'];

function numberText(value: number, locale: Locale, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

function markSoundGesture(action: () => void): void {
  unlockFishingAudio();
  action();
}

export function FishingPanel({ copy, locale }: { copy: UiCopy; locale: Locale }) {
  const session = useGameStore((state) => state.session);
  const selectedSpotId = useGameStore((state) => state.selectedSpotId);
  const unlockedSpotIds = useGameStore((state) => state.unlockedSpotIds);
  const reducedMotion = useGameStore((state) => state.reducedMotion);
  const seenStoryEvents = useGameStore((state) => state.seenStoryEvents);
  let latestStoryEvent: StoryEventDefinition | undefined;
  for (const event of STORY_EVENTS) {
    if (seenStoryEvents.includes(event.id)) latestStoryEvent = event;
  }
  const selectedSpot = FISHING_SPOTS.find((spot) => spot.id === selectedSpotId) ?? FISHING_SPOTS[0]!;
  const fish = getActiveFish(session);
  const selectSpot = useGameStore((state) => state.selectSpot);
  const cast = useGameStore((state) => state.cast);
  const act = useGameStore((state) => state.act);
  const restartSession = useGameStore((state) => state.restartSession);
  const settleCatch = useGameStore((state) => state.settleCatch);
  const tension = Math.round(session.tension);
  const stamina = session.maxStamina > 0 ? Math.max(0, Math.round((session.stamina / session.maxStamina) * 100)) : 0;
  const lineState = tension >= 72 ? 'critical' : tension >= 40 ? 'watch' : 'safe';
  const canChangeSpot = session.phase !== 'fighting' && session.phase !== 'bite' && session.phase !== 'caught';
  const result = session.result;

  const runAction = (action: Exclude<FishingAction, 'cast'>) => {
    markSoundGesture(() => act(action));
  };

  return (
    <div className="fishing-layout">
      <section className="fishing-field" aria-labelledby="field-title">
        <div className="field-heading">
          <div>
            <h2 id="field-title">{localize(selectedSpot.name, locale)}</h2>
            <p>{localize(selectedSpot.description, locale)}</p>
          </div>
          <label className="spot-picker">
            <span>{copy.chooseSpot}</span>
            <select
              aria-label={copy.chooseSpot}
              value={selectedSpotId}
              onChange={(event) => selectSpot(event.currentTarget.value)}
              disabled={!canChangeSpot}
            >
              {FISHING_SPOTS.map((spot) => (
                <option key={spot.id} value={spot.id} disabled={!unlockedSpotIds.includes(spot.id)}>
                  {localize(spot.name, locale)}{unlockedSpotIds.includes(spot.id) ? '' : ` · ${copy.locked}`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="scene-frame">
          <CanalScene
            description={`${copy.phase[session.phase]}. ${localize(selectedSpot.description, locale)}`}
            errorMessage={copy.sceneError}
            fishDirection={session.fishDirection}
            fishDistance={session.distance / 100}
            fishRarity={fish?.rarity ?? null}
            phase={session.phase}
            reducedMotion={reducedMotion}
            spotName={localize(selectedSpot.name, locale)}
            tension={session.tension}
          />
          <p className="scene-legend">{copy.localLegend}</p>
          <span className="scene-location">{localize(selectedSpot.name, locale)}</span>
        </div>

        <section className="water-readouts" aria-label={copy.phase[session.phase]}>
          <div className={`readout readout--${lineState}`}>
            <div className="readout__heading">
              <span>{copy.tension}</span>
              <strong>{numberText(tension, locale)}%</strong>
            </div>
            <meter min="0" max="100" value={tension} aria-label={copy.tension} />
            <span className="readout__state">{copy[lineState]}</span>
          </div>
          <div className="readout readout--stamina">
            <div className="readout__heading">
              <span>{copy.stamina}</span>
              <strong>{numberText(stamina, locale)}%</strong>
            </div>
            <meter min="0" max="100" value={stamina} aria-label={copy.stamina} />
            <span className="readout__state">{fish ? localize(fish.name, locale) : copy.phase[session.phase]}</span>
          </div>
        </section>

        <div className="action-dock">
          <p className="session-status" role="status" aria-live="polite" aria-atomic="true">
            {copy.phase[session.phase]}
          </p>
          {session.phase === 'ready' && (
            <button className="action-button action-button--cast" onClick={() => markSoundGesture(cast)}>
              {copy.cast}
            </button>
          )}
          {(session.phase === 'casting' || session.phase === 'waiting') && (
            <button className="action-button action-button--watch" disabled>
              {copy.watchFloat}
            </button>
          )}
          {session.phase === 'bite' && (
            <button className="action-button action-button--hook" onClick={() => runAction('hook')}>
              {copy.hook}
            </button>
          )}
          {session.phase === 'fighting' && (
            <div className="fight-actions" aria-label={copy.phase.fighting}>
              <button className="action-button action-button--reel" onClick={() => runAction('reel')}>{copy.reel}</button>
              <button className="action-button action-button--pull" onClick={() => runAction('pull')}>{copy.pull}</button>
              <button className="action-button action-button--release" onClick={() => runAction('release')}>{copy.release}</button>
              <button
                className="action-button action-button--skill"
                onClick={() => runAction('skill')}
                disabled={session.skillCooldownMs > 0}
              >
                {copy.skill}<span>{session.skillCooldownMs > 0 ? copy.cooldown : copy.skillReady}</span>
              </button>
            </div>
          )}
          {(session.phase === 'escaped' || session.phase === 'line-break') && (
            <div className="outcome-line">
              <p>{session.phase === 'escaped' ? copy.fishEscaped : copy.lineBroken}</p>
              <button className="action-button action-button--cast" onClick={restartSession}>{copy.tryAgain}</button>
            </div>
          )}
          {session.phase === 'caught' && result && fish && (
            <section className="catch-reveal" aria-labelledby="catch-title">
              <div className="catch-reveal__copy">
                <p className="catch-reveal__state">{copy.caught}</p>
                <h3 id="catch-title">{localize(fish.name, locale)}</h3>
                <p>{copy.rarity[fish.rarity]} · {copy.weight} {numberText(result.weightKg, locale, 2)} kg · {copy.length} {numberText(result.lengthCm, locale)} cm</p>
              </div>
              <div className="catch-reveal__actions">
                <button className="action-button action-button--sell" onClick={() => settleCatch('sell')}>
                  {copy.sell} {numberText(fish.sellValue, locale)} {copy.coins}
                </button>
                <button className="action-button action-button--keep" onClick={() => settleCatch('keep')}>
                  {copy.keep}
                </button>
              </div>
            </section>
          )}
        </div>
      </section>

      <aside className="field-notes" aria-label={copy.storyTitle}>
        <h2>{copy.storyTitle}</h2>
        {latestStoryEvent && <p>{localize(latestStoryEvent.body, locale)}</p>}
        <div className="field-notes__goal">
          <span>{copy.chapter} 1 · {copy.chapterOne}</span>
          <strong>{copy.phase[session.phase]}</strong>
        </div>
        {fish && (
          <div className="field-notes__fish">
            <span className={`rarity-mark rarity-mark--${fish.rarity}`} aria-hidden="true" />
            <span>{localize(fish.name, locale)}</span>
          </div>
        )}
      </aside>
    </div>
  );
}

export function CollectionPanel({ copy, locale }: { copy: UiCopy; locale: Locale }) {
  const collection = useGameStore((state) => state.fishCollection);
  const unique = Object.keys(collection).length;

  return (
    <section className="archive-panel" aria-labelledby="collection-title">
      <header className="panel-heading">
        <h2 id="collection-title">{copy.collectionTitle}</h2>
        <p>{copy.collectionDescription}</p>
        <span className="panel-count">{numberText(unique, locale)} / {numberText(FISH.length, locale)}</span>
      </header>
      <ol className="fish-list">
        {FISH.map((fish) => {
          const record = collection[fish.id];
          const discovered = record !== undefined;
          return (
            <li className={`fish-entry${discovered ? '' : ' fish-entry--unknown'}`} key={fish.id} data-rarity={fish.rarity}>
              <span className="fish-mark" data-silhouette={fish.collection.silhouette} aria-hidden="true">
                <span className="fish-mark__tail" />
                <span className="fish-mark__body" />
              </span>
              <div className="fish-entry__details">
                <div className="fish-entry__heading">
                  <h3>{discovered ? localize(fish.name, locale) : '???'}</h3>
                  {discovered && <span className={`rarity-label rarity-label--${fish.rarity}`}>{copy.rarity[fish.rarity]}</span>}
                </div>
                <p>{discovered ? localize(fish.collection.entry, locale) : copy.undiscovered}</p>
                {record && (
                  <p className="fish-record">
                    {copy.catches}: {numberText(record.caught, locale)} · {copy.bestCatch}: {numberText(record.bestWeightKg, locale, 2)} kg, {numberText(record.largestLengthCm, locale)} cm
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function GearPanel({ copy, locale }: { copy: UiCopy; locale: Locale }) {
  const [category, setCategory] = useState<GearCategory>('rod');
  const ownedGearIds = useGameStore((state) => state.ownedGearIds);
  const equippedGear = useGameStore((state) => state.equippedGear);
  const seenStoryEvents = useGameStore((state) => state.seenStoryEvents);
  const coins = useGameStore((state) => state.coins);
  const buyGear = useGameStore((state) => state.buyGear);
  const equipGear = useGameStore((state) => state.equipGear);
  const categoryGear = GEAR.filter((item) => item.category === category);

  return (
    <section className="archive-panel gear-panel" aria-labelledby="gear-title">
      <header className="panel-heading">
        <h2 id="gear-title">{copy.gearTitle}</h2>
        <p>{copy.gearDescription}</p>
      </header>
      <nav className="category-nav" aria-label={copy.gearTitle}>
        {GEAR_CATEGORIES.map((gearCategory) => (
          <button
            aria-pressed={category === gearCategory}
            className={category === gearCategory ? 'category-nav__item is-current' : 'category-nav__item'}
            key={gearCategory}
            onClick={() => setCategory(gearCategory)}
          >
            {copy.category[gearCategory]}
          </button>
        ))}
      </nav>
      <ul className="gear-list">
        {categoryGear.map((item) => {
          const owned = ownedGearIds.includes(item.id);
          const isEquipped = equippedGear[item.category] === item.id;
          const locked = item.unlockAfter !== undefined && !seenStoryEvents.includes(item.unlockAfter);
          return (
            <li className="gear-entry" key={item.id}>
              <span className={`gear-mark gear-mark--${item.category}`} aria-hidden="true" />
              <div className="gear-entry__details">
                <div className="gear-entry__heading">
                  <h3>{localize(item.name, locale)}</h3>
                  <span className="gear-tier">{copy.rarity[item.rarity]}</span>
                </div>
                <p>{localize(item.description, locale)}</p>
                <ul className="gear-effects" aria-label={copy.stats}>
                  {EFFECT_ORDER.flatMap((key) => {
                    const effect = item.effects[key];
                    if (effect === undefined || effect === 0) return [];
                    return [<li key={key}>{copy.stat[key]} <strong>{effect > 0 ? '+' : ''}{numberText(effect, locale)}</strong></li>];
                  })}
                </ul>
              </div>
              <div className="gear-entry__action">
                {owned ? (
                  isEquipped ? <span className="equipped-label">{copy.equipped}</span> : (
                    <button className="text-action" onClick={() => equipGear(item.id)}>{copy.equip}</button>
                  )
                ) : locked ? (
                  <span className="locked-label">{copy.locked}</span>
                ) : (
                  <button className="text-action" disabled={coins < item.price} onClick={() => buyGear(item.id)}>
                    {item.price === 0 ? copy.free : `${copy.buy} · ${numberText(item.price, locale)} ${copy.coins}`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function StoryPanel({ copy, locale }: { copy: UiCopy; locale: Locale }) {
  const seenStoryEvents = useGameStore((state) => state.seenStoryEvents);
  const collection = useGameStore((state) => state.fishCollection);
  const unlockedSpotIds = useGameStore((state) => state.unlockedSpotIds);
  const kingCaught = useGameStore(hasCaughtKing);
  const uniqueFish = Object.keys(collection).length;
  const deepPool = FISHING_SPOTS.find((spot) => spot.id === 'deep-pool');
  const deepPoolUnlocked = deepPool !== undefined && unlockedSpotIds.includes(deepPool.id);
  const visibleEvents = STORY_EVENTS.filter((event) => seenStoryEvents.includes(event.id));

  return (
    <section className="archive-panel story-panel" aria-labelledby="story-title">
      <header className="panel-heading">
        <h2 id="story-title">{copy.storyTitle}</h2>
        <p>{copy.storyDescription}</p>
      </header>
      <section className="story-goals" aria-label={copy.chapterOne}>
        <div className="story-goal">
          <div className="story-goal__label"><span>{copy.fishProgress}</span><strong>{numberText(Math.min(uniqueFish, 4), locale)} / 4</strong></div>
          <progress max="4" value={Math.min(uniqueFish, 4)} aria-label={copy.fishProgress} />
        </div>
        <div className="story-goal">
          <div className="story-goal__label"><span>{copy.deepPool}</span><strong>{deepPoolUnlocked ? copy.discovered : copy.locked}</strong></div>
          <p>{deepPool ? localize(deepPool.description, locale) : copy.deepPool}</p>
        </div>
        <div className="story-goal">
          <div className="story-goal__label"><span>{copy.kingProgress}</span><strong>{kingCaught ? copy.discovered : copy.undiscovered}</strong></div>
          {kingCaught && <p>{copy.chapterCompleteBody}</p>}
        </div>
      </section>
      {kingCaught && (
        <section className="scout-invitation" aria-labelledby="scout-title">
          <h3 id="scout-title">{copy.chapterComplete}</h3>
          <p>{copy.chapterCompleteBody}</p>
        </section>
      )}
      <ol className="story-list">
        {visibleEvents.map((event) => (
          <li className="story-entry" key={event.id}>
            <div className="story-entry__marker" aria-hidden="true" />
            <article>
              <h3>{localize(event.title, locale)}</h3>
              <p>{localize(event.body, locale)}</p>
              {event.npc && <p className="story-entry__speaker">{localize(event.npc, locale)}</p>}
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}

export const PANEL_BY_TAB: Record<GameTab, typeof FishingPanel> = {
  fishing: FishingPanel,
  collection: CollectionPanel,
  gear: GearPanel,
  story: StoryPanel,
};
