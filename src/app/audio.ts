import type { FishingEvent } from '../game/core/fishing/types';

const CUES: Record<FishingEvent, { durationMs: number; frequency: number; type: OscillatorType }> = {
  cast: { durationMs: 180, frequency: 310, type: 'triangle' },
  splash: { durationMs: 140, frequency: 220, type: 'sine' },
  bite: { durationMs: 240, frequency: 740, type: 'sine' },
  hooked: { durationMs: 180, frequency: 490, type: 'triangle' },
  'fish-dash': { durationMs: 120, frequency: 170, type: 'sine' },
  'tension-warning': { durationMs: 200, frequency: 125, type: 'square' },
  'skill-used': { durationMs: 260, frequency: 580, type: 'triangle' },
  caught: { durationMs: 380, frequency: 660, type: 'sine' },
  escaped: { durationMs: 260, frequency: 260, type: 'sine' },
  'line-break': { durationMs: 240, frequency: 105, type: 'square' },
};

let audioContext: AudioContext | undefined;

export function unlockFishingAudio(): void {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  audioContext ??= new window.AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
}

export function playFishingCue(event: FishingEvent, enabled: boolean): void {
  if (!enabled || !audioContext || audioContext.state !== 'running') return;

  const cue = CUES[event];
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startsAt = audioContext.currentTime;
  const endsAt = startsAt + cue.durationMs / 1000;

  oscillator.type = cue.type;
  oscillator.frequency.setValueAtTime(cue.frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.045, startsAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startsAt);
  oscillator.stop(endsAt);
}
