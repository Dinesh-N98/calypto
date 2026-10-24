# Calypto Email Architecture

This plan establishes a small, role-based email setup for Calypto's international
B2B and direct-to-consumer e-commerce operations. It separates human-monitored
inboxes from application-generated transactional mail.

## Phase 1: Day-One Implementation

| Email address | Recommended setup | Purpose |
| --- | --- | --- |
| `support@calyptobait.com` | Google Group | Receives contact-form submissions and customer questions in a shared, monitored destination. |
| `wholesale@calyptobait.com` | Google Group | Keeps B2B inquiries, pricing requests, and reseller conversations separate from consumer support. |
| `ops@calyptobait.com` | Google Group | Provides OnePay, PayPal, and shipping-carrier dashboards a monitored address for account and operational alerts. |
| `orders@calyptobait.com` | Resend transactional sender | Sends automated order, payment, and shipping receipts; set `Reply-To` to `support@calyptobait.com`. |

This minimum set covers customer support, wholesale leads, gateway and carrier
alerts, and automated receipts without creating an individual inbox for every
system. Use a Google Group where multiple people may need to monitor or respond
to messages.

Resend is an application email sender, not a mailbox: replies should route to a
monitored address such as `support@calyptobait.com`.

## Phase 2: Future Growth

| Email address | Recommended setup | Purpose |
| --- | --- | --- |
| `finance@calyptobait.com` | Google Workspace alias | Separates accounting, invoices, and finance correspondence as volume grows. |
| `legal@calyptobait.com` | Google Workspace alias | Separates contracts and legal notices from routine support communications. |
| `hr@calyptobait.com` | Google Workspace alias | Provides a distinct address for recruiting and personnel matters as the team grows. |
| `security@calyptobait.com` | Google Workspace alias | Establishes a clear contact for security reports and account-security notifications. |
| `vendors@calyptobait.com` | Google Workspace alias | Keeps supplier, manufacturer, and other vendor discussions organized. |
| `privacy@calyptobait.com` | Google Workspace alias | Provides a dedicated channel for privacy questions and personal-data requests. |

Workspace aliases route mail to an existing Workspace user; they do not provide
separate inboxes or logins. If multiple people need to monitor an address, use a
Google Group instead.

## Sending and Credential Setup

- Configure Resend with the `calyptobait.com` sending domain and verify SPF,
  DKIM, and DMARC before sending production email.
- Keep transactional receipts separate from marketing campaigns and honor
  applicable consent and unsubscribe requirements for marketing mail.
- Store provider credentials and service-account keys in deployment secrets or
  local environment files excluded from version control. Do not put private keys
  in this document or source control; rotate credentials if they are exposed.
