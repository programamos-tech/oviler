-- Fix: infinite recursion in RLS policy on "users" (policy was SELECT from users to get organization_id).
-- Use a SECURITY DEFINER function so the policy can get current user's org without querying users through RLS.

CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Users see only users in their organization" ON users;

CREATE POLICY "Users see only users in their organization"
  ON users FOR SELECT
  USING (organization_id = public.get_my_organization_id());
