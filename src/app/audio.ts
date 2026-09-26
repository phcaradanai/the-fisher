import type { TurnCombatEvent } from '../game/core/fishing/turn-types';

const CUES: Record<TurnCombatEvent, { durationMs: number; frequency: number; endFrequency?: number; type: OscillatorType }> = {
  cast: { durationMs: 320, frequency: 280, endFrequency: 540, type: 'sine' },
  'action-reel': { durationMs: 160, frequency: 440, endFrequency: 580, type: 'triangle' },
  'action-pull': { durationMs: 200, frequency: 160, endFrequency: 95, type: 'sawtooth' },
  'action-release': { durationMs: 220, frequency: 320, endFrequency: 180, type: 'sine' },
  'action-brace': { durationMs: 180, frequency: 140, endFrequency: 220, type: 'square' },
  'action-observe': { durationMs: 260, frequency: 540, endFrequency: 720, type: 'triangle' },
  'fish-action': { durationMs: 160, frequency: 190, endFrequency: 140, type: 'sine' },
  'fish-intent': { durationMs: 140, frequency: 380, endFrequency: 460, type: 'triangle' },
  'line-damaged': { durationMs: 240, frequency: 110, endFrequency: 85, type: 'square' },
  caught: { durationMs: 520, frequency: 523, endFrequency: 784, type: 'sine' },
  escaped: { durationMs: 300, frequency: 280, endFrequency: 120, type: 'sine' },
  'line-break': { durationMs: 260, frequency: 180, endFrequency: 75, type: 'sawtooth' },
};

let audioContext: AudioContext | undefined;

export function unlockFishingAudio(): void {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  audioContext ??= new window.AudioContext();
  if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
}

export function playFishingCue(event: TurnCombatEvent, enabled: boolean): void {
  if (!enabled || !audioContext || audioContext.state !== 'running') return;

  const cue = CUES[event];
  if (!cue) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startsAt = audioContext.currentTime;
  const endsAt = startsAt + cue.durationMs / 1000;

  oscillator.type = cue.type;
  oscillator.frequency.setValueAtTime(cue.frequency, startsAt);
  if (cue.endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, cue.endFrequency), endsAt);
  }
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(0.05, startsAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startsAt);
  oscillator.stop(endsAt);
}
