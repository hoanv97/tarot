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
- Luật tầng 2 hiện nạp từ gói `tarot-data`; bảng `rules` trong Supabase phục vụ trang admin. Việc web đọc luật từ Supabase thay vì từ gói chưa được nối.
