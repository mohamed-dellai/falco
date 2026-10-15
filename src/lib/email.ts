import { deliverBySmtp, type OutboundMail } from "@/lib/mail";

type SubmissionKind = "quote" | "agency";

type SubmissionPayload = Record<string, string | number | null | undefined>;

const labels: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "WhatsApp",
  country: "Country",
  arrival: "Expected arrival",
  travellers: "Travellers",
  requirements: "Requirements",
  packageSlug: "Requested plan",
  agencyName: "Agency",
  role: "Role",
  agencyWebsite: "Agency website",
  annualPilgrims: "Estimated annual pilgrims",
  markets: "Source markets",
};

export async function deliverSubmission(
  kind: SubmissionKind,
  payload: SubmissionPayload,
  reference: string,
) {
  const to = process.env.FORM_TO_EMAIL ?? "Falco.services2026@gmail.com";
  const title =
    kind === "quote"
      ? `New traveller quote — ${reference}`
      : `New agency application — ${reference}`;
  const lines = Object.entries(payload)
    .filter(
      ([key, value]) =>
        !["websiteField", "startedAt"].includes(key) &&
        value !== "" &&
        value !== undefined &&
        value !== null,
    )
    .map(([key, value]) => `${labels[key] ?? key}: ${String(value)}`);

  await deliver({
    to: [to],
    replyTo: typeof payload.email === "string" ? payload.email : undefined,
    subject: title,
    text: [`Reference: ${reference}`, "", ...lines].join("\n"),
  });
}

export async function deliverBooking(payload: {
  reference: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  hotel: string;
  room: string;
  checkIn: string;
  checkOut: string;
  quantity: number;
  travellers: number;
  total: number;
}) {
  const to = process.env.FORM_TO_EMAIL ?? "Falco.services2026@gmail.com";
  const amount = (payload.total / 100).toFixed(2);
  const text = [
    `Reference: ${payload.reference}`,
    `Guest: ${payload.name}`,
    `Email: ${payload.email}`,
    `WhatsApp: ${payload.phone}`,
    `Country: ${payload.country}`,
    `Hotel: ${payload.hotel}`,
    `Room: ${payload.room}`,
    `Stay: ${payload.checkIn} → ${payload.checkOut}`,
    `Rooms: ${payload.quantity}`,
    `Travellers: ${payload.travellers}`,
    `Total: SAR ${amount}`,
  ].join("\n");

  await deliver({
    to: [payload.email, to],
    replyTo: to,
    subject: `Booking confirmed — ${payload.reference}`,
    text,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function deliver(message: OutboundMail) {
  if (await deliverBySmtp(message)) return;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FORM_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("FORM_DELIVERY_NOT_CONFIGURED");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      cc: message.cc?.length ? message.cc : undefined,
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map((file) => ({
        filename: file.filename,
        content: file.content.toString("base64"),
      })),
    }),
  });
  if (!response.ok) throw new Error(`FORM_DELIVERY_FAILED_${response.status}`);
}

export async function deliverDeskMail(message: OutboundMail) {
  await deliver(message);
}

export async function deliverAdminCode(input: { to: string; code: string }) {
  const text = [
    "Falco desk code",
    "",
    `Your code is ${input.code}.`,
    "It expires in 10 minutes.",
    "It opens client contact details on this desk only.",
  ].join("\n");
  await deliver({
    to: [input.to],
    subject: "Falco desk code",
    text,
    html: `<p style="font-family:Arial,sans-serif;color:#172d47">Your Falco desk code is <strong>${escapeHtml(input.code)}</strong>. It expires in 10 minutes.</p>`,
  });
}
