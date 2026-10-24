import type { DrawnCard } from './types';

export type Rng = () => number;

/** Bộ sinh số ngẫu nhiên có hạt giống (dùng cho test và tái hiện kết quả). */
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Rút `count` lá khác nhau; mỗi lá ngược với xác suất `reversalRate`. */
export const drawCards = (cardIds: readonly string[], count: number, rng: Rng = Math.random, reversalRate = 0.35): DrawnCard[] => {
  if (!Number.isInteger(count) || count < 1 || count > cardIds.length) throw new RangeError(`Số lá cần rút không hợp lệ: ${count}`);
  const pool = [...cardIds];
  const picks: DrawnCard[] = [];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    const chosen = pool[j];
    const swap = pool[i];
    if (chosen === undefined || swap === undefined) throw new Error('Bộ bài không hợp lệ');
    pool[j] = swap;
    pool[i] = chosen;
    picks.push({ id: chosen, reversed: rng() < reversalRate });
  }
  return picks;
};
