import { useState } from 'react';
import { FISH, FISHING_SPOTS, GEAR, STORY_EVENTS } from '../content';
import type { FishDefinition, GearCategory } from '../content/types';
import type { GearEffects } from '../game/core/fishing/types';
import { previewTurnFishingAction } from '../game/core/fishing/turn-engine';
import { toTurnFishProfile, toTurnGearStats } from '../game/core/fishing/turn-adapter';
import type { TurnFishingAction } from '../game/core/fishing/turn-types';
import { getActiveFish, getEquippedGearItems, hasCaughtKing, useGameStore } from '../game/state/game-store';
import type { GameTab } from '../game/state/game-store';
import { unlockFishingAudio } from './audio';
import { UI_COPY, localize } from './copy';
import type { Locale } from './copy';
import { CanalScene } from './CanalScene';

type UiCopy = typeof UI_COPY.en;

const GEAR_CATEGORIES: GearCategory[] = ['rod', 'reel', 'line', 'hook', 'bait'];
const EFFECT_ORDER: (keyof GearEffects)[] = ['power', 'control', 'lineStrength', 'reelSpeed', 'attraction', 'skillPower'];
const FIGHT_ACTIONS = ['reel', 'pull', 'release', 'brace', 'observe'] as const satisfies readonly TurnFishingAction[];

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
function FishArtworkImage({
  fish,
  locale,
  className,
  loading = 'lazy',
}: {
  fish: FishDefinition;
  locale: Locale;
  className: string;
  loading?: 'eager' | 'lazy';
}) {
  const [failed, setFailed] = useState(false);
  const name = localize(fish.name, locale);

  if (failed) {
    return (
      <div className={`${className} fish-artwork-fallback`} role="img" aria-label={name} data-rarity={fish.rarity}>
        <span className="fish-mark" aria-hidden="true">
          <span className="fish-mark__tail" />
          <span className="fish-mark__body" />
        </span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={fish.artwork}
      alt={name}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function FishingPanel({ copy, locale }: { copy: UiCopy; locale: Locale }) {
  const session = useGameStore((state) => state.session);
  const selectedSpotId = useGameStore((state) => state.selectedSpotId);
  const selectedBaitId = useGameStore((state) => state.selectedBaitId);
  const equippedGear = useGameStore((state) => state.equippedGear);
  const unlockedSpotIds = useGameStore((state) => state.unlockedSpotIds);
  const reducedMotion = useGameStore((state) => state.reducedMotion);
  const selectSpot = useGameStore((state) => state.selectSpot);
  const cast = useGameStore((state) => state.cast);
  const act = useGameStore((state) => state.act);
  const restartSession = useGameStore((state) => state.restartSession);
  const settleCatch = useGameStore((state) => state.settleCatch);
  const setTab = useGameStore((state) => state.setTab);
  const selectedSpot = FISHING_SPOTS.find((spot) => spot.id === selectedSpotId) ?? FISHING_SPOTS[0]!;
  const fish = getActiveFish(session);
  const fishProfile = fish ? toTurnFishProfile(fish) : null;
  const gearStats = toTurnGearStats(getEquippedGearItems({ equippedGear }));
  const bait = GEAR.find((item) => item.id === selectedBaitId);
  const baitTargets = bait ? FISH.filter((item) => bait.baitTargets?.includes(item.id)) : [];
  const phase = session?.phase ?? 'ready';
  const inDuel = phase === 'player-turn';
  const canChangeSpot = phase !== 'player-turn' && phase !== 'caught';
  const tension = Math.round(session?.tension ?? 0);
  const stamina = session && session.maxStamina > 0
    ? Math.max(0, Math.round((session.stamina / session.maxStamina) * 100))
    : 0;
  const distance = session ? Math.round((session.distance / session.maxDistance) * 100) : 0;
  const durability = session && session.maxLineDurability > 0
    ? Math.max(0, Math.round((session.lineDurability / session.maxLineDurability) * 100))
    : 100;
  const lineState = tension >= 92 ? 'critical'
    : tension >= 70 ? 'danger'
      : tension >= 45 ? 'high'
        : tension >= 15 ? 'safe'
          : 'slack';
  const result = session?.result;

  const runAction = (action: TurnFishingAction) => {
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

        <div className="scene-frame" data-phase={phase}>
          <CanalScene
            artwork={inDuel || phase === 'caught' ? fish?.artwork ?? null : null}
            description={`${copy.phase[phase]}. ${localize(selectedSpot.description, locale)}`}
            errorMessage={copy.sceneError}
            event={session?.lastEvent ?? null}
            eventSequence={session?.eventSequence ?? 0}
            fishAction={session?.lastAction ?? null}
            fishDistance={session?.distance ?? 0}
            fishIntent={session?.currentIntent.type ?? null}
            fishRarity={fish?.rarity ?? null}
            phase={phase}
            bossPhase={session?.bossPhase ?? null}
            reducedMotion={reducedMotion}
            spotName={localize(selectedSpot.name, locale)}
            tension={session?.tension ?? 0}
          />
          <div className="scene-callout" aria-live="polite" aria-atomic="true">
            {session && fish ? (
              <>
                <div className="scene-callout__meta">
                  <span>{copy.rarity[fish.rarity]}</span>
                  {session.bossPhase && <span>{copy.bossPhase[session.bossPhase]}</span>}
                </div>
                <h3>{localize(fish.name, locale)}</h3>
                <div className="scene-callout__intent">
                  <strong>{copy.intentName[session.currentIntent.type]}</strong>
                  <span>{copy.intentHint[session.currentIntent.type]}</span>
                </div>
              </>
            ) : (
              <>
                <h3>{copy.preparation}</h3>
                <p>{copy.preparationHint}</p>
              </>
            )}
          </div>
          {inDuel && session && (
            <div className="turn-counter" aria-label={`${copy.turn} ${session.turn}, ${copy.actionPoints} ${session.ap} / ${session.maxAp}`}>
              <span>{copy.turn} <strong>{numberText(session.turn, locale)}</strong></span>
              <span>{copy.actionPoints} <strong>{numberText(session.ap, locale)} / {numberText(session.maxAp, locale)}</strong></span>
            </div>
          )}
          <span className="scene-location">{localize(selectedSpot.name, locale)}</span>
        </div>

        {session && fish && (
          <section className="water-readouts" aria-label={copy.fight}>
            <div className={`readout readout--${lineState}`}>
              <div className="readout__heading">
                <span>{copy.tension}</span>
                <strong>{numberText(tension, locale)}%</strong>
              </div>
              <meter min="0" max="100" value={tension} aria-label={copy.tension} />
              <span className="readout__state">{copy.lineState[lineState]}</span>
            </div>
            <div className="readout readout--stamina">
              <div className="readout__heading">
                <span>{copy.stamina}</span>
                <strong>{numberText(stamina, locale)}%</strong>
              </div>
              <meter min="0" max="100" value={stamina} aria-label={copy.stamina} />
              <span className="readout__state">{localize(fish.name, locale)}</span>
            </div>
            <div className="readout readout--distance">
              <div className="readout__heading">
                <span>{copy.distance}</span>
                <strong>{numberText(distance, locale)}%</strong>
              </div>
              <meter min="0" max="100" value={distance} aria-label={copy.distance} />
              <span className="readout__state">{copy.distanceRisk}</span>
            </div>
            <div className="readout readout--durability">
              <div className="readout__heading">
                <span>{copy.lineDurability}</span>
                <strong>{numberText(durability, locale)}%</strong>
              </div>
              <meter min="0" max="100" value={durability} aria-label={copy.lineDurability} />
              <span className="readout__state">{copy.lineState[durability <= 25 ? 'critical' : 'safe']}</span>
            </div>
          </section>
        )}

        <section className="action-dock" aria-label={copy.fight}>
          <p className="session-status" role="status" aria-live="polite" aria-atomic="true">
            {copy.phase[phase]}
          </p>
          {phase === 'ready' && (
            <button className="action-button action-button--cast" onClick={() => markSoundGesture(cast)}>
              {copy.cast}
            </button>
          )}
          {inDuel && session && fishProfile && (
            <>
              <div className="fight-actions" aria-label={copy.fight}>
                {FIGHT_ACTIONS.map((action) => {
                  const preview = previewTurnFishingAction(session, action, fishProfile, gearStats);
                  return (
                    <button
                      className={`action-button action-button--${action}`}
                      key={action}
                      onClick={() => runAction(action)}
                      disabled={session.ap < 1}
                      title={`${copy.actionHint[action]} ${preview.modeReason ? copy.modeReason[preview.modeReason] : ''}`}
                    >
                      <span className="action-button__top">
                        <strong>{copy[action]}</strong>
                        <span className={`action-matchup action-matchup--${preview.mode ?? 'automatic'}`}>
                          {preview.mode ? copy.mode[preview.mode] : copy.automatic}
                        </span>
                      </span>
                      <span className="action-button__hint">{copy.actionHint[action]}</span>
                      {preview.modeReason && (
                        <span className="action-button__reason">{copy.modeReason[preview.modeReason]}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {session.lastAction && (
                <div
                  className={`last-check ${session.lastCheck ? `last-check--${session.lastCheck.outcome}` : 'last-check--no-roll'}`}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div className="last-check__heading">
                    <strong>{copy.lastAction}: {copy[session.lastAction]}</strong>
                    <span>
                      {session.lastCheck
                        ? `${copy.checkOutcome[session.lastCheck.outcome]} · ${copy.mode[session.lastCheck.mode]}`
                        : copy.noRoll}
                    </span>
                  </div>
                  {session.lastCheck ? (
                    <>
                      <p>
                        {copy.checkRolls}: {session.lastCheck.rolls.join(' / ')}
                        {' · '}{copy.checkTotal}: {numberText(session.lastCheck.die, locale)}
                        {' '}{session.lastCheck.modifier < 0 ? '−' : '+'} {numberText(Math.abs(session.lastCheck.modifier), locale)}
                        {' = '}{numberText(session.lastCheck.total, locale)}
                        {' · '}{copy.difficulty}: {numberText(session.lastCheck.difficulty, locale)}
                      </p>
                      <p>{copy.modeReason[session.lastCheck.modeReason]}</p>
                    </>
                  ) : (
                    <p>{copy.actionHint[session.lastAction]}</p>
                  )}
                  {(session.lastEvent === 'fish-action' || session.lastEvent === 'line-damaged') && session.lastIntent && (
                    <p>{copy.fishResponse}: {copy.intentHint[session.lastIntent]}</p>
                  )}
                </div>
              )}
            </>
          )}
          {(phase === 'escaped' || phase === 'line-break') && (
            <div className="outcome-line">
              <p>{phase === 'escaped' ? copy.fishEscaped : copy.lineBroken}</p>
              <button className="action-button action-button--cast" onClick={restartSession}>{copy.tryAgain}</button>
            </div>
          )}
          {phase === 'caught' && result && fish && (
            <section className="catch-reveal" aria-labelledby="catch-title">
                <FishArtworkImage fish={fish} locale={locale} className="catch-reveal__artwork" loading="eager" />
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
        </section>
      </section>

      <aside className="preparation-rail" aria-label={copy.setup}>
        <section className="setup-card">
          <header className="setup-card__heading">
            <div>
              <h2>{copy.setup}</h2>
              <p>{copy.setupHint}</p>
            </div>
            <button className="text-action" onClick={() => setTab('gear')}>{copy.gear}</button>
          </header>
          <dl className="build-stats">
            <div><dt>{copy.stat.control}</dt><dd>{numberText(gearStats.control, locale, 1)}</dd></div>
            <div><dt>{copy.stat.power}</dt><dd>{numberText(gearStats.power, locale, 1)}</dd></div>
            <div><dt>{copy.stat.reelSpeed}</dt><dd>{numberText(gearStats.reelSpeed, locale, 1)}</dd></div>
            <div><dt>{copy.stat.lineStrength}</dt><dd>{numberText(gearStats.lineStrength, locale, 1)}</dd></div>
          </dl>
          <ul className="setup-gear">
            {getEquippedGearItems({ equippedGear }).map((item) => (
              <li key={item.id}>
                <span>{copy.category[item.category]}</span>
                <strong>{localize(item.name, locale)}</strong>
              </li>
            ))}
          </ul>
          <div className="bait-note">
            <span className="bait-note__label">{copy.category.bait}</span>
            <strong>{bait ? localize(bait.name, locale) : copy.unknownBaitTargets}</strong>
            <p>
              {copy.baitTargets}:{' '}
              {baitTargets.length > 0
                ? baitTargets.slice(0, 4).map((target) => localize(target.name, locale)).join(' · ')
                : copy.unknownBaitTargets}
            </p>
          </div>
        </section>
        <p className="water-note">{copy.localLegend}</p>
      </aside>
    </div>
  );
}

export function CollectionPanel({ copy, locale }: { copy: UiCopy; locale: Locale }) {
  const collection = useGameStore((state) => state.fishCollection);
  const unique = FISH.filter((fish) => (collection[fish.id]?.knowledgeLevel ?? 0) > 0
    || (collection[fish.id]?.caught ?? 0) > 0).length;

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
          const knowledgeLevel = Math.max(record?.knowledgeLevel ?? 0, record?.caught ? 1 : 0);
          const discovered = knowledgeLevel > 0;
          const knownSpots = fish.spotIds
            .map((spotId) => FISHING_SPOTS.find((spot) => spot.id === spotId))
            .filter((spot) => spot !== undefined);
          const usefulBaits = fish.preferredBaitIds
            .map((baitId) => GEAR.find((item) => item.id === baitId))
            .filter((bait) => bait !== undefined);

          return (
            <li className={`fish-entry${discovered ? '' : ' fish-entry--unknown'}`} key={fish.id} data-rarity={fish.rarity}>
              {discovered ? (
                <FishArtworkImage fish={fish} locale={locale} className="fish-entry__artwork" />
              ) : (
                <span className="fish-mark" data-silhouette={fish.collection.silhouette} aria-hidden="true">
                  <span className="fish-mark__tail" />
                  <span className="fish-mark__body" />
                </span>
              )}
              <div className="fish-entry__details">
                <div className="fish-entry__heading">
                  <h3>{discovered ? localize(fish.name, locale) : '???'}</h3>
                  {discovered && <span className={`rarity-label rarity-label--${fish.rarity}`}>{copy.rarity[fish.rarity]}</span>}
                </div>
                <p>{discovered ? localize(fish.collection.entry, locale) : copy.undiscovered}</p>
                {record && record.caught > 0 && (
                  <p className="fish-record">
                    {copy.catches}: {numberText(record.caught, locale)} · {copy.bestCatch}: {numberText(record.bestWeightKg, locale, 2)} kg, {numberText(record.largestLengthCm, locale)} cm
                  </p>
                )}
                {discovered && (
                  <dl className="knowledge-notes">
                    <div>
                      <dt>{copy.knowledge}</dt>
                      <dd>{copy.knowledgeLevel} {numberText(knowledgeLevel, locale)} / 3</dd>
                    </div>
                    {knowledgeLevel >= 1 && (
                      <div>
                        <dt>{copy.habitat}</dt>
                        <dd>
                          {knownSpots.map((spot) => localize(spot.name, locale)).join(' · ')}
                          {' · '}{copy.activeTime}: {fish.activeTime.map((time) => copy.activeTimes[time]).join(' · ')}
                        </dd>
                      </div>
                    )}
                    {knowledgeLevel >= 2 && (
                      <div>
                        <dt>{copy.preferredBaits}</dt>
                        <dd>{usefulBaits.map((item) => localize(item.name, locale)).join(' · ')}</dd>
                      </div>
                    )}
                    {knowledgeLevel >= 3 && (
                      <div>
                        <dt>{copy.knownCounter}</dt>
                        <dd>{copy.counterAdvice[toTurnFishProfile(fish).archetype]}</dd>
                      </div>
                    )}
                  </dl>
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
  const uniqueFish = FISH.filter((fish) => (collection[fish.id]?.caught ?? 0) > 0).length;
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
