import { prisma } from "@/lib/prisma";

const ACTIVE_ATTEMPT_STATES = ["pending", "approved", "capturing", "reconciling"];

class ConcurrentPaymentTransitionError extends Error {}

export async function markPayPalAttemptApproved(attemptId: string): Promise<boolean> {
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: attemptId },
    select: { provider: true, status: true, order: { select: { status: true } } },
  });
  if (
    !attempt ||
    attempt.provider !== "PAYPAL" ||
    attempt.order.status !== "pending" ||
    attempt.status !== "pending"
  ) {
    return false;
  }
  const changed = await prisma.paymentAttempt.updateMany({
    where: { id: attemptId, provider: "PAYPAL", status: "pending" },
    data: { status: "approved" },
  });
  return changed.count === 1;
}

export async function markPayPalAttemptPaid({
  attemptId,
  captureId,
}: {
  attemptId: string;
  captureId: string;
}): Promise<boolean> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const attempt = await transaction.paymentAttempt.findUnique({
        where: { id: attemptId },
        select: {
          provider: true,
          status: true,
          amountCents: true,
          providerCaptureId: true,
          order: { select: { id: true, status: true, paymentProvider: true } },
        },
      });
      if (!attempt || attempt.provider !== "PAYPAL" || attempt.order.paymentProvider !== "PAYPAL") {
        return false;
      }
      if (["paid", "partially_refunded", "refunded"].includes(attempt.status)) {
        return attempt.providerCaptureId === captureId;
      }
      if (!ACTIVE_ATTEMPT_STATES.includes(attempt.status)) return false;

      if (attempt.order.status === "pending") {
        const orderChanged = await transaction.order.updateMany({
          where: { id: attempt.order.id, paymentProvider: "PAYPAL", status: "pending" },
          data: { status: "paid" },
        });
        if (orderChanged.count !== 1) throw new ConcurrentPaymentTransitionError();
      } else if (attempt.order.status !== "paid") {
        return false;
      }

      const attemptChanged = await transaction.paymentAttempt.updateMany({
        where: { id: attemptId, provider: "PAYPAL", status: { in: ACTIVE_ATTEMPT_STATES } },
        data: { status: "paid", providerCaptureId: captureId, paidAt: new Date() },
      });
      if (attemptChanged.count !== 1) throw new ConcurrentPaymentTransitionError();
      return true;
    });
  } catch (error) {
    if (error instanceof ConcurrentPaymentTransitionError) return false;
    throw error;
  }
}

export async function markPayPalAttemptRefunded({
  attemptId,
  captureId,
  refundedAmountCents,
}: {
  attemptId: string;
  captureId: string;
  refundedAmountCents: number;
}): Promise<boolean> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const attempt = await transaction.paymentAttempt.findUnique({
        where: { id: attemptId },
        select: {
          provider: true,
          status: true,
          providerCaptureId: true,
          refundedAmountCents: true,
          order: { select: { id: true, status: true, paymentProvider: true } },
        },
      });
      if (!attempt || attempt.provider !== "PAYPAL" || attempt.order.paymentProvider !== "PAYPAL") {
        return false;
      }
      if (
        ["partially_refunded", "refunded"].includes(attempt.status) &&
        refundedAmountCents <= attempt.refundedAmountCents
      ) {
        return attempt.providerCaptureId === captureId;
      }
      if (attempt.providerCaptureId && attempt.providerCaptureId !== captureId) return false;
      if (
        !ACTIVE_ATTEMPT_STATES.includes(attempt.status) &&
        attempt.status !== "paid" &&
        attempt.status !== "partially_refunded"
      ) {
        return false;
      }
      if (
        !["pending", "paid", "partially_refunded"].includes(attempt.order.status) ||
        refundedAmountCents < 1
      ) {
        return false;
      }

      const orderChanged = await transaction.order.updateMany({
        where: {
          id: attempt.order.id,
          paymentProvider: "PAYPAL",
          status: { in: ["pending", "paid", "partially_refunded"] },
        },
        data: {
          status: refundedAmountCents >= attempt.amountCents ? "refunded" : "partially_refunded",
        },
      });
      if (orderChanged.count !== 1) throw new ConcurrentPaymentTransitionError();
      const attemptChanged = await transaction.paymentAttempt.updateMany({
        where: {
          id: attemptId,
          provider: "PAYPAL",
          status: { in: [...ACTIVE_ATTEMPT_STATES, "paid", "partially_refunded"] },
        },
        data: {
          status: refundedAmountCents >= attempt.amountCents ? "refunded" : "partially_refunded",
          providerCaptureId: captureId,
          refundedAmountCents,
        },
      });
      if (attemptChanged.count !== 1) throw new ConcurrentPaymentTransitionError();
      return true;
    });
  } catch (error) {
    if (error instanceof ConcurrentPaymentTransitionError) return false;
    throw error;
  }
}

export async function finishPayPalAttemptWithoutPayment({
  attemptId,
  orderId,
  attemptStatus,
  orderStatus,
}: {
  attemptId: string;
  orderId: string;
  attemptStatus: "failed" | "cancelled";
  orderStatus: "failed" | "cancelled";
}): Promise<boolean> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({
        where: { id: orderId },
        select: { status: true, items: { select: { variantId: true, quantity: true } } },
      });
      if (!order || order.status !== "pending") return false;

      const attemptChanged = await transaction.paymentAttempt.updateMany({
        where: {
          id: attemptId,
          orderId,
          provider: "PAYPAL",
          status: { in: ACTIVE_ATTEMPT_STATES },
        },
        data: { status: attemptStatus },
      });
      if (attemptChanged.count !== 1) return false;

      const orderChanged = await transaction.order.updateMany({
        where: { id: orderId, paymentProvider: "PAYPAL", status: "pending" },
        data: { status: orderStatus },
      });
      if (orderChanged.count !== 1) throw new ConcurrentPaymentTransitionError();

      for (const item of order.items) {
        if (item.variantId) {
          await transaction.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      return true;
    });
  } catch (error) {
    if (error instanceof ConcurrentPaymentTransitionError) return false;
    throw error;
  }
}
