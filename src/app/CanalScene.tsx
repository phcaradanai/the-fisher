import { useCallback, useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Rarity } from '../content/types';
import type { TurnCombatEvent, TurnCombatPhase, TurnFishingAction, FishIntentType } from '../game/core/fishing/turn-types';
import { assetUrl } from './asset';
import {
  ASSET_PATHS,
  getArtworkProfile,
  LANTERN_SPOTS,
  MOON_CENTER,
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

function coverSprite(sprite: Sprite, texture: Texture, overscan = 1.025): number {
  if (texture.width === 0 || texture.height === 0) return 1;
  const scale = Math.max(SCENE_WIDTH / texture.width, SCENE_HEIGHT / texture.height) * overscan;
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

    // Load all production living canal v2 textures concurrently
    Promise.all([
      Assets.load<Texture>(assetUrl(ASSET_PATHS.backplate)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.foregroundLeft)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.foregroundRight)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.waterSource)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.waterMask)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.reflectionSource)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.displacementWater)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.lanternGlow)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.mistFar)),
      Assets.load<Texture>(assetUrl(ASSET_PATHS.mistNear)),
    ])
      .then(([
        backplateTex,
        fgLeftTex,
        fgRightTex,
        waterSourceTex,
        waterMaskTex,
        reflSourceTex,
        dispTex,
        glowTex,
        mistFarTex,
        mistNearTex,
      ]) => {
        if (request !== backgroundRequestRef.current || backgroundSpriteRef.current !== bgSprite) return;

        // 1. Clean Base Plate (inpainted behind foreground dock and post)
        bgSprite.texture = backplateTex;
        coverSprite(bgSprite, backplateTex, 1.025);
        bgSprite.visible = true;

        // 2. Foreground Left Cutout (dock, lantern, moss, water lily)
        const fgLeft = foregroundLeftSpriteRef.current;
        if (fgLeft) {
          fgLeft.texture = fgLeftTex;
          coverSprite(fgLeft, fgLeftTex, 1.025);
          fgLeft.visible = true;
        }

        // 3. Foreground Right Cutout (scratched wooden post, ropes, tall reeds)
        const fgRight = foregroundRightSpriteRef.current;
        if (fgRight) {
          fgRight.texture = fgRightTex;
          coverSprite(fgRight, fgRightTex, 1.025);
          fgRight.visible = true;
        }

        // 4. True Living Cinemagraph Water Surface
        waterSurfaceRef.current?.setTextures({
          waterSource: waterSourceTex,
          waterMask: waterMaskTex,
          reflectionSource: reflSourceTex,
          displacementMap: dispTex,
        });

        // 5. Tiered Atmosphere (Glow, Organic Mist)
        atmosphereLayerRef.current?.setTextures({
          lanternGlow: glowTex,
          mistFar: mistFarTex,
          mistNear: mistNearTex,
        });
      })
      .catch(() => {
        if (request === backgroundRequestRef.current && backgroundSpriteRef.current === bgSprite) {
          bgSprite.texture = Texture.EMPTY;
        }
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

    void Assets.load<Texture>(assetUrl(path))
      .then((texture) => {
        if (request !== artworkRequestRef.current || encounterLayerRef.current?.sceneArtwork !== sprite) return;
        sprite.texture = texture;
        const profile = getArtworkProfile(sceneState.current.fishId, sceneState.current.fishRarity);
        artworkProfileRef.current = profile;
        sprite.anchor.set(profile.anchorX, profile.anchorY);
        artworkScaleRef.current = coverSprite(sprite, texture, 1.0) * profile.scale;
      })
      .catch(() => {
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
  }, [
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
  ]);

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

    // Detect mobile touch device
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 768);

    // Pointer move listener for interactive 2.5D parallax (desktop only)
    const handlePointerMove = (e: PointerEvent) => {
      if (isTouch) return;
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

        const globalWin = window as unknown as {
          __PIXI_APP__?: Application;
          __CAPTURE_FRAME__?: (width?: number, height?: number) => Promise<string | null>;
        };
        globalWin.__PIXI_APP__ = app;
        globalWin.__CAPTURE_FRAME__ = async () => {
          try {
            if (!app.renderer?.extract?.base64) return null;
            return await app.renderer.extract.base64(app.stage);
          } catch {
            return null;
          }
        };

        while (host.firstChild) {
          host.removeChild(host.firstChild);
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
        // Far Background: Clean backplate, Moon, Distant Mountains, Far Atmosphere (depth = 0.04)
        const farBgContainer = new Container();
        const backgroundSprite = new Sprite(Texture.EMPTY);
        backgroundSprite.anchor.set(0.5);
        backgroundSprite.visible = false;
        backgroundSpriteRef.current = backgroundSprite;
        farBgContainer.addChild(backgroundSprite, atmosphereLayer.farAtmosphere);

        // Water Surface: Real painted water cinemagraph with DisplacementFilter (depth = 0.35)
        const waterContainer = new Container();
        waterContainer.addChild(waterSurface.container);

        // Encounter: Fish submerged in canal water, line tension, wakes, splashes (depth = 0.55)
        const encounterContainer = new Container();
        encounterContainer.addChild(encounterLayer.container);

        // Mid Atmosphere: Midground floating mist and fireflies (depth = 0.45)
        const midAtmosphereContainer = new Container();
        midAtmosphereContainer.addChild(atmosphereLayer.midAtmosphere);

        // Foreground: Dock & lantern (left), scratched post & reeds (right), near optical glow (depth = 1.00)
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
          atmosphereLayer.nearAtmosphere,
          encounterLayer.eventFlash,
        );

        // Debug Overlay Container (?sceneDebug=1)
        const debugContainer = new Container();
        const isDebug = typeof window !== 'undefined' && window.location.search.includes('sceneDebug=1');
        if (isDebug) {
          const dg = new Graphics();
          // Lantern calibration crosshairs
          for (let i = 0; i < LANTERN_SPOTS.length; i += 1) {
            const spot = LANTERN_SPOTS[i]!;
            dg.circle(spot.x, spot.y, spot.radius).stroke({ color: 0xff3333, width: 1.5 });
            dg.circle(spot.x, spot.y, 3).fill({ color: 0xffff00 });
          }
          // Moon center calibration
          dg.circle(MOON_CENTER.x, MOON_CENTER.y, 22).stroke({ color: 0x33ffff, width: 1.5 });
          dg.circle(MOON_CENTER.x, MOON_CENTER.y, 4).fill({ color: 0x33ffff });
          debugContainer.addChild(dg);
        }

        world.addChild(
          fallbackWorld,
          farBgContainer,
          waterSurface.displacementContainer,
          waterContainer,
          encounterContainer,
          midAtmosphereContainer,
          foregroundContainer,
          debugContainer,
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

          // Gameplay feedback pulse on turn combat events
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

          // 1. Update 2.5D Virtual Camera Parallax (Calibrated low amplitude)
          parallaxRig.update(deltaSec, elapsed, state.reducedMotion, isTouch);
          parallaxRig.applyTo(farBgContainer, 0.04);
          parallaxRig.applyTo(waterContainer, 0.35);
          parallaxRig.applyTo(encounterContainer, 0.55);
          parallaxRig.applyTo(midAtmosphereContainer, 0.45);
          parallaxRig.applyTo(foregroundContainer, 1.00);

          // 2. Update Living Cinemagraph Water (DisplacementFilter + masked painted water)
          waterSurface.update(deltaSec, elapsed, isKing, state.bossPhase, state.reducedMotion);

          // 3. Update Dynamic Tiered Atmosphere (Organic Mist, Breathing Lanterns, Moon Halo, Tiered Fireflies)
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
      const globalWin = window as unknown as {
        __PIXI_APP__?: Application;
        __CAPTURE_FRAME__?: unknown;
      };
      if (globalWin.__PIXI_APP__ === app) {
        delete globalWin.__PIXI_APP__;
        delete globalWin.__CAPTURE_FRAME__;
      }
      if (initialized) app.destroy(true, { children: true });
      encounterLayer.destroy();
      encounterLayerRef.current = null;
      waterSurface.destroy();
      waterSurfaceRef.current = null;
      atmosphereLayer.destroy();
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
