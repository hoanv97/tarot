import { CARD_INDEX, LOCALES, TOPIC_IDS, getLocaleBundle, type CardText, type Locale } from '@miu/tarot-core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CardEditor } from '@/components/CardEditor';
import { Link } from '@/i18n/navigation';
import { getAdmin } from '@/lib/guard';
import { mergeCardText, type Row } from '@miu/web-shared';

export const dynamic = 'force-dynamic';

export default async function AdminCardPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ deck?: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { deck = 'rws' } = await searchParams;
  const t = await getTranslations('admin.cardEdit');
  const card = CARD_INDEX.get(id);
  if (!card) notFound();
  const admin = await getAdmin();
  if (!admin) return null;
  const { supabase } = admin;

  const [{ data: rows }, { data: image }] = await Promise.all([
    supabase.from('card_translations').select('*').eq('card_id', id).in('deck_id', ['rws', deck]),
    supabase.from('deck_cards').select('image_url').eq('deck_id', deck).eq('card_id', id).maybeSingle()
  ]);
  const find = (deckId: string, l: Locale) => (rows ?? []).find((r) => r.deck_id === deckId && r.locale === l) as Row | undefined;

  const texts = Object.fromEntries(LOCALES.map((l) => [l, mergeCardText(getLocaleBundle(l).cards[id] as CardText, find('rws', l), find(deck, l))])) as Record<Locale, CardText>;
  const customized = (rows ?? []).some((r) => r.deck_id === deck) || Boolean(image?.image_url);
  const topicNames = Object.fromEntries(LOCALES.map((l) => [l, getLocaleBundle(l).ui.topics])) as Record<Locale, Record<string, string>>;

  return (
    <section className="glass admin-panel">
      <p><Link className="link-chev" href={{ pathname: '/cards', query: { deck } }}>{t('back')}</Link></p>
      <h1 className="h2">{texts.vi.name} <code className="muted small">{id}</code></h1>
      <p className="muted">{t('deckLabel', { deck })}</p>
      <CardEditor deck={deck} cardId={id} initialImage={(image?.image_url as string | null | undefined) ?? null}
        initialTexts={texts} topics={[...TOPIC_IDS]} topicNames={topicNames} customized={customized} />
    </section>
  );
}
