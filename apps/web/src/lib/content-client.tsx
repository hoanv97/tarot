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
  return useMemo(() => {
    // applyContent khá nặng (sao chép cả bộ 78 lá); mỗi bộ chỉ gộp một lần rồi dùng lại cho mọi lá.
    const byDeck = new Map<string, Configured>();
    return (id: string, deck: string): string => {
      let configured = byDeck.get(deck);
      if (!configured) { configured = applyContent(locale, deck, patch); byDeck.set(deck, configured); }
      return cardFaceSvg(id, deck, locale, { name: configured.bundle.cards[id]?.name, image: configured.images[id] });
    };
  }, [locale, patch]);
};
