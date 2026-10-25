import { describe, expect, it } from 'vitest';
import { detectCrisis, lintText } from '@miu/content-policy';
import {
  CARDS, CARD_IDS, CARD_TONES, RULE_SET, analyzeSpread, cleanQuestion, detectIntent, drawCards, getLocaleBundle, mulberry32,
  pairKey, validateAnalysis, type DrawnCard, type SpreadId, type TopicId
} from '../src';

const vi = getLocaleBundle('vi').analysis;
const text = (r: ReturnType<typeof analyzeSpread>) => r.sections.flatMap((s) => s.paragraphs).join('\n');
const trio: DrawnCard[] = [{ id: 'fool', reversed: false }, { id: 'star', reversed: true }, { id: 'sun', reversed: false }];

describe('dữ liệu Phân tích chuyên sâu', () => {
  it('hợp lệ: đủ vị trí, tông, biến thể, biến {…} đúng chỗ', () => {
    const issues = validateAnalysis(vi, { cardIds: CARD_IDS, spreads: RULE_SET.spreads, cardTones: CARD_TONES });
    expect(issues).toEqual([]);
  });
  it('bắt lỗi: biến sai chỗ, lá không tồn tại, khóa cặp sai', () => {
    const bad: typeof vi = JSON.parse(JSON.stringify(vi));
    bad.overview.balanced = ['Câu này dùng {card} ở sai chỗ nên phải báo lỗi.'];
    bad.cards['khong-co'] = { upright: 'Một lá không tồn tại trong bộ bài.' };
    bad.pairs['sun+fool'] = 'Khóa sai thứ tự chữ cái nên cần báo lỗi.';
    const codes = validateAnalysis(bad, { cardIds: CARD_IDS, spreads: RULE_SET.spreads, cardTones: CARD_TONES }).map((i) => i.code);
    for (const code of ['placeholder', 'card', 'pair']) expect(codes.includes(code)).toBe(true);
  });
  it('tông đủ 78 lá', () => {
    expect(Object.keys(CARD_TONES)).toHaveLength(CARDS.length);
  });
});

describe('analyzeSpread', () => {
  it('cùng đầu vào cho cùng kết quả', () => {
    const a = analyzeSpread({ picks: trio, spreadId: '3', topicId: 'love', question: 'Mối quan hệ này sẽ ra sao?' });
    const b = analyzeSpread({ picks: trio, spreadId: '3', topicId: 'love', question: 'Mối quan hệ này sẽ ra sao?' });
    expect(a).toEqual(b);
  });
  it('phụ thuộc thứ tự lá: đảo thứ tự thì phần theo lá đổi', () => {
    const forward = analyzeSpread({ picks: trio, spreadId: '3', topicId: 'career' });
    const backward = analyzeSpread({ picks: [...trio].reverse(), spreadId: '3', topicId: 'career' });
    const cards = (r: typeof forward) => r.sections.find((s) => s.id === 'cards')?.paragraphs ?? [];
    expect(cards(forward)[0]).toContain('Chàng Khờ');
    expect(cards(forward)[0]).toContain('Quá khứ');
    expect(cards(backward)[0]).toContain('Mặt Trời');
    expect(cards(backward)[0]).toContain('Quá khứ');
    expect(cards(forward)).not.toEqual(cards(backward));
  });
  it('mỗi lá một đoạn, đúng thứ tự, ghi chiều xuôi/ngược', () => {
    const r = analyzeSpread({ picks: trio, spreadId: '3', topicId: 'love' });
    const paragraphs = r.sections.find((s) => s.id === 'cards')?.paragraphs ?? [];
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[1]).toContain('Ngôi Sao');
    expect(paragraphs[1]).toContain('ngược');
    expect(paragraphs[0]).toContain('xuôi');
  });
  it('dùng câu hỏi: nhắc lại câu hỏi và nhận ý định', () => {
    const r = analyzeSpread({ picks: trio, spreadId: '3', topicId: 'career', question: 'Tôi có nên đổi việc không?' });
    expect(r.intent).toBe('decision');
    expect(r.sections[0]?.paragraphs[0]).toContain('Tôi có nên đổi việc không?');
    const none = analyzeSpread({ picks: trio, spreadId: '3', topicId: 'career' });
    expect(none.intent).toBeNull();
    expect(none.sections[0]?.paragraphs[0]).toContain('sự nghiệp');
  });
  it('từ khóa dài hơn thắng; không khớp thì không có ý định', () => {
    expect(detectIntent('khi nào tôi gặp người ấy?', vi)?.id).toBe('timing');
    expect(detectIntent('nên làm gì bây giờ', vi)?.id).toBe('how');
    expect(detectIntent('xin chào', vi)).toBeNull();
  });
  it('khủng hoảng: không đọc bài, trả lời hỗ trợ', () => {
    const r = analyzeSpread({ picks: trio, spreadId: '3', topicId: 'mind', question: 'tôi không muốn sống nữa', isCrisis: detectCrisis });
    expect(r.source).toBe('safety');
    expect(r.sections).toHaveLength(1);
    expect(text(r)).not.toContain('Chàng Khờ');
  });
  it('1 lá có mạch "hai mặt", 3 lá có mạch chuyển', () => {
    const one = analyzeSpread({ picks: [{ id: 'tower', reversed: false }], spreadId: '1', topicId: 'mind' });
    expect(one.sections.find((s) => s.id === 'flow')?.paragraphs).toHaveLength(1);
    const three = analyzeSpread({ picks: trio, spreadId: '3', topicId: 'love' });
    expect(three.sections.find((s) => s.id === 'flow')?.paragraphs.length).toBeGreaterThanOrEqual(2);
  });
  it('nội dung riêng của lá/cặp lá (nếu có) được ưu tiên hơn kiến giải mặc định', () => {
    const live = getLocaleBundle('vi');
    const key = pairKey('fool', 'star');
    const before = { card: live.analysis.cards.fool, pair: live.analysis.pairs[key] };
    live.analysis.cards.fool = { positions: { past: { upright: 'NỘI DUNG RIÊNG CHO CHÀNG KHỜ Ở QUÁ KHỨ.' } } };
    live.analysis.pairs[key] = ['CẶP RIÊNG GIỮA KHỜ VÀ SAO.'];
    try {
      const out = text(analyzeSpread({ picks: trio, spreadId: '3', topicId: 'love' }));
      expect(out).toContain('NỘI DUNG RIÊNG CHO CHÀNG KHỜ Ở QUÁ KHỨ.');
      expect(out).toContain('CẶP RIÊNG GIỮA KHỜ VÀ SAO.');
    } finally {
      if (before.card) live.analysis.cards.fool = before.card; else delete live.analysis.cards.fool;
      if (before.pair) live.analysis.pairs[key] = before.pair; else delete live.analysis.pairs[key];
    }
  });
  it('làm sạch câu hỏi', () => {
    expect(cleanQuestion('  a\n\tb   c ')).toBe('a b c');
    expect(cleanQuestion('x'.repeat(500))).toHaveLength(200);
  });
});

describe('mọi phân tích tạo ra đều tuân thủ chính sách nội dung', () => {
  it('rút ngẫu nhiên có hạt giống: 300 ván, mọi kiểu trải và chủ đề', () => {
    const rng = mulberry32(2026);
    const topics: TopicId[] = ['love', 'career', 'study', 'finance', 'mind'];
    const spreads: [SpreadId, number][] = [['1', 1], ['3', 3], ['3s', 3]];
    const problems: string[] = [];
    for (let i = 0; i < 300; i++) {
      const [spreadId, count] = spreads[i % 3]!;
      const topicId = topics[i % 5]!;
      const picks = drawCards(CARD_IDS, count, rng);
      const out = text(analyzeSpread({ picks, spreadId, topicId, question: i % 2 ? 'Tôi có nên thử không?' : '' }));
      for (const v of lintText(out, 'vi')) problems.push(`${spreadId}/${topicId}/${picks.map((p) => p.id + (p.reversed ? 'R' : '')).join(',')}: [${v.category}] "${v.match}"`);
    }
    expect(problems).toEqual([]);
  });
});
