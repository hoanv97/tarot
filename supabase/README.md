# Supabase

- `migrations/0001_init.sql`: bảng, trigger tạo hồ sơ khi đăng ký, và chính sách RLS.
- `migrations/0002_content.sql`: bộ bài (`decks`, `deck_cards`), kiểu trải (`spreads`), chữ trên site (`site_content`), dữ liệu phân tích (`analysis_sections`); `card_translations` thêm `deck_id` và `miu`.
- `migrations/0003_storage.sql`: bucket công khai `card-images` cho ảnh lá bài (chỉ admin ghi).
- `migrations/0004_admin.sql`: `admin_audit_log` và trigger chặn admin tự bỏ quyền của chính mình.
- `local/shim.sql`: chỉ để chạy trên PostgreSQL thuần (xem bên dưới), không chạy trên Supabase thật.
- `seed.sql`: 78 lá, bản dịch `vi` (đủ) và `en` (mới có tên), 78 luật, câu của luật (`vi`), cài đặt chọn nhận xét.
  Được tạo từ `packages/tarot-data`; khi sửa dữ liệu trong gói đó, hãy cập nhật lại seed hoặc sửa trực tiếp qua trang admin.

## Dùng với Supabase CLI

```bash
supabase init            # nếu chưa có supabase/config.toml
supabase start           # chạy Postgres + Auth cục bộ
supabase db reset        # áp dụng migrations rồi chạy seed.sql
```

## Tạo quản trị viên đầu tiên

Đăng nhập một lần bằng email trên web để có hồ sơ, rồi chạy trong SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'ban@example.com');
```

Quyền quản trị được kiểm tra ở **phía cơ sở dữ liệu** (RLS với `public.is_admin()`), nên chỉ ẩn nút trên giao diện là chưa đủ và cũng không cần thiết.

## Nạp nội dung vào các bảng mới

Sau khi chạy `seed.sql`, nạp bộ bài, kiểu trải, chữ trang chủ và dữ liệu phân tích từ `@miu/tarot-data`:

```bash
pnpm --filter @miu/api seed          # chỉ thêm phần còn thiếu, không ghi đè phần admin đã sửa
pnpm --filter @miu/api seed -- --force
```

Cần `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trong `.env` ở thư mục gốc (khóa này chỉ dành cho máy chạy script và `apps/api`, tuyệt đối không đưa vào `apps/web`).
Nội dung privacy/terms chưa seed: web dùng bản trong `lib/legal-content.ts` cho đến khi admin lưu bản riêng.

## Chạy trên PostgreSQL thuần (không có Supabase)

Dùng để thử bảng và RLS ở máy local. Không có đăng nhập, Storage hay API thật.

```bash
psql "$DATABASE_URL" -f supabase/local/shim.sql
for f in supabase/migrations/*.sql supabase/seed.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

`shim.sql` tạo vai trò `anon`/`authenticated`/`service_role`, bảng `auth.users`, hàm `auth.uid()` (đọc từ `request.jwt.claim.sub`) và bảng `storage.*` tối thiểu.
