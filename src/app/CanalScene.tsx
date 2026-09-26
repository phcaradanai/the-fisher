import { useCallback, useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Rarity } from '../content/types';
import type { TurnCombatEvent, TurnCombatPhase, TurnFishingAction, FishIntentType } from '../game/core/fishing/turn-types';

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

const SCENE_WIDTH = 1200;
const SCENE_HEIGHT = 800;
const VILLAGE_CANAL_BACKGROUND = '/images/background_art_a/คลองหมอกจันทร์กับเงาอสูรใต้น้ำ.png';

type ArtworkProfile = {
  scale: number;
  x: number;
  y: number;
  tilt: number;
  focusX: number;
  focusY: number;
  anchorX: number;
  anchorY: number;
  encounterSize: 'small' | 'standard' | 'large' | 'king';
};

function createArtworkProfile(
  scale: number,
  x: number,
  y: number,
  tilt: number,
  focusX: number,
  focusY: number,
  encounterSize: ArtworkProfile['encounterSize'],
  anchorX = 0.5,
  anchorY = 0.5,
): ArtworkProfile {
  return { scale, x, y, tilt, focusX, focusY, anchorX, anchorY, encounterSize };
}

const DEFAULT_ARTWORK_PROFILE = createArtworkProfile(0.64, 0, 0, 0, 0.5, 0.5, 'standard');

const ARTWORK_PROFILES: Record<string, ArtworkProfile> = {
  'river-minnow': createArtworkProfile(0.42, -12, 8, 0.02, 0.5, 0.54, 'small'),
  'reed-perch': createArtworkProfile(0.5, 28, -8, 0.016, 0.56, 0.48, 'standard'),
  'mud-carp': createArtworkProfile(0.66, 18, 12, -0.008, 0.5, 0.55, 'large'),
  'silver-barb': createArtworkProfile(0.46, -8, 3, 0.012, 0.48, 0.5, 'small'),
  bluegill: createArtworkProfile(0.54, 16, 6, -0.006, 0.52, 0.52, 'standard'),
  'lotus-goby': createArtworkProfile(0.44, 8, 12, 0.01, 0.5, 0.54, 'small'),
  'glass-catfish': createArtworkProfile(0.52, -6, -2, 0.008, 0.48, 0.48, 'standard'),
  'golden-carp': createArtworkProfile(0.62, 20, -4, 0.008, 0.52, 0.48, 'large'),
  'river-pike': createArtworkProfile(0.74, 12, 8, -0.012, 0.54, 0.52, 'large'),
  'lantern-catfish': createArtworkProfile(0.64, 12, 4, 0.006, 0.5, 0.5, 'large'),
  'moon-koi': createArtworkProfile(0.7, 8, -2, 0.004, 0.52, 0.49, 'large'),
  'old-river-king': createArtworkProfile(0.92, 6, 4, 0, 0.52, 0.52, 'king'),
};

function artworkProfile(fishId: string | null, rarity: Rarity | null): ArtworkProfile {
  const matched = fishId ? ARTWORK_PROFILES[fishId] : undefined;
  if (matched) return matched;
  const size = rarity === 'king' ? 'king' : rarity === 'rare' ? 'large' : rarity === 'uncommon' ? 'standard' : 'small';
  const scale = rarity === 'king' ? 0.94 : rarity === 'rare' ? 0.76 : rarity === 'uncommon' ? 0.68 : 0.58;
  return { ...DEFAULT_ARTWORK_PROFILE, scale, encounterSize: size };
}

function coverSprite(sprite: Sprite, texture: Texture): number {
  const scale = Math.max(SCENE_WIDTH / texture.width, SCENE_HEIGHT / texture.height);
  sprite.scale.set(scale);
  sprite.position.set(SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
  return scale;
}

function drawLine(line: Graphics, startX: number, startY: number, endX: number, endY: number, tension: number, alpha = 1, locked = false) {
  const normalizedTension = Math.max(0, Math.min(1, tension / 100));
  const sag = 22 - normalizedTension * 18;
  line.clear()
    .moveTo(startX, startY)
    .quadraticCurveTo((startX + endX) / 2, (startY + endY) / 2 + sag, endX, endY)
    .stroke({
      color: locked ? 0xa7edc5 : normalizedTension > 0.78 ? 0xff9b82 : 0xd9f1df,
      width: locked ? 3.4 : 2 + normalizedTension * 1.8,
      alpha,
    });
}

function drawWake(wake: Graphics, x: number, y: number, intent: FishIntentType | null, strength: number, elapsed: number) {
  const direction = intent === 'power-dash' || intent === 'steady-pull' ? -1 : 1;
  const length = (28 + strength * 34) * (intent === 'power-dash' ? 1.65 : intent === 'steady-pull' ? 0.85 : 1);
  wake.clear();
  for (let index = 0; index < 3; index += 1) {
    const offset = index * 12;
    const width = Math.max(8, length - index * 10);
    const thrash = intent === 'thrash' ? Math.sin(elapsed * 14 + index * 2) * 9 : 0;
    wake
      .moveTo(x + direction * (offset + 8) + thrash, y + 12 + index * 4 - thrash * 0.45)
      .quadraticCurveTo(x + direction * (offset + width / 2) - thrash, y + 6 + Math.sin(elapsed * 3 + index) * 2, x + direction * (offset + width) + thrash, y + 12 + index * 4 + thrash * 0.45)
      .stroke({ color: index === 0 ? 0xd1f4e5 : 0x8fcfc5, width: index === 0 ? 2.4 : 1.2, alpha: (0.25 - index * 0.055) * strength });
  }
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
  const artworkSpriteRef = useRef<Sprite | null>(null);
  const backgroundRequestRef = useRef(0);
  const artworkRequestRef = useRef(0);
  const artworkScaleRef = useRef(1);
  const artworkProfileRef = useRef<ArtworkProfile>(DEFAULT_ARTWORK_PROFILE);
  const artworkMaskTextureRef = useRef<Texture | null>(null);
  const sceneState = useRef({
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
      // Keep the canal visible around the encounter artwork. The fish reads as
      // a layered moment in the location instead of a full-screen card.
      const profile = artworkProfile(sceneState.current.fishId, sceneState.current.fishRarity);
      artworkProfileRef.current = profile;
      sprite.anchor.set(profile.anchorX, profile.anchorY);
      artworkScaleRef.current = coverSprite(sprite, texture) * profile.scale;
    }).catch(() => {
      if (request === artworkRequestRef.current && artworkSpriteRef.current === sprite) {
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
        sceneArtwork.alpha = 0.82;
        sceneArtwork.visible = false;
        artworkSpriteRef.current = sceneArtwork;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = 512;
        maskCanvas.height = 320;
        const maskContext = maskCanvas.getContext('2d');
        if (!maskContext) throw new Error('Canvas does not support the encounter mask.');
        maskContext.save();
        maskContext.translate(256, 160);
        maskContext.scale(1, 160 / 256);
        const feather = maskContext.createRadialGradient(0, 0, 28, 0, 0, 256);
        feather.addColorStop(0, 'rgba(255,255,255,1)');
        feather.addColorStop(0.62, 'rgba(255,255,255,.94)');
        feather.addColorStop(0.82, 'rgba(255,255,255,.58)');
        feather.addColorStop(0.94, 'rgba(255,255,255,.18)');
        feather.addColorStop(1, 'rgba(255,255,255,0)');
        maskContext.fillStyle = feather;
        maskContext.fillRect(-256, -256, 512, 512);
        maskContext.restore();
        const artworkMaskTexture = Texture.from(maskCanvas);
        artworkMaskTextureRef.current = artworkMaskTexture;
        const artworkMask = new Sprite(artworkMaskTexture);
        artworkMask.anchor.set(0.5);
        artworkMask.position.set(800, 458);
        sceneArtwork.mask = artworkMask;
        const artworkVeil = new Graphics()
          .rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
          .fill({ color: 0x071a2a, alpha: 0.095 });
        const eventFlash = new Graphics()
          .rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
          .fill({ color: 0xdff3dc, alpha: 1 });

        // Encounter feedback stays in the world layer so every decision visibly
        // affects the canal instead of replacing it with a UI surface.
        const fishingLine = new Graphics();
        const waterWake = new Graphics();
        const depthCue = new Graphics();
        for (let index = 0; index < 18; index += 1) {
          const depth = index / 17;
          depthCue
            .ellipse(0, 0, 132 - depth * 60, 72 - depth * 32)
            .fill({ color: 0x061522, alpha: 0.018 });
        }
        depthCue.visible = false;
        const waterRipples = Array.from({ length: 4 }, () => new Graphics());
        const splashParticles = Array.from({ length: 7 }, (_, index) => new Graphics()
          .circle(0, 0, index % 2 === 0 ? 3 : 2)
          .fill({ color: index % 2 === 0 ? 0xe5f4d8 : 0x8dd3c9, alpha: 0.85 }));
        const disturbance = new Container();
        disturbance.addChild(depthCue, waterWake, fishingLine, ...waterRipples, ...splashParticles);
        disturbance.visible = false;

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
          artworkMask,
          sceneArtwork,
          artworkVeil,
          ...surfaceSparkles,
          foregroundFrame,
          disturbance,
          eventFlash,
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
          if (state.eventSequence > 0 && state.eventSequence !== lastEventSequence) {
            lastEventSequence = state.eventSequence;
            feedbackPulse = motion ? 1 : 0;
          }
          if (motion) feedbackPulse = Math.max(0, feedbackPulse - ticker.deltaMS / 310);

          const encounterVisible = state.showEncounter;
          const observing = state.event === 'action-observe';
          const backgroundReady = backgroundSprite.texture !== Texture.EMPTY;
          const artReady = sceneArtwork.texture !== Texture.EMPTY;
          const fishArtworkVisible = encounterVisible && artReady;
          fallbackWorld.visible = !backgroundReady;
          backgroundSprite.visible = backgroundReady;
          sceneArtwork.visible = fishArtworkVisible;
          artworkVeil.visible = fishArtworkVisible;
          disturbance.visible = encounterVisible || state.event === 'line-break' || state.event === 'escaped' || state.event === 'fish-intent';

          const actionImpact = state.fishAction === 'pull'
            ? 0.9
            : state.fishAction === 'reel'
              ? 0.65
              : state.fishAction === 'release'
                ? 0.28
                : state.fishAction === 'brace'
                  ? 0.38
                  : state.fishAction === 'observe' ? 0.12 : 0;
          const eventJolt = state.event === 'fish-action' || state.event === 'line-damaged' || state.event === 'line-break'
            ? feedbackPulse
            : state.event === 'action-brace' || state.event === 'action-observe'
              ? feedbackPulse * actionImpact * 0.22
              : state.event?.startsWith('action-') ? feedbackPulse * actionImpact : feedbackPulse * 0.45;
          const distanceRatio = Math.max(0, Math.min(1, state.fishDistance / 100));
          if (artReady) {
            const profile = artworkProfileRef.current;
            const artMotion = motion
              ? 1 + (state.bossPhase === 3 ? 0.018 : state.fishRarity === 'king' ? 0.01 : 0.004) + Math.sin(elapsed * 1.15) * 0.004 + eventJolt * 0.008
              : 1;
            const fishScale = artworkScaleRef.current * artMotion * (1 + (1 - distanceRatio) * 0.012);
            const intentMotion = state.fishIntent === 'power-dash'
              ? Math.sin(elapsed * 11) * 7
              : state.fishIntent === 'deep-dive'
                ? 42
                : state.fishIntent === 'thrash'
                  ? Math.sin(elapsed * 14) * 8
                  : Math.sin(elapsed * 0.9) * 1.7;
            const actionOffset = state.fishAction === 'pull'
              ? -30
              : state.fishAction === 'release'
                ? 10
                : state.fishAction === 'reel'
                  ? -18
                  : 0;
            const actionHorizontal = state.fishAction === 'pull'
              ? -27
              : state.fishAction === 'reel'
                ? -16
                : state.fishAction === 'release' ? 38 : state.event === 'escaped' ? (1 - feedbackPulse) * 38 : 0;
            const artTilt = profile.tilt + (state.fishAction === 'brace' ? -0.008 : state.fishAction === 'observe' ? 0.006 : 0);
            sceneArtwork.scale.set(fishScale);
            sceneArtwork.position.set(
              SCENE_WIDTH * 0.67 + profile.x + (profile.anchorX - profile.focusX) * sceneArtwork.texture.width * fishScale
                + actionHorizontal + (motion ? Math.sin(elapsed * 0.55) * 2.5 : 0)
                - eventJolt * (state.fishIntent === 'power-dash' ? 11 : 5),
              SCENE_HEIGHT * 0.58 + profile.y + (profile.anchorY - profile.focusY) * sceneArtwork.texture.height * fishScale
                + actionOffset + intentMotion + (motion ? Math.sin(elapsed * 0.7) * 1.5 : 0),
            );
            sceneArtwork.rotation = artTilt + (state.fishIntent === 'thrash' && motion ? Math.sin(elapsed * 12) * 0.012 : 0);
          }

          depthWash.alpha = state.fishIntent === 'deep-dive' && encounterVisible ? 1.65 : 0.72;
          if (disturbance.visible) {
            const distanceRatio = Math.max(0, Math.min(1, state.fishDistance / 100));
            const escapeDrift = state.event === 'escaped' ? (1 - feedbackPulse) * 62 : 0;
            const fishX = 780 - distanceRatio * 300 + escapeDrift + (motion ? Math.sin(elapsed * 1.4) * 5 : 0);
            const fishY = 472 + (state.fishIntent === 'deep-dive' ? 64 : state.fishIntent === 'power-dash' ? -14 : 0);
            const playerX = 272;
            const playerY = 650;
            depthCue.visible = state.fishIntent === 'deep-dive' && encounterVisible;
            depthCue.position.set(fishX, fishY + 18);
            const actionStrength = state.event === 'line-damaged' || state.event === 'line-break'
              ? 1
              : state.event?.startsWith('action-') ? 0.85 : 0.55;
            const lineAlpha = state.event === 'line-break' ? 0
              : state.event === 'escaped' ? 0.16
                : state.fishAction === 'release' ? 0.36
                  : state.fishAction === 'brace' ? 1 : fishArtworkVisible ? 0.9 : 0.5;
            drawLine(fishingLine, playerX, playerY, fishX, fishY, state.fishTension, lineAlpha, state.fishAction === 'brace');
            drawWake(waterWake, fishX, fishY, state.fishIntent, actionStrength, elapsed);

            const rippleStrength = Math.min(1, actionStrength + (state.fishIntent === 'recover' ? 0.1 : 0));
            for (let index = 0; index < waterRipples.length; index += 1) {
              const ripple = waterRipples[index]!;
              const cycle = (elapsed * (0.35 + index * 0.06) + index * 0.22) % 1;
              ripple.clear()
                .ellipse(fishX, fishY + 14, 26 + cycle * 60 + index * 7, 7 + cycle * 13)
                .stroke({ color: index === 0 ? 0xe5f4d8 : 0x8bc8bf, width: index === 0 ? 2 : 1, alpha: (1 - cycle) * 0.2 * rippleStrength });
            }

            const burst = feedbackPulse > 0.05 && (state.event === 'caught' || state.event === 'escaped' || state.event === 'line-break' || state.event === 'line-damaged' || state.event === 'fish-action' || state.event === 'fish-intent');
            for (let index = 0; index < splashParticles.length; index += 1) {
              const particle = splashParticles[index]!;
              const phase = (elapsed * 1.8 + index * 0.13) % 1;
              const angle = -Math.PI * 0.92 + (index / Math.max(1, splashParticles.length - 1)) * Math.PI * 0.84;
              const lift = burst ? phase * 38 : 0;
              particle.position.set(fishX + Math.cos(angle) * (12 + phase * 42), fishY + Math.sin(angle) * (10 + phase * 28) - lift);
              particle.alpha = burst ? (1 - phase) * 0.8 : 0;
            }
          }

          const eventColor = state.event === 'caught' ? 0xf5dfa4 : state.event === 'line-break' ? 0xff6d78 : 0xa9e8db;
          eventFlash.tint = eventColor;
          eventFlash.alpha = feedbackPulse * (state.event === 'caught' ? 0.16 : state.event === 'line-break' ? 0.13 : 0.045);


          for (let index = 0; index < mistBands.length; index += 1) {
            const mist = mistBands[index]!;
            if (motion) mist.position.x = Math.sin(elapsed * 0.12 + index * 1.7) * (index + 1) * 8;
            mist.alpha = (observing ? 0.38 : state.event === 'caught' ? 0.44 : 0.62)
              + (motion ? Math.sin(elapsed * 0.5 + index) * 0.08 : 0);
          }
          lightRays.alpha = (observing ? 0.5 : 0.8) + (motion ? Math.sin(elapsed * 0.35) * 0.08 : 0);
          waterSheen.alpha = observing ? 1 : state.event === 'caught' ? 0.38 : fishArtworkVisible ? 0.58 : 0.84;
          for (let index = 0; index < surfaceSparkles.length; index += 1) {
            const sparkle = surfaceSparkles[index]!;
            sparkle.alpha = observing ? 0.035 : state.event === 'caught' ? 0.055
              : 0.12 + (motion ? (Math.sin(elapsed * (1.2 + index * 0.18) + index) + 1) * 0.08 : 0.08);
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
      artworkMaskTextureRef.current?.destroy(true);
      artworkMaskTextureRef.current = null;
    };
  }, [loadArtwork, loadBackground]);

  return (
    <figure
      className="canal-scene"
      aria-label={`${spotName}. ${description}`}
      data-encounter-size={artworkProfile(fishId, fishRarity).encounterSize}
    >
      <div className="canal-scene__canvas-host" ref={hostRef} aria-hidden="true" />
      {sceneError && <p className="canal-scene__error" role="status">{errorMessage}</p>}
    </figure>
  );
}
