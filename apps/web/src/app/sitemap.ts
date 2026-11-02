import { CARD_IDS, LOCALES } from '@miu/tarot-core';
import type { MetadataRoute } from 'next';
import { DECK_IDS } from '@/lib/art/draw';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const pages = ['', '/draw', '/daily', '/yesno', '/collection', '/legal', '/privacy', '/terms'];
  return LOCALES.flatMap((locale) => [
    ...pages.map((p) => ({ url: `${base}/${locale}${p}` })),
    ...DECK_IDS.flatMap((deck) => [
      { url: `${base}/${locale}/collection/${deck}` },
      ...CARD_IDS.map((id) => ({ url: `${base}/${locale}/collection/${deck}/${id}` }))
    ])
  ]);
}
