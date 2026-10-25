# Kiến trúc

```
Trình duyệt ─ Next.js (SSR/SSG, next-intl) ─ Supabase (Auth, Postgres + RLS)
     │  rút bài + luật tầng 2 chạy ngay ở client bằng @miu/tarot-core
     └─ (đã đăng nhập) Bearer token ─► Express /v1/interpret ─► Claude
                                         └ xác thực token qua Supabase /auth/v1/user
```

- **Express chỉ lo AI.** Máy chủ tự tính lại nhận xét tầng 2 từ lá bài (client chỉ gửi lá, kiểu trải, chủ đề, ngôn ngữ, câu hỏi), nên client không thể chèn nội dung.
- Giới hạn tần suất theo người dùng (5/phút, 40/ngày mặc định) và theo IP; cache kết quả 1 giờ (bộ nhớ trong; nhiều instance thì chuyển sang Redis).
- Supabase: RLS cho phép ai cũng đọc nội dung, chỉ `is_admin()` được ghi; `readings` riêng từng người; không thể tự nâng quyền trong `profiles`.
- Các package xuất mã nguồn TS (`main: src/index.ts`); web dùng `transpilePackages`, API đóng gói bằng tsup.
- Web đọc nội dung đã cấu hình (lá bài, ảnh, bộ bài, kiểu trải, chữ trang chủ, pháp lý, phân tích, luật) từ Supabase ở máy chủ, cache theo tag; thiếu thì dùng JSON trong `tarot-data`.
- **Trang quản trị là ứng dụng riêng** (`apps/admin`, cổng 3001). Hai ứng dụng chỉ chia sẻ Supabase và các package; không import mã của nhau. Sau khi admin lưu, `apps/admin` gọi `POST /api/revalidate` của web (có `REVALIDATE_SECRET`) để web làm mới cache; không gọi được thì web tự làm mới sau vài phút. Khóa `service_role` chỉ ở `apps/api`.
- Admin dùng chung cookie đăng nhập với web khi chạy trên cùng tên miền (ví dụ localhost); khi triển khai ở hai tên miền khác nhau thì đăng nhập riêng. Thêm origin của admin vào `CORS_ORIGINS` của api.
