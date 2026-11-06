-- Run once in Supabase Dashboard > SQL Editor.
-- Unified catalog for bank cards, transit cards, identity documents and memberships.
create table if not exists public.wallet_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_member_id uuid,
  category text not null check (category in ('bank', 'transport', 'identity', 'student', 'membership', 'other')),
  instrument_type text not null,
  issuer text not null,
  network text not null default '',
  label text not null,
  holder_name text not null,
  identifier text not null,
  expires_on date,
  balance numeric(12,2) check (balance is null or balance >= 0),
  status text not null default 'active' check (status in ('active', 'pending', 'blocked', 'expired')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_cards_member_owner_fk foreign key (family_member_id, user_id)
    references public.family_members(id, user_id) on delete set null (family_member_id),
  constraint wallet_cards_identifier_length check (char_length(identifier) between 1 and 64),
  constraint wallet_cards_bank_identifier_last_four check (category <> 'bank' or identifier ~ '^[0-9]{4}$')
);

create index if not exists wallet_cards_user_created_idx
  on public.wallet_cards (user_id, created_at desc);
create index if not exists wallet_cards_user_category_status_idx
  on public.wallet_cards (user_id, category, status);

alter table public.wallet_cards enable row level security;
revoke all on public.wallet_cards from anon, authenticated;
grant select, insert, update, delete on public.wallet_cards to authenticated;

drop policy if exists wallet_cards_owner_select on public.wallet_cards;
create policy wallet_cards_owner_select on public.wallet_cards
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists wallet_cards_owner_insert on public.wallet_cards;
create policy wallet_cards_owner_insert on public.wallet_cards
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists wallet_cards_owner_update on public.wallet_cards;
create policy wallet_cards_owner_update on public.wallet_cards
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists wallet_cards_owner_delete on public.wallet_cards;
create policy wallet_cards_owner_delete on public.wallet_cards
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Bring existing cards and credentials into the unified catalogue.
insert into public.wallet_cards
  (user_id, family_member_id, category, instrument_type, issuer, network, label, holder_name, identifier, expires_on, balance, status)
select pc.user_id, pc.family_member_id, 'bank', 'Crédito / débito', 'Entidad bancaria', pc.brand, 'Tarjeta bancaria ' || pc.brand,
       coalesce(fm.name, p.full_name, 'Mi cuenta'), pc.last_four::text,
       case when pc.expiry_year is not null and pc.expiry_month is not null then make_date(pc.expiry_year, pc.expiry_month, 1) else null end,
       pc.balance, 'active'
from public.payment_cards pc
join public.profiles p on p.id = pc.user_id
left join public.family_members fm on fm.id = pc.family_member_id and fm.user_id = pc.user_id
where not exists (select 1 from public.wallet_cards w where w.user_id = pc.user_id and w.category = 'bank' and w.network = pc.brand and w.identifier = pc.last_four::text and w.label = 'Tarjeta bancaria ' || pc.brand);

insert into public.wallet_cards
  (user_id, family_member_id, category, instrument_type, issuer, label, holder_name, identifier, balance, status)
select tc.user_id, tc.family_member_id, 'transport', tc.operator, tc.operator, tc.operator,
       coalesce(fm.name, p.full_name, 'Mi cuenta'), tc.card_number, tc.balance, 'active'
from public.transport_cards tc
join public.profiles p on p.id = tc.user_id
left join public.family_members fm on fm.id = tc.family_member_id and fm.user_id = tc.user_id
where not exists (select 1 from public.wallet_cards w where w.user_id = tc.user_id and w.category = 'transport' and w.issuer = tc.operator and w.identifier = tc.card_number);

insert into public.wallet_cards
  (user_id, family_member_id, category, instrument_type, issuer, label, holder_name, identifier, expires_on, status)
select d.user_id, d.family_member_id, 'identity', d.document_type, 'Registro personal', d.document_type,
       coalesce(nullif(d.full_name, ''), fm.name, p.full_name, 'Mi cuenta'), d.document_number, d.expiration_date,
       case when d.status = 'expired' then 'expired' when d.status = 'rejected' then 'blocked' when d.status = 'pending' then 'pending' else 'active' end
from public.documents d
join public.profiles p on p.id = d.user_id
left join public.family_members fm on fm.id = d.family_member_id and fm.user_id = d.user_id
where not exists (select 1 from public.wallet_cards w where w.user_id = d.user_id and w.category = 'identity' and w.instrument_type = d.document_type and w.identifier = d.document_number);

insert into public.wallet_cards
  (user_id, category, instrument_type, issuer, label, holder_name, identifier, expires_on, status)
select s.user_id, 'student', coalesce(s.education_type, 'Credencial estudiantil'), s.institution, s.program,
       p.full_name, s.student_code, s.valid_until,
       case when s.verification_status = 'verified' then 'active' when s.verification_status = 'rejected' then 'blocked' else 'pending' end
from public.student_credentials s
join public.profiles p on p.id = s.user_id
where not exists (select 1 from public.wallet_cards w where w.user_id = s.user_id and w.category = 'student' and w.issuer = s.institution and w.identifier = s.student_code);
