"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CalendarSwitch, DateField } from "@/components/calendar-date-field";
import {
  agencySchema,
  quoteSchema,
  type AgencyInput,
  type QuoteInput,
} from "@/lib/forms";

type ApiResult = {
  ok: boolean;
  reference?: string;
  code?: string;
};

const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20";

function SubmissionStatus({
  status,
  reference,
}: {
  status: "idle" | "success" | "error";
  reference: string;
}) {
  const t = useTranslations("Form");
  if (status === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-5 flex items-start gap-2 rounded-lg p-4 text-sm ${
        status === "success"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800"
      }`}
    >
      {status === "success" && <CheckCircle2 className="mt-0.5" size={17} />}
      <span>
        {status === "success" ? t("success", { reference }) : t("error")}
      </span>
    </div>
  );
}

export function QuoteForm({
  packageSlug = "",
  arrival = "",
  departure = "",
  roomCount = 1,
}: {
  packageSlug?: string;
  arrival?: string;
  departure?: string;
  roomCount?: number;
}) {
  const t = useTranslations("Form");
  const calendar = useTranslations("Calendar");
  const locale = useLocale();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [reference, setReference] = useState("");
  const [startedAt] = useState(() => Date.now());

  const form = useForm<QuoteInput>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      agencyName: "",
      name: "",
      email: "",
      phone: "",
      country: "",
      arrival,
      departure,
      travellers: 1,
      roomCount,
      requirements: "",
      packageSlug,
      websiteField: "",
      startedAt,
    },
  });

  async function submit(values: QuoteInput) {
    setStatus("idle");
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.reference) throw new Error(result.code);

      setReference(result.reference);
      setStatus("success");
      form.reset({
        ...form.getValues(),
        agencyName: "",
        name: "",
        email: "",
        phone: "",
        country: "",
        arrival: "",
        departure: "",
        travellers: 1,
        roomCount: 1,
        requirements: "",
        websiteField: "",
        startedAt,
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="rounded-2xl border border-line bg-white p-5 md:p-7"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("agencyName")}
          error={!!form.formState.errors.agencyName}
          className="sm:col-span-2"
        >
          <input {...form.register("agencyName")} className={inputClass} />
        </Field>
        <Field label={t("name")} error={!!form.formState.errors.name}>
          <input
            {...form.register("name")}
            autoComplete="name"
            className={inputClass}
          />
        </Field>
        <Field label={t("email")} error={!!form.formState.errors.email}>
          <input
            {...form.register("email")}
            type="email"
            autoComplete="email"
            className={inputClass}
          />
        </Field>
        <Field label={t("phone")} error={!!form.formState.errors.phone}>
          <input
            {...form.register("phone")}
            type="tel"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>
        <Field label={t("country")} error={!!form.formState.errors.country}>
          <input
            {...form.register("country")}
            autoComplete="country-name"
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <CalendarSwitch
            label={calendar("label")}
            normal={calendar("normal")}
            arabic={calendar("arabic")}
            variant="public"
          />
        </div>
        <Field label={t("arrival")} error={!!form.formState.errors.arrival}>
          <Controller
            name="arrival"
            control={form.control}
            render={({ field }) => (
              <DateField
                name={field.name}
                label={t("arrival")}
                locale={locale}
                variant="public"
                value={field.value}
                onChange={field.onChange}
                className={inputClass}
              />
            )}
          />
        </Field>
        <Field label={t("departure")} error={!!form.formState.errors.departure}>
          <Controller
            name="departure"
            control={form.control}
            render={({ field }) => (
              <DateField
                name={field.name}
                label={t("departure")}
                locale={locale}
                variant="public"
                value={field.value}
                onChange={field.onChange}
                className={inputClass}
              />
            )}
          />
        </Field>
        <Field
          label={t("travellers")}
          error={!!form.formState.errors.travellers}
        >
          <input
            {...form.register("travellers", { valueAsNumber: true })}
            type="number"
            min={1}
            className={inputClass}
          />
        </Field>
        <Field label={t("rooms")} error={!!form.formState.errors.roomCount}>
          <input
            {...form.register("roomCount", { valueAsNumber: true })}
            type="number"
            min={1}
            className={inputClass}
          />
        </Field>
        <Field
          label={t("requirements")}
          error={!!form.formState.errors.requirements}
          className="sm:col-span-2"
        >
          <textarea
            {...form.register("requirements")}
            className={`${inputClass} min-h-32 resize-y`}
          />
        </Field>
      </div>
      <input
        {...form.register("websiteField")}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] size-px opacity-0"
      />
      <input
        {...form.register("startedAt", { valueAsNumber: true })}
        type="hidden"
      />
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
      >
        <Send size={17} />
        {form.formState.isSubmitting ? t("sending") : t("submitQuote")}
      </button>
      <input type="hidden" {...form.register("packageSlug")} />
      <SubmissionStatus status={status} reference={reference} />
    </form>
  );
}

export function AgencyForm() {
  const t = useTranslations("Form");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [reference, setReference] = useState("");
  const [startedAt] = useState(() => Date.now());

  const form = useForm<AgencyInput>({
    resolver: zodResolver(agencySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      country: "",
      requirements: "",
      agencyName: "",
      role: "",
      agencyWebsite: "",
      annualPilgrims: 1,
      markets: "",
      websiteField: "",
      startedAt,
    },
  });

  async function submit(values: AgencyInput) {
    setStatus("idle");
    try {
      const response = await fetch("/api/agency-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.reference) throw new Error(result.code);

      setReference(result.reference);
      setStatus("success");
      form.reset({
        name: "",
        email: "",
        phone: "",
        country: "",
        requirements: "",
        agencyName: "",
        role: "",
        agencyWebsite: "",
        annualPilgrims: 1,
        markets: "",
        websiteField: "",
        startedAt,
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="rounded-2xl border border-line bg-white p-5 md:p-7"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("agencyName")}
          error={!!form.formState.errors.agencyName}
        >
          <input {...form.register("agencyName")} className={inputClass} />
        </Field>
        <Field label={t("name")} error={!!form.formState.errors.name}>
          <input
            {...form.register("name")}
            autoComplete="name"
            className={inputClass}
          />
        </Field>
        <Field label={t("role")} error={!!form.formState.errors.role}>
          <input {...form.register("role")} className={inputClass} />
        </Field>
        <Field label={t("email")} error={!!form.formState.errors.email}>
          <input
            {...form.register("email")}
            type="email"
            autoComplete="email"
            className={inputClass}
          />
        </Field>
        <Field label={t("phone")} error={!!form.formState.errors.phone}>
          <input
            {...form.register("phone")}
            type="tel"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>
        <Field label={t("country")} error={!!form.formState.errors.country}>
          <input
            {...form.register("country")}
            autoComplete="country-name"
            className={inputClass}
          />
        </Field>
        <Field
          label={t("website")}
          error={!!form.formState.errors.agencyWebsite}
        >
          <input
            {...form.register("agencyWebsite")}
            type="url"
            className={inputClass}
          />
        </Field>
        <Field
          label={t("annualPilgrims")}
          error={!!form.formState.errors.annualPilgrims}
        >
          <input
            {...form.register("annualPilgrims", { valueAsNumber: true })}
            type="number"
            min={1}
            className={inputClass}
          />
        </Field>
        <Field label={t("markets")} error={!!form.formState.errors.markets}>
          <input {...form.register("markets")} className={inputClass} />
        </Field>
        <Field
          label={t("requirements")}
          error={!!form.formState.errors.requirements}
          className="sm:col-span-2"
        >
          <textarea
            {...form.register("requirements")}
            className={`${inputClass} min-h-32 resize-y`}
          />
        </Field>
      </div>
      <input
        {...form.register("websiteField")}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] size-px opacity-0"
      />
      <input
        {...form.register("startedAt", { valueAsNumber: true })}
        type="hidden"
      />
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
      >
        <Send size={17} />
        {form.formState.isSubmitting ? t("sending") : t("submitAgency")}
      </button>
      <SubmissionStatus status={status} reference={reference} />
    </form>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("Form");
  return (
    <label
      className={`grid gap-1.5 text-xs font-bold text-primary ${className}`}
    >
      {label}
      {children}
      {error && (
        <span className="font-medium text-red-700">{t("required")}</span>
      )}
    </label>
  );
}
