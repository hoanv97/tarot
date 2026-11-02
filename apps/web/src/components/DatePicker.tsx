'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  locale: string;
  placeholder: string;
  todayLabel: string;
  clearLabel: string;
  prevLabel: string;
  nextLabel: string;
  min?: string;
  max?: string;
  align?: 'start' | 'end';
};

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (v: string) => { const [y, m, d] = v.split('-').map(Number); return new Date(y as number, (m as number) - 1, d as number); };
const chevron = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

/** Lịch chọn ngày theo giao diện của trang (thay cho lịch mặc định của trình duyệt). Giá trị dạng YYYY-MM-DD. */
export function DatePicker({ value, onChange, label, locale, placeholder, todayLabel, clearLabel, prevLabel, nextLabel, min, max, align = 'start' }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const base = value ? fromKey(value) : new Date(); return { y: base.getFullYear(), m: base.getMonth() }; });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const mondayFirst = locale !== 'en';

  const monthFmt = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }), [locale]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }), [locale]);
  const fullFmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'full' }), [locale]);
  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2026, 0, (mondayFirst ? 5 : 4) + i)));
  }, [locale, mondayFirst]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + (mondayFirst ? 6 : 0)) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - offset + i));
  }, [view, mondayFirst]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = () => {
    if (!open) { const base = value ? fromKey(value) : new Date(); setView({ y: base.getFullYear(), m: base.getMonth() }); }
    setOpen(!open);
  };
  const shift = (delta: number) => setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const pick = (key: string) => { onChange(key); setOpen(false); trigger.current?.focus(); };
  const todayKey = toKey(new Date());
  const title = monthFmt.format(new Date(view.y, view.m, 1));
  const disabled = (key: string) => Boolean((min && key < min) || (max && key > max));

  return (
    <div className="dp" ref={root}>
      <button ref={trigger} type="button" className={`dp-trigger${value ? ' has-value' : ''}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-pop`} onClick={toggle}>
        <span className="dp-label">{label}</span>
        <span className="dp-value">{value ? dayFmt.format(fromKey(value)) : placeholder}</span>
        <svg className="dp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
      </button>
      {open ? (
        <div className="dp-pop" id={`${id}-pop`} role="dialog" aria-label={label} data-align={align}>
          <div className="dp-head">
            <button type="button" className="dp-nav" aria-label={prevLabel} onClick={() => shift(-1)}>{chevron('M15 6l-6 6 6 6')}</button>
            <p className="dp-title" aria-live="polite">{title.charAt(0).toUpperCase() + title.slice(1)}</p>
            <button type="button" className="dp-nav" aria-label={nextLabel} onClick={() => shift(1)}>{chevron('M9 6l6 6-6 6')}</button>
          </div>
          <div className="dp-grid" role="grid" aria-label={title}>
            {weekdays.map((w) => <span className="dp-wd" key={w} role="columnheader">{w}</span>)}
            {cells.map((d) => {
              const key = toKey(d);
              const outside = d.getMonth() !== view.m;
              return (
                <button key={key} type="button" role="gridcell" className={`dp-day${outside ? ' is-out' : ''}${key === todayKey ? ' is-today' : ''}`}
                  aria-pressed={key === value} aria-current={key === todayKey ? 'date' : undefined} aria-label={fullFmt.format(d)} disabled={disabled(key)} onClick={() => pick(key)}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="dp-foot">
            <button type="button" className="dp-link" onClick={() => { onChange(''); setOpen(false); trigger.current?.focus(); }} disabled={!value}>{clearLabel}</button>
            <button type="button" className="dp-link" onClick={() => pick(todayKey)} disabled={disabled(todayKey)}>{todayLabel}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
