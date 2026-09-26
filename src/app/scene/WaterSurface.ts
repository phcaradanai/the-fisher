import { Container, DisplacementFilter, Graphics, Point, Sprite, Texture } from 'pixi.js';
import { SCENE_HEIGHT, SCENE_WIDTH } from './scene-types';

type WaterDisturbance = {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  aspect: number;
  alpha: number;
  color: number;
};

export class WaterSurface {
  public readonly container = new Container();

  // Core Cinemagraph Image Sprites
  private readonly waterSprite = new Sprite(Texture.EMPTY);
  private readonly waterMaskSprite = new Sprite(Texture.EMPTY);
  private readonly reflectionSprite = new Sprite(Texture.EMPTY);
  private readonly displacementSprite = new Sprite(Texture.EMPTY);

  // Independent container for displacement sprite outside the filtered hierarchy
  public readonly displacementContainer = new Container();

  // PixiJS Displacement Filter for actual painted pixel movement
  private displacementFilter: DisplacementFilter | null = null;

  // Lightweight tactical ripple graphics (constrained inside water mask)
  private readonly rippleGraphics = new Graphics();

  // Disturbance state
  private baseFilterScaleX = 2.4;
  private baseFilterScaleY = 1.4;
  private targetFilterScaleX = 2.4;
  private targetFilterScaleY = 1.4;
  private currentFilterScaleX = 2.4;
  private currentFilterScaleY = 1.4;

  // Pre-allocated ripple pool (max 6 active ripples)
  private readonly ripples: WaterDisturbance[] = [];
  private nextAmbientPulseTime = 14;

  constructor() {
    // Configure Water Mask Sprite
    this.waterMaskSprite.width = SCENE_WIDTH;
    this.waterMaskSprite.height = SCENE_HEIGHT;
    this.waterMaskSprite.position.set(0, 0);

    // Configure Real Painted Water Sprite
    this.waterSprite.width = SCENE_WIDTH;
    this.waterSprite.height = SCENE_HEIGHT;
    this.waterSprite.position.set(0, 0);

    // Configure Image-Based Reflection Sprite
    this.reflectionSprite.width = SCENE_WIDTH;
    this.reflectionSprite.height = SCENE_HEIGHT;
    this.reflectionSprite.position.set(0, 0);
    this.reflectionSprite.alpha = 0.55;

    // Displacement Sprite is placed in its own container outside the filtered container
    this.displacementContainer.renderable = false;
    this.displacementContainer.addChild(this.displacementSprite);

    // Constrain the entire water container to the precise water matte
    this.container.addChild(
      this.waterMaskSprite,
      this.waterSprite,
      this.reflectionSprite,
      this.rippleGraphics,
    );
    this.container.mask = this.waterMaskSprite;

    // Pre-allocate ripples
    for (let i = 0; i < 6; i += 1) {
      this.ripples.push({
        active: false,
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 50,
        speed: 35,
        aspect: 0.32,
        alpha: 0.45,
        color: 0x9be8ff,
      });
    }
  }

  public setTextures(textures: {
    waterSource: Texture;
    waterMask: Texture;
    reflectionSource: Texture;
    displacementMap: Texture;
  }): void {
    this.waterSprite.texture = textures.waterSource;
    this.waterMaskSprite.texture = textures.waterMask;
    this.reflectionSprite.texture = textures.reflectionSource;
    this.displacementSprite.texture = textures.displacementMap;

    // Ensure seamless repeating UV sampler
    if (textures.displacementMap.source) {
      textures.displacementMap.source.addressMode = 'repeat';
    }

    // Initialize DisplacementFilter with subtle target displacement (1-3 px)
    this.displacementFilter = new DisplacementFilter({
      sprite: this.displacementSprite,
      scale: new Point(this.baseFilterScaleX, this.baseFilterScaleY),
    });

    this.container.filters = [this.displacementFilter];
  }

  public triggerDisturbance(
    type: 'cast' | 'reel' | 'pull' | 'release' | 'brace' | 'thrash' | 'catch' | 'ambient',
    x: number,
    y: number,
  ): void {
    const isMajor = type === 'cast' || type === 'catch' || type === 'thrash' || type === 'pull';
    const boost = type === 'cast' ? 2.8 : type === 'catch' ? 3.4 : isMajor ? 2.0 : 1.2;

    this.targetFilterScaleX = this.baseFilterScaleX + boost;
    this.targetFilterScaleY = this.baseFilterScaleY + boost * 0.65;

    // Spawn 1-2 subtle concentric ripples for tactile gameplay feedback
    const rippleCount = type === 'cast' ? 2 : type === 'catch' ? 3 : 1;
    for (let i = 0; i < rippleCount; i += 1) {
      const r = this.ripples.find((item) => !item.active);
      if (!r) break;
      r.active = true;
      r.x = x + (i * 4 - 2);
      r.y = y + (i * 2 - 1);
      r.radius = 4 + i * 8;
      r.maxRadius = type === 'cast' ? 85 : type === 'catch' ? 110 : isMajor ? 70 : 40;
      r.speed = 30 + (isMajor ? 15 : 5);
      r.aspect = 0.28 + (y / SCENE_HEIGHT) * 0.08;
      r.alpha = type === 'cast' ? 0.45 : type === 'catch' ? 0.55 : 0.35;
      r.color = type === 'cast' ? 0xbfeaff : type === 'thrash' ? 0xffdfaa : 0x8fe6dc;
    }
  }

  public update(
    deltaSec: number,
    elapsed: number,
    isKing: boolean,
    bossPhase: 1 | 2 | 3 | null,
    reducedMotion: boolean,
  ): void {
    const motion = reducedMotion ? 0.1 : 1.0;

    // 1. King Fish Environmental Pressure: Strengthens deep water displacement
    const kingBoost = isKing ? (bossPhase === 3 ? 1.6 : bossPhase === 2 ? 1.0 : 0.6) : 0;
    const effectiveBaseX = this.baseFilterScaleX + kingBoost;
    const effectiveBaseY = this.baseFilterScaleY + kingBoost * 0.6;

    // Smoothly relax disturbance impulse back to base scale
    const relaxSpeed = deltaSec * 2.2;
    this.targetFilterScaleX = Math.max(effectiveBaseX, this.targetFilterScaleX - relaxSpeed * 3);
    this.targetFilterScaleY = Math.max(effectiveBaseY, this.targetFilterScaleY - relaxSpeed * 2);

    this.currentFilterScaleX += (this.targetFilterScaleX - this.currentFilterScaleX) * 0.12;
    this.currentFilterScaleY += (this.targetFilterScaleY - this.currentFilterScaleY) * 0.12;

    // 2. Seamless UV Displacement Texture Drift (gentle horizontal canal flow)
    this.displacementSprite.x = (this.displacementSprite.x + 16.0 * deltaSec * motion) % 512;
    this.displacementSprite.y = (this.displacementSprite.y + 7.0 * deltaSec * motion) % 512;

    // Update filter scale
    if (this.displacementFilter) {
      this.displacementFilter.scale.x = this.currentFilterScaleX;
      this.displacementFilter.scale.y = this.currentFilterScaleY;
    }

    // 3. Image-Based Reflection Movement (subtle vertical shimmer & breathing brightness)
    // Moon reflection column and warm lantern lights breathe organically with water flow
    const reflPulse = Math.sin(elapsed * 0.65 * motion) * 0.08 + Math.cos(elapsed * 1.3 * motion) * 0.04;
    const bossDisruption = isKing ? (bossPhase === 3 ? 0.25 : 0.12) : 0;
    this.reflectionSprite.alpha = Math.max(0.2, (0.52 + reflPulse) * (1.0 - bossDisruption));

    // 4. Autonomous Storytelling Water Pulse (idle breathing)
    if (elapsed > this.nextAmbientPulseTime) {
      this.nextAmbientPulseTime = elapsed + 18 + Math.random() * 12;
      const rx = 440 + Math.random() * 320;
      const ry = 360 + Math.random() * 220;
      this.triggerDisturbance('ambient', rx, ry);
    }

    // 5. Draw Tactical Ripples (smooth, elegant, and constrained inside mask)
    this.drawRipples(deltaSec);
  }

  private drawRipples(deltaSec: number): void {
    const g = this.rippleGraphics;
    g.clear();

    for (let i = 0; i < this.ripples.length; i += 1) {
      const r = this.ripples[i]!;
      if (!r.active) continue;

      r.radius += r.speed * deltaSec;
      const progress = r.radius / r.maxRadius;
      if (progress >= 1.0) {
        r.active = false;
        continue;
      }

      const alpha = (1.0 - progress) * r.alpha;
      const rx = r.radius;
      const ry = r.radius * r.aspect;

      // Outer ripple crest
      g.ellipse(r.x, r.y, rx, ry).stroke({
        color: r.color,
        width: 1.2,
        alpha,
      });

      // Subtle inner trailing wave
      if (r.radius > 14) {
        const innerProgress = (r.radius - 10) / r.maxRadius;
        if (innerProgress < 1.0) {
          g.ellipse(r.x, r.y, rx - 10, (rx - 10) * r.aspect).stroke({
            color: 0xffffff,
            width: 0.8,
            alpha: (1.0 - innerProgress) * r.alpha * 0.45,
          });
        }
      }
    }
  }

  public destroy(): void {
    if (this.displacementFilter) {
      this.displacementFilter.destroy();
      this.displacementFilter = null;
    }
    this.container.destroy({ children: true });
  }
}
