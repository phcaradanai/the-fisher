import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { LANTERN_SPOTS, MOON_CENTER, SCENE_HEIGHT, SCENE_WIDTH } from './scene-types';

type FireflyData = {
  tier: 'far' | 'mid' | 'near';
  baseX: number;
  baseY: number;
  phase: number;
  freqX: number;
  freqY: number;
  amplitudeX: number;
  amplitudeY: number;
  color: number;
};

export class AtmosphereLayer {
  public readonly farContainer = new Container();     // Behind bridge (depth 0.12)
  public readonly midContainer = new Container();     // Water level (depth 0.38)
  public readonly foregroundContainer = new Container(); // Near camera veil (depth 1.15)

  // Moon Halo and rays (attached to farContainer)
  private readonly moonHalo = new Graphics();
  private readonly lightRays = new Graphics();

  // Lantern Halos (attached to farContainer)
  private readonly lanternHalos = new Graphics();

  // Mist layers
  private readonly farMist = new Graphics();
  private readonly midMist = new Graphics();
  private nearMistSprite: Sprite | null = null;

  // Vegetation graphics (in mid and foreground)
  private readonly foregroundReeds = new Graphics();

  // Firefly graphics
  private readonly firefliesGraphics = new Graphics();

  private readonly fireflies: FireflyData[] = [
    // Far tier (small, dim, slow)
    { tier: 'far', baseX: 340, baseY: 230, phase: 0.2, freqX: 0.3, freqY: 0.4, amplitudeX: 18, amplitudeY: 8, color: 0xc8f5d0 },
    { tier: 'far', baseX: 540, baseY: 210, phase: 1.8, freqX: 0.35, freqY: 0.25, amplitudeX: 14, amplitudeY: 7, color: 0xffe6a3 },
    { tier: 'far', baseX: 730, baseY: 220, phase: 3.1, freqX: 0.28, freqY: 0.38, amplitudeX: 20, amplitudeY: 9, color: 0xc8f5d0 },
    { tier: 'far', baseX: 440, baseY: 260, phase: 4.5, freqX: 0.32, freqY: 0.42, amplitudeX: 16, amplitudeY: 8, color: 0xffe6a3 },

    // Mid tier (standard, near reeds/stilt houses)
    { tier: 'mid', baseX: 280, baseY: 380, phase: 0.5, freqX: 0.5, freqY: 0.6, amplitudeX: 28, amplitudeY: 15, color: 0xa8ffd0 },
    { tier: 'mid', baseX: 420, baseY: 480, phase: 2.1, freqX: 0.42, freqY: 0.55, amplitudeX: 32, amplitudeY: 18, color: 0xffdf7a },
    { tier: 'mid', baseX: 610, baseY: 420, phase: 3.7, freqX: 0.48, freqY: 0.65, amplitudeX: 30, amplitudeY: 16, color: 0xa8ffd0 },
    { tier: 'mid', baseX: 760, baseY: 390, phase: 1.2, freqX: 0.55, freqY: 0.45, amplitudeX: 26, amplitudeY: 14, color: 0xffdf7a },
    { tier: 'mid', baseX: 890, baseY: 460, phase: 4.8, freqX: 0.38, freqY: 0.52, amplitudeX: 34, amplitudeY: 20, color: 0xa8ffd0 },
    { tier: 'mid', baseX: 990, baseY: 520, phase: 2.9, freqX: 0.45, freqY: 0.62, amplitudeX: 28, amplitudeY: 16, color: 0xffdf7a },

    // Near tier (camera crossing firefly)
    { tier: 'near', baseX: 520, baseY: 580, phase: 0.8, freqX: 0.22, freqY: 0.32, amplitudeX: 75, amplitudeY: 42, color: 0xfff0ad },
  ];

  constructor() {
    // Setup Far container
    this.farContainer.addChild(this.moonHalo, this.lightRays, this.lanternHalos, this.farMist);

    // Setup Mid container
    this.midContainer.addChild(this.midMist, this.firefliesGraphics);

    // Setup Foreground container
    this.foregroundContainer.addChild(this.foregroundReeds);
  }

  public setNearMistTexture(texture: Texture): void {
    if (this.nearMistSprite) {
      this.foregroundContainer.removeChild(this.nearMistSprite);
      this.nearMistSprite.destroy();
    }
    const sprite = new Sprite(texture);
    sprite.width = SCENE_WIDTH;
    sprite.height = SCENE_HEIGHT;
    sprite.alpha = 0.42;
    this.nearMistSprite = sprite;
    this.foregroundContainer.addChildAt(sprite, 0);
  }

  public update(_deltaSec: number, elapsed: number, reducedMotion: boolean, isObserving = false): void {
    const motion = reducedMotion ? 0.1 : 1;

    // 1. Living Moon Halo & Shafts
    this.updateMoon(elapsed, motion);

    // 2. Breathing Warm Lanterns
    this.updateLanterns(elapsed, motion);

    // 3. Multi-depth Spatial Mist
    this.updateMist(elapsed, motion, isObserving);

    // 4. Organic Vegetation Sway
    this.updateVegetation(elapsed, motion);

    // 5. 3-Tier Fireflies
    this.updateFireflies(elapsed, motion, isObserving);
  }

  private updateMoon(elapsed: number, motion: number): void {
    const g = this.moonHalo;
    g.clear();

    const mx = MOON_CENTER.x;
    const my = MOON_CENTER.y;

    // Slow breathing pulsation (period ~ 22s)
    const breath = Math.sin(elapsed * 0.28 * motion) * 0.035;
    const haloRadius = 118 + breath * 30;

    // Inner bright moon halo
    g.ellipse(mx, my, haloRadius, haloRadius)
      .fill({ color: 0xd6f0e4, alpha: 0.08 + breath });

    // Outer soft moon veil
    g.ellipse(mx, my, haloRadius * 1.8, haloRadius * 1.8)
      .fill({ color: 0xb0e8da, alpha: 0.035 + breath * 0.5 });

    // Light rays angling softly across the canal
    const r = this.lightRays;
    r.clear();
    const rayPulse = Math.sin(elapsed * 0.35 * motion) * 0.015;

    r.moveTo(mx - 20, my + 30)
      .lineTo(mx - 180, 480)
      .lineTo(mx - 80, 480)
      .closePath()
      .fill({ color: 0xdfe5c0, alpha: (0.038 + rayPulse) * motion });

    r.moveTo(mx + 10, my + 32)
      .lineTo(mx + 40, 490)
      .lineTo(mx + 130, 490)
      .closePath()
      .fill({ color: 0xf0dfb1, alpha: (0.032 + rayPulse * 0.8) * motion });
  }

  private updateLanterns(elapsed: number, motion: number): void {
    const g = this.lanternHalos;
    g.clear();

    for (let i = 0; i < LANTERN_SPOTS.length; i += 1) {
      const spot = LANTERN_SPOTS[i]!;
      // Multi-frequency organic flicker
      const flicker = Math.sin(elapsed * 3.4 * motion + spot.phase) * 0.07
        + Math.sin(elapsed * 7.8 * motion + spot.phase * 1.9) * 0.035
        + Math.cos(elapsed * 1.2 * motion) * 0.04;

      const alpha = Math.max(0, (0.24 + flicker) * spot.intensity);
      const rad = spot.radius * (1 + flicker * 0.6);

      // Warm amber core
      g.ellipse(spot.x, spot.y, rad * 0.55, rad * 0.55)
        .fill({ color: 0xffea94, alpha: alpha * 1.4 });

      // Outer soft golden lantern radiance
      g.ellipse(spot.x, spot.y, rad, rad)
        .fill({ color: 0xffa028, alpha: alpha * 0.6 });

      // Extended room bounce
      g.ellipse(spot.x, spot.y, rad * 1.8, rad * 1.8)
        .fill({ color: 0xff8818, alpha: alpha * 0.18 });
    }
  }

  private updateMist(elapsed: number, motion: number, isObserving: boolean): void {
    // Far Mist behind bridge (depth 0.12): very slow horizontal drift
    const fg = this.farMist;
    fg.clear();
    const farDriftX = ((elapsed * 4 * motion) % 300) - 150;
    const farAlpha = (isObserving ? 0.03 : 0.055) + Math.sin(elapsed * 0.25 * motion) * 0.015;

    fg.ellipse(400 + Math.sin(elapsed * 0.15 * motion) * 25 + farDriftX * 0.2, 205, 260, 22)
      .fill({ color: 0xd8e4d2, alpha: farAlpha });
    fg.ellipse(680 + Math.sin(elapsed * 0.18 * motion + 1) * 30 + farDriftX * 0.25, 218, 220, 20)
      .fill({ color: 0xcde0d8, alpha: farAlpha * 0.85 });

    // Mid Mist over water (depth 0.38): drifts across canal surface
    const mg = this.midMist;
    mg.clear();
    const midAlpha = (isObserving ? 0.025 : 0.05) + Math.sin(elapsed * 0.38 * motion + 0.5) * 0.018;

    mg.ellipse(360 + Math.sin(elapsed * 0.22 * motion) * 45, 340, 290, 32)
      .fill({ color: 0xd8e8de, alpha: midAlpha });
    mg.ellipse(680 + Math.cos(elapsed * 0.26 * motion + 1.2) * 55, 365, 340, 35)
      .fill({ color: 0xc4e2da, alpha: midAlpha * 0.9 });
    mg.ellipse(920 + Math.sin(elapsed * 0.2 * motion + 2.4) * 40, 325, 240, 26)
      .fill({ color: 0xdae2d0, alpha: midAlpha * 0.75 });

    // Near camera mist sprite
    if (this.nearMistSprite) {
      this.nearMistSprite.position.x = Math.sin(elapsed * 0.16 * motion) * 22;
      this.nearMistSprite.alpha = (isObserving ? 0.22 : 0.38) + Math.sin(elapsed * 0.31 * motion) * 0.08;
    }
  }

  private updateVegetation(elapsed: number, motion: number): void {
    const g = this.foregroundReeds;
    g.clear();

    // Wind gust modulation: slow natural gust cycles (period ~ 8s)
    const windGust = Math.sin(elapsed * 0.42 * motion) * 0.6 + Math.sin(elapsed * 0.85 * motion) * 0.4;

    // 12 Foreground reeds anchored at bottom right with individual phase offsets
    for (let i = 0; i < 12; i += 1) {
      const rx = 1010 + i * 16;
      const ry = SCENE_HEIGHT;
      const reedHeight = 110 + (i % 4) * 24;
      const reedWidth = 3.2 - (i % 3) * 0.4;

      // Unique phase per blade
      const bladePhase = i * 0.73;
      const bladeFreq = 0.9 + (i % 3) * 0.25;
      const bladeSway = (Math.sin(elapsed * bladeFreq * motion + bladePhase) * 12 + windGust * 10) * motion;

      const midX = rx + bladeSway * 0.4;
      const midY = ry - reedHeight * 0.55;
      const tipX = rx + bladeSway;
      const tipY = ry - reedHeight;

      g.moveTo(rx, ry)
        .quadraticCurveTo(midX, midY, tipX, tipY)
        .stroke({
          color: i % 2 === 0 ? 0x072228 : 0x092d34,
          width: reedWidth,
          alpha: 0.88,
        });

      // Hanging reed leaves
      if (i % 3 === 0) {
        g.moveTo(midX, midY)
          .quadraticCurveTo(midX - 14, midY - 6, midX - 22 + bladeSway * 0.2, midY + 12)
          .stroke({
            color: 0x0a333a,
            width: 1.8,
            alpha: 0.75,
          });
      }
    }

    // Left dock moss/ferns hanging down
    for (let i = 0; i < 6; i += 1) {
      const lx = 40 + i * 28;
      const ly = 320;
      const len = 35 + (i % 3) * 14;
      const sway = Math.sin(elapsed * 1.1 * motion + i * 0.9) * 4 * motion;

      g.moveTo(lx, ly)
        .quadraticCurveTo(lx + sway * 0.5, ly + len * 0.6, lx + sway, ly + len)
        .stroke({
          color: 0x09292e,
          width: 2.2,
          alpha: 0.7,
        });
    }
  }

  private updateFireflies(elapsed: number, motion: number, isObserving: boolean): void {
    const g = this.firefliesGraphics;
    g.clear();

    for (let i = 0; i < this.fireflies.length; i += 1) {
      const f = this.fireflies[i]!;

      // 3D trajectory calculation
      const xOffset = Math.sin(elapsed * f.freqX * motion + f.phase) * f.amplitudeX;
      const yOffset = Math.cos(elapsed * f.freqY * motion + f.phase * 1.3) * f.amplitudeY;
      const curX = f.baseX + xOffset * motion;
      const curY = f.baseY + yOffset * motion;

      // Pulse brightness
      const pulse = Math.sin(elapsed * 2.2 * motion + f.phase * 2.5) * 0.5 + 0.5;
      const baseAlpha = f.tier === 'far' ? 0.35 : f.tier === 'mid' ? 0.75 : 0.88;
      const alpha = isObserving ? baseAlpha * 0.4 : baseAlpha * (0.35 + pulse * 0.65);

      if (f.tier === 'far') {
        g.circle(curX, curY, 1.4)
          .fill({ color: f.color, alpha });
      } else if (f.tier === 'mid') {
        // Core
        g.circle(curX, curY, 2.2)
          .fill({ color: f.color, alpha });
        // Soft aura
        g.circle(curX, curY, 5.5)
          .fill({ color: f.color, alpha: alpha * 0.28 });
      } else {
        // Near camera firefly: large and soft
        g.circle(curX, curY, 3.8)
          .fill({ color: f.color, alpha: alpha * 0.95 });
        g.circle(curX, curY, 11)
          .fill({ color: f.color, alpha: alpha * 0.22 });
      }
    }
  }
}
