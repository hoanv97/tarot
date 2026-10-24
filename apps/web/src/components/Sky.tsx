'use client';

import { useEffect, useState } from 'react';
import { starPath } from '@/lib/art/draw';

type Star = { left: number; top: number; size: number; o: number; t: number; dl: number };
type Spark = { left: number; top: number; s: number; o: number; t: number; dl: number; color: string };

/** Bầu trời sao nền. Vị trí ngẫu nhiên nên chỉ tạo ở client để tránh lệch khi hydrate. */
export function Sky() {
  const [sky, setSky] = useState<{ stars: Star[]; sparks: Spark[] } | null>(null);
  useEffect(() => {
    const r = Math.random;
    setSky({
      stars: Array.from({ length: 46 }, () => ({ left: r() * 100, top: r() * 100, size: 1 + r() * 2, o: 0.25 + r() * 0.45, t: 3 + r() * 4, dl: -r() * 6 })),
      sparks: Array.from({ length: 9 }, () => ({ left: r() * 100, top: r() * 100, s: 8 + r() * 10, o: 0.18 + r() * 0.25, t: 4 + r() * 4, dl: -r() * 6, color: r() > 0.5 ? '#C4B5FD' : '#F9A8D4' }))
    });
  }, []);
  return (
    <div className="sky" aria-hidden="true">
      {sky?.stars.map((s, i) => (
        <span key={`s${i}`} className="star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, ['--o' as string]: s.o, ['--t' as string]: `${s.t}s`, ['--dl' as string]: `${s.dl}s` }} />
      ))}
      {sky?.sparks.map((s, i) => (
        <svg key={`k${i}`} viewBox="0 0 20 20" className="spark" style={{ left: `${s.left}%`, top: `${s.top}%`, ['--s' as string]: `${s.s}px`, ['--o' as string]: s.o, ['--t' as string]: `${s.t}s`, ['--dl' as string]: `${s.dl}s` }}>
          <path d={starPath(10, 10, 10, 2.4, 4)} fill={s.color} />
        </svg>
      ))}
    </div>
  );
}
