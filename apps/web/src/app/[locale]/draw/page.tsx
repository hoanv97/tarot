import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { DrawClient } from '@/components/DrawClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: t('draw') };
}

export default async function DrawPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <DrawClient />
    </Suspense>
  );
}
