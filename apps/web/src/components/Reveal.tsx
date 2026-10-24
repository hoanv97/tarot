'use client';

import { createElement, useEffect, useRef, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { prefersReducedMotion } from '@/lib/motion';

type Props = { children?: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'article' | 'h1' | 'p' | 'aside'; style?: CSSProperties };

const useReveal = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) { el.classList.add('in'); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
};

/** Hiện dần khi cuộn tới (lớp .reveal + .in trong globals.css). */
export function Reveal({ children, className = '', delay = 0, as = 'div', style }: Props) {
  const ref = useReveal<HTMLElement>();
  return createElement(as, { ref, className: `reveal ${className}`.trim(), style: { '--d': `${delay}ms`, ...style } as CSSProperties }, children);
}

/** Liên kết cũng hiện dần khi cuộn tới (dùng cho thẻ bộ bài). */
export function RevealLink({ className = '', delay = 0, ...rest }: ComponentProps<typeof Link> & { delay?: number }) {
  const ref = useReveal<HTMLAnchorElement>();
  return <Link ref={ref} className={`reveal ${className}`.trim()} style={{ '--d': `${delay}ms` } as CSSProperties} {...rest} />;
}
