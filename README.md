# Falco Services

Bilingual English/Arabic website for Falco’s Saudi Hajj and Umrah
ground-services business. The original `design.html` remains in the repository
as a visual reference.

## Requirements

- Node.js 22 LTS or newer
- npm

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Locale middleware redirects to `/en`; Arabic is
available under `/ar`.

## Checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

## Routes

- `/{locale}` — homepage
- `/{locale}/packages` — filterable package catalogue
- `/{locale}/packages/{slug}` — package details
- `/{locale}/services` — local service catalogue
- `/{locale}/agencies` — B2B proposition and agency application
- `/{locale}/about` — company content
- `/{locale}/contact` — traveller quotation form

The forms validate input, reject honeypots and implausibly fast submissions,
apply a basic cooldown, send each accepted request to Falco through Resend, and
return a reference number.

## Vercel

Set the values from `.env.example` in the Vercel project. `RESEND_API_KEY` and
`FORM_FROM_EMAIL` are required for form delivery. The sender must use a domain
verified in the Resend account. Set `NEXT_PUBLIC_SITE_URL` to the production
domain so canonical URLs and the sitemap use the public address.

`FORM_TO_EMAIL` defaults to Falco’s official contact email when omitted.
