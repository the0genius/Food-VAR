CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "email_verification_user_idx" ON "email_verification_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "email_verification_hash_idx" ON "email_verification_tokens" ("token_hash");

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "password_reset_user_idx" ON "password_reset_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_hash_idx" ON "password_reset_tokens" ("token_hash");
