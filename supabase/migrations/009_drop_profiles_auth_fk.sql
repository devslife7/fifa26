-- Remove the foreign key to auth.users since we now use custom OTP auth
-- The profiles.id column referenced auth.users(id), but we now generate our own UUIDs
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Also drop the email uniqueness if it exists, since it was added in 007
-- and re-add it properly (it may already exist)
