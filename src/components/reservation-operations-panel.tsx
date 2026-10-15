import { decideCancellationAction } from "@/app/admin/actions";
import {
  AdminNotice,
  AdminPanel,
  adminButtonClass,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-ui";
import type { Allotment } from "@/lib/inventory";
import { formatDate } from "@/lib/money";
import type { ReservationEvent } from "@/lib/reservations";

function labels(locale: "en" | "fr") {
  if (locale === "fr")
    return {
      title: "Historique",
      noEvents: "Aucun événement enregistré.",
      cancellation: "Annulation demandée",
      cancellationReason: "Motif",
      approveCancellation: "Approuver et libérer les chambres",
      denyCancellation: "Refuser la demande",
      cancellationHint:
        "L’approbation annule la réservation et libère les chambres. Le refus laisse la réservation telle quelle.",
      decisionNote: "Note de décision (facultatif)",
      cancellationApproved: "Annulation approuvée. Les chambres sont libérées.",
      cancellationDenied: "Demande refusée. La réservation reste en place.",
      system: "Système",
      admin: "Équipe Falco",
      agencyActor: "Agence",
    };
  return {
    title: "History",
    noEvents: "No events recorded.",
    cancellation: "Cancellation requested",
    cancellationReason: "Reason",
    approveCancellation: "Approve and free the rooms",
    denyCancellation: "Deny request",
    cancellationHint:
      "Approval cancels the reservation and frees the rooms. Denial leaves the reservation as it is.",
    decisionNote: "Decision note (optional)",
    cancellationApproved: "Cancellation approved. The rooms are free.",
    cancellationDenied: "Request denied. The reservation stays as it is.",
    system: "System",
    admin: "Falco team",
    agencyActor: "Agency",
  };
}

const eventNames: Record<string, { en: string; fr: string }> = {
  created: { en: "Reservation imported", fr: "Réservation importée" },
  reservation_created: { en: "Reservation created", fr: "Réservation créée" },
  reservation_updated: { en: "Reservation updated", fr: "Réservation modifiée" },
  reservation_requested: { en: "Agency request received", fr: "Demande agence reçue" },
  reservation_held: { en: "Rooms held", fr: "Chambres bloquées" },
  hold_created: { en: "Hold created", fr: "Option créée" },
  hold_expired: { en: "Hold expired", fr: "Option expirée" },
  reservation_confirmed: { en: "Reservation confirmed", fr: "Réservation confirmée" },
  reservation_cancelled: { en: "Reservation cancelled", fr: "Réservation annulée" },
  cancellation_requested: { en: "Cancellation requested", fr: "Annulation demandée" },
  cancellation_approved: { en: "Cancellation approved", fr: "Annulation approuvée" },
  cancellation_denied: { en: "Cancellation denied", fr: "Annulation refusée" },
  reservation_reopened: { en: "Reservation reopened", fr: "Réservation rouverte" },
  supplier_not_requested: { en: "Supplier not requested", fr: "Hôtel non sollicité" },
  supplier_requested: { en: "Supplier request sent", fr: "Demande hôtel envoyée" },
  supplier_confirmed: { en: "Supplier confirmed", fr: "Hôtel confirmé" },
  supplier_modified: { en: "Supplier modified", fr: "Hôtel modifié" },
  supplier_cancelled: { en: "Supplier cancelled", fr: "Hôtel annulé" },
  reservation_regret: { en: "Cannot provide", fr: "Non disponible" },
  returned_to_request: { en: "Returned to request", fr: "Revenue à la demande" },
  line_supplier: { en: "Room supplier status changed", fr: "Statut fournisseur de la chambre modifié" },
  reservation_no_show: { en: "Room marked no-show", fr: "Chambre marquée no-show" },
  supplier_email: { en: "Email sent to hotel", fr: "E-mail envoyé à l’hôtel" },
  supplier_whatsapp: { en: "Hotel WhatsApp opened", fr: "WhatsApp hôtel ouvert" },
  agency_email: { en: "Email sent to agency", fr: "E-mail envoyé à l’agence" },
  client_document: { en: "Client document sent", fr: "Document client envoyé" },
  supplier_document: { en: "Hotel document sent", fr: "Document hôtel envoyé" },
  payment_recorded: { en: "Payment recorded", fr: "Paiement enregistré" },
  payment_refunded: { en: "Refund recorded", fr: "Remboursement enregistré" },
  pdf_downloaded: { en: "PDF downloaded", fr: "PDF téléchargé" },
};

export function ReservationOperationsPanel({
  allotment,
  events,
  locale,
  notice,
}: {
  allotment: Allotment;
  events: ReservationEvent[];
  locale: "en" | "fr";
  notice?: "approved" | "denied";
}) {
  const copy = labels(locale);

  return (
    <AdminPanel title={copy.title}>
      {notice && (
        <div className="mb-5">
          <AdminNotice tone="success">
            {notice === "approved" ? copy.cancellationApproved : copy.cancellationDenied}
          </AdminNotice>
        </div>
      )}
      {allotment.cancellationRequestedAt && (
        <div className="mb-5 rounded-lg border border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] p-4">
          <p className="text-sm font-bold text-[var(--desk-warning)]">
            {copy.cancellation}
          </p>
          <p className="mt-1 text-sm text-[var(--desk-text)]">
            <strong>{copy.cancellationReason}:</strong>{" "}
            {allotment.cancellationReason || "—"}
          </p>
          {["request", "provisional", "confirmed"].includes(allotment.status) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={decideCancellationAction} className="grid gap-2">
                <input type="hidden" name="id" value={allotment.id} />
                <input type="hidden" name="decision" value="approved" />
                <input
                  name="note"
                  maxLength={1000}
                  placeholder={copy.decisionNote}
                  className={adminFieldClass}
                />
                <button type="submit" className={adminButtonClass}>
                  {copy.approveCancellation}
                </button>
              </form>
              <form action={decideCancellationAction} className="grid gap-2">
                <input type="hidden" name="id" value={allotment.id} />
                <input type="hidden" name="decision" value="denied" />
                <input
                  name="note"
                  maxLength={1000}
                  placeholder={copy.decisionNote}
                  className={adminFieldClass}
                />
                <button type="submit" className={adminButtonSecondaryClass}>
                  {copy.denyCancellation}
                </button>
              </form>
              <p className="basis-full text-xs leading-5 text-[var(--desk-muted)]">
                {copy.cancellationHint}
              </p>
            </div>
          )}
        </div>
      )}

      <section>
        {events.length ? (
          <ol className="mt-4 grid gap-0">
            {events.map((event, index) => {
              const actor =
                event.actorType === "agency"
                  ? copy.agencyActor
                  : event.actorType === "admin"
                    ? copy.admin
                    : copy.system;
              const name =
                eventNames[event.eventType]?.[locale] ?? event.eventType;
              const details = Object.entries(event.details)
                .filter(([, value]) => value != null && value !== "")
                .map(([key, value]) => `${key}: ${String(value)}`)
                .join(" · ");
              return (
                <li
                  key={event.id}
                  className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3"
                >
                  <div className="relative flex justify-center">
                    <span className="relative z-10 mt-1.5 size-2.5 rounded-full bg-[var(--desk-primary)] ring-4 ring-white" />
                    {index < events.length - 1 && (
                      <span className="absolute top-3 bottom-0 w-px bg-[var(--desk-line)]" />
                    )}
                  </div>
                  <div className="pb-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">{name}</p>
                      <time className="font-plex text-xs text-[var(--desk-muted)]">
                        {formatDate(event.createdAt, locale)}
                      </time>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--desk-muted)]">
                      {actor}
                      {details ? ` · ${details}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-[var(--desk-muted)]">{copy.noEvents}</p>
        )}
      </section>
    </AdminPanel>
  );
}
