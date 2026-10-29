import { CARD_INDEX, CARD_TONES, RULE_SET, getLocaleBundle, type LocaleBundle } from './data';
import { mulberry32 } from './draw';
import { generateInsights } from './insights';
import {
  DEFAULT_LOCALE, type AnalysisResult, type AnalysisItem, type AnalysisSection, type AnalysisText, type CardTones, type DrawnCard, type Locale, type RuleSetDef,
  type RuleTexts, type SpreadId, type Tone, type TopicId
} from './types';

/**
 * Phân tích chuyên sâu từ bộ dữ liệu có sẵn (không gọi AI).
 *
 * Kết quả chỉ phụ thuộc vào: các lá theo thứ tự rút (kèm chiều), kiểu trải, chủ đề và câu hỏi.
 * Cùng đầu vào luôn cho cùng kết quả: biến thể câu được chọn bằng hạt giống tính từ đầu vào.
 */
export type AnalyzeArgs = {
  picks: readonly DrawnCard[];
  spreadId: SpreadId;
  topicId: TopicId;
  locale?: Locale;
  question?: string;
  /** Hàm nhận diện khủng hoảng (thường là detectCrisis của @miu/content-policy). Nếu đúng thì không đọc bài. */
  isCrisis?: (question: string, locale: Locale) => boolean;
  /** Dùng bảng luật khác (ví dụ lấy từ database) thay cho bản đóng gói sẵn. */
  ruleSet?: RuleSetDef;
  ruleTexts?: RuleTexts;
  /** Dùng bộ nội dung đã gộp (ví dụ cấu hình trong database) thay cho bản đóng gói sẵn của ngôn ngữ. */
  bundle?: LocaleBundle;
  /** Tông của từng lá khi khác bản đóng gói sẵn. */
  cardTones?: CardTones;
};

export const MAX_QUESTION_LENGTH = 200;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export const cleanQuestion = (raw: string | undefined): string =>
  (raw ?? '').normalize('NFC').replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION_LENGTH);

/** FNV-1a 32 bit */
const hash = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

const fill = (template: string, vars: Record<string, string>): string =>
  template.replace(/\{([a-z_]+)\}/g, (_match, key: string) => vars[key] ?? '');

const tidy = (text: string): string => text.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();

/** Nhận diện ý định từ câu hỏi: từ khóa dài nhất khớp được thắng; bằng nhau thì theo thứ tự trong dữ liệu. */
export const detectIntent = (question: string, analysis: AnalysisText): AnalysisText['intents'][number] | null => {
  const text = question.toLowerCase();
  let best: { intent: AnalysisText['intents'][number]; length: number } | null = null;
  for (const intent of analysis.intents) {
    for (const keyword of intent.keywords) {
      const k = keyword.toLowerCase();
      if (k && text.includes(k) && (!best || k.length > best.length)) best = { intent, length: k.length };
    }
  }
  return best?.intent ?? null;
};

export const pairKey = (a: string, b: string): string => [a, b].sort().join('+');

const toneOf = (tones: CardTones, id: string, reversed: boolean): Tone => tones[id]?.[reversed ? 1 : 0] ?? 'neutral';

const section = (id: AnalysisSection['id'], title: string, items: AnalysisItem[]): AnalysisSection => ({ id, title, items, paragraphs: items.map((i) => i.text) });

const list = (value: string | string[] | undefined): string[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

export const analyzeSpread = (args: AnalyzeArgs): AnalysisResult => {
  const { picks, spreadId, topicId, locale = DEFAULT_LOCALE, ruleSet = RULE_SET } = args;
  const bundle = args.bundle ?? getLocaleBundle(locale);
  const cardTones = args.cardTones ?? CARD_TONES;
  const getCardName = (_locale: Locale, id: string): string => bundle.cards[id]?.name ?? id;
  const data = bundle.analysis;
  const ui = bundle.ui;
  const question = cleanQuestion(args.question);

  if (question && args.isCrisis?.(question, locale)) {
    return {
      source: 'safety', intent: null, note: data.closing.note,
      sections: [section('lead', data.labels.title, [{ text: data.safety, tone: 'neutral' }, { text: ui.disclaimer.mind_note, tone: 'neutral' }])]
    };
  }

  const seed = hash([spreadId, topicId, question, ...picks.map((p) => `${p.id}:${p.reversed ? 'R' : 'U'}`)].join('|'));
  const choose = (variants: readonly string[], salt: string): string => {
    if (variants.length === 0) return '';
    return variants[Math.floor(mulberry32(seed ^ hash(salt))() * variants.length)] ?? variants[0] ?? '';
  };

  const topicLabel = (ui.topics[topicId] ?? topicId).toLowerCase();
  const intent = question ? detectIntent(question, data) : null;
  const orientation = (reversed: boolean): string => (reversed ? data.labels.reversed : data.labels.upright);
  const spreadPositions = ui.spreads[spreadId].positions;
  const positionKeys = ruleSet.spreads.find((s) => s.id === spreadId)?.positions ?? Object.keys(spreadPositions);
  const sections: AnalysisSection[] = [];

  /* 1. Câu hỏi */
  const leadTemplate = question
    ? choose(intent?.lead ?? data.lead.with_question, 'lead')
    : choose(data.lead.no_question, 'lead');
  sections.push(section('lead', data.labels.lead, [{ text: tidy(fill(leadTemplate, { question, topic: topicLabel })), tone: 'neutral' }]));

  /* 2. Bức tranh chung theo tông các lá */
  const tones = picks.map((p) => toneOf(cardTones, p.id, p.reversed));
  const positive = tones.filter((t) => t === 'positive').length;
  const caution = tones.filter((t) => t === 'caution').length;
  const lean = positive > caution ? 'positive_lean' : caution > positive ? 'caution_lean' : 'balanced';
  const leanTone: Tone = lean === 'positive_lean' ? 'positive' : lean === 'caution_lean' ? 'caution' : 'neutral';
  sections.push(section('overview', data.labels.overview, [{ text: tidy(fill(choose(data.overview[lean], 'overview'), { topic: topicLabel })), tone: leanTone, tag: ui.tones[leanTone] }]));

  /* 3. Từng lá theo đúng thứ tự rút */
  const cardItems: AnalysisItem[] = picks.map((pick, index) => {
    const text = bundle.cards[pick.id];
    const side = pick.reversed ? 'reversed' : 'upright';
    const own = data.cards[pick.id];
    const positionKey = positionKeys[index] ?? '';
    const position = spreadPositions[positionKey];
    const meaning = own?.positions?.[positionKey]?.[side] ?? own?.topics?.[topicId]?.[side] ?? own?.[side] ?? text?.topics[topicId]?.[side] ?? '';
    const tone = tones[index] ?? 'neutral';
    const variants = data.positions[positionKey]?.[tone] ?? [];
    const template = choose(variants, `card${index}`) || '{card} ({orientation}) · “{position}”. {meaning}';
    const body = tidy(fill(template, {
      card: getCardName(locale, pick.id), orientation: orientation(pick.reversed),
      position: position?.label ?? '', prompt: (position?.prompt ?? '').replace(/[.。]$/, ''), meaning
    }));
    return { text: body, tone, tag: position?.label ?? getCardName(locale, pick.id) };
  });
  sections.push(section('cards', data.labels.cards, cardItems));

  /* 4. Mạch chuyển giữa các lá liền kề, cộng các cặp lá có nội dung riêng */
  const flow: AnalysisItem[] = [];
  if (picks.length === 1) {
    const only = picks[0];
    const text = only ? bundle.cards[only.id] : undefined;
    if (only && text) {
      const mine = (only.reversed ? text.keywords_reversed : text.keywords_upright).slice(0, 4).join(', ');
      const other = (only.reversed ? text.keywords_upright : text.keywords_reversed).slice(0, 4).join(', ');
      flow.push({ text: tidy(fill(choose(data.single_flow, 'single'), { card: text.name, orientation: orientation(only.reversed), keywords: mine, other_keywords: other })), tone: 'neutral' });
    }
  } else {
    for (let i = 0; i + 1 < picks.length; i++) {
      const a = picks[i];
      const b = picks[i + 1];
      const from = tones[i];
      const to = tones[i + 1];
      if (!a || !b || !from || !to) continue;
      const template = choose(data.transitions[`${from}>${to}`] ?? [], `flow${i}`);
      if (template) flow.push({ text: tidy(fill(template, { from: getCardName(locale, a.id), to: getCardName(locale, b.id) })), tone: to, tag: `${getCardName(locale, a.id)} → ${getCardName(locale, b.id)}` });
    }
    for (let i = 0; i < picks.length; i++) {
      for (let j = i + 1; j < picks.length; j++) {
        const a = picks[i];
        const b = picks[j];
        if (!a || !b) continue;
        const note = choose(list(data.pairs[pairKey(a.id, b.id)]), `pair${i}${j}`);
        if (note) flow.push({ text: tidy(fill(note, { a: getCardName(locale, a.id), b: getCardName(locale, b.id) })), tone: 'neutral', tag: `${getCardName(locale, a.id)} + ${getCardName(locale, b.id)}` });
      }
    }
  }
  if (flow.length) sections.push(section('flow', data.labels.flow, flow));

  /* 5. Nhận xét tầng 2 (luật tổ hợp) */
  const insights = generateInsights({
    picks, spreadId, topicId, ruleSet,
    ruleTexts: args.ruleTexts ?? bundle.ruleTexts, ui, cards: CARD_INDEX, cardName: (id) => getCardName(locale, id)
  });
  if (insights.length) sections.push(section('insights', data.labels.insights, insights.map((i) => ({ text: i.text, tone: i.tone, tag: ui.tones[i.tone] }))));

  /* 6. Câu hỏi tự vấn: một theo chủ đề, một chung */
  const reflect = [choose(data.closing.topics[topicId] ?? [], 'reflect-topic'), choose(data.closing.common, 'reflect-common')].filter(Boolean);
  if (reflect.length) sections.push(section('reflect', data.labels.reflect, reflect.map((text) => ({ text, tone: 'neutral' as Tone }))));

  return { source: 'analysis', intent: intent?.id ?? null, sections, note: data.closing.note };
};
