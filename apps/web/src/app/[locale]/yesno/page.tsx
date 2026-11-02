import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { ContentScope } from '@/components/ContentScope';
import { YesNoClient } from '@/components/YesNoClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'yesno' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function YesNoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <ContentScope>
        <YesNoClient />
      </ContentScope>
    </Suspense>
  );
}
