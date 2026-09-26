import type { Container } from 'pixi.js';

export class ParallaxRig {
  // Smoothed camera state in virtual pixels
  private cameraX = 0;
  private cameraY = 0;

  // Normalized pointer coordinates [-1, 1]
  private targetPointerX = 0;
  private targetPointerY = 0;
  private lastPointerTime = 0;

  // Maximum foreground displacement in virtual pixels (strictly 3-6 px per brief)
  private readonly maxDisplacementX = 4.8;
  private readonly maxDisplacementY = 2.4;

  // Strong exponential cinematic smoothing (no direct cursor chasing)
  private readonly smoothing = 0.035;

  public setPointer(normX: number, normY: number): void {
    this.targetPointerX = Math.max(-1, Math.min(1, normX));
    this.targetPointerY = Math.max(-1, Math.min(1, normY));
    this.lastPointerTime = performance.now();
  }

  public resetPointer(): void {
    this.targetPointerX = 0;
    this.targetPointerY = 0;
  }

  public update(deltaSec: number, elapsed: number, reducedMotion: boolean, isTouch = false): void {
    if (reducedMotion) {
      this.cameraX += (0 - this.cameraX) * 0.15;
      this.cameraY += (0 - this.cameraY) * 0.15;
      return;
    }

    // Ambient viewpoint breathing drift (period: ~31s and ~47s, very subtle, < 0.4px)
    // Combines two prime low-frequency signals so camera never loops noticeably
    const ambientDriftX = (Math.sin(elapsed * 0.203) * 0.65 + Math.sin(elapsed * 0.134) * 0.35) * 0.35;
    const ambientDriftY = (Math.cos(elapsed * 0.171) * 0.70 + Math.cos(elapsed * 0.118) * 0.30) * 0.25;

    // Pointer influence fades out when idle (> 3.5s) or on touch devices
    const idleTime = performance.now() - this.lastPointerTime;
    const pointerActive = !isTouch && idleTime < 3500;
    const pointerWeight = pointerActive ? Math.min(1, Math.max(0, 1 - (idleTime - 2500) / 1000)) : 0;

    const targetX = this.targetPointerX * pointerWeight * this.maxDisplacementX + ambientDriftX;
    const targetY = this.targetPointerY * pointerWeight * this.maxDisplacementY + ambientDriftY;

    // Exponential smoothing with frame-rate independence
    const factor = 1 - Math.exp(-this.smoothing * (deltaSec * 60));
    this.cameraX += (targetX - this.cameraX) * factor;
    this.cameraY += (targetY - this.cameraY) * factor;
  }

  public getOffset(depthFactor: number): { x: number; y: number } {
    return {
      x: -this.cameraX * depthFactor,
      y: -this.cameraY * depthFactor,
    };
  }

  public applyTo(container: Container, depthFactor: number, baseX = 0, baseY = 0): void {
    const offset = this.getOffset(depthFactor);
    container.position.set(baseX + offset.x, baseY + offset.y);
  }
}
