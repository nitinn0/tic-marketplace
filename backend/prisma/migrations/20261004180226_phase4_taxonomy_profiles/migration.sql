-- CreateEnum
CREATE TYPE "ServiceCategoryType" AS ENUM ('CERTIFICATION', 'TESTING', 'INSPECTION', 'CONSULTING', 'OTHER');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('CERTIFICATION_BODY', 'TESTING_LAB', 'INSPECTION_COMPANY', 'CONSULTANCY', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfessionalType" AS ENUM ('CONSULTANT', 'LEAD_AUDITOR', 'LEAD_VERIFIER', 'INSPECTOR', 'TECHNICAL_EXPERT', 'OTHER');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ProfileVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CoverageType" AS ENUM ('LOCAL', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL');

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category_type" "ServiceCategoryType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standards" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industries" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "state" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "provider_type" "ProviderType" NOT NULL,
    "headline" TEXT,
    "description" TEXT,
    "years_in_business" INTEGER,
    "verification_status" "ProfileVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "public_profile" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_services" (
    "provider_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_services_pkey" PRIMARY KEY ("provider_id","service_id")
);

-- CreateTable
CREATE TABLE "provider_standards" (
    "provider_id" UUID NOT NULL,
    "standard_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_standards_pkey" PRIMARY KEY ("provider_id","standard_id")
);

-- CreateTable
CREATE TABLE "provider_industries" (
    "provider_id" UUID NOT NULL,
    "industry_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_industries_pkey" PRIMARY KEY ("provider_id","industry_id")
);

-- CreateTable
CREATE TABLE "provider_locations" (
    "provider_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "coverage_type" "CoverageType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_locations_pkey" PRIMARY KEY ("provider_id","location_id")
);

-- CreateTable
CREATE TABLE "professional_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "professional_type" "ProfessionalType" NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "years_experience" INTEGER,
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "verification_status" "ProfileVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "public_profile" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_experience" (
    "id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "organization_name" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_experience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");

-- CreateIndex
CREATE INDEX "service_categories_parent_id_sort_order_idx" ON "service_categories"("parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "service_categories_active_idx" ON "service_categories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_category_id_sort_order_idx" ON "services"("category_id", "sort_order");

-- CreateIndex
CREATE INDEX "services_active_idx" ON "services"("active");

-- CreateIndex
CREATE UNIQUE INDEX "services_category_id_name_key" ON "services"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "standards_code_key" ON "standards"("code");

-- CreateIndex
CREATE INDEX "standards_active_idx" ON "standards"("active");

-- CreateIndex
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- CreateIndex
CREATE INDEX "industries_parent_id_sort_order_idx" ON "industries"("parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "industries_active_idx" ON "industries"("active");

-- CreateIndex
CREATE UNIQUE INDEX "locations_location_key_key" ON "locations"("location_key");

-- CreateIndex
CREATE INDEX "locations_country_code_state_city_idx" ON "locations"("country_code", "state", "city");

-- CreateIndex
CREATE INDEX "locations_active_idx" ON "locations"("active");

-- CreateIndex
CREATE UNIQUE INDEX "provider_profiles_organization_id_key" ON "provider_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "provider_profiles_provider_type_idx" ON "provider_profiles"("provider_type");

-- CreateIndex
CREATE INDEX "provider_profiles_verification_status_idx" ON "provider_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "provider_profiles_public_profile_idx" ON "provider_profiles"("public_profile");

-- CreateIndex
CREATE INDEX "provider_services_service_id_idx" ON "provider_services"("service_id");

-- CreateIndex
CREATE INDEX "provider_standards_standard_id_idx" ON "provider_standards"("standard_id");

-- CreateIndex
CREATE INDEX "provider_industries_industry_id_idx" ON "provider_industries"("industry_id");

-- CreateIndex
CREATE INDEX "provider_locations_location_id_idx" ON "provider_locations"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "professional_profiles_user_id_key" ON "professional_profiles"("user_id");

-- CreateIndex
CREATE INDEX "professional_profiles_professional_type_idx" ON "professional_profiles"("professional_type");

-- CreateIndex
CREATE INDEX "professional_profiles_verification_status_idx" ON "professional_profiles"("verification_status");

-- CreateIndex
CREATE INDEX "professional_profiles_public_profile_idx" ON "professional_profiles"("public_profile");

-- CreateIndex
CREATE INDEX "professional_experience_professional_id_start_date_idx" ON "professional_experience"("professional_id", "start_date");

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industries" ADD CONSTRAINT "industries_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_standards" ADD CONSTRAINT "provider_standards_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_standards" ADD CONSTRAINT "provider_standards_standard_id_fkey" FOREIGN KEY ("standard_id") REFERENCES "standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_industries" ADD CONSTRAINT "provider_industries_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_industries" ADD CONSTRAINT "provider_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_locations" ADD CONSTRAINT "provider_locations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_locations" ADD CONSTRAINT "provider_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_experience" ADD CONSTRAINT "professional_experience_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Check constraints (not modelled by Prisma; enforced in the API as well)
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parent_not_self_chk" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
ALTER TABLE "industries" ADD CONSTRAINT "industries_parent_not_self_chk" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
ALTER TABLE "locations" ADD CONSTRAINT "locations_city_requires_state_chk" CHECK ("city" IS NULL OR "state" IS NOT NULL);
ALTER TABLE "locations" ADD CONSTRAINT "locations_latitude_range_chk" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90));
ALTER TABLE "locations" ADD CONSTRAINT "locations_longitude_range_chk" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_years_in_business_chk" CHECK ("years_in_business" IS NULL OR "years_in_business" >= 0);
ALTER TABLE "professional_profiles" ADD CONSTRAINT "professional_profiles_years_experience_chk" CHECK ("years_experience" IS NULL OR "years_experience" >= 0);
ALTER TABLE "professional_experience" ADD CONSTRAINT "professional_experience_dates_chk" CHECK ("end_date" IS NULL OR "end_date" >= "start_date");
