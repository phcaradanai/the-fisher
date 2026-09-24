import { useEffect, useRef } from 'react';
import { useGameStore } from '../game/state/game-store';
import type { GameTab } from '../game/state/game-store';
import { playFishingCue } from './audio';
import { UI_COPY } from './copy';
import type { Locale } from './copy';
import { PANEL_BY_TAB } from './Panels';
import './styles.css';

const TABS: GameTab[] = ['fishing', 'collection', 'gear', 'story'];
const LOCALES: Locale[] = ['th', 'en'];

export function App() {
  const locale = useGameStore((state) => state.locale);
  const activeTab = useGameStore((state) => state.activeTab);
  const coins = useGameStore((state) => state.coins);
  const reputation = useGameStore((state) => state.reputation);
  const saveStatus = useGameStore((state) => state.saveStatus);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const reducedMotion = useGameStore((state) => state.reducedMotion);
  const notice = useGameStore((state) => state.notice);
  const sessionEvent = useGameStore((state) => state.session?.lastEvent ?? null);
  const sessionEventSequence = useGameStore((state) => state.session?.eventSequence ?? 0);
  const setTab = useGameStore((state) => state.setTab);
  const setLocale = useGameStore((state) => state.setLocale);
  const setSoundEnabled = useGameStore((state) => state.setSoundEnabled);
  const setReducedMotion = useGameStore((state) => state.setReducedMotion);
  const dismissNotice = useGameStore((state) => state.dismissNotice);
  const previousEventSequence = useRef(0);
  const copy = UI_COPY[locale];
  const resourceFormatter = new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US');
  const ActivePanel = PANEL_BY_TAB[activeTab];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (sessionEvent && sessionEventSequence !== previousEventSequence.current) {
      playFishingCue(sessionEvent, soundEnabled);
    }
    previousEventSequence.current = sessionEventSequence;
  }, [sessionEvent, sessionEventSequence, soundEnabled]);


  return (
    <div className="game-shell" data-reduced-motion={reducedMotion}>
      <header className="masthead">
        <div className="masthead__brand">
          <span className="brand-float" aria-hidden="true"><span /></span>
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.chapter} 1 <span aria-hidden="true">·</span> {copy.chapterOne}</p>
          </div>
        </div>
        <div className="masthead__resources" aria-label={`${copy.coins}, ${copy.reputation}`}>
          <span><strong>{resourceFormatter.format(coins)}</strong> {copy.coins}</span>
          <span><strong>{resourceFormatter.format(reputation)}</strong> {copy.reputation}</span>
        </div>
        <div className="preferences">
          <fieldset className="language-switch">
            <legend className="visually-hidden">{copy.language}</legend>
            {LOCALES.map((option) => (
              <button
                aria-pressed={locale === option}
                className={locale === option ? 'language-switch__item is-current' : 'language-switch__item'}
                key={option}
                onClick={() => setLocale(option)}
              >
                {option === 'th' ? 'ไทย' : 'EN'}
              </button>
            ))}
          </fieldset>
          <label className="setting-switch">
            <input checked={soundEnabled} onChange={(event) => setSoundEnabled(event.currentTarget.checked)} type="checkbox" />
            <span>{soundEnabled ? copy.soundOn : copy.soundOff}</span>
          </label>
          <label className="setting-switch">
            <input checked={reducedMotion} onChange={(event) => setReducedMotion(event.currentTarget.checked)} type="checkbox" />
            <span>{copy.reducedMotion}</span>
          </label>
        </div>
      </header>

      <nav className="section-nav" aria-label={copy.navigation}>
        {TABS.map((tab) => (
          <button
            aria-current={activeTab === tab ? 'page' : undefined}
            className={activeTab === tab ? 'section-nav__item is-current' : 'section-nav__item'}
            key={tab}
            onClick={() => setTab(tab)}
          >
            <span className={`nav-signal nav-signal--${tab}`} aria-hidden="true" />
            {copy[tab]}
          </button>
        ))}
      </nav>

      {notice && (
        <div className="notice-line" role="status" aria-live="polite">
          <p>{copy.notice[notice]}</p>
          <button onClick={dismissNotice}>{copy.dismiss}</button>
        </div>
      )}

      <main className={`game-main game-main--${activeTab}`}>
        <ActivePanel copy={copy} locale={locale} />
      </main>

      <footer className="game-footer">
        <p>{saveStatus === 'saved' ? copy.saveReady : copy.saveUnavailable}</p>
        <span className="save-indicator" aria-hidden="true" />
      </footer>
    </div>
  );
}
