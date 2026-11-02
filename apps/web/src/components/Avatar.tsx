/** Ảnh đại diện; chưa có ảnh thì hiện chữ cái đầu của tên. */
export function Avatar({ name, src, size }: { name: string; src?: string | undefined; size?: 'sm' | 'xl' }) {
  return (
    <span className={`avatar${size ? ` ${size}` : ''}`} aria-hidden="true">
      {src ? <img src={src} alt="" width={96} height={96} decoding="async" /> : (name.trim().charAt(0) || '?').toUpperCase()}
    </span>
  );
}
