# Businesses SELECT policy

The membership embed `businesses(id,name)` is a many-to-one PostgREST relation and should return a business object for an active membership. The repository migration `supabase/migrations/20260818_phase1_tenancy_foundation.sql` already defines this SELECT policy:

```sql
create policy businesses_select_active_member
  on public.businesses
  for select
  to authenticated
  using (public.is_active_member(id));
```

This policy allows authenticated users to read only businesses where they have an active membership. Do not apply a second policy if this policy is already present in the deployed database. If the embed is `null` in an authenticated runtime response, verify that this policy and its `public.is_active_member(uuid)` helper have been applied; this SQL is provided for review and is not a migration.
