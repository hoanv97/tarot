'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type Mood = 'happy' | 'wow' | 'think' | null;

/** Cảm xúc tạm thời của linh vật: tự trở về bình thường sau ~2,8 giây. */
export const useMood = () => {
  const [mood, setMoodState] = useState<Mood>(null);
  const [nonce, setNonce] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const setMood = useCallback((next: Mood) => {
    if (timer.current) clearTimeout(timer.current);
    setNonce((n) => n + 1);
    setMoodState(next);
    if (next) timer.current = setTimeout(() => setMoodState(null), 2800);
  }, []);
  return { mood, setMood, nonce };
};
