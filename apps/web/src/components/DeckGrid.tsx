'use client';

import { CARDS, DEFAULT_LOCALE, isLocale } from '@miu/tarot-core';
import { useLocale, useTranslations } from 'next-intl';
import { cardBackSvg } from '@/components/CardArt';
import { Link } from '@/i18n/navigation';
import { DECK_IDS } from '@/lib/art/draw';
import { useCardFace, useContentPatch } from '@/lib/content-client';

const SHOWCASE: Record<string, string> = { rws: 'sun', moon: 'moon', lotus: 'empress' };
const CHEV = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;

/** Bước 1 của Bộ sưu tập: ba bộ bài. */
export function DeckGrid() {
  const t = useTranslations('collection');
  const d = useTranslations('decks');
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const face = useCardFace(locale);
  const { hiddenDecks } = useContentPatch();
  return (
    <div className="decks col-decks">
      {DECK_IDS.filter((id: string) => !hiddenDecks.includes(id)).map((id: string) => (
        <Link key={id} className="deck-card glass" href={`/collection/${id}`} aria-label={t('deckCardAria', { deck: d(`${id}.name`) })}>
          <div className="deck-art" aria-hidden="true">
            <div className="a back" dangerouslySetInnerHTML={{ __html: cardBackSvg(id) }} />
            <div className="a front" dangerouslySetInnerHTML={{ __html: face(SHOWCASE[id] ?? 'star', id) }} />
          </div>
          <span className="tag">{d(`${id}.tag`)}</span>
          <h2 className="h3">{d(`${id}.name`)}</h2>
          <p>{d(`${id}.desc`)}</p>
          <p className="col-meta">{t('cardCount', { n: CARDS.length })}</p>
          <span className="link-chev">{t('openAlbum')}{CHEV}</span>
        </Link>
      ))}
    </div>
  );
}
