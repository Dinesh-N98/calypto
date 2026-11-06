CREATE TABLE "SriLankaShippingRateSettings" (
    "id" TEXT NOT NULL DEFAULT 'LK',
    "underOneKgCents" INTEGER NOT NULL DEFAULT 300,
    "oneToThreeKgCents" INTEGER NOT NULL DEFAULT 500,
    "overThreeKgCents" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SriLankaShippingRateSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SriLankaShippingRateSettings" (
    "id",
    "underOneKgCents",
    "oneToThreeKgCents",
    "overThreeKgCents",
    "updatedAt"
) VALUES ('LK', 300, 500, 1000, CURRENT_TIMESTAMP);
