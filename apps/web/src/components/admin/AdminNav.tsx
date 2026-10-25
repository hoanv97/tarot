'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const ITEMS = ['cards', 'decks', 'spreads', 'content', 'analysis', 'rules'] as const;

export function AdminNav() {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label={t('aria')}>
      {ITEMS.map((key) => {
        const href = `/admin/${key}` as const;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={key} href={href} className={active ? 'chip is-on' : 'chip'} aria-current={active ? 'page' : undefined}>{t(key)}</Link>;
      })}
    </nav>
  );
}
