import { CARD_IDS, CARD_TONES, RULE_SET, getLocaleBundle, type CardText, type Locale } from '@miu/tarot-core';
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { siteFallback } from './content-fallback';
import {
  CONTENT_TAGS, effectiveAnalysis, effectiveCardTones, mergeCardText, type AnalysisRow, type Row
} from './content-merge';
import { EMPTY_PATCH, applyContent, deepMerge, type ContentPatch, type Configured, type RulePatch, type RuleTextPatch, type SpreadText } from './content-patch';
import { getLegalDoc, type LegalDoc, type LegalKind } from './legal-content';

/**
 * Đọc nội dung cấu hình từ Supabase ở máy chủ (khóa anon, đọc công khai nhờ RLS), có cache theo tag.
 * Khi admin lưu, revalidateTag làm mới đúng phần liên quan; ngoài ra mỗi mục tự làm mới sau REVALIDATE_SECONDS.
 * Thiếu cấu hình Supabase, lỗi mạng hoặc chưa có hàng nào: trả về bản trống, web dùng JSON đóng gói sẵn.
 */
const REVALIDATE_SECONDS = 300;
const LOCALES: readonly Locale[] = ['vi', 'en'];
const MESSAGES = { vi, en } as const;

const isConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const database = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

/** Đọc hết một bảng (Supabase giới hạn 1000 hàng mỗi lần). */
const fetchAll = async (table: string, columns: string): Promise<Row[]> => {
  const db = database();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) return rows;
  }
};

/** Gói một hàm đọc bằng cache có tag; lỗi thì không bị cache (hàm ném lỗi) và trả về bản trống. */
const cachedPatch = <T>(name: string, tag: string, empty: T, load: () => Promise<T>) => {
  const run = unstable_cache(load, ['content', name], { tags: [tag], revalidate: REVALIDATE_SECONDS });
  return async (): Promise<T> => {
    if (!isConfigured()) return empty;
    try { return await run(); } catch (error) {
      console.warn(`[content] ${name}: dùng dữ liệu đóng gói sẵn (${error instanceof Error ? error.message : 'lỗi'})`);
      return empty;
    }
  };
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Các trường của `next` khác `base` (so sánh sâu theo đối tượng, mảng so nguyên). */
const diff = (base: unknown, next: unknown): unknown => {
  if (typeof base === 'object' && base !== null && !Array.isArray(base) && typeof next === 'object' && next !== null && !Array.isArray(next)) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next)) {
      const d = diff((base as Record<string, unknown>)[key], value);
      if (d !== undefined) out[key] = d;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return same(base, next) ? undefined : next;
};

/* ---------- Lá bài (văn bản và ảnh theo bộ) ---------- */

const loadCards = async (): Promise<Pick<ContentPatch, 'cards' | 'images'>> => {
  const [texts, images] = await Promise.all([
    fetchAll('card_translations', 'deck_id, card_id, locale, name, keywords_upright, keywords_reversed, meaning_upright, meaning_reversed, topics, symbolism, miu'),
    fetchAll('deck_cards', 'deck_id, card_id, image_url')
  ]);
  const decks = [...new Set([...texts, ...images].map((r) => r.deck_id as string))];
  const find = (deck: string, card: string, locale: Locale) => texts.find((r) => r.deck_id === deck && r.card_id === card && r.locale === locale);

  const out: Pick<ContentPatch, 'cards' | 'images'> = { cards: {}, images: {} };
  for (const deck of decks) {
    for (const locale of LOCALES) {
      const base = getLocaleBundle(locale).cards;
      for (const id of CARD_IDS) {
        const effective = mergeCardText(base[id] as CardText, find('rws', id, locale), deck === 'rws' ? undefined : find(deck, id, locale));
        const change = diff(base[id], effective) as Partial<CardText> | undefined;
        if (change) ((out.cards[deck] ??= {})[locale] ??= {})[id] = change;
      }
    }
  }
  for (const row of images) if (row.image_url) (out.images[row.deck_id as string] ??= {})[row.card_id as string] = row.image_url as string;
  return out;
};

/* ---------- Kiểu trải bài và bộ bài (hiển thị) ---------- */

const loadSpreads = async (): Promise<Pick<ContentPatch, 'spreads' | 'hiddenSpreads'>> => {
  const [spreads, texts] = await Promise.all([fetchAll('spreads', 'id, active'), fetchAll('spread_translations', 'spread_id, locale, label, positions')]);
  const out: Pick<ContentPatch, 'spreads' | 'hiddenSpreads'> = { spreads: {}, hiddenSpreads: spreads.filter((s) => s.active === false).map((s) => s.id as string) };
  for (const row of texts) {
    const locale = row.locale as Locale;
    const id = row.spread_id as string;
    const base = (getLocaleBundle(locale).ui.spreads as Record<string, SpreadText | undefined>)[id];
    if (!base) continue;
    // Chỉ lấy phần có chữ; ô trống nghĩa là chưa nhập nên giữ bản gốc.
    const given = (row.positions ?? {}) as Record<string, { label?: string; prompt?: string }>;
    const positions = Object.fromEntries(Object.entries(base.positions).map(([key, p]) => [key, { label: given[key]?.label || p.label, prompt: given[key]?.prompt || p.prompt }]));
    const change = diff(base, { label: (row.label as string) || base.label, positions }) as SpreadText | undefined;
    if (change) (out.spreads[locale] ??= {})[id] = deepMerge(base, change);
  }
  return out;
};

const loadDecks = async (): Promise<{ hiddenDecks: string[]; texts: Record<Locale, Record<string, Record<string, string>>> }> => {
  const [decks, texts] = await Promise.all([fetchAll('decks', 'id, active'), fetchAll('deck_translations', 'deck_id, locale, name, tag, description, voice')]);
  const out = { hiddenDecks: decks.filter((d) => d.active === false).map((d) => d.id as string), texts: { vi: {}, en: {} } as Record<Locale, Record<string, Record<string, string>>> };
  for (const row of texts) {
    const locale = row.locale as Locale;
    const id = row.deck_id as string;
    const base = (MESSAGES[locale].decks as Record<string, Record<string, string> | undefined>)[id];
    if (!base) continue; // chỉ cấu hình được chữ của các bộ đã có hình vẽ trong code
    const next = { name: row.name, tag: row.tag, desc: row.description, voice: row.voice } as Record<string, string | null>;
    const change = Object.fromEntries(Object.entries(next).filter(([key, value]) => value && value !== base[key])) as Record<string, string>;
    if (Object.keys(change).length) out.texts[locale][id] = change;
  }
  return out;
};

/* ---------- Phân tích chuyên sâu ---------- */

const loadAnalysis = async (): Promise<Pick<ContentPatch, 'analysis' | 'cardTones'>> => {
  const rows = (await fetchAll('analysis_sections', 'locale, section, data')) as unknown as AnalysisRow[];
  const out: Pick<ContentPatch, 'analysis' | 'cardTones'> = { analysis: {}, cardTones: null };
  for (const locale of LOCALES) {
    const base = getLocaleBundle(locale).analysis as unknown as Record<string, unknown>;
    const effective = effectiveAnalysis(locale, rows) as unknown as Record<string, unknown>;
    for (const [section, value] of Object.entries(effective)) {
      if (!same(base[section], value)) (out.analysis[locale] ??= {})[section] = value;
    }
  }
  const tones = effectiveCardTones(rows);
  if (!same(tones, CARD_TONES)) out.cardTones = tones;
  return out;
};

/* ---------- Luật tầng 2 ---------- */

const loadRules = async (): Promise<Pick<ContentPatch, 'rules' | 'ruleTexts'>> => {
  const [rules, texts] = await Promise.all([fetchAll('rules', 'id, priority, enabled, when_json'), fetchAll('rule_translations', 'rule_id, locale, text, topic_text')]);
  const out: Pick<ContentPatch, 'rules' | 'ruleTexts'> = { rules: {}, ruleTexts: {} };
  for (const row of rules) {
    const base = RULE_SET.rules.find((r) => r.id === row.id);
    if (!base) continue;
    const next: RulePatch = { priority: row.priority as number, enabled: row.enabled as boolean, when: row.when_json };
    if (next.priority !== base.priority || next.enabled !== (base.enabled !== false) || !same(next.when, base.when)) out.rules[row.id as string] = next;
  }
  for (const row of texts) {
    const locale = row.locale as Locale;
    const id = row.rule_id as string;
    const base = getLocaleBundle(locale).ruleTexts[id];
    if (!base || !row.text) continue;
    const topic = (row.topic_text ?? {}) as Record<string, string>;
    const next: RuleTextPatch = { text: row.text as string, ...(Object.keys(topic).length ? { topic_text: topic } : {}) };
    if (next.text !== base.text || (next.topic_text && !same(next.topic_text, base.topic_text))) (out.ruleTexts[locale] ??= {})[id] = next;
  }
  return out;
};

/* ---------- Chữ trên site (messages và trang pháp lý) ---------- */

const loadSite = async (): Promise<Record<Locale, Record<string, unknown>>> => {
  const rows = await fetchAll('site_content', 'key, locale, value');
  const out = { vi: {}, en: {} } as Record<Locale, Record<string, unknown>>;
  for (const row of rows) {
    const locale = row.locale as Locale;
    const key = row.key as string;
    if (!same(siteFallback(key, locale), row.value)) out[locale][key] = row.value;
  }
  return out;
};

const emptySite = { vi: {}, en: {} } as Record<Locale, Record<string, unknown>>;
const getCardsPatch = cachedPatch('cards', CONTENT_TAGS.cards, { cards: {}, images: {} } as Pick<ContentPatch, 'cards' | 'images'>, loadCards);
const getSpreadsPatch = cachedPatch('spreads', CONTENT_TAGS.spreads, { spreads: {}, hiddenSpreads: [] } as Pick<ContentPatch, 'spreads' | 'hiddenSpreads'>, loadSpreads);
const getDecksPatch = cachedPatch('decks', CONTENT_TAGS.decks, { hiddenDecks: [], texts: { vi: {}, en: {} } } as Awaited<ReturnType<typeof loadDecks>>, loadDecks);
const getAnalysisPatch = cachedPatch('analysis', CONTENT_TAGS.analysis, { analysis: {}, cardTones: null } as Pick<ContentPatch, 'analysis' | 'cardTones'>, loadAnalysis);
const getRulesPatch = cachedPatch('rules', CONTENT_TAGS.rules, { rules: {}, ruleTexts: {} } as Pick<ContentPatch, 'rules' | 'ruleTexts'>, loadRules);
const getSite = cachedPatch('site', CONTENT_TAGS.site, emptySite, loadSite);

/** Toàn bộ phần cấu hình mà các thành phần ở trình duyệt cần (lá bài, ảnh, kiểu trải, phân tích, luật). */
export const getContentPatch = async (): Promise<ContentPatch> => {
  const [cards, spreads, decks, analysis, rules] = await Promise.all([getCardsPatch(), getSpreadsPatch(), getDecksPatch(), getAnalysisPatch(), getRulesPatch()]);
  const patch: ContentPatch = { ...EMPTY_PATCH, ...cards, ...spreads, ...analysis, ...rules, hiddenDecks: decks.hiddenDecks };
  return patch;
};

/** Nội dung đã gộp cho một ngôn ngữ và bộ bài, dùng ở server component. */
export const getConfigured = async (locale: Locale, deck = 'rws'): Promise<Configured> => applyContent(locale, deck, await getContentPatch());

/** Messages của next-intl kèm phần chữ trang chủ, câu hỏi gợi ý và thông tin bộ bài đã cấu hình. */
export const getMessageOverrides = async (locale: Locale): Promise<Record<string, unknown>> => {
  const [site, decks] = await Promise.all([getSite(), getDecksPatch()]);
  const overrides: Record<string, unknown> = {};
  if (site[locale].home !== undefined) overrides.home = site[locale].home;
  if (site[locale].samples !== undefined) overrides.draw = { samples: site[locale].samples };
  if (Object.keys(decks.texts[locale]).length) overrides.decks = decks.texts[locale];
  return overrides;
};

export const getLegalDocConfigured = async (locale: string, kind: LegalKind): Promise<LegalDoc> => {
  const known = LOCALES.find((l) => l === locale);
  if (!known) return getLegalDoc(locale, kind);
  const site = await getSite();
  return (site[known][kind] as LegalDoc | undefined) ?? getLegalDoc(known, kind);
};
