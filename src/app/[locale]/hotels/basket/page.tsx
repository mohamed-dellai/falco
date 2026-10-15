import { redirect } from "next/navigation";
import {
  checkoutAgencyCartAction,
  clearAgencyCartAction,
  updateAgencyCartAction,
} from "@/app/[locale]/hotels/agency-actions";
import { AgencyPortalNav } from "@/components/agency-portal-nav";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAgencyCart } from "@/lib/agency-cart";
import { currentAgency } from "@/lib/agency-auth";
import {
  formatDate,
  formatMoney,
} from "@/lib/money";
import { mealPlanMessageKey, roomTypeLabel } from "@/lib/room-types";
import { getTranslations, setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

function labels(locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: "Dossier de voyage",
      title: "Votre panier",
      subtitle:
        "Un seul hôtel, un seul séjour, plusieurs types de chambres — une seule réservation.",
      emptyTitle: "Votre panier est vide",
      emptyBody: "Choisissez vos dates, puis ajoutez les chambres du même hôtel.",
      browse: "Parcourir les hôtels",
      reservations: "Mes réservations",
      nights: "nuits",
      quantity: "Quantité",
      update: "Mettre à jour",
      remove: "Retirer",
      available: "disponibles",
      onRequest: "Confirmation sur demande",
      terms: "Conditions de réservation",
      general: "Conditions générales",
      cancellation: "Annulation",
      payment: "Paiement",
      release: "Délai de libération",
      releaseNote:
        "Note contractuelle seulement. Les chambres ne sont pas libérées automatiquement.",
      quantityError:
        "Cette quantité n’est plus disponible pour une réservation immédiate.",
      days: "jours",
      refundable: "Remboursable",
      nonRefundable: "Non remboursable",
      summary: "Résumé",
      stay: "Séjour",
      rooms: "Chambres",
      total: "Total agence",
      notes: "Notes pour Falco",
      notesHint: "Noms du groupe, heure d’arrivée ou demandes opérationnelles",
      accept:
        "J’ai lu et j’accepte les conditions, les règles d’annulation et de paiement ci-dessus.",
      acceptedBy: "Accepté pour",
      submit: "Envoyer la réservation",
      clear: "Vider le panier",
      termsError: "Vous devez accepter les conditions avant de continuer.",
      changedError:
        "Le tarif ou la disponibilité a changé. Vérifiez le panier et réessayez.",
    };
  }
  if (locale === "ar") {
    return {
      eyebrow: "ملف الرحلة",
      title: "سلة الرحلة",
      subtitle: "فندق واحد وإقامة واحدة وعدة أنواع غرف — في حجز واحد.",
      emptyTitle: "سلة الرحلة فارغة",
      emptyBody: "اختر التواريخ ثم أضف غرفاً من الفندق نفسه.",
      browse: "تصفح الفنادق",
      reservations: "حجوزاتي",
      nights: "ليالٍ",
      quantity: "الكمية",
      update: "تحديث",
      remove: "إزالة",
      available: "متاح",
      onRequest: "التأكيد عند الطلب",
      terms: "شروط الحجز",
      general: "الشروط العامة",
      cancellation: "الإلغاء",
      payment: "الدفع",
      release: "مهلة التأكيد",
      releaseNote: "ملاحظة تعاقدية فقط. لا يتم تحرير الغرف تلقائيًا.",
      quantityError: "هذه الكمية لم تعد متاحة للحجز الفوري.",
      days: "أيام",
      refundable: "قابل للاسترداد",
      nonRefundable: "غير قابل للاسترداد",
      summary: "الملخص",
      stay: "الإقامة",
      rooms: "الغرف",
      total: "إجمالي الوكالة",
      notes: "ملاحظات إلى فالكو",
      notesHint: "اسم المجموعة أو وقت الوصول أو طلبات التشغيل",
      accept: "قرأت وأوافق على شروط الحجز والإلغاء والدفع أعلاه.",
      acceptedBy: "تم القبول باسم",
      submit: "إرسال الحجز",
      clear: "إفراغ السلة",
      termsError: "يجب قبول الشروط قبل المتابعة.",
      changedError: "تغير السعر أو التوفر. راجع السلة وحاول مرة أخرى.",
    };
  }
  if (locale === "it") {
    return {
      eyebrow: "Fascicolo di viaggio",
      title: "Carrello del soggiorno",
      subtitle:
        "Un hotel, un soggiorno, più tipologie di camera — una sola prenotazione.",
      emptyTitle: "Il carrello è vuoto",
      emptyBody: "Scegli le date, poi aggiungi camere dello stesso hotel.",
      browse: "Sfoglia gli hotel",
      reservations: "Le mie prenotazioni",
      nights: "notti",
      quantity: "Quantità",
      update: "Aggiorna",
      remove: "Rimuovi",
      available: "disponibili",
      onRequest: "Conferma su richiesta",
      terms: "Condizioni di prenotazione",
      general: "Condizioni generali",
      cancellation: "Cancellazione",
      payment: "Pagamento",
      release: "Termine di rilascio",
      releaseNote:
        "Solo nota contrattuale. Le camere non vengono rilasciate automaticamente.",
      quantityError:
        "Questa quantità non è più disponibile per una prenotazione immediata.",
      days: "giorni",
      refundable: "Rimborsabile",
      nonRefundable: "Non rimborsabile",
      summary: "Riepilogo",
      stay: "Soggiorno",
      rooms: "Camere",
      total: "Totale agenzia",
      notes: "Note per Falco",
      notesHint: "Nome del gruppo, arrivo o richieste operative",
      accept:
        "Ho letto e accetto le condizioni, le regole di cancellazione e di pagamento.",
      acceptedBy: "Accettato per",
      submit: "Invia prenotazione",
      clear: "Svuota carrello",
      termsError: "Accetta le condizioni prima di continuare.",
      changedError:
        "La tariffa o la disponibilità è cambiata. Controlla il carrello e riprova.",
    };
  }
  return {
    eyebrow: "Trip folio",
    title: "Your trip basket",
    subtitle:
      "One hotel, one shared stay, multiple room types — one reservation.",
    emptyTitle: "Your trip basket is empty",
    emptyBody: "Choose stay dates, then add rooms from the same hotel.",
    browse: "Browse hotels",
    reservations: "My reservations",
    nights: "nights",
    quantity: "Quantity",
    update: "Update",
    remove: "Remove",
    available: "available",
    onRequest: "Confirmation on request",
    terms: "Booking terms",
    general: "General terms",
    cancellation: "Cancellation",
    payment: "Payment",
    release: "Release period",
    releaseNote:
      "Contract note only. Rooms are not released automatically.",
    quantityError: "That quantity is no longer available for an instant booking.",
    days: "days",
    refundable: "Refundable",
    nonRefundable: "Non-refundable",
    summary: "Summary",
    stay: "Stay",
    rooms: "Rooms",
    total: "Agency total",
    notes: "Notes for Falco",
    notesHint: "Group name, arrival time, or operational requests",
    accept:
      "I have read and accept the booking, cancellation, and payment terms above.",
    acceptedBy: "Accepted for",
    submit: "Submit reservation",
    clear: "Clear basket",
    termsError: "Accept the booking terms before continuing.",
    changedError:
      "The rate or availability changed. Review the basket and try again.",
  };
}

export default async function BasketPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const copy = labels(locale);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const cart = await getAgencyCart(agency.id);
  const hotels = await getTranslations("Hotels");
  const uniquePolicies = cart
    ? [
        ...new Map(
          cart.lines.map((line) => [
            line.policy.id ?? `${line.contractPeriodId}:terms`,
            line.policy,
          ]),
        ).values(),
      ]
    : [];

  return (
    <section className="min-h-screen bg-[#f5f2eb] py-10 md:py-16">
      <div className="site-shell">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/hotels" className="text-sm font-bold text-primary">
            ← {copy.browse}
          </Link>
          <AgencyPortalNav locale={locale} active="basket" />
        </div>

        <div className="mt-8 border-b border-primary/15 pb-7">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="font-display mt-2 text-4xl font-bold text-primary md:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            {copy.subtitle}
          </p>
        </div>

        {!cart?.lines.length ? (
          <div className="mt-10 rounded-3xl border border-primary/10 bg-white p-8 text-center shadow-sm md:p-14">
            <p className="font-display text-3xl font-bold text-primary">
              {copy.emptyTitle}
            </p>
            <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
              {copy.emptyBody}
            </p>
            <Link
              href="/hotels"
              className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-white"
            >
              {copy.browse}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid gap-5">
              <div className="rounded-3xl bg-primary p-6 text-white shadow-lg md:p-8">
                <p className="text-xs font-bold tracking-[0.18em] text-gold uppercase">
                  {cart.hotelName}
                </p>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-bold md:text-3xl">
                      {formatDate(cart.checkIn, locale)} —{" "}
                      {formatDate(cart.checkOut, locale)}
                    </p>
                    <p className="mt-1 text-sm text-white/65">
                      {cart.nights} {copy.nights}
                    </p>
                  </div>
                  <p className="font-plex text-2xl font-bold text-gold">
                    {formatMoney(cart.total, locale)}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
                {cart.lines.map((line, index) => {
                  const lineTotal =
                    line.pricePerNight * line.quantity * cart.nights;
                  const request =
                    line.saleMode === "request" ||
                    line.quantity > line.open ||
                    line.stopSale;
                  return (
                    <article
                      key={line.id}
                      className={`grid gap-5 p-5 md:grid-cols-[8rem_minmax(0,1fr)] md:p-6 ${
                        index ? "border-t border-primary/10" : ""
                      }`}
                    >
                      {line.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.photoUrl}
                          alt=""
                          className="h-28 w-full rounded-2xl object-cover md:h-32"
                        />
                      ) : (
                        <div className="h-28 rounded-2xl bg-primary/5 md:h-32" />
                      )}
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-xl font-bold text-primary">
                              {roomTypeLabel(line.roomName, (type) =>
                                hotels(type),
                              )}
                            </h2>
                            <p className="mt-1 text-sm text-muted">
                              {hotels(mealPlanMessageKey(line.board))}
                              {line.view ? ` · ${line.view}` : ""} ·{" "}
                              {hotels("sleeps", { count: line.guests })}
                            </p>
                          </div>
                          <div className="text-end">
                            <p className="font-plex font-bold text-primary">
                              {formatMoney(lineTotal, locale)}
                            </p>
                            <p className="text-xs text-muted">
                              {formatMoney(line.pricePerNight, locale)} /{" "}
                              {copy.nights.slice(0, -1) || copy.nights}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              request
                                ? "bg-amber-50 text-amber-800"
                                : "bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            {request
                              ? copy.onRequest
                              : `${line.open} ${copy.available}`}
                          </span>
                          <div className="flex flex-wrap items-end gap-2">
                            <form
                              action={updateAgencyCartAction}
                              className="flex items-end gap-2"
                            >
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="lineId" value={line.id} />
                              <label className="grid gap-1 text-[11px] font-bold tracking-wide text-muted uppercase">
                                {copy.quantity}
                                <input
                                  name="quantity"
                                  type="number"
                                  min={1}
                                  max={5000}
                                  defaultValue={line.quantity}
                                  className="h-10 w-20 rounded-xl border border-line px-3 text-sm font-normal text-primary"
                                />
                              </label>
                              <button
                                type="submit"
                                className="h-10 rounded-full border border-primary/20 px-4 text-xs font-bold text-primary"
                              >
                                {copy.update}
                              </button>
                            </form>
                            <form action={updateAgencyCartAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="lineId" value={line.id} />
                              <input type="hidden" name="quantity" value="0" />
                              <button
                                type="submit"
                                className="h-10 px-2 text-xs font-bold text-red-700 underline"
                              >
                                {copy.remove}
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <section className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm md:p-8">
                <h2 className="font-display text-2xl font-bold text-primary">
                  {copy.terms}
                </h2>
                <div className="mt-5 grid gap-3">
                  {uniquePolicies.map((policy) => (
                    <details
                      key={policy.id ?? policy.name}
                      open={uniquePolicies.length === 1}
                      className="rounded-2xl border border-primary/10 bg-[#faf8f3]"
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-primary">
                        {policy.name || copy.terms}
                      </summary>
                      <dl className="grid gap-4 border-t border-primary/10 px-4 py-4 text-sm leading-6">
                        {policy.generalTerms && (
                          <div>
                            <dt className="font-bold text-primary">{copy.general}</dt>
                            <dd className="mt-1 whitespace-pre-line text-muted">
                              {policy.generalTerms}
                            </dd>
                          </div>
                        )}
                        {policy.cancellationTerms && (
                          <div>
                            <dt className="font-bold text-primary">
                              {copy.cancellation}
                            </dt>
                            <dd className="mt-1 whitespace-pre-line text-muted">
                              {policy.cancellationTerms}
                            </dd>
                          </div>
                        )}
                        {policy.paymentTerms && (
                          <div>
                            <dt className="font-bold text-primary">{copy.payment}</dt>
                            <dd className="mt-1 whitespace-pre-line text-muted">
                              {policy.paymentTerms}
                            </dd>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted">
                          <span>
                            {copy.release}: {policy.releaseDays} {copy.days}.{" "}
                            {copy.releaseNote}
                          </span>
                          <span>
                            {policy.refundable
                              ? copy.refundable
                              : copy.nonRefundable}
                          </span>
                        </div>
                      </dl>
                    </details>
                  ))}
                </div>
              </section>
            </div>

            <aside className="rounded-3xl border border-primary/10 bg-white p-6 shadow-lg lg:sticky lg:top-6">
              <h2 className="font-display text-2xl font-bold text-primary">
                {copy.summary}
              </h2>
              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between gap-4 text-muted">
                  <dt>{copy.stay}</dt>
                  <dd className="text-end font-semibold text-primary">
                    {cart.nights} {copy.nights}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-muted">
                  <dt>{copy.rooms}</dt>
                  <dd className="font-semibold text-primary">
                    {cart.lines.reduce((sum, line) => sum + line.quantity, 0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-primary/10 pt-4">
                  <dt className="font-bold text-primary">{copy.total}</dt>
                  <dd className="font-plex text-xl font-bold text-primary">
                    {formatMoney(cart.total, locale)}
                  </dd>
                </div>
              </dl>

              {query.error && (
                <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                  {query.error === "terms"
                    ? copy.termsError
                    : query.error === "quantity"
                      ? copy.quantityError
                      : query.error === "window"
                        ? hotels("saleWindow")
                        : query.error === "client"
                          ? hotels("clientBlocked")
                          : copy.changedError}
                </p>
              )}

              <form action={checkoutAgencyCartAction} className="mt-6 grid gap-4">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="acceptedBy" value={agency.name} />
                <input type="hidden" name="idempotencyKey" value={cart.id} />
                <label className="grid gap-1.5 text-xs font-bold text-primary">
                  {copy.notes}
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder={copy.notesHint}
                    className="rounded-xl border border-line px-3 py-2 text-sm font-normal leading-6"
                  />
                </label>
                <label className="flex items-start gap-3 rounded-2xl bg-[#f5f2eb] p-4 text-sm leading-6 text-primary">
                  <input
                    name="termsAccepted"
                    type="checkbox"
                    required
                    className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span>{copy.accept}</span>
                </label>
                <p className="text-xs text-muted">
                  {copy.acceptedBy}: <strong>{agency.name}</strong>
                </p>
                <button
                  type="submit"
                  className="rounded-full bg-gold px-5 py-3 text-sm font-bold text-primary shadow-sm"
                >
                  {copy.submit}
                </button>
              </form>

              <form action={clearAgencyCartAction} className="mt-3 text-center">
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="text-xs font-bold text-red-700 underline"
                >
                  {copy.clear}
                </button>
              </form>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
