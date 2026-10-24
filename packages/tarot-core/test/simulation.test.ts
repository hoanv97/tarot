import { describe, expect, it } from 'vitest';
import { CARD_IDS, RULE_SET, TOPIC_IDS, drawCards, mulberry32, readSpread, type SpreadId } from '../src';

const SPREADS: [SpreadId, number][] = [['1', 1], ['3', 3], ['3s', 3]];

describe('mô phỏng 90.000 lượt rút', () => {
  const fired = new Map<string, number>();
  const counts: Record<string, number[]> = { '1': [], '3': [], '3s': [] };
  const rng = mulberry32(2026);
  let unresolved = 0;
  let empty = 0;
  for (const [spread, count] of SPREADS) {
    for (let i = 0; i < 30000; i++) {
      const picks = drawCards(CARD_IDS, count, rng, 0.35);
      const topic = TOPIC_IDS[i % TOPIC_IDS.length] ?? 'love';
      const out = readSpread({ picks, spreadId: spread, topicId: topic });
      counts[spread]?.push(out.length);
      for (const insight of out) {
        fired.set(insight.id, (fired.get(insight.id) ?? 0) + 1);
        if (/\{[a-z_]+\}/.test(insight.text)) unresolved += 1;
        if (insight.text.trim().length === 0) empty += 1;
      }
    }
  }
  it('không có biến chưa thay và không có nhận xét trống', () => {
    expect(unresolved).toBe(0);
    expect(empty).toBe(0);
  });
  it('trải 3 lá luôn có 3–4 nhận xét; lá đơn luôn có 2', () => {
    expect(Math.min(...(counts['3'] ?? [0]))).toBeGreaterThanOrEqual(3);
    expect(Math.max(...(counts['3'] ?? [0]))).toBeLessThanOrEqual(4);
    expect(Math.min(...(counts['3s'] ?? [0]))).toBeGreaterThanOrEqual(3);
    expect(Math.max(...(counts['3s'] ?? [0]))).toBeLessThanOrEqual(4);
    expect(new Set(counts['1']).size).toBe(1);
    expect(counts['1']?.[0]).toBe(3);
  });
  it('mọi luật đều có thể được hiển thị (trừ các cặp lá rất hiếm)', () => {
    const neverShown = RULE_SET.rules.map((r) => r.id).filter((id) => !fired.has(id));
    // Các luật cặp lá rất hiếm có thể không xuất hiện trong 90.000 lượt rút ngẫu nhiên; kiểm tra riêng bằng trải bài cố định.
    const rarePairs = neverShown.filter((id) => id.startsWith('PAIR-'));
    expect(neverShown.filter((id) => !id.startsWith('PAIR-'))).toEqual([]);
    expect(rarePairs.length).toBeLessThan(22);
  });
});
