-- Nhật ký thao tác quản trị. Chỉ api (service_role) ghi; quản trị viên đọc được, không ai sửa hay xóa qua RLS.
create table public.admin_audit_log (
  id            bigint generated always as identity primary key,
  actor_id      uuid,                  -- không khóa ngoại để nhật ký còn nguyên khi tài khoản bị xóa
  actor_email   text,
  action        text not null check (action in ('user.delete', 'user.lock', 'user.unlock', 'role.grant', 'role.revoke')),
  target_id     uuid,
  target_email  text,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
create policy "admin_audit_log_read" on public.admin_audit_log for select to authenticated using (public.is_admin());

-- Quản trị viên không tự hạ quyền của chính mình (api cũng kiểm tra; đây là lớp bảo vệ ở cơ sở dữ liệu).
create or replace function public.prevent_self_demotion()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and new.role <> 'admin' and old.id = auth.uid() then
    raise exception 'Quản trị viên không thể tự bỏ quyền của chính mình' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_demotion
  before update of role on public.profiles
  for each row execute function public.prevent_self_demotion();
