import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalDocView } from '@/components/LegalDocView';
import { getLegalDocConfigured } from '@/lib/content';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: (await getLegalDocConfigured(locale, 'terms')).title };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  return (
    <LegalDocView
      doc={await getLegalDocConfigured(locale, 'terms')}
      updatedLabel={t('updated')}
      otherHref="/privacy"
      otherLabel={t('see_privacy')}
    />
  );
}
