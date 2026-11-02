import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProfileClient } from '@/components/ProfileClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'profile' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileClient />;
}
