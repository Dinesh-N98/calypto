import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  assertOnePayConfigured,
  createOnePayCheckout,
  OnePayApiError,
  ONEPAY_CURRENCY,
} from "@/lib/onepay";

type CartItemPayload = { slug: string; quantity: number };
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
    typeof cartItem.slug === "string" &&
    cartItem.slug.length > 0 &&
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
  if (!Array.isArray(rawItems) || rawItems.length === 0 || !rawItems.every(isValidCartItem)) {
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
    const quantity = (quantities.get(item.slug) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity > 2_147_483_647) {
      return Response.json({ error: "One or more item quantities are invalid." }, { status: 400 });
    }
    quantities.set(item.slug, quantity);
  }

  const products = await prisma.product.findMany({
    where: { slug: { in: [...quantities.keys()] } },
    select: { slug: true, name: true, priceCents: true },
  });
  if (products.length !== quantities.size) {
    return Response.json(
      { error: "One or more products are no longer available." },
      { status: 400 },
    );
  }

  const orderItems = products.map((product) => ({
    productSlug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    quantity: quantities.get(product.slug) ?? 0,
  }));
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
  const order = await prisma.$transaction(async (transaction) => {
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
        items: { create: orderItems },
      },
    });
  });

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
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "failed" },
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
