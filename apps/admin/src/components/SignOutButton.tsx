'use client';

import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const t = useTranslations('admin.shell');
  const locale = useLocale();
  const signOut = async () => {
    await createClient()?.auth.signOut();
    window.location.assign(`/${locale}/login`);
  };
  return <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>{t('signOut')}</button>;
}
