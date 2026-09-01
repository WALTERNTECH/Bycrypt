# Admin alert emails

Every signup and every deposit fires an email to the admin address. This
is what has to be true for one to arrive.

## How the app decides where to send

Settings are read from two places, and **the environment variable always
wins** over the database value:

| Setting | Env var | `secure_config` key |
| --- | --- | --- |
| Recipient | `ADMIN_NOTIFICATION_EMAIL` | `admin_notification_email` |
| From address | `ADMIN_NOTIFICATION_FROM` | `admin_notification_from` |
| Resend key | `RESEND_API_KEY` | `resend_api_key` |
| SMTP | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | same names |

A provider is considered configured when either all three SMTP values are
present, or a Resend key is. **With neither, sending is skipped silently**
— nothing errors, no mail arrives. That is the state Bycrypt was in: the
recipient was set, the provider was not.

Prefer Resend over SMTP here. Spaceship's shared hosting blocks outbound
SMTP ports on most plans; Resend goes out over HTTPS, which is never
blocked.

## Setting it up

1. Create a Resend account at <https://resend.com> using the address that
   should receive the alerts. **This matters** — see the limit below.
2. **API Keys → Create API Key.** Sending permission is enough.
3. Open the admin dashboard → **Config → Email**.
4. Paste the key into **Resend API key**, set **Admin notification email**
   to the address alerts should reach, and save.
5. Press **Send test email** on that same screen and confirm it arrives.

Nothing needs redeploying — the settings are read per send.

## The limit that catches people out

Until a domain is verified, Resend sends from the shared
`onboarding@resend.dev` sender and **will only deliver to the email
address that owns the Resend account**. Anything else comes back as a 403.

So the account in step 1 must be owned by the address you want alerted.
Krypton's key belongs to an account owned by riobasammy20@gmail.com, so
that is the only address it can reach until a domain is verified.

Two other things that produce the same 403:

- **Case.** Providers compare the recipient as an exact string, so
  `User@x.com` is rejected by an account registered as `user@x.com`. The
  app lower-cases the recipient on the way in to avoid this.
- **An unverified `from`.** Leave the From field blank until a domain is
  verified; the app defaults to a sender that works.

## After the domain is bought

Verifying the domain lifts the restriction — alerts can then go to any
address, from your own brand.

1. Resend → **Domains → Add Domain**, enter the domain.
2. Add the DNS records it shows (a DKIM `TXT`, and an SPF `TXT` on the
   sending subdomain) at the registrar. Verification usually completes
   within the hour.
3. Once it reads *Verified*, set **From address** in Config → Email to
   something on that domain, e.g. `Krypton Alerts <alerts@yourdomain>`.

Add a `DMARC` record (`_dmarc` `TXT`, starting at `v=DMARC1; p=none`) once
mail is flowing — without one, Gmail is markedly more likely to spam-file
a new sender.

## When mail still does not arrive

`Config → Email` reports which provider resolved and where each setting
came from (`env`, `database`, or `missing`), so start there. A send that
fails is logged and deliberately does not block the signup or deposit that
triggered it — a mail outage must never stop a user depositing.
