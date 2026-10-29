'use client';

import { CARDS, CARD_INDEX, DEFAULT_LOCALE, LOCALES, TOPIC_IDS, isLocale, type TopicId } from '@miu/tarot-core';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useCardFace, useConfigured, useContentPatch } from '@/lib/content-client';
import { Disclaimer } from '@/components/Disclaimer';
import { Mascot } from '@/components/Mascot';
import { Link } from '@/i18n/navigation';
import { DECK_IDS } from '@/lib/art/draw';
import { prefersReducedMotion } from '@/lib/motion';
import { useMood } from '@/lib/use-mood';

const GROUPS = ['all', 'major', 'wands', 'cups', 'swords', 'pentacles'] as const;
type Group = (typeof GROUPS)[number];
const suitOf = (id: string): Group => (CARD_INDEX.get(id)?.suit ?? 'major') as Group;
const svg = (children: React.ReactNode, sw = 2) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export function CardsExplorer({ initialId }: { initialId: string }) {
  const t = useTranslations('cards');
  const tDecks = useTranslations('decks');
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const other = LOCALES.find((l) => l !== locale) ?? DEFAULT_LOCALE;

  const [id, setId] = useState(CARD_INDEX.has(initialId) ? initialId : (CARDS[0]?.id as string));
  const [group, setGroup] = useState<Group>('all');
  const [reversed, setReversed] = useState(false);
  const [topic, setTopic] = useState<TopicId>('love');
  const [deck, setDeck] = useState('rws');
  const bundle = useConfigured(locale, deck).bundle;
  const otherBundle = useConfigured(other, deck).bundle;
  const face = useCardFace(locale);
  const { hiddenDecks } = useContentPatch();
  const { mood, setMood, nonce } = useMood();

  const stripRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const visible = useMemo(() => CARDS.filter((c) => group === 'all' || suitOf(c.id) === group), [group]);
  const index = CARDS.findIndex((c) => c.id === id);
  const prev = CARDS[(index - 1 + CARDS.length) % CARDS.length];
  const next = CARDS[(index + 1) % CARDS.length];
  const structure = CARD_INDEX.get(id);
  const text = bundle.cards[id];

  const select = (nextId: string) => {
    if (nextId !== id) setReversed(false);
    setId(nextId);
    window.history.replaceState(null, '', `/${locale}/cards/${nextId}`);
  };
  const onThumb = (event: MouseEvent, cardId: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    select(cardId);
  };
  const pickGroup = (g: Group) => {
    if (g === group) return;
    setGroup(g);
    const first = CARDS.find((c) => g === 'all' || suitOf(c.id) === g);
    if (first && !(g === 'all' || suitOf(id) === g)) select(first.id);
  };

  const updateEdges = () => {
    const strip = stripRef.current;
    const wrap = wrapRef.current;
    if (!strip || !wrap) return;
    const max = strip.scrollWidth - strip.clientWidth;
    wrap.classList.toggle('can-prev', strip.scrollLeft > 4);
    wrap.classList.toggle('can-next', strip.scrollLeft < max - 4);
  };
  const scrollStrip = (dir: number) => stripRef.current?.scrollBy({ left: dir * stripRef.current.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [group]);

  useEffect(() => {
    const strip = stripRef.current;
    const current = strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if (strip && current) strip.scrollTo({ left: Math.max(0, current.offsetLeft - strip.clientWidth / 2 + current.offsetWidth / 2), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    requestAnimationFrame(updateEdges);
  }, [id, group]);

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
  const suit = suitOf(id);
  const eyebrow = suit === 'major' ? t('majorEyebrow', { num: structure.numeral }) : t('minorEyebrow', { suit: t(suit), num: structure.numeral });
  const subtitle = otherBundle.cards[id]?.name ?? '';
  const topicText = text.topics[topic];

  return (
    <div className="wrap page">
      <div className="page-head center">
        <h1 className="h2">{t('title', { n: CARDS.length })}</h1>
        <p className="lead">{t('lead')}</p>
      </div>

      <div className="chips group-chips" role="group" aria-label={t('filterAria')}>
        {GROUPS.map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => pickGroup(g)}>
            {t(g)}<span className="chip-n">{g === 'all' ? CARDS.length : CARDS.filter((c) => suitOf(c.id) === g).length}</span>
          </button>
        ))}
      </div>

      <div className="strip-wrap" ref={wrapRef}>
        <button className="strip-btn prev" type="button" aria-label={t('prev')} onClick={() => scrollStrip(-1)}>{svg(<path d="M15 6l-6 6 6 6" />)}</button>
        <nav className="strip" ref={stripRef} aria-label={t('listAria')} onScroll={updateEdges}>
          {visible.map((c) => (
            <Link key={c.id} className="thumb" href={`/cards/${c.id}`} aria-current={c.id === id} onClick={(e) => onThumb(e, c.id)}>
              <span className="mini" aria-hidden="true" dangerouslySetInnerHTML={{ __html: face(c.id, deck) }} />
              {bundle.cards[c.id]?.name}
            </Link>
          ))}
        </nav>
        <button className="strip-btn next" type="button" aria-label={t('next')} onClick={() => scrollStrip(1)}>{svg(<path d="M9 6l6 6-6 6" />)}</button>
      </div>

      <div className="detail">
        <div className="detail-visual">
          <div className={`detail-card${reversed ? ' is-reversed' : ''}`} role="img" aria-label={t('cardAria', { name: text.name, rev: reversed ? t('revAria') : '' })}
            dangerouslySetInnerHTML={{ __html: face(id, deck) }} />
          <div className="seg" role="group" aria-label={t('orientAria')}>
            <button type="button" aria-pressed={!reversed} onClick={() => { setReversed(false); setMood('happy'); }}>{t('upright')}</button>
            <button type="button" aria-pressed={reversed} onClick={() => { setReversed(true); setMood('think'); }}>{t('reversed')}</button>
          </div>
          <div className="seg seg-sm" role="group" aria-label={t('deckAria')}>
            {DECK_IDS.filter((d) => !hiddenDecks.includes(d)).map((d) => <button key={d} type="button" aria-pressed={deck === d} onClick={() => setDeck(d)}>{tDecks(`${d}.name`)}</button>)}
          </div>
        </div>

        <div className="detail-info">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="h2">{text.name}</h2>
          <p className="en" style={{ fontSize: 17 }}>{subtitle}</p>
          <ul className="pills" aria-label={t('keywords')}>
            {(reversed ? text.keywords_reversed : text.keywords_upright).map((k) => <li key={k}>{k}</li>)}
          </ul>
          <div className="mgrid">
            <article className={`mbox glass${reversed ? '' : ' is-active'}`}>
              <p className="mlabel">{svg(<path d="M12 19V5M6 11l6-6 6 6" />, 2.2)}{t('upMeaning')}</p>
              {text.meaning_upright.split('\n\n').map((para, n) => <p key={n}>{para}</p>)}
            </article>
            <article className={`mbox glass${reversed ? ' is-active' : ''}`}>
              <p className="mlabel rev">{svg(<path d="M12 5v14M6 13l6 6 6-6" />, 2.2)}{t('revMeaning')}</p>
              {text.meaning_reversed.split('\n\n').map((para, n) => <p key={n}>{para}</p>)}
            </article>
          </div>

          <h3 className="h3 sub">{t('byTopic')}</h3>
          <div className="seg tabs" role="tablist" aria-label={t('topicAria')}>
            {TOPIC_IDS.map((tid) => (
              <button key={tid} type="button" role="tab" id={`tab-${tid}`} aria-controls="tabpanel" aria-selected={topic === tid} tabIndex={topic === tid ? 0 : -1}
                onClick={() => setTopic(tid)} onKeyDown={onTabKey}>{bundle.ui.topics[tid]}</button>
            ))}
          </div>
          <div className="tabpanel glass" id="tabpanel" role="tabpanel" aria-labelledby={`tab-${topic}`}>
            <p><span className="badge">{t('upright')}</span>{topicText.upright}</p>
            <p><span className="badge rev">{t('reversed')}</span>{topicText.reversed}</p>
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
            {prev ? <Link href={`/cards/${prev.id}`} onClick={(e) => onThumb(e, prev.id)}>{svg(<path d="M15 6l-6 6 6 6" />)}{bundle.cards[prev.id]?.name}</Link> : <span />}
            {next ? <Link href={`/cards/${next.id}`} onClick={(e) => onThumb(e, next.id)}>{bundle.cards[next.id]?.name}{svg(<path d="M9 6l6 6-6 6" />)}</Link> : <span />}
          </nav>
          <div className="cta-row left"><Link className="btn btn-primary" href="/draw">{t('drawNow')}</Link></div>
        </div>
      </div>
      <Disclaimer locale={locale} />
    </div>
  );
}
