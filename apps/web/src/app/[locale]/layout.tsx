import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArtSprite } from '@/components/ArtSprite';
import { Companion } from '@/components/Companion';
import { Header } from '@/components/Header';
import { Sky } from '@/components/Sky';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export const viewport: Viewport = { themeColor: '#FBF8F4', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
  };
}

// Chạy trước khi vẽ để không bị nháy: đặt giao diện sáng/tối và bật lớp .js cho hiệu ứng hiện dần.
const BOOT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add('js');var t=null;try{t=localStorage.getItem('miu-tarot.theme')}catch(e){}if(t!=='light'&&t!=='dark')t=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';d.setAttribute('data-theme',t)})();`;

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const nav = await getTranslations('nav');
  const footer = await getTranslations('footer');
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <ArtSprite />
          <Sky />
          <a className="skip" href="#main">{nav('skip')}</a>
          <Header />
          <main id="main" tabIndex={-1}>{children}</main>
          <footer className="footer">
            <div className="wrap">
              <p>{footer('line1')} · <Link href="/legal">{nav('legal')}</Link></p>
              <p>{footer('line2')}</p>
            </div>
          </footer>
          <Companion />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
