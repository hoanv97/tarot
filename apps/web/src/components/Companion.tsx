'use client';

import { useEffect } from 'react';
import { initCompanion } from '@/lib/companion';

/** Cú Mơ, linh vật bay quanh trang. Bật/tắt bằng nút trên thanh điều hướng. */
export function Companion() {
  useEffect(() => initCompanion(), []);
  return null;
}
