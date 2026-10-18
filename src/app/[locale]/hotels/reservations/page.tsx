import { redirect } from "next/navigation";
import { AgencyPortalNav } from "@/components/agency-portal-nav";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentAgency } from "@/lib/agency-auth";
import { formatDate, formatMoney } from "@/lib/money";
import { listAgencyReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

function labels(locale: Locale) {
  if (locale === "fr")
    return {
      eyebrow: "Portail agence",
      title: "Réservations",
      description:
        "Demandes, options et confirmations regroupées dans un seul registre.",
      all: "Toutes",
      active: "Actives",
      closed: "Clôturées",
      search: "Rechercher",
      searchPlaceholder: "Référence ou hôtel",
      statusFilter: "Tous les statuts",
      reference: "Référence",
      hotel: "Hôtel et séjour",
      rooms: "Chambres",
      value: "Valeur",
      status: "Statut",
      empty: "Aucune réservation dans cette vue.",
      open: "Ouvrir",
      request: "Demande",
      provisional: "Option",
      confirmed: "Confirmée",
      cancelled: "Annulée",
      no_show: "No-show",
      unavailable: "Indisponible",
      regret: "Non disponible",
    };
  if (locale === "ar")
    return {
      eyebrow: "بوابة الوكالة",
      title: "الحجوزات",
      description: "الطلبات والحجوزات المؤقتة والمؤكدة في سجل واحد.",
      all: "الكل",
      active: "النشطة",
      closed: "المغلقة",
      search: "بحث",
      searchPlaceholder: "المرجع أو الفندق",
      statusFilter: "كل الحالات",
      reference: "المرجع",
      hotel: "الفندق والإقامة",
      rooms: "الغرف",
      value: "القيمة",
      status: "الحالة",
      empty: "لا توجد حجوزات في هذا العرض.",
      open: "فتح",
      request: "طلب",
      provisional: "مؤقت",
      confirmed: "مؤكد",
      cancelled: "ملغي",
      no_show: "عدم حضور",
      unavailable: "غير متوفر",
      regret: "غير متاح",
    };
  if (locale === "it")
    return {
      eyebrow: "Portale agenzia",
      title: "Prenotazioni",
      description: "Richieste, opzioni e conferme in un unico registro.",
      all: "Tutte",
      active: "Attive",
      closed: "Chiuse",
      search: "Cerca",
      searchPlaceholder: "Riferimento o hotel",
      statusFilter: "Tutti gli stati",
      reference: "Riferimento",
      hotel: "Hotel e soggiorno",
      rooms: "Camere",
      value: "Valore",
      status: "Stato",
      empty: "Nessuna prenotazione in questa vista.",
      open: "Apri",
      request: "Richiesta",
      provisional: "Opzione",
      confirmed: "Confermata",
      cancelled: "Annullata",
      no_show: "No-show",
      unavailable: "Non disponibile",
      regret: "Non disponible",
    };
  return {
    eyebrow: "Agency portal",
    title: "Reservations",
    description: "Requests, live holds, and confirmations in one working ledger.",
    all: "All",
    active: "Active",
    closed: "Closed",
    search: "Search",
    searchPlaceholder: "Reference or hotel",
    statusFilter: "All statuses",
    reference: "Reference",
    hotel: "Hotel and stay",
    rooms: "Rooms",
    value: "Value",
    status: "Status",
    empty: "No reservations in this view.",
    open: "Open",
    request: "Request",
    provisional: "Hold",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    no_show: "No-show",
    unavailable: "Unavailable",
    regret: "Cannot provide",
  };
}

function statusTone(status: string) {
  if (status === "confirmed") return "bg-emerald-50 text-emerald-800";
  if (status === "cancelled" || status === "no_show" || status === "unavailable" || status === "regret")
    return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-800";
}

export default async function AgencyReservationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ view?: string; q?: string; status?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const copy = labels(locale);
  const agency = await currentAgency();
  if (!agency) {
    redirect(
      `/${locale}/hotels/login?next=${encodeURIComponent(`/${locale}/hotels/reservations`)}`,
    );
  }
  const reservations = await listAgencyReservations(agency.id);
  const view = ["active", "closed"].includes(query.view ?? "")
    ? query.view
    : "all";
  const q = query.q?.trim().toLocaleLowerCase() ?? "";
  const statuses = [
    "request",
    "provisional",
    "confirmed",
    "cancelled",
    "no_show",
    "unavailable",
    "regret",
  ];
  const status = statuses.includes(query.status ?? "") ? query.status ?? "" : "";
  const listed = reservations.filter((reservation) => {
    const closed = ["cancelled", "no_show", "unavailable", "regret"].includes(reservation.status);
    const inView = view === "all" || (view === "closed" ? closed : !closed);
    const inStatus = !status || reservation.status === status;
    const inSearch =
      !q ||
      reservation.number.toLocaleLowerCase().includes(q) ||
      reservation.hotelName.toLocaleLowerCase().includes(q) ||
      reservation.hotelCity.toLocaleLowerCase().includes(q);
    return inView && inStatus && inSearch;
  });
  const statusLabel = (status: string) =>
    copy[status as keyof Pick<
      typeof copy,
      | "request"
      | "provisional"
      | "confirmed"
      | "cancelled"
      | "no_show"
      | "unavailable"
      | "regret"
    >] ?? status;

  return (
    <section className="min-h-screen bg-[#f5f2eb] py-10 md:py-16">
      <div className="site-shell">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="font-display mt-2 text-4xl font-bold text-primary md:text-6xl">
              {copy.title}
            </h1>
          </div>
          <AgencyPortalNav locale={locale} active="reservations" />
        </div>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {copy.description}
        </p>

        <form className="mt-8 grid gap-3 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:items-end">
          {view !== "all" && <input type="hidden" name="view" value={view} />}
          <label className="grid gap-1.5 text-xs font-bold text-primary">
            {copy.search}
            <input
              name="q"
              type="search"
              defaultValue={query.q ?? ""}
              placeholder={copy.searchPlaceholder}
              className="h-11 rounded-xl border border-line px-3 text-sm font-normal outline-none focus:border-gold"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-primary">
            {copy.status}
            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-normal outline-none focus:border-gold"
            >
              <option value="">{copy.statusFilter}</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-white"
          >
            {copy.search}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { id: "all", label: copy.all },
            { id: "active", label: copy.active },
            { id: "closed", label: copy.closed },
          ].map((filter) => (
            <Link
              key={filter.id}
              href={
                filter.id === "all"
                  ? "/hotels/reservations"
                  : `/hotels/reservations?view=${filter.id}`
              }
              className={`rounded-full px-4 py-2 text-xs font-bold ${
                view === filter.id
                  ? "bg-primary text-white"
                  : "border border-primary/15 bg-white text-primary"
              }`}
            >
              {filter.label}
              <span className="ms-2 opacity-60">
                {filter.id === "all"
                  ? reservations.length
                  : reservations.filter((reservation) => {
                      const closed = ["cancelled", "no_show", "unavailable", "regret"].includes(
                        reservation.status,
                      );
                      return filter.id === "closed" ? closed : !closed;
                    }).length}
              </span>
            </Link>
          ))}
        </div>

        {listed.length ? (
          <div className="mt-5 overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
            <div className="hidden grid-cols-[8rem_minmax(15rem,1fr)_7rem_9rem_8rem_5rem] gap-4 border-b border-primary/10 bg-primary px-6 py-3 text-[11px] font-bold tracking-wider text-white/65 uppercase lg:grid">
              <span>{copy.reference}</span>
              <span>{copy.hotel}</span>
              <span className="text-center">{copy.rooms}</span>
              <span className="text-end">{copy.value}</span>
              <span>{copy.status}</span>
              <span />
            </div>
            <div className="divide-y divide-primary/10">
              {listed.map((reservation) => (
                <article
                  key={reservation.id}
                  className="grid gap-4 p-5 transition hover:bg-[#fbfaf7] lg:grid-cols-[8rem_minmax(15rem,1fr)_7rem_9rem_8rem_5rem] lg:items-center lg:px-6"
                >
                  <div>
                    <p className="font-plex text-sm font-bold text-primary">
                      {reservation.number}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(reservation.createdAt, locale)}
                    </p>
                  </div>
                  <div>
                    <h2 className="font-bold text-primary">
                      {reservation.hotelName}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(reservation.checkIn, locale)} —{" "}
                      {formatDate(reservation.checkOut, locale)}
                    </p>
                  </div>
                  <p className="font-plex text-sm font-bold text-primary lg:text-center">
                    <span className="me-2 text-xs font-normal text-muted lg:hidden">
                      {copy.rooms}
                    </span>
                    {reservation.totalRooms}
                  </p>
                  <p className="font-plex text-sm font-bold text-primary lg:text-end">
                    {formatMoney(reservation.total, locale)}
                  </p>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone(
                        reservation.status,
                      )}`}
                    >
                      {statusLabel(reservation.status)}
                    </span>
                  </div>
                  <Link
                    href={`/hotels/reservations/${reservation.number}`}
                    className="text-sm font-bold text-primary underline"
                  >
                    {copy.open}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-dashed border-primary/20 bg-white p-10 text-center text-muted">
            {copy.empty}
          </div>
        )}
      </div>
    </section>
  );
}
