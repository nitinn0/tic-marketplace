-- Hire inquiries are conversations between a provider organization and an independent,
-- without an RFQ or a provider profile on the other side.

ALTER TABLE "conversations" ALTER COLUMN "rfq_id" DROP NOT NULL;
ALTER TABLE "conversations" ALTER COLUMN "buyer_organization_id" DROP NOT NULL;
ALTER TABLE "conversations" ALTER COLUMN "provider_organization_id" DROP NOT NULL;
ALTER TABLE "conversations" ALTER COLUMN "provider_id" DROP NOT NULL;

ALTER TABLE "conversations" ADD COLUMN "professional_profile_id" UUID;

CREATE UNIQUE INDEX "conversations_hire_pair_key"
  ON "conversations"("provider_organization_id", "professional_profile_id");

CREATE INDEX "conversations_professional_profile_id_idx" ON "conversations"("professional_profile_id");

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_professional_profile_id_fkey"
  FOREIGN KEY ("professional_profile_id") REFERENCES "professional_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
