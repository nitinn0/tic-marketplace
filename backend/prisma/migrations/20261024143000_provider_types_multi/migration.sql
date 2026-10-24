-- Allow a provider profile to declare multiple organization types.
ALTER TABLE "provider_profiles" ADD COLUMN "provider_types" "ProviderType"[];

UPDATE "provider_profiles" SET "provider_types" = ARRAY["provider_type"]::"ProviderType"[];

ALTER TABLE "provider_profiles" ALTER COLUMN "provider_types" SET NOT NULL;

DROP INDEX IF EXISTS "provider_profiles_provider_type_idx";

ALTER TABLE "provider_profiles" DROP COLUMN "provider_type";

CREATE INDEX "provider_profiles_provider_types_idx" ON "provider_profiles" USING GIN ("provider_types");
