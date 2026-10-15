import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { currentAgency, getAgencyProfile } from "@/lib/agency-auth";
import { formatDate, formatMoney } from "@/lib/money";
import { getAgencyReservation } from "@/lib/reservations";
import { mealPlanLabel, roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

function labels(locale: Locale) {
  if (locale === "fr")
    return {
      voucher: "Voucher hôtel",
      confirmed: "Réservation confirmée",
      print: "Imprimer / enregistrer",
      back: "Retour à la réservation",
      reference: "Référence Falco",
      agency: "Agence",
      hotel: "Hôtel",
      guest: "À présenter à l’arrivée",
      checkIn: "Arrivée",
      checkOut: "Départ",
      nights: "Nuits",
      rooms: "Détail des chambres",
      room: "Chambre",
      board: "Repas / vue",
      qty: "Qté",
      rate: "Tarif / nuit",
      total: "Total agence",
      terms: "Conditions acceptées",
      notes: "Notes de réservation",
      issued: "Émis le",
      room_only: "Sans repas",
      breakfast: "Petit-déjeuner",
      half_board: "Demi-pension",
      full_board: "Pension complète",
      solo: "Individuelle",
      double: "Double",
      triple: "Triple",
      quad: "Quadruple",
    };
  if (locale === "ar")
    return {
      voucher: "قسيمة الفندق",
      confirmed: "حجز مؤكد",
      print: "طباعة / حفظ",
      back: "العودة إلى الحجز",
      reference: "مرجع فالكو",
      agency: "الوكالة",
      hotel: "الفندق",
      guest: "تُقدم عند الوصول",
      checkIn: "الوصول",
      checkOut: "المغادرة",
      nights: "الليالي",
      rooms: "تفاصيل الغرف",
      room: "الغرفة",
      board: "الوجبات / الإطلالة",
      qty: "العدد",
      rate: "السعر / الليلة",
      total: "إجمالي الوكالة",
      terms: "الشروط المقبولة",
      notes: "ملاحظات الحجز",
      issued: "تاريخ الإصدار",
      room_only: "بدون وجبات",
      breakfast: "إفطار",
      half_board: "نصف إقامة",
      full_board: "إقامة كاملة",
      solo: "فردية",
      double: "مزدوجة",
      triple: "ثلاثية",
      quad: "رباعية",
    };
  if (locale === "it")
    return {
      voucher: "Voucher hotel",
      confirmed: "Prenotazione confermata",
      print: "Stampa / salva",
      back: "Torna alla prenotazione",
      reference: "Riferimento Falco",
      agency: "Agenzia",
      hotel: "Hotel",
      guest: "Da presentare all’arrivo",
      checkIn: "Check-in",
      checkOut: "Check-out",
      nights: "Notti",
      rooms: "Dettaglio camere",
      room: "Camera",
      board: "Pasti / vista",
      qty: "Qtà",
      rate: "Tariffa / notte",
      total: "Totale agenzia",
      terms: "Condizioni accettate",
      notes: "Note prenotazione",
      issued: "Emesso il",
      room_only: "Senza pasti",
      breakfast: "Colazione",
      half_board: "Mezza pensione",
      full_board: "Pensione completa",
      solo: "Singola",
      double: "Doppia",
      triple: "Tripla",
      quad: "Quadrupla",
    };
  return {
    voucher: "Hotel voucher",
    confirmed: "Confirmed reservation",
    print: "Print / save",
    back: "Back to reservation",
    reference: "Falco reference",
    agency: "Agency",
    hotel: "Hotel",
    guest: "Present at check-in",
    checkIn: "Check-in",
    checkOut: "Check-out",
    nights: "Nights",
    rooms: "Room details",
    room: "Room",
    board: "Meals / view",
    qty: "Qty",
    rate: "Rate / night",
    total: "Agency total",
    terms: "Accepted terms",
    notes: "Reservation notes",
    issued: "Issued",
    room_only: "No meals",
    breakfast: "Breakfast",
    half_board: "Half board",
    full_board: "Full board",
    solo: "Solo",
    double: "Double",
    triple: "Triple",
    quad: "Quad",
  };
}

export default async function VoucherPage({
  params,
}: {
  params: Promise<{ locale: Locale; number: string }>;
}) {
  const { locale, number } = await params;
  const copy = labels(locale);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const [reservation, profile] = await Promise.all([
    getAgencyReservation(agency.id, number),
    getAgencyProfile(agency.id),
  ]);
  if (!reservation || reservation.status !== "confirmed" || !profile) {
    notFound();
  }
  const policies = [
    ...new Map(
      reservation.lines.map((line) => [
        `${line.terms.name}:${line.terms.generalTerms}`,
        line.terms,
      ]),
    ).values(),
  ];

  return (
    <main className="min-h-screen bg-[#e9e7e1] py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-5 flex max-w-[210mm] items-center justify-between gap-4 px-4 print:hidden">
        <Link
          href={`/hotels/reservations/${reservation.number}`}
          className="text-sm font-bold text-primary"
        >
          ← {copy.back}
        </Link>
        <PrintButton label={copy.print} />
      </div>

      <article className="mx-auto min-h-[270mm] max-w-[210mm] bg-white p-8 text-[#172d47] shadow-xl print:min-h-0 print:max-w-none print:p-[14mm] print:shadow-none md:p-12">
        <header className="flex items-start justify-between gap-8 border-b-2 border-[#b9974e] pb-7">
          <div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#172d47] text-2xl font-bold text-white">
              F
            </div>
            <p className="mt-3 text-xs font-bold tracking-[0.22em] text-[#b9974e] uppercase">
              Falco Services
            </p>
          </div>
          <div className="text-end">
            <p className="text-xs font-bold tracking-[0.18em] text-[#b9974e] uppercase">
              {copy.voucher}
            </p>
            <h1 className="mt-2 font-mono text-3xl font-bold">
              {reservation.number}
            </h1>
            <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              {copy.confirmed}
            </p>
          </div>
        </header>

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#f5f2eb] p-5">
            <p className="text-[10px] font-bold tracking-wider text-[#6e7885] uppercase">
              {copy.hotel}
            </p>
            <h2 className="mt-2 text-xl font-bold">{reservation.hotelName}</h2>
            <p className="mt-1 text-sm leading-6 text-[#596675]">
              {reservation.hotelAddress || reservation.hotelCity}
            </p>
          </div>
          <div className="rounded-2xl bg-[#f5f2eb] p-5">
            <p className="text-[10px] font-bold tracking-wider text-[#6e7885] uppercase">
              {copy.agency}
            </p>
            <h2 className="mt-2 text-xl font-bold">{profile.name}</h2>
            <p className="mt-1 text-sm leading-6 text-[#596675]">
              {profile.contactName || profile.loginEmail}
              {profile.phone ? ` · ${profile.phone}` : ""}
            </p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-[#d9dde2] sm:grid-cols-4">
          {[
            { label: copy.checkIn, value: formatDate(reservation.checkIn, locale) },
            { label: copy.checkOut, value: formatDate(reservation.checkOut, locale) },
            { label: copy.nights, value: String(reservation.nights) },
            { label: copy.reference, value: reservation.number },
          ].map((item) => (
            <div key={item.label} className="bg-white p-4">
              <p className="text-[10px] font-bold tracking-wider text-[#6e7885] uppercase">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold tracking-wider uppercase">
            {copy.rooms}
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#d9dde2]">
            <div className="hidden grid-cols-[minmax(10rem,1fr)_minmax(8rem,0.7fr)_3rem_8rem] gap-3 bg-[#172d47] px-4 py-2.5 text-[10px] font-bold tracking-wider text-white/70 uppercase sm:grid">
              <span>{copy.room}</span>
              <span>{copy.board}</span>
              <span className="text-center">{copy.qty}</span>
              <span className="text-end">{copy.rate}</span>
            </div>
            {reservation.lines.map((line) => (
              <div
                key={line.id}
                className="grid gap-2 border-t border-[#e4e6e9] p-4 first:border-t-0 sm:grid-cols-[minmax(10rem,1fr)_minmax(8rem,0.7fr)_3rem_8rem] sm:items-center"
              >
                <span className="font-bold">
                  {roomTypeLabel(line.roomName, (type) => copy[type])}
                </span>
                <span className="text-sm text-[#596675]">
                  {mealPlanLabel(line.board, {
                    room_only: copy.room_only,
                    breakfast: copy.breakfast,
                    half_board: copy.half_board,
                    full_board: copy.full_board,
                  })}
                  {line.view ? ` · ${line.view}` : ""}
                </span>
                <span className="font-mono font-bold sm:text-center">
                  {line.quantity}
                </span>
                <span className="font-mono text-sm font-bold sm:text-end">
                  {formatMoney(line.pricePerNight, locale)}
                </span>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t-2 border-[#172d47] bg-[#f5f2eb] px-4 py-4 font-bold">
              <span>{copy.total}</span>
              <span className="font-mono text-lg">
                {formatMoney(reservation.total, locale)}
              </span>
            </div>
          </div>
        </section>

        {reservation.notes && (
          <section className="mt-7 rounded-2xl border border-[#d9dde2] p-5">
            <h2 className="text-xs font-bold tracking-wider uppercase">
              {copy.notes}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#596675]">
              {reservation.notes}
            </p>
          </section>
        )}

        <section className="mt-7 break-inside-avoid">
          <h2 className="text-xs font-bold tracking-wider uppercase">
            {copy.terms}
          </h2>
          <div className="mt-3 grid gap-3">
            {policies.map((policy, index) => (
              <div key={`${policy.name}:${index}`} className="text-xs leading-5 text-[#596675]">
                <strong className="text-[#172d47]">
                  {policy.name || copy.terms}
                </strong>
                {policy.generalTerms ? ` — ${policy.generalTerms}` : ""}
                {policy.cancellationTerms
                  ? ` · ${policy.cancellationTerms}`
                  : ""}
                {policy.paymentTerms ? ` · ${policy.paymentTerms}` : ""}
                {typeof policy.releaseDays === "number"
                  ? ` · ${policy.releaseDays}d (${
                      {
                        en: "contract note, not an automatic release",
                        fr: "note contractuelle, sans libération automatique",
                        ar: "ملاحظة تعاقدية دون تحرير تلقائي",
                        it: "nota contrattuale, senza rilascio automatico",
                      }[locale]
                    })`
                  : ""}
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-10 flex flex-wrap justify-between gap-4 border-t border-[#d9dde2] pt-5 text-[10px] font-bold tracking-wider text-[#6e7885] uppercase">
          <span>
            {copy.issued}: {formatDate(new Date().toISOString(), locale)}
          </span>
          <span>{copy.guest}</span>
        </footer>
      </article>
    </main>
  );
}
