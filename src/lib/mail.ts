import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import nodemailer from "nodemailer";
import { execute, query } from "@/lib/db";

export type MailSecurity = "starttls" | "ssl" | "none";

export type MailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  security: MailSecurity;
  username: string;
  passwordSet: boolean;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  allowPrivateCert: boolean;
};

type MailRow = {
  enabled: boolean;
  host: string;
  port: number;
  security: string;
  username: string;
  password_cipher: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  allow_private_cert: boolean;
};

export type OutboundMail = {
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
};

const empty: MailSettings = {
  enabled: false,
  host: "",
  port: 587,
  security: "starttls",
  username: "",
  passwordSet: false,
  fromName: "",
  fromEmail: "",
  replyTo: "",
  allowPrivateCert: false,
};

function secret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "falco-development-session"
  );
}

function key() {
  return createHash("sha256").update(secret()).digest();
}

function seal(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, body].map((part) => part.toString("base64url")).join(".");
}

function open(packed: string) {
  const [iv, tag, body] = packed.split(".");
  if (!iv || !tag || !body) return "";
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function securityOf(value: string): MailSecurity {
  if (value === "ssl" || value === "none") return value;
  return "starttls";
}

function mapRow(row: MailRow): MailSettings {
  return {
    enabled: row.enabled,
    host: row.host,
    port: row.port,
    security: securityOf(row.security),
    username: row.username,
    passwordSet: row.password_cipher.length > 0,
    fromName: row.from_name,
    fromEmail: row.from_email,
    replyTo: row.reply_to,
    allowPrivateCert: row.allow_private_cert,
  };
}

async function row() {
  const rows = await query<MailRow>(
    `SELECT enabled, host, port, security, username, password_cipher, from_name,
            from_email, reply_to, allow_private_cert
     FROM mail_settings WHERE id = 'default'`,
  );
  return rows[0] ?? null;
}

export async function getMailSettings() {
  const stored = await row();
  return stored ? mapRow(stored) : empty;
}

function validEmail(email: string) {
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validHost(host: string) {
  if (host.length > 253) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
    host,
  );
}

export function mailDraft(input: {
  enabled: boolean;
  host: string;
  port: number;
  security: string;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  allowPrivateCert: boolean;
  passwordSet: boolean;
}) {
  const host = input.host.trim().toLowerCase();
  const username = input.username.trim();
  const fromEmail = input.fromEmail.trim();
  const replyTo = input.replyTo.trim();
  const fromName = input.fromName.replace(/[\r\n"]/g, "").trim().slice(0, 80);
  const security = securityOf(input.security);
  if (
    !validHost(host) ||
    !Number.isInteger(input.port) ||
    input.port < 1 ||
    input.port > 65535 ||
    username.length > 160 ||
    input.password.length > 200 ||
    /[\r\n]/.test(username) ||
    /[\r\n]/.test(input.password) ||
    !validEmail(fromEmail) ||
    (replyTo !== "" && !validEmail(replyTo))
  ) {
    return null;
  }
  if (input.enabled && username && !input.password && !input.passwordSet) return null;
  return {
    enabled: input.enabled,
    host,
    port: input.port,
    security,
    username,
    password: input.password,
    fromName,
    fromEmail,
    replyTo,
    allowPrivateCert: input.allowPrivateCert,
  };
}

export async function saveMailSettings(
  input: NonNullable<ReturnType<typeof mailDraft>>,
) {
  const stored = await row();
  const cipher = input.password
    ? seal(input.password)
    : (stored?.password_cipher ?? "");
  if (input.enabled && input.username && !cipher) return false;
  await execute(
    `INSERT INTO mail_settings
      (id, enabled, host, port, security, username, password_cipher, from_name,
       from_email, reply_to, allow_private_cert)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       host = EXCLUDED.host,
       port = EXCLUDED.port,
       security = EXCLUDED.security,
       username = EXCLUDED.username,
       password_cipher = EXCLUDED.password_cipher,
       from_name = EXCLUDED.from_name,
       from_email = EXCLUDED.from_email,
       reply_to = EXCLUDED.reply_to,
       allow_private_cert = EXCLUDED.allow_private_cert`,
    [
      input.enabled,
      input.host,
      input.port,
      input.security,
      input.username,
      cipher,
      input.fromName,
      input.fromEmail,
      input.replyTo,
      input.allowPrivateCert,
    ],
  );
  return true;
}

type LiveMail = MailSettings & { password: string };

async function liveMail(options?: { requireEnabled?: boolean }): Promise<LiveMail | null> {
  const stored = await row();
  if (!stored?.host || !stored.from_email) return null;
  if (options?.requireEnabled !== false && !stored.enabled) return null;
  let password = "";
  if (stored.password_cipher) {
    try {
      password = open(stored.password_cipher);
    } catch {
      throw new Error("MAIL_SECRET");
    }
  }
  if (stored.username && !password) return null;
  return { ...mapRow(stored), password };
}

function fromHeader(settings: LiveMail) {
  return settings.fromName
    ? `"${settings.fromName}" <${settings.fromEmail}>`
    : settings.fromEmail;
}

export function mailErrorCode(error: unknown) {
  const fault = error as { code?: string; responseCode?: number; message?: string };
  const message = `${fault.code ?? ""} ${fault.message ?? ""}`.toLowerCase();
  if (
    message.includes("certificate") ||
    message.includes("self signed") ||
    message.includes("unable to verify")
  ) {
    return "mail-tls";
  }
  if (
    fault.code === "EAUTH" ||
    fault.responseCode === 535 ||
    fault.responseCode === 534 ||
    message.includes("authentication") ||
    message.includes("invalid login")
  ) {
    return "mail-auth";
  }
  if (
    fault.code === "ETIMEDOUT" ||
    fault.code === "ECONNREFUSED" ||
    fault.code === "ENOTFOUND" ||
    fault.code === "ECONNECTION" ||
    fault.code === "EDNS" ||
    fault.code === "EHOSTUNREACH"
  ) {
    return "mail-connect";
  }
  return "mail-failed";
}

async function transport(settings: LiveMail) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.security === "ssl",
    auth: settings.username
      ? { user: settings.username, pass: settings.password }
      : undefined,
    requireTLS: settings.security === "starttls",
    ignoreTLS: settings.security === "none",
    tls: settings.allowPrivateCert ? { rejectUnauthorized: false } : undefined,
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });
}

export async function deliverBySmtp(message: OutboundMail) {
  const settings = await liveMail();
  if (!settings) return false;
  const sender = await transport(settings);
  await sender.sendMail({
    from: fromHeader(settings),
    to: message.to,
    cc: message.cc?.length ? message.cc : undefined,
    replyTo: message.replyTo || settings.replyTo || undefined,
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: message.attachments?.map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType,
    })),
  });
  return true;
}

export async function sendMailTest(to: string) {
  if (!validEmail(to)) return "invalid" as const;
  const settings = await liveMail({ requireEnabled: false });
  if (!settings) return "mail-missing" as const;
  const sender = await transport(settings);
  await sender.verify();
  await sender.sendMail({
    from: fromHeader(settings),
    to,
    replyTo: settings.replyTo || undefined,
    subject: "Falco mail test",
    text: "This is a test from the Falco desk. The mail server answered.",
  });
  return "sent" as const;
}
