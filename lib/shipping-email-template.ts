export type ShippingEmailItem = {
  name: string;
  quantity: number;
};

export type ShippingEmailDetails = {
  customerName: string;
  orderReference: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  items: ShippingEmailItem[];
  orderUrl: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export function renderShippingEmail(details: ShippingEmailDetails): {
  html: string;
  text: string;
} {
  const customerName = escapeHtml(details.customerName);
  const orderReference = escapeHtml(details.orderReference);
  const carrier = escapeHtml(details.carrier);
  const trackingNumber = escapeHtml(details.trackingNumber);
  const trackingUrl = details.trackingUrl ? escapeHtml(details.trackingUrl) : null;
  const orderUrl = escapeHtml(details.orderUrl);
  const htmlItems = details.items
    .map(
      (item) => `<li style="margin:0 0 8px">${escapeHtml(item.name)} &times; ${item.quantity}</li>`,
    )
    .join("");
  const textItems = details.items.map((item) => `- ${item.name} x ${item.quantity}`).join("\n");

  return {
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f5f1;color:#161812;font-family:Arial,sans-serif">
    <main style="max-width:600px;margin:0 auto;padding:32px;background:#fff">
      <p style="font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#718126">Calypto order update</p>
      <h1 style="font-size:28px">Your order is on its way</h1>
      <p>Hi ${customerName},</p>
      <p>Order <strong>${orderReference}</strong> has shipped.</p>
      <p><strong>Carrier:</strong> ${carrier}<br>
      <strong>Tracking number:</strong> ${trackingNumber}</p>
      ${
        trackingUrl
          ? `<p><a href="${trackingUrl}" style="display:inline-block;padding:12px 18px;background:#171a14;color:#fff;text-decoration:none">Track your package</a></p>`
          : ""
      }
      <h2 style="font-size:18px">Items shipped</h2>
      <ul style="padding-left:20px">${htmlItems}</ul>
      <p><a href="${orderUrl}">View your orders</a></p>
    </main>
  </body>
</html>`,
    text: `Your order is on its way\n\nHi ${details.customerName},\nOrder ${details.orderReference} has shipped.\n\nCarrier: ${details.carrier}\nTracking number: ${details.trackingNumber}${details.trackingUrl ? `\nTrack your package: ${details.trackingUrl}` : ""}\n\nItems shipped:\n${textItems}\n\nView your orders: ${details.orderUrl}`,
  };
}
