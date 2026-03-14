-- Add social auth columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider_id" text;

-- Drop email verification and password reset token tables (no longer needed with social auth)
DROP TABLE IF EXISTS "email_verification_tokens";
DROP TABLE IF EXISTS "password_reset_tokens";
