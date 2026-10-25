import type { Locale } from '@miu/tarot-core';
import { setRequestLocale } from 'next-intl/server';
import { AnalysisEditor, type AnalysisSnapshot } from '@/components/AnalysisEditor';
import { ANALYSIS_SECTIONS } from '@/lib/constants';
import { getAdmin, getDb } from '@/lib/guard';
import { effectiveAnalysis, effectiveCardTones, type AnalysisRow } from '@miu/web-shared';

export const dynamic = 'force-dynamic';

export default async function AdminAnalysisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Dữ liệu nội dung đọc công khai được, nên truy vấn chạy ngay, song song với kiểm tra vai trò admin (tiết kiệm một lượt chờ Supabase).
  const supabase = await getDb();
  const adminCheck = getAdmin();
  if (!supabase) return null;

  const { data } = await supabase.from('analysis_sections').select('locale, section, data');
  const rows = (data ?? []) as AnalysisRow[];
  const snapshot = Object.fromEntries((['vi', 'en'] as Locale[]).map((l) => {
    const analysis = effectiveAnalysis(l, rows) as unknown as Record<string, unknown>;
    const sections = Object.fromEntries(ANALYSIS_SECTIONS.flatMap((s) => {
      const value = s === 'card_tone' ? effectiveCardTones(rows) : analysis[s];
      return value === undefined ? [] : [[s, { value, edited: rows.some((r) => r.locale === l && r.section === s) }]];
    }));
    return [l, sections];
  })) as AnalysisSnapshot;

  const admin = await adminCheck;
  if (!admin) return null;

  return <AnalysisEditor snapshot={snapshot} />;
}
