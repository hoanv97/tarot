import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalDocView } from '@/components/LegalDocView';
import { getLegalDocConfigured } from '@/lib/content';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: (await getLegalDocConfigured(locale, 'privacy')).title };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');
  return (
    <LegalDocView
      doc={await getLegalDocConfigured(locale, 'privacy')}
      updatedLabel={t('updated')}
      otherHref="/terms"
      otherLabel={t('see_terms')}
    />
  );
}
