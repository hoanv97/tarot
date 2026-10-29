import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { ContentScope } from '@/components/ContentScope';
import { DrawClient } from '@/components/DrawClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('daily') };
}

export default async function DailyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <ContentScope>
        <DrawClient daily />
      </ContentScope>
    </Suspense>
  );
}
