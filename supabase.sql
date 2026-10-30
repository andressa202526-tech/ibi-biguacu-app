
-- Execute uma vez no SQL Editor de um projeto Supabase NOVO da IBI Biguaçu.
-- NÃO execute no projeto existente do retiro.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role text not null default 'member' check (role in ('member','admin')),
  approved boolean not null default false,
  birthday date,
  show_birthday boolean not null default false,
  notify_others boolean not null default false,
  receive_birthday_notices boolean not null default true,
  created_at timestamptz not null default now(),
  constraint notices_require_listing check (not notify_others or show_birthday)
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 1 and 120),
  description text default '',
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 1 and 120),
  body text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, body text not null,
  birthday_owner_id uuid references auth.users(id) on delete cascade,
  notification_day date,
  kind text not null default 'general',
  created_at timestamptz not null default now()
);
create unique index if not exists birthday_delivery_once on public.notifications(user_id,birthday_owner_id,notification_day,kind) where kind in ('birthday_self','birthday_group');
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and approved and role='admin')
$$;
create or replace function public.is_approved() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and approved)
$$;
revoke all on function public.is_admin() from public;
revoke all on function public.is_approved() from public;
grant execute on function public.is_admin(), public.is_approved() to authenticated;

create or replace function public.make_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name)
 values(new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'),''),'Novo membro'),80));
 return new;
end $$;
drop trigger if exists on_user_created_ibi on auth.users;
create trigger on_user_created_ibi after insert on auth.users for each row execute function public.make_profile();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

revoke all on public.profiles,public.events,public.announcements,public.notifications from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,birthday,show_birthday,notify_others,receive_birthday_notices) on public.profiles to authenticated;
grant select on public.events to anon,authenticated;
grant insert,update,delete on public.events to authenticated;
grant select on public.announcements to authenticated;
grant insert,update,delete on public.announcements to authenticated;
grant select on public.notifications to authenticated;

create policy "own profile only" on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy "update own preferences" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "read events" on public.events for select to anon,authenticated using(true);
create policy "admins manage events" on public.events for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy "approved read announcements" on public.announcements for select to authenticated using((select public.is_approved()));
create policy "admin manage announcements" on public.announcements for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy "read own notifications when approved" on public.notifications for select to authenticated using(user_id=(select auth.uid()) and (select public.is_approved()));

-- Apenas nomes e dia/mês autorizados; ano não é retornado.
create or replace function public.month_birthdays()
returns table(display_name text,birth_day integer,birth_month integer)
language sql stable security definer set search_path='' as $$
 select p.display_name,extract(day from p.birthday)::integer,extract(month from p.birthday)::integer
 from public.profiles p
 where p.approved and p.show_birthday and p.birthday is not null
 and extract(month from p.birthday)=extract(month from (now() at time zone 'America/Sao_Paulo'))
 order by extract(day from p.birthday),p.display_name
$$;
revoke all on function public.month_birthdays() from public;
grant execute on function public.month_birthdays() to anon,authenticated;

-- Admin vê apenas identificadores e nomes para aprovação, não datas de nascimento.
create or replace function public.pending_members()
returns table(id uuid,display_name text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Acesso negado'; end if;
 return query select p.id,p.display_name from public.profiles p where not p.approved order by p.created_at;
end $$;
revoke all on function public.pending_members() from public;
grant execute on function public.pending_members() to authenticated;

create or replace function public.approve_member(member_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Acesso negado'; end if;
 update public.profiles set approved=true where id=member_id;
end $$;
revoke all on function public.approve_member(uuid) from public;
grant execute on function public.approve_member(uuid) to authenticated;

-- Gera mensagens DENTRO DO APP, não envia push ao celular.
-- Rotina idempotente: nenhuma mensagem duplicada no mesmo dia.
create or replace function public.deliver_birthdays()
returns void language plpgsql security definer set search_path='' as $$
declare b record; today_local date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 for b in
 select id,display_name,notify_others
 from public.profiles
 where approved and birthday is not null
 and extract(month from birthday)=extract(month from today_local)
 and extract(day from birthday)=extract(day from today_local)
 loop
 insert into public.notifications(user_id,title,body,birthday_owner_id,notification_day,kind)
 values(b.id,'Feliz aniversário! 🎉','Que o Senhor abençoe sua vida, fortaleça sua fé e conduza seus passos. Com carinho, IBI Biguaçu.',b.id,today_local,'birthday_self')
 on conflict do nothing;
 if b.notify_others then
 insert into public.notifications(user_id,title,body,birthday_owner_id,notification_day,kind)
 select p.id,'🎂 Hoje tem aniversário na IBI!', 'Hoje é aniversário de '||b.display_name||'! Que tal desejar um dia abençoado?',b.id,today_local,'birthday_group'
 from public.profiles p
 where p.approved and p.id<>b.id and p.receive_birthday_notices
 on conflict do nothing;
 end if;
 end loop;
end $$;
revoke all on function public.deliver_birthdays() from public,anon,authenticated;

-- Depois de criar seu primeiro cadastro e confirmar o e-mail:
-- 1. Consulte o UUID (Authentication > Users no painel do Supabase).
-- 2. Substitua o UUID abaixo e execute SOMENTE essa instrução no SQL Editor:
-- update public.profiles set role='admin', approved=true where id='SEU-UUID-AQUI';
-- 3. Supabase > Integrations > Cron: crie job diário com SQL:
-- select public.deliver_birthdays();
-- Horário sugerido: cron "0 12 * * *" (12h UTC = 09h em Biguaçu).
