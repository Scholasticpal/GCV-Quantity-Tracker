-- ============================================================
-- GCV Quantity Tracker — Supabase Schema
-- Phase 1: Authentication & Role-Based Access Control (RBAC)
-- ============================================================


-- ============================================================
-- SECTION 1: user_roles Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    email       TEXT        NOT NULL PRIMARY KEY,
    user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    role        TEXT        NOT NULL CHECK (role IN ('superadmin', 'admin', 'viewer', 'pending'))
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_roles IS
    'Maps email addresses to application roles. Populated by superadmins. user_id is linked at sign-up time via trigger.';

COMMENT ON COLUMN public.user_roles.email   IS 'The user''s email address. Serves as the primary key and is pre-populated by a superadmin before the user signs up.';
COMMENT ON COLUMN public.user_roles.user_id IS 'The UUID from auth.users, populated automatically by the handle_new_user trigger upon first sign-up.';
COMMENT ON COLUMN public.user_roles.role    IS 'Application role: superadmin | admin | viewer | pending.';


-- ============================================================
-- SECTION 2: Seed the Root / Superadmin User
-- ============================================================

INSERT INTO public.user_roles (email, user_id, role)
VALUES ('anmolgarg240@gmail.com', NULL, 'superadmin')
ON CONFLICT (email) DO NOTHING;


-- ============================================================
-- SECTION 3: Helper Function — get_my_role()
-- Used inside RLS policies to avoid repeated subqueries.
-- Defined as SECURITY DEFINER so it bypasses RLS on user_roles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role
    FROM   public.user_roles
    WHERE  user_id = auth.uid()
    LIMIT  1;
$$;


-- ============================================================
-- SECTION 4: Signup Trigger
-- When a new user signs up in auth.users:
--   • If their email already exists in user_roles → link their user_id.
--   • If their email does NOT exist → insert them as 'pending'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE email = NEW.email) THEN
        -- Email was pre-registered by an admin — link the auth user_id.
        UPDATE public.user_roles
        SET    user_id = NEW.id
        WHERE  email   = NEW.email;
    ELSE
        -- Email was not pre-registered — add them as 'pending'.
        INSERT INTO public.user_roles (email, user_id, role)
        VALUES (NEW.email, NEW.id, 'pending');
    END IF;

    RETURN NEW;
END;
$$;

-- Drop the trigger first to make this script safely re-runnable.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 5: RLS Policies — lots table
-- Assumes the 'lots' table already exists in the public schema.
-- ============================================================

ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean, idempotent re-run.
DROP POLICY IF EXISTS "lots_select_policy"    ON public.lots;
DROP POLICY IF EXISTS "lots_insert_policy"    ON public.lots;
DROP POLICY IF EXISTS "lots_update_policy"    ON public.lots;
DROP POLICY IF EXISTS "lots_delete_policy"    ON public.lots;

-- SELECT: superadmin, admin, and viewer can read all rows.
CREATE POLICY "lots_select_policy"
    ON public.lots
    FOR SELECT
    USING (
        public.get_my_role() IN ('superadmin', 'admin', 'viewer')
    );

-- INSERT: superadmin and admin only.
CREATE POLICY "lots_insert_policy"
    ON public.lots
    FOR INSERT
    WITH CHECK (
        public.get_my_role() IN ('superadmin', 'admin')
    );

-- UPDATE: superadmin and admin only.
CREATE POLICY "lots_update_policy"
    ON public.lots
    FOR UPDATE
    USING (
        public.get_my_role() IN ('superadmin', 'admin')
    )
    WITH CHECK (
        public.get_my_role() IN ('superadmin', 'admin')
    );

-- DELETE: superadmin and admin only.
CREATE POLICY "lots_delete_policy"
    ON public.lots
    FOR DELETE
    USING (
        public.get_my_role() IN ('superadmin', 'admin')
    );


-- ============================================================
-- SECTION 6: RLS Policies — saved_states table
-- Assumes the 'saved_states' table already exists in the public schema.
-- ============================================================

ALTER TABLE public.saved_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean, idempotent re-run.
DROP POLICY IF EXISTS "saved_states_select_policy"    ON public.saved_states;
DROP POLICY IF EXISTS "saved_states_insert_policy"    ON public.saved_states;
DROP POLICY IF EXISTS "saved_states_update_policy"    ON public.saved_states;
DROP POLICY IF EXISTS "saved_states_delete_policy"    ON public.saved_states;

-- SELECT: superadmin, admin, and viewer can read all rows.
CREATE POLICY "saved_states_select_policy"
    ON public.saved_states
    FOR SELECT
    USING (
        public.get_my_role() IN ('superadmin', 'admin', 'viewer')
    );

-- INSERT: superadmin and admin only.
CREATE POLICY "saved_states_insert_policy"
    ON public.saved_states
    FOR INSERT
    WITH CHECK (
        public.get_my_role() IN ('superadmin', 'admin')
    );

-- UPDATE: superadmin and admin only.
CREATE POLICY "saved_states_update_policy"
    ON public.saved_states
    FOR UPDATE
    USING (
        public.get_my_role() IN ('superadmin', 'admin')
    )
    WITH CHECK (
        public.get_my_role() IN ('superadmin', 'admin')
    );

-- DELETE: superadmin and admin only.
CREATE POLICY "saved_states_delete_policy"
    ON public.saved_states
    FOR DELETE
    USING (
        public.get_my_role() IN ('superadmin', 'admin')
    );


-- ============================================================
-- SECTION 7: RLS Policies — user_roles table itself
-- ============================================================

-- Drop existing policies to ensure a clean, idempotent re-run.
DROP POLICY IF EXISTS "user_roles_select_policy"    ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy"    ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy"    ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy"    ON public.user_roles;

-- SELECT: any authenticated user can read their own row (needed by the app to determine role).
--         superadmins can read all rows.
CREATE POLICY "user_roles_select_policy"
    ON public.user_roles
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.get_my_role() = 'superadmin'
    );

-- INSERT: superadmin only (pre-registering new users).
CREATE POLICY "user_roles_insert_policy"
    ON public.user_roles
    FOR INSERT
    WITH CHECK (
        public.get_my_role() = 'superadmin'
    );

-- UPDATE: superadmin only (changing roles).
CREATE POLICY "user_roles_update_policy"
    ON public.user_roles
    FOR UPDATE
    USING (
        public.get_my_role() = 'superadmin'
    )
    WITH CHECK (
        public.get_my_role() = 'superadmin'
    );

-- DELETE: superadmin only.
CREATE POLICY "user_roles_delete_policy"
    ON public.user_roles
    FOR DELETE
    USING (
        public.get_my_role() = 'superadmin'
    );
