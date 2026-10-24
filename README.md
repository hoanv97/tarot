# Miu Tarot (monorepo)

Web rút bài Tarot tiếng Việt / English. Next.js (giao diện) + Supabase (dữ liệu, đăng nhập) + Express (chỉ lo logic AI). Nội dung mang tính tham khảo và giải trí.

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `apps/web` | Next.js 15 (App Router, next-intl vi/en, Supabase SSR) |
| `apps/api` | Express: `POST /v1/interpret`, `GET /health`. Không giữ dữ liệu, chỉ xác thực token Supabase + gọi Claude |
| `packages/tarot-core` | Bộ máy luật tầng 2, rút bài, kiểm tra luật (thuần TypeScript, không phụ thuộc framework) |
| `packages/tarot-data` | Dữ liệu 78 lá + luật: `structure/` (không phụ thuộc ngôn ngữ) và `locales/<vi|en>/` |
| `packages/content-policy` | Bộ lọc nội dung (y tế, tài chính, tiên đoán tuyệt đối, tự hại), quy tắc an toàn cho LLM, phát hiện khủng hoảng |
| `supabase/` | Migration, seed, hướng dẫn tạo quản trị viên đầu tiên |
| `docs/` | `compliance.md`, `i18n.md`, `architecture.md` |

## Cài đặt dự án

### 1. Yêu cầu

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | 20 trở lên (đã chạy thử trên 24) | `node -v` |
| pnpm | 12.x (khai báo trong `packageManager`) | Bật bằng `corepack enable`, hoặc `npm i -g pnpm` |
| Tài khoản Supabase | Gói miễn phí là đủ | Hoặc Supabase CLI + Docker nếu muốn chạy cục bộ |
| Anthropic API key | Chỉ cần cho tính năng "Đọc kỹ hơn cùng Miu (AI)" | Không có key thì phần rút bài và kiến giải cơ bản vẫn chạy, nhưng `apps/api` sẽ không khởi động được vì thiếu biến bắt buộc |

### 2. Cài thư viện

```bash
pnpm install
```

Lệnh này cài cho cả monorepo (`apps/*` và `packages/*`). Các gói `@miu/*` được nối với nhau qua workspace, không cần build riêng.

### 3. Tạo cơ sở dữ liệu Supabase

Chọn một trong hai cách.

**Cách A: dùng dự án Supabase trên cloud**

1. Vào [supabase.com](https://supabase.com), tạo dự án mới.
2. Mở **SQL Editor**, chạy lần lượt nội dung của `supabase/migrations/0001_init.sql`, rồi `supabase/seed.sql`.
3. Lấy URL và anon key ở **Project Settings → API**. Ở **Authentication → URL Configuration**, thêm `http://localhost:3000` vào Site URL / Redirect URLs.

**Cách B: chạy cục bộ bằng Supabase CLI (cần Docker)**

```bash
supabase init            # nếu chưa có supabase/config.toml
supabase start           # chạy Postgres + Auth; in ra API URL và anon key
supabase db reset        # áp dụng migrations rồi chạy seed.sql
```

Chi tiết và cách tạo quản trị viên đầu tiên: `supabase/README.md`.

### 4. Cấu hình biến môi trường

Có **hai nơi** cần tạo file, vì Next.js chỉ đọc file `.env` nằm trong `apps/web`, còn `apps/api` đọc file `.env` ở thư mục gốc.

**a) `.env` ở thư mục gốc (cho `apps/api`)**

```bash
cp .env.example .env
```

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `SUPABASE_URL` | Có | URL dự án Supabase |
| `SUPABASE_ANON_KEY` | Có | Anon key, dùng để xác thực token người dùng |
| `ANTHROPIC_API_KEY` | Có | Key gọi Claude |
| `ANTHROPIC_MODEL` | Không | Mặc định `claude-sonnet-5-5` |
| `PORT` | Không | Mặc định `4000` |
| `CORS_ORIGINS` | Không | Các origin được gọi api, cách nhau bằng dấu phẩy. Mặc định `http://localhost:3000` |
| `RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_PER_DAY` | Không | Số lượt đọc AI tối đa của mỗi người dùng. Mặc định 5 và 40 |

**b) `apps/web/.env.local` (cho `apps/web`)**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Lưu ý: không đưa `ANTHROPIC_API_KEY` vào web. Hai file `.env` và `.env.local` đã nằm trong `.gitignore`.

### 5. Chạy dự án

```bash
pnpm dev
```

| Dịch vụ | Địa chỉ |
|---|---|
| Web (Next.js) | http://localhost:3000 |
| API (Express) | http://localhost:4000, kiểm tra bằng `GET /health` (trả `{"ok":true}`) |

Web có hai ngôn ngữ: tiếng Việt và English (nút chuyển ở thanh trên cùng).

Muốn chạy riêng từng phần:

```bash
pnpm --filter @miu/web dev
pnpm --filter @miu/api dev
```

### 6. Tạo quản trị viên đầu tiên (tùy chọn)

Đăng nhập một lần bằng email trên web, rồi chạy trong SQL editor của Supabase:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'ban@example.com');
```

### 7. Lệnh thường dùng

| Lệnh | Việc làm |
|---|---|
| `pnpm test` | Chạy test của `tarot-core`, `content-policy`, `apps/api` |
| `pnpm typecheck` | Kiểm tra kiểu TypeScript toàn monorepo |
| `pnpm build` | Build web (`.next/`) và api (`apps/api/dist/`) |
| `pnpm --filter @miu/api start` | Chạy bản api đã build. Cần tự cấp biến môi trường (file `.env` không tự được nạp) |

### Gặp lỗi thường gặp

- **`Thiếu biến môi trường ...` khi chạy api:** chưa tạo `.env` ở thư mục gốc, hoặc thiếu một biến bắt buộc ở bảng trên.
- **Web không đăng nhập được hoặc báo thiếu Supabase:** chưa tạo `apps/web/.env.local`. Sau khi sửa file này, hãy khởi động lại `pnpm dev`.
- **Nút "Đọc kỹ hơn cùng Miu" báo lỗi kết nối:** api chưa chạy, hoặc `NEXT_PUBLIC_API_URL` sai, hoặc origin của web chưa có trong `CORS_ORIGINS`.
- **Cổng 3000 hoặc 4000 đã bị chiếm:** đổi `PORT` (api) hoặc chạy web bằng `pnpm --filter @miu/web exec next dev -p 3001`, nhớ cập nhật `NEXT_PUBLIC_SITE_URL` và `CORS_ORIGINS` cho khớp.

### Bản prototype `tarot.html`

File `tarot.html` ở thư mục gốc là bản giao diện tĩnh, một file, dùng để thử nhanh. Mở trực tiếp trong trình duyệt, không cần cài đặt gì. Bản chính thức nằm ở `apps/web`.

## Trạng thái kiểm chứng

Đã chạy được: test của `tarot-core`, `content-policy`, các dịch vụ trong `apps/api`; SQL và RLS trên Postgres 16.
**Giao diện web** đã được chạy thử trong Chromium (không qua Next.js): trang chủ, rút bài (xáo, chọn, lật, kiến giải), chú giải, lịch sử, linh vật Cú Mơ, tiếng Việt/English, mobile. Phần còn lại của `apps/web` (middleware, Supabase, route Next) và phần nối Express (`app.ts`, `server.ts`) **chưa build/chạy**, vì môi trường dựng không cài được gói npm. Repo đã có `pnpm-lock.yaml`. Lần đầu hãy chạy `pnpm install && pnpm test && pnpm typecheck && pnpm build` và sửa lỗi nếu có (hiện `pnpm typecheck` của web còn vài cảnh báo so sánh `phase` trong `DrawClient.tsx`).

## Việc còn lại

- Chính sách quyền riêng tư, xác nhận độ tuổi 18+ và xếp hạng nội dung trên cửa hàng ứng dụng.
- Dịch tiếng Anh cho nội dung lá bài và luật (hiện chỉ có tên lá + nhãn giao diện; phần còn lại dùng tiếng Việt).
- Phản hồi AI dạng streaming, ứng dụng di động (Expo). Trang admin mới sửa được luật tầng 2 (bản mẫu còn quản lý người dùng và nội dung lá bài).
