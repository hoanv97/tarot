import type { Locale } from '@miu/tarot-core';
import en from './defaults/en.json';
import vi from './defaults/vi.json';
import { LEGAL_DOCS } from './legal-content';

/** Nội dung site mặc định, dùng khi database chưa có hàng tương ứng: chữ trang chủ, câu hỏi gợi ý và văn bản pháp lý. */
const DEFAULTS = { vi, en } as const;

export const siteFallback = (key: string, locale: Locale): unknown => {
  switch (key) {
    case 'home': return DEFAULTS[locale].home;
    case 'samples': return DEFAULTS[locale].samples;
    case 'privacy': return LEGAL_DOCS[locale].privacy;
    case 'terms': return LEGAL_DOCS[locale].terms;
    default: return undefined;
  }
};

/** Phần messages của giao diện web lấy từ nội dung mặc định (gộp vào messages của next-intl). */
export const siteDefaultMessages = (locale: Locale): { home: unknown; draw: { samples: unknown } } =>
  ({ home: DEFAULTS[locale].home, draw: { samples: DEFAULTS[locale].samples } });
