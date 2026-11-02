import { CARD_INDEX, CARD_IDS, DEFAULT_LOCALE, LOCALES, isLocale } from '@miu/tarot-core';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CardDetail } from '@/components/CardDetail';
import { ContentScope } from '@/components/ContentScope';
import { DECK_IDS } from '@/lib/art/draw';
import { getConfigured } from '@/lib/content';

type Props = { params: Promise<{ locale: string; deck: string; id: string }> };

// 3 bộ × 78 lá × số ngôn ngữ được tạo sẵn lúc build.
export const generateStaticParams = () => LOCALES.flatMap((locale) => DECK_IDS.flatMap((deck) => CARD_IDS.map((id) => ({ locale, deck, id }))));
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, deck, id } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const card = (await getConfigured(locale)).bundle.cards[id];
  if (!card || !DECK_IDS.includes(deck)) return {};
  return {
    title: card.name,
    description: card.meaning_upright.slice(0, 155),
    alternates: { canonical: `/${locale}/collection/${deck}/${id}`, languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/collection/${deck}/${id}`])) }
  };
}

export default async function CardPage({ params }: Props) {
  const { locale, deck, id } = await params;
  setRequestLocale(locale);
  if (!DECK_IDS.includes(deck) || !CARD_INDEX.has(id)) notFound();
  return <ContentScope><CardDetail key={`${deck}:${id}`} deck={deck} id={id} /></ContentScope>;
}
