import { rawLocales, rawStructure } from '@miu/tarot-data';
import type { CardIndex } from './metrics';
import { DEFAULT_LOCALE, type CardStructure, type CardText, type Locale, type RuleSetDef, type RuleTexts, type UiText } from './types';

export const CARDS: readonly CardStructure[] = rawStructure.cards as unknown as CardStructure[];
export const CARD_INDEX: CardIndex = new Map(CARDS.map((card) => [card.id, card]));
export const CARD_IDS: readonly string[] = CARDS.map((card) => card.id);
export const RULE_SET: RuleSetDef = rawStructure.rules as unknown as RuleSetDef;

type RawLocale = { cards: Record<string, Partial<CardText>>; rules: RuleTexts; ui: Partial<UiText> };

export type LocaleBundle = {
  locale: Locale;
  ui: UiText;
  cards: Record<string, CardText>;
  ruleTexts: RuleTexts;
  /** Tỉ lệ nội dung đã dịch thật (0–1). Phần chưa dịch tự rơi về tiếng Việt. */
  coverage: { cards: number; rules: number };
  /** Id các lá / luật đã có bản dịch thật ở ngôn ngữ này (tiếng Việt: tất cả) */
  translated: { cards: ReadonlySet<string>; rules: ReadonlySet<string> };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = <T>(base: T, override: unknown): T => {
  if (!isPlainObject(base) || !isPlainObject(override)) return (override === undefined ? base : (override as T));
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) out[key] = deepMerge(out[key], value);
  return out as T;
};

const raw = (locale: Locale): RawLocale => rawLocales[locale] as unknown as RawLocale;

const cache = new Map<Locale, LocaleBundle>();

/** Nạp dữ liệu một ngôn ngữ; trường nào thiếu sẽ lấy từ tiếng Việt (ngôn ngữ gốc). */
export const getLocaleBundle = (locale: Locale): LocaleBundle => {
  const cached = cache.get(locale);
  if (cached) return cached;
  const base = raw(DEFAULT_LOCALE);
  const own = raw(locale);

  const cards: Record<string, CardText> = {};
  const translatedCards = new Set<string>();
  const translatedRules = new Set<string>();
  for (const card of CARDS) {
    const baseCard = base.cards[card.id] as CardText;
    const override = own.cards[card.id];
    cards[card.id] = deepMerge(baseCard, override);
    if (locale === DEFAULT_LOCALE || (override && override.meaning_upright)) translatedCards.add(card.id);
  }

  const ruleTexts: RuleTexts = {};
  for (const rule of RULE_SET.rules) {
    const baseText = base.rules[rule.id];
    const ownText = own.rules[rule.id];
    if (baseText) ruleTexts[rule.id] = deepMerge(baseText, ownText);
    if (locale === DEFAULT_LOCALE || ownText) translatedRules.add(rule.id);
  }

  const bundle: LocaleBundle = {
    locale,
    ui: deepMerge(base.ui as UiText, own.ui),
    cards,
    ruleTexts,
    coverage: { cards: translatedCards.size / CARDS.length, rules: translatedRules.size / RULE_SET.rules.length },
    translated: { cards: translatedCards, rules: translatedRules }
  };
  cache.set(locale, bundle);
  return bundle;
};

export const getCardName = (locale: Locale, id: string): string => getLocaleBundle(locale).cards[id]?.name ?? id;
