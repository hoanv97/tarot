import { describe, expect, it } from 'vitest';
import { analyzeSpread, getLocaleBundle, readSpread, type LocaleBundle } from '../src';

const picks = [{ id: 'death', reversed: false }, { id: 'star', reversed: false }, { id: 'sun', reversed: false }];
const base = { picks, spreadId: '3', topicId: 'career', locale: 'vi' } as const;
const text = (r: ReturnType<typeof analyzeSpread>) => JSON.stringify(r);

/** Bộ nội dung đã gộp, ví dụ từ cấu hình trong database, phải được engine dùng đúng. */
describe('bundle và cardTones tùy chọn', () => {
  it('không truyền gì thì kết quả y hệt dùng bản đóng gói sẵn', () => {
    expect(text(analyzeSpread({ ...base, bundle: getLocaleBundle('vi') }))).toBe(text(analyzeSpread(base)));
  });

  it('dùng tên lá bài trong bundle đã gộp', () => {
    const vi = getLocaleBundle('vi');
    const bundle: LocaleBundle = { ...vi, cards: { ...vi.cards, death: { ...vi.cards.death!, name: 'TÊN-MỚI-CỦA-LÁ' } } };
    expect(text(analyzeSpread({ ...base, bundle }))).toContain('TÊN-MỚI-CỦA-LÁ');
    expect(text(analyzeSpread(base))).not.toContain('TÊN-MỚI-CỦA-LÁ');
    expect(readSpread({ ...base, bundle }).length).toBeGreaterThan(0);
  });

  it('dùng câu của phần phân tích trong bundle đã gộp', () => {
    const vi = getLocaleBundle('vi');
    const bundle: LocaleBundle = { ...vi, analysis: { ...vi.analysis, labels: { ...vi.analysis.labels, overview: 'TIÊU-ĐỀ-MỚI' } } };
    expect(text(analyzeSpread({ ...base, bundle }))).toContain('TIÊU-ĐỀ-MỚI');
  });

  it('dùng tông lá bài truyền vào', () => {
    const tones = Object.fromEntries(picks.map((p) => [p.id, ['caution', 'caution']])) as never;
    expect(text(analyzeSpread({ ...base, cardTones: tones }))).not.toBe(text(analyzeSpread(base)));
  });
});
