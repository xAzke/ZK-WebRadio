-- Create ApiKeys table
CREATE TABLE IF NOT EXISTS "ApiKeys" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Owner" varchar(100) NOT NULL,
    "Key" varchar(64) NOT NULL UNIQUE,
    "ServerAddress" varchar(50) NOT NULL UNIQUE,
    "AllowedIPAddresses" varchar(500),
    "IsActive" boolean DEFAULT true,
    "CreatedAt" timestamptz DEFAULT now(),
    "LastUsedAt" timestamptz
);

-- Create TrackMetadata table
CREATE TABLE IF NOT EXISTS "TrackMetadata" (
    "TrackId" varchar(50) PRIMARY KEY,
    "Title" varchar(200) NOT NULL,
    "Artist" varchar(200) NOT NULL,
    "AlbumCover" varchar(500),
    "PreviewUrl" varchar(500),
    "PlayCount" integer DEFAULT 0,
    "FailureCount" integer DEFAULT 0,
    "CachedAt" timestamptz DEFAULT now(),
    "LastPlayedAt" timestamptz
);

-- Create DeezerAccounts table
CREATE TABLE IF NOT EXISTS "DeezerAccounts" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Arl" text NOT NULL,
    "Username" varchar(150) NOT NULL,
    "UserId" varchar(50) NOT NULL UNIQUE,
    "AvatarUrl" varchar(500),
    "IsPremium" boolean DEFAULT false,
    "IsActive" boolean DEFAULT true,
    "CreatedAt" timestamptz DEFAULT now(),
    "LastUsedAt" timestamptz,
    "RequestCount" integer DEFAULT 0
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS "idx_apikeys_owner" ON "ApiKeys"("Owner");
CREATE INDEX IF NOT EXISTS "idx_trackmetadata_playcount" ON "TrackMetadata"("PlayCount");
CREATE INDEX IF NOT EXISTS "idx_deezeraccounts_userid" ON "DeezerAccounts"("UserId");

-- Enable Row Level Security (RLS)
ALTER TABLE "ApiKeys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrackMetadata" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeezerAccounts" ENABLE ROW LEVEL SECURITY;

-- Create Policies for service_role (API and Supabase Dashboard)
-- This ensures the API and the Admin panel have full access, but public users do not.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a roles de servicio' AND tablename = 'ApiKeys') THEN
        CREATE POLICY "Permitir todo a roles de servicio" ON "ApiKeys" FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a roles de servicio' AND tablename = 'TrackMetadata') THEN
        CREATE POLICY "Permitir todo a roles de servicio" ON "TrackMetadata" FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a roles de servicio' AND tablename = 'DeezerAccounts') THEN
        CREATE POLICY "Permitir todo a roles de servicio" ON "DeezerAccounts" FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

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
