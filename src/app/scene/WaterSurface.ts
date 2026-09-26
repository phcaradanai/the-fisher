import { Container, Graphics } from 'pixi.js';
import { SCENE_HEIGHT } from './scene-types';

type ActiveRipple = {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  aspect: number;
  color: number;
  alpha: number;
  strokeWidth: number;
};

type ShimmerLineData = {
  baseY: number;
  width: number;
  speed: number;
  phase: number;
  x: number;
  depthScale: number;
};

export class WaterSurface {
  public readonly container = new Container();

  private readonly moonReflection = new Graphics();
  private readonly lanternReflections = new Graphics();
  private readonly specularWaves = new Graphics();
  private readonly caustics = new Graphics();
  private readonly disturbanceGraphics = new Graphics();

  // Pre-allocated ripple pool (no allocations during gameplay)
  private readonly maxRipples = 16;
  private readonly ripples: ActiveRipple[] = [];

  // Procedural shimmer line data
  private readonly shimmerLines: ShimmerLineData[] = [];

  // Idle storytelling ambient ripple timer
  private nextAmbientRippleTime = 12;

  // External disturbance strength from combat actions
  private disturbanceStrength = 0;

  constructor() {
    this.container.addChild(
      this.caustics,
      this.lanternReflections,
      this.moonReflection,
      this.specularWaves,
      this.disturbanceGraphics,
    );

    // Initialize ripple pool
    for (let i = 0; i < this.maxRipples; i += 1) {
      this.ripples.push({
        active: false,
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 60,
        speed: 30,
        aspect: 0.32,
        color: 0x8fe6dc,
        alpha: 0.5,
        strokeWidth: 1.5,
      });
    }

    // Generate fixed data for procedural surface shimmer lines
    // Distributed across the canal surface
    const lineCount = 22;
    for (let i = 0; i < lineCount; i += 1) {
      const depthT = i / (lineCount - 1);
      const baseY = 260 + depthT * 480;
      const width = 28 + depthT * 55 + (i % 4) * 10;
      const speed = (5 + (i % 3) * 4) * (0.6 + depthT * 0.6);
      const phase = (i * 1.57) % (Math.PI * 2);
      const x = 240 + ((i * 93) % 640);

      this.shimmerLines.push({
        baseY,
        width,
        speed,
        phase,
        x,
        depthScale: 0.5 + depthT * 0.7,
      });
    }
  }

  public triggerDisturbance(
    type: 'cast' | 'reel' | 'pull' | 'release' | 'brace' | 'thrash' | 'catch' | 'ambient',
    x: number,
    y: number,
  ): void {
    const isBig = type === 'cast' || type === 'pull' || type === 'thrash' || type === 'catch';
    const rippleCount = type === 'cast' ? 3 : type === 'catch' ? 4 : isBig ? 2 : 1;
    this.disturbanceStrength = Math.min(1.5, this.disturbanceStrength + (isBig ? 0.8 : 0.35));

    for (let r = 0; r < rippleCount; r += 1) {
      const freeRipple = this.ripples.find((item) => !item.active);
      if (!freeRipple) break;

      freeRipple.active = true;
      freeRipple.x = x + (Math.random() - 0.5) * (r * 12);
      freeRipple.y = y + (Math.random() - 0.5) * (r * 6);
      freeRipple.radius = 4 + r * 10;
      freeRipple.maxRadius = type === 'cast' ? 95 : type === 'catch' ? 120 : isBig ? 80 : 45;
      freeRipple.speed = 28 + (isBig ? 18 : 8);
      freeRipple.aspect = 0.28 + (y / SCENE_HEIGHT) * 0.08;
      freeRipple.color = type === 'cast' ? 0x9be8ff : type === 'thrash' ? 0xffdfaa : 0x8fe6dc;
      freeRipple.alpha = 0.55 - r * 0.12;
      freeRipple.strokeWidth = r === 0 ? 2.2 : 1.4;
    }
  }

  public update(
    deltaSec: number,
    elapsed: number,
    isKing: boolean,
    bossPhase: 1 | 2 | 3 | null,
    reducedMotion: boolean,
  ): void {
    const motion = reducedMotion ? 0.15 : 1;
    this.disturbanceStrength = Math.max(0, this.disturbanceStrength - deltaSec * 0.9);

    // Idle storytelling ambient water pulse
    if (elapsed > this.nextAmbientRippleTime) {
      this.nextAmbientRippleTime = elapsed + 18 + Math.random() * 16;
      const ambientX = 380 + Math.random() * 400;
      const ambientY = 340 + Math.random() * 240;
      this.triggerDisturbance('ambient', ambientX, ambientY);
    }

    // 1. Draw Moon Reflection Column (aligned with actual painting coordinates x ~ 485)
    this.drawMoonReflection(elapsed, isKing, bossPhase, motion);

    // 2. Draw Warm Lantern Reflections (aligned with stilt houses at x ~ 604 and dock at x ~ 28)
    this.drawLanternReflections(elapsed, motion);

    // 3. Draw Specular Water Waves & Shimmer Lines
    this.drawSpecularWaves(deltaSec, elapsed, motion);

    // 4. Update & Draw Disturbance Ripples
    this.drawRipples(deltaSec);

    // 5. Ambient Caustics
    this.drawCaustics(elapsed, motion);
  }

  private drawMoonReflection(
    elapsed: number,
    isKing: boolean,
    bossPhase: 1 | 2 | 3 | null,
    motion: number,
  ): void {
    const g = this.moonReflection;
    g.clear();

    const bossDisruption = isKing ? (bossPhase === 3 ? 0.45 : bossPhase === 2 ? 0.28 : 0.14) : 0;
    // Asynchronous dual sinusoidal brightness pulse
    const basePulse = Math.sin(elapsed * 0.34 * motion) * 0.14 + Math.sin(elapsed * 0.68 * motion) * 0.09;
    const columnAlpha = (0.55 + basePulse) * (1 - bossDisruption * 0.5);

    // The moonlight reflection column runs down at x ~ 485, undulating with canal perspective
    const stepCount = 18;
    for (let i = 0; i < stepCount; i += 1) {
      const t = i / (stepCount - 1);
      const y = 245 + t * 495;

      // Natural canal bend: center shifts slightly with depth
      const baseX = 485 + Math.sin(y * 0.008) * 18 - t * 12;
      const driftX = Math.sin(y * 0.025 + elapsed * 1.3 * motion) * 6 * motion;
      const curX = baseX + driftX;

      // Perspective width spreading
      const colWidth = 26 + t * 80 + Math.sin(y * 0.04 + elapsed * 1.9 * motion) * (5 + t * 8);

      const waveShift = Math.sin(elapsed * 2.2 * motion + i * 0.5) * 2;
      const stripAlpha = Math.max(0, (0.24 - t * 0.08) * columnAlpha * (1 + waveShift * 0.12));

      // 1. Soft elliptical sheen under the crest
      g.ellipse(curX, y, colWidth * 0.5, 4 + t * 3)
        .fill({
          color: isKing ? 0x9068d8 : 0x8fe6dc,
          alpha: stripAlpha * 0.45,
        });

      // 2. Curved specular wave crest (natural arc instead of flat line)
      const waveArch = (1.5 + t * 1.5) * Math.sin(curX * 0.02 + elapsed * 2.1 * motion + i);
      const halfW = colWidth * 0.38;

      g.moveTo(curX - halfW, y)
        .quadraticCurveTo(curX, y + waveArch, curX + halfW, y)
        .stroke({
          color: isKing && bossPhase === 3 ? 0xd0b4ff : 0xf2faf5,
          width: 1.4 + t * 1.0,
          alpha: stripAlpha * 1.25,
        });
    }
  }

  private drawLanternReflections(elapsed: number, motion: number): void {
    const g = this.lanternReflections;
    g.clear();

    // 1. Right stilt house lantern reflection column: x ~ 604, y: 310 to 390
    const houseAlpha = 0.22 + Math.sin(elapsed * 2.8 * motion + 1) * 0.05;
    for (let i = 0; i < 6; i += 1) {
      const t = i / 5;
      const y = 310 + t * 80;
      const w = 16 + t * 24;
      const sway = Math.sin(y * 0.05 + elapsed * 1.6 * motion + 0.8) * 3 * motion;
      const curX = 604 + sway;

      // Soft warm sheen
      g.ellipse(curX, y, w * 0.45, 3.5)
        .fill({
          color: 0xff9828,
          alpha: houseAlpha * (1 - t * 0.3) * 0.4,
        });

      // Curved ripple stroke
      g.moveTo(curX - w * 0.4, y)
        .quadraticCurveTo(curX, y + 1.2, curX + w * 0.4, y)
        .stroke({
          color: 0xffbb44,
          width: 1.5,
          alpha: houseAlpha * (1 - t * 0.28),
        });
    }

    // 2. Left dock lantern reflection: x ~ 28, y: 320 to 520
    const dockFlicker = Math.sin(elapsed * 3.2 * motion) * 0.05 + Math.cos(elapsed * 1.7 * motion) * 0.04;
    const dockAlpha = 0.28 + dockFlicker;
    for (let i = 0; i < 7; i += 1) {
      const t = i / 6;
      const y = 320 + t * 200;
      const w = 18 + t * 30;
      const sway = Math.sin(y * 0.04 + elapsed * 1.4 * motion) * 3.5 * motion;
      const curX = 28 + sway;

      g.ellipse(curX, y, w * 0.45, 4)
        .fill({
          color: 0xff9828,
          alpha: (dockAlpha * (1 - t * 0.35)) * 0.35,
        });

      g.moveTo(curX - w * 0.35, y)
        .quadraticCurveTo(curX, y + 1.4, curX + w * 0.35, y)
        .stroke({
          color: 0xffb74d,
          width: 1.6,
          alpha: dockAlpha * (1 - t * 0.32),
        });
    }
  }

  private drawSpecularWaves(deltaSec: number, elapsed: number, motion: number): void {
    const g = this.specularWaves;
    g.clear();

    const canalLeft = 200;
    const canalRight = 960;

    for (let i = 0; i < this.shimmerLines.length; i += 1) {
      const line = this.shimmerLines[i]!;

      // Drift horizontally with canal current
      line.x += line.speed * deltaSec * motion;
      if (line.x > canalRight) {
        line.x = canalLeft - line.width;
      }

      // Curved wave crest
      const waveWave = Math.sin(line.x * 0.03 + elapsed * 2.2 * motion + line.phase) * (1.5 * line.depthScale);
      const curY = line.baseY + waveWave;

      // Proximity to bright reflection column boosts brightness
      const moonDist = Math.abs(line.x - 485);
      const moonBoost = moonDist < 140 ? (1 - moonDist / 140) * 0.35 : 0;
      const baseAlpha = 0.08 + Math.sin(elapsed * 1.5 * motion + line.phase) * 0.04 + moonBoost;

      const waveArch = Math.sin(line.x * 0.04 + elapsed * 2.6 * motion) * 1.8 * line.depthScale;
      const halfW = line.width * 0.5;

      g.moveTo(line.x, curY)
        .quadraticCurveTo(line.x + halfW, curY + waveArch, line.x + line.width, curY - 0.8)
        .stroke({
          color: moonBoost > 0.15 ? 0xf4fdf8 : 0x8ecfc0,
          width: 1.2 * line.depthScale,
          alpha: Math.max(0, baseAlpha * (1 + this.disturbanceStrength * 0.45)),
        });
    }
  }

  private drawRipples(deltaSec: number): void {
    const g = this.disturbanceGraphics;
    g.clear();

    for (let i = 0; i < this.ripples.length; i += 1) {
      const r = this.ripples[i]!;
      if (!r.active) continue;

      r.radius += r.speed * deltaSec;
      const progress = r.radius / r.maxRadius;

      if (progress >= 1) {
        r.active = false;
        continue;
      }

      const currentAlpha = (1 - progress) * r.alpha;
      const rx = r.radius;
      const ry = r.radius * r.aspect;

      g.ellipse(r.x, r.y, rx, ry)
        .stroke({
          color: r.color,
          width: r.strokeWidth,
          alpha: currentAlpha,
        });

      // Second trailing echo ring
      if (r.radius > 16) {
        const innerProgress = (r.radius - 12) / r.maxRadius;
        if (innerProgress < 1) {
          g.ellipse(r.x, r.y, rx - 12, (rx - 12) * r.aspect)
            .stroke({
              color: 0xffffff,
              width: r.strokeWidth * 0.7,
              alpha: (1 - innerProgress) * r.alpha * 0.55,
            });
        }
      }
    }
  }

  private drawCaustics(elapsed: number, motion: number): void {
    const g = this.caustics;
    g.clear();

    // Deep water caustic ribbons across lower canal basin (y: 460 to 740)
    const ribbonCount = 4;
    for (let r = 0; r < ribbonCount; r += 1) {
      const baseY = 480 + r * 68;
      const phase = r * 1.9;
      const alpha = 0.038 + Math.sin(elapsed * 0.55 * motion + phase) * 0.016;

      g.moveTo(290, baseY);
      for (let x = 330; x <= 860; x += 70) {
        const cy = baseY + Math.sin(x * 0.014 + elapsed * 1.0 * motion + phase) * 7;
        g.lineTo(x, cy);
      }
      g.stroke({
        color: 0x5ebfae,
        width: 10 + r * 2.5,
        alpha,
      });
    }
  }
}
