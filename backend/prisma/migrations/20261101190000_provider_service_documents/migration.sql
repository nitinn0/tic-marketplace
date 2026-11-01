-- CreateTable
CREATE TABLE "provider_service_documents" (
    "id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_service_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_service_documents_provider_id_service_id_idx" ON "provider_service_documents"("provider_id", "service_id");

-- CreateIndex
CREATE INDEX "provider_service_documents_service_id_idx" ON "provider_service_documents"("service_id");

-- AddForeignKey
ALTER TABLE "provider_service_documents" ADD CONSTRAINT "provider_service_documents_provider_id_service_id_fkey" FOREIGN KEY ("provider_id", "service_id") REFERENCES "provider_services"("provider_id", "service_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_service_documents" ADD CONSTRAINT "provider_service_documents_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
