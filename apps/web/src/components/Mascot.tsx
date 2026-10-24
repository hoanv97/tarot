'use client';

import { mascotSVG } from '@/lib/art/draw';
import type { Mood } from '@/lib/use-mood';

type Props = { mood?: Mood; nonce?: number; className?: string; onPress?: () => void; pressLabel?: string };

/**
 * Miu, cô mèo phù thủy. `mood` thêm lớp is-happy / is-wow / is-think để chạy hoạt ảnh.
 * Có `onPress` thì Miu là một nút bấm (chạm để nghe Miu nói).
 */
export function Mascot({ mood = null, nonce = 0, className = '', onPress, pressLabel }: Props) {
  const cls = `mascot ${className} ${mood ? `is-${mood}` : ''}`.trim();
  const key = mood ? `${mood}-${nonce}` : 'idle';
  if (onPress) {
    return (
      <div key={key} className={cls}>
        <button className="mascot-btn" type="button" aria-label={pressLabel} onClick={onPress} dangerouslySetInnerHTML={{ __html: mascotSVG() }} />
      </div>
    );
  }
  return <div key={key} className={cls} aria-hidden="true" dangerouslySetInnerHTML={{ __html: mascotSVG() }} />;
}
