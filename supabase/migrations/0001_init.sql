-- Miu Tarot: schema ban đầu.
-- Nội dung (lá bài, luật) là dữ liệu công khai, chỉ quản trị viên mới được sửa.
-- Dữ liệu người dùng (hồ sơ, lịch sử rút bài) chỉ chủ sở hữu xem được.

-- ---------- Nội dung ----------
create table public.cards (
  id          text primary key,
  arcana      text not null check (arcana in ('major', 'minor')),
  suit        text check (suit in ('wands', 'cups', 'swords', 'pentacles')),
  rank        text,
  number      integer not null,
  numerology  integer check (numerology between 0 and 9),
  element     text not null check (element in ('fire', 'water', 'air', 'earth')),
  sort_order  integer not null
);

create table public.card_translations (
  card_id            text not null references public.cards (id) on delete cascade,
  locale             text not null check (locale in ('vi', 'en')),
  name               text not null,
  keywords_upright   text[],
  keywords_reversed  text[],
  meaning_upright    text,
  meaning_reversed   text,
  -- { "love": {"upright": "...", "reversed": "..."}, "career": {...}, "study": {...}, "finance": {...}, "mind": {...} }
  topics             jsonb not null default '{}'::jsonb,
  symbolism          text,
  primary key (card_id, locale)
);

create table public.rules (
  id               text primary key check (id ~ '^[A-Z0-9][A-Z0-9-]*$'),
  sort_order       integer not null,                 -- dùng làm thứ tự khi bằng độ ưu tiên
  category         text not null,
  priority         integer not null check (priority between 0 and 100),
  exclusive_group  text,
  tone             text not null check (tone in ('positive', 'neutral', 'caution')),
  enabled          boolean not null default true,
  spreads          text[] not null check (spreads <@ array['1', '3', '3s']::text[] and cardinality(spreads) > 0),
  when_json        jsonb not null,                   -- cây điều kiện, xem docs/spread-rules.md
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id) on delete set null
);

create table public.rule_translations (
  rule_id     text not null references public.rules (id) on delete cascade,
  locale      text not null check (locale in ('vi', 'en')),
  text        text not null,
  topic_text  jsonb not null default '{}'::jsonb,    -- { "love": "...", "career": "..." }
  primary key (rule_id, locale)
);

create table public.settings (
  key    text primary key,
  value  jsonb not null
);

-- ---------- Người dùng ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'user' check (role in ('user', 'admin')),
  locale      text not null default 'vi' check (locale in ('vi', 'en')),
  created_at  timestamptz not null default now()
);

create table public.readings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  spread      text not null check (spread in ('1', '3', '3s')),
  topic       text not null check (topic in ('love', 'career', 'study', 'finance', 'mind')),
  question    text check (char_length(question) <= 200),
  cards       jsonb not null,                        -- [{ "id": "fool", "reversed": false }, ...]
  locale      text not null default 'vi',
  created_at  timestamptz not null default now()
);
create index readings_user_created_idx on public.readings (user_id, created_at desc);
create index rules_sort_idx on public.rules (sort_order);

-- ---------- Hàm và trigger ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_rule()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger rules_touch
  before update on public.rules
  for each row execute function public.touch_rule();

-- ---------- Row Level Security ----------
alter table public.cards              enable row level security;
alter table public.card_translations  enable row level security;
alter table public.rules              enable row level security;
alter table public.rule_translations  enable row level security;
alter table public.settings           enable row level security;
alter table public.profiles           enable row level security;
alter table public.readings           enable row level security;

-- Nội dung: ai cũng đọc được; chỉ quản trị viên ghi được.
do $$
declare t text;
begin
  foreach t in array array['cards', 'card_translations', 'rules', 'rule_translations', 'settings'] loop
    execute format('create policy "%1$s_read" on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('create policy "%1$s_admin_insert" on public.%1$s for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "%1$s_admin_update" on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "%1$s_admin_delete" on public.%1$s for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- Hồ sơ: xem hồ sơ của mình (quản trị viên xem được tất cả); chỉ được đổi locale, không tự nâng quyền.
create policy "profiles_read_own" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- Lịch sử rút bài: chỉ chủ sở hữu.
create policy "readings_read_own"   on public.readings for select to authenticated using (user_id = auth.uid());
create policy "readings_insert_own" on public.readings for insert to authenticated with check (user_id = auth.uid());
create policy "readings_delete_own" on public.readings for delete to authenticated using (user_id = auth.uid());

-- Quyền ở mức bảng (RLS vẫn áp dụng bên trên).
revoke all on public.profiles, public.readings from anon;
