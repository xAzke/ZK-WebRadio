-- ==========================================
-- SETUP: DISCORD USER WHITELIST TRIGGER
-- ==========================================

-- Clean up old insecure version if it exists
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;
DROP FUNCTION IF EXISTS public.check_discord_whitelist();

-- 1. Create a private schema for system functions (hides it from the REST API)
CREATE SCHEMA IF NOT EXISTS internal;

-- 2. Create the validation function in the internal schema
CREATE OR REPLACE FUNCTION internal.check_discord_whitelist()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = '' -- Prevents search path mutation attacks
AS $$
DECLARE
  -- ADD AUTHORIZED DISCORD IDs HERE
  allowed_ids TEXT[] := ARRAY[
    '394920068447731712', 
    '924386210980462642'
  ];
  current_discord_id TEXT;
BEGIN
  -- Extract Discord ID from identity metadata provided by OAuth
  current_discord_id := (NEW.raw_user_meta_data->>'provider_id');

  -- Verify against whitelist
  IF current_discord_id IS NULL OR NOT (current_discord_id = ANY(allowed_ids)) THEN
    RAISE EXCEPTION 'Acceso Denegado: Tu ID de Discord (%) no está en la lista blanca.', COALESCE(current_discord_id, 'No detectado');
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Revoke execute permissions from public roles for extra security
REVOKE EXECUTE ON FUNCTION internal.check_discord_whitelist() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION internal.check_discord_whitelist() FROM anon, authenticated;

-- 4. Create the trigger on auth.users (Supabase managed table)
-- We drop it first to ensure no duplicates if script is re-run
DROP TRIGGER IF EXISTS on_auth_user_signup ON auth.users;

CREATE TRIGGER on_auth_user_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION internal.check_discord_whitelist();
