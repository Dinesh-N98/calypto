CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'ONEPAY');

ALTER TABLE "Order"
ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN "providerTransactionId" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN "customerFirstName" TEXT,
ADD COLUMN "customerLastName" TEXT,
ADD COLUMN "customerPhone" TEXT;

ALTER TABLE "Order" RENAME COLUMN "stripeSessionId" TO "providerReference";
ALTER INDEX "Order_stripeSessionId_key" RENAME TO "Order_providerReference_key";

ALTER TABLE "Order"
ALTER COLUMN "paymentProvider" DROP DEFAULT,
ALTER COLUMN "currency" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'pending';

CREATE UNIQUE INDEX "Order_providerTransactionId_key" ON "Order"("providerTransactionId");
