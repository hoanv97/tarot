/**
 * Nạp nội dung có sẵn trong @miu/tarot-data (và messages của web) vào Supabase.
 * Chạy: pnpm --filter @miu/api seed [--force]
 * Mặc định chỉ thêm hàng còn thiếu, không ghi đè phần admin đã sửa; --force để ghi đè.
 * Cần SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY (chỉ đặt trên máy chạy script, không đưa vào web).
 */
import { readFileSync } from 'node:fs';
import { rawLocales, rawStructure } from '@miu/tarot-data';

for (const file of ['../../.env', '.env']) {
  try { process.loadEnvFile(file); } catch { /* không có file thì bỏ qua */ }
}

const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
const force = process.argv.includes('--force');

type Row = Record<string, unknown>;
type Messages = { home: Record<string, unknown>; draw: { samples: unknown }; decks: Record<string, { name: string; tag: string; desc: string; voice: string }> };

const LOCALES = ['vi', 'en'] as const;
const messages = (locale: string) => JSON.parse(readFileSync(new URL(`../../web/messages/${locale}.json`, import.meta.url), 'utf8')) as Messages;

const upsert = async (table: string, conflict: string, rows: Row[]) => {
  // Gửi riêng từng nhóm hàng có cùng danh sách cột, để cột vắng mặt dùng giá trị mặc định thay vì bị ghi null.
  const groups = new Map<string, Row[]>();
  for (const row of rows) groups.set(Object.keys(row).sort().join(','), [...(groups.get(Object.keys(row).sort().join(',')) ?? []), row]);
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 500) {
      const res = await fetch(`${url}/rest/v1/${table}?on_conflict=${conflict}`, {
        method: 'POST',
        headers: {
          apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json',
          prefer: `resolution=${force ? 'merge' : 'ignore'}-duplicates,return=minimal`
        },
        body: JSON.stringify(group.slice(i, i + 500))
      });
      if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    }
  }
  console.log(`${table}: ${rows.length} hàng`);
};

const cards = rawStructure.cards as unknown as Row[];
const deckIds = Object.keys(messages('vi').decks);

await upsert('decks', 'id', deckIds.map((id, sort_order) => ({ id, sort_order })));
await upsert('deck_translations', 'deck_id,locale', LOCALES.flatMap((locale) =>
  Object.entries(messages(locale).decks).map(([deck_id, d]) => ({ deck_id, locale, name: d.name, tag: d.tag, description: d.desc, voice: d.voice }))
));
await upsert('cards', 'id', cards.map(({ id, arcana, suit, rank, number, numerology, element, sort_order }) => ({ id, arcana, suit, rank, number, numerology, element, sort_order })));
await upsert('deck_cards', 'deck_id,card_id', deckIds.flatMap((deck_id) => cards.map((c) => ({ deck_id, card_id: c.id }))));

const cardColumns = ['name', 'keywords_upright', 'keywords_reversed', 'meaning_upright', 'meaning_reversed', 'topics', 'symbolism', 'miu'] as const;
await upsert('card_translations', 'deck_id,card_id,locale', LOCALES.flatMap((locale) =>
  Object.entries(rawLocales[locale].cards as Record<string, Row>).map(([card_id, text]) => ({
    deck_id: 'rws', card_id, locale, ...Object.fromEntries(cardColumns.filter((k) => text[k] !== undefined).map((k) => [k, text[k]]))
  }))
));

const spreads = (rawStructure.rules as unknown as { spreads: { id: string; card_count: number; positions: string[] }[] }).spreads;
await upsert('spreads', 'id', spreads.map((s, sort_order) => ({ id: s.id, card_count: s.card_count, positions: s.positions, sort_order })));
await upsert('spread_translations', 'spread_id,locale', LOCALES.flatMap((locale) => {
  const ui = rawLocales[locale].ui as unknown as { spreads?: Record<string, { label: string; positions: unknown }> };
  return spreads.flatMap((s) => (ui.spreads?.[s.id] ? [{ spread_id: s.id, locale, label: ui.spreads[s.id]!.label, positions: ui.spreads[s.id]!.positions }] : []));
}));

await upsert('site_content', 'key,locale', LOCALES.flatMap((locale) => {
  const m = messages(locale);
  return [{ key: 'home', locale, value: m.home }, { key: 'samples', locale, value: m.draw.samples }];
}));

const cardTone = (rawStructure.analysis as unknown as { card_tone: unknown }).card_tone;
await upsert('analysis_sections', 'locale,section', [
  { locale: 'vi', section: 'card_tone', data: cardTone },
  ...LOCALES.flatMap((locale) =>
    Object.entries(rawLocales[locale].analysis as Row)
      .filter(([section]) => section !== '_doc' && section !== 'version')
      .map(([section, data]) => ({ locale, section, data }))
  )
]);
console.log(force ? 'Xong (đã ghi đè).' : 'Xong (chỉ thêm phần còn thiếu).');
