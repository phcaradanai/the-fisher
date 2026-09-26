import { useEffect, useState } from 'react';
import { FISH, FISHING_SPOTS, GEAR, STORY_EVENTS } from '../content';
import type { FishDefinition, GearCategory } from '../content/types';
import type { GearEffects } from '../game/core/fishing/types';
import { previewTurnFishingAction } from '../game/core/fishing/turn-engine';
import { toTurnFishProfile, toTurnGearStats } from '../game/core/fishing/turn-adapter';
import type { TurnFishingAction, TurnFishingSession } from '../game/core/fishing/turn-types';
import { getActiveFish, getEquippedGearItems, hasCaughtKing, useGameStore } from '../game/state/game-store';
import type { GameTab } from '../game/state/game-store';
import { unlockFishingAudio } from './audio';
import { UI_COPY, localize } from './copy';
import type { Locale } from './copy';
import { presentationCombatEvent, useFishingPresentation } from './presentation';
import { CanalScene } from './CanalScene';
import { assetUrl } from './asset';

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

function weightText(weightKg: number, locale: Locale): string {
  return weightKg < 0.005 ? `<${numberText(0.01, locale, 2)}` : numberText(weightKg, locale, 2);
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
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const name = localize(fish.name, locale);

  if (failedArtwork === fish.artwork) {
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
      src={assetUrl(fish.artwork)}
      alt={name}
      loading={loading}
      decoding="async"
      onError={() => setFailedArtwork(fish.artwork)}
    />
  );
}

function TacticCards({
  copy,
  session,
  fishProfile,
  gearStats,
  onAction,
  presentationBusy = false,
  resolvingAction = null,
}: {
  copy: UiCopy;
  session: TurnFishingSession | null;
  fishProfile: ReturnType<typeof toTurnFishProfile> | null;
  gearStats: ReturnType<typeof toTurnGearStats>;
  onAction: (action: TurnFishingAction) => void;
  presentationBusy?: boolean;
  resolvingAction?: TurnFishingAction | null;
}) {
  return (
    <div className="game-command-bar fight-actions" role="group" aria-label={copy.fight} data-control-surface="tactical-actions">
      {FIGHT_ACTIONS.map((action, index) => {
        const preview = session && fishProfile
          ? previewTurnFishingAction(session, action, fishProfile, gearStats)
          : null;
        const matchup = preview?.mode
          ? copy.mode[preview.mode]
          : preview
            ? copy.automatic
            : copy.phase.ready;
        return (
          <button
            type="button"
            className={`action-button action-button--${action} liquid-pane liquid-pane--interactive liquid-pane--tactic liquid-pane--${action}${resolvingAction === action ? ' is-resolving' : ''}`}
            data-matchup={preview?.mode ?? (preview ? 'automatic' : 'unavailable')}
            data-action={action}
            key={action}
            onClick={() => onAction(action)}
            disabled={!session || !fishProfile || session.ap < 1 || presentationBusy}
            aria-keyshortcuts={String(index + 1)}
            aria-label={`${copy[action]}. 1 ${copy.actionPoints}. ${matchup}. ${copy.actionHint[action]}${preview?.modeReason ? ` ${copy.modeReason[preview.modeReason]}` : ''}`}
            title={`${copy.actionHint[action]}${preview?.modeReason ? ` · ${copy.modeReason[preview.modeReason]}` : ''}`}
            data-tooltip={`${copy.actionHint[action]}${preview?.modeReason ? ` · ${copy.modeReason[preview.modeReason]}` : ''}`}
          >
            <span className="action-shortcut" aria-hidden="true">{index + 1}</span>
            <img className="action-card__art" src={assetUrl(`/theme_games/method-${action === 'reel' ? 'float' : action === 'pull' ? 'lure' : action === 'release' ? 'bobber' : action === 'brace' ? 'net' : 'observe'}.webp`)} alt="" />
            <span className="action-card__head">
              <img className="action-icon" src={assetUrl(`/theme_games/action-icon-${action}.webp`)} alt="" />
              <span className="action-card__cost"><strong>1</strong><span>AP</span></span>
            </span>
            <span className="action-button__top">
              <strong>{copy[action]}</strong>
              {preview && (
                <span className={`action-matchup action-matchup--${preview.mode ?? 'automatic'}`}>
                  {matchup}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CombatVitals({
  copy,
  locale,
  session,
}: {
  copy: UiCopy;
  locale: Locale;
  session: TurnFishingSession;
}) {
  const staminaPercent = Math.max(0, Math.min(100, Math.round((session.stamina / Math.max(1, session.maxStamina)) * 100)));
  const tensionPercent = Math.max(0, Math.min(100, Math.round(session.tension)));
  const distancePercent = Math.max(0, Math.min(100, Math.round((session.distance / Math.max(1, session.maxDistance)) * 100)));

  const metrics = [
    {
      key: 'stamina',
      label: locale === 'th' ? 'พลังปลา' : 'Fish stamina',
      value: session.stamina,
      max: session.maxStamina,
      percent: staminaPercent,
      display: `${numberText(session.stamina, locale)} / ${numberText(session.maxStamina, locale)}`,
      tone: staminaPercent <= 25 ? 'stamina-critical' : staminaPercent <= 50 ? 'stamina-low' : 'stamina',
    },
    {
      key: 'tension',
      label: locale === 'th' ? 'แรงตึงสาย' : 'Line tension',
      value: session.tension,
      max: 100,
      percent: tensionPercent,
      display: `${numberText(session.tension, locale)}%`,
      tone: tensionPercent >= 85 ? 'tension-danger' : tensionPercent >= 70 ? 'tension-warn' : 'tension',
    },
    {
      key: 'distance',
      label: locale === 'th' ? 'ระยะจากฝั่ง' : 'Distance',
      value: session.distance,
      max: session.maxDistance,
      percent: distancePercent,
      display: `${numberText(session.distance, locale)} / ${numberText(session.maxDistance, locale)} m`,
      tone: 'distance',
    },
  ] as const;
  const lineIsDangerous = session.lineDurability <= session.maxLineDurability * 0.4;
  const visibleMetrics = lineIsDangerous
    ? [...metrics, {
      key: 'line',
      label: locale === 'th' ? 'ความทนสาย' : 'Line durability',
      value: session.lineDurability,
      max: session.maxLineDurability,
      percent: Math.round((session.lineDurability / Math.max(1, session.maxLineDurability)) * 100),
      display: `${numberText(session.lineDurability, locale)} / ${numberText(session.maxLineDurability, locale)}`,
      tone: 'line-danger',
    }]
    : metrics;

  return (
    <section className="combat-vitals" data-control-surface="combat-vitals" aria-label={copy.fight}>
      <div className="combat-vitals__metrics">
        {visibleMetrics.map((metric) => (
          <div
            className={`combat-vital combat-vital--${metric.tone}`}
            key={metric.key}
            data-vital={metric.key}
            data-percent={metric.percent}
          >
            <div className="combat-vital__heading">
              <span>{metric.label}</span>
              <strong>{metric.display}</strong>
            </div>
            <div className="combat-vital__bar-wrap">
              <progress
                value={metric.value}
                max={metric.max}
                aria-label={metric.label}
              />
              {metric.key === 'tension' && (
                <div className="tension-gauge-markers" aria-hidden="true">
                  <span className="tension-marker tension-marker--sweet" title="Sweet Spot" />
                  <span className="tension-marker tension-marker--danger" title="Danger Zone" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
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
  const phase = session?.phase ?? 'ready';
  const { activeEvent, events: presentationEvents, busy: presentationBusy } = useFishingPresentation();
  const apChangeEvent = presentationEvents.find((event) => event.type === 'AP_CHANGED');
  const fishTurnEvent = presentationEvents.find((event) => event.type === 'FISH_ACTION_RESOLVED');
  const beforeApChange = Boolean(presentationBusy && activeEvent && apChangeEvent && activeEvent.order < apChangeEvent.order);
  const beforeFishTurn = Boolean(presentationBusy && activeEvent && fishTurnEvent && activeEvent.order < fishTurnEvent.order);
  const displayedAp = session && beforeApChange
    ? apChangeEvent?.previousValue ?? session.ap
    : session && beforeFishTurn && apChangeEvent
      ? apChangeEvent.value ?? session.ap
      : session?.ap ?? 0;
  const displayedTurn = session && beforeFishTurn ? Math.max(1, session.turn - 1) : session?.turn ?? 0;
  const castingPresentation = activeEvent?.type === 'CAST';
  const displayedIntent = activeEvent?.type === 'INTENT_REVEALED'
    ? activeEvent.intent ?? null
    : activeEvent?.type === 'FISH_ACTION_RESOLVED'
      ? activeEvent.intent ?? session?.lastIntent ?? null
      : activeEvent?.type === 'ESCAPED' || activeEvent?.type === 'LINE_BREAK'
        ? null
        : castingPresentation
          ? null
          : presentationBusy
            ? session?.lastIntent ?? session?.currentIntent.type ?? null
            : session?.currentIntent.type ?? null;
  const encounterVisible = !castingPresentation && (presentationBusy || phase === 'player-turn' || phase === 'caught');
  const sceneEvent = presentationCombatEvent(activeEvent);
  const gearStats = toTurnGearStats(getEquippedGearItems({ equippedGear }));
  const fishCollection = useGameStore((state) => state.fishCollection);
  const bait = GEAR.find((item) => item.id === selectedBaitId);
  const baitTargets = bait ? FISH.filter((item) => bait.baitTargets?.includes(item.id)) : [];
  const discoveredBaitTargets = baitTargets.filter((target) => {
    const record = fishCollection[target.id];
    return (record?.knowledgeLevel ?? 0) >= 2;
  });
  const inDuel = phase === 'player-turn';
  const canChangeSpot = phase !== 'player-turn' && phase !== 'caught';
  const result = session?.result;
  const catchRecord = result ? fishCollection[result.fishId] : undefined;
  const firstCatch = catchRecord?.caught === 1;
  const catchKnowledgeLevel = catchRecord?.knowledgeLevel ?? 0;
  const catchBestWeight = catchRecord?.bestWeightKg ?? 0;
  const catchBestLength = catchRecord?.largestLengthCm ?? 0;
  const discoveredFishCount = FISH.filter((item) => {
    const record = fishCollection[item.id];
    return (record?.knowledgeLevel ?? 0) > 0 || (record?.caught ?? 0) > 0;
  }).length;
  const firstEncounter = Object.keys(fishCollection).length === 0;
  const showFirstCastGuidance = firstEncounter && phase === 'ready';
  const showFirstTurnGuidance = firstEncounter && inDuel && !session?.lastAction && !presentationBusy;
  const intentSession = session && displayedIntent && session.currentIntent.type !== displayedIntent
    ? { ...session, currentIntent: { ...session.currentIntent, type: displayedIntent } }
    : session;
  const intentCounterSession = intentSession?.insight ? { ...intentSession, insight: false } : intentSession;
  const intentCounter = intentCounterSession && fishProfile
    ? FIGHT_ACTIONS.find((action) => previewTurnFishingAction(intentCounterSession, action, fishProfile, gearStats).mode === 'advantage')
    : null;
  const buildIsPowerLed = gearStats.power > gearStats.control;
  const buildProfile = buildIsPowerLed ? copy.powerBuild : copy.controlBuild;
  const primaryBuildStat = buildIsPowerLed ? gearStats.power : gearStats.control;
  const secondaryBuildStat = buildIsPowerLed ? gearStats.control : gearStats.power;
  const negativeEffects = (['power', 'control', 'lineStrength', 'reelSpeed', 'attraction', 'skillPower'] as const)
    .map((key) => ({ key, value: gearStats[key === 'skillPower' ? 'instinct' : key === 'attraction' ? 'luck' : key] }))
    .filter(({ value }) => value < 0);

  const runAction = (action: TurnFishingAction) => {
    if (presentationBusy) return;
    markSoundGesture(() => act(action));
  };

  useEffect(() => {
    if (!inDuel || !session || session.ap < 1 || presentationBusy) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat
        || (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)))) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < FIGHT_ACTIONS.length && event.key === String(index + 1)) {
        event.preventDefault();
        markSoundGesture(() => act(FIGHT_ACTIONS[index]!));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [act, inDuel, presentationBusy, session]);

  return (
    <div
      className="fishing-layout"
      data-phase={phase}
      data-presentation-event={activeEvent?.type ?? 'IDLE'}
      data-intent={displayedIntent ?? 'none'}
      data-rarity={fish?.rarity ?? 'none'}
      data-boss-phase={session?.bossPhase ?? 0}
    >
      <div className="spot-gallery" role="group" aria-label={copy.chooseSpot}>
        {FISHING_SPOTS.map((spot) => {
          const unlocked = unlockedSpotIds.includes(spot.id);
          const stars = Math.ceil(spot.risk * 5);
          return (
            <button
              className={`spot-gallery__item${spot.id === selectedSpotId ? ' is-current' : ''}`}
              key={spot.id}
              type="button"
              disabled={!canChangeSpot || !unlocked}
              aria-pressed={spot.id === selectedSpotId}
              onClick={() => selectSpot(spot.id)}
            >
              <img src={assetUrl(`/theme_games/spot-${spot.id}.webp`)} alt="" />
              <div className="spot-gallery__info">
                <span className="spot-gallery__name">{localize(spot.name, locale)}{!unlocked && ` · ${copy.locked}`}</span>
                {unlocked && (
                  <span className="spot-gallery__risk" aria-hidden="true">
                    {'★'.repeat(stars)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <section className="fishing-field" aria-labelledby="field-title">
        <div className="field-heading">
          <div>
            <h2 id="field-title">{localize(selectedSpot.name, locale)}</h2>
            <p>{localize(selectedSpot.description, locale)}</p>
          </div>
          <label className="spot-picker visually-hidden">
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

        <div
          className="scene-frame"
          data-phase={phase}
          data-presentation-event={activeEvent?.type ?? 'IDLE'}
          data-intent={displayedIntent ?? 'none'}
          data-rarity={fish?.rarity ?? 'none'}
          data-boss-phase={session?.bossPhase ?? 0}
        >
          <CanalScene
            artwork={encounterVisible ? fish?.artwork ?? null : null}
            description={`${copy.phase[phase]}. ${localize(selectedSpot.description, locale)}`}
            errorMessage={copy.sceneError}
            event={sceneEvent}
            eventSequence={activeEvent && sceneEvent ? activeEvent.sequence * 16 + activeEvent.order + 1 : 0}
            fishAction={activeEvent?.type === 'PLAYER_ACTION_RESOLVED' ? activeEvent.action ?? null : null}
            fishDistance={session?.distance ?? 0}
            fishTension={session?.tension ?? 0}
            fishIntent={displayedIntent}
            fishRarity={fish?.rarity ?? null}
            phase={phase}
            bossPhase={session?.bossPhase ?? null}
            reducedMotion={reducedMotion}
            spotName={localize(selectedSpot.name, locale)}
            showEncounter={encounterVisible}
            fishId={encounterVisible ? fish?.id ?? null : null}
          />
          <div className="scene-cinematic-chrome" aria-hidden="true">
            <span className="scene-cinematic-chrome__corner scene-cinematic-chrome__corner--tl" />
            <span className="scene-cinematic-chrome__corner scene-cinematic-chrome__corner--tr" />
            <span className="scene-cinematic-chrome__corner scene-cinematic-chrome__corner--bl" />
            <span className="scene-cinematic-chrome__corner scene-cinematic-chrome__corner--br" />
            <span className="scene-cinematic-chrome__horizon" />
            <span className="scene-cinematic-chrome__focus" />
          </div>
          <aside className="scene-intel" aria-label={copy.area}>
            <h3>{copy.area}</h3>
            <p>{localize(selectedSpot.description, locale)}</p>
            <div className="scene-intel__risk">
              <span>{locale === 'th' ? 'ระดับความยาก' : 'Difficulty'}</span>
              <strong aria-label={`${Math.ceil(selectedSpot.risk * 5)} / 5`}>
                {'★'.repeat(Math.ceil(selectedSpot.risk * 5))}{'☆'.repeat(5 - Math.ceil(selectedSpot.risk * 5))}
              </strong>
            </div>
            <div className="scene-intel__fish">
              <span>{locale === 'th' ? 'ปลาที่พบ' : 'Local fish'}</span>
              <div>
                {selectedSpot.fishIds.map((id) => {
                  const localFish = FISH.find((item) => item.id === id);
                  return localFish ? (
                    <span key={id} title={localize(localFish.name, locale)}>
                      <FishArtworkImage fish={localFish} locale={locale} className="scene-intel__art" />
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          </aside>
          <div className="scene-callout liquid-pane liquid-pane--hud" aria-live="polite" aria-atomic="true">
            {session && fish && !castingPresentation ? (
              <>
                <div className="scene-callout__meta">
                  <span className={`scene-callout__rarity-pill scene-callout__rarity-pill--${fish.rarity}`}>{copy.rarity[fish.rarity]}</span>
                  {session.bossPhase && <span className="scene-callout__boss-phase">{copy.bossPhase[session.bossPhase]}</span>}
                </div>
                <h3>{localize(fish.name, locale)}</h3>
                {displayedIntent && (
                  <div className={`scene-callout__intent${activeEvent?.type === 'PLAYER_ACTION_RESOLVED' && activeEvent.action === 'observe' ? ' is-focused' : ''}`} data-intent={displayedIntent}>
                    <div className="intent-header-row">
                      <span className="intent-indicator-dot" aria-hidden="true" />
                      <strong>{copy.intentName[displayedIntent]}</strong>
                    </div>
                    <span className="intent-description">{copy.intentHint[displayedIntent]}</span>
                    {intentCounter && (
                      <span className="scene-callout__counter">
                        <span className="counter-tag">{locale === 'th' ? 'แก้ทาง:' : 'Counter:'}</span> <strong>{copy[intentCounter]}</strong>
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3>{copy.preparation}</h3>
                <p>{copy.preparationHint}</p>
              </>
            )}
          </div>
          {inDuel && session && fish && (
            <CombatVitals
              copy={copy}
              locale={locale}
              session={session}
            />
          )}
          {inDuel && session && (
            <div className="turn-counter liquid-pane liquid-pane--hud" aria-label={`${copy.turn} ${displayedTurn}, ${copy.actionPoints} ${displayedAp} / ${session.maxAp}`}>
              <div className="turn-counter__turn">
                <span>{copy.turn}</span>
                <strong>{numberText(displayedTurn, locale)}</strong>
              </div>
              <div className="turn-counter__ap">
                <div className="ap-crystals" aria-label={`${copy.actionPoints} ${displayedAp}/${session.maxAp}`} aria-hidden="true">
                  {Array.from({ length: session.maxAp }, (_, i) => (
                    <span key={i} className={`ap-crystal${i < displayedAp ? ' is-active' : ' is-spent'}`} />
                  ))}
                </div>
                <span className="ap-count-text">
                  <strong>{numberText(displayedAp, locale)}</strong>/{numberText(session.maxAp, locale)} <span>AP</span>
                </span>
              </div>
            </div>
          )}
          <span className="scene-location liquid-pane liquid-pane--pill">{localize(selectedSpot.name, locale)}</span>
          {phase === 'ready' && (
            <div className="scene-ready-action">
              {showFirstCastGuidance && (
                <p className="scene-ready-action__hint liquid-pane liquid-pane--pill liquid-pane--warm" role="note">{copy.firstEncounter.castHint}</p>
              )}
              <button className="action-button action-button--cast liquid-pane liquid-pane--interactive liquid-pane--accent" onClick={() => markSoundGesture(cast)}>
                <img className="cast-icon" src={assetUrl('/theme_games/nav-icon-fishing.webp')} alt="" />
                {copy.cast}
              </button>
            </div>
          )}
        </div>


        {phase === 'ready' && (
          <section className="action-dock action-dock--preview liquid-pane liquid-pane--table" data-phase={phase} data-control-surface="preparation-actions" aria-label={copy.fight}>
            <div className="action-dock__header tactic-preview__heading">
              <h3>{copy.fight}</h3>
              <p>{copy.firstEncounter.turnHint}</p>
            </div>
            <TacticCards
              copy={copy}
              session={null}
              fishProfile={null}
              gearStats={gearStats}
              onAction={runAction}
            />
          </section>
        )}
        {phase !== 'ready' && <section className="action-dock liquid-pane liquid-pane--table" data-phase={phase} data-control-surface={inDuel ? 'combat-actions' : 'combat-outcome'} aria-label={copy.fight}>
          <div className="action-dock__status-row">
            <p className="session-status" role="status" aria-live="polite" aria-atomic="true">
            {copy.phase[phase]}
            </p>
          </div>
          {inDuel && session && fishProfile && (
            <>
              {showFirstTurnGuidance && (
                <p className="first-encounter-guide liquid-pane liquid-pane--warm" role="note">{copy.firstEncounter.turnHint}</p>
              )}
              <TacticCards
                copy={copy}
                session={castingPresentation ? null : intentSession}
                fishProfile={fishProfile}
                gearStats={gearStats}
                onAction={runAction}
                presentationBusy={presentationBusy}
                resolvingAction={activeEvent?.type === 'PLAYER_ACTION_RESOLVED' ? activeEvent.action : null}
              />
              {session.lastAction && (!presentationBusy || activeEvent?.type === 'CHECK_RESOLVED' || (activeEvent?.order ?? 0) >= 2) && (
                <div
                  className={`last-check liquid-pane liquid-pane--readout ${session.lastCheck ? `last-check--${session.lastCheck.outcome}` : 'last-check--no-roll'}`}
                  data-outcome={session.lastCheck?.outcome ?? 'no-roll'}
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
                      <p className="last-check__details">
                        {copy.checkRolls}: {session.lastCheck.rolls.join(' / ')}
                        {' · '}{copy.checkTotal}: {numberText(session.lastCheck.die, locale)}
                        {' '}{session.lastCheck.modifier < 0 ? '−' : '+'} {numberText(Math.abs(session.lastCheck.modifier), locale)}
                        {' = '}{numberText(session.lastCheck.total, locale)}
                        {' · '}{copy.difficulty}: {numberText(session.lastCheck.difficulty, locale)}
                      </p>
                      <p className="last-check__reason">{copy.modeReason[session.lastCheck.modeReason]}</p>
                    </>
                  ) : (
                    <p>{copy.actionHint[session.lastAction]}</p>
                  )}
                  {(activeEvent?.type === 'FISH_ACTION_RESOLVED' || activeEvent?.type === 'LINE_DAMAGED') && displayedIntent && (
                    <p>{copy.fishResponse}: {copy.intentHint[displayedIntent]}</p>
                  )}
                </div>
              )}
            </>
          )}
          {!presentationBusy && (phase === 'escaped' || phase === 'line-break') && (
            <div className="outcome-line">
              <p>{phase === 'escaped' ? copy.fishEscaped : copy.lineBroken}</p>
              <button className="action-button action-button--cast liquid-pane liquid-pane--interactive liquid-pane--accent" onClick={restartSession}>{copy.tryAgain}</button>
            </div>
          )}
          {!presentationBusy && phase === 'caught' && result && fish && (() => {
            const isNewBest = !firstCatch && (result.weightKg > catchBestWeight || result.lengthCm > catchBestLength);
            return (
              <section
                className={`catch-reveal catch-reveal--${fish.rarity} liquid-pane liquid-pane--reveal`}
                data-rarity={fish.rarity}
                aria-labelledby="catch-title"
              >
                <div className="catch-reveal__hero">
                  <div className="catch-reveal__artwork-halo" aria-hidden="true" />
                  <FishArtworkImage fish={fish} locale={locale} className="catch-reveal__artwork" loading="eager" />
                  <div className="catch-reveal__headline liquid-pane liquid-pane--readout">
                    <div className="catch-reveal__eyebrow">
                      <span className="catch-reveal__success-badge">{copy.caught}</span>
                      {firstCatch && <span className="catch-reveal__badge catch-reveal__badge--first">{copy.firstCatch}</span>}
                      {isNewBest && <span className="catch-reveal__badge catch-reveal__badge--record">{locale === 'th' ? 'สถิติใหม่!' : 'New Record!'}</span>}
                    </div>
                    <h3 id="catch-title">{localize(fish.name, locale)}</h3>
                    <p className="catch-reveal__rarity">{copy.rarity[fish.rarity]}</p>
                    <p className="catch-reveal__discovery"><span>{copy.discovery}</span> {localize(fish.collection.entry, locale)}</p>
                  </div>
                </div>

                <div className="catch-reveal__details">
                  <dl className="catch-reveal__measurements">
                    <div><dt>{copy.length}</dt><dd>{numberText(result.lengthCm, locale)} <span>cm</span></dd></div>
                    <div><dt>{copy.weight}</dt><dd>{weightText(result.weightKg, locale)} <span>kg</span></dd></div>
                  </dl>
                  <div className="catch-reveal__record">
                    <span>{copy.record}</span>
                    <strong>{weightText(Math.max(catchBestWeight, result.weightKg), locale)} kg · {numberText(Math.max(catchBestLength, result.lengthCm), locale)} cm</strong>
                  </div>
                </div>

                <div className="catch-reveal__progress" aria-label={`${copy.reward}, ${copy.collectionProgress}`}>
                  <div>
                    <span>{copy.reward}</span>
                    <strong>+{numberText(fish.rewards.reputation, locale)} {copy.earnedReputation}</strong>
                  </div>
                  <div>
                    <span>{copy.knowledgeProgress}</span>
                    <strong>{numberText(catchKnowledgeLevel, locale)} / 3</strong>
                  </div>
                  <div>
                    <span>{copy.collectionProgress}</span>
                    <strong>{numberText(discoveredFishCount, locale)} / {numberText(FISH.length, locale)}</strong>
                  </div>
                </div>

                <div className="catch-reveal__actions">
                  <button className="action-button action-button--sell liquid-pane liquid-pane--interactive liquid-pane--accent" onClick={() => settleCatch('sell')}>
                    {copy.sellReward}: {numberText(fish.sellValue, locale)} {copy.coins}
                  </button>
                  <button className="action-button action-button--keep liquid-pane liquid-pane--interactive" onClick={() => settleCatch('keep')}>
                    {copy.keep}
                  </button>
                </div>
              </section>
            );
          })()}
        </section>}
      </section>

      <aside className="preparation-rail" aria-label={copy.setup}>
        <section className="setup-card liquid-pane liquid-pane--setup">
          <header className="setup-card__heading">
            <div>
              <h2>{copy.setup}</h2>
              <p>{copy.setupHint}</p>
            </div>
            <button className="text-action" onClick={() => setTab('gear')}>{copy.gear}</button>
          </header>
          <div className="build-profile" data-profile={buildIsPowerLed ? 'power' : 'control'}>
            <div className="build-profile__heading">
              <span>{copy.buildProfile}</span>
              <strong>{buildProfile}</strong>
            </div>
            <div className="build-profile__axes" aria-label={`${copy.stat.power}, ${copy.stat.control}`}>
              <span><b>{copy.stat.power}</b> {numberText(gearStats.power, locale, 1)}</span>
              <span><b>{copy.stat.control}</b> {numberText(gearStats.control, locale, 1)}</span>
            </div>
            <div className="build-profile__notes">
              <p>
                <span>{copy.buildStrength}</span> {copy.stat[buildIsPowerLed ? 'power' : 'control']}{' '}
                {primaryBuildStat > 0 ? '+' : ''}{numberText(primaryBuildStat, locale, 1)}
                {secondaryBuildStat > 0 && ` · ${copy.stat[buildIsPowerLed ? 'control' : 'power']} +${numberText(secondaryBuildStat, locale, 1)}`}
              </p>
              <p><span>{copy.buildTradeoff}</span> {negativeEffects.length > 0
                ? negativeEffects.map(({ key, value }) => `${copy.stat[key]} ${numberText(value, locale, 1)}`).join(' · ')
                : copy.noPenalty}
              </p>
            </div>
          </div>
          <ul className="setup-gear">
            {getEquippedGearItems({ equippedGear }).map((item) => (
              <li className={`setup-gear__${item.category}`} key={item.id}>
                <img src={assetUrl(`/theme_games/gear-${item.category}.webp`)} alt="" />
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
              {discoveredBaitTargets.length > 0
                ? discoveredBaitTargets.map((target) => localize(target.name, locale)).join(' · ')
                : baitTargets.length > 0 ? copy.baitUnknownCount(baitTargets.length) : copy.unknownBaitTargets}
              {discoveredBaitTargets.length > 0 && baitTargets.length > discoveredBaitTargets.length && (
                <> · {copy.baitUnknownCount(baitTargets.length - discoveredBaitTargets.length)}</>
              )}
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
  const fishEntries = FISH.map((fish, index) => {
    const record = collection[fish.id];
    const knowledgeLevel = Math.max(record?.knowledgeLevel ?? 0, record?.caught ? 1 : 0);
    return { fish, fishNumber: index + 1, record, knowledgeLevel, discovered: knowledgeLevel > 0 };
  });
  const discoveredEntries = fishEntries.filter((entry) => entry.discovered);
  const [featuredFishId, setFeaturedFishId] = useState<string | null>(null);
  const featuredEntry = discoveredEntries.find((entry) => entry.fish.id === featuredFishId) ?? discoveredEntries[0];
  const featuredFish = featuredEntry?.fish;

  return (
    <section className="archive-panel collection-panel" aria-labelledby="collection-title">
      <header className="collection-hero liquid-pane">
        <div className="collection-hero__heading">
          <h2 id="collection-title">{copy.collectionTitle}</h2>
          <p>{copy.collectionDescription}</p>
        </div>
        <div className="collection-progress liquid-pane liquid-pane--readout" aria-label={`${copy.collectionProgress}: ${unique} / ${FISH.length}`}>
          <div className="collection-progress__label">
            <span>{copy.collectionProgress}</span>
            <strong>{numberText(unique, locale)} <small>/ {numberText(FISH.length, locale)}</small></strong>
          </div>
          <progress max={FISH.length} value={unique} aria-label={copy.collectionProgress} />
          <span className="collection-progress__note">{copy.discovered} · {numberText(unique, locale)} / {numberText(FISH.length, locale)}</span>
        </div>
      </header>
      {featuredEntry && (() => {
        const { fish, record, knowledgeLevel } = featuredEntry;
        const knownSpots = fish.spotIds
          .map((spotId) => FISHING_SPOTS.find((spot) => spot.id === spotId))
          .filter((spot) => spot !== undefined);
        const usefulBaits = fish.preferredBaitIds
          .map((baitId) => GEAR.find((item) => item.id === baitId))
          .filter((bait) => bait !== undefined);

        return (
          <article className="collection-featured liquid-pane" data-rarity={fish.rarity} aria-labelledby="featured-fish-title">
            <div className="collection-featured__art-wrap">
              <FishArtworkImage fish={fish} locale={locale} className="collection-featured__artwork" loading="eager" />
              <span className="collection-featured__stamp">{copy.discovered}</span>
            </div>
            <div className="collection-featured__details">
              <div className="fish-entry__heading">
                <h3 id="featured-fish-title">{localize(fish.name, locale)}</h3>
                <span className={`rarity-label rarity-label--${fish.rarity}`}>{copy.rarity[fish.rarity]}</span>
              </div>
              <p className="collection-featured__entry">{localize(fish.collection.entry, locale)}</p>
              <dl className="knowledge-notes">
                <div>
                  <dt>{copy.knowledge}</dt>
                  <dd>{copy.knowledgeLevel} {numberText(knowledgeLevel, locale)} / 3</dd>
                </div>
                {record && record.caught > 0 && (
                  <div>
                    <dt>{copy.record}</dt>
                    <dd>{copy.catches} {numberText(record.caught, locale)} · {copy.bestCatch} {weightText(record.bestWeightKg, locale)} kg / {numberText(record.largestLengthCm, locale)} cm</dd>
                  </div>
                )}
                {knowledgeLevel >= 1 && (
                  <div>
                    <dt>{copy.habitat}</dt>
                    <dd>{knownSpots.map((spot) => localize(spot.name, locale)).join(' · ')} · {copy.activeTime}: {fish.activeTime.map((time) => copy.activeTimes[time]).join(' · ')}</dd>
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
            </div>
          </article>
        );
      })()}
      <ol className="fish-list fish-list--journal" aria-label={copy.collectionTitle}>
        {fishEntries.map(({ fish, fishNumber, discovered }) => {
          return (
            <li className={`fish-entry liquid-pane liquid-pane--interactive ${discovered ? 'fish-entry--known' : 'fish-entry--unknown'}`} key={fish.id} data-rarity={discovered ? fish.rarity : undefined}>
              {discovered ? (
                <FishArtworkImage fish={fish} locale={locale} className="fish-entry__artwork" />
              ) : (
                <div className="fish-entry__mystery" aria-hidden="true">
                  <span className="fish-entry__number">#{numberText(fishNumber, locale).padStart(2, '0')}</span>
                  <span className="fish-mark" data-silhouette={fish.collection.silhouette}>
                    <span className="fish-mark__tail" />
                    <span className="fish-mark__body" />
                  </span>
                </div>
              )}
              <div className="fish-entry__details">
                <div className="fish-entry__heading">
                  {discovered && <span className="fish-entry__number">#{numberText(fishNumber, locale).padStart(2, '0')}</span>}
                  <h3>{discovered ? localize(fish.name, locale) : '???'}</h3>
                  {!discovered && <span className="fish-entry__unknown-label">{copy.unknownSpecimen(fishNumber)}</span>}
                  {discovered && <span className={`rarity-label rarity-label--${fish.rarity}`}>{copy.rarity[fish.rarity]}</span>}
                </div>
                {discovered && (
                  <button
                    className="fish-entry__spotlight"
                    type="button"
                    aria-pressed={featuredFish?.id === fish.id}
                    aria-label={`${copy.featureFish}: ${localize(fish.name, locale)}`}
                    onClick={() => setFeaturedFishId(fish.id)}
                  >
                    {copy.featureFish}
                  </button>
                )}
                {!discovered && <p>{copy.undiscovered}</p>}
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
  const currentItem = equippedGear[category] ? GEAR.find((item) => item.id === equippedGear[category]) : undefined;

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
            className={`category-nav__item liquid-pane liquid-pane--interactive liquid-pane--pill${category === gearCategory ? ' is-current' : ''}`}
            key={gearCategory}
            onClick={() => setCategory(gearCategory)}
          >
            {copy.category[gearCategory]}
          </button>
        ))}
      </nav>
      {currentItem && (
        <section className="gear-featured liquid-pane" aria-labelledby="equipped-gear-title">
          <div className="gear-featured__mark"><img className="gear-art-icon" src={assetUrl(`/theme_games/gear-${currentItem.category}.webp`)} alt="" /></div>
          <div className="gear-featured__details">
            <p className="gear-section-label">{copy.equippedNow}</p>
            <div className="gear-entry__heading">
              <h3 id="equipped-gear-title">{localize(currentItem.name, locale)}</h3>
              <span className="gear-tier">{copy.rarity[currentItem.rarity]}</span>
            </div>
            <p>{localize(currentItem.description, locale)}</p>
            <ul className="gear-effects gear-featured__effects" aria-label={copy.stats}>
              {EFFECT_ORDER.flatMap((key) => {
                const effect = currentItem.effects[key];
                if (effect === undefined || effect === 0) return [];
                return [<li key={key}>{copy.stat[key]} <strong>{effect > 0 ? '+' : ''}{numberText(effect, locale)}</strong></li>];
              })}
            </ul>
          </div>
          <span className="equipped-label">{copy.equipped}</span>
        </section>
      )}
      <div className="gear-alternatives-heading">
        <span>{copy.availableAlternatives}</span>
      </div>
      <ul className="gear-list gear-list--alternatives">
        {categoryGear.filter((item) => item.id !== currentItem?.id).map((item) => {
          const owned = ownedGearIds.includes(item.id);
          const isEquipped = equippedGear[item.category] === item.id;
          const locked = item.unlockAfter !== undefined && !seenStoryEvents.includes(item.unlockAfter);
          return (
            <li className="gear-entry liquid-pane liquid-pane--interactive" key={item.id}>
              <img className="gear-art-icon" src={assetUrl(`/theme_games/gear-${item.category}.webp`)} alt="" />
              <div className="gear-entry__details">
                <div className="gear-entry__heading">
                  <h3>{localize(item.name, locale)}</h3>
                  <span className="gear-tier">{copy.rarity[item.rarity]}</span>
                </div>
                <p className="gear-comparison">
                  <span>{copy.compare}</span>
                  {EFFECT_ORDER.flatMap((key) => {
                    const delta = (item.effects[key] ?? 0) - (currentItem?.effects[key] ?? 0);
                    return delta === 0 ? [] : [`${copy.stat[key]} ${delta > 0 ? '+' : ''}${numberText(delta, locale)}`];
                  }).join(' · ') || '—'}
                </p>
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
      <section className="story-goals liquid-pane liquid-pane--readout" aria-label={copy.chapterOne}>
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
        <section className="scout-invitation liquid-pane liquid-pane--warm" aria-labelledby="scout-title">
          <h3 id="scout-title">{copy.chapterComplete}</h3>
          <p>{copy.chapterCompleteBody}</p>
        </section>
      )}
      <ol className="story-list">
        {visibleEvents.map((event) => (
          <li className="story-entry" key={event.id}>
            <div className="story-entry__marker" aria-hidden="true" />
            <article className="liquid-pane">
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
