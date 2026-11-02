'use client';

import { CARDS, CARD_INDEX, DEFAULT_LOCALE, LOCALES, TOPIC_IDS, isLocale, type TopicId } from '@miu/tarot-core';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type KeyboardEvent } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import { Mascot } from '@/components/Mascot';
import { Link } from '@/i18n/navigation';
import { useCardFace, useConfigured } from '@/lib/content-client';
import { useMood } from '@/lib/use-mood';

type Group = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';
const svg = (children: React.ReactNode, sw = 2) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/** Bước 3 của Bộ sưu tập: trang ý nghĩa của một lá bài, vẽ theo bộ đang xem. */
export function CardDetail({ deck, id }: { deck: string; id: string }) {
  const t = useTranslations('cards');
  const tc = useTranslations('collection');
  const tDecks = useTranslations('decks');
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const other = LOCALES.find((l) => l !== locale) ?? DEFAULT_LOCALE;

  const [reversed, setReversed] = useState(false);
  const [topic, setTopic] = useState<TopicId>('love');
  const bundle = useConfigured(locale, deck).bundle;
  const otherBundle = useConfigured(other, deck).bundle;
  const face = useCardFace(locale);
  const { mood, setMood, nonce } = useMood();

  const index = CARDS.findIndex((c) => c.id === id);
  const prev = CARDS[(index - 1 + CARDS.length) % CARDS.length];
  const next = CARDS[(index + 1) % CARDS.length];
  const structure = CARD_INDEX.get(id);
  const text = bundle.cards[id];

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let i = TOPIC_IDS.indexOf(topic);
    if (event.key === 'ArrowRight') i = (i + 1) % TOPIC_IDS.length;
    if (event.key === 'ArrowLeft') i = (i - 1 + TOPIC_IDS.length) % TOPIC_IDS.length;
    if (event.key === 'Home') i = 0;
    if (event.key === 'End') i = TOPIC_IDS.length - 1;
    setTopic(TOPIC_IDS[i] as TopicId);
    requestAnimationFrame(() => document.getElementById(`tab-${TOPIC_IDS[i]}`)?.focus());
  };

  if (!structure || !text) return null;
  const suit = (structure.suit ?? 'major') as Group;
  const eyebrow = suit === 'major' ? t('majorEyebrow', { num: structure.numeral }) : t('minorEyebrow', { suit: t(suit), num: structure.numeral });
  const subtitle = otherBundle.cards[id]?.name ?? '';
  const topicText = text.topics[topic];

  return (
    <div className="wrap page">
      <Link className="col-back" href={`/collection/${deck}`}>
        {svg(<path d="M15 6l-6 6 6 6" />)}
        {tc('backToAlbum', { deck: tDecks(`${deck}.name`) })}
      </Link>

      <div className="detail">
        <div className="detail-visual">
          <div className={`detail-card${reversed ? ' is-reversed' : ''}`} role="img" aria-label={t('cardAria', { name: text.name, rev: reversed ? t('revAria') : '' })}
            dangerouslySetInnerHTML={{ __html: face(id, deck) }} />
          <div className="seg" role="group" aria-label={t('orientAria')}>
            <button type="button" aria-pressed={!reversed} onClick={() => { setReversed(false); setMood('happy'); }}>{t('upright')}</button>
            <button type="button" aria-pressed={reversed} onClick={() => { setReversed(true); setMood('think'); }}>{t('reversed')}</button>
          </div>
        </div>

        <div className="detail-info">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="h2">{text.name}</h2>
          <p className="en" style={{ fontSize: 17 }}>{subtitle}</p>
          <ul className="pills" aria-label={t('keywords')}>
            {(reversed ? text.keywords_reversed : text.keywords_upright).map((k) => <li key={k}>{k}</li>)}
          </ul>
          <article key={reversed ? 'rev' : 'up'} className={`mbox glass is-single${reversed ? ' is-rev' : ''}`} aria-live="polite">
            <p className={`mlabel${reversed ? ' rev' : ''}`}>
              {reversed ? svg(<path d="M12 5v14M6 13l6 6 6-6" />, 2.2) : svg(<path d="M12 19V5M6 11l6-6 6 6" />, 2.2)}
              {reversed ? t('revMeaning') : t('upMeaning')}
            </p>
            {(reversed ? text.meaning_reversed : text.meaning_upright).split('\n\n').map((para, n) => <p key={n}>{para}</p>)}
          </article>

          <h3 className="h3 sub">{t('byTopic')}</h3>
          <div className="seg tabs" role="tablist" aria-label={t('topicAria')}>
            {TOPIC_IDS.map((tid) => (
              <button key={tid} type="button" role="tab" id={`tab-${tid}`} aria-controls="tabpanel" aria-selected={topic === tid} tabIndex={topic === tid ? 0 : -1}
                onClick={() => setTopic(tid)} onKeyDown={onTabKey}>{bundle.ui.topics[tid]}</button>
            ))}
          </div>
          <div className="tabpanel glass" id="tabpanel" role="tabpanel" aria-labelledby={`tab-${topic}`}>
            <p key={reversed ? 'rev' : 'up'} className="is-fade"><span className={`badge${reversed ? ' rev' : ''}`}>{reversed ? t('reversed') : t('upright')}</span>{reversed ? topicText.reversed : topicText.upright}</p>
          </div>

          {text.advice ? (
            <>
              <h3 className="h3 sub">{t('advice')}</h3>
              <p className="advice-box">{text.advice[reversed ? 'reversed' : 'upright']}</p>
            </>
          ) : null}
          {text.questions ? (
            <>
              <h3 className="h3 sub">{t('questions')}</h3>
              <ul className="q-list">
                {text.questions[reversed ? 'reversed' : 'upright'].map((q) => <li key={q}>{q}</li>)}
              </ul>
            </>
          ) : null}

          {text.symbolism ? (
            <>
              <h3 className="h3 sub">{t('symbolism')}</h3>
              <p className="muted">{text.symbolism}</p>
            </>
          ) : null}
          {!bundle.translated.cards.has(id) ? <p className="muted small">{t('untranslated')}</p> : null}

          <aside className="catbox" aria-label={t('miuAria')}>
            <Mascot mood={mood} nonce={nonce} />
            <div><h3 className="h3">{t('miuTitle')}</h3><p>“{text.miu}”</p></div>
          </aside>

          <nav className="pn" aria-label={t('pnAria')}>
            {prev ? <Link href={`/collection/${deck}/${prev.id}`}>{svg(<path d="M15 6l-6 6 6 6" />)}{bundle.cards[prev.id]?.name}</Link> : <span />}
            {next ? <Link href={`/collection/${deck}/${next.id}`}>{bundle.cards[next.id]?.name}{svg(<path d="M9 6l6 6-6 6" />)}</Link> : <span />}
          </nav>
          <div className="cta-row left"><Link className="btn btn-primary" href="/draw">{t('drawNow')}</Link></div>
        </div>
      </div>
      <Disclaimer locale={locale} />
    </div>
  );
}
