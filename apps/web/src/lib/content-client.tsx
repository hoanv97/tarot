'use client';

import type { Locale } from '@miu/tarot-core';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { cardFaceSvg } from '@/components/CardArt';
import { EMPTY_PATCH, applyContent, type Configured, type ContentPatch } from './content-patch';

const ContentContext = createContext<ContentPatch>(EMPTY_PATCH);

/** Cấp phần nội dung đã cấu hình (do server đọc từ Supabase) cho các thành phần ở trình duyệt. */
export function ContentProvider({ patch, children }: { patch: ContentPatch; children: ReactNode }) {
  return <ContentContext.Provider value={patch}>{children}</ContentContext.Provider>;
}

export const useContentPatch = () => useContext(ContentContext);

/** Nội dung của một ngôn ngữ và bộ bài sau khi gộp cấu hình; không có cấu hình thì y hệt bản đóng gói sẵn. */
export const useConfigured = (locale: Locale, deck = 'rws'): Configured => {
  const patch = useContext(ContentContext);
  return useMemo(() => applyContent(locale, deck, patch), [locale, deck, patch]);
};

/** Hàm vẽ mặt lá bài: dùng ảnh đã tải lên nếu có, không thì hình vẽ mặc định. */
export const useCardFace = (locale: Locale) => {
  const patch = useContext(ContentContext);
  return useMemo(() => (id: string, deck: string): string => {
    const configured = applyContent(locale, deck, patch);
    return cardFaceSvg(id, deck, locale, { name: configured.bundle.cards[id]?.name, image: configured.images[id] });
  }, [locale, patch]);
};
