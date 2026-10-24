export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, prefersReducedMotion() ? 0 : ms));

export const round1 = (n: number): number => Math.round(n * 10) / 10;

export const pickOne = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T;

export const shuffled = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
};
