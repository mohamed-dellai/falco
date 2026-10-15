import { notFound, redirect } from "next/navigation";
import { requestAgencyCancellationAction } from "@/app/[locale]/hotels/agency-actions";
import { AgencyPortalNav } from "@/components/agency-portal-nav";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentAgency } from "@/lib/agency-auth";
import { formatDate, formatMoney } from "@/lib/money";
import {
  getAgencyReservation,
  listReservationEvents,
} from "@/lib/reservations";
import { mealPlanLabel, roomTypeLabel } from "@/lib/room-types";
import { whatsappUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function labels(locale: Locale) {
  if (locale === "fr")
    return {
      back: "Réservations",
      voucher: "Ouvrir le voucher",
      stay: "Séjour",
      created: "Créée",
      rooms: "Chambres",
      total: "Total agence",
      notes: "Notes",
      room: "Type de chambre",
      meal: "Repas et vue",
      qty: "Qté",
      rate: "Tarif / nuit",
      amount: "Montant",
      terms: "Conditions acceptées",
      accepted: "Acceptées par {name} le {date}",
      general: "Général",
      cancellation: "Annulation",
      payment: "Paiement",
      release: "Libération",
      releaseNote:
        "Note contractuelle seulement. Les chambres ne sont pas libérées automatiquement.",
      days: "jours",
      requestCancellation: "Demander l’annulation",
      reason: "Motif de la demande",
      reasonHint: "Expliquez la modification ou l’annulation demandée.",
      send: "Envoyer la demande",
      requested: "Votre demande d’annulation a été transmise à Falco.",
      requestedAlready: "Annulation demandée",
      request: "Demande",
      provisional: "Option",
      confirmed: "Confirmée",
      cancelled: "Annulée",
      no_show: "No-show",
      regret: "Non disponible",
      room_only: "Sans repas",
      breakfast: "Petit-déjeuner",
      half_board: "Demi-pension",
      full_board: "Pension complète",
      solo: "Individuelle",
      double: "Double",
      triple: "Triple",
      quad: "Quadruple",
      holdUntil: "Option valable jusqu’au {date}",
      share: "Partager la réservation",
      emailShare: "Partager par e-mail",
      whatsappShare: "Partager sur WhatsApp",
      timeline: "Suivi de la réservation",
      noEvents: "Aucune mise à jour pour le moment.",
    };
  if (locale === "ar")
    return {
      back: "الحجوزات",
      voucher: "فتح القسيمة",
      stay: "الإقامة",
      created: "تاريخ الإنشاء",
      rooms: "الغرف",
      total: "إجمالي الوكالة",
      notes: "ملاحظات",
      room: "نوع الغرفة",
      meal: "الوجبات والإطلالة",
      qty: "العدد",
      rate: "السعر / الليلة",
      amount: "المبلغ",
      terms: "الشروط المقبولة",
      accepted: "وافق عليها {name} بتاريخ {date}",
      general: "عام",
      cancellation: "الإلغاء",
      payment: "الدفع",
      release: "مهلة التأكيد",
      releaseNote: "ملاحظة تعاقدية فقط. لا يتم تحرير الغرف تلقائيًا.",
      days: "أيام",
      requestCancellation: "طلب الإلغاء",
      reason: "سبب الطلب",
      reasonHint: "اشرح التعديل أو الإلغاء المطلوب.",
      send: "إرسال الطلب",
      requested: "تم إرسال طلب الإلغاء إلى فالكو.",
      requestedAlready: "تم طلب الإلغاء",
      request: "طلب",
      provisional: "مؤقت",
      confirmed: "مؤكد",
      cancelled: "ملغي",
      no_show: "عدم حضور",
      regret: "غير متاح",
      room_only: "بدون وجبات",
      breakfast: "إفطار",
      half_board: "نصف إقامة",
      full_board: "إقامة كاملة",
      solo: "فردية",
      double: "مزدوجة",
      triple: "ثلاثية",
      quad: "رباعية",
      holdUntil: "الحجز المؤقت صالح حتى {date}",
      share: "مشاركة الحجز",
      emailShare: "مشاركة بالبريد",
      whatsappShare: "مشاركة عبر واتساب",
      timeline: "سجل الحجز",
      noEvents: "لا توجد تحديثات حتى الآن.",
    };
  if (locale === "it")
    return {
      back: "Prenotazioni",
      voucher: "Apri voucher",
      stay: "Soggiorno",
      created: "Creata",
      rooms: "Camere",
      total: "Totale agenzia",
      notes: "Note",
      room: "Tipologia",
      meal: "Pasti e vista",
      qty: "Qtà",
      rate: "Tariffa / notte",
      amount: "Importo",
      terms: "Condizioni accettate",
      accepted: "Accettate da {name} il {date}",
      general: "Generali",
      cancellation: "Cancellazione",
      payment: "Pagamento",
      release: "Rilascio",
      releaseNote:
        "Solo nota contrattuale. Le camere non vengono rilasciate automaticamente.",
      days: "giorni",
      requestCancellation: "Richiedi cancellazione",
      reason: "Motivo della richiesta",
      reasonHint: "Descrivi la modifica o cancellazione richiesta.",
      send: "Invia richiesta",
      requested: "La richiesta di cancellazione è stata inviata a Falco.",
      requestedAlready: "Cancellazione richiesta",
      request: "Richiesta",
      provisional: "Opzione",
      confirmed: "Confermata",
      cancelled: "Annullata",
      no_show: "No-show",
      regret: "Non disponible",
      room_only: "Senza pasti",
      breakfast: "Colazione",
      half_board: "Mezza pensione",
      full_board: "Pensione completa",
      solo: "Singola",
      double: "Doppia",
      triple: "Tripla",
      quad: "Quadrupla",
      holdUntil: "Opzione valida fino al {date}",
      share: "Condividi prenotazione",
      emailShare: "Condividi via e-mail",
      whatsappShare: "Condividi su WhatsApp",
      timeline: "Cronologia prenotazione",
      noEvents: "Nessun aggiornamento al momento.",
    };
  return {
    back: "Reservations",
    voucher: "Open voucher",
    stay: "Stay",
    created: "Created",
    rooms: "Rooms",
    total: "Agency total",
    notes: "Notes",
    room: "Room type",
    meal: "Meals and view",
    qty: "Qty",
    rate: "Rate / night",
    amount: "Amount",
    terms: "Accepted booking terms",
    accepted: "Accepted by {name} on {date}",
    general: "General",
    cancellation: "Cancellation",
    payment: "Payment",
    release: "Release",
    releaseNote:
      "Contract note only. Rooms are not released automatically.",
    days: "days",
    requestCancellation: "Request cancellation",
    reason: "Reason for request",
    reasonHint: "Explain the requested change or cancellation.",
    send: "Send request",
    requested: "Your cancellation request was sent to Falco.",
    requestedAlready: "Cancellation requested",
    request: "Request",
    provisional: "Hold",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    no_show: "No-show",
    regret: "Cannot provide",
    room_only: "No meals",
    breakfast: "Breakfast",
    half_board: "Half board",
    full_board: "Full board",
    solo: "Solo",
    double: "Double",
    triple: "Triple",
    quad: "Quad",
    holdUntil: "Hold valid until {date}",
    share: "Share reservation",
    emailShare: "Share by email",
    whatsappShare: "Share on WhatsApp",
    timeline: "Reservation timeline",
    noEvents: "No updates yet.",
  };
}

const visibleEventTypes = new Set([
  "reservation_created",
  "reservation_requested",
  "reservation_held",
  "hold_created",
  "hold_expired",
  "reservation_confirmed",
  "reservation_cancelled",
  "cancellation_requested",
  "agency_email",
]);

const eventLabels: Record<string, Record<Locale, string>> = {
  reservation_created: {
    en: "Reservation created",
    fr: "Réservation créée",
    ar: "تم إنشاء الحجز",
    it: "Prenotazione creata",
  },
  reservation_requested: {
    en: "Request received",
    fr: "Demande reçue",
    ar: "تم استلام الطلب",
    it: "Richiesta ricevuta",
  },
  reservation_held: {
    en: "Rooms held",
    fr: "Chambres bloquées",
    ar: "تم حجز الغرف مؤقتاً",
    it: "Camere opzionate",
  },
  hold_created: {
    en: "Hold created",
    fr: "Option créée",
    ar: "تم إنشاء الحجز المؤقت",
    it: "Opzione creata",
  },
  hold_expired: {
    en: "Hold expired",
    fr: "Option expirée",
    ar: "انتهت مهلة الحجز",
    it: "Opzione scaduta",
  },
  reservation_confirmed: {
    en: "Reservation confirmed",
    fr: "Réservation confirmée",
    ar: "تم تأكيد الحجز",
    it: "Prenotazione confermata",
  },
  reservation_cancelled: {
    en: "Reservation cancelled",
    fr: "Réservation annulée",
    ar: "تم إلغاء الحجز",
    it: "Prenotazione annullata",
  },
  cancellation_requested: {
    en: "Cancellation requested",
    fr: "Annulation demandée",
    ar: "تم طلب الإلغاء",
    it: "Cancellazione richiesta",
  },
  agency_email: {
    en: "Agency update sent",
    fr: "Mise à jour agence envoyée",
    ar: "تم إرسال تحديث للوكالة",
    it: "Aggiornamento agenzia inviato",
  },
};

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (value, [key, replacement]) =>
      value.replaceAll(`{${key}}`, replacement),
    template,
  );
}

export default async function AgencyReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; number: string }>;
  searchParams: Promise<{ requested?: string; error?: string }>;
}) {
  const { locale, number } = await params;
  const query = await searchParams;
  const copy = labels(locale);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const reservation = await getAgencyReservation(agency.id, number);
  if (!reservation) notFound();
  const events = (await listReservationEvents(reservation.id)).filter((event) =>
    visibleEventTypes.has(event.eventType),
  );
  const status =
    copy[
      reservation.status as keyof Pick<
        typeof copy,
        "request" | "provisional" | "confirmed" | "cancelled" | "no_show" | "regret"
      >
    ] ?? reservation.status;
  const policies = [
    ...new Map(
      reservation.lines.map((line) => [
        `${line.terms.name}:${line.terms.generalTerms}:${line.terms.cancellationTerms}`,
        line.terms,
      ]),
    ).values(),
  ];
  const canCancel = ["request", "provisional", "confirmed"].includes(
    reservation.status,
  );
  const shareText = [
    `${reservation.number} · ${reservation.hotelName}`,
    `${reservation.checkIn} → ${reservation.checkOut}`,
    `${reservation.totalRooms} ${copy.rooms} · ${formatMoney(reservation.total, locale)}`,
    status,
  ].join("\n");
  const emailShare = `mailto:?subject=${encodeURIComponent(
    `${reservation.number} · ${reservation.hotelName}`,
  )}&body=${encodeURIComponent(shareText)}`;
  const whatsappShare = whatsappUrl("", shareText);

  return (
    <section className="min-h-screen bg-[#f5f2eb] py-10 md:py-16">
      <div className="site-shell">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Link href="/hotels/reservations" className="text-sm font-bold text-primary">
            ← {copy.back}
          </Link>
          <AgencyPortalNav locale={locale} active="reservations" />
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl bg-primary text-white shadow-xl">
          <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:p-9">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold">
                  {status}
                </span>
                <span className="font-plex text-sm text-white/60">
                  {reservation.number}
                </span>
              </div>
              <h1 className="font-display mt-4 text-3xl font-bold md:text-5xl">
                {reservation.hotelName}
              </h1>
              <p className="mt-2 text-sm text-white/65">
                {reservation.hotelAddress || reservation.hotelCity}
              </p>
            </div>
            {reservation.status === "confirmed" && (
              <Link
                href={`/hotels/reservations/${reservation.number}/voucher`}
                className="h-fit rounded-full bg-gold px-5 py-3 text-center text-sm font-bold text-primary"
              >
                {copy.voucher}
              </Link>
            )}
          </div>
          <div className="grid gap-px bg-white/10 sm:grid-cols-4">
            {[
              {
                label: copy.stay,
                value: `${formatDate(reservation.checkIn, locale)} — ${formatDate(
                  reservation.checkOut,
                  locale,
                )}`,
              },
              {
                label: copy.created,
                value: formatDate(reservation.createdAt, locale),
              },
              { label: copy.rooms, value: String(reservation.totalRooms) },
              { label: copy.total, value: formatMoney(reservation.total, locale) },
            ].map((item) => (
              <div key={item.label} className="bg-primary px-6 py-4">
                <p className="text-[10px] font-bold tracking-wider text-white/45 uppercase">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {reservation.status === "provisional" && reservation.holdUntil && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {fill(copy.holdUntil, {
              date: new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(reservation.holdUntil)),
            })}
          </p>
        )}
        {(query.requested || reservation.cancellationRequestedAt) && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {copy.requested}
          </p>
        )}

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-6">
            <section className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
              <div className="hidden grid-cols-[minmax(12rem,1fr)_minmax(9rem,0.7fr)_4rem_8rem_9rem] gap-4 border-b border-primary/10 bg-[#faf8f3] px-6 py-3 text-[10px] font-bold tracking-wider text-muted uppercase md:grid">
                <span>{copy.room}</span>
                <span>{copy.meal}</span>
                <span className="text-center">{copy.qty}</span>
                <span className="text-end">{copy.rate}</span>
                <span className="text-end">{copy.amount}</span>
              </div>
              <div className="divide-y divide-primary/10">
                {reservation.lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid gap-3 px-5 py-5 md:grid-cols-[minmax(12rem,1fr)_minmax(9rem,0.7fr)_4rem_8rem_9rem] md:items-center md:px-6"
                  >
                    <div>
                      <p className="font-bold text-primary">
                        {roomTypeLabel(line.roomName, (type) => copy[type])}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {line.guests} guests
                      </p>
                    </div>
                    <p className="text-sm text-muted">
                      {mealPlanLabel(line.board, {
                        room_only: copy.room_only,
                        breakfast: copy.breakfast,
                        half_board: copy.half_board,
                        full_board: copy.full_board,
                      })}
                      {line.view ? ` · ${line.view}` : ""}
                    </p>
                    <p className="font-plex font-bold text-primary md:text-center">
                      {line.quantity}
                    </p>
                    <p className="font-plex text-sm text-primary md:text-end">
                      {formatMoney(line.pricePerNight, locale)}
                    </p>
                    <p className="font-plex font-bold text-primary md:text-end">
                      {formatMoney(
                        line.pricePerNight * line.quantity * reservation.nights,
                        locale,
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm md:p-8">
              <h2 className="font-display text-2xl font-bold text-primary">
                {copy.terms}
              </h2>
              {reservation.termsAcceptedAt && (
                <p className="mt-2 text-sm text-muted">
                  {fill(copy.accepted, {
                    name: reservation.termsAcceptedBy,
                    date: formatDate(reservation.termsAcceptedAt, locale),
                  })}
                </p>
              )}
              <div className="mt-5 grid gap-4">
                {policies.map((policy, index) => (
                  <div
                    key={`${policy.name}:${index}`}
                    className="rounded-2xl bg-[#faf8f3] p-4 text-sm leading-6"
                  >
                    <h3 className="font-bold text-primary">
                      {policy.name || copy.terms}
                    </h3>
                    {policy.generalTerms && (
                      <p className="mt-3 whitespace-pre-line text-muted">
                        <strong className="text-primary">{copy.general}:</strong>{" "}
                        {policy.generalTerms}
                      </p>
                    )}
                    {policy.cancellationTerms && (
                      <p className="mt-3 whitespace-pre-line text-muted">
                        <strong className="text-primary">
                          {copy.cancellation}:
                        </strong>{" "}
                        {policy.cancellationTerms}
                      </p>
                    )}
                    {policy.paymentTerms && (
                      <p className="mt-3 whitespace-pre-line text-muted">
                        <strong className="text-primary">{copy.payment}:</strong>{" "}
                        {policy.paymentTerms}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-bold text-primary">
                      {copy.release}: {policy.releaseDays ?? 0} {copy.days}.{" "}
                      {copy.releaseNote}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm md:p-8">
              <h2 className="font-display text-2xl font-bold text-primary">
                {copy.timeline}
              </h2>
              {events.length ? (
                <ol className="mt-5 grid gap-0">
                  {events.map((event, index) => (
                    <li
                      key={event.id}
                      className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3"
                    >
                      <div className="relative flex justify-center">
                        <span className="relative z-10 mt-1.5 size-2.5 rounded-full bg-gold ring-4 ring-white" />
                        {index < events.length - 1 && (
                          <span className="absolute top-3 bottom-0 w-px bg-primary/15" />
                        )}
                      </div>
                      <div className="pb-5">
                        <p className="text-sm font-bold text-primary">
                          {eventLabels[event.eventType]?.[locale] ??
                            event.eventType}
                        </p>
                        <time className="mt-1 block text-xs text-muted">
                          {formatDate(event.createdAt, locale)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-muted">{copy.noEvents}</p>
              )}
            </section>
          </div>

          <aside className="grid gap-5 lg:sticky lg:top-6">
            <section className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm">
              <h2 className="font-display text-xl font-bold text-primary">
                {copy.share}
              </h2>
              <div className="mt-4 grid gap-2">
                <a
                  href={emailShare}
                  className="rounded-full border border-primary/15 px-4 py-2.5 text-center text-sm font-bold text-primary"
                >
                  {copy.emailShare}
                </a>
                <a
                  href={whatsappShare}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-emerald-700 px-4 py-2.5 text-center text-sm font-bold text-white"
                >
                  {copy.whatsappShare}
                </a>
              </div>
            </section>
            {reservation.notes && (
              <section className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-primary">{copy.notes}</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
                  {reservation.notes}
                </p>
              </section>
            )}
            {canCancel && !reservation.cancellationRequestedAt && (
              <section className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm">
                <h2 className="font-display text-xl font-bold text-primary">
                  {copy.requestCancellation}
                </h2>
                <form
                  action={requestAgencyCancellationAction}
                  className="mt-4 grid gap-3"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input
                    type="hidden"
                    name="number"
                    value={reservation.number}
                  />
                  <label className="grid gap-1.5 text-xs font-bold text-primary">
                    {copy.reason}
                    <textarea
                      name="reason"
                      rows={4}
                      required
                      maxLength={1000}
                      placeholder={copy.reasonHint}
                      className="rounded-xl border border-line px-3 py-2 text-sm font-normal leading-6"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-800"
                  >
                    {copy.send}
                  </button>
                </form>
              </section>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
