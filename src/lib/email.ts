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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FORM_FROM_EMAIL;
  const to = process.env.FORM_TO_EMAIL ?? "Falco.services2026@gmail.com";

  if (!apiKey || !from) {
    throw new Error("FORM_DELIVERY_NOT_CONFIGURED");
  }

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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject: title,
      text: [`Reference: ${reference}`, "", ...lines].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(`FORM_DELIVERY_FAILED_${response.status}`);
  }
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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FORM_FROM_EMAIL;
  const to = process.env.FORM_TO_EMAIL ?? "Falco.services2026@gmail.com";
  if (!apiKey || !from) throw new Error("FORM_DELIVERY_NOT_CONFIGURED");

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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.email, to],
      reply_to: to,
      subject: `Booking confirmed — ${payload.reference}`,
      text,
    }),
  });
  if (!response.ok) throw new Error(`FORM_DELIVERY_FAILED_${response.status}`);
}
