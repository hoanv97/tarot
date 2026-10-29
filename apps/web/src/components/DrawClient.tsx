'use client';

import {
  CARD_IDS, CARD_INDEX, DEFAULT_LOCALE, SPREAD_IDS, TOPIC_IDS, analyzeSpread, isLocale, isSpreadId, isTopicId, readSpread,
  type AnalysisResult, type DrawnCard, type SpreadId, type TopicId
} from '@miu/tarot-core';
import { useLocale, useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { cardBackSvg } from '@/components/CardArt';
import { useCardFace, useConfigured, useContentPatch } from '@/lib/content-client';
import { Disclaimer } from '@/components/Disclaimer';
import { Mascot } from '@/components/Mascot';
import { Reveal } from '@/components/Reveal';
import { Link, useRouter } from '@/i18n/navigation';
import { DECK_IDS } from '@/lib/art/draw';
import { detectCrisis } from '@miu/content-policy';
import { prefersReducedMotion, pickOne, round1, shuffled, wait } from '@/lib/motion';
import { addHistory } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { TOPIC_ICONS } from '@/lib/topic-icons';
import { useMood } from '@/lib/use-mood';

type Phase = 'idle' | 'shuffling' | 'picking' | 'revealing' | 'flipped' | 'loading' | 'done';
type PickState = DrawnCard & { flipped: boolean; landed: boolean };
type AnalysisState = { status: 'idle' | 'loading' | 'done'; data?: AnalysisResult };

type Draw = {
  deck: string | null;
  topic: TopicId | null;
  spread: SpreadId | null;
  question: string;
  phase: Phase;
  order: string[];
  picks: PickState[];
  bubble: string;
  bubbleKey: number;
  hint: string;
  cta: { label: string; visible: boolean; disabled: boolean };
  resetKey: number;
  big: boolean;
  analysis: AnalysisState;
};

const WOW = ['sun', 'star', 'world'];
const CHEV = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>;
const slotCount = (spread: SpreadId | null): number => (spread === '1' ? 1 : 3);
const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_m, key: string) => String(values[key] ?? ''));

/** Số màu thanh bên trái của các mục kiến giải, khớp với [data-hue] trong globals.css. */
const HUE_COUNT = 6;

/** Đếm số lần xem bài trong ngày (theo giờ máy người dùng), lưu cục bộ trong trình duyệt. */
const VIEWS_KEY = 'miu.viewsToday';
const todayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
};
const readViewsToday = (): number => {
  try {
    const raw = window.localStorage.getItem(VIEWS_KEY);
    const saved = raw ? (JSON.parse(raw) as { day?: string; count?: number }) : null;
    return saved?.day === todayKey() && typeof saved.count === 'number' ? saved.count : 0;
  } catch { return 0; }
};
const addViewToday = (): void => {
  try { window.localStorage.setItem(VIEWS_KEY, JSON.stringify({ day: todayKey(), count: readViewsToday() + 1 })); } catch { /* bỏ qua nếu trình duyệt chặn lưu trữ */ }
};

/** `daily`: trang Daily Tarot, tự chọn sẵn bộ Rider–Waite–Smith, kiểu trải 1 lá hằng ngày và chủ đề Tình yêu. */
export function DrawClient({ daily = false }: { daily?: boolean } = {}) {
  const t = useTranslations('draw');
  const tDecks = useTranslations('decks');
  const rawLocale = useLocale();
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const router = useRouter();
  const params = useSearchParams();
  const { mood, setMood, nonce } = useMood();

  const [, bump] = useReducer((n: number) => n + 1, 0);
  /** true khi hôm nay người dùng đã xem ít nhất một lần trước ván này. */
  const [repeatToday, setRepeatToday] = useState(false);
  /** Câu thoại ngẫu nhiên của Miu trong khối phân tích (chọn sau khi mount để không lệch hydration). */
  const [quip, setQuip] = useState(0);
  useEffect(() => { setRepeatToday(readViewsToday() >= 1); }, []);
  const state = useRef<Draw>({
    deck: null, topic: null, spread: null, question: '', phase: 'idle', order: [...CARD_IDS], picks: [], bubble: '', bubbleKey: 0,
    hint: '', cta: { label: '', visible: true, disabled: true }, resetKey: 0, big: false, analysis: { status: 'idle' }
  });
  const d = state.current;
  // Nội dung theo bộ bài đang chọn, gộp với phần admin đã cấu hình (chưa cấu hình thì y hệt dữ liệu có sẵn).
  const configured = useConfigured(locale, d.deck ?? 'rws');
  const bundle = configured.bundle;
  const face = useCardFace(locale);
  const { hiddenDecks, hiddenSpreads } = useContentPatch();
  const deckIds = DECK_IDS.filter((id) => !hiddenDecks.includes(id));
  const spreadIds = SPREAD_IDS.filter((id) => !hiddenSpreads.includes(id));
  const questionRef = useRef<HTMLInputElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  /** Đọc phase hiện tại từ ref. TypeScript không theo dõi được thay đổi qua set(), nên không dùng d.phase sau các lần await. */
  const phaseNow = (): Draw['phase'] => state.current.phase;
  const set = (patch: Partial<Draw>) => { Object.assign(state.current, patch); bump(); };
  const say = (text: string, next: 'happy' | 'wow' | 'think' | null = null) => {
    set({ bubble: text, bubbleKey: state.current.bubbleKey + 1 });
    setMood(next);
  };

  const positions = (): string[] => {
    const key = d.spread ?? '3';
    return Object.values(bundle.ui.spreads[key].positions).map((p) => p.label);
  };
  const topicLabel = (id: TopicId): string => bundle.ui.topics[id];
  const deckName = (id: string): string => tDecks(`${id}.name`);
  const deckVoice = (id: string): string => tDecks(`${id}.voice`);
  const isReady = (): boolean => !!(d.deck && d.topic && d.spread);
  const missing = (): string[] => [!d.deck && t('needDeck'), !d.spread && t('needSpread'), !d.topic && t('needTopic')].filter((x): x is string => !!x);

  const introMessage = (): string => {
    if (!isReady()) return t('say.intro');
    if (d.spread !== '1') return t('say.intro3', { positions: positions().join(', ') });
    return t('say.intro1');
  };

  /* ---------- Bố cục bàn bài: các hàng cung tròn chồng lên nhau ---------- */
  const layoutSpread = () => {
    const pile = pileRef.current;
    if (!pile) return;
    const cards = Array.from(pile.querySelectorAll<HTMLElement>('.deal-card'));
    const W = pile.clientWidth;
    if (!cards.length || !W) return;
    const n = cards.length;
    const cw = cards[0]!.offsetWidth;
    const ch = cw * 1.7;
    const pad = 12;
    const minStep = 14;
    const fitPerRow = Math.floor((W - cw - pad * 2) / minStep) + 1;
    const rows = Math.max(n > 40 ? 2 : 1, Math.ceil(n / Math.max(fitPerRow, 2)));
    const perRow = Math.ceil(n / rows);
    const step = perRow > 1 ? Math.min((W - cw - pad * 2) / (perRow - 1), cw * 0.7) : 0;
    const rowW = step * (perRow - 1) + cw;
    const left0 = (W - rowW) / 2;
    const arcH = Math.min(40, W * 0.04);
    const rowOffset = ch * 0.72;
    cards.forEach((c, i) => {
      const row = Math.floor(i / perRow);
      const j = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      const tt = inRow > 1 ? j / (inRow - 1) - 0.5 : 0;
      c.style.left = `${round1(left0 + j * step)}px`;
      c.style.top = `${round1(arcH + row * rowOffset + arcH * (4 * tt * tt))}px`;
      c.style.setProperty('--rot', `${round1(tt * 26)}deg`);
      c.style.setProperty('--jy', '0px');
    });
    pile.style.setProperty('--fan-h', `${round1(ch + arcH * 2 + (rows - 1) * rowOffset + 8)}px`);
  };

  const resetPile = () => {
    const pile = pileRef.current;
    if (!pile) return;
    pile.className = 'spread is-idle';
    pile.hidden = false;
    pile.classList.toggle('is-dense', pile.querySelectorAll('.deal-card').length > 40);
  };

  const reset = (message?: string) => {
    setRepeatToday(readViewsToday() >= 1);
    set({
      phase: 'idle', picks: [], order: shuffled(CARD_IDS), resetKey: state.current.resetKey + 1, big: false,
      hint: t('pileCount', { n: CARD_IDS.length }), cta: { label: t('shuffle'), visible: true, disabled: !isReady() }, analysis: { status: 'idle' }
    });
    resetPile();
    say(message ?? introMessage());
  };

  /* ---------- Luồng rút bài ---------- */
  const remainingText = (): string => {
    const left = slotCount(d.spread) - d.picks.length;
    return d.spread === '1' ? t('pickOne', { n: d.order.length }) : t('pickMore', { n: left });
  };

  const shuffle = async () => {
    const pile = pileRef.current;
    if (d.phase !== 'idle' || !isReady() || !pile) return;
    set({ phase: 'shuffling', order: shuffled(d.order), cta: { label: t('shuffling'), visible: true, disabled: true }, hint: t('shufflingHint') });
    say(t('say.shuffling'), 'think');
    await wait(30);
    const cards = Array.from(pile.querySelectorAll<HTMLButtonElement>('.deal-card'));
    const reduced = prefersReducedMotion();
    const rnd = (min: number, max: number): number => min + Math.random() * (max - min);
    const cx = pile.clientWidth / 2;
    const cy = pile.clientHeight / 2;
    pile.classList.remove('is-idle');
    pile.style.setProperty('--k', '.7');
    const home = cards.map((c) => ({
      gx: round1(cx - (c.offsetLeft + c.offsetWidth / 2)),
      gy: round1(cy - (c.offsetTop + c.offsetHeight / 2)),
      gr: round1(rnd(-14, 14)),
    }));
    /* 1. Gom bài về giữa bàn: mỗi lá bay vào lúc ngẫu nhiên, xếp thành một xấp hơi lộn xộn. */
    cards.forEach((c, i) => {
      const h = home[i]!;
      c.style.setProperty('--td', `${Math.round(rnd(0, 260))}ms`);
      c.style.setProperty('--gx', `${h.gx}px`);
      c.style.setProperty('--gy', `${h.gy}px`);
      c.style.setProperty('--gr', `${h.gr}deg`);
    });
    await wait(reduced ? 300 : 760);
    /* 2. Chia đôi xấp bài rồi xen kẽ (riffle) hai lượt: các lá lần lượt bật sang hai bên, nhấc lên rồi chèn vào nhau. */
    const riffle = (spread: number): Promise<unknown> => Promise.all(cards.map((c, i) => {
      const h = home[i]!;
      const side = i % 2 === 0 ? -1 : 1;
      const dx = side * spread * rnd(0.7, 1.25);
      const dy = rnd(-18, 10);
      const dr = side * rnd(3, 9);
      const at = (x: number, y: number, r: number, k = 1): string =>
        `translate(${round1(h.gx + x)}px,${round1(h.gy + y)}px) rotate(${round1(h.gr + r)}deg) scale(${k})`;
      return c.animate([
        { transform: at(0, 0, 0) },
        { transform: at(dx, dy, dr), offset: 0.4 },
        { transform: at(dx * 0.25, dy - 22, dr * -0.4, 1.06), offset: 0.7 },
        { transform: at(0, 0, 0) },
      ], { duration: 520, delay: i * 5 + rnd(0, 40), easing: 'cubic-bezier(.3,.7,.3,1)' }).finished.catch(() => undefined);
    }));
    if (reduced || typeof cards[0]?.animate !== 'function') {
      await wait(300);
    } else {
      const spread = Math.min(110, pile.clientWidth * 0.14);
      await riffle(spread);
      if (!alive.current || phaseNow() !== 'shuffling') return;
      await riffle(spread * 1.3);
    }
    if (!alive.current || phaseNow() !== 'shuffling') return;
    /* 3. Trải bài ra lại: thứ tự bay về ngẫu nhiên, không theo hàng. */
    cards.forEach((c) => {
      c.style.setProperty('--td', `${Math.round(rnd(0, 380))}ms`);
      c.style.setProperty('--gx', '0px');
      c.style.setProperty('--gy', '0px');
      c.style.setProperty('--gr', '0deg');
    });
    await wait(reduced ? 300 : 900);
    if (!alive.current || phaseNow() !== 'shuffling') return;
    cards.forEach((c) => { c.style.setProperty('--td', '0ms'); c.disabled = false; });
    pile.classList.add('is-picking');
    if (!reduced) {
      shuffled(cards.map((_, i) => i)).slice(0, 7).forEach((ci, k) => {
        cards[ci]?.animate(
          [{ translate: '0 0', scale: 1 }, { translate: '0 -16px', scale: 1.08 }, { translate: '0 0', scale: 1 }],
          { duration: 480, delay: k * 90, easing: 'ease-in-out' },
        );
      });
    }
    set({ phase: 'picking', cta: { label: '', visible: false, disabled: true }, hint: remainingText() });
    say(d.spread === '1' ? t('say.spread1') : t('say.spreadN', { positions: positions().join(', ') }), 'happy');
  };

  const flyTo = (from: HTMLElement, to: HTMLElement, deck: string): Promise<void> => {
    if (prefersReducedMotion() || typeof from.animate !== 'function') return Promise.resolve();
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const clone = document.createElement('div');
    clone.className = 'fly-card';
    clone.innerHTML = cardBackSvg(deck);
    clone.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
    document.body.appendChild(clone);
    const anim = clone.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
      { transform: `translate(${round1((b.left - a.left) * 0.5)}px,${round1((b.top - a.top) * 0.5 - 30)}px) scale(${round1((1 + b.width / a.width) / 2)}) rotate(-6deg)`, offset: 0.55 },
      { transform: `translate(${round1(b.left - a.left)}px,${round1(b.top - a.top)}px) scale(${round1(b.width / a.width)}) rotate(0deg)` }
    ], { duration: 640, easing: 'cubic-bezier(.22,1,.36,1)' });
    return anim.finished.catch(() => undefined).then(() => clone.remove());
  };

  const pick = async (i: number) => {
    const pile = pileRef.current;
    const count = slotCount(d.spread);
    if (d.phase !== 'picking' || d.picks.length >= count || !pile || !d.deck) return;
    const cardEl = pile.querySelector<HTMLButtonElement>(`.deal-card[data-i="${i}"]`);
    if (!cardEl || cardEl.disabled) return;
    cardEl.disabled = true;
    const k = d.picks.length;
    const picked: PickState = { id: d.order[i] as string, reversed: Math.random() < 0.35, flipped: false, landed: false };
    d.picks.push(picked);
    const label = positions()[k] ?? '';
    if (d.picks.length < count) {
      set({ hint: remainingText() });
      say(t('say.picked', { label, n: count - d.picks.length }));
    } else {
      set({ hint: '' });
      pile.querySelectorAll<HTMLButtonElement>('.deal-card').forEach((c) => { c.disabled = true; });
    }
    const target = slotsRef.current?.querySelector<HTMLElement>(`.slot-card[data-k="${k}"] .card3d`);
    const flight = target ? flyTo(cardEl, target, d.deck) : Promise.resolve();
    cardEl.classList.add('is-taken');
    await flight;
    if (!alive.current) return;
    picked.landed = true;
    bump();
    if (d.picks.some((p) => !p.landed) || d.picks.length < count) return;
    set({ phase: 'revealing' });
    pile.classList.remove('is-picking');
    pile.classList.add('is-gone');
    await wait(420);
    if (!alive.current || phaseNow() !== 'revealing') return;
    pile.hidden = true;
    set({
      big: true, hint: d.spread === '1' ? t('tapFlip1') : t('tapFlipN'),
      cta: { label: d.spread === '1' ? t('flipOne') : t('flipAll'), visible: true, disabled: false }
    });
    say(d.spread === '1' ? t('say.landed1') : t('say.landedN'), 'happy');
  };

  const finish = async () => {
    if (d.phase === 'flipped' || d.phase === 'done' || !d.deck || !d.topic || !d.spread) return;
    set({ phase: 'flipped', hint: '', cta: { label: t('seeMeaning'), visible: true, disabled: true } });
    const cards = d.picks.map((p) => ({ id: p.id, reversed: p.reversed }));
    addHistory({ id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, at: Date.now(), spread: d.spread, deck: d.deck, topic: d.topic, question: d.question.trim(), locale, cards });
    void saveToAccount(cards);
    await wait(750);
    if (!alive.current || phaseNow() !== 'flipped') return;
    set({ hint: t('allFlipped'), cta: { label: t('seeMeaning'), visible: true, disabled: false } });
    say(d.spread === '1' ? t('say.flipped1') : t('say.flippedN'), 'happy');
  };

  const saveToAccount = async (cards: DrawnCard[]) => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session || !d.spread || !d.topic) return;
    await supabase.from('readings').insert({ user_id: data.session.user.id, spread: d.spread, topic: d.topic, question: d.question.trim() || null, cards, locale, deck: d.deck });
  };

  const flip = (k: number) => {
    const p = d.picks[k];
    if (!p) return;
    if (p.flipped) { router.push(`/cards/${p.id}`); return; }
    p.flipped = true;
    const name = bundle.cards[p.id]?.name ?? p.id;
    const lines = (p.reversed ? t.raw('say.rev') : t.raw('say.up')) as string[];
    say(fill(pickOne(lines), { name }), p.reversed ? 'think' : WOW.includes(p.id) ? 'wow' : 'happy');
    const rect = slotsRef.current?.querySelector(`.slot-card[data-k="${k}"] .card3d`)?.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('miu:flip', { detail: { rect, reversed: p.reversed } }));
    bump();
    if (d.picks.every((x) => x.flipped)) void finish();
  };

  const flipAll = async () => {
    set({ cta: { ...d.cta, disabled: true } });
    for (let k = 0; k < d.picks.length; k++) {
      if (!d.picks[k]?.flipped) { flip(k); await wait(450); }
    }
  };

  const showMeaning = async () => {
    if (d.phase !== 'flipped') return;
    set({ phase: 'loading', hint: '', cta: { ...d.cta, disabled: true } });
    say(t('say.listening'), 'happy');
    await wait(1000);
    if (!alive.current || phaseNow() !== 'loading') return;
    addViewToday();
    set({ phase: 'done', cta: { label: t('redraw'), visible: true, disabled: false } });
    say(t('say.done'), 'happy');
  };

  const onCta = () => {
    if (d.phase === 'idle') void shuffle();
    else if (d.phase === 'revealing') void flipAll();
    else if (d.phase === 'flipped') void showMeaning();
    else if (d.phase === 'done') {
      reset(t('say.again'));
      const top = (stageRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 80;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  };

  /* ---------- Chọn bộ bài / kiểu trải / chủ đề ---------- */
  const afterOption = (message: string, wasActive: boolean) => reset(wasActive ? message + t('say.restart') : message);

  const chooseDeck = (id: string) => {
    if (d.deck === id) return;
    const wasActive = d.phase !== 'idle';
    d.deck = id;
    afterOption(t('say.deck', { deck: deckName(id), voice: deckVoice(id) }), wasActive);
  };
  const chooseTopic = (id: TopicId) => {
    if (d.topic === id) return;
    const wasActive = d.phase !== 'idle';
    d.topic = id;
    afterOption(t('say.topic', { topic: topicLabel(id) }) + (id === 'mind' ? t('mind') : ''), wasActive);
  };
  const chooseSpread = (id: SpreadId) => {
    if (d.spread === id) return;
    const wasActive = d.phase !== 'idle';
    d.spread = id;
    afterOption(introMessage(), wasActive);
  };

  /* ---------- Vòng đời ---------- */
  useEffect(() => {
    alive.current = true;
    const deckParam = params.get('deck');
    const spreadParam = params.get('spread');
    if (deckParam && DECK_IDS.includes(deckParam)) d.deck = deckParam;
    if (spreadParam && isSpreadId(spreadParam)) d.spread = spreadParam;
    const topicParam = params.get('topic');
    if (topicParam && isTopicId(topicParam)) d.topic = topicParam;
    if (daily) { d.deck = 'rws'; d.spread = '1'; d.topic = 'love'; }
    reset(deckParam && d.deck ? t('say.deckReady', { deck: deckName(d.deck), voice: deckVoice(d.deck) }) : undefined);
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(() => { if (state.current.phase !== 'shuffling') layoutSpread(); }, 120); };
    window.addEventListener('resize', onResize);
    return () => { alive.current = false; clearTimeout(timer); window.removeEventListener('resize', onResize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => { layoutSpread(); });

  useEffect(() => {
    if (d.phase === 'done') {
      const top = (readingRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 72;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [d.phase]);

  /* Khóa cuộn trang khi màn hình chờ đang hiện. */
  useEffect(() => {
    if (d.phase !== 'loading' && d.analysis.status !== 'loading') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [d.phase, d.analysis.status]);

  /* ---------- Phân tích chuyên sâu (từ dữ liệu có sẵn, không gọi AI) ---------- */
  const showAnalysis = async () => {
    if (!d.spread || !d.topic || d.analysis.status !== 'idle') return;
    set({ analysis: { status: 'loading' } });
    await wait(1000);
    if (!alive.current || state.current.analysis.status !== 'loading') return;
    const result = analyzeSpread({
      picks: d.picks.map((p) => ({ id: p.id, reversed: p.reversed })),
      spreadId: d.spread, topicId: d.topic, locale, question: d.question, isCrisis: detectCrisis,
      bundle, ruleSet: configured.ruleSet, cardTones: configured.cardTones
    });
    set({ analysis: { status: 'done', data: result } });
    setMood(result.source === 'safety' ? 'happy' : 'wow');
  };

  /* ---------- Hiển thị ---------- */
  const spreadKey: SpreadId = d.spread ?? '3';
  const labels = positions();
  const need = missing();
  const needText = need.length
    ? t('need', { list: need.length > 1 ? need.slice(0, -1).join(', ') + t('and') + need[need.length - 1] : need[0] ?? '' })
    : '';
  const count = slotCount(d.spread);
  const deckForArt = d.deck ?? 'rws';
  // Mỗi mục kiến giải dùng một màu thanh bên trái khác với mục liền kề (xoay vòng qua HUE_COUNT màu, xem .ins trong globals.css).
  let analysisHue = 0;
  const rawInsights = d.phase === 'done' && d.topic && d.spread
    ? readSpread({ picks: d.picks.map((p) => ({ id: p.id, reversed: p.reversed })), spreadId: d.spread, topicId: d.topic, locale, bundle, ruleSet: configured.ruleSet })
    : [];
  const quips = t.raw('analysisQuips') as string[];
  useEffect(() => { setQuip(Math.floor(Math.random() * 1000)); }, [d.resetKey]);
  /** Gộp các nhận xét cùng sắc thái (vd. hai mục "Góc nhìn") thành một mục, giữ thứ tự xuất hiện đầu tiên. */
  const insights = rawInsights.reduce<typeof rawInsights>((merged, item) => {
    const at = merged.findIndex((m) => m.tone === item.tone);
    if (at < 0) return [...merged, item];
    return merged.map((m, k) => (k === at ? { ...m, text: `${m.text} ${item.text}` } : m));
  }, []);

  return (
    <div className="wrap page page-tight">
      <h1 className="draw-title">{t('titleA')}<span className="grad-text">{t('titleB')}</span></h1>

      <div className="config glass" role="group" aria-label={t('configAria')}>
        <div className="cfg-row">
          <div className="cfg-group">
            <span className={`field-label${d.deck ? '' : ' need'}`} id="lbl-deck">{t('deck')}</span>
            <div className="seg" role="group" aria-labelledby="lbl-deck">
              {deckIds.map((id) => <button key={id} type="button" aria-pressed={d.deck === id} onClick={() => chooseDeck(id)}>{deckName(id)}</button>)}
            </div>
          </div>
          <div className="cfg-group">
            <span className={`field-label${d.spread ? '' : ' need'}`} id="lbl-mode">{t('spread')}</span>
            <div className="seg" role="group" aria-labelledby="lbl-mode">
              {spreadIds.map((id) => <button key={id} type="button" aria-pressed={d.spread === id} onClick={() => chooseSpread(id)}>{bundle.ui.spreads[id].label}</button>)}
            </div>
          </div>
        </div>
        <div className="cfg-group">
          <span className={`field-label${d.topic ? '' : ' need'}`} id="lbl-topic">{t('topic')}</span>
          <div className="chips" role="group" aria-labelledby="lbl-topic">
            {TOPIC_IDS.map((id) => (
              <button key={id} type="button" className="chip" aria-pressed={d.topic === id} onClick={() => chooseTopic(id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TOPIC_ICONS[id] ?? '' }} />
                {topicLabel(id)}
              </button>
            ))}
          </div>
        </div>
        <div className="cfg-group cfg-q">
          <label className="field-label" htmlFor="question">{t('question')}</label>
          <div className="q-wrap">
            <div className="q-field">
              <input className="q-input" id="question" type="text" maxLength={200} autoComplete="off" placeholder={t('questionPlaceholder')}
                ref={questionRef} value={d.question} onChange={(e) => { d.question = e.target.value; bump(); }} />
              <span className="q-count" aria-hidden="true">{d.question.length}/200</span>
            </div>
          </div>
          {d.topic ? (
            <div className="q-samples" role="group" aria-label={t('sampleAria')}>
              <span className="q-samples-label">{t('sampleLabel')}</span>
              {(t.raw(`samples.${d.topic}`) as string[]).map((sample) => (
                <button key={sample} type="button" className="q-sample" aria-pressed={d.question === sample}
                  onClick={() => { d.question = sample; bump(); questionRef.current?.focus(); }}>{sample}</button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {repeatToday ? <p className="repeat-notice" role="status">{t('repeatToday')}</p> : null}
      <div className="stage glass" ref={stageRef}>
        <div className="guide">
          <div key={d.bubbleKey} className="bubble pop" aria-live="polite">{d.bubble}</div>
          <Mascot mood={mood} nonce={nonce} />
        </div>

        <div className={`slots${d.big ? ' is-big' : ''}`} data-mode={count} ref={slotsRef}>
          {Array.from({ length: count }, (_, k) => {
            const p = d.picks[k];
            const label = labels[k] ?? '';
            const name = p ? bundle.cards[p.id]?.name ?? p.id : '';
            return (
              <div className="slot" key={`${d.resetKey}-${k}`}>
                <button type="button" className="slot-card" data-k={k} disabled={!p?.landed}
                  aria-label={p?.flipped ? t('slotOpen', { name, rev: p.reversed ? t('reversedSuffix') : '' }) : p?.landed ? t('slotFlip', { label }) : t('slotEmpty', { label })}
                  onClick={() => flip(k)}>
                  {p?.landed ? (
                    <div className={`card3d ${p.flipped ? 'is-flipped' : 'is-landing'}${p.reversed ? ' is-reversed' : ''}`}>
                      <div className="card3d-inner">
                        <div className="card3d-face card3d-back" dangerouslySetInnerHTML={{ __html: cardBackSvg(deckForArt) }} />
                        <div className="card3d-face card3d-front"><div className="face-rot" dangerouslySetInnerHTML={{ __html: face(p.id, deckForArt) }} /></div>
                      </div>
                    </div>
                  ) : <div className="card3d is-empty" />}
                </button>
                <p className="slot-label">{label}</p>
                <p className="slot-name" aria-live="polite">{p?.flipped ? <>{name}{p.reversed ? <span className="badge rev">{t('reversed')}</span> : null}</> : null}</p>
              </div>
            );
          })}
        </div>

        <div className="table-area">
          <p className="pile-hint" aria-live="polite">{d.hint}</p>
          <p className="pick-notice" role="status" aria-live="polite" hidden={need.length === 0}>{needText}</p>
          <div className="cta-row draw-cta" hidden={!d.cta.visible}>
            <button className="btn btn-primary" type="button" disabled={d.cta.disabled} onClick={onCta}>{d.cta.label}</button>
          </div>
          <div className="spread is-idle" ref={pileRef} aria-label={t('pileAria', { n: d.order.length })}
            onClick={(e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('.deal-card'); if (b) void pick(Number(b.dataset.i)); }}>
            {d.order.map((id, i) => (
              <button key={`${d.resetKey}-${i}`} type="button" className="deal-card" data-i={i} disabled aria-label={t('backAria', { n: i + 1 })}
                style={{ ['--i' as string]: i }} dangerouslySetInnerHTML={{ __html: cardBackSvg(deckForArt) }} />
            ))}
          </div>
        </div>
      </div>

      <div className="reading" ref={readingRef}>
        {d.phase === 'done' && d.topic && d.deck ? (
          <>
            <Reveal className="reading-head center">
              <p className="eyebrow">{t('readingEyebrow', { topic: topicLabel(d.topic), deck: deckName(d.deck) })}</p>
              <h2 className="h2">{d.spread === '1' ? t('readingTitle1') : t('readingTitleN')}</h2>
              {d.question.trim() ? <p className="q-echo">“{d.question.trim()}”</p> : null}
            </Reveal>
            <div className="rgrid" data-n={count}>
              {d.picks.map((p, k) => {
                const card = bundle.cards[p.id];
                const structure = CARD_INDEX.get(p.id);
                if (!card || !structure) return null;
                return (
                  <Reveal as="article" className="rcard glass" delay={k * 90} key={p.id}>
                    <p className="pos">{labels[k]}</p>
                    <div className={`rc-art mini${p.reversed ? ' is-rev' : ''}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: face(p.id, d.deck as string) }} />
                    <div className="rc-head">
                      <div className="rc-title">
                        <h3 className="h3">{card.name}</h3>
                        <span className={`badge${p.reversed ? ' rev' : ''}`}>{p.reversed ? t('reversed') : t('upright')}</span>
                      </div>
                      <p className="rc-k">{t('rcKeywords')}</p>
                      <ul className="kw-list">
                        {(p.reversed ? card.keywords_reversed : card.keywords_upright).map((word) => <li className={`kw${p.reversed ? ' rev' : ''}`} key={word}>{word}</li>)}
                      </ul>
                    </div>
                    <section className="rc-sec rc-topic">
                      <h4 className="rc-k">{topicLabel(d.topic as TopicId)}</h4>
                      <p>{card.topics[d.topic as TopicId][p.reversed ? 'reversed' : 'upright']}</p>
                    </section>
                    <section className="rc-sec">
                      <h4 className="rc-k">{t('rcGeneral')}</h4>
                      {(p.reversed ? card.meaning_reversed : card.meaning_upright).split('\n\n').map((para, n) => <p className="rc-gen" key={n}>{para}</p>)}
                    </section>
                    {card.advice ? (
                      <section className="rc-sec rc-advice">
                        <h4 className="rc-k">{t('rcAdvice')}</h4>
                        <p>{card.advice[p.reversed ? 'reversed' : 'upright']}</p>
                      </section>
                    ) : null}
                    {card.questions ? (
                      <section className="rc-sec">
                        <h4 className="rc-k">{t('rcQuestions')}</h4>
                        <ul className="rc-q">
                          {card.questions[p.reversed ? 'reversed' : 'upright'].map((q) => <li key={q}>{q}</li>)}
                        </ul>
                      </section>
                    ) : null}
                  </Reveal>
                );
              })}
            </div>

            {insights.length ? (
              <Reveal as="section" className="insights glass" delay={count * 90}>
                <p className="eyebrow">{t('insightsEyebrow')}</p>
                <h3 className="h3">{d.spread === '1' ? t('insightsTitle1') : t('insightsTitleN')}</h3>
                <ul className="ins-list">
                  {insights.map((i, index) => (
                    <li className="ins" data-tone={i.tone} data-hue={index % HUE_COUNT} key={i.id}><span className="ins-tag">{bundle.ui.tones[i.tone]}</span><p>{i.text}</p></li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            <div className={`insights glass${d.analysis.status === 'done' ? ' an-read' : ''}`}>
              {d.analysis.status === 'done' ? <p className="eyebrow">{t('analysis')}</p> : (
                <div className="guide an-guide">
                  <div className="bubble pop" key={`${d.resetKey}-${quip}`} aria-live="polite">{quips[quip % quips.length]}</div>
                  <Mascot mood={d.analysis.status === 'loading' ? 'think' : null} nonce={d.resetKey} />
                </div>
              )}
              {d.analysis.status === 'done' && d.analysis.data ? (
                <>
                  <p className="hint an-intro">{d.analysis.data.source === 'safety' ? t('analysisSafety') : t('analysisLabel')}</p>
                  {d.analysis.data.sections.filter((section) => section.id !== 'insights').map((section) => (
                    <section className="an-sec" data-sec={section.id} key={section.id}>
                      <h3 className="h3 an-h">{section.title}</h3>
                      <ul className="ins-list">
                        {section.items.map((item, i) => {
                          const pick = section.id === 'cards' ? d.picks[i] : undefined;
                          const pickCard = pick ? bundle.cards[pick.id] : undefined;
                          return (
                            <li className={`ins${pick ? ' ins-card' : ''}`} data-tone={item.tone} data-hue={analysisHue++ % HUE_COUNT} key={`${section.id}-${i}`}>
                              {pick ? <div className={`ins-art mini${pick.reversed ? ' is-rev' : ''}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: face(pick.id, d.deck as string) }} /> : null}
                              {item.tag ? <span className="ins-tag">{item.tag}</span> : null}
                              {pick && pickCard ? (
                                <div className="ins-name">
                                  <h4 className="h3">{pickCard.name}</h4>
                                  <span className={`badge${pick.reversed ? ' rev' : ''}`}>{pick.reversed ? t('reversed') : t('upright')}</span>
                                </div>
                              ) : null}
                              {pick && pickCard ? (
                                <ul className="kw-list">
                                  {(pick.reversed ? pickCard.keywords_reversed : pickCard.keywords_upright).slice(0, 4).map((word) => <li className={`kw${pick.reversed ? ' rev' : ''}`} key={word}>{word}</li>)}
                                </ul>
                              ) : null}
                              <p>{item.text}</p>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                  {d.analysis.data.source === 'analysis' ? <p className="hint an-note">{d.analysis.data.note}</p> : null}
                </>
              ) : (
                <button type="button" className="btn btn-secondary an-btn" onClick={() => void showAnalysis()} disabled={d.analysis.status === 'loading'}>{t('analysis')}</button>
              )}
            </div>

            <Reveal className="reading-foot">
              <Link className="link-chev" href="/history">{t('viewHistory')}{CHEV}</Link>
              <p className="note">{t('note')}</p>
              <Disclaimer locale={locale} showMindNote={d.topic === 'mind'} />
            </Reveal>
          </>
        ) : null}
      </div>

      {(d.phase === 'loading' || d.analysis.status === 'loading') && typeof document !== 'undefined'
        ? createPortal(
            <div className="preloader" role="status" aria-live="polite">
              <div className="orbit" aria-hidden="true"><span className="core" /><span className="ring r1"><i /></span><span className="ring r2"><i /></span></div>
              <p>{t('loader')}</p>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
