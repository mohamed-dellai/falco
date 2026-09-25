import { z } from "zod";

const baseFields = {
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40),
  country: z.string().trim().min(2).max(100),
  requirements: z.string().trim().min(10).max(2000),
  websiteField: z.string().max(0),
  startedAt: z.number().int().positive(),
};

export const quoteSchema = z.object({
  ...baseFields,
  arrival: z.string().trim(),
  travellers: z.number().int().min(1).max(10000),
  packageSlug: z.string().trim().max(100),
});

export const agencySchema = z.object({
  ...baseFields,
  agencyName: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(100),
  agencyWebsite: z.union([z.literal(""), z.string().trim().url().max(240)]),
  annualPilgrims: z.number().int().min(1).max(1000000),
  markets: z.string().trim().min(2).max(500),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type AgencyInput = z.infer<typeof agencySchema>;

export function validateSubmissionTiming(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  return elapsed >= 1800 && elapsed <= 24 * 60 * 60 * 1000;
}

export function createSubmissionReference(prefix: "FQ" | "FA") {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}
