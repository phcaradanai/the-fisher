import type { Container } from 'pixi.js';

export class ParallaxRig {
  // Smoothed camera state
  private cameraX = 0;
  private cameraY = 0;

  // Target pointer position (-1 to 1)
  private targetPointerX = 0;
  private targetPointerY = 0;

  private lastPointerTime = 0;

  // Maximum foreground displacement in virtual scene pixels
  private readonly maxDisplacementX = 11;
  private readonly maxDisplacementY = 7;

  // Smoothing interpolation factor (lower = smoother/more cinematic)
  private readonly smoothing = 0.055;

  public setPointer(normX: number, normY: number): void {
    // Clamp to [-1, 1]
    this.targetPointerX = Math.max(-1, Math.min(1, normX));
    this.targetPointerY = Math.max(-1, Math.min(1, normY));
    this.lastPointerTime = performance.now();
  }

  public resetPointer(): void {
    this.targetPointerX = 0;
    this.targetPointerY = 0;
  }

  public update(deltaSec: number, elapsed: number, reducedMotion: boolean): void {
    if (reducedMotion) {
      this.cameraX += (0 - this.cameraX) * 0.2;
      this.cameraY += (0 - this.cameraY) * 0.2;
      return;
    }

    // Autonomous slow breathing drift (for mobile & idle desktop)
    // Dual asynchronous sine periods ensure natural non-looping sway
    const autoDriftX = Math.sin(elapsed * 0.21) * 0.65 + Math.sin(elapsed * 0.47) * 0.35;
    const autoDriftY = Math.cos(elapsed * 0.29) * 0.7 + Math.cos(elapsed * 0.53) * 0.3;

    // Fade out pointer influence if idle for > 4 seconds
    const timeSincePointer = performance.now() - this.lastPointerTime;
    const pointerInfluence = timeSincePointer < 4000 ? 1 : Math.max(0, 1 - (timeSincePointer - 4000) / 2000);

    // Target virtual camera combining pointer and breathing drift
    const targetX = (this.targetPointerX * pointerInfluence + autoDriftX * (1 - pointerInfluence * 0.5)) * this.maxDisplacementX;
    const targetY = (this.targetPointerY * pointerInfluence + autoDriftY * (1 - pointerInfluence * 0.5)) * this.maxDisplacementY;

    // Exponential smoothing
    const step = 1 - Math.exp(-this.smoothing * (deltaSec * 60));
    this.cameraX += (targetX - this.cameraX) * step;
    this.cameraY += (targetY - this.cameraY) * step;
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
