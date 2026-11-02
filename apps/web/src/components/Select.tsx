'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

type Option = { value: string; label: string };
type Props = { value: string; onChange: (value: string) => void; options: readonly Option[]; placeholder: string; label: string };

/** Ô chọn theo giao diện của trang (danh sách mặc định của trình duyệt không đổi màu được). */
export function Select({ value, onChange, options, placeholder, label }: Props) {
  const all: readonly Option[] = [{ value: '', label: placeholder }, ...options];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = Math.max(0, all.findIndex((o) => o.value === value));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const show = () => { setActive(selected); setOpen(true); };
  const pick = (index: number) => { onChange(all[index]?.value ?? ''); setOpen(false); };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = all.length - 1;
    if (event.key === 'Escape') { if (open) { event.preventDefault(); setOpen(false); } return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) event.preventDefault(); else return;
    if (!open) return show();
    if (event.key === 'Enter' || event.key === ' ') return pick(active);
    setActive((a) => event.key === 'ArrowDown' ? Math.min(last, a + 1) : event.key === 'ArrowUp' ? Math.max(0, a - 1) : event.key === 'Home' ? 0 : last);
  };

  const current = all[selected];
  return (
    <div className="sel" ref={root}>
      <button type="button" className={`sel-trigger${value ? ' has-value' : ''}`} role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-o${active}` : undefined} onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        <span>{current?.label}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open ? (
        <ul className="sel-list" id={`${id}-list`} role="listbox" aria-label={label} ref={list}>
          {all.map((o, i) => (
            <li key={o.value || 'none'} id={`${id}-o${i}`} role="option" aria-selected={i === selected} className={`sel-opt${i === active ? ' is-active' : ''}${o.value ? '' : ' is-empty'}`}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(i)}>{o.label}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
