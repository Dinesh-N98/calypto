CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED');

CREATE TYPE "CrmInteractionType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'OTHER');

ALTER TABLE "Lead"
ADD COLUMN "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Lead"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

ALTER TABLE "Lead"
ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE TABLE "CrmInteraction" (
    "id" TEXT NOT NULL,
    "type" "CrmInteractionType" NOT NULL DEFAULT 'NOTE',
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "customerId" TEXT,
    "leadId" TEXT,
    "orderId" TEXT,

    CONSTRAINT "CrmInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmInteraction_customerId_occurredAt_idx"
ON "CrmInteraction"("customerId", "occurredAt");

CREATE INDEX "CrmInteraction_leadId_occurredAt_idx"
ON "CrmInteraction"("leadId", "occurredAt");

CREATE INDEX "CrmInteraction_orderId_occurredAt_idx"
ON "CrmInteraction"("orderId", "occurredAt");

CREATE INDEX "Lead_status_updatedAt_idx"
ON "Lead"("status", "updatedAt");

ALTER TABLE "CrmInteraction"
ADD CONSTRAINT "CrmInteraction_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CrmInteraction"
ADD CONSTRAINT "CrmInteraction_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmInteraction"
ADD CONSTRAINT "CrmInteraction_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CrmInteraction"
ADD CONSTRAINT "CrmInteraction_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
