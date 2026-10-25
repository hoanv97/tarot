import type { Locale } from '@miu/tarot-core';
import { setRequestLocale } from 'next-intl/server';
import { AnalysisEditor, type AnalysisSnapshot } from '@/components/admin/AnalysisEditor';
import { ANALYSIS_SECTIONS } from '@/lib/admin/constants';
import { getAdmin } from '@/lib/admin/guard';
import { effectiveAnalysis, effectiveCardTones, type AnalysisRow } from '@/lib/content-merge';

export const dynamic = 'force-dynamic';

export default async function AdminAnalysisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin) return null;

  const { data } = await admin.supabase.from('analysis_sections').select('locale, section, data');
  const rows = (data ?? []) as AnalysisRow[];
  const snapshot = Object.fromEntries((['vi', 'en'] as Locale[]).map((l) => {
    const analysis = effectiveAnalysis(l, rows) as unknown as Record<string, unknown>;
    const sections = Object.fromEntries(ANALYSIS_SECTIONS.flatMap((s) => {
      const value = s === 'card_tone' ? effectiveCardTones(rows) : analysis[s];
      return value === undefined ? [] : [[s, { value, edited: rows.some((r) => r.locale === l && r.section === s) }]];
    }));
    return [l, sections];
  })) as AnalysisSnapshot;

  return <AnalysisEditor snapshot={snapshot} />;
}
