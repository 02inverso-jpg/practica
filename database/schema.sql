-- PULSO DIRECTORY — Esquema de base de datos
-- Motor: PostgreSQL (pensado para Supabase)
--
-- Cómo usarlo:
--   1. Crea un proyecto en https://supabase.com
--   2. Abre el "SQL Editor" del proyecto
--   3. Pega este archivo completo y ejecútalo (una sola vez)
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- PERFILES (vinculados 1 a 1 con auth.users de Supabase)
-- ---------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'ASOCIADO'
             check (role in ('ADMIN', 'EDITOR', 'ASOCIADO')),
  created_at timestamptz not null default now()
);

-- Crea automáticamente un perfil (rol ASOCIADO por defecto) cada vez
-- que alguien se registra con Supabase Auth.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'ASOCIADO');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ---------------------------------------------------------
-- CATEGORÍAS
-- ---------------------------------------------------------
create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  icon       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- ASOCIADOS
-- ---------------------------------------------------------
create table associates (
  id              uuid primary key default gen_random_uuid(),
  public_code     text unique,                 -- se genera solo: PULSO-00001
  user_id         uuid references profiles(id) on delete set null,

  name            text not null,
  business_name   text,
  slug            text not null unique,        -- para /directorio/clinica-dental-sonrisa
  description     text,

  phone           text,
  whatsapp        text,
  email           text,
  website         text,

  photo_url       text,
  logo_url        text,

  address         text,
  city            text,
  state           text,
  postal_code     text,
  latitude        numeric,
  longitude       numeric,
  modality        text not null default 'presencial'
                  check (modality in ('presencial', 'online', 'ambas')),

  category_id     uuid references categories(id),

  verified        boolean not null default false,
  status          text not null default 'PENDIENTE'
                  check (status in ('PENDIENTE', 'APROBADO', 'PUBLICADO', 'SUSPENDIDO', 'RECHAZADO')),

  profile_views   integer not null default 0,
  whatsapp_clicks integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ID público autoincremental tipo PULSO-00001
create sequence if not exists associates_public_seq;

create or replace function set_associate_public_code()
returns trigger as $$
begin
  if new.public_code is null then
    new.public_code := 'PULSO-' || lpad(nextval('associates_public_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_associate_public_code
before insert on associates
for each row execute function set_associate_public_code();

-- updated_at siempre al día
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_associates_updated_at
before update on associates
for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- SERVICIOS · HORARIOS · GALERÍA · REDES SOCIALES
-- ---------------------------------------------------------
create table services (
  id            uuid primary key default gen_random_uuid(),
  associate_id  uuid not null references associates(id) on delete cascade,
  name          text not null,
  description   text,
  price         numeric,
  created_at    timestamptz not null default now()
);

create table schedules (
  id            uuid primary key default gen_random_uuid(),
  associate_id  uuid not null references associates(id) on delete cascade,
  day           text not null
                check (day in ('lunes','martes','miercoles','jueves','viernes','sabado','domingo')),
  opening       time,
  closing       time,
  closed        boolean not null default false
);

create table gallery (
  id            uuid primary key default gen_random_uuid(),
  associate_id  uuid not null references associates(id) on delete cascade,
  image_url     text not null,
  sort_order    integer not null default 0
);

create table social_links (
  id            uuid primary key default gen_random_uuid(),
  associate_id  uuid not null references associates(id) on delete cascade,
  platform      text not null,   -- facebook, instagram, tiktok, etc.
  url           text not null
);

-- ---------------------------------------------------------
-- LEADS (listo para conectar a GHL en la Fase 5)
-- ---------------------------------------------------------
create table leads (
  id             uuid primary key default gen_random_uuid(),
  associate_id   uuid not null references associates(id) on delete cascade,
  source         text not null check (source in ('whatsapp', 'formulario', 'llamada')),
  name           text,
  phone          text,
  email          text,
  message        text,
  synced_to_ghl  boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------
create index idx_associates_status   on associates(status);
create index idx_associates_city     on associates(city);
create index idx_associates_category on associates(category_id);
create index idx_services_associate  on services(associate_id);
create index idx_schedules_associate on schedules(associate_id);
create index idx_gallery_associate   on gallery(associate_id);
create index idx_leads_associate     on leads(associate_id);

-- ---------------------------------------------------------
-- CATEGORÍAS INICIALES
-- ---------------------------------------------------------
insert into categories (name, slug, icon) values
  ('Odontología',       'odontologia',       '🦷'),
  ('Psicología',        'psicologia',        '🧠'),
  ('Medicina General',  'medicina-general',  '⚕️'),
  ('Fisioterapia',      'fisioterapia',      '💪'),
  ('Oftalmología',      'oftalmologia',      '👁️'),
  ('Nutrición',         'nutricion',         '🥗'),
  ('Dermatología',      'dermatologia',      '🩺'),
  ('Ginecología',       'ginecologia',       '🌸');

-- =========================================================
-- SEGURIDAD — Row Level Security (RLS)
--
-- Esta es la seguridad REAL del sistema. Cualquier bloqueo que hagamos
-- en el frontend (JS) es solo comodidad de interfaz: lo que de verdad
-- impide que alguien lea o edite algo que no debe es lo que sigue.
-- =========================================================

alter table profiles      enable row level security;
alter table associates    enable row level security;
alter table categories    enable row level security;
alter table services      enable row level security;
alter table schedules     enable row level security;
alter table gallery       enable row level security;
alter table social_links  enable row level security;
alter table leads         enable row level security;

-- Rol del usuario que hace la petición (o NULL si no hay sesión)
create or replace function current_user_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- --- PROFILES ---
create policy "cada quien ve su propio perfil (o admin/editor ven todos)"
  on profiles for select
  using (auth.uid() = id or current_user_role() in ('ADMIN', 'EDITOR'));

create policy "cada quien edita su propio perfil"
  on profiles for update
  using (auth.uid() = id);

-- --- CATEGORIES ---
create policy "categorias visibles para todos"
  on categories for select
  using (true);

create policy "solo admin/editor gestionan categorias"
  on categories for insert
  with check (current_user_role() in ('ADMIN', 'EDITOR'));

create policy "solo admin/editor editan categorias"
  on categories for update
  using (current_user_role() in ('ADMIN', 'EDITOR'));

create policy "solo admin/editor eliminan categorias"
  on categories for delete
  using (current_user_role() in ('ADMIN', 'EDITOR'));

-- --- ASSOCIATES ---
create policy "directorio publico ve solo publicados; dueno y staff ven todo"
  on associates for select
  using (
    status = 'PUBLICADO'
    or current_user_role() in ('ADMIN', 'EDITOR')
    or user_id = auth.uid()
  );

create policy "asociado o staff crean asociados"
  on associates for insert
  with check (current_user_role() in ('ADMIN', 'EDITOR') or user_id = auth.uid());

create policy "dueno o staff editan el asociado"
  on associates for update
  using (user_id = auth.uid() or current_user_role() in ('ADMIN', 'EDITOR'));

create policy "solo staff elimina asociados"
  on associates for delete
  using (current_user_role() in ('ADMIN', 'EDITOR'));

-- --- SERVICES / SCHEDULES / GALLERY / SOCIAL_LINKS ---
-- mismo patrón en las cuatro: visible si el asociado está publicado
-- (o eres el dueño/staff); editable solo por el dueño o staff.
create policy "servicios visibles si el asociado esta publicado"
  on services for select
  using (
    exists (select 1 from associates a where a.id = associate_id
            and (a.status = 'PUBLICADO' or a.user_id = auth.uid()))
    or current_user_role() in ('ADMIN', 'EDITOR')
  );
create policy "dueno o staff gestionan servicios"
  on services for all
  using (
    exists (select 1 from associates a where a.id = associate_id and a.user_id = auth.uid())
    or current_user_role() in ('ADMIN', 'EDITOR')
  );

create policy "horarios visibles si el asociado esta publicado"
  on schedules for select
  using (
    exists (select 1 from associates a where a.id = associate_id
            and (a.status = 'PUBLICADO' or a.user_id = auth.uid()))
    or current_user_role() in ('ADMIN', 'EDITOR')
  );
create policy "dueno o staff gestionan horarios"
  on schedules for all
  using (
    exists (select 1 from associates a where a.id = associate_id and a.user_id = auth.uid())
    or current_user_role() in ('ADMIN', 'EDITOR')
  );

create policy "galeria visible si el asociado esta publicado"
  on gallery for select
  using (
    exists (select 1 from associates a where a.id = associate_id
            and (a.status = 'PUBLICADO' or a.user_id = auth.uid()))
    or current_user_role() in ('ADMIN', 'EDITOR')
  );
create policy "dueno o staff gestionan galeria"
  on gallery for all
  using (
    exists (select 1 from associates a where a.id = associate_id and a.user_id = auth.uid())
    or current_user_role() in ('ADMIN', 'EDITOR')
  );

create policy "redes visibles si el asociado esta publicado"
  on social_links for select
  using (
    exists (select 1 from associates a where a.id = associate_id
            and (a.status = 'PUBLICADO' or a.user_id = auth.uid()))
    or current_user_role() in ('ADMIN', 'EDITOR')
  );
create policy "dueno o staff gestionan redes"
  on social_links for all
  using (
    exists (select 1 from associates a where a.id = associate_id and a.user_id = auth.uid())
    or current_user_role() in ('ADMIN', 'EDITOR')
  );

-- --- LEADS ---
-- Nadie inserta leads directamente por RLS: se crean solo a través de la
-- función register_whatsapp_click() de abajo, que valida todo primero.
create policy "asociado o staff ven los leads del asociado"
  on leads for select
  using (
    exists (select 1 from associates a where a.id = associate_id and a.user_id = auth.uid())
    or current_user_role() in ('ADMIN', 'EDITOR')
  );

-- =========================================================
-- FUNCIONES PÚBLICAS (RPC) para contadores del perfil público
--
-- Se ejecutan con privilegios elevados (security definer) pero hacen
-- una sola cosa muy concreta cada una, así que no abren ningún hueco
-- de seguridad aunque cualquier visitante anónimo pueda llamarlas.
-- =========================================================

create or replace function increment_profile_view(p_associate_id uuid)
returns void as $$
begin
  update associates
     set profile_views = profile_views + 1
   where id = p_associate_id and status = 'PUBLICADO';
end;
$$ language plpgsql security definer;

grant execute on function increment_profile_view(uuid) to anon, authenticated;

create or replace function register_whatsapp_click(p_associate_id uuid)
returns void as $$
begin
  update associates
     set whatsapp_clicks = whatsapp_clicks + 1
   where id = p_associate_id and status = 'PUBLICADO';

  insert into leads (associate_id, source)
  select p_associate_id, 'whatsapp'
   where exists (select 1 from associates where id = p_associate_id and status = 'PUBLICADO');
end;
$$ language plpgsql security definer;

grant execute on function register_whatsapp_click(uuid) to anon, authenticated;

-- =========================================================
-- Fin del esquema. Después de ejecutarlo:
--   1. Regístrate una vez desde login.html (o desde Authentication
--      → Users en el panel de Supabase) para crear tu propio usuario.
--   2. Sube tu rol a ADMIN a mano, una sola vez, desde el SQL Editor:
--         update profiles set role = 'ADMIN' where email = 'tu-correo@ejemplo.com';
-- =========================================================
