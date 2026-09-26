import { useCallback, useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Rarity } from '../content/types';
import type { TurnCombatEvent, TurnCombatPhase, TurnFishingAction, FishIntentType } from '../game/core/fishing/turn-types';

type CanalSceneProps = {
  artwork: string | null;
  description: string;
  errorMessage: string;
  event: TurnCombatEvent | null;
  eventSequence: number;
  fishAction: TurnFishingAction | null;
  fishDistance: number;
  fishIntent: FishIntentType | null;
  fishRarity: Rarity | null;
  phase: TurnCombatPhase;
  bossPhase: 1 | 2 | 3 | null;
  reducedMotion: boolean;
  spotName: string;
};

const SCENE_WIDTH = 1200;
const SCENE_HEIGHT = 800;
const VILLAGE_CANAL_BACKGROUND = '/images/background_art_a/คลองหมอกจันทร์กับเงาอสูรใต้น้ำ.png';

function coverSprite(sprite: Sprite, texture: Texture): number {
  const scale = Math.max(SCENE_WIDTH / texture.width, SCENE_HEIGHT / texture.height);
  sprite.scale.set(scale);
  sprite.position.set(SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
  return scale;
}

export function CanalScene({
  artwork,
  description,
  errorMessage,
  event,
  eventSequence,
  fishAction,
  fishDistance,
  fishIntent,
  fishRarity,
  phase,
  bossPhase,
  reducedMotion,
  spotName,
}: CanalSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const backgroundSpriteRef = useRef<Sprite | null>(null);
  const artworkSpriteRef = useRef<Sprite | null>(null);
  const backgroundRequestRef = useRef(0);
  const artworkRequestRef = useRef(0);
  const artworkScaleRef = useRef(1);
  const sceneState = useRef({
    artwork,
    event,
    eventSequence,
    fishAction,
    fishDistance,
    fishIntent,
    fishRarity,
    phase,
    bossPhase,
    reducedMotion,
  });
  const [sceneError, setSceneError] = useState(false);

  const loadBackground = useCallback(() => {
    const sprite = backgroundSpriteRef.current;
    if (!sprite) return;

    const request = ++backgroundRequestRef.current;
    sprite.visible = false;
    sprite.texture = Texture.EMPTY;

    void Assets.load<Texture>(VILLAGE_CANAL_BACKGROUND).then((texture) => {
      if (request !== backgroundRequestRef.current || backgroundSpriteRef.current !== sprite) return;
      sprite.texture = texture;
      coverSprite(sprite, texture);
      sprite.visible = true;
    }).catch(() => {
      if (request === backgroundRequestRef.current && backgroundSpriteRef.current === sprite) {
        sprite.texture = Texture.EMPTY;
      }
    });
  }, []);

  const loadArtwork = useCallback((path: string | null) => {
    const sprite = artworkSpriteRef.current;
    if (!sprite) return;

    const request = ++artworkRequestRef.current;
    sprite.visible = false;
    sprite.texture = Texture.EMPTY;
    if (!path) return;

    void Assets.load<Texture>(path).then((texture) => {
      if (request !== artworkRequestRef.current || artworkSpriteRef.current !== sprite) return;
      sprite.texture = texture;
      artworkScaleRef.current = coverSprite(sprite, texture);
    }).catch(() => {
      if (request === artworkRequestRef.current && artworkSpriteRef.current === sprite) {
        sprite.texture = Texture.EMPTY;
      }
    });
  }, []);

  useEffect(() => {
    sceneState.current = {
      artwork,
      event,
      eventSequence,
      fishAction,
      fishDistance,
      fishIntent,
      fishRarity,
      phase,
      bossPhase,
      reducedMotion,
    };
  }, [artwork, event, eventSequence, fishAction, fishDistance, fishIntent, fishRarity, phase, bossPhase, reducedMotion]);

  useEffect(() => {
    loadArtwork(artwork);
  }, [artwork, loadArtwork]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    let disposed = false;
    let initialized = false;
    let elapsed = 0;
    let feedbackPulse = 0;
    let lastEventSequence = sceneState.current.eventSequence;
    let resizeObserver: ResizeObserver | undefined;

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

        const world = new Container();
        const fallbackWorld = new Container();
        const fallbackSky = new Graphics()
          .rect(0, 0, SCENE_WIDTH, 252)
          .fill({ color: 0x182e3c });
        const fallbackBank = new Graphics()
          .rect(0, 236, SCENE_WIDTH, 54)
          .fill({ color: 0x455d4d })
          .rect(0, 281, SCENE_WIDTH, 18)
          .fill({ color: 0xb18a50 });
        const fallbackWater = new Graphics()
          .rect(0, 290, SCENE_WIDTH, SCENE_HEIGHT - 290)
          .fill({ color: 0x15565a })
          .rect(0, 290, SCENE_WIDTH, 7)
          .fill({ color: 0x9ab99a, alpha: 0.68 })
          .rect(0, SCENE_HEIGHT - 150, SCENE_WIDTH, 150)
          .fill({ color: 0x0b343d, alpha: 0.46 });
        const distantHouses = new Graphics()
          .rect(96, 151, 134, 86)
          .fill({ color: 0x80674e })
          .moveTo(82, 153)
          .lineTo(164, 94)
          .lineTo(247, 153)
          .closePath()
          .fill({ color: 0x493d3f })
          .rect(145, 190, 31, 47)
          .fill({ color: 0x384e4e })
          .rect(720, 173, 148, 64)
          .fill({ color: 0x9e8655 })
          .moveTo(702, 175)
          .lineTo(790, 119)
          .lineTo(887, 175)
          .closePath()
          .fill({ color: 0x554147 })
          .rect(764, 198, 33, 39)
          .fill({ color: 0x354c4b });
        const fallbackReeds = new Graphics();
        for (let index = 0; index < 14; index += 1) {
          const x = 28 + index * 38;
          const height = 25 + (index % 4) * 13;
          fallbackReeds
            .moveTo(x, 300)
            .lineTo(x + 6, 300 - height)
            .stroke({ color: index % 2 ? 0x526d50 : 0x7b8351, width: 4 });
          fallbackReeds
            .moveTo(x + 5, 300 - height + 8)
            .lineTo(x + 18, 300 - height - 5)
            .stroke({ color: 0x7b8351, width: 2 });
        }
        for (let index = 0; index < 12; index += 1) {
          const x = 916 + index * 28;
          const height = 28 + (index % 3) * 17;
          fallbackReeds
            .moveTo(x, 300)
            .lineTo(x - 4, 300 - height)
            .stroke({ color: index % 2 ? 0x526d50 : 0x7b8351, width: 4 });
          fallbackReeds
            .moveTo(x - 3, 300 - height + 6)
            .lineTo(x - 17, 300 - height - 8)
            .stroke({ color: 0x7b8351, width: 2 });
        }
        const bridge = new Graphics()
          .rect(1002, 226, 198, 17)
          .fill({ color: 0x624c3e })
          .rect(1024, 243, 11, 78)
          .fill({ color: 0x4b3d36 })
          .rect(1168, 243, 11, 78)
          .fill({ color: 0x4b3d36 })
          .rect(997, 215, 9, 34)
          .fill({ color: 0x4b3d36 })
          .rect(1196, 215, 9, 34)
          .fill({ color: 0x4b3d36 });
        const dock = new Graphics()
          .rect(84, 419, 236, 23)
          .fill({ color: 0x8f6842 })
          .rect(98, 442, 14, 118)
          .fill({ color: 0x634b38 })
          .rect(284, 442, 14, 118)
          .fill({ color: 0x634b38 })
          .rect(86, 427, 235, 3)
          .fill({ color: 0xc49a5a, alpha: 0.8 });
        fallbackWorld.addChild(fallbackSky, fallbackBank, fallbackWater, distantHouses, fallbackReeds, bridge, dock);

        const backgroundSprite = new Sprite(Texture.EMPTY);
        backgroundSprite.anchor.set(0.5);
        backgroundSprite.visible = false;
        backgroundSpriteRef.current = backgroundSprite;

        const moonHalo = new Graphics()
          .ellipse(942, 103, 100, 100)
          .fill({ color: 0xd6e8d4, alpha: 0.055 });
        const lightRays = new Graphics()
          .moveTo(900, 134)
          .lineTo(738, 412)
          .lineTo(828, 412)
          .closePath()
          .fill({ color: 0xdfe5c0, alpha: 0.045 })
          .moveTo(965, 140)
          .lineTo(913, 402)
          .lineTo(982, 402)
          .closePath()
          .fill({ color: 0xf0dfb1, alpha: 0.038 })
          .moveTo(838, 154)
          .lineTo(648, 403)
          .lineTo(708, 403)
          .closePath()
          .fill({ color: 0xb9d4ca, alpha: 0.03 });
        const mistLayer = new Container();
        const mistBands = [
          new Graphics().ellipse(370, 315, 220, 25).fill({ color: 0xd8e2ce, alpha: 0.055 }),
          new Graphics().ellipse(612, 337, 270, 27).fill({ color: 0xc8ddd1, alpha: 0.045 }),
          new Graphics().ellipse(874, 300, 170, 18).fill({ color: 0xe4dfc8, alpha: 0.04 }),
        ];
        mistLayer.addChild(...mistBands);

        const waterSheen = new Graphics();
        for (let index = 0; index < 12; index += 1) {
          const y = 394 + index * 25;
          const width = 38 + (index % 4) * 18;
          const x = 350 + (index % 5) * 125;
          waterSheen
            .moveTo(x, y)
            .lineTo(x + width, y - 3)
            .stroke({ color: index % 3 === 0 ? 0xd6d6a4 : 0x9cc4b0, width: index % 4 === 0 ? 2 : 1, alpha: 0.12 });
        }
        const depthWash = new Graphics()
          .rect(0, 428, SCENE_WIDTH, SCENE_HEIGHT - 428)
          .fill({ color: 0x062e3b, alpha: 0.095 });
        const foregroundFrame = new Graphics()
          .moveTo(0, SCENE_HEIGHT)
          .lineTo(0, 604)
          .lineTo(116, 662)
          .lineTo(186, SCENE_HEIGHT)
          .closePath()
          .fill({ color: 0x071f28, alpha: 0.3 })
          .moveTo(SCENE_WIDTH, SCENE_HEIGHT)
          .lineTo(SCENE_WIDTH, 570)
          .lineTo(1118, 640)
          .lineTo(1048, SCENE_HEIGHT)
          .closePath()
          .fill({ color: 0x071f28, alpha: 0.34 });

        const sceneArtwork = new Sprite(Texture.EMPTY);
        sceneArtwork.anchor.set(0.5);
        sceneArtwork.position.set(SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
        sceneArtwork.visible = false;
        artworkSpriteRef.current = sceneArtwork;
        const artworkAura = new Graphics()
          .ellipse(805, 455, 385, 232)
          .fill({ color: 0x8887cf, alpha: 0.035 });
        const artworkVeil = new Graphics()
          .rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
          .fill({ color: 0x071a2a, alpha: 0.095 });

        const sparklePoints = [
          { x: 412, y: 462 },
          { x: 650, y: 506 },
          { x: 796, y: 418 },
          { x: 972, y: 545 },
          { x: 1052, y: 456 },
        ];
        const surfaceSparkles = sparklePoints.map(({ x, y }, index) => {
          const sparkle = new Graphics()
            .ellipse(0, 0, index % 2 === 0 ? 2.5 : 1.5, index % 2 === 0 ? 5 : 3)
            .fill({ color: index % 2 === 0 ? 0xf3e4ae : 0xb5d9c8, alpha: 0.28 });
          sparkle.position.set(x, y);
          return sparkle;
        });

        world.addChild(
          fallbackWorld,
          backgroundSprite,
          moonHalo,
          lightRays,
          mistLayer,
          waterSheen,
          depthWash,
          sceneArtwork,
          artworkAura,
          artworkVeil,
          ...surfaceSparkles,
          foregroundFrame,
        );
        app.stage.addChild(world);
        loadBackground();
        loadArtwork(sceneState.current.artwork);

        const resizeScene = () => {
          const scale = Math.max(app.screen.width / SCENE_WIDTH, app.screen.height / SCENE_HEIGHT);
          world.scale.set(scale);
          world.position.set((app.screen.width - SCENE_WIDTH * scale) / 2, (app.screen.height - SCENE_HEIGHT * scale) / 2);
        };
        resizeObserver = new ResizeObserver(resizeScene);
        resizeObserver.observe(host);
        resizeScene();

        app.ticker.add((ticker) => {
          const state = sceneState.current;
          const motion = state.reducedMotion ? 0 : 1;
          elapsed += ticker.deltaMS * 0.001 * motion;
          if (state.eventSequence !== lastEventSequence) {
            lastEventSequence = state.eventSequence;
            feedbackPulse = motion ? 1 : 0;
          }
          if (motion) feedbackPulse = Math.max(0, feedbackPulse - ticker.deltaMS / 310);

          const encounterVisible = state.phase === 'player-turn' || state.phase === 'caught';
          const backgroundReady = backgroundSprite.texture !== Texture.EMPTY;
          const artReady = sceneArtwork.texture !== Texture.EMPTY;
          const fishArtworkVisible = encounterVisible && artReady;
          fallbackWorld.visible = !backgroundReady;
          backgroundSprite.visible = backgroundReady && !fishArtworkVisible;
          sceneArtwork.visible = fishArtworkVisible;
          artworkAura.visible = fishArtworkVisible;
          artworkVeil.visible = fishArtworkVisible;

          const eventJolt = state.event === 'fish-action' || state.event === 'line-damaged' || state.event === 'line-break'
            ? feedbackPulse
            : feedbackPulse * 0.45;
          const distanceRatio = Math.max(0, Math.min(1, state.fishDistance / 100));
          if (artReady) {
            const intentMotion = state.fishIntent === 'power-dash'
              ? Math.sin(elapsed * 11) * 4.5
              : state.fishIntent === 'deep-dive'
                ? 12
                : state.fishIntent === 'thrash'
                  ? Math.sin(elapsed * 14) * 2.2
                  : Math.sin(elapsed * 0.9) * 1.7;
            const actionOffset = state.fishAction === 'pull'
              ? -8
              : state.fishAction === 'release'
                ? 7
                : state.fishAction === 'reel'
                  ? -4
                  : 0;
            const artMotion = motion
              ? 1 + (state.bossPhase === 3 ? 0.018 : state.fishRarity === 'king' ? 0.01 : 0.004) + Math.sin(elapsed * 1.15) * 0.004 + eventJolt * 0.008
              : 1;
            const artTilt = state.fishAction === 'brace' ? -0.008 : state.fishAction === 'observe' ? 0.006 : 0;
            sceneArtwork.scale.set(artworkScaleRef.current * artMotion * (1 + (1 - distanceRatio) * 0.012));
            sceneArtwork.position.set(
              SCENE_WIDTH / 2 + (motion ? Math.sin(elapsed * 0.55) * 2.5 : 0) - eventJolt * 5,
              SCENE_HEIGHT / 2 + actionOffset + intentMotion + (motion ? Math.sin(elapsed * 0.7) * 1.5 : 0),
            );
            sceneArtwork.rotation = artTilt + (state.fishIntent === 'thrash' && motion ? Math.sin(elapsed * 12) * 0.012 : 0);
          }


          for (let index = 0; index < mistBands.length; index += 1) {
            const mist = mistBands[index]!;
            if (motion) mist.position.x = Math.sin(elapsed * 0.12 + index * 1.7) * (index + 1) * 8;
            mist.alpha = 0.62 + (motion ? Math.sin(elapsed * 0.5 + index) * 0.08 : 0);
          }
          lightRays.alpha = 0.8 + (motion ? Math.sin(elapsed * 0.35) * 0.08 : 0);
          waterSheen.alpha = fishArtworkVisible ? 0.58 : 0.84;
          for (let index = 0; index < surfaceSparkles.length; index += 1) {
            const sparkle = surfaceSparkles[index]!;
            sparkle.alpha = 0.12 + (motion ? (Math.sin(elapsed * (1.2 + index * 0.18) + index) + 1) * 0.08 : 0.08);
            if (motion) sparkle.rotation = Math.sin(elapsed * 0.8 + index) * 0.18;
          }
        });
      } catch {
        if (!disposed) setSceneError(true);
      }
    };

    void start();
    return () => {
      disposed = true;
      backgroundRequestRef.current += 1;
      artworkRequestRef.current += 1;
      backgroundSpriteRef.current = null;
      artworkSpriteRef.current = null;
      resizeObserver?.disconnect();
      if (initialized) app.destroy(true, { children: true });
    };
  }, [loadArtwork, loadBackground]);

  return (
    <figure className="canal-scene" aria-label={`${spotName}. ${description}`}>
      <div className="canal-scene__canvas-host" ref={hostRef} aria-hidden="true" />
      {sceneError && <p className="canal-scene__error" role="status">{errorMessage}</p>}
    </figure>
  );
}
