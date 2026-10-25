import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import '../globals.css';

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export const viewport: Viewport = { themeColor: '#FBF8F4', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin.shell' });
  return {
    title: { default: `Miu Tarot · ${t('title')}`, template: `%s · Miu Tarot ${t('title')}` },
    // Trang quản trị không nên xuất hiện trên công cụ tìm kiếm.
    robots: { index: false, follow: false }
  };
}

// Chạy trước khi vẽ để không bị nháy: đặt giao diện sáng/tối theo lựa chọn đã lưu hoặc theo hệ thống.
const BOOT_SCRIPT = `(function(){var d=document.documentElement;var t=null;try{t=localStorage.getItem('miu-tarot.theme')}catch(e){}if(t!=='light'&&t!=='dark')t=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';d.setAttribute('data-theme',t)})();`;

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
