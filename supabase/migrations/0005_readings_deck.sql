-- Ghi lại bộ bài của mỗi lần rút để trang admin thống kê "các bộ bài đã dùng".
alter table public.readings add column deck text check (deck is null or deck ~ '^[a-z0-9][a-z0-9-]*$');

-- Thống kê lịch sử rút bài theo người dùng cho api (service_role). Không mở cho anon/authenticated.
create or replace function public.admin_reading_stats(user_ids uuid[])
returns table (user_id uuid, reading_count bigint, decks text[])
language sql
stable
security definer
set search_path = public
as $$
  select r.user_id, count(*), coalesce(array_agg(distinct r.deck) filter (where r.deck is not null), '{}')
  from public.readings r
  where r.user_id = any (user_ids)
  group by r.user_id;
$$;

revoke all on function public.admin_reading_stats(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_reading_stats(uuid[]) to service_role;
