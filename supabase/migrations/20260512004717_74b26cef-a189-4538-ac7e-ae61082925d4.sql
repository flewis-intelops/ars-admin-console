
-- Enums
create type public.source_type as enum ('walk_in','recruited','volunteer','liaison','other');
create type public.reliability_grade as enum ('A','B','C','D','E','F');
create type public.source_status as enum ('pending_vetting','active','dormant','suspended','terminated');

-- handlers
create table public.handlers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  callsign text not null unique,
  full_name text not null,
  unit text not null,
  classification_clearance text not null default 'TS/SCI',
  aor text not null,
  created_at timestamptz not null default now()
);
alter table public.handlers enable row level security;
create policy "handler reads own row" on public.handlers
  for select to authenticated using (user_id = auth.uid());

-- source_registry (firewalled — no client policies)
create table public.source_registry (
  id uuid primary key default gen_random_uuid(),
  true_name text not null,
  dob date,
  id_document_type text,
  id_document_number text,
  vetting_notes text,
  created_by uuid not null references public.handlers(id),
  created_at timestamptz not null default now()
);
alter table public.source_registry enable row level security;
-- intentionally NO policies: default-deny for all client roles.
-- only SECURITY DEFINER functions can touch this table.

-- helper
create or replace function public.current_handler_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.handlers where user_id = auth.uid() limit 1;
$$;

-- sources_operational
create table public.sources_operational (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null unique references public.source_registry(id) on delete restrict,
  handler_id uuid not null references public.handlers(id) on delete restrict,
  pseudonym text not null unique,
  source_type public.source_type not null,
  reliability public.reliability_grade,
  aor text not null,
  status public.source_status not null default 'pending_vetting',
  last_contact_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sources_operational enable row level security;
create policy "handler reads own sources" on public.sources_operational
  for select to authenticated using (handler_id = public.current_handler_id());
create policy "handler updates own sources" on public.sources_operational
  for update to authenticated using (handler_id = public.current_handler_id());

-- pairing_codes
create table public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources_operational(id) on delete cascade,
  handler_id uuid not null references public.handlers(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pairing_codes enable row level security;
create policy "handler reads own codes" on public.pairing_codes
  for select to authenticated using (handler_id = public.current_handler_id());

-- register_source RPC
create or replace function public.register_source(
  p_true_name text,
  p_dob date,
  p_id_document_type text,
  p_id_document_number text,
  p_source_type public.source_type,
  p_aor text,
  p_vetting_notes text
)
returns table (source_id uuid, pseudonym text, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handler_id uuid;
  v_registry_id uuid;
  v_source_id uuid;
  v_pseudonym text;
  v_code text;
  v_expires timestamptz := now() + interval '15 minutes';
  v_attempts int := 0;
  -- v0.1 policy: pseudonyms are PERMANENT. Once assigned, a pseudonym is never
  -- reused, even after a source is terminated/decommissioned. The 9000-slot
  -- space (1000-9999) is sized for POC scale only. The 50-retry cap exists to
  -- detect near-exhaustion and force an operator decision (widen the format,
  -- partition by AOR, etc.) rather than degrading silently.
  c_max_attempts constant int := 50;
begin
  v_handler_id := public.current_handler_id();
  if v_handler_id is null then
    raise exception 'NotAHandler: caller is not a registered handler' using errcode = '42501';
  end if;

  insert into public.source_registry (true_name, dob, id_document_type, id_document_number, vetting_notes, created_by)
  values (p_true_name, p_dob, p_id_document_type, p_id_document_number, p_vetting_notes, v_handler_id)
  returning id into v_registry_id;

  loop
    v_attempts := v_attempts + 1;
    v_pseudonym := 'S-' || lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
    exit when not exists (select 1 from public.sources_operational where pseudonym = v_pseudonym);
    if v_attempts >= c_max_attempts then
      raise exception 'PseudonymSpaceExhausted: could not allocate unique pseudonym after % attempts', c_max_attempts using errcode = 'P0001';
    end if;
  end loop;

  insert into public.sources_operational (registry_id, handler_id, pseudonym, source_type, aor, status)
  values (v_registry_id, v_handler_id, v_pseudonym, p_source_type, p_aor, 'pending_vetting')
  returning id into v_source_id;

  v_code := lpad(floor(random() * 1000000)::int::text, 6, '0');

  insert into public.pairing_codes (source_id, handler_id, code, expires_at)
  values (v_source_id, v_handler_id, v_code, v_expires);

  return query select v_source_id, v_pseudonym, v_code, v_expires;
end;
$$;

grant execute on function public.register_source(text,date,text,text,public.source_type,text,text) to authenticated;
