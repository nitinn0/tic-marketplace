-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('SUBMITTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "rfqs" (
    "id" UUID NOT NULL,
    "buyer_organization_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location_label" TEXT NOT NULL,
    "site_count" INTEGER NOT NULL,
    "employee_count" INTEGER NOT NULL,
    "timeline" TEXT,
    "status" "RfqStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_dispatches" (
    "id" UUID NOT NULL,
    "rfq_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "match_score" INTEGER NOT NULL,
    "match_reasons" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfq_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfq_quotes" (
    "id" UUID NOT NULL,
    "rfq_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "scope_notes" TEXT NOT NULL,
    "exclusions" TEXT,
    "timeline_days" INTEGER,
    "status" "QuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfq_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rfqs_buyer_organization_id_created_at_idx" ON "rfqs"("buyer_organization_id", "created_at");

-- CreateIndex
CREATE INDEX "rfqs_service_id_idx" ON "rfqs"("service_id");

-- CreateIndex
CREATE INDEX "rfqs_status_idx" ON "rfqs"("status");

-- CreateIndex
CREATE INDEX "rfq_dispatches_provider_id_created_at_idx" ON "rfq_dispatches"("provider_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_dispatches_rfq_id_provider_id_key" ON "rfq_dispatches"("rfq_id", "provider_id");

-- CreateIndex
CREATE INDEX "rfq_quotes_provider_id_idx" ON "rfq_quotes"("provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "rfq_quotes_rfq_id_provider_id_key" ON "rfq_quotes"("rfq_id", "provider_id");

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyer_organization_id_fkey" FOREIGN KEY ("buyer_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_dispatches" ADD CONSTRAINT "rfq_dispatches_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_dispatches" ADD CONSTRAINT "rfq_dispatches_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
