'use client';

import { CARD_IDS, DEFAULT_LOCALE, isLocale, type Locale } from '@miu/tarot-core';
import { detectCrisis } from '@miu/content-policy';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { cardBackSvg } from '@/components/CardArt';
import { Disclaimer } from '@/components/Disclaimer';
import { Mascot } from '@/components/Mascot';
import { Link } from '@/i18n/navigation';
import { DECK_IDS } from '@/lib/art/draw';
import { useCardFace, useConfigured, useContentPatch } from '@/lib/content-client';
import { pickOne, prefersReducedMotion, shuffled, wait } from '@/lib/motion';
import { addHistory } from '@/lib/store';
import type { Mood } from '@/lib/use-mood';
import { SENSITIVE_PATTERN, VERDICT_ICON, combineVerdicts, isMajor, verdictOf, type Verdict } from '@/lib/yesno';

type Phase = 'idle' | 'shuffling' | 'revealing' | 'done';
type Pick = { id: string; reversed: boolean; flipped: boolean };

const SHUFFLE_LAYERS = [0, 1, 2, 3, 4, 5, 6];
const REVERSED_CHANCE = 0.35;

export function YesNoClient() {
  const t = useTranslations('yesno');
  const tDecks = useTranslations('decks');
  const rawLocale = useLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const { hiddenDecks } = useContentPatch();
  const deckIds = DECK_IDS.filter((id) => !hiddenDecks.includes(id));

  const [deck, setDeck] = useState<string>(deckIds.includes('rws') ? 'rws' : (deckIds[0] ?? 'rws'));
  const [count, setCount] = useState<1 | 3>(1);
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [crisis, setCrisis] = useState(false);
  const [redraws, setRedraws] = useState(0);
  const [mood, setMood] = useState<Mood | null>(null);
  const [bubble, setBubble] = useState<{ text: string; key: number }>({ text: '', key: 0 });
  const alive = useRef(true);

  const configured = useConfigured(locale, deck);
  const face = useCardFace(locale);
  const cardsText = configured.bundle.cards;

  const say = (text: string, nextMood: Mood | null = null) => {
    setBubble((b) => ({ text, key: b.key + 1 }));
    setMood(nextMood);
  };

  useEffect(() => {
    alive.current = true;
    say(t('say.idle'));
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = phase === 'shuffling' || phase === 'revealing';
  const nameOf = (id: string): string => cardsText[id]?.name ?? id;

  const draw = async () => {
    if (busy) return;
    if (detectCrisis(question, locale)) {
      setCrisis(true);
      setPicks([]);
      setPhase('idle');
      say(t('say.crisis'), 'happy');
      return;
    }
    setCrisis(false);
    if (phase === 'done') setRedraws((n) => n + 1);
    setPicks([]);
    setPhase('shuffling');
    say(t('say.shuffling'), 'think');
    await wait(1500);
    if (!alive.current) return;
    const chosen: Pick[] = shuffled(CARD_IDS).slice(0, count).map((id) => ({ id, reversed: Math.random() < REVERSED_CHANCE, flipped: false }));
    setPicks(chosen);
    setPhase('revealing');
    say(t('say.revealing'), null);
    await wait(500);
    for (let i = 0; i < chosen.length; i++) {
      if (!alive.current) return;
      setPicks((prev) => prev.map((p, k) => (k === i ? { ...p, flipped: true } : p)));
      await wait(prefersReducedMotion() ? 0 : 650);
    }
    if (!alive.current) return;
    const verdict = combineVerdicts(chosen.map((p) => verdictOf(p.id, p.reversed)));
    setPhase('done');
    addHistory({
      id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, at: Date.now(), spread: chosen.length === 1 ? '1' : '3', deck,
      topic: 'yesno', question: question.trim(), locale, cards: chosen.map((p) => ({ id: p.id, reversed: p.reversed })), kind: 'yesno', verdict
    });
    say(pickOne(t.raw(`say.${verdict}`) as string[]), verdict === 'yes' ? 'wow' : verdict === 'no' ? 'think' : 'happy');
  };

  const verdicts = picks.map((p) => verdictOf(p.id, p.reversed));
  const final: Verdict | null = phase === 'done' && picks.length ? combineVerdicts(verdicts) : null;
  const lead = picks.find((p) => final && verdictOf(p.id, p.reversed) === final) ?? picks[0];
  const leadText = lead ? cardsText[lead.id] : undefined;
  const orient = (p: Pick): 'upright' | 'reversed' => (p.reversed ? 'reversed' : 'upright');
  const keywords = (p: Pick): string[] => (p.reversed ? cardsText[p.id]?.keywords_reversed : cardsText[p.id]?.keywords_upright)?.slice(0, 3) ?? [];
  const advice = lead ? leadText?.advice?.[orient(lead)] : undefined;
  const selfQuestion = lead ? leadText?.questions?.[orient(lead)]?.[0] : undefined;
  const sensitive = SENSITIVE_PATTERN[locale].test(question);

  return (
    <div className="wrap page page-tight yn">
      <h1 className="draw-title">{t('titleA')}<span className="grad-text">{t('titleB')}</span></h1>

      <div className="config glass" role="group" aria-label={t('configAria')}>
        <div className="cfg-row">
          <div className="cfg-group">
            <span className="field-label" id="yn-lbl-deck">{t('deck')}</span>
            <div className="seg" role="group" aria-labelledby="yn-lbl-deck">
              {deckIds.map((id) => <button key={id} type="button" disabled={busy} aria-pressed={deck === id} onClick={() => setDeck(id)}>{tDecks(`${id}.name`)}</button>)}
            </div>
          </div>
          <div className="cfg-group">
            <span className="field-label" id="yn-lbl-count">{t('mode')}</span>
            <div className="seg" role="group" aria-labelledby="yn-lbl-count">
              <button type="button" disabled={busy} aria-pressed={count === 1} onClick={() => setCount(1)}>{t('mode1')}</button>
              <button type="button" disabled={busy} aria-pressed={count === 3} onClick={() => setCount(3)}>{t('mode3')}</button>
            </div>
          </div>
        </div>
        <div className="cfg-group cfg-q">
          <label className="field-label" htmlFor="yn-q">{t('question')}</label>
          <div className="q-wrap">
            <div className="q-field">
              <input id="yn-q" className="q-input" type="text" maxLength={200} value={question} disabled={busy}
                placeholder={t('questionPlaceholder')} onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void draw(); }} />
              <span className="q-count">{question.length}/200</span>
            </div>
            <p className="yn-tip">{t('tip')}</p>
          </div>
        </div>
        <div className="q-samples" role="group" aria-label={t('samplesLabel')}>
          <span className="q-samples-label">{t('samplesLabel')}</span>
          {(t.raw('samples') as string[]).map((sample) => (
            <button key={sample} type="button" className="q-sample" disabled={busy} aria-pressed={question === sample}
              onClick={() => setQuestion(question === sample ? '' : sample)}>{sample}</button>
          ))}
        </div>
      </div>

      {redraws >= 1 ? <p className="repeat-notice" role="status">{t('repeatNotice')}</p> : null}

      <section className="yn-stage glass" aria-live="polite">
        <div className="yn-guide">
          <Mascot mood={mood} nonce={bubble.key} />
          {bubble.text ? <div className="bubble pop" key={bubble.key}>{bubble.text}</div> : null}
        </div>

        {crisis ? <p className="yn-crisis" role="alert">{t('crisis')}</p> : null}

        {picks.length === 0 ? (
          <div className={`yn-deck${phase === 'shuffling' ? ' is-shuffling' : ''}`} aria-hidden="true">
            {SHUFFLE_LAYERS.map((i) => (
              <div key={i} className="yn-back" style={{ ['--i' as string]: i, ['--x' as string]: `${i * 1.6}px`, ['--y' as string]: `${i * -1.6}px`, ['--r' as string]: `${(i % 3 - 1) * 1.5}deg` }}
                dangerouslySetInnerHTML={{ __html: cardBackSvg(deck) }} />
            ))}
          </div>
        ) : (
          <div className={`yn-cards${picks.length === 1 ? ' is-single' : ''}`}>
            {picks.map((p, i) => (
              <figure className="yn-pick" key={`${p.id}-${i}`}>
                <div className="yn-card">
                  <div className={`card3d${p.flipped ? ' is-flipped' : ''}${p.reversed ? ' is-reversed' : ''}`}>
                    <div className="card3d-inner">
                      <div className="card3d-face card3d-back" dangerouslySetInnerHTML={{ __html: cardBackSvg(deck) }} />
                      <div className="card3d-face card3d-front"><div className="face-rot" dangerouslySetInnerHTML={{ __html: face(p.id, deck) }} /></div>
                    </div>
                  </div>
                </div>
                {p.flipped ? (
                  <figcaption className="yn-cap">
                    <strong>{nameOf(p.id)}</strong>
                    <span>{p.reversed ? t('reversed') : t('upright')}</span>
                    {picks.length > 1 ? <em className="yn-chip" data-v={verdicts[i]}>{t(`verdict.${verdicts[i] ?? 'maybe'}.word`)}</em> : null}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        )}

        {final && lead ? (
          <div className="yn-result">
            <div className="yn-verdict" data-v={final}>
              <span className="yn-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: VERDICT_ICON[final] }} /></span>
              <div>
                <p className="yn-word">{t(`verdict.${final}.word`)}</p>
                <p className="yn-line">{t(`verdict.${final}.line`)}</p>
              </div>
            </div>

            <p className="yn-strength">
              {picks.length === 1
                ? t(isMajor(lead.id) ? 'strengthStrong' : 'strengthQualified')
                : t('majorityNote', { yes: verdicts.filter((v) => v === 'yes').length, no: verdicts.filter((v) => v === 'no').length, other: verdicts.filter((v) => v === 'maybe' || v === 'later').length })}
            </p>

            <div className="yn-why">
              <h2 className="yn-h">{t('why')}</h2>
              <div className="yn-bars">
                {picks.map((p) => (
                  <p key={p.id} className="yn-bar" data-v={verdictOf(p.id, p.reversed)}>
                    {t('reason', { name: nameOf(p.id), orient: p.reversed ? t('reversed') : t('upright'), keywords: keywords(p).join(', ') })}
                  </p>
                ))}
              </div>
            </div>

            {advice ? <div className="yn-advice"><h2 className="yn-h">{t('advice')}</h2><p className="advice-box">{advice}</p></div> : null}
            {selfQuestion ? <div className="yn-self"><h2 className="yn-h">{t('self')}</h2><p className="yn-bar" data-v="self">{selfQuestion}</p></div> : null}
            {sensitive ? <p className="yn-sensitive" role="note">{t('sensitive')}</p> : null}

            <div className="cta-row">
              <button type="button" className="btn btn-secondary" onClick={() => void draw()}>{t('redraw')}</button>
              <Link href="/draw" className="btn btn-secondary">{t('fullSpread')}</Link>
            </div>
            <Disclaimer locale={locale} />
          </div>
        ) : phase === 'idle' || phase === 'shuffling' ? (
          <div className="cta-row">
            <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => void draw()}>{busy ? t('shuffling') : t('draw')}</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
