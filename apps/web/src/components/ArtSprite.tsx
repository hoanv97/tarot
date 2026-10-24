import { spriteMarkup } from '@/lib/art/draw';

/** Định nghĩa dùng chung (gradient, mặt sau lá bài, ảnh Miu); render một lần ở layout. */
export function ArtSprite() {
  return <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: spriteMarkup() }} />;
}
