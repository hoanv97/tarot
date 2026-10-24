/** localStorage an toàn: có thể bị chặn hoặc trống, nên luôn có bộ nhớ dự phòng. */
const memory: Record<string, unknown> = {};

export const storeGet = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch { /* bị chặn hoặc hỏng */ }
  return key in memory ? (memory[key] as T) : fallback;
};

export const storeSet = (key: string, value: unknown): void => {
  memory[key] = value;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* bỏ qua */ }
};

export const KEYS = {
  history: 'miu-tarot.history.v1',
  deck: 'miu-tarot.deck.pref',
  theme: 'miu-tarot.theme',
  companion: 'miu-tarot.companion'
} as const;

export type HistoryEntry = {
  id: string;
  at: number;
  spread: '1' | '3' | '3s';
  deck: string;
  topic: string;
  question: string;
  locale: string;
  cards: { id: string; reversed: boolean }[];
};

export const getHistory = (): HistoryEntry[] => {
  const list = storeGet<unknown>(KEYS.history, []);
  return Array.isArray(list) ? (list as HistoryEntry[]) : [];
};
export const saveHistory = (list: HistoryEntry[]): void => storeSet(KEYS.history, list.slice(0, 50));
export const addHistory = (entry: HistoryEntry): void => saveHistory([entry, ...getHistory()]);
