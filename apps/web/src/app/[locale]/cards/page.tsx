import { CARDS } from '@miu/tarot-core';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CardsExplorer } from '@/components/CardsExplorer';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'cards' });
  return { title: t('title', { n: CARDS.length }), description: t('lead') };
}

export default async function CardsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CardsExplorer initialId={CARDS[0]?.id as string} />;
}
