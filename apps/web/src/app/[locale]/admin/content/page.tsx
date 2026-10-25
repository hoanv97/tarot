import type { Locale } from '@miu/tarot-core';
import { setRequestLocale } from 'next-intl/server';
import { ContentEditor } from '@/components/admin/ContentEditor';
import { SITE_CONTENT_KEYS, type SiteContentKey } from '@/lib/admin/constants';
import { getAdmin } from '@/lib/admin/guard';
import { siteFallback } from '@/lib/content-fallback';

export const dynamic = 'force-dynamic';

export default async function AdminContentPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ key?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { key: rawKey } = await searchParams;
  const key: SiteContentKey = SITE_CONTENT_KEYS.find((k) => k === rawKey) ?? 'home';
  const admin = await getAdmin();
  if (!admin) return null;

  const { data } = await admin.supabase.from('site_content').select('locale, value').eq('key', key);
  const rows = new Map((data ?? []).map((r) => [r.locale as string, r.value as unknown]));
  const initial = Object.fromEntries((['vi', 'en'] as Locale[]).map((l) => [l, { value: rows.get(l) ?? siteFallback(key, l), edited: rows.has(l) }]));

  return <ContentEditor key={key} contentKey={key} initial={initial as Record<Locale, { value: unknown; edited: boolean }>} />;
}
