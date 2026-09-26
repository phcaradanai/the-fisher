import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { TurnFishingAction, FishIntentType } from '../../game/core/fishing/turn-types';
import type { ArtworkProfile, SceneRenderState } from './scene-types';
import { SCENE_HEIGHT, SCENE_WIDTH } from './scene-types';

export class EncounterLayer {
  public readonly container = new Container();

  // Sprites & Graphics
  public readonly sceneArtwork = new Sprite(Texture.EMPTY);
  private readonly artworkVeil = new Graphics();
  private readonly kingAura = new Graphics();
  private readonly depthCue = new Graphics();
  private readonly fishingLine = new Graphics();
  private readonly waterWake = new Graphics();
  private readonly castLine = new Graphics();
  private readonly castLure = new Graphics();
  private readonly castSplash = new Graphics();
  private readonly splashParticles: Graphics[] = [];
  private readonly waterRipples: Graphics[] = [];
  public readonly bossVignette = new Graphics();
  public readonly eventFlash = new Graphics();

  constructor() {
    // Initialize Boss Vignette (deep atmospheric canal pressure, not comic purple)
    this.bossVignette.rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT).fill({ color: 0x02070e, alpha: 0 });

    // Initialize Event Flash
    this.eventFlash.rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT).fill({ color: 0xdff3dc, alpha: 0 });

    // Initialize Artwork
    this.sceneArtwork.anchor.set(0.5);
    this.sceneArtwork.position.set(SCENE_WIDTH * 0.67, SCENE_HEIGHT * 0.58);
    this.sceneArtwork.alpha = 0.84;
    this.sceneArtwork.visible = false;

    // Artwork mask for soft underwater feathering
    this.setupMask();

    // Underwater veil
    this.artworkVeil.rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT).fill({ color: 0x071a2a, alpha: 0.08 });
    this.artworkVeil.visible = false;

    // Depth cue
    for (let index = 0; index < 18; index += 1) {
      const depth = index / 17;
      this.depthCue
        .ellipse(0, 0, 136 - depth * 62, 74 - depth * 34)
        .fill({ color: 0x05131f, alpha: 0.022 });
    }
    this.depthCue.visible = false;

    // Cast Lure
    this.castLure
      .circle(0, 0, 4.5)
      .fill({ color: 0xffe88a })
      .circle(0, 0, 8)
      .stroke({ color: 0x8fe6ff, width: 1.5, alpha: 0.65 });
    this.castLine.visible = false;
    this.castLure.visible = false;
    this.castSplash.visible = false;

    // Splash droplets
    for (let i = 0; i < 12; i += 1) {
      const g = new Graphics()
        .circle(0, 0, i % 3 === 0 ? 3.5 : i % 2 === 0 ? 2.5 : 1.8)
        .fill({ color: i % 2 === 0 ? 0xe5f4d8 : 0x8dd3c9, alpha: 0.9 });
      this.splashParticles.push(g);
    }

    // Ripple graphics
    for (let i = 0; i < 5; i += 1) {
      this.waterRipples.push(new Graphics());
    }

    // Add children in depth order
    this.container.addChild(this.fishMask);
    this.container.addChild(
      this.bossVignette,
      this.depthCue,
      this.kingAura,
      this.sceneArtwork,
      this.waterRim,
      this.artworkVeil,
      this.waterWake,
      this.fishingLine,
      ...this.waterRipples,
      ...this.splashParticles,
      this.castLine,
      this.castLure,
      this.castSplash,
      this.eventFlash,
    );
  }

  private readonly fishMask = new Graphics();
  private readonly waterRim = new Graphics();

  private setupMask(): void {
    this.sceneArtwork.mask = this.fishMask;
  }

  public destroy(): void {
    this.fishMask.destroy();
    this.waterRim.destroy();
  }

  public update(
    state: SceneRenderState,
    profile: ArtworkProfile,
    artworkScale: number,
    elapsed: number,
    _deltaSec: number,
    feedbackPulse: number,
    castStartTime: number,
  ): void {
    const motion = state.reducedMotion ? 0 : 1;
    const isKing = state.fishRarity === 'king' || state.bossPhase !== null;
    const encounterVisible = state.showEncounter;
    const artReady = this.sceneArtwork.texture !== Texture.EMPTY;
    const fishArtworkVisible = encounterVisible && artReady;

    this.sceneArtwork.visible = fishArtworkVisible;
    this.artworkVeil.visible = fishArtworkVisible;

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

    // Boss Abyssal Vignette (subtle deep pressure)
    if (isKing) {
      const targetAlpha = state.bossPhase === 3 ? 0.22 : state.bossPhase === 2 ? 0.14 : 0.08;
      this.bossVignette.alpha += (targetAlpha - this.bossVignette.alpha) * 0.05;
    } else {
      this.bossVignette.alpha += (0 - this.bossVignette.alpha) * 0.08;
    }

    // Fish Positioning & Intent Motion
    if (artReady) {
      const artMotion = motion
        ? 1 + (state.bossPhase === 3 ? 0.024 : isKing ? 0.012 : 0.005) + Math.sin(elapsed * 1.15) * 0.004 + eventJolt * 0.009
        : 1;
      const fishScale = artworkScale * artMotion * (1 + (1 - distanceRatio) * 0.014);

      const intentMotion = state.fishIntent === 'power-dash'
        ? Math.sin(elapsed * 13) * 9
        : state.fishIntent === 'deep-dive'
          ? 46
          : state.fishIntent === 'thrash'
            ? Math.sin(elapsed * 18) * 11
            : state.fishIntent === 'recover'
              ? Math.sin(elapsed * 0.6) * 1.2
              : Math.sin(elapsed * 0.9) * 1.8;

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

      this.sceneArtwork.scale.set(fishScale);
      this.sceneArtwork.position.set(
        SCENE_WIDTH * 0.67 + profile.x + (profile.anchorX - profile.focusX) * this.sceneArtwork.texture.width * fishScale
          + actionHorizontal + (motion ? Math.sin(elapsed * 0.55) * 2.5 : 0)
          - eventJolt * (state.fishIntent === 'power-dash' ? 14 : 6),
        SCENE_HEIGHT * 0.58 + profile.y + (profile.anchorY - profile.focusY) * this.sceneArtwork.texture.height * fishScale
          + actionOffset + intentMotion + (motion ? Math.sin(elapsed * 0.7) * 1.5 : 0),
      );
      this.sceneArtwork.rotation = artTilt + (state.fishIntent === 'thrash' && motion ? Math.sin(elapsed * 15) * 0.016 : 0);

      const texW = this.sceneArtwork.texture.width || 800;
      const texH = this.sceneArtwork.texture.height || 600;
      const maskRadX = texW * fishScale * 0.44;
      const maskRadY = texH * fishScale * 0.38;

      this.fishMask.clear();
      this.fishMask
        .ellipse(this.sceneArtwork.position.x, this.sceneArtwork.position.y, maskRadX, maskRadY)
        .fill(0xffffff);

      this.waterRim.clear();
      this.waterRim
        .ellipse(this.sceneArtwork.position.x, this.sceneArtwork.position.y, maskRadX, maskRadY)
        .stroke({ color: 0x06202c, width: 14 * fishScale, alpha: 0.72 })
        .ellipse(this.sceneArtwork.position.x, this.sceneArtwork.position.y, maskRadX * 1.05, maskRadY * 1.05)
        .stroke({ color: 0x072a38, width: 8 * fishScale, alpha: 0.38 });
      this.waterRim.visible = this.sceneArtwork.visible;

      // Submerged depth grading
      const depthDarkening = (1 - distanceRatio * 0.28);
      this.sceneArtwork.alpha = (state.fishIntent === 'deep-dive' ? 0.62 : 0.86) * depthDarkening;

      // King Fish bioluminescent aura
      if (isKing) {
        this.kingAura.visible = true;
        this.kingAura.clear();
        const auraColor = state.bossPhase === 3 ? 0x3d7085 : 0x225163;
        const auraAlpha = (0.12 + Math.sin(elapsed * 1.8) * 0.05) * (state.bossPhase === 3 ? 1.2 : 0.85);
        this.kingAura
          .ellipse(this.sceneArtwork.position.x, this.sceneArtwork.position.y + 12, 110 * fishScale, 55 * fishScale)
          .fill({ color: auraColor, alpha: auraAlpha });
      } else {
        this.kingAura.visible = false;
      }
    }

    const showTactics = encounterVisible || state.event === 'line-break' || state.event === 'escaped' || state.event === 'fish-intent' || state.event === 'cast';

    if (showTactics) {
      const escapeDrift = state.event === 'escaped' ? (1 - feedbackPulse) * 68 : 0;
      const fishX = 780 - distanceRatio * 300 + escapeDrift + (motion ? Math.sin(elapsed * 1.4) * 5 : 0);
      const fishY = 472 + (state.fishIntent === 'deep-dive' ? 68 : state.fishIntent === 'power-dash' ? -15 : 0);
      const playerX = 272;
      const playerY = 650;

      // CAST Trajectory
      if (state.event === 'cast') {
        const castDuration = 0.68;
        const castElapsed = Math.min(castDuration, elapsed - castStartTime);
        const castT = Math.max(0, Math.min(1, castElapsed / castDuration));

        const arcX = playerX + (fishX - playerX) * castT;
        const arcY = playerY + (fishY - playerY) * castT - Math.sin(castT * Math.PI) * 200;

        this.castLine.visible = true;
        this.castLure.visible = true;
        this.castLine.clear()
          .moveTo(playerX, playerY)
          .quadraticCurveTo((playerX + arcX) / 2, Math.min(playerY, arcY) - 50, arcX, arcY)
          .stroke({ color: 0xdff7eb, width: 2.2, alpha: 0.85 });

        this.castLure.position.set(arcX, arcY);

        if (castT > 0.8) {
          const impactT = (castT - 0.8) / 0.2;
          this.castSplash.visible = true;
          this.castSplash.clear()
            .ellipse(fishX, fishY + 12, impactT * 75, impactT * 22)
            .stroke({ color: 0x8fe6ff, width: 2.4, alpha: (1 - impactT) * 0.9 })
            .ellipse(fishX, fishY + 12, impactT * 40, impactT * 12)
            .stroke({ color: 0xffffff, width: 1.8, alpha: (1 - impactT) * 0.75 });
        } else {
          this.castSplash.visible = false;
        }
        this.fishingLine.visible = false;
      } else {
        this.castLine.visible = false;
        this.castLure.visible = false;
        this.castSplash.visible = false;
        this.fishingLine.visible = true;

        this.depthCue.visible = state.fishIntent === 'deep-dive' && encounterVisible;
        this.depthCue.position.set(fishX, fishY + 18);

        const actionStrength = state.event === 'line-damaged' || state.event === 'line-break'
          ? 1
          : state.event?.startsWith('action-') ? 0.9 : 0.58;

        const lineAlpha = state.event === 'line-break' ? 0
          : state.event === 'escaped' ? 0.14
            : state.fishAction === 'release' ? 0.4
              : state.fishAction === 'brace' ? 1 : fishArtworkVisible ? 0.92 : 0.52;

        this.drawLine(playerX, playerY, fishX, fishY, state.fishTension, lineAlpha, state.fishAction, elapsed);
        this.drawWake(fishX, fishY, state.fishIntent, actionStrength, elapsed, isKing, state.bossPhase);

        const rippleStrength = Math.min(1, actionStrength + (state.fishIntent === 'recover' ? 0.15 : 0));
        for (let index = 0; index < this.waterRipples.length; index += 1) {
          const ripple = this.waterRipples[index]!;
          const cycle = (elapsed * (0.35 + index * 0.05) + index * 0.2) % 1;
          const rippleColor = isKing
            ? (index === 0 ? 0xc89eff : 0x7655ba)
            : (index === 0 ? 0xe5f4d8 : 0x8bc8bf);

          ripple.clear()
            .ellipse(fishX, fishY + 14, 28 + cycle * 68 + index * 8, 8 + cycle * 16)
            .stroke({ color: rippleColor, width: index === 0 ? 2.2 : 1.2, alpha: (1 - cycle) * 0.22 * rippleStrength });
        }

        // Splash droplets
        const burst = feedbackPulse > 0.04 && (
          state.event === 'caught'
          || state.event === 'escaped'
          || state.event === 'line-break'
          || state.event === 'line-damaged'
          || state.event === 'fish-action'
          || state.event === 'fish-intent'
          || state.fishAction === 'pull'
        );

        for (let index = 0; index < this.splashParticles.length; index += 1) {
          const particle = this.splashParticles[index]!;
          const phaseProgress = (elapsed * 2.1 + index * 0.08) % 1;
          const angle = -Math.PI * 0.94 + (index / Math.max(1, this.splashParticles.length - 1)) * Math.PI * 0.88;
          const lift = burst ? phaseProgress * 48 : 0;
          particle.position.set(
            fishX + Math.cos(angle) * (14 + phaseProgress * 46),
            fishY + Math.sin(angle) * (12 + phaseProgress * 32) - lift,
          );
          particle.alpha = burst ? (1 - phaseProgress) * 0.88 : 0;
        }
      }
    } else {
      this.fishingLine.visible = false;
      this.waterWake.visible = false;
      this.depthCue.visible = false;
    }

    // Event Flash
    const eventColor = state.event === 'caught'
      ? 0xffea9f
      : state.event === 'line-break'
        ? 0xff5462
        : isKing && state.bossPhase === 3
          ? 0xd299ff
          : 0xa9e8db;

    this.eventFlash.tint = eventColor;
    this.eventFlash.alpha = feedbackPulse * (state.event === 'caught' ? 0.22 : state.event === 'line-break' ? 0.16 : 0.045);
  }

  private drawLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    tension: number,
    alpha = 1,
    action: TurnFishingAction | null = null,
    elapsed = 0,
  ): void {
    const line = this.fishingLine;
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

    line
      .moveTo(startX, startY)
      .quadraticCurveTo(midX, midY, endX, endY)
      .stroke({
        color: coreColor,
        width: locked ? 3.6 : 2 + normalizedTension * 1.8,
        alpha,
      });
  }

  private drawWake(
    x: number,
    y: number,
    intent: FishIntentType | null,
    strength: number,
    elapsed: number,
    isKing = false,
    bossPhase: 1 | 2 | 3 | null = null,
  ): void {
    const wake = this.waterWake;
    const direction = intent === 'power-dash' || intent === 'steady-pull' ? -1 : 1;
    const baseLength = (32 + strength * 42) * (intent === 'power-dash' ? 1.8 : intent === 'steady-pull' ? 1.1 : 1);
    const length = isKing ? baseLength * 1.35 : baseLength;
    const wakeCount = intent === 'power-dash' ? 4 : intent === 'thrash' ? 5 : 3;

    wake.clear();

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
}
