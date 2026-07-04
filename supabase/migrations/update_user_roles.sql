-- ============================================================
-- Migration: update_user_roles
-- Adds is_banned column and creates a SECURITY DEFINER RPC
-- to safely join user_roles with auth.users for admin views.
-- ============================================================

-- 1. Add is_banned column
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- 2. Create the SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_admin_users_view()
RETURNS TABLE (
  email       text,
  role        text,
  is_banned   boolean,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Verify the caller has admin or superadmin privileges
  SELECT ur.role INTO caller_role
    FROM public.user_roles ur
   WHERE ur.user_id = auth.uid()::text;

  IF caller_role IS NULL OR caller_role NOT IN ('admin', 'superadmin') THEN
    RAISE EXCEPTION 'Unauthorized: insufficient privileges';
  END IF;

  -- Return joined data
  RETURN QUERY
    SELECT
      au.email::text        AS email,
      ur.role::text         AS role,
      ur.is_banned          AS is_banned,
      au.last_sign_in_at    AS last_sign_in_at
    FROM public.user_roles ur
    LEFT JOIN auth.users au ON au.id = ur.user_id::uuid
    ORDER BY au.email ASC NULLS LAST;
END;
$$;

-- 3. Grant execute permission to authenticated users
-- (the function itself enforces admin/superadmin check internally)
GRANT EXECUTE ON FUNCTION public.get_admin_users_view() TO authenticated;
