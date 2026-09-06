begin;

-- Invitations table
create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'storekeeper', 'cashier')),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

-- Only one active pending invite per business+email at a time
create unique index if not exists idx_business_invitations_pending_unique
  on public.business_invitations (business_id, lower(email))
  where status = 'pending';

create index if not exists idx_business_invitations_email
  on public.business_invitations (lower(email));

-- Track which email a membership belongs to, for display purposes on a team page
alter table public.business_memberships
  add column if not exists email text;

-- Backfill email for existing memberships (owners created before this feature)
update public.business_memberships bm
set email = u.email
from auth.users u
where bm.user_id = u.id
  and bm.email is null;

alter table public.business_invitations enable row level security;

-- Owner/admin of the business can see invitations they've sent
drop policy if exists invitations_select_business_admin on public.business_invitations;
create policy invitations_select_business_admin
  on public.business_invitations
  for select
  to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']));

-- The invited person can see their own pending invitation, matched by email
drop policy if exists invitations_select_own_email on public.business_invitations;
create policy invitations_select_own_email
  on public.business_invitations
  for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Function: create an invitation
create or replace function public.create_business_invitation(
  p_business_id uuid,
  p_email text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_invitation_id uuid;
  v_clean_email text := lower(trim(p_email));
begin
  if not public.has_business_role(p_business_id, array['owner', 'admin']) then
    raise exception 'You are not authorized to invite members to this business.';
  end if;

  if p_role not in ('admin', 'storekeeper', 'cashier') then
    raise exception 'Invalid role.';
  end if;

  if v_clean_email = '' or v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required.';
  end if;

  if exists (
    select 1 from public.business_memberships bm
    join auth.users u on u.id = bm.user_id
    where bm.business_id = p_business_id
      and lower(u.email) = v_clean_email
      and bm.is_active = true
  ) then
    raise exception 'This person is already a member of this business.';
  end if;

  insert into public.business_invitations (business_id, email, role, invited_by)
  values (p_business_id, v_clean_email, p_role, auth.uid())
  on conflict (business_id, lower(email)) where status = 'pending'
  do update set role = excluded.role, created_at = now(), expires_at = now() + interval '7 days'
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

grant execute on function public.create_business_invitation(uuid, text, text) to authenticated;

-- Function: accept an invitation as the currently logged-in user
create or replace function public.accept_business_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_invitation record;
  v_user_email text;
begin
  select email into v_user_email from auth.users where id = auth.uid();

  select * into v_invitation
  from public.business_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found.';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'This invitation has already been used or revoked.';
  end if;

  if v_invitation.expires_at < now() then
    raise exception 'This invitation has expired.';
  end if;

  if lower(v_invitation.email) <> lower(v_user_email) then
    raise exception 'This invitation was sent to a different email address.';
  end if;

  insert into public.business_memberships (business_id, user_id, role, is_active, email)
  values (v_invitation.business_id, auth.uid(), v_invitation.role, true, v_user_email)
  on conflict (business_id, user_id)
  do update set role = excluded.role, is_active = true, email = excluded.email;

  update public.business_invitations
  set status = 'accepted', accepted_at = now()
  where id = p_invitation_id;

  return v_invitation.business_id;
end;
$$;

grant execute on function public.accept_business_invitation(uuid) to authenticated;

-- Function: revoke a pending invitation
create or replace function public.revoke_business_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_business_id uuid;
begin
  select business_id into v_business_id
  from public.business_invitations
  where id = p_invitation_id;

  if not found then
    raise exception 'Invitation not found.';
  end if;

  if not public.has_business_role(v_business_id, array['owner', 'admin']) then
    raise exception 'You are not authorized to revoke this invitation.';
  end if;

  update public.business_invitations
  set status = 'revoked'
  where id = p_invitation_id;
end;
$$;

grant execute on function public.revoke_business_invitation(uuid) to authenticated;

commit;