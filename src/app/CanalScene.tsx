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
  'old-river-king': createArtworkProfile(0.96, 6, 4, 0, 0.52, 0.52, 'king'),
};

function artworkProfile(fishId: string | null, rarity: Rarity | null): ArtworkProfile {
  const matched = fishId ? ARTWORK_PROFILES[fishId] : undefined;
  if (matched) return matched;
  const size = rarity === 'king' ? 'king' : rarity === 'rare' ? 'large' : rarity === 'uncommon' ? 'standard' : 'small';
  const scale = rarity === 'king' ? 0.96 : rarity === 'rare' ? 0.76 : rarity === 'uncommon' ? 0.68 : 0.58;
  return { ...DEFAULT_ARTWORK_PROFILE, scale, encounterSize: size };
}

function coverSprite(sprite: Sprite, texture: Texture): number {
  const scale = Math.max(SCENE_WIDTH / texture.width, SCENE_HEIGHT / texture.height);
  sprite.scale.set(scale);
  sprite.position.set(SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
  return scale;
}

function drawLine(
  line: Graphics,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tension: number,
  alpha = 1,
  action: TurnFishingAction | null = null,
  elapsed = 0,
) {
  const normalizedTension = Math.max(0, Math.min(1, tension / 100));
  const locked = action === 'brace';
  const slack = action === 'release';
  const pluck = normalizedTension > 0.82 ? Math.sin(elapsed * 50) * (normalizedTension * 3) : 0;
  const baseSag = slack ? 48 : locked ? -2 : (22 - normalizedTension * 24);
  const sag = baseSag + pluck;

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 + sag;

  const coreColor = locked
    ? 0x7ee0c0
    : normalizedTension > 0.85
      ? 0xff5c6c
      : normalizedTension > 0.72
        ? 0xffb266
        : 0xdff7eb;

  const glowColor = locked
    ? 0x48bb95
    : normalizedTension > 0.85
      ? 0xff3b4d
      : 0x78d4c8;

  line.clear();

  // Subtle outer luminous halo for visibility against deep canal water
  if (alpha > 0.2) {
    line
      .moveTo(startX, startY)
      .quadraticCurveTo(midX, midY, endX, endY)
      .stroke({
        color: glowColor,
        width: locked ? 6 : 4 + normalizedTension * 3,
        alpha: alpha * 0.32,
      });
  }

  // Crisp high-tensile core filament
  line
    .moveTo(startX, startY)
    .quadraticCurveTo(midX, midY, endX, endY)
    .stroke({
      color: coreColor,
      width: locked ? 3.6 : 2 + normalizedTension * 1.8,
      alpha,
    });
}

function drawWake(
  wake: Graphics,
  x: number,
  y: number,
  intent: FishIntentType | null,
  strength: number,
  elapsed: number,
  isKing = false,
  bossPhase: 1 | 2 | 3 | null = null,
) {
  const direction = intent === 'power-dash' || intent === 'steady-pull' ? -1 : 1;
  const baseLength = (32 + strength * 42) * (intent === 'power-dash' ? 1.8 : intent === 'steady-pull' ? 1.1 : 1);
  const length = isKing ? baseLength * 1.35 : baseLength;
  const wakeCount = intent === 'power-dash' ? 4 : intent === 'thrash' ? 5 : 3;

  wake.clear();

  // King fish spectral bioluminescent aura in water wake
  const primaryColor = isKing
    ? bossPhase === 3 ? 0xcc88ff : 0xa488ff
    : intent === 'power-dash' ? 0x8fe6ff : intent === 'recover' ? 0xa8f4d0 : 0xd1f4e5;

  const secondaryColor = isKing
    ? 0x5a3f8c
    : intent === 'thrash' ? 0xffb89c : 0x73b8aa;

  for (let index = 0; index < wakeCount; index += 1) {
    const offset = index * 14;
    const width = Math.max(10, length - index * 9);
    const thrash = intent === 'thrash'
      ? Math.sin(elapsed * 16 + index * 2.2) * 12
      : intent === 'power-dash'
        ? Math.sin(elapsed * 10 + index) * 4
        : 0;

    const wakeY = y + 10 + index * 5 + thrash * 0.4;
    const wakeAlpha = Math.max(0, (0.32 - index * 0.055) * strength);

    wake
      .moveTo(x + direction * (offset + 10) + thrash, wakeY)
      .quadraticCurveTo(
        x + direction * (offset + width / 2) - thrash,
        y + 4 + Math.sin(elapsed * 3.5 + index) * 3,
        x + direction * (offset + width) + thrash,
        wakeY,
      )
      .stroke({
        color: index === 0 ? primaryColor : secondaryColor,
        width: index === 0 ? 2.6 : 1.4,
        alpha: wakeAlpha,
      });
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
    let castStartTime = 0;
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
          .ellipse(942, 103, 110, 110)
          .fill({ color: 0xd6e8d4, alpha: 0.06 });

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
          new Graphics().ellipse(370, 315, 230, 26).fill({ color: 0xd8e2ce, alpha: 0.055 }),
          new Graphics().ellipse(612, 337, 280, 28).fill({ color: 0xc8ddd1, alpha: 0.045 }),
          new Graphics().ellipse(874, 300, 180, 19).fill({ color: 0xe4dfc8, alpha: 0.04 }),
        ];
        mistLayer.addChild(...mistBands);

        const waterSheen = new Graphics();
        for (let index = 0; index < 14; index += 1) {
          const y = 390 + index * 23;
          const width = 42 + (index % 4) * 20;
          const x = 330 + (index % 5) * 128;
          waterSheen
            .moveTo(x, y)
            .lineTo(x + width, y - 2.5)
            .stroke({ color: index % 3 === 0 ? 0xd6d6a4 : 0x9cc4b0, width: index % 4 === 0 ? 2 : 1, alpha: 0.14 });
        }

        const depthWash = new Graphics()
          .rect(0, 420, SCENE_WIDTH, SCENE_HEIGHT - 420)
          .fill({ color: 0x052634, alpha: 0.1 });

        // King Fish / Boss Abyssal Vignette
        const bossVignette = new Graphics()
          .rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
          .fill({ color: 0x1d0b36, alpha: 0 });

        const foregroundFrame = new Graphics()
          .moveTo(0, SCENE_HEIGHT)
          .lineTo(0, 604)
          .lineTo(116, 662)
          .lineTo(186, SCENE_HEIGHT)
          .closePath()
          .fill({ color: 0x071f28, alpha: 0.32 })
          .moveTo(SCENE_WIDTH, SCENE_HEIGHT)
          .lineTo(SCENE_WIDTH, 570)
          .lineTo(1118, 640)
          .lineTo(1048, SCENE_HEIGHT)
          .closePath()
          .fill({ color: 0x071f28, alpha: 0.36 });

        // Sways gently in ambient night wind
        const foregroundReeds = new Graphics();
        for (let i = 0; i < 9; i += 1) {
          const rx = 14 + i * 20;
          const ry = SCENE_HEIGHT - 12;
          foregroundReeds
            .moveTo(rx, ry)
            .lineTo(rx + 12, ry - 75 - (i % 3) * 18)
            .stroke({ color: 0x08242c, width: 3.5, alpha: 0.7 });
        }

        const sceneArtwork = new Sprite(Texture.EMPTY);
        sceneArtwork.anchor.set(0.5);
        sceneArtwork.position.set(SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
        sceneArtwork.alpha = 0.84;
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
        const feather = maskContext.createRadialGradient(0, 0, 24, 0, 0, 256);
        feather.addColorStop(0, 'rgba(255,255,255,1)');
        feather.addColorStop(0.64, 'rgba(255,255,255,.94)');
        feather.addColorStop(0.84, 'rgba(255,255,255,.62)');
        feather.addColorStop(0.95, 'rgba(255,255,255,.2)');
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

        // Subtle underwater caustics veil
        const artworkVeil = new Graphics()
          .rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
          .fill({ color: 0x071a2a, alpha: 0.08 });

        const eventFlash = new Graphics()
          .rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT)
          .fill({ color: 0xdff3dc, alpha: 1 });

        // King fish water aura
        const kingAura = new Graphics();
        kingAura.visible = false;

        // Cast presentation graphics: flying lure arc + impact rings
        const castLine = new Graphics();
        const castLure = new Graphics()
          .circle(0, 0, 4.5)
          .fill({ color: 0xffe88a })
          .circle(0, 0, 8)
          .stroke({ color: 0x8fe6ff, width: 1.5, alpha: 0.65 });
        const castSplash = new Graphics();
        castLine.visible = false;
        castLure.visible = false;
        castSplash.visible = false;

        // Encounter feedback in the world layer
        const fishingLine = new Graphics();
        const waterWake = new Graphics();
        const depthCue = new Graphics();
        for (let index = 0; index < 18; index += 1) {
          const depth = index / 17;
          depthCue
            .ellipse(0, 0, 136 - depth * 62, 74 - depth * 34)
            .fill({ color: 0x05131f, alpha: 0.022 });
        }
        depthCue.visible = false;

        const waterRipples = Array.from({ length: 5 }, () => new Graphics());
        const splashParticles = Array.from({ length: 12 }, (_, index) => new Graphics()
          .circle(0, 0, index % 3 === 0 ? 3.5 : index % 2 === 0 ? 2.5 : 1.8)
          .fill({ color: index % 2 === 0 ? 0xe5f4d8 : 0x8dd3c9, alpha: 0.9 }));

        const disturbance = new Container();
        disturbance.addChild(
          depthCue,
          kingAura,
          waterWake,
          fishingLine,
          ...waterRipples,
          ...splashParticles,
          castLine,
          castLure,
          castSplash,
        );
        disturbance.visible = false;

        // Ambient night fireflies drifting across the canal water
        const fireflyBases = [
          { x: 310, y: 380, phase: 0.1 },
          { x: 440, y: 460, phase: 1.2 },
          { x: 580, y: 420, phase: 2.4 },
          { x: 670, y: 520, phase: 0.8 },
          { x: 790, y: 390, phase: 3.1 },
          { x: 880, y: 470, phase: 1.9 },
          { x: 960, y: 530, phase: 2.7 },
          { x: 1040, y: 440, phase: 0.4 },
          { x: 260, y: 520, phase: 1.6 },
          { x: 510, y: 360, phase: 3.8 },
        ];
        const fireflies = fireflyBases.map((base, idx) => {
          const g = new Graphics()
            .circle(0, 0, idx % 3 === 0 ? 2.5 : 1.8)
            .fill({ color: idx % 2 === 0 ? 0xffdf78 : 0xa6ffc2, alpha: 0.85 })
            .circle(0, 0, idx % 3 === 0 ? 6 : 4)
            .fill({ color: idx % 2 === 0 ? 0xffea9e : 0x7ef5a8, alpha: 0.22 });
          g.position.set(base.x, base.y);
          return g;
        });

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
          bossVignette,
          artworkMask,
          sceneArtwork,
          artworkVeil,
          ...surfaceSparkles,
          ...fireflies,
          foregroundFrame,
          foregroundReeds,
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
          const deltaSec = ticker.deltaMS * 0.001;
          elapsed += deltaSec * motion;

          if (state.eventSequence > 0 && state.eventSequence !== lastEventSequence) {
            lastEventSequence = state.eventSequence;
            feedbackPulse = motion ? 1 : 0;
            if (state.event === 'cast') {
              castStartTime = elapsed;
            }
          }
          if (motion) feedbackPulse = Math.max(0, feedbackPulse - ticker.deltaMS / 320);

          const isKing = state.fishRarity === 'king' || state.bossPhase !== null;
          const encounterVisible = state.showEncounter;
          const observing = state.event === 'action-observe';
          const backgroundReady = backgroundSprite.texture !== Texture.EMPTY;
          const artReady = sceneArtwork.texture !== Texture.EMPTY;
          const fishArtworkVisible = encounterVisible && artReady;

          fallbackWorld.visible = !backgroundReady;
          backgroundSprite.visible = backgroundReady;
          sceneArtwork.visible = fishArtworkVisible;
          artworkVeil.visible = fishArtworkVisible;
          disturbance.visible = encounterVisible || state.event === 'line-break' || state.event === 'escaped' || state.event === 'fish-intent' || state.event === 'cast';

          const actionImpact = state.fishAction === 'pull'
            ? 0.95
            : state.fishAction === 'reel'
              ? 0.7
              : state.fishAction === 'release'
                ? 0.28
                : state.fishAction === 'brace'
                  ? 0.45
                  : state.fishAction === 'observe' ? 0.12 : 0;

          const eventJolt = state.event === 'fish-action' || state.event === 'line-damaged' || state.event === 'line-break'
            ? feedbackPulse
            : state.event === 'action-brace' || state.event === 'action-observe'
              ? feedbackPulse * actionImpact * 0.22
              : state.event?.startsWith('action-') ? feedbackPulse * actionImpact : feedbackPulse * 0.45;

          const distanceRatio = Math.max(0, Math.min(1, state.fishDistance / 100));

          // Ambient reed swaying
          if (motion) {
            foregroundReeds.rotation = Math.sin(elapsed * 0.9) * 0.015;
          }

          // Ambient fireflies drifting
          for (let i = 0; i < fireflies.length; i += 1) {
            const f = fireflies[i]!;
            const base = fireflyBases[i]!;
            if (motion) {
              f.position.x = base.x + Math.sin(elapsed * 0.45 + base.phase) * 32;
              f.position.y = base.y + Math.cos(elapsed * 0.55 + base.phase * 1.4) * 18;
              f.alpha = 0.25 + (Math.sin(elapsed * 1.9 + base.phase * 3) * 0.5 + 0.5) * 0.65;
            }
          }

          // Boss Abyssal Vignette update
          if (isKing) {
            const targetAlpha = state.bossPhase === 3 ? 0.38 : state.bossPhase === 2 ? 0.25 : 0.16;
            bossVignette.alpha += (targetAlpha - bossVignette.alpha) * 0.05;
          } else {
            bossVignette.alpha += (0 - bossVignette.alpha) * 0.08;
          }

          // Fish positioning and choreography
          if (artReady) {
            const profile = artworkProfileRef.current;
            const artMotion = motion
              ? 1 + (state.bossPhase === 3 ? 0.024 : isKing ? 0.012 : 0.005) + Math.sin(elapsed * 1.15) * 0.004 + eventJolt * 0.009
              : 1;
            const fishScale = artworkScaleRef.current * artMotion * (1 + (1 - distanceRatio) * 0.014);

            // Intent specific motion signatures
            const intentMotion = state.fishIntent === 'power-dash'
              ? Math.sin(elapsed * 13) * 9
              : state.fishIntent === 'deep-dive'
                ? 46
                : state.fishIntent === 'thrash'
                  ? Math.sin(elapsed * 18) * 11
                  : state.fishIntent === 'recover'
                    ? Math.sin(elapsed * 0.6) * 1.2
                    : Math.sin(elapsed * 0.9) * 1.8;

            // Player action feedback on fish location
            const actionOffset = state.fishAction === 'pull'
              ? -34 * feedbackPulse
              : state.fishAction === 'release'
                ? 14 * feedbackPulse
                : state.fishAction === 'reel'
                  ? -20 * feedbackPulse
                  : 0;

            const actionHorizontal = state.fishAction === 'pull'
              ? -32 * feedbackPulse
              : state.fishAction === 'reel'
                ? -22 * feedbackPulse
                : state.fishAction === 'release'
                  ? 42 * feedbackPulse
                  : state.event === 'escaped'
                    ? (1 - feedbackPulse) * 44
                    : 0;

            const artTilt = profile.tilt + (state.fishAction === 'brace' ? -0.01 : state.fishAction === 'observe' ? 0.006 : 0);

            sceneArtwork.scale.set(fishScale);
            sceneArtwork.position.set(
              SCENE_WIDTH * 0.67 + profile.x + (profile.anchorX - profile.focusX) * sceneArtwork.texture.width * fishScale
                + actionHorizontal + (motion ? Math.sin(elapsed * 0.55) * 2.5 : 0)
                - eventJolt * (state.fishIntent === 'power-dash' ? 14 : 6),
              SCENE_HEIGHT * 0.58 + profile.y + (profile.anchorY - profile.focusY) * sceneArtwork.texture.height * fishScale
                + actionOffset + intentMotion + (motion ? Math.sin(elapsed * 0.7) * 1.5 : 0),
            );
            sceneArtwork.rotation = artTilt + (state.fishIntent === 'thrash' && motion ? Math.sin(elapsed * 15) * 0.016 : 0);

            // King Fish special aura
            if (isKing) {
              kingAura.visible = true;
              kingAura.clear();
              const auraColor = state.bossPhase === 3 ? 0xb578ff : 0x7a52cc;
              const auraAlpha = (0.18 + Math.sin(elapsed * 2.2) * 0.08) * (state.bossPhase === 3 ? 1.4 : 1);
              kingAura
                .ellipse(sceneArtwork.position.x, sceneArtwork.position.y + 12, 120 * fishScale, 60 * fishScale)
                .fill({ color: auraColor, alpha: auraAlpha });
            } else {
              kingAura.visible = false;
            }
          }

          depthWash.alpha = state.fishIntent === 'deep-dive' && encounterVisible ? 1.7 : 0.72;

          if (disturbance.visible) {
            const escapeDrift = state.event === 'escaped' ? (1 - feedbackPulse) * 68 : 0;
            const fishX = 780 - distanceRatio * 300 + escapeDrift + (motion ? Math.sin(elapsed * 1.4) * 5 : 0);
            const fishY = 472 + (state.fishIntent === 'deep-dive' ? 68 : state.fishIntent === 'power-dash' ? -15 : 0);
            const playerX = 272;
            const playerY = 650;

            // CAST Choreography: smooth flying lure arc, landing impact & water eruption
            if (state.event === 'cast') {
              const castDuration = 0.68;
              const castElapsed = Math.min(castDuration, elapsed - castStartTime);
              const castT = Math.max(0, Math.min(1, castElapsed / castDuration));

              const arcX = playerX + (fishX - playerX) * castT;
              const arcY = playerY + (fishY - playerY) * castT - Math.sin(castT * Math.PI) * 200;

              castLine.visible = true;
              castLure.visible = true;
              castLine.clear()
                .moveTo(playerX, playerY)
                .quadraticCurveTo((playerX + arcX) / 2, Math.min(playerY, arcY) - 50, arcX, arcY)
                .stroke({ color: 0xdff7eb, width: 2.2, alpha: 0.85 });

              castLure.position.set(arcX, arcY);

              // Impact ripples when lure hits water (castT > 0.8)
              if (castT > 0.8) {
                const impactT = (castT - 0.8) / 0.2;
                castSplash.visible = true;
                castSplash.clear()
                  .ellipse(fishX, fishY + 12, impactT * 75, impactT * 22)
                  .stroke({ color: 0x8fe6ff, width: 2.4, alpha: (1 - impactT) * 0.9 })
                  .ellipse(fishX, fishY + 12, impactT * 40, impactT * 12)
                  .stroke({ color: 0xffffff, width: 1.8, alpha: (1 - impactT) * 0.75 });
              } else {
                castSplash.visible = false;
              }
              fishingLine.visible = false;
            } else {
              castLine.visible = false;
              castLure.visible = false;
              castSplash.visible = false;
              fishingLine.visible = true;

              depthCue.visible = state.fishIntent === 'deep-dive' && encounterVisible;
              depthCue.position.set(fishX, fishY + 18);

              const actionStrength = state.event === 'line-damaged' || state.event === 'line-break'
                ? 1
                : state.event?.startsWith('action-') ? 0.9 : 0.58;

              const lineAlpha = state.event === 'line-break' ? 0
                : state.event === 'escaped' ? 0.14
                  : state.fishAction === 'release' ? 0.4
                    : state.fishAction === 'brace' ? 1 : fishArtworkVisible ? 0.92 : 0.52;

              drawLine(fishingLine, playerX, playerY, fishX, fishY, state.fishTension, lineAlpha, state.fishAction, elapsed);
              drawWake(waterWake, fishX, fishY, state.fishIntent, actionStrength, elapsed, isKing, state.bossPhase);

              const rippleStrength = Math.min(1, actionStrength + (state.fishIntent === 'recover' ? 0.15 : 0));
              for (let index = 0; index < waterRipples.length; index += 1) {
                const ripple = waterRipples[index]!;
                const cycle = (elapsed * (0.35 + index * 0.05) + index * 0.2) % 1;
                const rippleColor = isKing
                  ? (index === 0 ? 0xc89eff : 0x7655ba)
                  : (index === 0 ? 0xe5f4d8 : 0x8bc8bf);

                ripple.clear()
                  .ellipse(fishX, fishY + 14, 28 + cycle * 68 + index * 8, 8 + cycle * 16)
                  .stroke({ color: rippleColor, width: index === 0 ? 2.2 : 1.2, alpha: (1 - cycle) * 0.22 * rippleStrength });
              }

              // Splash droplets choreography
              const burst = feedbackPulse > 0.04 && (
                state.event === 'caught'
                || state.event === 'escaped'
                || state.event === 'line-break'
                || state.event === 'line-damaged'
                || state.event === 'fish-action'
                || state.event === 'fish-intent'
                || state.fishAction === 'pull'
              );

              for (let index = 0; index < splashParticles.length; index += 1) {
                const particle = splashParticles[index]!;
                const phaseProgress = (elapsed * 2.1 + index * 0.08) % 1;
                const angle = -Math.PI * 0.94 + (index / Math.max(1, splashParticles.length - 1)) * Math.PI * 0.88;
                const lift = burst ? phaseProgress * 48 : 0;
                particle.position.set(
                  fishX + Math.cos(angle) * (14 + phaseProgress * 46),
                  fishY + Math.sin(angle) * (12 + phaseProgress * 32) - lift,
                );
                particle.alpha = burst ? (1 - phaseProgress) * 0.88 : 0;
              }
            }
          }

          // Event Flash and Screen Highlights
          const eventColor = state.event === 'caught'
            ? 0xffea9f
            : state.event === 'line-break'
              ? 0xff5462
              : isKing && state.bossPhase === 3
                ? 0xd299ff
                : 0xa9e8db;

          eventFlash.tint = eventColor;
          eventFlash.alpha = feedbackPulse * (state.event === 'caught' ? 0.22 : state.event === 'line-break' ? 0.16 : 0.045);

          // Atmospheric lighting
          for (let index = 0; index < mistBands.length; index += 1) {
            const mist = mistBands[index]!;
            if (motion) mist.position.x = Math.sin(elapsed * 0.12 + index * 1.7) * (index + 1) * 8;
            mist.alpha = (observing ? 0.35 : state.event === 'caught' ? 0.44 : 0.6)
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
