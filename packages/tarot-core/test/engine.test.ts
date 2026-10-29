import { describe, expect, it } from 'vitest';
import {
  CARDS, CARD_IDS, CARD_INDEX, RULE_SET, computeMetrics, drawCards, evaluateCondition, getLocaleBundle,
  matchesPattern, mulberry32, readSpread, selectRules, TOPIC_IDS, validateCondition, validateRuleSet,
  type Condition, type DrawnCard, type RuleSetDef, type SpreadId, type TopicId
} from '../src';

const picks = (...items: [string, boolean?][]): DrawnCard[] => items.map(([id, reversed]) => ({ id, reversed: !!reversed }));
const metricsOf = (...items: [string, boolean?][]) => computeMetrics(picks(...items), CARD_INDEX, RULE_SET.element_relations);
const ruleIds = (list: { id: string }[]) => list.map((i) => i.id);

describe('dữ liệu', () => {
  it('có đủ 78 lá, id không trùng', () => {
    expect(CARDS).toHaveLength(78);
    expect(new Set(CARD_IDS).size).toBe(78);
    expect(CARDS.filter((c) => c.arcana === 'major')).toHaveLength(22);
  });
  it('numerology: Ẩn Chính rút gọn về 0–9, lá cung đình là null', () => {
    const n = (id: string) => CARD_INDEX.get(id)?.numerology;
    expect(n('wheel')).toBe(1); // X
    expect(n('death')).toBe(4); // XIII
    expect(n('world')).toBe(3); // XXI
    expect(n('wands-10')).toBe(1);
    expect(n('cups-queen')).toBeNull();
  });
  it('mỗi lá có nguyên tố theo chất (Ẩn Phụ)', () => {
    expect(CARD_INDEX.get('wands-3')?.element).toBe('fire');
    expect(CARD_INDEX.get('cups-3')?.element).toBe('water');
    expect(CARD_INDEX.get('swords-3')?.element).toBe('air');
    expect(CARD_INDEX.get('pentacles-3')?.element).toBe('earth');
  });
});

describe('computeMetrics', () => {
  it('lá đơn', () => {
    const m = metricsOf(['hermit', true]);
    expect(m).toMatchObject({ card_count: 1, major_count: 1, reversal_pattern: 'R', element_profile: 'single', dominant_element: 'earth' });
  });
  it('3 lá cùng nguyên tố', () => {
    const m = metricsOf(['wands-2'], ['wands-5'], ['emperor']);
    expect(m.element_profile).toBe('all_same');
    expect(m.dominant_element).toBe('fire');
    expect(m.secondary_element).toBeNull();
  });
  it('một nguyên tố chiếm ưu thế và quan hệ nguyên tố', () => {
    const m = metricsOf(['wands-2'], ['wands-5'], ['swords-3']);
    expect(m).toMatchObject({ element_profile: 'dominant_pair', dominant_element: 'fire', secondary_element: 'air', element_relation: 'friendly' });
    expect(metricsOf(['wands-2'], ['wands-5'], ['cups-3']).element_relation).toBe('opposed');
    expect(metricsOf(['wands-2'], ['wands-5'], ['pentacles-3']).element_relation).toBe('neutral');
  });
  it('3 nguyên tố khác nhau thì có nguyên tố vắng mặt', () => {
    const m = metricsOf(['wands-2'], ['cups-3'], ['swords-3']);
    expect(m).toMatchObject({ element_profile: 'mixed', dominant_element: null, missing_element: 'earth' });
  });
  it('con số lặp lại và bậc cung đình lặp lại', () => {
    expect(metricsOf(['wands-5'], ['cups-5'], ['swords-2'])).toMatchObject({ repeated_numerology: 5, repeated_numerology_size: 2 });
    expect(metricsOf(['wands-5'], ['cups-5'], ['swords-5'])).toMatchObject({ repeated_numerology: 5, repeated_numerology_size: 3 });
    expect(metricsOf(['wands-king'], ['cups-king'], ['swords-2'])).toMatchObject({ repeated_rank: 'king', court_count: 2, repeated_numerology: null });
    expect(metricsOf(['wands-ace'], ['wheel'], ['sun']).repeated_numerology).toBe(1);
  });
  it('cards_present có token theo chiều', () => {
    const m = metricsOf(['death', true], ['star']);
    expect([...m.cards_present].sort()).toEqual(['death', 'death:R', 'star', 'star:U']);
  });
  it('ném lỗi với id lá không tồn tại', () => {
    expect(() => metricsOf(['khong-co'])).toThrow();
  });
});

describe('điều kiện', () => {
  const m = metricsOf(['death', true], ['star'], ['cups-ace']);
  it('toán tử cơ bản', () => {
    expect(evaluateCondition({ metric: 'major_count', op: '>=', value: 2 }, m)).toBe(true);
    expect(evaluateCondition({ metric: 'major_count', op: '<=', value: 1 }, m)).toBe(false);
    expect(evaluateCondition({ metric: 'dominant_element', op: '!=', value: 'fire' }, m)).toBe(true);
  });
  it('contains_all theo chiều', () => {
    expect(evaluateCondition({ metric: 'cards_present', op: 'contains_all', value: ['death:R', 'star'] }, m)).toBe(true);
    expect(evaluateCondition({ metric: 'cards_present', op: 'contains_all', value: ['death:U'] }, m)).toBe(false);
  });
  it('all / any lồng nhau', () => {
    const cond: Condition = { any: [{ metric: 'card_count', op: '==', value: 9 }, { all: [{ metric: 'major_count', op: '==', value: 2 }, { metric: 'ace_count', op: '==', value: 1 }] }] };
    expect(evaluateCondition(cond, m)).toBe(true);
  });
  it('matches với ký tự ?', () => {
    expect(matchesPattern('URR', 'U?R')).toBe(true);
    expect(matchesPattern('RRR', 'U?R')).toBe(false);
    expect(matchesPattern('UR', 'U?R')).toBe(false);
  });
});

const read = (spread: SpreadId, topic: TopicId, ...items: [string, boolean?][]) => readSpread({ picks: picks(...items), spreadId: spread, topicId: topic });

describe('readSpread: kết quả vàng (đối chiếu với engine bản demo)', () => {
  it('cặp Cái Chết + Ngôi Sao, trải 3 lá, chủ đề sự nghiệp', () => {
    const out = read('3', 'career', ['death'], ['star'], ['cups-ace']);
    expect(ruleIds(out)).toEqual(['PAIR-DEATH-STAR', 'RV-3-UUU', 'EL-DOM-WATER', 'ARC-MAJOR-2PLUS']);
    expect(out[3]?.text).toContain('Cái Chết, Ngôi Sao'); // {major_names}
    expect(out[2]?.text).toContain('Trong công việc'); // topic_text career
  });
  it('trải Bản thân–Hoàn cảnh–Thử thách, chủ đề tình yêu', () => {
    const out = read('3s', 'love', ['lovers', true], ['cups-queen'], ['swords-3', true]);
    expect(ruleIds(out)).toEqual(['RV-3S-RXR', 'EL-DOM-AIR', 'ARC-MAJOR-1', 'EL-REL-NEUTRAL']);
  });
  it('một lá ngược', () => {
    expect(ruleIds(read('1', 'mind', ['hermit', true]))).toEqual(['RV-1-R', 'ARC-SINGLE-MAJOR', 'EL-SINGLE-EARTH']);
  });
  it('con số lặp ba lần: luật riêng của số hiện trước luật "ba lá cùng số"', () => {
    const out = read('3', 'finance', ['wands-5'], ['swords-5'], ['pentacles-5']);
    expect(ruleIds(out)).toEqual(['PAIR-WANDS5-SWORDS5', 'RV-3-UUU', 'NUM-REPEAT-5', 'NUM-REPEAT-TRIPLE']);
    expect(out[2]?.text).toContain('Năm Gậy, Năm Kiếm, Năm Tiền'); // {repeated_names}
  });
  it('mỗi nhóm loại trừ chỉ có một luật', () => {
    const rules = RULE_SET.rules;
    for (const id of ['death', 'tower', 'sun']) {
      const out = read('3', 'love', [id], ['wands-2'], ['cups-4']);
      const groups = ruleIds(out).map((rid) => rules.find((r) => r.id === rid)?.exclusive_group).filter(Boolean);
      expect(new Set(groups).size).toBe(groups.length);
    }
  });
});

describe('chọn luật', () => {
  const tiny: RuleSetDef = {
    version: 1, element_relations: RULE_SET.element_relations, spreads: RULE_SET.spreads,
    selection: { min_priority: 30, max_insights: { '1': 1, '3': 2, '3s': 2 } },
    rules: [
      { id: 'A', category: 'x', spreads: ['3'], priority: 50, exclusive_group: 'g', tone: 'neutral', when: { metric: 'card_count', op: '==', value: 3 } },
      { id: 'B', category: 'x', spreads: ['3'], priority: 60, exclusive_group: 'g', tone: 'neutral', when: { metric: 'card_count', op: '==', value: 3 } },
      { id: 'C', category: 'x', spreads: ['3'], priority: 40, exclusive_group: null, tone: 'neutral', when: { metric: 'card_count', op: '==', value: 3 } },
      { id: 'D', category: 'x', spreads: ['3'], priority: 40, exclusive_group: null, tone: 'neutral', when: { metric: 'card_count', op: '==', value: 3 } },
      { id: 'E', category: 'x', spreads: ['3'], priority: 20, exclusive_group: null, tone: 'neutral', when: { metric: 'card_count', op: '==', value: 3 } },
      { id: 'F', category: 'x', spreads: ['3'], priority: 99, exclusive_group: null, tone: 'neutral', enabled: false, when: { metric: 'card_count', op: '==', value: 3 } },
      { id: 'G', category: 'x', spreads: ['1'], priority: 99, exclusive_group: null, tone: 'neutral', when: { metric: 'card_count', op: '==', value: 3 } }
    ]
  };
  const metrics = metricsOf(['wands-2'], ['cups-3'], ['swords-3']);
  it('nhóm loại trừ, sắp theo ưu tiên, bỏ luật tắt / sai kiểu trải / dưới ngưỡng', () => {
    const all = selectRules({ ruleSet: { ...tiny, selection: { ...tiny.selection, max_insights: { '1': 9, '3': 9, '3s': 9 } } }, spreadId: '3', metrics });
    expect(all.map((r) => r.id)).toEqual(['B', 'C', 'D']);
  });
  it('giới hạn số nhận xét; bằng ưu tiên thì theo thứ tự trong bảng', () => {
    expect(selectRules({ ruleSet: tiny, spreadId: '3', metrics }).map((r) => r.id)).toEqual(['B', 'C']);
  });
});

describe('validate', () => {
  const ctx = { cardIds: CARD_IDS };
  it('bảng luật đóng gói sẵn hợp lệ (tiếng Việt)', () => {
    expect(validateRuleSet(RULE_SET, getLocaleBundle('vi').ruleTexts, ctx)).toEqual([]);
  });
  it('phát hiện điều kiện sai', () => {
    expect(validateCondition({ metric: 'nope', op: '==', value: 1 }, ctx)).toMatch(/không tồn tại/);
    expect(validateCondition({ metric: 'major_count', op: '~', value: 1 }, ctx)).toMatch(/Toán tử/);
    expect(validateCondition({ metric: 'cards_present', op: 'contains_all', value: ['khong-co'] }, ctx)).toMatch(/không hợp lệ/);
    expect(validateCondition({ metric: 'major_count', op: 'contains_all', value: ['death'] }, ctx)).toMatch(/cards_present/);
    expect(validateCondition({ metric: 'reversal_pattern', op: 'matches', value: 'U?X' }, ctx)).toMatch(/matches/);
    expect(validateCondition({ all: [] }, ctx)).toMatch(/danh sách/);
    expect(validateCondition({ metric: 'major_count', op: '>=', value: 2 }, ctx)).toBe('');
  });
  it('phát hiện luật thiếu chữ, biến lạ, mã trùng', () => {
    const bad: RuleSetDef = { ...RULE_SET, rules: [...RULE_SET.rules.slice(0, 1), { ...(RULE_SET.rules[0] as RuleSetDef['rules'][number]) }, { ...(RULE_SET.rules[1] as RuleSetDef['rules'][number]), id: 'NEW-RULE' }] };
    const texts = { ...getLocaleBundle('vi').ruleTexts, 'NEW-RULE': { text: 'Câu có biến lạ {unknown} ở đây.' } };
    const codes = validateRuleSet(bad, texts, ctx).map((i) => i.code);
    expect(codes).toContain('id-duplicate');
    expect(codes).toContain('placeholder');
  });
});

describe('đa ngôn ngữ', () => {
  it('tiếng Việt đầy đủ', () => {
    expect(getLocaleBundle('vi').coverage).toEqual({ cards: 1, rules: 1 });
  });
  it('tiếng Anh: chú giải lá bài đã dịch đầy đủ, luật chưa dịch vẫn rơi về tiếng Việt', () => {
    const en = getLocaleBundle('en');
    const vi = getLocaleBundle('vi');
    expect(en.cards.fool?.name).toBe('The Fool');
    expect(en.cards.fool?.meaning_upright).toMatch(/^The Fool is the card/);
    expect(en.ui.topics.mind).toBe('Mental wellbeing');
    expect(en.coverage.cards).toBe(1);
    expect(en.translated.cards.has('fool')).toBe(true);
    expect(en.coverage.rules).toBe(0);
    expect(en.translated.rules.has(RULE_SET.rules[0]!.id)).toBe(false);
    expect(vi.translated.cards.has('fool')).toBe(true);
  });
  it('tiếng Anh: mọi lá có đủ trường, đúng số từ khóa và khác bản tiếng Việt', () => {
    const en = getLocaleBundle('en');
    const vi = getLocaleBundle('vi');
    for (const id of CARD_IDS) {
      const e = en.cards[id]!;
      const v = vi.cards[id]!;
      expect(e.keywords_upright.length, `${id} keywords_upright`).toBe(v.keywords_upright.length);
      expect(e.keywords_reversed.length, `${id} keywords_reversed`).toBe(v.keywords_reversed.length);
      for (const field of ['meaning_upright', 'meaning_reversed', 'symbolism', 'miu'] as const) expect(e[field], `${id} ${field}`).not.toBe(v[field]);
      for (const topic of TOPIC_IDS) for (const side of ['upright', 'reversed'] as const) {
        expect(e.topics[topic][side], `${id} ${topic}.${side}`).not.toBe(v.topics[topic][side]);
        expect(e.topics[topic][side].length, `${id} ${topic}.${side}`).toBeGreaterThan(40);
      }
    }
  });
  it('luật đã dịch được dùng, dùng tên lá và nguyên tố của ngôn ngữ đó', () => {
    const base = getLocaleBundle('en');
    const texts = { ...base.ruleTexts, 'EL-DOM-WATER': { text: 'Water leads: {dominant} with {secondary}?' } };
    const out = readSpread({ picks: picks(['cups-ace'], ['cups-2'], ['swords-3']), spreadId: '3', topicId: 'love', locale: 'en', ruleTexts: texts });
    const water = out.find((i) => i.id === 'EL-DOM-WATER');
    expect(water?.text).toBe('Water leads: Water with Air?');
  });
});

describe('rút bài', () => {
  it('rút đúng số lá, không trùng, tái hiện được theo hạt giống', () => {
    const a = drawCards(CARD_IDS, 3, mulberry32(42));
    const b = drawCards(CARD_IDS, 3, mulberry32(42));
    expect(a).toEqual(b);
    expect(new Set(a.map((p) => p.id)).size).toBe(3);
  });
  it('tỉ lệ ngược xấp xỉ 35%', () => {
    const rng = mulberry32(7);
    let reversed = 0;
    const total = 20000;
    for (let i = 0; i < total; i++) if (drawCards(CARD_IDS, 1, rng)[0]?.reversed) reversed += 1;
    expect(reversed / total).toBeGreaterThan(0.33);
    expect(reversed / total).toBeLessThan(0.37);
  });
  it('từ chối số lá không hợp lệ', () => {
    expect(() => drawCards(CARD_IDS, 0)).toThrow(RangeError);
    expect(() => drawCards(CARD_IDS, 79)).toThrow(RangeError);
  });
});

describe('22 luật cặp lá', () => {
  it('mỗi cặp hiện ra khi cả hai lá cùng có mặt', () => {
    const pairs = RULE_SET.rules.filter((r) => r.category === 'pair');
    expect(pairs).toHaveLength(22);
    for (const rule of pairs) {
      const leaf = rule.when as { value: string[] };
      const tokens = leaf.value;
      const items = tokens.map((t): [string, boolean] => [t.split(':')[0] as string, t.endsWith(':R')]);
      const filler = CARD_IDS.find((id) => !items.some(([x]) => x === id) && id !== 'fool') as string;
      for (const spread of rule.spreads) {
        const count = spread === '1' ? 1 : 3;
        const chosen = [...items, [filler, false] as [string, boolean]].slice(0, Math.max(count, items.length));
        if (chosen.length !== count) continue;
        expect(ruleIds(readSpread({ picks: picks(...chosen), spreadId: spread, topicId: 'love' }))).toContain(rule.id);
      }
    }
  });
});
