import { LOCALES } from '@miu/tarot-core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CollectionAlbum } from '@/components/CollectionAlbum';
import { ContentScope } from '@/components/ContentScope';
import { DECK_IDS } from '@/lib/art/draw';

type Props = { params: Promise<{ locale: string; deck: string }> };

export const generateStaticParams = () => LOCALES.flatMap((locale) => DECK_IDS.map((deck) => ({ locale, deck })));
export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const { locale, deck } = await params;
  if (!DECK_IDS.includes(deck)) return {};
  const t = await getTranslations({ locale, namespace: 'decks' });
  return { title: t(`${deck}.name`), description: t(`${deck}.desc`) };
}

export default async function DeckAlbumPage({ params }: Props) {
  const { locale, deck } = await params;
  setRequestLocale(locale);
  if (!DECK_IDS.includes(deck)) notFound();
  return <ContentScope><CollectionAlbum deck={deck} /></ContentScope>;
}
