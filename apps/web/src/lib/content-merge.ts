import { CARD_TONES, getLocaleBundle, type AnalysisText, type CardText, type CardTones, type Locale } from '@miu/tarot-core';
import { rawLocales } from '@miu/tarot-data';

/**
 * Gộp nội dung cấu hình trong Supabase lên dữ liệu JSON đóng gói sẵn.
 * Thiếu hàng hoặc trường rỗng thì giữ nguyên bản JSON, nên web luôn hiển thị được dù database trống.
 */

/** Tag dùng chung giữa nơi đọc (cache) và nơi ghi (revalidate). */
export const CONTENT_TAGS = {
  cards: 'content:cards',
  decks: 'content:decks',
  spreads: 'content:spreads',
  site: 'content:site',
  analysis: 'content:analysis'
} as const;

export type Row = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Row => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Bỏ null, chuỗi rỗng và mảng rỗng để chúng không đè lên giá trị có sẵn. */
const stripEmpty = (value: unknown): unknown => {
  if (value === null || value === undefined || value === '') return undefined;
  if (Array.isArray(value)) return value.length === 0 ? undefined : value;
  if (isPlainObject(value)) {
    const entries = Object.entries(value).flatMap(([k, v]) => { const s = stripEmpty(v); return s === undefined ? [] : [[k, s] as const]; });
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
  }
  return value;
};

const deepMerge = <T>(base: T, override: unknown): T => {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T;
  const out: Row = { ...base };
  for (const [key, value] of Object.entries(override)) out[key] = deepMerge(out[key], value);
  return out as T;
};

export const CARD_TEXT_COLUMNS = ['name', 'keywords_upright', 'keywords_reversed', 'meaning_upright', 'meaning_reversed', 'topics', 'symbolism', 'miu'] as const;

/** Nội dung một lá: JSON → bản của bộ rws → bản riêng của bộ đang xem. */
export const mergeCardText = (base: CardText, ...rows: (Row | undefined)[]): CardText =>
  rows.reduce<CardText>((acc, row) => {
    if (!row) return acc;
    const picked = Object.fromEntries(CARD_TEXT_COLUMNS.flatMap((k) => (row[k] === undefined ? [] : [[k, row[k]]])));
    return deepMerge(acc, stripEmpty(picked));
  }, base);

export type AnalysisRow = { locale: string; section: string; data: unknown };

const rowsFor = (rows: readonly AnalysisRow[], locale: string) => rows.filter((r) => r.locale === locale && r.section !== 'card_tone');

/**
 * Dữ liệu Phân tích chuyên sâu đang có hiệu lực. Mỗi phần (labels, intents, pairs...) được thay nguyên cả phần:
 * bản database của ngôn ngữ → bản JSON của ngôn ngữ → bản database tiếng Việt → bản JSON tiếng Việt.
 */
export const effectiveAnalysis = (locale: Locale, rows: readonly AnalysisRow[]): AnalysisText => {
  const out: Row = { ...(getLocaleBundle(locale).analysis as unknown as Row) };
  if (locale !== 'vi') {
    const own = rawLocales[locale].analysis as unknown as Row;
    for (const row of rowsFor(rows, 'vi')) if (own[row.section] === undefined) out[row.section] = row.data;
  }
  for (const row of rowsFor(rows, locale)) out[row.section] = row.data;
  return out as unknown as AnalysisText;
};

export const effectiveCardTones = (rows: readonly AnalysisRow[]): CardTones =>
  (rows.find((r) => r.locale === 'vi' && r.section === 'card_tone')?.data as CardTones | undefined) ?? CARD_TONES;
