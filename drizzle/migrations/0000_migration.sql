create extension if not exists unaccent with schema extensions;

create type public.app_role as enum ('analista','coordenador','lider','monitora');

create table public.profiles (
  id uuid primary key,
  email text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  role public.app_role not null
);
grant select, insert, update on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_editor(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r join public.profiles p on p.id = r.user_id
    where r.user_id = _user_id and p.ativo and r.role in ('analista','coordenador'))
$$;

create or replace function public.is_active_user(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _user_id and ativo)
$$;

create or replace function public.system_has_users()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles)
$$;
grant execute on function public.system_has_users() to anon, authenticated;

create policy "ver perfis" on public.profiles for select to authenticated using (public.is_active_user(auth.uid()));
create policy "editar perfis" on public.profiles for update to authenticated using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));
create policy "ver papeis" on public.user_roles for select to authenticated using (public.is_active_user(auth.uid()));
create policy "criar papeis" on public.user_roles for insert to authenticated with check (public.is_editor(auth.uid()));
create policy "editar papeis" on public.user_roles for update to authenticated using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare _first boolean; _role public.app_role;
begin
  select not exists (select 1 from public.user_roles) into _first;
  if _first then _role := 'coordenador';
  else _role := coalesce(nullif(new.raw_app_meta_data->>'role','')::public.app_role, 'lider');
  end if;
  insert into public.profiles (id, email) values (new.id, coalesce(new.email,''));
  insert into public.user_roles (user_id, role) values (new.id, _role);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_nome_norm()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  new.nome := btrim(new.nome);
  if new.nome = '' then raise exception 'Nome obrigatório'; end if;
  new.nome_norm := lower(extensions.unaccent(new.nome));
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['celulas','turnos','monitoras'] loop
    execute format('create table public.%I (
      id uuid primary key default gen_random_uuid(),
      nome text not null,
      nome_norm text not null default '''',
      ativo boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now())', t);
    execute format('create unique index %I on public.%I (nome_norm) where ativo', t || '_nome_ativo_uniq', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.set_nome_norm()', t || '_norm', t);
    execute format('create policy "consultar" on public.%I for select to authenticated using (public.is_active_user(auth.uid()))', t);
    execute format('create policy "criar" on public.%I for insert to authenticated with check (public.is_editor(auth.uid()))', t);
    execute format('create policy "editar" on public.%I for update to authenticated using (public.is_editor(auth.uid())) with check (public.is_editor(auth.uid()))', t);
  end loop;
end $$;