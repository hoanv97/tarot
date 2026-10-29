import { CARD_IDS, LOCALES } from '@miu/tarot-core';
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const pages = ['', '/draw', '/daily', '/cards', '/legal', '/privacy', '/terms'];
  return LOCALES.flatMap((locale) => [
    ...pages.map((p) => ({ url: `${base}/${locale}${p}` })),
    ...CARD_IDS.map((id) => ({ url: `${base}/${locale}/cards/${id}` }))
  ]);
}
