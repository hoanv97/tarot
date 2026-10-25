import type { Locale } from '@miu/tarot-core';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { LEGAL_DOCS } from './legal-content';

/** Nội dung site mặc định (khi database chưa có hàng tương ứng): messages của giao diện và văn bản pháp lý trong code. */
const MESSAGES = { vi, en } as const;

export const siteFallback = (key: string, locale: Locale): unknown => {
  switch (key) {
    case 'home': return MESSAGES[locale].home;
    case 'samples': return MESSAGES[locale].draw.samples;
    case 'privacy': return LEGAL_DOCS[locale].privacy;
    case 'terms': return LEGAL_DOCS[locale].terms;
    default: return undefined;
  }
};
