/** Bộ nhớ đệm đơn giản có hạn dùng và giới hạn số phần tử (xóa phần tử cũ nhất). */
export const createCache = <T>(options: { maxEntries: number; ttlMs: number; now?: () => number }) => {
  const now = options.now ?? Date.now;
  const store = new Map<string, { value: T; expires: number }>();
  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expires <= now()) { store.delete(key); return undefined; }
      return entry.value;
    },
    set(key: string, value: T): void {
      store.delete(key);
      store.set(key, { value, expires: now() + options.ttlMs });
      while (store.size > options.maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest === undefined) break;
        store.delete(oldest);
      }
    },
    get size() { return store.size; }
  };
};
