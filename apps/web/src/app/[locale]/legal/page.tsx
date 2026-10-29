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
  const blocks = ['entertainment', 'noAdvice', 'ai', 'age'] as const;
  return (
    <div className="wrap page page-tight">
      <div className="page-head center"><h1 className="h2">{t('title')}</h1></div>
      <article className="glass doc-read">
        {blocks.map((key, i) => (
          <section key={key} className="doc-sec" data-hue={i % 4}>
            <h2 className="doc-h">{t(`h_${key}`)}</h2>
            <div className="doc-bars">
              <p className="doc-bar">{t(key)}</p>
            </div>
          </section>
        ))}
        <section className="doc-sec">
          <h2 className="doc-h">{t('h_more')}</h2>
          <div className="doc-links">
            <Link href="/privacy">{t('see_privacy')}</Link>
            <Link href="/terms">{t('see_terms')}</Link>
          </div>
        </section>
      </article>
    </div>
  );
}
