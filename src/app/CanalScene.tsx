import { useCallback, useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Rarity } from '../content/types';
import type { TurnCombatEvent, TurnCombatPhase, TurnFishingAction, FishIntentType } from '../game/core/fishing/turn-types';
import { assetUrl } from './asset';
import {
  ASSET_PATHS,
  getArtworkProfile,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  type ArtworkProfile,
  type SceneRenderState,
} from './scene/scene-types';
import { ParallaxRig } from './scene/ParallaxRig';
import { WaterSurface } from './scene/WaterSurface';
import { AtmosphereLayer } from './scene/AtmosphereLayer';
import { EncounterLayer } from './scene/EncounterLayer';

type CanalSceneProps = {
  artwork: string | null;
  fishId: string | null;
  description: string;
  errorMessage: string;
  event: TurnCombatEvent | null;
  eventSequence: number;
  fishAction: TurnFishingAction | null;
  fishDistance: number;
  fishTension: number;
  fishIntent: FishIntentType | null;
  fishRarity: Rarity | null;
  phase: TurnCombatPhase;
  bossPhase: 1 | 2 | 3 | null;
  reducedMotion: boolean;
  spotName: string;
  showEncounter: boolean;
};

function coverSprite(sprite: Sprite, texture: Texture): number {
  const scale = Math.max(SCENE_WIDTH / texture.width, SCENE_HEIGHT / texture.height);
  sprite.scale.set(scale);
  sprite.position.set(SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
  return scale;
}

export function CanalScene({
  artwork,
  fishId,
  description,
  errorMessage,
  event,
  eventSequence,
  fishAction,
  fishDistance,
  fishTension,
  fishIntent,
  fishRarity,
  phase,
  bossPhase,
  reducedMotion,
  spotName,
  showEncounter,
}: CanalSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const backgroundSpriteRef = useRef<Sprite | null>(null);
  const foregroundLeftSpriteRef = useRef<Sprite | null>(null);
  const foregroundRightSpriteRef = useRef<Sprite | null>(null);
  const encounterLayerRef = useRef<EncounterLayer | null>(null);
  const waterSurfaceRef = useRef<WaterSurface | null>(null);
  const atmosphereLayerRef = useRef<AtmosphereLayer | null>(null);
  const parallaxRigRef = useRef<ParallaxRig>(new ParallaxRig());

  const backgroundRequestRef = useRef(0);
  const artworkRequestRef = useRef(0);
  const artworkScaleRef = useRef(1);
  const artworkProfileRef = useRef<ArtworkProfile>(getArtworkProfile(fishId, fishRarity));

  const sceneState = useRef<SceneRenderState>({
    artwork,
    fishId,
    event,
    eventSequence,
    fishAction,
    fishDistance,
    fishTension,
    fishIntent,
    fishRarity,
    phase,
    bossPhase,
    reducedMotion,
    showEncounter,
  });

  const [sceneError, setSceneError] = useState(false);

  const loadBackgroundAndLayers = useCallback(() => {
    const bgSprite = backgroundSpriteRef.current;
    if (!bgSprite) return;

    const request = ++backgroundRequestRef.current;
    bgSprite.visible = false;
    bgSprite.texture = Texture.EMPTY;

    // Load base background
    void Assets.load<Texture>(assetUrl(ASSET_PATHS.background)).then((texture) => {
      if (request !== backgroundRequestRef.current || backgroundSpriteRef.current !== bgSprite) return;
      bgSprite.texture = texture;
      coverSprite(bgSprite, texture);
      bgSprite.visible = true;
    }).catch(() => {
      if (request === backgroundRequestRef.current && backgroundSpriteRef.current === bgSprite) {
        bgSprite.texture = Texture.EMPTY;
      }
    });

    // Load foreground left cutout
    void Assets.load<Texture>(assetUrl(ASSET_PATHS.foregroundLeft)).then((texture) => {
      const fgLeft = foregroundLeftSpriteRef.current;
      if (!fgLeft) return;
      fgLeft.texture = texture;
      coverSprite(fgLeft, texture);
      fgLeft.visible = true;
    }).catch(() => {
      if (foregroundLeftSpriteRef.current) foregroundLeftSpriteRef.current.visible = false;
    });

    // Load foreground right cutout
    void Assets.load<Texture>(assetUrl(ASSET_PATHS.foregroundRight)).then((texture) => {
      const fgRight = foregroundRightSpriteRef.current;
      if (!fgRight) return;
      fgRight.texture = texture;
      coverSprite(fgRight, texture);
      fgRight.visible = true;
    }).catch(() => {
      if (foregroundRightSpriteRef.current) foregroundRightSpriteRef.current.visible = false;
    });

    // Load near mist
    void Assets.load<Texture>(assetUrl(ASSET_PATHS.mistNear)).then((texture) => {
      atmosphereLayerRef.current?.setNearMistTexture(texture);
    }).catch(() => {
      // Fallback procedural mist handles it
    });
  }, []);

  const loadArtwork = useCallback((path: string | null) => {
    const encounter = encounterLayerRef.current;
    if (!encounter) return;
    const sprite = encounter.sceneArtwork;

    const request = ++artworkRequestRef.current;
    sprite.visible = false;
    sprite.texture = Texture.EMPTY;
    if (!path) return;

    void Assets.load<Texture>(assetUrl(path)).then((texture) => {
      if (request !== artworkRequestRef.current || encounterLayerRef.current?.sceneArtwork !== sprite) return;
      sprite.texture = texture;
      const profile = getArtworkProfile(sceneState.current.fishId, sceneState.current.fishRarity);
      artworkProfileRef.current = profile;
      sprite.anchor.set(profile.anchorX, profile.anchorY);
      artworkScaleRef.current = coverSprite(sprite, texture) * profile.scale;
    }).catch(() => {
      if (request === artworkRequestRef.current && encounterLayerRef.current?.sceneArtwork === sprite) {
        sprite.texture = Texture.EMPTY;
      }
    });
  }, []);

  useEffect(() => {
    sceneState.current = {
      artwork,
      fishId,
      event,
      eventSequence,
      fishAction,
      fishDistance,
      fishTension,
      fishIntent,
      fishRarity,
      phase,
      bossPhase,
      reducedMotion,
      showEncounter,
    };
  }, [artwork, fishId, event, eventSequence, fishAction, fishDistance, fishTension, fishIntent, fishRarity, phase, bossPhase, reducedMotion, showEncounter]);

  useEffect(() => {
    loadArtwork(artwork);
  }, [artwork, fishId, loadArtwork]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    let disposed = false;
    let initialized = false;
    let elapsed = 0;
    let feedbackPulse = 0;
    let lastEventSequence = sceneState.current.eventSequence;
    let castStartTime = 0;
    let resizeObserver: ResizeObserver | undefined;

    const parallaxRig = parallaxRigRef.current;
    const waterSurface = new WaterSurface();
    waterSurfaceRef.current = waterSurface;

    const atmosphereLayer = new AtmosphereLayer();
    atmosphereLayerRef.current = atmosphereLayer;

    const encounterLayer = new EncounterLayer();
    encounterLayerRef.current = encounterLayer;

    // Pointer move listener for 2.5D interactive parallax
    const handlePointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      parallaxRig.setPointer(normX, normY);
    };

    const handlePointerLeave = () => {
      parallaxRig.resetPointer();
    };

    host.addEventListener('pointermove', handlePointerMove, { passive: true });
    host.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    const start = async () => {
      try {
        await app.init({
          antialias: true,
          autoDensity: true,
          backgroundColor: 0x020a10,
          preference: 'webgl',
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          resizeTo: host,
        });
        initialized = true;

        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }

        host.appendChild(app.canvas);
        app.canvas.setAttribute('aria-hidden', 'true');
        app.canvas.setAttribute('role', 'presentation');
        app.canvas.className = 'canal-scene__canvas';

        // Root scene container
        const world = new Container();

        // 1. Fallback Vector World (resilience fallback before images load)
        const fallbackWorld = new Container();
        const fallbackSky = new Graphics().rect(0, 0, SCENE_WIDTH, 252).fill({ color: 0x182e3c });
        const fallbackBank = new Graphics()
          .rect(0, 236, SCENE_WIDTH, 54)
          .fill({ color: 0x455d4d })
          .rect(0, 281, SCENE_WIDTH, 18)
          .fill({ color: 0xb18a50 });
        const fallbackWater = new Graphics()
          .rect(0, 290, SCENE_WIDTH, SCENE_HEIGHT - 290)
          .fill({ color: 0x15565a });
        fallbackWorld.addChild(fallbackSky, fallbackBank, fallbackWater);

        // 2. Spatial Depth Layers
        // Far Background: Sky, Moon, Distant Mountains (depth = 0.04)
        const farBgContainer = new Container();
        const backgroundSprite = new Sprite(Texture.EMPTY);
        backgroundSprite.anchor.set(0.5);
        backgroundSprite.visible = false;
        backgroundSpriteRef.current = backgroundSprite;
        farBgContainer.addChild(backgroundSprite, atmosphereLayer.farContainer);

        // Water Surface: Cinemagraph living water (depth = 0.36)
        const waterContainer = new Container();
        waterContainer.addChild(waterSurface.container);

        // Encounter: Fish, line, wakes, splashes (depth = 0.55)
        const encounterContainer = new Container();
        encounterContainer.addChild(encounterLayer.container);

        // Foreground: Cutout dock (left), wooden post & reeds (right) (depth = 1.00)
        const foregroundContainer = new Container();
        const foregroundLeftSprite = new Sprite(Texture.EMPTY);
        foregroundLeftSprite.anchor.set(0.5);
        foregroundLeftSprite.visible = false;
        foregroundLeftSpriteRef.current = foregroundLeftSprite;

        const foregroundRightSprite = new Sprite(Texture.EMPTY);
        foregroundRightSprite.anchor.set(0.5);
        foregroundRightSprite.visible = false;
        foregroundRightSpriteRef.current = foregroundRightSprite;

        foregroundContainer.addChild(
          foregroundLeftSprite,
          foregroundRightSprite,
          atmosphereLayer.foregroundContainer,
        );

        // Atmosphere: Near floating mist, 3-tier fireflies (depth = 1.15)
        const atmosphereContainer = new Container();
        atmosphereContainer.addChild(
          atmosphereLayer.midContainer,
          encounterLayer.eventFlash,
        );

        world.addChild(
          fallbackWorld,
          farBgContainer,
          waterContainer,
          encounterContainer,
          foregroundContainer,
          atmosphereContainer,
        );
        app.stage.addChild(world);

        loadBackgroundAndLayers();
        loadArtwork(sceneState.current.artwork);

        const resizeScene = () => {
          const scale = Math.max(app.screen.width / SCENE_WIDTH, app.screen.height / SCENE_HEIGHT);
          world.scale.set(scale);
          world.position.set(
            (app.screen.width - SCENE_WIDTH * scale) / 2,
            (app.screen.height - SCENE_HEIGHT * scale) / 2,
          );
        };
        resizeObserver = new ResizeObserver(resizeScene);
        resizeObserver.observe(host);
        resizeScene();

        app.ticker.add((ticker) => {
          const state = sceneState.current;
          const motion = state.reducedMotion ? 0 : 1;
          const deltaSec = ticker.deltaMS * 0.001;
          elapsed += deltaSec * (motion ? 1 : 0.15);

          // Feedback pulse on game turn actions
          if (state.eventSequence > 0 && state.eventSequence !== lastEventSequence) {
            lastEventSequence = state.eventSequence;
            feedbackPulse = motion ? 1 : 0;
            if (state.event === 'cast') {
              castStartTime = elapsed;
              waterSurface.triggerDisturbance('cast', 780, 480);
            } else if (state.event === 'caught') {
              waterSurface.triggerDisturbance('catch', 780, 480);
            } else if (state.fishAction === 'pull') {
              waterSurface.triggerDisturbance('pull', 780, 480);
            } else if (state.fishAction === 'reel') {
              waterSurface.triggerDisturbance('reel', 520, 560);
            } else if (state.fishAction === 'release') {
              waterSurface.triggerDisturbance('release', 780, 480);
            } else if (state.fishAction === 'brace') {
              waterSurface.triggerDisturbance('brace', 780, 480);
            } else if (state.fishIntent === 'thrash' || state.fishIntent === 'power-dash') {
              waterSurface.triggerDisturbance('thrash', 780, 480);
            }
          }
          if (motion) feedbackPulse = Math.max(0, feedbackPulse - ticker.deltaMS / 320);

          const isKing = state.fishRarity === 'king' || state.bossPhase !== null;
          const bgReady = backgroundSprite.texture !== Texture.EMPTY;
          fallbackWorld.visible = !bgReady;
          backgroundSprite.visible = bgReady;

          const isObserving = state.event === 'action-observe' || state.fishAction === 'observe';

          // 1. Update 2.5D Virtual Camera Parallax
          parallaxRig.update(deltaSec, elapsed, state.reducedMotion);
          parallaxRig.applyTo(farBgContainer, 0.04);
          parallaxRig.applyTo(waterContainer, 0.36);
          parallaxRig.applyTo(encounterContainer, 0.55);
          parallaxRig.applyTo(foregroundContainer, 1.00);
          parallaxRig.applyTo(atmosphereContainer, 1.15);

          // 2. Update Living Cinemagraph Water
          waterSurface.update(deltaSec, elapsed, isKing, state.bossPhase, state.reducedMotion);

          // 3. Update Dynamic Atmosphere (Mist, Breathing Lanterns, Moon Halo, Reeds, Fireflies)
          atmosphereLayer.update(deltaSec, elapsed, state.reducedMotion, isObserving);

          // 4. Update Encounter (Fish, Underwater Grading, Line, Trajectory, Splash)
          encounterLayer.update(
            state,
            artworkProfileRef.current,
            artworkScaleRef.current,
            elapsed,
            deltaSec,
            feedbackPulse,
            castStartTime,
          );
        });
      } catch {
        if (!disposed) setSceneError(true);
      }
    };

    void start();

    return () => {
      disposed = true;
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      backgroundRequestRef.current += 1;
      artworkRequestRef.current += 1;
      backgroundSpriteRef.current = null;
      foregroundLeftSpriteRef.current = null;
      foregroundRightSpriteRef.current = null;
      resizeObserver?.disconnect();
      if (initialized) app.destroy(true, { children: true });
      encounterLayer.destroy();
      encounterLayerRef.current = null;
      waterSurfaceRef.current = null;
      atmosphereLayerRef.current = null;
    };
  }, [loadArtwork, loadBackgroundAndLayers]);

  return (
    <figure
      className="canal-scene"
      aria-label={`${spotName}. ${description}`}
      data-encounter-size={getArtworkProfile(fishId, fishRarity).encounterSize}
    >
      <div className="canal-scene__canvas-host" ref={hostRef} aria-hidden="true" />
      {sceneError && <p className="canal-scene__error" role="status">{errorMessage}</p>}
    </figure>
  );
}
