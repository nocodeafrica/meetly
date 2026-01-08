-- Migration: Auto User Setup on Sign Up
-- This creates a trigger that automatically sets up new users with:
-- 1. An organization
-- 2. A user profile
-- 3. Admin role assignment

-- ============================================
-- FUNCTION: Handle new user signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    admin_role_id UUID;
    user_full_name TEXT;
    user_first_name TEXT;
    user_last_name TEXT;
    org_name TEXT;
BEGIN
    -- Extract user metadata
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Split full name into first and last
    user_first_name := split_part(user_full_name, ' ', 1);
    user_last_name := COALESCE(
        NULLIF(substring(user_full_name from position(' ' in user_full_name) + 1), ''),
        ''
    );

    -- Get organization name from metadata or generate default
    org_name := COALESCE(
        NEW.raw_user_meta_data->>'organization_name',
        user_first_name || '''s Organization'
    );

    -- Create organization for the user
    INSERT INTO public.organizations (
        name,
        settings
    ) VALUES (
        org_name,
        jsonb_build_object(
            'currency', 'USD',
            'timezone', 'Africa/Harare',
            'date_format', 'DD/MM/YYYY',
            'weight_unit', 'kg'
        )
    ) RETURNING id INTO new_org_id;

    -- Create user profile
    INSERT INTO public.user_profiles (
        id,
        organization_id,
        email,
        first_name,
        last_name,
        is_active
    ) VALUES (
        NEW.id,
        new_org_id,
        NEW.email,
        user_first_name,
        user_last_name,
        TRUE
    );

    -- Get admin role ID
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;

    -- Assign admin role to new user
    IF admin_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (
            user_id,
            role_id
        ) VALUES (
            NEW.id,
            admin_role_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: On auth.users insert
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Grant necessary permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Ensure the trigger function can insert into our tables
GRANT INSERT ON public.organizations TO authenticated;
GRANT INSERT ON public.user_profiles TO authenticated;
GRANT INSERT ON public.user_roles TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
