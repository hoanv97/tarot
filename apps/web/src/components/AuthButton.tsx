'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

export function AuthButton() {
  const t = useTranslations('nav');
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setSignedIn(false); return; }
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (signedIn === null) return null;
  if (!signedIn) return <Link href="/login">{t('login')}</Link>;
  return (
    <>
      <Link href="/admin">{t('admin')}</Link>
      <button
        type="button"
        className="link-btn"
        onClick={async () => { await createClient()?.auth.signOut(); router.refresh(); }}
      >
        {t('logout')}
      </button>
    </>
  );
}
