import { createHash, randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { CHECKOUT_CURRENCY } from "@/lib/checkout/constants";
import { prisma } from "@/lib/prisma";
import { calculateUnitPriceCents } from "@/lib/product-pricing";
import { getDhlConfig } from "@/lib/config/dhl";
import { buildDhlPackage, type DhlPackage } from "@/lib/dhl/rate";
import { getCheckoutShippingRates } from "@/lib/checkout/sri-lanka-shipping";
import type { PaymentProvider } from "@prisma/client";
import type { CheckoutAddress, CheckoutCustomer, CheckoutPayload } from "@/lib/checkout/types";
import { isDhlCountryCode, normalizeCountryCode } from "@/lib/checkout/international";

type OrderItemSnapshot = {
  variantId: string;
  sku: string;
  productSlug: string;
  name: string;
  priceCents: number;
  quantity: number;
  inventoryTracked: boolean;
};

type PackageVariant = {
  quantity: number;
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
};

export class CheckoutInputError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CheckoutInputError";
  }
}

export class InsufficientStockError extends Error {
  constructor() {
    super("One or more variants no longer have enough stock.");
    this.name = "InsufficientStockError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CHECKOUT_ITEM_LIMIT = 100;
const CHECKOUT_QUANTITY_LIMIT = 1_000;

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseCustomer(value: unknown): CheckoutCustomer | null {
  if (!isObject(value)) return null;
  if (!hasOnlyKeys(value, ["firstName", "lastName", "email", "phone"])) return null;
  const firstName = typeof value.firstName === "string" ? value.firstName.trim() : "";
  const lastName = typeof value.lastName === "string" ? value.lastName.trim() : "";
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const phone = typeof value.phone === "string" ? value.phone.trim() : "";

  if (
    !firstName ||
    firstName.length > 100 ||
    !lastName ||
    lastName.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ||
    email.length > 254 ||
    !/^\+[1-9]\d{7,14}$/u.test(phone)
  ) {
    return null;
  }
  return { firstName, lastName, email, phone };
}

function parseAddress(value: unknown): CheckoutAddress | null {
  if (!isObject(value)) return null;
  if (
    !hasOnlyKeys(value, [
      "streetAddress",
      "aptSuite",
      "addressLine3",
      "city",
      "state",
      "postalCode",
      "country",
    ])
  )
    return null;
  const limits = {
    streetAddress: 200,
    aptSuite: 200,
    city: 100,
    state: 100,
    postalCode: 30,
    addressLine3: 70,
    country: 100,
  } as const;
  const address: CheckoutAddress = {
    streetAddress: "",
    aptSuite: "",
    addressLine3: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  };
  const fields: (keyof CheckoutAddress)[] = [
    "streetAddress",
    "aptSuite",
    "addressLine3",
    "city",
    "state",
    "postalCode",
    "country",
  ];

  for (const field of fields) {
    const raw = value[field];
    if ((field === "aptSuite" || field === "addressLine3") && (raw === null || raw === undefined)) {
      address[field] = "";
      continue;
    }
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (
      trimmed.length > limits[field] ||
      (field !== "aptSuite" && field !== "addressLine3" && !trimmed)
    ) {
      return null;
    }
    address[field] = trimmed;
  }
  return address;
}

export function parseCheckoutPayload(value: unknown): CheckoutPayload {
  if (
    !isObject(value) ||
    !hasOnlyKeys(value, ["items", "customer", "address", "saveAddress", "shippingServiceCode"]) ||
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > CHECKOUT_ITEM_LIMIT
  ) {
    throw new CheckoutInputError("Your cart is empty or invalid.");
  }

  const items: CheckoutPayload["items"] = [];
  for (const item of value.items) {
    if (
      !isObject(item) ||
      !hasOnlyKeys(item, ["variantId", "quantity"]) ||
      typeof item.variantId !== "string" ||
      item.variantId.length < 1 ||
      item.variantId.length > 140 ||
      typeof item.quantity !== "number" ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > CHECKOUT_QUANTITY_LIMIT
    ) {
      throw new CheckoutInputError("Your cart is empty or invalid.");
    }
    items.push({ variantId: item.variantId, quantity: item.quantity });
  }

  const customer = parseCustomer(value.customer);
  if (!customer) {
    throw new CheckoutInputError(
      "Enter your first name, last name, email, and phone number in E.164 format.",
    );
  }
  const address = parseAddress(value.address);
  if (!address || typeof value.saveAddress !== "boolean") {
    throw new CheckoutInputError("Enter a valid delivery address.");
  }
  address.country = normalizeCountryCode(address.country);
  if (!isDhlCountryCode(address.country)) {
    throw new CheckoutInputError("Choose a supported two-letter destination country.");
  }
  const shippingServiceCode =
    value.shippingServiceCode === undefined
      ? undefined
      : typeof value.shippingServiceCode === "string" &&
          /^[A-Za-z0-9_-]{1,30}$/u.test(value.shippingServiceCode)
        ? value.shippingServiceCode
        : (() => {
            throw new CheckoutInputError("The selected shipping service is invalid.");
          })();
  return { items, customer, address, saveAddress: value.saveAddress, shippingServiceCode };
}

export async function createPendingCheckoutOrder({
  payload,
  provider,
  idempotencyKey,
}: {
  payload: CheckoutPayload;
  provider: PaymentProvider;
  idempotencyKey?: string;
}) {
  const quantities = new Map<string, number>();
  for (const item of payload.items) {
    const quantity = (quantities.get(item.variantId) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity > 2_147_483_647) {
      throw new CheckoutInputError("One or more item quantities are invalid.");
    }
    quantities.set(item.variantId, quantity);
  }

  const requestedIds = [...quantities.keys()].filter((id) => !id.startsWith("legacy:"));
  const legacySlugs = [...quantities.keys()]
    .filter((id) => id.startsWith("legacy:"))
    .map((id) => id.slice("legacy:".length));
  const variants = await prisma.productVariant.findMany({
    where: {
      AND: [
        {
          OR: [
            ...(requestedIds.length ? [{ id: { in: requestedIds } }] : []),
            ...(legacySlugs.length ? [{ product: { slug: { in: legacySlugs } } }] : []),
          ],
        },
        { product: { is: { isActive: true } } },
      ],
    },
    select: {
      id: true,
      sku: true,
      priceCents: true,
      discountPriceCents: true,
      stock: true,
      size: true,
      color: true,
      weightKg: true,
      lengthCm: true,
      widthCm: true,
      heightCm: true,
      product: {
        select: {
          slug: true,
          name: true,
          imageUrl: true,
          salePriceCents: true,
          saleEndsAt: true,
          trackInventory: true,
          tieredDiscountsEnabled: true,
          category: { select: { tieredDiscountsEnabled: true } },
          tieredDiscounts: { select: { minQuantity: true, discountPercentage: true } },
        },
      },
    },
  });
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const variantsBySlug = new Map<string, typeof variants>();
  for (const variant of variants) {
    const productVariants = variantsBySlug.get(variant.product.slug) ?? [];
    productVariants.push(variant);
    variantsBySlug.set(variant.product.slug, productVariants);
  }
  const resolvedItems = [...quantities.entries()].map(([requestedId, quantity]) => {
    if (!requestedId.startsWith("legacy:")) {
      const variant = variantsById.get(requestedId);
      return variant ? { variant, quantity } : null;
    }
    const matching = variantsBySlug.get(requestedId.slice("legacy:".length)) ?? [];
    return matching.length === 1 ? { variant: matching[0], quantity } : null;
  });
  if (resolvedItems.some((item) => item === null)) {
    throw new CheckoutInputError("One or more selected variants are no longer available.");
  }

  const quantityByProduct = new Map<string, number>();
  for (const item of resolvedItems) {
    if (!item) continue;
    const slug = item.variant.product.slug;
    quantityByProduct.set(slug, (quantityByProduct.get(slug) ?? 0) + item.quantity);
  }
  const orderItems: OrderItemSnapshot[] = resolvedItems
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map(({ variant, quantity }) => {
      const variantLabel = [variant.color, variant.size].filter(Boolean).join(" / ");
      return {
        variantId: variant.id,
        sku: variant.sku,
        productSlug: variant.product.slug,
        name: variantLabel ? `${variant.product.name} — ${variantLabel}` : variant.product.name,
        priceCents: calculateUnitPriceCents({
          basePriceCents: variant.priceCents,
          variantDiscountPriceCents: variant.discountPriceCents,
          salePriceCents: variant.product.salePriceCents,
          saleEndsAt: variant.product.saleEndsAt,
          quantity: quantityByProduct.get(variant.product.slug) ?? quantity,
          tieredDiscounts: variant.product.tieredDiscounts,
          tieredDiscountsEnabled:
            variant.product.tieredDiscountsEnabled ??
            variant.product.category.tieredDiscountsEnabled,
        }),
        quantity,
        inventoryTracked: variant.product.trackInventory,
      };
    });
  const totalCents = orderItems.reduce((total, item) => total + item.priceCents * item.quantity, 0);
  if (
    totalCents <= 0 ||
    !Number.isSafeInteger(totalCents) ||
    totalCents > 2_147_483_647 ||
    orderItems.some((item) => item.priceCents < 0 || item.quantity < 1)
  ) {
    throw new CheckoutInputError("The order total is invalid.");
  }

  let shippingCents = 0;
  let shippingServiceCode: string | null = null;
  if (!payload.shippingServiceCode) {
    throw new CheckoutInputError("Select a shipping option before continuing to payment.");
  }
  const config = getDhlConfig();
  const packageVariants: PackageVariant[] = resolvedItems
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map(({ variant, quantity }) => ({
      quantity,
      weightKg: variant.weightKg,
      lengthCm: variant.lengthCm,
      widthCm: variant.widthCm,
      heightCm: variant.heightCm,
    }));
  const packages: DhlPackage[] = [buildDhlPackage(packageVariants, config.defaultPackage)];
  let rates: Awaited<ReturnType<typeof getCheckoutShippingRates>>;
  try {
    rates = await getCheckoutShippingRates({
      recipient: {
        streetLines: [
          payload.address.streetAddress,
          payload.address.aptSuite,
          payload.address.addressLine3,
        ].filter((line): line is string => Boolean(line)),
        city: payload.address.city,
        postalCode: payload.address.postalCode,
        countryCode: normalizeCountryCode(payload.address.country),
        stateOrProvinceCode: payload.address.state || undefined,
      },
      packages,
    });
  } catch (error) {
    console.error("Unable to calculate checkout shipping rate.", error);
    throw new CheckoutInputError("Shipping rates are temporarily unavailable.", 503);
  }
  const selected = rates.find((rate) => rate.serviceCode === payload.shippingServiceCode);
  if (!selected)
    throw new CheckoutInputError("The selected shipping option is no longer available.", 409);
  if (
    selected.currency !== CHECKOUT_CURRENCY ||
    !Number.isFinite(selected.amount) ||
    selected.amount <= 0
  ) {
    throw new CheckoutInputError(
      "The shipping quote uses a currency that cannot be charged at checkout.",
      502,
    );
  }
  shippingCents = Math.ceil(selected.amount * 100);
  shippingServiceCode = selected.serviceCode ?? null;
  const grandTotalCents = totalCents + shippingCents;
  if (!Number.isSafeInteger(grandTotalCents) || grandTotalCents > 2_147_483_647) {
    throw new CheckoutInputError("The order total is invalid.");
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const reference = `CAL-${randomUUID().replaceAll("-", "").slice(0, 17).toUpperCase()}`;
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    for (const item of orderItems) {
      if (item.inventoryTracked) {
        const reserved = await transaction.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: { gte: item.quantity },
            product: { is: { isActive: true, trackInventory: true } },
          },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) throw new InsufficientStockError();
      }
    }

    if (userId && payload.saveAddress) {
      const count = await transaction.address.count({ where: { userId } });
      await transaction.address.create({
        data: {
          userId,
          line1: payload.address.streetAddress,
          line2: payload.address.aptSuite || null,
          city: payload.address.city,
          state: payload.address.state,
          postalCode: payload.address.postalCode,
          country: payload.address.country,
          isDefault: count === 0,
        },
      });
    }

    const order = await transaction.order.create({
      data: {
        paymentProvider: provider,
        providerReference: reference,
        currency: CHECKOUT_CURRENCY,
        userId,
        email: payload.customer.email,
        customerFirstName: payload.customer.firstName,
        customerLastName: payload.customer.lastName,
        customerPhone: payload.customer.phone,
        shippingName: `${payload.customer.firstName} ${payload.customer.lastName}`,
        shippingLine1: payload.address.streetAddress,
        shippingLine2: payload.address.aptSuite || null,
        shippingCity: payload.address.city,
        shippingState: payload.address.state,
        shippingPostalCode: payload.address.postalCode,
        shippingCountry: payload.address.country,
        totalCents: grandTotalCents,
        shippingCents,
        shippingServiceCode,
        status: "pending",
        items: {
          create: orderItems.map((item) => ({
            variantId: item.variantId,
            sku: item.sku,
            productSlug: item.productSlug,
            name: item.name,
            priceCents: item.priceCents,
            quantity: item.quantity,
            inventoryTracked: item.inventoryTracked,
          })),
        },
      },
      select: {
        id: true,
        providerReference: true,
        totalCents: true,
        shippingCents: true,
        shippingServiceCode: true,
        currency: true,
        userId: true,
      },
    });

    if (idempotencyKey) {
      await transaction.paymentAttempt.create({
        data: {
          orderId: order.id,
          provider,
          amountCents: grandTotalCents,
          currency: CHECKOUT_CURRENCY,
          idempotencyKey,
          requestHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
          captureRequestId: randomUUID(),
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        },
      });
    }

    return { ...order, orderItems, customer: payload.customer, address: payload.address };
  });
}

export async function releaseOrderInventory(
  orderId: string,
  expectedStatus: string,
  nextStatus: "failed" | "cancelled",
) {
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        items: { select: { variantId: true, quantity: true, inventoryTracked: true } },
      },
    });
    if (!order || order.status !== expectedStatus) return false;

    const changed = await transaction.order.updateMany({
      where: { id: orderId, status: expectedStatus },
      data: { status: nextStatus },
    });
    if (changed.count !== 1) return false;

    for (const item of order.items) {
      if (item.variantId && item.inventoryTracked) {
        await transaction.productVariant.updateMany({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    return true;
  });
}
