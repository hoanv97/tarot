import type { ReactNode } from 'react';
import { ContentProvider } from '@/lib/content-client';
import { getContentPatch } from '@/lib/content';

/** Bao quanh các trang cần nội dung đã cấu hình (rút bài, chú giải, lịch sử). */
export async function ContentScope({ children }: { children: ReactNode }) {
  return <ContentProvider patch={await getContentPatch()}>{children}</ContentProvider>;
}
