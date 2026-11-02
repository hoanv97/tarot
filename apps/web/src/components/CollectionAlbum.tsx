'use client';

import { CARDS, CARD_INDEX, DEFAULT_LOCALE, isLocale } from '@miu/tarot-core';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { Link } from '@/i18n/navigation';
import { useCardFace, useConfigured } from '@/lib/content-client';

const GROUPS = ['all', 'major', 'wands', 'cups', 'swords', 'pentacles'] as const;
type Group = (typeof GROUPS)[number];
const suitOf = (id: string): Group => (CARD_INDEX.get(id)?.suit ?? 'major') as Group;

/** Bước 2 của Bộ sưu tập: album các lá bài của một bộ, có lọc theo nhóm. */
export function CollectionAlbum({ deck }: { deck: string }) {
  const t = useTranslations('cards');
  const tc = useTranslations('collection');
  const d = useTranslations('decks');
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const bundle = useConfigured(locale, deck).bundle;
  const face = useCardFace(locale);
  const [group, setGroup] = useState<Group>('all');
  const visible = useMemo(() => CARDS.filter((c) => group === 'all' || suitOf(c.id) === group), [group]);

  return (
    <div className="wrap page">
      <Link className="col-back" href="/collection">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        {tc('allDecks')}
      </Link>
      <div className="page-head center">
        <p className="eyebrow">{d(`${deck}.tag`)}</p>
        <h1 className="h2">{d(`${deck}.name`)}</h1>
        <p className="lead">{d(`${deck}.desc`)}</p>
      </div>

      <div className="chips group-chips" role="group" aria-label={t('filterAria')}>
        {GROUPS.map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
            {t(g)}<span className="chip-n">{g === 'all' ? CARDS.length : CARDS.filter((c) => suitOf(c.id) === g).length}</span>
          </button>
        ))}
      </div>
      <p className="col-count" aria-live="polite">{tc('showing', { n: visible.length })}</p>

      <ul className="album" aria-label={tc('albumAria')}>
        {visible.map((c) => (
          <li key={c.id}>
            <Link className="album-tile" href={`/collection/${deck}/${c.id}`}>
              <span className="album-card" aria-hidden="true" dangerouslySetInnerHTML={{ __html: face(c.id, deck) }} />
              <span className="album-name">{bundle.cards[c.id]?.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Disclaimer locale={locale} />
    </div>
  );
}
