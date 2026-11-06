"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, LockKeyhole, Pencil, Tag, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useCart } from "@/components/CartProvider";
import {
  CheckoutForm,
  type CheckoutAddress,
  type CheckoutPaymentProvider,
  type CheckoutProfile,
  type CheckoutReviewData,
} from "@/components/CheckoutForm";
import { QuantitySelector } from "@/components/QuantitySelector";
import { formatPrice } from "@/lib/currency";
import { productImageBlurDataURL } from "@/lib/productImagePlaceholder";

type CheckoutSummaryItem = {
  variantId: string;
  imageUrl: string;
  name: string;
  variantLabel?: string;
  priceCents: number;
  quantity: number;
};

export default function CartPageClient({
  savedAddresses,
  defaultAddress,
  profile,
  isAuthenticated,
  buyNowVariantId,
  buyNowQuantity,
  startAtCheckout = false,
}: {
  savedAddresses: CheckoutAddress[];
  defaultAddress: CheckoutAddress | null;
  profile: CheckoutProfile | null;
  isAuthenticated: boolean;
  buyNowVariantId?: string;
  buyNowQuantity: number;
  startAtCheckout?: boolean;
}) {
  const { items, updateQuantity, removeItem } = useCart();
  const [directPurchaseQuantity, setDirectPurchaseQuantity] = useState(buyNowQuantity);
  const [paymentProvider, setPaymentProvider] = useState<CheckoutPaymentProvider>("ONEPAY");
  const [shippingCents, setShippingCents] = useState<number | null>(null);
  const [isCheckoutStep, setIsCheckoutStep] = useState(startAtCheckout);
  const [checkoutStep, setCheckoutStep] = useState<2 | 3 | 4 | 5>(2);
  const [reviewData, setReviewData] = useState<CheckoutReviewData | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountMessage, setDiscountMessage] = useState("");
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
  const purchaseItems = useMemo(
    () =>
      buyNowVariantId
        ? items.flatMap((item) =>
            item.variantId === buyNowVariantId
              ? [{ ...item, quantity: directPurchaseQuantity }]
              : [],
          )
        : items,
    [buyNowVariantId, directPurchaseQuantity, items],
  );
  const checkoutItems = useMemo(
    () => purchaseItems.map(({ variantId, quantity }) => ({ variantId, quantity })),
    [purchaseItems],
  );
  const subtotalCents = purchaseItems.reduce(
    (total, item) => total + item.priceCents * item.quantity,
    0,
  );
  const purchaseItemCount = purchaseItems.reduce((count, item) => count + item.quantity, 0);

  function applyDiscountCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDiscountMessage(
      discountCode.trim()
        ? "Discount codes are applied manually when you send your order inquiry. Add your code in the inquiry form."
        : "Enter a discount code first.",
    );
  }

  function returnToCart() {
    setIsCheckoutStep(false);
    setCheckoutStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const checkoutHref = buyNowVariantId
    ? `/checkout?buyNow=${encodeURIComponent(buyNowVariantId)}&quantity=${directPurchaseQuantity}`
    : "/checkout";

  return (
    <main className="min-h-[65vh] bg-paper px-4 pb-32 pt-7 text-ink sm:px-6 sm:pt-10 lg:px-8 lg:pb-16">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 border-b border-[rgba(13,14,12,.14)] pb-5 sm:mb-9 sm:pb-6">
          <p className="text-[.65rem] font-bold uppercase tracking-[.16em] text-olive">
            Calypto / {isCheckoutStep ? "Checkout" : "Your cart"}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black leading-tight tracking-[-.045em] sm:text-4xl">
                {isCheckoutStep ? "Delivery & payment" : "Your cart"}
              </h1>
              <p className="mt-1.5 text-sm text-[#55584e]">
                {isCheckoutStep
                  ? "Add your delivery details to continue securely."
                  : `${purchaseItemCount} ${purchaseItemCount === 1 ? "item" : "items"} ready for review`}
              </p>
            </div>
            <ol
              aria-label="Checkout progress"
              className="flex max-w-full flex-wrap items-center gap-x-1 gap-y-2 text-[10px] font-semibold sm:gap-2 sm:text-xs"
            >
              {(
                [
                  ["Cart", !isCheckoutStep, isCheckoutStep],
                  [
                    "Details",
                    isCheckoutStep && checkoutStep === 2,
                    isCheckoutStep && checkoutStep > 2,
                  ],
                  [
                    "Delivery",
                    isCheckoutStep && checkoutStep === 3,
                    isCheckoutStep && checkoutStep > 3,
                  ],
                  [
                    "Payment",
                    isCheckoutStep && checkoutStep === 4,
                    isCheckoutStep && checkoutStep > 4,
                  ],
                  ["Review", isCheckoutStep && checkoutStep === 5, false],
                ] as const
              ).map(([label, current, complete], index) => (
                <li className="flex items-center gap-1 whitespace-nowrap sm:gap-2" key={label}>
                  <span
                    aria-current={current ? "step" : undefined}
                    className={`grid h-6 w-6 place-items-center rounded-full border sm:h-7 sm:w-7 ${
                      current || complete
                        ? "border-olive bg-olive text-white"
                        : "border-[#c8c8bc] text-[#77796f]"
                    }`}
                  >
                    {complete ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className={current || complete ? "text-olive" : "text-[#77796f]"}>
                    {label}
                  </span>
                  {index < 4 && (
                    <span aria-hidden="true" className="h-px w-1 bg-[#c8c8bc] sm:w-5" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </header>

        {purchaseItems.length === 0 ? (
          <section
            aria-labelledby="empty-cart-title"
            className="rounded-2xl border border-[#ddddd3] bg-white p-6 sm:p-10"
          >
            <h2 className="text-xl font-bold tracking-tight" id="empty-cart-title">
              Your cart is empty
            </h2>
            <p className="mt-2 text-sm text-[#55584e]">Find something made for your next cast.</p>
            <Link
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#a3bd32] px-5 text-sm font-bold text-[#0d0e0c] transition-colors hover:bg-[#829b22] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
              href="/shop"
              style={{ backgroundColor: "#a3bd32", color: "#0d0e0c" }}
            >
              Browse the lineup
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            <section aria-label="Cart review" hidden={isCheckoutStep}>
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(19rem,1fr)] lg:gap-8">
                <div className="grid min-w-0 gap-3">
                  {purchaseItems.map((item) => (
                    <article
                      className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-xl border border-[#ddddd3] bg-white p-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-5 sm:p-4"
                      key={item.variantId}
                    >
                      <div className="relative row-span-2 aspect-square w-full self-start overflow-hidden rounded-lg bg-[#efeee7]">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL={productImageBlurDataURL}
                          sizes="(min-width: 640px) 112px, 84px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0 self-end">
                        <h2 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base">
                          {item.name}
                        </h2>
                        {item.variantLabel && (
                          <p className="mt-1 text-xs text-[#62665b]">
                            {item.variantLabel}
                            {item.sku ? ` · SKU ${item.sku}` : ""}
                          </p>
                        )}
                        <p className="mt-1.5 text-sm font-semibold">
                          {formatPrice(item.priceCents)}
                        </p>
                      </div>
                      <div className="col-start-2 flex min-w-0 items-center justify-between gap-2 self-end">
                        <QuantitySelector
                          label={item.name}
                          value={item.quantity}
                          onChange={(quantity) => {
                            if (buyNowVariantId === item.variantId) {
                              setDirectPurchaseQuantity(quantity);
                            }
                            updateQuantity(item.variantId, quantity);
                          }}
                        />
                        <button
                          aria-label={`Remove ${item.name} from cart`}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold text-[#62665b] transition-colors hover:bg-[#f5f4ef] hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                          onClick={() => removeItem(item.variantId)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    </article>
                  ))}
                  <Link
                    className="mt-1 inline-flex min-h-11 w-fit items-center gap-2 px-1 text-sm font-semibold text-olive hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                    href="/shop"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Continue shopping
                  </Link>
                </div>

                <aside
                  aria-labelledby="order-summary-title"
                  className="sticky top-24 hidden rounded-2xl border border-[#ddddd3] bg-white p-5 sm:p-6 lg:block"
                >
                  <OrderSummary
                    checkoutHref={checkoutHref}
                    subtotalCents={subtotalCents}
                    shippingCents={shippingCents}
                    discountCode={discountCode}
                    discountInputId="desktop-discount-code"
                    onDiscountCodeChange={(value) => {
                      setDiscountCode(value);
                      setDiscountMessage("");
                    }}
                    onApplyDiscount={applyDiscountCode}
                    discountMessage={discountMessage}
                  />
                </aside>
              </div>

              <details className="mt-5 rounded-xl border border-[#ddddd3] bg-white p-4 sm:p-5 lg:hidden">
                <summary className="cursor-pointer list-none text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive">
                  <span
                    className="flex items-center justify-between gap-3"
                    id="mobile-order-summary-title"
                  >
                    Order summary
                    <span className="text-sm font-semibold text-olive">
                      {formatPrice(subtotalCents)}
                    </span>
                  </span>
                </summary>
                <div className="mt-4 flex justify-between border-t border-[#e5e5dc] pt-4 text-sm">
                  <span className="text-[#62665b]">Subtotal</span>
                  <span className="font-semibold">{formatPrice(subtotalCents)}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#62665b]">
                  Shipping is calculated at checkout.
                </p>
                <DiscountCodeEntry
                  code={discountCode}
                  inputId="mobile-discount-code"
                  onCodeChange={(value) => {
                    setDiscountCode(value);
                    setDiscountMessage("");
                  }}
                  onApply={applyDiscountCode}
                  message={discountMessage}
                />
              </details>
            </section>

            <section aria-label="Delivery and payment" hidden={!isCheckoutStep}>
              <button
                className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-olive hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                onClick={returnToCart}
                type="button"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back to cart
              </button>
              <MobileCheckoutSummary
                items={purchaseItems}
                subtotalCents={subtotalCents}
                shippingCents={shippingCents}
                paymentProvider={paymentProvider}
              />
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(19rem,1fr)] lg:gap-8">
                <div className="rounded-2xl border border-[#ddddd3] bg-white p-4 sm:p-6">
                  {checkoutStep < 5 && (
                    <div className="mb-6">
                      <p className="text-[.65rem] font-bold uppercase tracking-[.14em] text-olive">
                        Step {checkoutStep} of 5
                      </p>
                      <h2 className="mt-2 text-xl font-black tracking-tight">
                        {checkoutStep === 2
                          ? "Your contact details"
                          : checkoutStep === 3
                            ? "Your delivery details"
                            : "Choose your payment method"}
                      </h2>
                      <p className="mt-1 text-sm text-[#62665b]">
                        {checkoutStep === 2
                          ? "We'll use this to send your order confirmation and delivery updates."
                          : checkoutStep === 3
                            ? "Where should we send your order?"
                            : "Complete your secure payment to place the order."}
                      </p>
                    </div>
                  )}
                  {checkoutStep === 5 && reviewData && (
                    <CheckoutReview
                      data={reviewData}
                      items={purchaseItems}
                      onEdit={(step) => setCheckoutStep(step)}
                      shippingCents={shippingCents}
                      subtotalCents={subtotalCents}
                    />
                  )}
                  <CheckoutForm
                    currentStep={checkoutStep}
                    defaultAddress={defaultAddress}
                    isAuthenticated={isAuthenticated}
                    items={checkoutItems}
                    profile={profile}
                    paymentProvider={paymentProvider}
                    paypalClientId={paypalClientId}
                    savedAddresses={savedAddresses}
                    onPaymentProviderChange={setPaymentProvider}
                    onReviewDataChange={setReviewData}
                    onShippingCostChange={setShippingCents}
                    onStepChange={setCheckoutStep}
                  />
                </div>
                <aside className="rounded-2xl border border-[#ddddd3] bg-white p-5 sm:p-6 lg:sticky lg:top-24">
                  <h2 className="text-base font-bold">Order summary</h2>
                  <div className="mt-4 max-h-64 space-y-3 overflow-y-auto border-b border-[#e5e5dc] pb-4">
                    {purchaseItems.map((item) => (
                      <div className="flex gap-3 text-sm" key={item.variantId}>
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#efeee7]">
                          <Image
                            alt=""
                            fill
                            sizes="56px"
                            src={item.imageUrl}
                            className="object-contain p-1"
                            placeholder="blur"
                            blurDataURL={productImageBlurDataURL}
                          />
                        </div>
                        <span className="min-w-0 flex-1 text-[#62665b]">
                          <span className="block font-semibold text-ink">{item.name}</span>
                          <span className="mt-0.5 block text-xs">
                            {item.variantLabel} · Qty {item.quantity}
                          </span>
                        </span>
                        <span className="shrink-0 font-medium">
                          {formatPrice(item.priceCents * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <SummaryTotals subtotalCents={subtotalCents} shippingCents={shippingCents} />
                  <p className="mt-4 flex items-center gap-2 text-xs text-[#62665b]">
                    <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                    Secure checkout powered by {paymentProvider === "ONEPAY" ? "OnePay" : "PayPal"}.
                  </p>
                </aside>
              </div>
            </section>

            {!isCheckoutStep && (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ddddd3] bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(13,14,12,.08)] backdrop-blur sm:px-6 lg:hidden">
                <div className="mx-auto flex max-w-7xl items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[.65rem] font-semibold uppercase tracking-[.1em] text-[#62665b]">
                      Total
                    </p>
                    <p className="truncate text-lg font-bold">{formatPrice(subtotalCents)}</p>
                  </div>
                  <Link
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-olive px-4 text-sm font-bold text-white transition-colors hover:bg-[#56651f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:flex-none sm:px-6"
                    href={checkoutHref}
                  >
                    Proceed to checkout
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function OrderSummary({
  checkoutHref,
  subtotalCents,
  shippingCents,
  discountCode,
  discountInputId,
  onDiscountCodeChange,
  onApplyDiscount,
  discountMessage,
}: {
  checkoutHref: string;
  subtotalCents: number;
  shippingCents: number | null;
  discountCode: string;
  discountInputId: string;
  onDiscountCodeChange: (value: string) => void;
  onApplyDiscount: (event: FormEvent<HTMLFormElement>) => void;
  discountMessage: string;
}) {
  return (
    <>
      <h2 className="text-lg font-bold" id="order-summary-title">
        Order summary
      </h2>
      <div className="mt-5">
        <SummaryTotals subtotalCents={subtotalCents} shippingCents={shippingCents} />
      </div>
      <DiscountCodeEntry
        code={discountCode}
        inputId={discountInputId}
        onCodeChange={onDiscountCodeChange}
        onApply={onApplyDiscount}
        message={discountMessage}
      />
      <Link
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-olive px-4 text-sm font-bold text-white transition-colors hover:bg-[#56651f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        href={checkoutHref}
      >
        Proceed to checkout
        <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
      </Link>
      <p className="mt-3 text-center text-xs text-[#62665b]">Shipping is calculated at checkout.</p>
    </>
  );
}

function CheckoutReview({
  data,
  items,
  onEdit,
  shippingCents,
  subtotalCents,
}: {
  data: CheckoutReviewData;
  items: CheckoutSummaryItem[];
  onEdit: (step: 2 | 3 | 4) => void;
  shippingCents: number | null;
  subtotalCents: number;
}) {
  return (
    <section
      aria-labelledby="checkout-review-title"
      className="mb-6 grid gap-4 border-b border-[#e5e5dc] pb-6"
    >
      <div>
        <p className="text-[.65rem] font-bold uppercase tracking-[.14em] text-olive">Step 5 of 5</p>
        <h2 className="mt-2 text-xl font-black tracking-tight" id="checkout-review-title">
          Review your order
        </h2>
        <p className="mt-1 text-sm text-[#62665b]">Check your details before completing payment.</p>
      </div>
      <ReviewCard title="Contact information" onEdit={() => onEdit(2)}>
        <p>
          {data.contact.firstName} {data.contact.lastName}
        </p>
        <p>{data.contact.email}</p>
        <p>{data.contact.phone}</p>
      </ReviewCard>
      <ReviewCard title="Delivery address" onEdit={() => onEdit(3)}>
        <p>{data.address.line1}</p>
        {data.address.line2 && <p>{data.address.line2}</p>}
        {data.address.line3 && <p>{data.address.line3}</p>}
        <p>
          {data.address.city}, {data.address.state} {data.address.postalCode}
        </p>
        <p>{data.address.country}</p>
        <p className="mt-2 font-semibold">
          {data.shipping.label}{" "}
          <span className="font-normal">
            {shippingCents === null ? "—" : formatPrice(shippingCents)}
          </span>
        </p>
      </ReviewCard>
      <ReviewCard title="Payment method" onEdit={() => onEdit(4)}>
        <p className="font-semibold">{data.paymentProvider === "ONEPAY" ? "OnePay" : "PayPal"}</p>
      </ReviewCard>
      <div className="rounded-xl bg-[#f7f8f1] p-4">
        <h3 className="font-bold">Order summary</h3>
        <div className="mt-3 grid gap-2 text-sm">
          {items.map((item) => (
            <div className="flex justify-between gap-4" key={item.variantId}>
              <span className="text-[#62665b]">
                {item.name} × {item.quantity}
              </span>
              <span className="font-semibold">{formatPrice(item.priceCents * item.quantity)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-[#ddddd3] pt-3 font-bold">
            <span>Total</span>
            <span>{formatPrice(subtotalCents + (shippingCents ?? 0))}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewCard({
  title,
  children,
  onEdit,
}: {
  title: string;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <section className="rounded-xl border border-[#ddddd3] p-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-bold">{title}</h3>
        <button
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-olive hover:bg-[#f7f8f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
          onClick={onEdit}
          type="button"
        >
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
      <div className="mt-2 text-sm leading-6 text-[#62665b]">{children}</div>
    </section>
  );
}

function SummaryTotals({
  subtotalCents,
  shippingCents,
}: {
  subtotalCents: number;
  shippingCents: number | null;
}) {
  const totalCents = subtotalCents + (shippingCents ?? 0);
  return (
    <dl className="grid gap-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-[#62665b]">Subtotal</dt>
        <dd className="font-semibold">{formatPrice(subtotalCents)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-[#62665b]">Shipping</dt>
        <dd className="text-right text-xs text-[#62665b]">
          {shippingCents === null ? "Calculated at checkout" : formatPrice(shippingCents)}
        </dd>
      </div>
      <div className="mt-1 flex justify-between gap-4 border-t border-[#e5e5dc] pt-4">
        <dt className="font-bold">Total</dt>
        <dd className="text-lg font-bold">{formatPrice(totalCents)}</dd>
      </div>
    </dl>
  );
}

function MobileCheckoutSummary({
  items,
  subtotalCents,
  shippingCents,
  paymentProvider,
}: {
  items: CheckoutSummaryItem[];
  subtotalCents: number;
  shippingCents: number | null;
  paymentProvider: CheckoutPaymentProvider;
}) {
  const totalCents = subtotalCents + (shippingCents ?? 0);
  return (
    <details className="mb-5 rounded-2xl border border-[#ddddd3] bg-white p-4 lg:hidden">
      <summary className="cursor-pointer list-none text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive">
        <span className="flex items-center justify-between gap-3">
          <span>Order summary</span>
          <span className="shrink-0 text-sm font-semibold text-olive">
            {formatPrice(totalCents)}
          </span>
        </span>
      </summary>
      <div className="mt-4 space-y-3 border-t border-[#e5e5dc] pt-4">
        {items.map((item) => (
          <div className="flex gap-3 text-sm" key={item.variantId}>
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#efeee7]">
              <Image
                alt=""
                fill
                sizes="56px"
                src={item.imageUrl}
                className="object-contain p-1"
                placeholder="blur"
                blurDataURL={productImageBlurDataURL}
              />
            </div>
            <span className="min-w-0 flex-1 text-[#62665b]">
              <span className="block font-semibold text-ink">{item.name}</span>
              {item.variantLabel && (
                <span className="mt-0.5 block text-xs">{item.variantLabel}</span>
              )}
              <span className="mt-0.5 block text-xs">Qty {item.quantity}</span>
            </span>
            <span className="shrink-0 font-medium">
              {formatPrice(item.priceCents * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-[#e5e5dc] pt-4">
        <SummaryTotals subtotalCents={subtotalCents} shippingCents={shippingCents} />
        <p className="mt-4 flex items-center gap-2 text-xs text-[#62665b]">
          <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
          Secure checkout powered by {paymentProvider === "ONEPAY" ? "OnePay" : "PayPal"}.
        </p>
      </div>
    </details>
  );
}

function DiscountCodeEntry({
  code,
  inputId,
  onCodeChange,
  onApply,
  message,
}: {
  code: string;
  inputId: string;
  onCodeChange: (value: string) => void;
  onApply: (event: FormEvent<HTMLFormElement>) => void;
  message: string;
}) {
  return (
    <form className="mt-5 border-t border-[#e5e5dc] pt-4" onSubmit={onApply}>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold" htmlFor={inputId}>
        <Tag aria-hidden="true" className="h-4 w-4 text-olive" />
        Discount code
      </label>
      <div className="flex gap-2">
        <input
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#c9cabe] bg-white px-3 text-sm uppercase outline-none transition focus:border-olive focus:ring-2 focus:ring-olive/20"
          id={inputId}
          maxLength={50}
          onChange={(event) => onCodeChange(event.currentTarget.value)}
          placeholder="Enter code"
          type="text"
          value={code}
        />
        <button
          className="min-h-11 rounded-lg border border-ink px-4 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
          type="submit"
        >
          Apply
        </button>
      </div>
      {message && (
        <p aria-live="polite" className="mt-2 text-xs leading-relaxed text-[#62665b]">
          {message}
        </p>
      )}
    </form>
  );
}
