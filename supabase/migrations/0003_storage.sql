-- Ảnh lá bài: bucket công khai (đọc không cần đăng nhập), chỉ quản trị viên được tải lên, sửa, xóa.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-images', 'card-images', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "card_images_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'card-images');
create policy "card_images_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'card-images' and public.is_admin());
create policy "card_images_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'card-images' and public.is_admin()) with check (bucket_id = 'card-images' and public.is_admin());
create policy "card_images_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'card-images' and public.is_admin());
