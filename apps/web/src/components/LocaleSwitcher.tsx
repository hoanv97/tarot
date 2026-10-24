'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LABEL: Record<string, string> = { vi: 'Tiếng Việt', en: 'English' };

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      style={{ width: 'auto', minHeight: 36, padding: '2px 8px' }}
    >
      {routing.locales.map((l) => <option key={l} value={l}>{LABEL[l] ?? l}</option>)}
    </select>
  );
}
