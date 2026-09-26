create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor')),
  created_at timestamptz not null default now()
);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  phone text not null check (char_length(phone) between 8 and 30),
  city text not null check (char_length(city) between 2 and 100),
  work_type text not null check (char_length(work_type) between 2 and 100),
  description text not null check (char_length(description) between 10 and 3000),
  desired_start_date date,
  status text not null default 'Novo' check (status in ('Novo', 'Em contato', 'Orçamento', 'Fechado', 'Arquivado')),
  source text not null default 'website',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null default '',
  content text not null default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  price_label text,
  show_price boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  city text,
  category text,
  summary text not null default '',
  content text not null default '',
  duration text,
  hero_image text,
  video_url text,
  is_published boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('image', 'video', 'before', 'after')),
  url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  before_after_group text,
  created_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  text text not null,
  rating integer check (rating between 1 and 5),
  source text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create index quote_requests_created_at_idx on public.quote_requests(created_at desc);
create index quote_requests_status_idx on public.quote_requests(status);
create index services_visibility_sort_idx on public.services(is_visible, sort_order);
create index projects_published_created_idx on public.projects(is_published, created_at desc);
create index project_media_project_sort_idx on public.project_media(project_id, sort_order);
create index testimonials_approved_created_idx on public.testimonials(is_approved, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quote_requests_updated_at before update on public.quote_requests for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger testimonials_updated_at before update on public.testimonials for each row execute function public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner', 'admin', 'editor')
  );
$$;

alter table public.profiles enable row level security;
alter table public.quote_requests enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.project_media enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_settings enable row level security;

create policy "Users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins read quotes" on public.quote_requests for select using (public.is_admin());
create policy "Admins update quotes" on public.quote_requests for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete quotes" on public.quote_requests for delete using (public.is_admin());

create policy "Public reads visible services" on public.services for select using (is_visible or public.is_admin());
create policy "Admins manage services" on public.services for all using (public.is_admin()) with check (public.is_admin());

create policy "Public reads published projects" on public.projects for select using (is_published or public.is_admin());
create policy "Admins manage projects" on public.projects for all using (public.is_admin()) with check (public.is_admin());

create policy "Public reads published project media" on public.project_media for select using (
  exists (select 1 from public.projects where projects.id = project_media.project_id and (projects.is_published or public.is_admin()))
);
create policy "Admins manage project media" on public.project_media for all using (public.is_admin()) with check (public.is_admin());

create policy "Public reads approved testimonials" on public.testimonials for select using (is_approved or public.is_admin());
create policy "Admins manage testimonials" on public.testimonials for all using (public.is_admin()) with check (public.is_admin());

create policy "Public reads public settings" on public.site_settings for select using (is_public or public.is_admin());
create policy "Admins manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.quote_requests from anon, authenticated;
grant select, update, delete on public.quote_requests to authenticated;
grant select on public.services, public.projects, public.project_media, public.testimonials, public.site_settings to anon, authenticated;
grant all on public.profiles, public.services, public.projects, public.project_media, public.testimonials, public.site_settings to authenticated;
