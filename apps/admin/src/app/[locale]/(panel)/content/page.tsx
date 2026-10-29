import type { Locale } from '@miu/tarot-core';
import { setRequestLocale } from 'next-intl/server';
import { ContentEditor } from '@/components/ContentEditor';
import { SITE_CONTENT_KEYS, type SiteContentKey } from '@/lib/constants';
import { getAdmin, getDb } from '@/lib/guard';
import { siteFallback } from '@miu/web-shared';

export const dynamic = 'force-dynamic';

export default async function AdminContentPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ key?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { key: rawKey } = await searchParams;
  const key: SiteContentKey = SITE_CONTENT_KEYS.find((k) => k === rawKey) ?? 'home';
  // Dữ liệu nội dung đọc công khai được, nên truy vấn chạy ngay, song song với kiểm tra vai trò admin (tiết kiệm một lượt chờ Supabase).
  const supabase = await getDb();
  const adminCheck = getAdmin();
  if (!supabase) return null;

  const { data } = await supabase.from('site_content').select('locale, value').eq('key', key);
  const rows = new Map((data ?? []).map((r) => [r.locale as string, r.value as unknown]));
  const initial = Object.fromEntries((['vi', 'en'] as Locale[]).map((l) => [l, { value: rows.get(l) ?? siteFallback(key, l), edited: rows.has(l) }]));

  const admin = await adminCheck;
  if (!admin) return null;

  return <ContentEditor key={key} contentKey={key} initial={initial as Record<Locale, { value: unknown; edited: boolean }>} />;
}
