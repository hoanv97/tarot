import { setRequestLocale } from 'next-intl/server';
import { DecksEditor } from '@/components/DecksEditor';
import type { DeckInput } from '@/lib/actions';
import { getAdmin } from '@/lib/guard';

export const dynamic = 'force-dynamic';

type Translation = { locale: 'vi' | 'en'; name: string; tag: string | null; description: string | null; voice: string | null };

export default async function AdminDecksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const admin = await getAdmin();
  if (!admin) return null;
  const { data } = await admin.supabase.from('decks').select('id, sort_order, active, deck_translations(locale, name, tag, description, voice)').order('sort_order');
  const decks: DeckInput[] = (data ?? []).map((d) => {
    const rows = (d.deck_translations ?? []) as Translation[];
    const text = (l: 'vi' | 'en') => {
      const r = rows.find((x) => x.locale === l);
      return { name: r?.name ?? '', tag: r?.tag ?? '', description: r?.description ?? '', voice: r?.voice ?? '' };
    };
    return { id: d.id as string, sortOrder: d.sort_order as number, active: d.active as boolean, texts: { vi: text('vi'), en: text('en') } };
  });
  return <DecksEditor decks={decks} />;
}
