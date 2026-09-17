export function formatPrice(priceCents: number): string {
  const rupees = Math.round(priceCents / 100);
  return `Rs. ${rupees.toLocaleString("en-US")}`;
}