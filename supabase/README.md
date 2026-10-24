# Supabase

- `migrations/0001_init.sql`: bảng, trigger tạo hồ sơ khi đăng ký, và chính sách RLS.
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
