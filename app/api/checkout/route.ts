import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateUnitPriceCents } from "@/lib/product-pricing";
import {
  assertOnePayConfigured,
  createOnePayCheckout,
  OnePayApiError,
  ONEPAY_CURRENCY,
} from "@/lib/onepay";

type CartItemPayload = { variantId: string; quantity: number };
type CheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};
type CheckoutAddress = {
  streetAddress: string;
  aptSuite: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidCartItem(item: unknown): item is CartItemPayload {
  if (!isObject(item)) return false;
  const cartItem = item;
  return (
    typeof cartItem.variantId === "string" &&
    cartItem.variantId.length > 0 &&
    cartItem.variantId.length <= 140 &&
    typeof cartItem.quantity === "number" &&
    Number.isSafeInteger(cartItem.quantity) &&
    cartItem.quantity > 0
  );
}

function parseCustomer(value: unknown): CheckoutCustomer | null {
  if (!isObject(value)) return null;
  const customer = value;
  const firstName = typeof customer.firstName === "string" ? customer.firstName.trim() : "";
  const lastName = typeof customer.lastName === "string" ? customer.lastName.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";

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
  const limits = {
    streetAddress: 200,
    aptSuite: 200,
    city: 100,
    state: 100,
    postalCode: 30,
    country: 100,
  } as const;
  const address: CheckoutAddress = {
    streetAddress: "",
    aptSuite: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  };

  const fields: (keyof CheckoutAddress)[] = [
    "streetAddress",
    "aptSuite",
    "city",
    "state",
    "postalCode",
    "country",
  ];
  for (const field of fields) {
    const rawValue = value[field];
    if (field === "aptSuite" && (rawValue === null || rawValue === undefined)) {
      address.aptSuite = "";
      continue;
    }
    if (typeof rawValue !== "string") return null;
    const trimmed = rawValue.trim();
    if (trimmed.length > limits[field] || (field !== "aptSuite" && !trimmed)) return null;
    address[field] = trimmed;
  }
  return address;
}

function getAppBaseUrl(): string | null {
  const value = process.env.APP_BASE_URL;
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const payload = isObject(body) ? body : null;
  const rawItems = payload?.items;
  const customer = parseCustomer(payload?.customer);
  const address = parseAddress(payload?.address);
  if (
    !Array.isArray(rawItems) ||
    rawItems.length === 0 ||
    rawItems.length > 100 ||
    !rawItems.every(isValidCartItem)
  ) {
    return Response.json({ error: "Your cart is empty or invalid." }, { status: 400 });
  }
  if (!customer) {
    return Response.json(
      {
        error: "Enter your first name, last name, email, and phone number in E.164 format.",
      },
      { status: 400 },
    );
  }
  if (!address || typeof payload?.saveAddress !== "boolean") {
    return Response.json({ error: "Enter a valid delivery address." }, { status: 400 });
  }

  const config = getAppBaseUrl();
  if (!config) {
    return Response.json({ error: "APP_BASE_URL must be a public HTTPS origin." }, { status: 500 });
  }
  try {
    assertOnePayConfigured();
  } catch {
    return Response.json({ error: "OnePay credentials are not configured." }, { status: 500 });
  }

  const quantities = new Map<string, number>();
  for (const item of rawItems) {
    const quantity = (quantities.get(item.variantId) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity > 2_147_483_647) {
      return Response.json({ error: "One or more item quantities are invalid." }, { status: 400 });
    }
    quantities.set(item.variantId, quantity);
  }

  const requestedIds = [...quantities.keys()].filter((id) => !id.startsWith("legacy:"));
  const legacySlugs = [...quantities.keys()]
    .filter((id) => id.startsWith("legacy:"))
    .map((id) => id.slice("legacy:".length));
  const variants = await prisma.productVariant.findMany({
    where: {
      OR: [
        ...(requestedIds.length > 0 ? [{ id: { in: requestedIds } }] : []),
        ...(legacySlugs.length > 0
          ? [{ product: { slug: { in: legacySlugs } } }]
          : []),
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
      imageUrl: true,
      product: {
        select: {
          slug: true,
          name: true,
          imageUrl: true,
          salePriceCents: true,
          saleEndsAt: true,
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
    const matchingVariants = variantsBySlug.get(requestedId.slice("legacy:".length)) ?? [];
    return matchingVariants.length === 1
      ? { variant: matchingVariants[0], quantity }
      : null;
  });
  if (resolvedItems.some((item) => item === null)) {
    return Response.json(
      { error: "One or more selected variants are no longer available." },
      { status: 400 },
    );
  }

  const quantityByProduct = new Map<string, number>();
  for (const item of resolvedItems) {
    if (!item) continue;
    const productSlug = item.variant.product.slug;
    quantityByProduct.set(productSlug, (quantityByProduct.get(productSlug) ?? 0) + item.quantity);
  }
  const orderItems = resolvedItems.filter((item) => item !== null).map(({ variant, quantity }) => {
    const variantLabel = [variant.color, variant.size].filter(Boolean).join(" / ");
    return {
      variantId: variant.id,
      sku: variant.sku,
      productSlug: variant.product.slug,
      name: variantLabel ? `${variant.product.name} — ${variantLabel}` : variant.product.name,
      imageUrl: variant.imageUrl ?? variant.product.imageUrl,
      priceCents: calculateUnitPriceCents({
        basePriceCents: variant.priceCents,
        variantDiscountPriceCents: variant.discountPriceCents,
        salePriceCents: variant.product.salePriceCents,
        saleEndsAt: variant.product.saleEndsAt,
        quantity: quantityByProduct.get(variant.product.slug) ?? quantity,
        tieredDiscounts: variant.product.tieredDiscounts,
      }),
      quantity,
    };
  });
  const totalCents = orderItems.reduce((total, item) => total + item.priceCents * item.quantity, 0);
  if (
    totalCents <= 0 ||
    !Number.isSafeInteger(totalCents) ||
    totalCents > 2_147_483_647 ||
    orderItems.some((item) => item.priceCents < 0 || item.quantity < 1)
  ) {
    return Response.json({ error: "The order total is invalid." }, { status: 400 });
  }

  const session = await auth();
  const reference = `CAL-${randomUUID().replaceAll("-", "").toUpperCase()}`;
  const userId = session?.user?.id ?? null;
  let order: { id: string };
  try {
    order = await prisma.$transaction(async (transaction) => {
      for (const item of orderItems) {
        const reserved = await transaction.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) throw new Error("INSUFFICIENT_VARIANT_STOCK");
      }

      if (userId && payload.saveAddress === true) {
        const savedAddressCount = await transaction.address.count({ where: { userId } });
        await transaction.address.create({
          data: {
            userId,
            line1: address.streetAddress,
            line2: address.aptSuite || null,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            isDefault: savedAddressCount === 0,
          },
        });
      }

      return transaction.order.create({
        data: {
          paymentProvider: "ONEPAY",
          providerReference: reference,
          currency: ONEPAY_CURRENCY,
          userId,
          email: customer.email,
          customerFirstName: customer.firstName,
          customerLastName: customer.lastName,
          customerPhone: customer.phone,
          totalCents,
          status: "pending",
          items: {
            create: orderItems.map((item) => ({
              variantId: item.variantId,
              sku: item.sku,
              productSlug: item.productSlug,
              name: item.name,
              priceCents: item.priceCents,
              quantity: item.quantity,
            })),
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_VARIANT_STOCK") {
      return Response.json(
        { error: "One or more variants no longer have enough stock. Update your cart and try again." },
        { status: 409 },
      );
    }
    throw error;
  }

  try {
    const checkout = await createOnePayCheckout({
      appBaseUrl: config,
      amountCents: totalCents,
      customer,
      reference,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { providerTransactionId: checkout.transactionId },
    });
    if (typeof checkout.redirectUrl !== "string") {
      throw new Error("OnePay did not return the documented checkout URL.");
    }
    const redirectUrl = new URL(checkout.redirectUrl);
    if (redirectUrl.protocol !== "https:") {
      throw new Error("OnePay returned a non-HTTPS checkout URL.");
    }
    return Response.json({ url: redirectUrl.toString() });
  } catch (error) {
    if (error instanceof OnePayApiError && error.status >= 400 && error.status < 500) {
      await prisma.$transaction(async (transaction) => {
        await transaction.order.update({
          where: { id: order.id },
          data: { status: "failed" },
        });
        for (const item of orderItems) {
          await transaction.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      });
    }
    console.error("Unable to start OnePay checkout.", error);
    return Response.json(
      {
        error:
          error instanceof OnePayApiError && error.status >= 400 && error.status < 500
            ? "OnePay rejected the checkout request. Please review your details and try again."
            : `Checkout could not be confirmed. Keep reference ${reference} and contact support if you were charged.`,
      },
      { status: 502 },
    );
  }
}
