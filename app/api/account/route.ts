import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Request origin could not be verified." }, { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Account deletion confirmation is required." }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !("confirmation" in body) ||
    body.confirmation !== "DELETE"
  ) {
    return Response.json({ error: 'Type "DELETE" to confirm account deletion.' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!user) return "not-found";
      if (user.role !== "CUSTOMER") return "forbidden";

      await transaction.order.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await transaction.user.delete({ where: { id: userId } });
      return "deleted";
    });

    if (result === "not-found") {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }
    if (result === "forbidden") {
      return Response.json({ error: "This account cannot be deleted here." }, { status: 403 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete customer account.", error);
    return Response.json(
      { error: "Unable to delete your account. Please try again." },
      { status: 500 },
    );
  }
}
