-- CreateEnum
CREATE TYPE "EmailChangeStatus" AS ENUM ('OTP_PENDING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "email_change_tokens"
ADD COLUMN "current_email" TEXT,
ADD COLUMN "status" "EmailChangeStatus" NOT NULL DEFAULT 'OTP_PENDING',
ADD COLUMN "otp_verified_at" TIMESTAMP(3),
ADD COLUMN "reviewed_by_user_id" UUID,
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "review_note" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill current email from users for existing rows
UPDATE "email_change_tokens" AS ect
SET "current_email" = u.email
FROM "users" AS u
WHERE u.id = ect.user_id AND ect.current_email IS NULL;

UPDATE "email_change_tokens"
SET "current_email" = ''
WHERE "current_email" IS NULL;

ALTER TABLE "email_change_tokens"
ALTER COLUMN "current_email" SET NOT NULL;

-- CreateIndex
CREATE INDEX "email_change_tokens_user_id_status_idx" ON "email_change_tokens"("user_id", "status");

-- CreateIndex
CREATE INDEX "email_change_tokens_status_created_at_idx" ON "email_change_tokens"("status", "created_at");

-- AddForeignKey
ALTER TABLE "email_change_tokens" ADD CONSTRAINT "email_change_tokens_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
