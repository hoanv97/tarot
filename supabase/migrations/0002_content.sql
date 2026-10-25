-- Nội dung có thể cấu hình từ trang admin: bộ bài, kiểu trải, chữ trên site, dữ liệu phân tích.
-- Quy ước chung: ai cũng đọc được, chỉ quản trị viên ghi được. Thiếu hàng nào thì web dùng JSON trong @miu/tarot-data.

-- ---------- Bộ bài ----------
create table public.decks (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  sort_order  integer not null default 0,
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

create table public.deck_translations (
  deck_id      text not null references public.decks (id) on delete cascade,
  locale       text not null check (locale in ('vi', 'en')),
  name         text not null,
  tag          text,
  description  text,
  voice        text,
  primary key (deck_id, locale)
);

-- Ảnh của từng lá trong từng bộ. image_url trỏ tới bucket card-images; để trống thì web vẽ hình mặc định.
create table public.deck_cards (
  deck_id     text not null references public.decks (id) on delete cascade,
  card_id     text not null references public.cards (id) on delete cascade,
  image_url   text check (image_url is null or image_url ~ '^https?://'),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,
  primary key (deck_id, card_id)
);

-- Nội dung lá bài nay theo từng bộ. Dữ liệu cũ thuộc bộ rws; bộ khác chưa có bản riêng thì dùng của rws.
insert into public.decks (id, sort_order) values ('rws', 0);

alter table public.card_translations add column deck_id text not null default 'rws' references public.decks (id) on delete cascade;
alter table public.card_translations add column miu text;  -- lời bình của Miu cho lá bài
alter table public.card_translations drop constraint card_translations_pkey;
alter table public.card_translations add primary key (deck_id, card_id, locale);

-- ---------- Kiểu trải bài ----------
create table public.spreads (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  card_count  integer not null check (card_count between 1 and 10),
  positions   text[] not null,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,
  check (cardinality(positions) = card_count)
);

create table public.spread_translations (
  spread_id  text not null references public.spreads (id) on delete cascade,
  locale     text not null check (locale in ('vi', 'en')),
  label      text not null,
  -- { "past": {"label": "Quá khứ", "prompt": "..."} }
  positions  jsonb not null default '{}'::jsonb,
  primary key (spread_id, locale)
);

-- ---------- Chữ trên site ----------
-- key: 'home' | 'samples' | 'privacy' | 'terms' ...; value: JSON theo từng loại nội dung.
create table public.site_content (
  key         text not null check (key ~ '^[a-z0-9][a-z0-9_.-]*$'),
  locale      text not null check (locale in ('vi', 'en')),
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,
  primary key (key, locale)
);

-- ---------- Dữ liệu Phân tích chuyên sâu ----------
-- Mỗi hàng là một phần của analysis.json: labels, safety, intents, lead, overview, positions,
-- cards, transitions, pairs, single_flow, closing; riêng card_tone lấy từ structure/analysis.json.
create table public.analysis_sections (
  locale      text not null check (locale in ('vi', 'en')),
  section     text not null check (section in ('labels', 'safety', 'intents', 'lead', 'overview', 'positions', 'cards', 'transitions', 'pairs', 'single_flow', 'closing', 'card_tone')),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,
  primary key (locale, section)
);

-- ---------- Ghi lại người sửa ----------
create or replace function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['decks', 'deck_cards', 'spreads', 'site_content', 'analysis_sections'] loop
    execute format('create trigger %1$s_touch before update on public.%1$s for each row execute function public.touch_row()', t);
  end loop;
end $$;

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['decks', 'deck_translations', 'deck_cards', 'spreads', 'spread_translations', 'site_content', 'analysis_sections'] loop
    execute format('alter table public.%1$s enable row level security', t);
    execute format('create policy "%1$s_read" on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('create policy "%1$s_admin_insert" on public.%1$s for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "%1$s_admin_update" on public.%1$s for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "%1$s_admin_delete" on public.%1$s for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

create index deck_cards_card_idx on public.deck_cards (card_id);
create index card_translations_card_idx on public.card_translations (card_id);
