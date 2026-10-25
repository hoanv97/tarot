import { CARDS, getLocaleBundle, isLocale, DEFAULT_LOCALE } from '@miu/tarot-core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AddCardPicker } from '@/components/admin/AddCardPicker';
import { Link } from '@/i18n/navigation';
import { CARDS_PER_PAGE } from '@/lib/admin/constants';
import { getAdmin } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';

type SearchParams = { q?: string; deck?: string; page?: string };

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

export default async function AdminCardsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const query = await searchParams;
  const t = await getTranslations('admin.cards');
  const admin = await getAdmin();
  if (!admin) return null;
  const { supabase } = admin;

  const loadDeckRows = (deckId: string) => Promise.all([
    supabase.from('card_translations').select('card_id, name').eq('deck_id', deckId).eq('locale', locale),
    supabase.from('card_translations').select('card_id, name').eq('deck_id', 'rws').eq('locale', locale),
    supabase.from('deck_cards').select('card_id, image_url').eq('deck_id', deckId)
  ]);

  // Danh sách bộ bài và dữ liệu của bộ được yêu cầu (mặc định rws) lấy song song để khỏi chờ nhau.
  const requested = /^[a-z0-9][a-z0-9-]*$/.test(query.deck ?? '') ? (query.deck as string) : 'rws';
  const [{ data: deckRows }, firstRows] = await Promise.all([
    supabase.from('decks').select('id, sort_order, deck_translations(locale, name)').order('sort_order'),
    loadDeckRows(requested)
  ]);
  const decks = (deckRows ?? []).map((d) => {
    const names = (d.deck_translations ?? []) as { locale: string; name: string }[];
    return { id: d.id as string, name: names.find((n) => n.locale === locale)?.name ?? names[0]?.name ?? (d.id as string) };
  });
  // Mã bộ bài không tồn tại thì rơi về bộ đầu tiên (hiếm, mới phải lấy lại).
  const deck = decks.some((d) => d.id === requested) ? requested : (decks[0]?.id ?? 'rws');
  const [{ data: own }, { data: base }, { data: images }] = deck === requested ? firstRows : await loadDeckRows(deck);
  const customized = new Set((own ?? []).map((r) => r.card_id as string));
  const nameOf = new Map([...(base ?? []), ...(own ?? [])].map((r) => [r.card_id as string, r.name as string]));
  const imageOf = new Map((images ?? []).map((r) => [r.card_id as string, r.image_url as string | null]));
  const bundle = getLocaleBundle(locale);

  const all = CARDS.map((card) => {
    const name = nameOf.get(card.id) ?? bundle.cards[card.id]?.name ?? card.id;
    return { id: card.id, name, image: imageOf.get(card.id) ?? null, custom: customized.has(card.id) || Boolean(imageOf.get(card.id)) };
  });
  const q = fold(query.q?.trim() ?? '');
  const filtered = q ? all.filter((c) => fold(c.name).includes(q) || c.id.includes(q)) : all;
  const pages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(query.page) || 1));
  const rows = filtered.slice((page - 1) * CARDS_PER_PAGE, page * CARDS_PER_PAGE);
  const href = (p: number) => ({ pathname: '/admin/cards', query: { ...(q ? { q: query.q } : {}), deck, page: String(p) } });

  return (
    <section className="glass admin-panel">
      <h1 className="h2">{t('title')}</h1>
      <p className="muted">{t('lead')}</p>

      <form className="admin-toolbar" role="search">
        <div className="field"><label htmlFor="q">{t('search')}</label>
          <input className="input" id="q" name="q" type="search" defaultValue={query.q ?? ''} /></div>
        <div className="field"><label htmlFor="deck">{t('deck')}</label>
          <select className="input" id="deck" name="deck" defaultValue={deck}>{decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        <div className="field"><button className="btn btn-primary" type="submit">{t('apply')}</button></div>
      </form>

      <AddCardPicker deck={deck} options={all.filter((c) => !c.custom).map((c) => ({ id: c.id, name: c.name }))} />

      {rows.length === 0 ? <p className="muted">{t('empty')}</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">{t('image')}</th><th scope="col">{t('name')}</th><th scope="col">ID</th><th scope="col">{t('status')}</th><th scope="col"><span className="sr-only">{t('edit')}</span></th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td>{c.image ? <img className="admin-thumb" src={c.image} alt="" loading="lazy" width={36} height={56} /> : <span className="muted small">—</span>}</td>
                <td>{c.name}</td>
                <td><code>{c.id}</code></td>
                <td><span className={c.custom ? 'tag' : 'muted small'}>{c.custom ? t('statusCustom') : t('statusDefault')}</span></td>
                <td><Link className="link-chev" href={{ pathname: `/admin/cards/${c.id}`, query: { deck } }}>{t('edit')}</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <nav className="admin-pager" aria-label={t('pager')}>
        {page > 1 ? <Link className="btn btn-secondary" href={href(page - 1)}>{t('prev')}</Link> : <span />}
        <span className="muted small">{t('pageOf', { page, pages, total: filtered.length })}</span>
        {page < pages ? <Link className="btn btn-secondary" href={href(page + 1)}>{t('next')}</Link> : <span />}
      </nav>
    </section>
  );
}
