# Miu Tarot (monorepo)

Web rút bài Tarot tiếng Việt / English. Next.js (giao diện) + Supabase (dữ liệu, đăng nhập) + Express (dự phòng cho AI, hiện chưa được web dùng). Nội dung mang tính tham khảo và giải trí.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `apps/web` | Next.js 15 (App Router, next-intl vi/en, Supabase SSR) |
| `apps/api` | Express: `POST /v1/interpret`, `GET /health`. Hiện web KHÔNG gọi (Phân tích chuyên sâu chạy từ dữ liệu có sẵn, xem `docs/analysis.md`); giữ lại để dùng sau nếu muốn thêm AI |
| `packages/tarot-core` | Bộ máy luật tầng 2, rút bài, kiểm tra luật (thuần TypeScript, không phụ thuộc framework) |
| `packages/tarot-data` | Dữ liệu 78 lá + luật: `structure/` (không phụ thuộc ngôn ngữ) và `locales/<vi|en>/` |
| `packages/content-policy` | Bộ lọc nội dung (y tế, tài chính, tiên đoán tuyệt đối, tự hại), quy tắc an toàn cho LLM, phát hiện khủng hoảng |
| `supabase/` | Migration, seed, hướng dẫn tạo quản trị viên đầu tiên |
| `docs/` | `compliance.md`, `i18n.md`, `architecture.md` |

## Chạy thử

```bash
cp .env.example .env            # điền Supabase + ANTHROPIC_API_KEY
pnpm install
pnpm test && pnpm typecheck
pnpm dev                        # web :3000, api :4000
```

Supabase: xem `supabase/README.md` (chạy `0001_init.sql`, rồi `seed.sql`).

## Trạng thái kiểm chứng

Đã chạy được: test của `tarot-core`, `content-policy`, các dịch vụ trong `apps/api`; SQL và RLS trên Postgres 16.
**Giao diện web** đã được chạy thử trong Chromium (không qua Next.js): trang chủ, rút bài (xáo, chọn, lật, kiến giải), chú giải, lịch sử, linh vật Cú Mơ, tiếng Việt/English, mobile. Phần còn lại của `apps/web` (middleware, Supabase, route Next) và phần nối Express (`app.ts`, `server.ts`) **chưa build/chạy**, vì môi trường dựng không cài được gói npm. Chưa có lockfile; phiên bản trong `package.json` là khoảng chưa kiểm chứng. Lần đầu hãy chạy `pnpm install && pnpm test && pnpm typecheck && pnpm build` và sửa lỗi nếu có.

## Việc còn lại

- Chính sách quyền riêng tư, xác nhận độ tuổi 18+ và xếp hạng nội dung trên cửa hàng ứng dụng.
- Dịch tiếng Anh cho nội dung lá bài và luật (hiện chỉ có tên lá + nhãn giao diện; phần còn lại dùng tiếng Việt).
- ứng dụng di động (Expo). Trang admin mới sửa được luật tầng 2 (bản mẫu còn quản lý người dùng và nội dung lá bài).
