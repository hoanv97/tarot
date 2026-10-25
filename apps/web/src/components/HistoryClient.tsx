'use client';

import { CARD_INDEX, DEFAULT_LOCALE, isLocale, isSpreadId, type SpreadId } from '@miu/tarot-core';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCardFace, useConfigured } from '@/lib/content-client';
import { LoginForm } from '@/components/LoginForm';
import { Mascot } from '@/components/Mascot';
import { Link, useRouter } from '@/i18n/navigation';
import { adminHref } from '@/lib/admin-url';
import { getHistory, saveHistory, type HistoryEntry } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/use-auth';

const DECKS_FALLBACK = 'rws';

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
  const [toast, setToast] = useState('');
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (user && supabase) {
      const { data } = await supabase.from('readings').select('id, spread, topic, question, cards, locale, created_at').order('created_at', { ascending: false }).limit(50);
      setList((data ?? []).map((r) => ({
        id: r.id as string, at: new Date(r.created_at as string).getTime(), spread: (isSpreadId(r.spread) ? r.spread : '3') as SpreadId,
        deck: DECKS_FALLBACK, topic: r.topic as string, question: (r.question as string | null) ?? '', locale: r.locale as string,
        cards: r.cards as HistoryEntry['cards']
      })));
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
                <span className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
                <div>
                  <p className="small muted">{tLogin('hello')}</p>
                  <p className="who-email">{user.name}</p>
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
                <span className="muted small">{t('count', { n: list.length })}</span>
                <button type="button" className={`btn-text${armed ? ' is-armed' : ''}`} onClick={clear}>{armed ? t('clearArmed') : t('clear')}</button>
              </div>
              <div className="hlist">
                {list.map((h) => {
                  const labels = Object.values(bundle.ui.spreads[h.spread]?.positions ?? {}).map((p) => p.label);
                  const deck = ['rws', 'moon', 'lotus'].includes(h.deck) ? h.deck : DECKS_FALLBACK;
                  return (
                    <article className="h-item glass" key={h.id}>
                      <div className="h-meta">
                        <span className="h-date">{dateFmt.format(new Date(h.at))}</span>
                        <span className="badge">{spreadBadge(h.spread)}</span>
                        <span className="badge muted">{bundle.ui.topics[h.topic as keyof typeof bundle.ui.topics] ?? h.topic}</span>
                        <span className="badge muted">{tDecks(`${deck}.name`)}</span>
                      </div>
                      {h.question ? <p className="h-q">“{h.question}”</p> : null}
                      <div className="h-cards">
                        {h.cards.filter((c) => CARD_INDEX.has(c.id)).map((c, k) => {
                          const name = bundle.cards[c.id]?.name ?? c.id;
                          return (
                            <Link className="h-card" key={`${c.id}-${k}`} href={`/cards/${c.id}`} aria-label={`${labels[k] ?? ''}: ${name}`}>
                              <span className={`mini${c.reversed ? ' is-rev' : ''}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: face(c.id, deck) }} />
                              <span><b>{name}</b><small>{labels[k] ?? ''}{c.reversed ? ` · ${tCards('reversed')}` : ''}</small></span>
                            </Link>
                          );
                        })}
                      </div>
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
