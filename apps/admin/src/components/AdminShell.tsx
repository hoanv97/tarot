'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';

const ICON = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };

const ICONS = {
  cards: <svg {...ICON}><rect x="5" y="3.5" width="11" height="16" rx="2" /><path d="M9 20.5h8a2 2 0 0 0 2-2V8" /></svg>,
  decks: <svg {...ICON}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></svg>,
  spreads: <svg {...ICON}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="8.5" y="13.5" width="7" height="7" rx="1.5" /></svg>,
  content: <svg {...ICON}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>,
  analysis: <svg {...ICON}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
  rules: <svg {...ICON}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>,
  users: <svg {...ICON}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.7 3.5 5.7" /></svg>
};

/** Địa chỉ trang web công khai (đặt NEXT_PUBLIC_WEB_URL khi triển khai). */
const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

const GROUPS = [
  { id: 'content', items: ['cards', 'decks', 'spreads', 'content', 'analysis', 'rules'] },
  { id: 'system', items: ['users'] }
] as const;

/** Khung riêng của khu quản trị: menu dọc bên trái (thành ngăn kéo trên màn hình nhỏ), không dùng khung của trang công khai. */
export function AdminShell({ name, children }: { name: string; children: ReactNode }) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => { setDark(document.documentElement.getAttribute('data-theme') === 'dark'); }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('miu-tarot.theme', next); } catch { /* bỏ qua */ }
    setDark(!dark);
  };

  const signOut = async () => {
    await createClient()?.auth.signOut();
    window.location.assign(`/${locale}/login`);
  };

  const otherLocale = routing.locales.find((l) => l !== locale) ?? locale;

  return (
    <div className="adm-shell">
      <header className="adm-topbar">
        <button type="button" className="icon-btn adm-menu-btn" aria-expanded={open} aria-controls="adm-sidebar" aria-label={open ? t('shell.closeMenu') : t('shell.openMenu')} onClick={() => setOpen(!open)}>
          <svg {...ICON}>{open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
        <span className="adm-brand-text">{t('shell.title')}</span>
      </header>

      <div className={`adm-backdrop${open ? ' is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside id="adm-sidebar" className={`adm-sidebar${open ? ' is-open' : ''}`}>
        <div className="adm-brand">
          <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="14" fill="#7C3AED" /><path d="M15.5 7.5a7 7 0 1 0 5 11.8 5.6 5.6 0 0 1-5-11.8z" fill="#fff" /></svg>
          <span><strong>Miu Tarot</strong><small>{t('shell.title')}</small></span>
        </div>

        <nav className="adm-nav" aria-label={t('nav.aria')}>
          {GROUPS.map((group) => (
            <div key={group.id} className="adm-group">
              <p className="adm-group-title">{t(`shell.groups.${group.id}`)}</p>
              {group.items.map((key) => {
                const href = `/${key}` as const;
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link key={key} href={href} className="adm-link" aria-current={active ? 'page' : undefined}>
                    {ICONS[key]}<span>{t(`nav.${key}`)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="adm-foot">
          <div className="adm-tools">
            <button type="button" className="lang-btn" onClick={() => router.replace(pathname, { locale: otherLocale })} aria-label={`${t('shell.language')}: ${otherLocale.toUpperCase()}`}>{otherLocale.toUpperCase()}</button>
            <button type="button" className="theme-toggle" aria-pressed={dark} aria-label={dark ? t('shell.themeLight') : t('shell.themeDark')} title={dark ? t('shell.themeLight') : t('shell.themeDark')} onClick={toggleTheme}>
              <svg className="ico-sun" {...ICON}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></svg>
              <svg className="ico-moon" {...ICON}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
            </button>
          </div>
          <a href={`${WEB_URL}/${locale}`} className="adm-link adm-back">
            <svg {...ICON}><path d="M15 6l-6 6 6 6" /></svg><span>{t('shell.backToSite')}</span>
          </a>
          <div className="adm-user">
            <span className="avatar sm" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
            <span className="adm-user-name">{name}</span>
            <button type="button" className="btn btn-text" onClick={() => void signOut()}>{t('shell.signOut')}</button>
          </div>
        </div>
      </aside>

      <main id="main" className="adm-main" tabIndex={-1}>{children}</main>
    </div>
  );
}
