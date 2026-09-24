import type { TurnCombatEvent } from '../game/core/fishing/turn-types';

const CUES: Record<TurnCombatEvent, { durationMs: number; frequency: number; type: OscillatorType }> = {
  'action-reel': { durationMs: 150, frequency: 340, type: 'triangle' },
  'action-pull': { durationMs: 180, frequency: 175, type: 'sine' },
  'action-release': { durationMs: 180, frequency: 235, type: 'sine' },
  'action-brace': { durationMs: 130, frequency: 125, type: 'square' },
  'action-observe': { durationMs: 220, frequency: 585, type: 'triangle' },
  'fish-action': { durationMs: 140, frequency: 190, type: 'sine' },
  'fish-intent': { durationMs: 110, frequency: 420, type: 'triangle' },
  'line-damaged': { durationMs: 210, frequency: 115, type: 'square' },
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

export function playFishingCue(event: TurnCombatEvent, enabled: boolean): void {
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
