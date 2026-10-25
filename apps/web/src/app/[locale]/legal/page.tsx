import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return { title: t('title') };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  return (
    <div className="wrap page page-tight">
      <div className="page-head center"><h1 className="h2">{t('title')}</h1></div>
      <div className="glass" style={{ padding: 28, display: 'grid', gap: 16 }}>
        <p>{t('entertainment')}</p>
        <p>{t('noAdvice')}</p>
        <p>{t('ai')}</p>
        <p className="muted">{t('age')}</p>
        <p className="muted">
          <Link href="/privacy">{t('see_privacy')}</Link> · <Link href="/terms">{t('see_terms')}</Link>
        </p>
      </div>
    </div>
  );
}
