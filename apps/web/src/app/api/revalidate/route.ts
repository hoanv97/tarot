import { CONTENT_TAGS } from '@miu/web-shared';
import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

const ALLOWED = new Set<string>(Object.values(CONTENT_TAGS));

const sameSecret = (given: string | null, expected: string): boolean => {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Trang quản trị (apps/admin) gọi vào đây sau khi lưu để web làm mới cache nội dung.
 * Chỉ nhận yêu cầu có đúng REVALIDATE_SECRET (dùng chung giữa hai ứng dụng) và chỉ làm mới các tag nội dung đã biết.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  if (!sameSecret(request.headers.get('x-revalidate-secret'), secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t): t is string => typeof t === 'string' && ALLOWED.has(t)) : [];
  if (tags.length === 0) return NextResponse.json({ error: 'invalid_tags' }, { status: 400 });
  for (const tag of tags) revalidateTag(tag);
  return NextResponse.json({ ok: true, tags });
}
