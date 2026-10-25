import { CARD_INDEX, CARD_IDS, DEFAULT_LOCALE, LOCALES, isLocale } from '@miu/tarot-core';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CardsExplorer } from '@/components/CardsExplorer';
import { ContentScope } from '@/components/ContentScope';
import { getConfigured } from '@/lib/content';

type Props = { params: Promise<{ locale: string; id: string }> };

// 78 lá × số ngôn ngữ trang được tạo sẵn lúc build: nhanh và tốt cho SEO.
export const generateStaticParams = () => LOCALES.flatMap((locale) => CARD_IDS.map((id) => ({ locale, id })));
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const card = (await getConfigured(locale)).bundle.cards[id];
  if (!card) return {};
  return {
    title: card.name,
    description: card.meaning_upright.slice(0, 155),
    alternates: { canonical: `/${locale}/cards/${id}`, languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/cards/${id}`])) }
  };
}

export default async function CardPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!CARD_INDEX.has(id)) notFound();
  return <ContentScope><CardsExplorer initialId={id} /></ContentScope>;
}
