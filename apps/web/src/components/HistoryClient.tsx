'use client';

import { CARD_INDEX, DEFAULT_LOCALE, isLocale, isSpreadId, type SpreadId } from '@miu/tarot-core';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardFace, useConfigured } from '@/lib/content-client';
import { Avatar } from '@/components/Avatar';
import { DatePicker } from '@/components/DatePicker';
import { LoginForm } from '@/components/LoginForm';
import { Mascot } from '@/components/Mascot';
import { YesNoSummary } from '@/components/YesNoSummary';
import { Link, useRouter } from '@/i18n/navigation';
import { adminHref } from '@/lib/admin-url';
import { getHistory, saveHistory, type HistoryEntry } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

const DECKS_FALLBACK = 'rws';

type Range = 'all' | 'today' | '7' | '30' | 'custom';
const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const parseDay = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y as number, (m as number) - 1, d as number).getTime(); };

type Kind = 'daily' | 'three' | 'self' | 'yesno';
const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
/** Biểu tượng riêng cho từng kiểu xem, để nhìn là nhận ra ngay trong danh sách. */
const KIND_ICON: Record<Kind, React.ReactNode> = {
  daily: <svg viewBox="0 0 24 24" {...ICON}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" /></svg>,
  three: <svg viewBox="0 0 24 24" {...ICON}><rect x="2.5" y="6" width="6" height="12" rx="1.5" /><rect x="9" y="4" width="6" height="14" rx="1.5" /><rect x="15.5" y="6" width="6" height="12" rx="1.5" /></svg>,
  self: <svg viewBox="0 0 24 24" {...ICON}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.5-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>,
  yesno: <svg viewBox="0 0 24 24" {...ICON}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.6 2.6L16 9.5" /></svg>
};

export function HistoryClient() {
  const t = useTranslations('history');
  const tLogin = useTranslations('login');
  const tDecks = useTranslations('decks');
  const tCards = useTranslations('cards');
  const raw = useLocale();
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const bundle = useConfigured(locale).bundle;
  const face = useCardFace(locale);
  const router = useRouter();
  const { ready, user } = useAuth();
  const [list, setList] = useState<HistoryEntry[] | null>(null);
  const [armed, setArmed] = useState(false);
  const [range, setRange] = useState<Range>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [toast, setToast] = useState('');
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (user && supabase) {
      const { data } = await supabase.from('readings').select('id, spread, topic, question, cards, locale, created_at').order('created_at', { ascending: false }).limit(50);
      const remote: HistoryEntry[] = (data ?? []).map((r) => ({
        id: r.id as string, at: new Date(r.created_at as string).getTime(), spread: (isSpreadId(r.spread) ? r.spread : '3') as SpreadId,
        deck: DECKS_FALLBACK, topic: r.topic as string, question: (r.question as string | null) ?? '', locale: r.locale as string,
        cards: r.cards as HistoryEntry['cards']
      }));
      const localYesNo = getHistory().filter((h) => h.kind === 'yesno');
      setList([...remote, ...localYesNo].sort((a, b) => b.at - a.at));
      return;
    }
    setList(getHistory());
  }, [user]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  const clear = async () => {
    if (!armed) {
      setArmed(true);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    setArmed(false);
    saveHistory([]);
    const supabase = createClient();
    if (user && supabase) await supabase.from('readings').delete().eq('user_id', user.id);
    setList([]);
    setToast(t('cleared'));
    setTimeout(() => setToast(''), 2800);
  };

  const signOut = async () => { await createClient()?.auth.signOut(); router.refresh(); setList(getHistory()); };

  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) => setOpenIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const shown = useMemo(() => {
    if (!list) return null;
    const today = startOfDay(new Date());
    let lo = -Infinity;
    let hi = Infinity;
    if (range === 'today') lo = today;
    else if (range === '7') lo = today - 6 * DAY;
    else if (range === '30') lo = today - 29 * DAY;
    else if (range === 'custom') {
      if (from) lo = parseDay(from);
      if (to) hi = parseDay(to) + DAY - 1;
    }
    return list.filter((h) => h.at >= lo && h.at <= hi);
  }, [list, range, from, to]);
  const filtered = range !== 'all' && (range !== 'custom' || Boolean(from || to));
  const resetFilter = () => { setRange('all'); setFrom(''); setTo(''); };

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }), [locale]);
  const spreadBadge = (spread: SpreadId) => (spread === '1' ? t('daily') : spread === '3s' ? t('threeSelf') : t('three'));

  return (
    <div className="wrap page">
      <div className="page-head center">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="h2">{t('title')}</h1>
      </div>
      <div className="acct">
        <aside className="auth glass" aria-label={tLogin('title')}>
          {user ? (
            <>
              <div className="who">
                <Avatar name={user.fullName || user.name} src={user.avatarUrl || undefined} />
                <div>
                  <p className="small muted">{tLogin('hello')}</p>
                  <p className="who-email">{user.fullName || user.name}</p>
                  <span className={`badge${user.role === 'admin' ? '' : ' muted'}`} style={{ marginTop: 6 }}>{user.role === 'admin' ? tLogin('adminBadge') : tLogin('user')}</span>
                </div>
              </div>
              {user.role === 'admin' ? <a className="btn btn-primary btn-block" href={adminHref(locale)} style={{ marginBottom: 10 }}>{tLogin('admin')}</a> : null}
              <button type="button" className="btn btn-secondary btn-block" onClick={signOut}>{tLogin('logout')}</button>
            </>
          ) : (
            <>
              <LoginForm />
              <p className="auth-foot">{t('localNote')}</p>
            </>
          )}
        </aside>

        <div>
          {list === null ? null : list.length === 0 ? (
            <div className="empty glass">
              <Mascot />
              <h2 className="h3">{t('emptyTitle')}</h2>
              <p className="muted" style={{ margin: '8px 0 0' }}>{t('emptyBody')}</p>
              <div className="cta-row"><Link className="btn btn-primary" href="/draw">{t('emptyCta')}</Link></div>
            </div>
          ) : (
            <>
              <div className="hist-head">
                <h2 className="h3">{t('head')}</h2>
                <span className="muted small">{filtered ? t('countOf', { n: shown?.length ?? 0, total: list.length }) : t('count', { n: list.length })}</span>
                <button type="button" className={`btn-text${armed ? ' is-armed' : ''}`} onClick={clear}>{armed ? t('clearArmed') : t('clear')}</button>
              </div>
              <div className="h-filter" role="group" aria-label={t('filterAria')}>
                <div className="chips">
                  {([['all', 'fAll'], ['today', 'fToday'], ['7', 'f7'], ['30', 'f30']] as const).map(([key, label]) => (
                    <button key={key} type="button" className="chip" aria-pressed={range === key} onClick={() => { setRange(key); setFrom(''); setTo(''); }}>{t(label)}</button>
                  ))}
                </div>
                <div className="h-dates">
                  <DatePicker label={t('from')} value={from} max={to || undefined} locale={locale} placeholder={t('pickDate')} todayLabel={t('fToday')} clearLabel={t('clearDate')} prevLabel={t('prevMonth')} nextLabel={t('nextMonth')}
                    onChange={(v) => { setFrom(v); setRange('custom'); }} />
                  <DatePicker label={t('to')} value={to} min={from || undefined} locale={locale} placeholder={t('pickDate')} todayLabel={t('fToday')} clearLabel={t('clearDate')} prevLabel={t('prevMonth')} nextLabel={t('nextMonth')} align="end"
                    onChange={(v) => { setTo(v); setRange('custom'); }} />
                </div>
              </div>
              {shown && shown.length === 0 ? (
                <div className="empty glass h-nomatch">
                  <p className="muted" style={{ margin: 0 }}>{t('noMatch')}</p>
                  <div className="cta-row"><button type="button" className="btn btn-secondary" onClick={resetFilter}>{t('resetFilter')}</button></div>
                </div>
              ) : null}
              <div className="hlist">
                {(shown ?? list).map((h) => {
                  const isYesNo = h.kind === 'yesno';
                  const labels = isYesNo ? [] : Object.values(bundle.ui.spreads[h.spread]?.positions ?? {}).map((p) => p.label);
                  const deck = ['rws', 'moon', 'lotus'].includes(h.deck) ? h.deck : DECKS_FALLBACK;
                  const cardLinks = h.cards.filter((c) => CARD_INDEX.has(c.id)).map((c, k) => {
                    const name = bundle.cards[c.id]?.name ?? c.id;
                    return (
                      <Link className="h-card" key={`${c.id}-${k}`} href={`/collection/${deck}/${c.id}`} aria-label={`${labels[k] ?? ''}: ${name}`}>
                        <span className={`mini${c.reversed ? ' is-rev' : ''}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: face(c.id, deck) }} />
                        <span><b>{name}</b><small>{labels[k] ?? ''}{c.reversed ? ` · ${tCards('reversed')}` : ''}</small></span>
                      </Link>
                    );
                  });
                  const topicLabel = bundle.ui.topics[h.topic as keyof typeof bundle.ui.topics] ?? h.topic;
                  const kind: Kind = isYesNo ? 'yesno' : h.spread === '1' ? 'daily' : h.spread === '3s' ? 'self' : 'three';
                  const isOpen = openIds.has(h.id);
                  const validCards = h.cards.filter((c) => CARD_INDEX.has(c.id));
                  const topicOf = (c: { id: string; reversed: boolean }) => bundle.cards[c.id]?.topics?.[h.topic as keyof typeof bundle.ui.topics]?.[c.reversed ? 'reversed' : 'upright'];
                  return (
                    <article className={`h-item glass${isYesNo ? ' is-yn' : ''}`} data-kind={kind} data-v={isYesNo ? h.verdict : undefined} key={h.id}>
                      <button type="button" className="h-toggle" aria-expanded={isOpen} aria-controls={`h-body-${h.id}`} onClick={() => toggle(h.id)}>
                        <span className="h-toggle-main">
                          <span className="h-meta">
                            <span className="h-date">{dateFmt.format(new Date(h.at))}</span>
                            <span className="h-kind" data-kind={kind}>{KIND_ICON[kind]}{isYesNo ? t('yesno') : spreadBadge(h.spread)}</span>
                            {isYesNo ? null : <span className="badge muted">{topicLabel}</span>}
                            <span className="badge muted">{tDecks(`${deck}.name`)}</span>
                          </span>
                          {!isOpen && h.question ? <span className="h-peek">“{h.question}”</span> : null}
                        </span>
                        <svg className="h-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      {isOpen ? <div className="h-body" id={`h-body-${h.id}`}>
                      {isYesNo && h.verdict ? (
                        <YesNoSummary question={h.question} cards={h.cards.filter((c) => CARD_INDEX.has(c.id))} verdict={h.verdict} texts={bundle.cards}>
                          {cardLinks}
                        </YesNoSummary>
                      ) : (
                        <>
                          {h.question ? <p className="h-q">“{h.question}”</p> : null}
                          <div className="h-rows">
                            {validCards.slice(0, h.spread === '1' ? 1 : validCards.length).map((c, k) => (
                              <div className="h-row" key={`${c.id}-${k}`}>
                                <div className="h-row-card">{cardLinks[k]}</div>
                                {topicOf(c) ? (
                                  <section className="h-topic" aria-label={`${labels[k] ?? ''} · ${topicLabel}`}>
                                    <h4 className="rc-k">{topicLabel}</h4>
                                    <p>{topicOf(c)}</p>
                                  </section>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      </div> : null}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
