# Falco Services

Bilingual English/Arabic website for Falco’s wholesale Hajj and Umrah hotel
rooms. Admins add hotels, rooms, and photos, then assign open rooms to travel
agencies at an agreed price. The public site shows only rooms that are open.

## Requirements

- Node.js 22 LTS or newer
- npm

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Locale middleware redirects to `/en`; Arabic,
French, and Italian are available under `/ar`, `/fr`, and `/it`. The inventory
admin is at `http://localhost:3000/admin`.

Set `ADMIN_PASSWORD`, `DATABASE_URL`, and `BLOB_READ_WRITE_TOKEN` in
`.env.local` before signing in. Hotels, rooms, prices, and assignments are
stored in PostgreSQL. Photos are stored in Vercel Blob. Set the same variables
in Vercel before deploying.

## Checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

## Routes

- `/{locale}` — available-room showcase
- `/{locale}/hotels` — open hotel inventory
- `/{locale}/hotels/{id}` — hotel and room details
- `/{locale}/about` — company content
- `/{locale}/stay` — public nightly prices for individual travellers
- `/{locale}/book` — guest checkout for a priced room
- `/{locale}/contact` — agency allotment request
- `/admin` — hotels, rooms, photos, costs, agency assignments, and individual bookings

The forms validate input, reject honeypots and implausibly fast submissions,
apply a basic cooldown, send each accepted request to Falco through Resend, and
return a reference number.

## Vercel

Set the values from `.env.example` in the Vercel project. `RESEND_API_KEY` and
`FORM_FROM_EMAIL` are required for form delivery. The sender must use a domain
verified in the Resend account. Set `NEXT_PUBLIC_SITE_URL` to the production
domain so canonical URLs and the sitemap use the public address.

`FORM_TO_EMAIL` defaults to Falco’s official contact email when omitted.
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are required for individual
checkout. Point the Stripe webhook at `/api/stripe/webhook` and listen for
`checkout.session.completed` and `checkout.session.expired`. A booking is
confirmed only by that signed webhook.
