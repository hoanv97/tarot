'use server';

import { lintText } from '@miu/content-policy';
import { CARD_IDS, RULE_SET, TOPIC_IDS, validateAnalysis, type CardText, type Locale } from '@miu/tarot-core';
import { revalidateTag } from 'next/cache';
import { CONTENT_TAGS, effectiveAnalysis, effectiveCardTones, type AnalysisRow } from '@/lib/content-merge';
import { ANALYSIS_SECTIONS, SITE_CONTENT_KEYS, type AnalysisSection, type SiteContentKey } from './constants';
import { getAdmin } from './guard';

/**
 * Mọi thao tác ghi của trang admin đi qua đây: kiểm tra quyền, kiểm tra dữ liệu, ghi bằng phiên của chính
 * quản trị viên (RLS vẫn là lớp chặn cuối) rồi làm mới cache của phần nội dung vừa đổi.
 */
export type ActionResult = { ok: true } | { ok: false; error: string; issues?: string[] };

const LOCALES: readonly Locale[] = ['vi', 'en'];
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const MAX_TEXT = 8000;
const MAX_JSON = 200_000;

const fail = (error: string, issues?: string[]): ActionResult => ({ ok: false, error, ...(issues ? { issues } : {}) });
const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : isObject(value) ? Object.values(value).flatMap(strings) : [];

/** Mọi đoạn chữ phải qua bộ lọc chính sách nội dung (không chẩn đoán, không hứa hẹn chắc chắn...). */
const lint = (value: unknown, locale: Locale): string[] =>
  strings(value).flatMap((text) => lintText(text, locale).map((v) => v.reason));

const run = async (write: (admin: NonNullable<Awaited<ReturnType<typeof getAdmin>>>) => Promise<ActionResult>): Promise<ActionResult> => {
  const admin = await getAdmin();
  if (!admin) return fail('Bạn không có quyền thực hiện thao tác này.');
  try { return await write(admin); } catch (error) { return fail(error instanceof Error ? error.message : 'Lỗi không xác định.'); }
};

/* ---------- Lá bài ---------- */

export type CardInput = {
  deck: string;
  cardId: string;
  imageUrl: string | null;
  texts: Partial<Record<Locale, CardText>>;
};

export const saveCard = async (input: CardInput): Promise<ActionResult> => run(async ({ supabase }) => {
  if (!SLUG.test(input.deck) || !CARD_IDS.includes(input.cardId)) return fail('Bộ bài hoặc lá bài không hợp lệ.');
  if (input.imageUrl !== null && !/^https?:\/\/\S{1,500}$/.test(input.imageUrl)) return fail('Đường dẫn ảnh không hợp lệ.');

  const rows: Record<string, unknown>[] = [];
  const issues: string[] = [];
  for (const [locale, text] of Object.entries(input.texts)) {
    if (!isLocale(locale) || !text) continue;
    if (!text.name.trim()) { if (locale === 'vi') return fail('Tên lá bài (tiếng Việt) không được để trống.'); continue; }
    if (strings(text).some((s) => s.length > MAX_TEXT)) return fail(`Một đoạn chữ dài quá ${MAX_TEXT} ký tự.`);
    for (const reason of lint(text, locale)) issues.push(`${locale}: ${reason}`);
    const topics = Object.fromEntries(TOPIC_IDS.map((id) => [id, text.topics[id] ?? { upright: '', reversed: '' }]));
    rows.push({ deck_id: input.deck, card_id: input.cardId, locale, ...text, topics });
  }
  if (issues.length) return fail('Nội dung vi phạm chính sách.', [...new Set(issues)]);

  if (rows.length) {
    const { error } = await supabase.from('card_translations').upsert(rows, { onConflict: 'deck_id,card_id,locale' });
    if (error) return fail(error.message);
  }
  const { error: imageError } = await supabase.from('deck_cards').upsert({ deck_id: input.deck, card_id: input.cardId, image_url: input.imageUrl }, { onConflict: 'deck_id,card_id' });
  if (imageError) return fail(imageError.message);
  revalidateTag(CONTENT_TAGS.cards);
  return { ok: true };
});

/** "Xóa" lá bài = bỏ phần đã chỉnh của bộ này, lá quay về nội dung mặc định. */
export const resetCard = async (deck: string, cardId: string): Promise<ActionResult> => run(async ({ supabase }) => {
  if (!SLUG.test(deck) || !CARD_IDS.includes(cardId)) return fail('Bộ bài hoặc lá bài không hợp lệ.');
  const { error } = await supabase.from('card_translations').delete().eq('deck_id', deck).eq('card_id', cardId);
  if (error) return fail(error.message);
  const { error: imageError } = await supabase.from('deck_cards').update({ image_url: null }).eq('deck_id', deck).eq('card_id', cardId);
  if (imageError) return fail(imageError.message);
  revalidateTag(CONTENT_TAGS.cards);
  return { ok: true };
});

/* ---------- Bộ bài ---------- */

export type DeckInput = {
  id: string;
  sortOrder: number;
  active: boolean;
  texts: Partial<Record<Locale, { name: string; tag: string; description: string; voice: string }>>;
};

const writeDeck = async (supabase: NonNullable<Awaited<ReturnType<typeof getAdmin>>>['supabase'], deck: DeckInput, create: boolean): Promise<ActionResult> => {
  if (!SLUG.test(deck.id) || deck.id.length > 40) return fail('Mã bộ bài chỉ gồm chữ thường, số và dấu gạch ngang.');
  if (!Number.isInteger(deck.sortOrder)) return fail('Thứ tự phải là số nguyên.');
  const issues = LOCALES.flatMap((l) => lint(deck.texts[l], l));
  if (issues.length) return fail('Nội dung vi phạm chính sách.', [...new Set(issues)]);
  const base = { id: deck.id, sort_order: deck.sortOrder, active: deck.active };
  const { error } = create ? await supabase.from('decks').insert(base) : await supabase.from('decks').update(base).eq('id', deck.id);
  if (error) return fail(error.message);
  const rows = LOCALES.flatMap((locale) => {
    const t = deck.texts[locale];
    return t?.name.trim() ? [{ deck_id: deck.id, locale, name: t.name.trim(), tag: t.tag, description: t.description, voice: t.voice }] : [];
  });
  if (rows.length) {
    const { error: textError } = await supabase.from('deck_translations').upsert(rows, { onConflict: 'deck_id,locale' });
    if (textError) return fail(textError.message);
  }
  revalidateTag(CONTENT_TAGS.decks);
  return { ok: true };
};

export const createDeck = async (deck: DeckInput): Promise<ActionResult> => run(({ supabase }) => writeDeck(supabase, deck, true));
export const saveDeck = async (deck: DeckInput): Promise<ActionResult> => run(({ supabase }) => writeDeck(supabase, deck, false));

export const deleteDeck = async (id: string): Promise<ActionResult> => run(async ({ supabase }) => {
  if (id === 'rws') return fail('Không thể xóa bộ bài gốc (rws).');
  const { error } = await supabase.from('decks').delete().eq('id', id);
  if (error) return fail(error.message);
  revalidateTag(CONTENT_TAGS.decks);
  revalidateTag(CONTENT_TAGS.cards);
  return { ok: true };
});

/* ---------- Kiểu trải bài ---------- */

export type SpreadInput = {
  id: string;
  active: boolean;
  texts: Partial<Record<Locale, { label: string; positions: Record<string, { label: string; prompt: string }> }>>;
};

export const saveSpread = async (input: SpreadInput): Promise<ActionResult> => run(async ({ supabase }) => {
  const { data: spread, error: readError } = await supabase.from('spreads').select('positions').eq('id', input.id).maybeSingle();
  if (readError) return fail(readError.message);
  if (!spread) return fail('Kiểu trải không tồn tại.');
  const issues = LOCALES.flatMap((l) => lint(input.texts[l], l));
  if (issues.length) return fail('Nội dung vi phạm chính sách.', [...new Set(issues)]);

  const rows = [];
  for (const locale of LOCALES) {
    const t = input.texts[locale];
    if (!t?.label.trim()) continue;
    const positions = Object.fromEntries((spread.positions as string[]).map((p) => [p, t.positions[p] ?? { label: '', prompt: '' }]));
    if (Object.values(positions).some((p) => !p.label.trim())) return fail(`Mỗi vị trí cần có tên (${locale}).`);
    rows.push({ spread_id: input.id, locale, label: t.label.trim(), positions });
  }
  const { error: activeError } = await supabase.from('spreads').update({ active: input.active }).eq('id', input.id);
  if (activeError) return fail(activeError.message);
  if (rows.length) {
    const { error } = await supabase.from('spread_translations').upsert(rows, { onConflict: 'spread_id,locale' });
    if (error) return fail(error.message);
  }
  revalidateTag(CONTENT_TAGS.spreads);
  return { ok: true };
});

/* ---------- Chữ trên site ---------- */

const legalIssue = (value: unknown): string | null => {
  if (!isObject(value) || typeof value.title !== 'string' || typeof value.intro !== 'string' || !Array.isArray(value.sections)) return 'Cần có title, intro và sections.';
  for (const s of value.sections) {
    if (!isObject(s) || typeof s.heading !== 'string' || !s.heading.trim()) return 'Mỗi mục cần có tiêu đề.';
    for (const list of [s.paragraphs, s.items]) if (list !== undefined && !(Array.isArray(list) && list.every((x) => typeof x === 'string'))) return 'paragraphs và items phải là danh sách chữ.';
  }
  return null;
};

export const saveSiteContent = async (key: string, locale: string, value: unknown): Promise<ActionResult> => run(async ({ supabase }) => {
  if (!SITE_CONTENT_KEYS.includes(key as SiteContentKey) || !isLocale(locale)) return fail('Loại nội dung không hợp lệ.');
  if (JSON.stringify(value).length > MAX_JSON) return fail('Nội dung quá dài.');
  if ((key === 'privacy' || key === 'terms') && legalIssue(value)) return fail(legalIssue(value) as string);
  if ((key === 'home' || key === 'samples') && !isObject(value)) return fail('Nội dung phải là một đối tượng JSON.');
  const { error } = await supabase.from('site_content').upsert({ key, locale, value }, { onConflict: 'key,locale' });
  if (error) return fail(error.message);
  revalidateTag(CONTENT_TAGS.site);
  return { ok: true };
});

export const resetSiteContent = async (key: string, locale: string): Promise<ActionResult> => run(async ({ supabase }) => {
  if (!SITE_CONTENT_KEYS.includes(key as SiteContentKey) || !isLocale(locale)) return fail('Loại nội dung không hợp lệ.');
  const { error } = await supabase.from('site_content').delete().eq('key', key).eq('locale', locale);
  if (error) return fail(error.message);
  revalidateTag(CONTENT_TAGS.site);
  return { ok: true };
});

/* ---------- Phân tích chuyên sâu ---------- */

const loadAnalysisRows = async (supabase: NonNullable<Awaited<ReturnType<typeof getAdmin>>>['supabase']): Promise<AnalysisRow[]> => {
  const { data, error } = await supabase.from('analysis_sections').select('locale, section, data');
  if (error) throw new Error(error.message);
  return (data ?? []) as AnalysisRow[];
};

/** Kiểm tra bằng validateAnalysis trên bản dữ liệu SẼ có hiệu lực sau khi lưu, rồi mới ghi. */
export const saveAnalysisSection = async (locale: string, section: string, data: unknown): Promise<ActionResult> => run(async ({ supabase }) => {
  if (!isLocale(locale) || !ANALYSIS_SECTIONS.includes(section as AnalysisSection)) return fail('Phần dữ liệu không hợp lệ.');
  if (section === 'card_tone' && locale !== 'vi') return fail('Tông của lá bài chỉ cấu hình ở tiếng Việt.');
  if (data === null || data === undefined || JSON.stringify(data).length > MAX_JSON) return fail('Nội dung trống hoặc quá dài.');

  const rows = (await loadAnalysisRows(supabase)).filter((r) => !(r.locale === locale && r.section === section));
  rows.push({ locale, section, data });
  let issues: string[];
  try {
    issues = validateAnalysis(effectiveAnalysis(locale, rows), { cardIds: CARD_IDS, spreads: RULE_SET.spreads, cardTones: effectiveCardTones(rows) }).map((i) => i.message);
  } catch {
    return fail('Cấu trúc dữ liệu không đúng, không thể kiểm tra.');
  }
  issues.push(...lint(data, locale));
  if (issues.length) return fail('Dữ liệu chưa hợp lệ.', [...new Set(issues)].slice(0, 40));

  const { error } = await supabase.from('analysis_sections').upsert({ locale, section, data }, { onConflict: 'locale,section' });
  if (error) return fail(error.message);
  revalidateTag(CONTENT_TAGS.analysis);
  return { ok: true };
});

export const resetAnalysisSection = async (locale: string, section: string): Promise<ActionResult> => run(async ({ supabase }) => {
  if (!isLocale(locale) || !ANALYSIS_SECTIONS.includes(section as AnalysisSection)) return fail('Phần dữ liệu không hợp lệ.');
  const { error } = await supabase.from('analysis_sections').delete().eq('locale', locale).eq('section', section);
  if (error) return fail(error.message);
  revalidateTag(CONTENT_TAGS.analysis);
  return { ok: true };
});
