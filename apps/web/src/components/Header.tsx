'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { KEYS, storeGet, storeSet } from '@/lib/store';
import { prefersReducedMotion } from '@/lib/motion';
import { useAuth } from '@/lib/use-auth';

const TAB = { className: 'tab-ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const, 'aria-hidden': true as const };

const ICONS = {
  home: <svg {...TAB}><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  draw: <svg {...TAB}><rect x="4" y="6" width="11" height="15" rx="2" /><path d="M8 3h10a2 2 0 0 1 2 2v13" /><path d="M9.5 11.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" /></svg>,
  cards: <svg {...TAB}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></svg>,
  admin: <svg {...TAB}><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>,
  history: <svg {...TAB}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
};

const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0F0B1A' : '#FBF8F4');
};

export function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [dark, setDark] = useState(false);
  const [companionOn, setCompanionOn] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.getAttribute('data-theme') === 'dark');
    setCompanionOn(storeGet<boolean>(KEYS.companion, true) !== false);
  }, []);

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = dark ? 'light' : 'dark';
    try { localStorage.setItem(KEYS.theme, next); } catch { /* bỏ qua */ }
    const commit = () => { applyTheme(next); setDark(next === 'dark'); };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || prefersReducedMotion()) { commit(); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.startViewTransition(commit).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => undefined);
  };

  const toggleCompanion = () => {
    const next = !companionOn;
    setCompanionOn(next);
    storeSet(KEYS.companion, next);
    window.dispatchEvent(new CustomEvent('miu:companion', { detail: { on: next } }));
  };

  const current = (path: string) => (path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));
  const links: { path: string; key: 'home' | 'draw' | 'cards' | 'history' | 'admin' }[] = [
    { path: '/', key: 'home' }, { path: '/draw', key: 'draw' }, { path: '/cards', key: 'cards' },
    ...(user?.role === 'admin' ? [{ path: '/admin', key: 'admin' as const }] : []),
    { path: '/history', key: 'history' }
  ];
  const otherLocale = routing.locales.find((l) => l !== locale) ?? locale;

  return (
    <header className="nav">
      <div className="nav-in">
        <Link className="brand" href="/" aria-label={t('brandAria')}>
          <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="14" fill="url(#g-hat)" /><path d="M15.5 7.5a7 7 0 1 0 5 11.8 5.6 5.6 0 0 1-5-11.8z" fill="#fff" /><path d="M20 7l.7 1.6 1.6.7-1.6.7L20 11.6l-.7-1.6-1.6-.7 1.6-.7z" fill="#fff" /></svg>
          <span>Miu Tarot</span>
        </Link>
        <nav className="nav-links" aria-label="main">
          {links.map(({ path, key }) => (
            <Link key={key} href={path} aria-current={current(path) ? 'page' : undefined}>
              {ICONS[key]}<span>{t(key)}</span>
            </Link>
          ))}
        </nav>
        <div className="nav-end">
          <button type="button" className="lang-btn" onClick={() => router.replace(pathname, { locale: otherLocale })} aria-label={`${t('language')}: ${otherLocale.toUpperCase()}`}>
            {otherLocale.toUpperCase()}
          </button>
          <button type="button" className="theme-toggle icon-btn" aria-pressed={companionOn} aria-label={companionOn ? t('companionHide') : t('companionShow')} title={companionOn ? t('companionHide') : t('companionShow')} onClick={toggleCompanion}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20 15 9" /><path d="M15 3.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /><path d="M20 10l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" /><path d="M8.5 4.5l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z" /></svg>
          </button>
          <button type="button" className="theme-toggle" aria-pressed={dark} aria-label={dark ? t('themeLight') : t('themeDark')} title={dark ? t('themeLight') : t('themeDark')} onClick={toggleTheme}>
            <svg className="ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></svg>
            <svg className="ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /><path d="M17 3.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" /></svg>
          </button>
          {user ? (
            <Link className="nav-auth is-user" href="/history">
              <span className="avatar sm" aria-hidden="true">{user.email.charAt(0).toUpperCase()}</span>
              <span className="sr-only">{t('account')}</span>
            </Link>
          ) : (
            <Link className="nav-auth" href="/login">{t('login')}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
