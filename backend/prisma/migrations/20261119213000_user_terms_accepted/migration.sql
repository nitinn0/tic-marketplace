-- Persist one-time Terms & Conditions acceptance per user.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3);

-- Existing accounts are treated as already accepted so only new signups are prompted.
UPDATE "users"
SET "terms_accepted_at" = "created_at"
WHERE "terms_accepted_at" IS NULL;
