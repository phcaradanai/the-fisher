import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { LANTERN_SPOTS, MOON_CENTER, SCENE_HEIGHT, SCENE_WIDTH } from './scene-types';

type FireflyParticle = {
  tier: 'far' | 'mid' | 'near';
  baseX: number;
  baseY: number;
  phase: number;
  speedX: number;
  speedY: number;
  rangeX: number;
  rangeY: number;
  color: number;
  radius: number;
  baseAlpha: number;
};

export class AtmosphereLayer {
  // Independent depth containers matching virtual camera layers
  public readonly farAtmosphere = new Container();     // Depth 0.04 (Sky, Moon, Distant Village)
  public readonly midAtmosphere = new Container();     // Depth 0.40 (Midground Water, Bank, Reeds)
  public readonly nearAtmosphere = new Container();    // Depth 1.15 (Foreground Dock, Reeds, Veil)

  // Moon Halo and Radiance
  private readonly moonHaloSprite = new Sprite(Texture.EMPTY);

  // Calibrated Lantern Glow Emitters
  private readonly lanternGlowSprites: Sprite[] = [];
  private readonly dockLanternGlow = new Sprite(Texture.EMPTY);

  // Painterly Organic Mist Sprites (Zero geometric ellipses)
  private readonly farMistSprite = new Sprite(Texture.EMPTY);
  private readonly midMistSprite = new Sprite(Texture.EMPTY);

  // Independent Tiered Fireflies
  private readonly farFirefliesGraphics = new Graphics();
  private readonly midFirefliesGraphics = new Graphics();
  private readonly nearFirefliesGraphics = new Graphics();

  private readonly fireflies: FireflyParticle[] = [
    // Far Tier (tiny, dim, slow, far parallax)
    { tier: 'far', baseX: 350, baseY: 230, phase: 0.2, speedX: 0.25, speedY: 0.35, rangeX: 16, rangeY: 7, color: 0xc8f5d0, radius: 1.2, baseAlpha: 0.35 },
    { tier: 'far', baseX: 540, baseY: 215, phase: 1.8, speedX: 0.30, speedY: 0.22, rangeX: 14, rangeY: 6, color: 0xffe6a3, radius: 1.1, baseAlpha: 0.40 },
    { tier: 'far', baseX: 730, baseY: 225, phase: 3.1, speedX: 0.22, speedY: 0.30, rangeX: 18, rangeY: 8, color: 0xc8f5d0, radius: 1.3, baseAlpha: 0.32 },
    { tier: 'far', baseX: 440, baseY: 260, phase: 4.5, speedX: 0.28, speedY: 0.38, rangeX: 15, rangeY: 7, color: 0xffe6a3, radius: 1.0, baseAlpha: 0.38 },

    // Mid Tier (normal, warm green/amber, hovering near reeds and water)
    { tier: 'mid', baseX: 320, baseY: 380, phase: 0.5, speedX: 0.45, speedY: 0.55, rangeX: 25, rangeY: 14, color: 0xa8ffd0, radius: 2.2, baseAlpha: 0.65 },
    { tier: 'mid', baseX: 450, baseY: 480, phase: 2.1, speedX: 0.38, speedY: 0.48, rangeX: 30, rangeY: 16, color: 0xffdf7a, radius: 2.4, baseAlpha: 0.70 },
    { tier: 'mid', baseX: 610, baseY: 420, phase: 3.7, speedX: 0.42, speedY: 0.58, rangeX: 28, rangeY: 15, color: 0xa8ffd0, radius: 2.0, baseAlpha: 0.60 },
    { tier: 'mid', baseX: 760, baseY: 390, phase: 1.2, speedX: 0.50, speedY: 0.40, rangeX: 24, rangeY: 13, color: 0xffdf7a, radius: 2.3, baseAlpha: 0.65 },
    { tier: 'mid', baseX: 890, baseY: 460, phase: 4.8, speedX: 0.35, speedY: 0.46, rangeX: 32, rangeY: 18, color: 0xa8ffd0, radius: 2.1, baseAlpha: 0.55 },
    { tier: 'mid', baseX: 980, baseY: 530, phase: 2.9, speedX: 0.40, speedY: 0.54, rangeX: 26, rangeY: 15, color: 0xffdf7a, radius: 2.2, baseAlpha: 0.60 },

    // Near Tier (rare, larger, soft bloom, camera pass)
    { tier: 'near', baseX: 540, baseY: 580, phase: 0.8, speedX: 0.18, speedY: 0.28, rangeX: 65, rangeY: 36, color: 0xfff0ad, radius: 4.2, baseAlpha: 0.85 },
    { tier: 'near', baseX: 880, baseY: 640, phase: 2.5, speedX: 0.15, speedY: 0.24, rangeX: 55, rangeY: 32, color: 0xd4ffdc, radius: 3.8, baseAlpha: 0.75 },
  ];

  constructor() {
    // 1. Far Atmosphere Setup
    this.moonHaloSprite.anchor.set(0.5);
    this.moonHaloSprite.position.set(MOON_CENTER.x, MOON_CENTER.y);
    this.moonHaloSprite.width = 300;
    this.moonHaloSprite.height = 300;
    this.moonHaloSprite.alpha = 0.14;

    this.farMistSprite.width = SCENE_WIDTH;
    this.farMistSprite.height = SCENE_HEIGHT;
    this.farMistSprite.alpha = 0.28;

    this.farAtmosphere.addChild(
      this.moonHaloSprite,
      this.farMistSprite,
      this.farFirefliesGraphics,
    );

    // Initialize Far Background Lantern Glow Emitters (skip index 0 which is the foreground dock lantern)
    for (let i = 1; i < LANTERN_SPOTS.length; i += 1) {
      const spot = LANTERN_SPOTS[i]!;
      const sprite = new Sprite(Texture.EMPTY);
      sprite.anchor.set(0.5);
      sprite.position.set(spot.x, spot.y);
      sprite.width = spot.radius * 3.2;
      sprite.height = spot.radius * 3.2;
      sprite.alpha = spot.intensity * 0.45;
      this.lanternGlowSprites.push(sprite);
      this.farAtmosphere.addChild(sprite);
    }

    // 2. Mid Atmosphere Setup
    this.midMistSprite.width = SCENE_WIDTH;
    this.midMistSprite.height = SCENE_HEIGHT;
    this.midMistSprite.alpha = 0.35;

    this.midAtmosphere.addChild(
      this.midMistSprite,
      this.midFirefliesGraphics,
    );

    // 3. Near Atmosphere Setup
    // Foreground Dock Lantern Optical Glow (calibrated to actual lantern at x=25, y=281)
    const dockSpot = LANTERN_SPOTS[0]!;
    this.dockLanternGlow.anchor.set(0.5);
    this.dockLanternGlow.position.set(dockSpot.x, dockSpot.y);
    this.dockLanternGlow.width = dockSpot.radius * 4.6;
    this.dockLanternGlow.height = dockSpot.radius * 4.6;
    this.dockLanternGlow.alpha = 0.52;

    this.nearAtmosphere.addChild(
      this.dockLanternGlow,
      this.nearFirefliesGraphics,
    );
  }

  public setTextures(textures: {
    lanternGlow: Texture;
    mistFar: Texture;
    mistNear: Texture;
  }): void {
    this.moonHaloSprite.texture = textures.lanternGlow;
    this.farMistSprite.texture = textures.mistFar;
    this.midMistSprite.texture = textures.mistNear;
    this.dockLanternGlow.texture = textures.lanternGlow;

    for (let i = 0; i < this.lanternGlowSprites.length; i += 1) {
      this.lanternGlowSprites[i]!.texture = textures.lanternGlow;
    }
  }

  public update(deltaSec: number, elapsed: number, reducedMotion: boolean, isObserving = false): void {
    const motion = reducedMotion ? 0.1 : 1.0;

    // 1. Living Moon Halo (Slow, majestic breathing pulsation, period ~24s)
    const moonBreath = Math.sin(elapsed * 0.26 * motion) * 0.035;
    this.moonHaloSprite.alpha = (0.13 + moonBreath) * (isObserving ? 0.6 : 1.0);
    this.moonHaloSprite.scale.set(1.0 + moonBreath * 0.4);

    // 2. Optical Lantern Light Breathing (Subtle multi-frequency organic shimmer)
    // Dock lantern:
    const dockFlicker = Math.sin(elapsed * 3.2 * motion) * 0.04
      + Math.sin(elapsed * 7.1 * motion) * 0.02
      + Math.cos(elapsed * 1.5 * motion) * 0.025;
    this.dockLanternGlow.alpha = Math.max(0.2, (0.50 + dockFlicker));

    // Background lanterns:
    for (let i = 0; i < this.lanternGlowSprites.length; i += 1) {
      const spot = LANTERN_SPOTS[i + 1]!;
      const sprite = this.lanternGlowSprites[i]!;
      const flicker = Math.sin(elapsed * 3.5 * motion + spot.phase) * 0.04
        + Math.sin(elapsed * 8.2 * motion + spot.phase * 1.7) * 0.02;
      sprite.alpha = Math.max(0.15, (spot.intensity * 0.42 + flicker));
    }

    // 3. Multi-Layer Organic Mist Drift (Gentle continuous horizontal motion)
    const farDrift = Math.sin(elapsed * 0.12 * motion) * 20;
    this.farMistSprite.position.x = farDrift;
    this.farMistSprite.alpha = (isObserving ? 0.18 : 0.28) + Math.sin(elapsed * 0.22 * motion) * 0.04;

    const midDrift = Math.sin(elapsed * 0.16 * motion + 1.2) * 28;
    this.midMistSprite.position.x = midDrift;
    this.midMistSprite.alpha = (isObserving ? 0.22 : 0.35) + Math.sin(elapsed * 0.29 * motion) * 0.05;

    // 4. Update 3-Tier Fireflies (Each drawn into its own independent depth container)
    this.updateFireflies(deltaSec, elapsed, motion, isObserving);
  }

  private updateFireflies(_deltaSec: number, elapsed: number, motion: number, isObserving: boolean): void {
    const fg = this.farFirefliesGraphics;
    const mg = this.midFirefliesGraphics;
    const ng = this.nearFirefliesGraphics;

    fg.clear();
    mg.clear();
    ng.clear();

    const obsDim = isObserving ? 0.5 : 1.0;

    for (let i = 0; i < this.fireflies.length; i += 1) {
      const f = this.fireflies[i]!;

      // Organic flight trajectory combining two asynchronous sine waves
      const curX = f.baseX + Math.sin(elapsed * f.speedX * motion + f.phase) * f.rangeX
        + Math.cos(elapsed * f.speedX * 0.5 * motion) * (f.rangeX * 0.3);
      const curY = f.baseY + Math.cos(elapsed * f.speedY * motion + f.phase) * f.rangeY
        + Math.sin(elapsed * f.speedY * 0.4 * motion) * (f.rangeY * 0.25);

      // Gentle brightness pulsing
      const pulse = Math.sin(elapsed * 2.4 * motion + f.phase * 3.1) * 0.25
        + Math.sin(elapsed * 4.8 * motion + f.phase) * 0.15;
      const alpha = Math.max(0.08, (f.baseAlpha + pulse) * obsDim);

      if (f.tier === 'far') {
        fg.circle(curX, curY, f.radius).fill({ color: f.color, alpha });
      } else if (f.tier === 'mid') {
        // Core
        mg.circle(curX, curY, f.radius).fill({ color: f.color, alpha });
        // Soft aura
        mg.circle(curX, curY, f.radius * 2.2).fill({ color: f.color, alpha: alpha * 0.25 });
      } else {
        // Near firefly with soft luminous halo
        ng.circle(curX, curY, f.radius * 3.2).fill({ color: f.color, alpha: alpha * 0.18 });
        ng.circle(curX, curY, f.radius * 1.8).fill({ color: f.color, alpha: alpha * 0.45 });
        ng.circle(curX, curY, f.radius).fill({ color: 0xffffff, alpha: alpha * 0.9 });
      }
    }
  }

  public destroy(): void {
    this.farAtmosphere.destroy({ children: true });
    this.midAtmosphere.destroy({ children: true });
    this.nearAtmosphere.destroy({ children: true });
  }
}
