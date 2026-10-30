create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  page text not null check (
    page in (
      'beranda', 'panduan', 'model', 'lab', 'misi', 'kartu', 'lacak',
      'log', 'asesmen', 'riset', 'saran', 'tentang'
    )
  ),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 5000),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  role text not null check (char_length(role) <= 40),
  category text not null check (char_length(category) <= 40),
  kind text not null check (kind in ('Saran', 'Masalah', 'Pujian')),
  message text not null check (char_length(message) between 10 and 600),
  name text not null default '' check (char_length(name) <= 40),
  created_at timestamptz not null default now()
);

create table if not exists public.research_results (
  id uuid primary key default gen_random_uuid(),
  participant_count integer not null check (participant_count > 0),
  pre_scores jsonb not null check (jsonb_typeof(pre_scores) = 'array'),
  post_scores jsonb not null check (jsonb_typeof(post_scores) = 'array'),
  notes text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'super_admin'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.feedback enable row level security;
alter table public.research_results enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

drop policy if exists "Published content is public" on public.site_content;
create policy "Published content is public"
on public.site_content for select to anon, authenticated
using (is_published or (select public.is_super_admin()));

drop policy if exists "Super admins manage content" on public.site_content;
create policy "Super admins manage content"
on public.site_content for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

drop policy if exists "Visitors can send feedback" on public.feedback;
create policy "Visitors can send feedback"
on public.feedback for insert to anon, authenticated
with check (
  char_length(message) between 10 and 600
  and char_length(name) <= 40
  and (user_id is null or user_id = (select auth.uid()))
);

drop policy if exists "Super admins read feedback" on public.feedback;
create policy "Super admins read feedback"
on public.feedback for select to authenticated
using ((select public.is_super_admin()));

drop policy if exists "Super admins delete feedback" on public.feedback;
create policy "Super admins delete feedback"
on public.feedback for delete to authenticated
using ((select public.is_super_admin()));

drop policy if exists "Published research is public" on public.research_results;
create policy "Published research is public"
on public.research_results for select to anon, authenticated
using (is_published or (select public.is_super_admin()));

drop policy if exists "Super admins manage research" on public.research_results;
create policy "Super admins manage research"
on public.research_results for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

grant select on public.profiles to authenticated;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;
grant insert on public.feedback to anon, authenticated;
grant select, delete on public.feedback to authenticated;
grant select on public.research_results to anon, authenticated;
grant insert, update, delete on public.research_results to authenticated;

insert into public.profiles (id, role)
select id, 'super_admin'
from auth.users
where email = 'GANTI_DENGAN_EMAIL_SUPER_ADMIN'
on conflict (id) do update set role = excluded.role;
