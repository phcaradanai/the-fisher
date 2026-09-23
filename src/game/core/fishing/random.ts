export interface RandomFloat {
  value: number;
  seed: number;
}

/** Advance a 32-bit LCG and return its normalized sample plus the next seed. */
export function nextRandomFloat(seed: number): RandomFloat {
  const currentSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
  const nextSeed = (Math.imul(currentSeed, 1_664_525) + 1_013_904_223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 0x1_0000_0000 };
}
