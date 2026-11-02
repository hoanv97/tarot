import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContentScope } from '@/components/ContentScope';
import { DeckGrid } from '@/components/DeckGrid';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'collection' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function CollectionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'collection' });
  return (
    <div className="wrap page">
      <div className="page-head center">
        <h1 className="h2">{t('title')}</h1>
        <p className="lead">{t('lead')}</p>
      </div>
      <ContentScope><DeckGrid /></ContentScope>
    </div>
  );
}
