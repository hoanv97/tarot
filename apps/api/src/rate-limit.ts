export type Limit = { windowMs: number; max: number };
export type RateDecision = { allowed: boolean; retryAfterSec: number };

/** Giới hạn theo cửa sổ trượt, lưu trong bộ nhớ (một tiến trình). Nhiều máy chủ thì chuyển sang Redis hoặc bảng Supabase. */
export const createRateLimiter = (limits: Limit[], now: () => number = Date.now) => {
  const hits = new Map<string, number[]>();
  const longest = Math.max(...limits.map((l) => l.windowMs));
  return {
    consume(key: string): RateDecision {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((time) => t - time < longest);
      for (const limit of limits) {
        const inWindow = recent.filter((time) => t - time < limit.windowMs);
        if (inWindow.length >= limit.max) {
          const oldest = inWindow[0] ?? t;
          hits.set(key, recent);
          return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + limit.windowMs - t) / 1000)) };
        }
      }
      recent.push(t);
      hits.set(key, recent);
      return { allowed: true, retryAfterSec: 0 };
    }
  };
};
