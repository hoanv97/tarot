import { CARD_TONES, RULE_SET, getLocaleBundle, type AnalysisText, type CardText, type CardTones, type Locale, type LocaleBundle, type RuleSetDef } from '@miu/tarot-core';

/**
 * Phần nội dung cấu hình KHÁC với JSON đóng gói sẵn (chỉ ghi chỗ khác, nên chưa chỉnh gì thì trống và rất nhẹ).
 * Dùng chung cho máy chủ lẫn trình duyệt: không import gì chỉ chạy được ở một phía.
 */
export type SpreadText = { label: string; positions: Record<string, { label: string; prompt: string }> };
export type RulePatch = { priority: number; enabled: boolean; when: unknown };
export type RuleTextPatch = { text: string; topic_text?: Record<string, string> };

export type ContentPatch = {
  /** Văn bản lá bài theo bộ → ngôn ngữ → mã lá (chỉ các trường khác bản gốc) */
  cards: Record<string, Partial<Record<Locale, Record<string, Partial<CardText>>>>>;
  /** Ảnh lá bài theo bộ → mã lá */
  images: Record<string, Record<string, string>>;
  spreads: Partial<Record<Locale, Record<string, SpreadText>>>;
  /** Mỗi phần của Phân tích chuyên sâu được thay nguyên cả phần */
  analysis: Partial<Record<Locale, Record<string, unknown>>>;
  cardTones: CardTones | null;
  rules: Record<string, RulePatch>;
  ruleTexts: Partial<Record<Locale, Record<string, RuleTextPatch>>>;
  /** Bộ bài / kiểu trải bị admin tắt hiển thị */
  hiddenDecks: string[];
  hiddenSpreads: string[];
};

export const EMPTY_PATCH: ContentPatch = {
  cards: {}, images: {}, spreads: {}, analysis: {}, cardTones: null, rules: {}, ruleTexts: {}, hiddenDecks: [], hiddenSpreads: []
};

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v);

export const deepMerge = <T>(base: T, override: unknown): T => {
  if (override === undefined) return base;
  if (!isPlain(base) || !isPlain(override)) return override as T;
  const out: Plain = { ...base };
  for (const [key, value] of Object.entries(override)) out[key] = deepMerge(out[key], value);
  return out as T;
};

/** Nội dung đã gộp cho một ngôn ngữ và một bộ bài; phần không cấu hình giữ nguyên bản gốc. */
export type Configured = {
  bundle: LocaleBundle;
  ruleSet: RuleSetDef;
  cardTones: CardTones;
  /** Ảnh lá bài của bộ này (mã lá → URL) */
  images: Record<string, string>;
};

export const applyContent = (locale: Locale, deck: string, patch: ContentPatch): Configured => {
  const base = getLocaleBundle(locale);

  const cardPatch = patch.cards[deck]?.[locale] ?? {};
  const cards = { ...base.cards };
  for (const [id, change] of Object.entries(cardPatch)) if (cards[id]) cards[id] = deepMerge(cards[id], change);

  const spreadPatch = patch.spreads[locale] ?? {};
  const spreads = { ...base.ui.spreads } as Record<string, (typeof base.ui.spreads)[keyof typeof base.ui.spreads]>;
  for (const [id, text] of Object.entries(spreadPatch)) if (spreads[id]) spreads[id] = deepMerge(spreads[id], text);

  const ruleTexts = { ...base.ruleTexts };
  for (const [id, text] of Object.entries(patch.ruleTexts[locale] ?? {})) ruleTexts[id] = deepMerge(ruleTexts[id] ?? { text: '' }, text);

  const bundle: LocaleBundle = {
    ...base,
    cards,
    ruleTexts,
    ui: { ...base.ui, spreads: spreads as typeof base.ui.spreads },
    analysis: { ...base.analysis, ...(patch.analysis[locale] ?? {}) } as AnalysisText
  };

  const ruleSet: RuleSetDef = Object.keys(patch.rules).length === 0 ? RULE_SET : {
    ...RULE_SET,
    rules: RULE_SET.rules.map((rule) => {
      const change = patch.rules[rule.id];
      return change ? { ...rule, priority: change.priority, enabled: change.enabled, when: change.when as typeof rule.when } : rule;
    })
  };

  return { bundle, ruleSet, cardTones: patch.cardTones ?? CARD_TONES, images: patch.images[deck] ?? {} };
};
