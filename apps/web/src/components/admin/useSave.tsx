'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import type { ActionResult } from '@/lib/admin/actions';

/** Chạy một server action, giữ trạng thái đang lưu và thông báo kết quả (kèm danh sách lỗi chi tiết nếu có). */
export const useSave = () => {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const run = (action: () => Promise<ActionResult>, onDone?: () => void) => {
    setResult(null);
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) onDone?.();
    });
  };
  return { pending, result, run, clear: () => setResult(null) };
};

export function SaveMessage({ result }: { result: ActionResult | null }) {
  const t = useTranslations('admin');
  if (!result) return null;
  if (result.ok) return <p className="form-msg" role="status">{t('saved')}</p>;
  return (
    <div className="form-msg error" role="alert">
      <p>{t('blocked', { reason: result.error })}</p>
      {result.issues?.length ? <ul className="admin-issues">{result.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
    </div>
  );
}

/** Nút cần xác nhận bằng hộp thoại của trình duyệt trước khi chạy (xóa, khôi phục mặc định). */
export function ConfirmButton({ label, message, onConfirm, disabled, danger = true }: { label: string; message: string; onConfirm: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" className={danger ? 'btn btn-secondary admin-danger' : 'btn btn-secondary'} disabled={disabled} onClick={() => { if (window.confirm(message)) onConfirm(); }}>
      {label}
    </button>
  );
}
