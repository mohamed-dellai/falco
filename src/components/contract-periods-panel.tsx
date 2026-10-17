import {
  amendContractPeriodAction,
  createContractPolicyAction,
  deleteOfferPhotoAction,
  deleteContractGroupRateAction,
  deleteContractPeriodRateAction,
  saveContractGroupRateAction,
  saveContractPeriodRateAction,
} from "@/app/admin/actions";
import { assignContractPeriodPolicyAction } from "@/app/admin/policies/actions";
import {
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { PolicyDesk } from "@/components/policy-desk";
import type { AdminCopy } from "@/lib/admin-copy";
import type { PolicyText } from "@/lib/policies";
import { PhotoUploader } from "@/components/photo-uploader";
import type {
  ContractGroupRate,
  ContractPeriod,
  ContractPeriodRate,
  ContractPolicy,
} from "@/lib/contracts";
import type { Agency, PurchaseLine } from "@/lib/inventory";
import {
  formatDateRange,
  formatMoney,
  moneyInput,
} from "@/lib/money";
import { mealPlanLabel, roomTypeLabel } from "@/lib/room-types";

type Labels = ReturnType<typeof labelsFor>;

function labelsFor(locale: string) {
  const french = locale === "fr";
  return {
    title: french ? "Périodes et politiques" : "Periods and policies",
    ratesTitle: french ? "Tarifs" : "Rates",
    description: french
      ? "Chaque période fixe le nombre de chambres, le repas, la vue, les tarifs et les conditions."
      : "Each period fixes the number of rooms, the meal, the view, the rates, and the terms.",
    policies: french ? "Politiques de réservation" : "Booking policies",
    newPolicy: french ? "Nouvelle version" : "New policy version",
    policyHint: french
      ? "Les versions utilisées restent immuables pour protéger les réservations existantes."
      : "Used versions remain immutable so existing reservations keep their original terms.",
    policyName: french ? "Nom de la politique" : "Policy name",
    generalTerms: french ? "Conditions générales" : "General terms",
    cancellation: french ? "Annulation" : "Cancellation terms",
    payment: french ? "Paiement" : "Payment terms",
    releaseDays: french ? "Délai de libération (jours)" : "Release (days)",
    releaseNote: french
      ? "Note contractuelle seulement. Les chambres ne sont pas libérées automatiquement."
      : "Contract note only. Rooms are not released automatically.",
    refundable: french ? "Remboursable" : "Refundable",
    savePolicy: french ? "Créer la version" : "Create version",
    periods: french ? "Périodes de vente" : "Selling periods",
    stock: french ? "Chambres" : "Rooms",
    overbook: french ? "Survente" : "Overbook",
    cost: french ? "Coût / nuit" : "Cost / night",
    publicPrice: french ? "Tarif public / nuit" : "Public / night",
    agencyPrice: french
      ? "Tarif agence par défaut / nuit"
      : "Default agency / night",
    minNights: french ? "Nuits min." : "Min. nights",
    holdMinutes: french ? "Durée du blocage (minutes)" : "Hold (minutes)",
    saleMode: french ? "Mode de vente" : "Sale mode",
    instant: french ? "Réservation immédiate" : "Instant booking",
    request: french ? "Sur demande" : "On request",
    stopSale: french ? "Stop-sale" : "Stop sale",
    amend: french ? "Modifier une plage" : "Amend date range",
    amendHint: french
      ? "La plage choisie sera détachée; les dates avant et après conservent leurs valeurs."
      : "The selected range is split out; dates before and after keep their current values.",
    from: french ? "Du" : "From",
    to: french ? "Au" : "To",
    policy: french ? "Politique" : "Policy",
    saveAmendment: french ? "Appliquer l’avenant" : "Apply amendment",
    privateRates: french ? "Tarifs agence privés" : "Private agency rates",
    noPrivateRates: french
      ? "Aucun tarif privé. Le tarif du groupe s’applique s’il existe, sinon le tarif par défaut."
      : "No private rates. A group rate applies when one exists, otherwise the default.",
    groupRates: french ? "Tarifs de groupe" : "Group rates",
    noGroupRates: french
      ? "Aucun tarif de groupe."
      : "No group rates.",
    group: french ? "Groupe" : "Group",
    saveGroupRate: french ? "Enregistrer le tarif de groupe" : "Save group rate",
    agency: french ? "Agence" : "Agency",
    rate: french ? "Tarif / nuit" : "Rate / night",
    saveRate: french ? "Enregistrer" : "Save rate",
    delete: french ? "Supprimer" : "Delete",
    active: french ? "En vente" : "On sale",
    stopped: french ? "Vente arrêtée" : "Stopped",
    noDefaultRate: french ? "Non publié" : "Not published",
    roomOnly: french ? "Sans repas" : "No meals",
    breakfast: french ? "Petit-déjeuner" : "Breakfast",
    halfBoard: french ? "Demi-pension" : "Half board",
    fullBoard: french ? "Pension complète" : "Full board",
    solo: french ? "Individuelle" : "Solo",
    double: french ? "Double" : "Double",
    triple: french ? "Triple" : "Triple",
    quad: french ? "Quadruple" : "Quad",
    photos: french ? "Photos de l’offre" : "Offer photos",
    photosHint: french
      ? "Ces photos suivent le type de chambre, le repas et la vue sur tous les canaux."
      : "These photos follow this room, meal, and view offer across every channel.",
  };
}

function mealLabel(period: ContractPeriod, labels: Labels) {
  return mealPlanLabel(period.board, {
    room_only: labels.roomOnly,
    breakfast: labels.breakfast,
    half_board: labels.halfBoard,
    full_board: labels.fullBoard,
  });
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
      {label}
      {children}
    </label>
  );
}

export function ContractPeriodsPanel({
  purchaseId,
  lines,
  periods,
  policies,
  templates = [],
  copy,
  rates,
  groupRates,
  groups,
  photos,
  agencies,
  locale,
  part = "all",
}: {
  purchaseId: string;
  lines: PurchaseLine[];
  periods: ContractPeriod[];
  policies: ContractPolicy[];
  templates?: PolicyText[];
  copy?: AdminCopy;
  rates: ContractPeriodRate[];
  groupRates: ContractGroupRate[];
  groups: Array<{ id: string; name: string }>;
  photos: Array<{ id: string; offer_id: string; url: string }>;
  agencies: Agency[];
  locale: string;
  part?: "all" | "policies" | "periods" | "rates" | "photos";
}) {
  const labels = labelsFor(locale);
  const companies = agencies.filter((agency) => agency.kind === "agency");
  const activePolicies = policies.filter((policy) => policy.active);

  const title =
    part === "policies"
      ? labels.policies
      : part === "photos"
        ? labels.photos
        : part === "rates"
          ? labels.ratesTitle
          : labels.periods;

  return (
    <AdminPanel title={title}>
      {(part === "all" || part === "periods") && (
      <p className="-mt-2 mb-5 max-w-3xl text-sm text-[var(--desk-muted)]">
        {labels.description}
      </p>
      )}

      {part === "policies" && copy ? (
      <div className="grid gap-4">
        <PolicyDesk
          items={policies.map((policy) => ({
            id: policy.id,
            name: policy.name,
            content: [policy.generalTerms, policy.cancellationTerms, policy.paymentTerms]
              .map((piece) => piece.trim())
              .filter(Boolean)
              .join("\n\n"),
            contentAr: policy.contentAr,
          }))}
          templates={templates}
          purchaseId={purchaseId}
          copy={copy}
          empty={copy.contractPolicyEmpty}
        />
        {activePolicies.length && periods.some((period) => period.active) ? (
          <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
            <ul className="divide-y divide-[var(--desk-line)]">
              {periods
                .filter((period) => period.active)
                .map((period) => (
                  <li key={period.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] sm:items-end sm:px-5">
                    <div>
                      <p className="text-sm font-semibold text-[var(--desk-ink)]">
                        {roomTypeLabel(period.roomName, (type) => labels[type])}
                        <span className="font-normal text-[var(--desk-muted)]">
                          {" "}
                          · {mealLabel(period, labels)}
                          {period.view ? ` · ${period.view}` : ""}
                        </span>
                      </p>
                      <p className="mt-1 font-plex text-xs text-[var(--desk-muted)]">
                        {formatDateRange(period.checkIn, period.checkOut, locale)}
                      </p>
                    </div>
                    <form action={assignContractPeriodPolicyAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="purchaseId" value={purchaseId} />
                      <input type="hidden" name="periodId" value={period.id} />
                      <label className="grid min-w-48 flex-1 gap-1.5 text-sm">
                        <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.contractPolicyPeriod}</span>
                        <select
                          name="policyId"
                          required
                          defaultValue={period.policyId ?? ""}
                          className={adminFieldClass}
                        >
                          <option value="" disabled>
                            {copy.contractPolicyPeriod}
                          </option>
                          {activePolicies.map((policy) => (
                            <option key={policy.id} value={policy.id}>
                              {policy.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" className={adminButtonSecondaryClass}>
                        {copy.policySave}
                      </button>
                    </form>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </div>
      ) : null}

      {part === "all" && (
      <section className="rounded-lg border border-[var(--desk-line)] bg-[var(--desk-surface-muted)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--desk-ink)]">
              {labels.policies}
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-[var(--desk-muted)]">
              {labels.policyHint}
            </p>
          </div>
          <details className="group w-full rounded border border-[var(--desk-line)] bg-white sm:w-auto sm:min-w-[22rem]">
            <summary className="desk-focus cursor-pointer list-none px-3 py-2 text-xs font-semibold text-[var(--desk-primary)]">
              + {labels.newPolicy}
            </summary>
            <form
              action={createContractPolicyAction}
              className="grid gap-3 border-t border-[var(--desk-line)] p-3"
            >
              <input type="hidden" name="purchaseId" value={purchaseId} />
              <Field label={labels.policyName}>
                <input name="name" required maxLength={100} className={adminFieldClass} />
              </Field>
              <Field label={labels.generalTerms}>
                <textarea
                  name="generalTerms"
                  rows={3}
                  className={`${adminFieldClass} !h-auto py-2 normal-case tracking-normal`}
                />
              </Field>
              <Field label={labels.cancellation}>
                <textarea
                  name="cancellationTerms"
                  rows={3}
                  className={`${adminFieldClass} !h-auto py-2 normal-case tracking-normal`}
                />
              </Field>
              <Field label={labels.payment}>
                <textarea
                  name="paymentTerms"
                  rows={2}
                  className={`${adminFieldClass} !h-auto py-2 normal-case tracking-normal`}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={labels.releaseDays}>
                  <input
                    name="releaseDays"
                    type="number"
                    min={0}
                    max={365}
                    defaultValue={0}
                    required
                    className={adminFieldClass}
                  />
                  <span className="text-xs font-medium normal-case tracking-normal text-[var(--desk-muted)]">
                    {labels.releaseNote}
                  </span>
                </Field>
                <label className="flex items-end gap-2 pb-2 text-sm font-medium">
                  <input name="refundable" type="checkbox" defaultChecked />
                  {labels.refundable}
                </label>
              </div>
              <button type="submit" className={adminButtonClass}>
                {labels.savePolicy}
              </button>
            </form>
          </details>
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="rounded border border-[var(--desk-line)] bg-white px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{policy.name}</p>
                <span className="rounded bg-[var(--desk-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--desk-primary)]">
                  v{policy.createdAt.slice(0, 10)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--desk-muted)]">
                {policy.releaseDays} {labels.releaseDays.toLowerCase()} ·{" "}
                {policy.refundable ? labels.refundable : `Non-${labels.refundable.toLowerCase()}`}
              </p>
            </div>
          ))}
        </div>
      </section>
      )}

      {(part === "all" || part === "periods" || part === "rates" || part === "photos") && (
      <section className="mt-6">
        {part === "all" && (
        <h3 className="mb-3 text-sm font-bold text-[var(--desk-ink)]">
          {labels.periods}
        </h3>
        )}
        <div className="grid gap-4">
          {periods
            .filter((period) => period.active)
            .map((period) => {
              const periodGroupRates = groupRates.filter(
                (rate) => rate.contractPeriodId === period.id,
              );
              const periodRates = rates.filter(
                (rate) => rate.contractPeriodId === period.id,
              );
              const line = lines.find((item) => item.id === period.purchaseLineId);
              const offerPhotos = photos.filter(
                (photo) => photo.offer_id === period.offerId,
              );
              const firstForOffer =
                periods.find(
                  (item) => item.active && item.offerId === period.offerId,
                )?.id === period.id;
              const showMetrics = part === "all" || part === "periods";
              const showPhotos = (part === "all" || part === "photos") && firstForOffer;
              const showAmend = part === "all" || part === "periods";
              const showRates = part === "all" || part === "rates" || part === "periods";
              if (part === "photos" && !firstForOffer) return null;
              return (
                <article
                  key={period.id}
                  className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--desk-line)] bg-[var(--desk-surface-muted)] px-4 py-3">
                    <div>
                      <h4 className="font-semibold text-[var(--desk-ink)]">
                        {roomTypeLabel(period.roomName, (type) => labels[type])}
                        <span className="font-normal text-[var(--desk-muted)]">
                          {" "}
                          · {mealLabel(period, labels)}
                          {period.view ? ` · ${period.view}` : ""}
                        </span>
                      </h4>
                      <p className="mt-1 font-plex text-xs text-[var(--desk-muted)]">
                        {formatDateRange(period.checkIn, period.checkOut, locale)}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2.5 py-1 text-[11px] font-bold ${
                        period.stopSale
                          ? "bg-[var(--desk-danger-soft)] text-[var(--desk-danger)]"
                          : "bg-[var(--desk-success-soft)] text-[var(--desk-success)]"
                      }`}
                    >
                      {period.stopSale ? labels.stopped : labels.active}
                    </span>
                  </div>

                  {showMetrics && (
                  <div className="grid gap-px bg-[var(--desk-line)] sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        name: labels.stock,
                        value: String(period.quantity),
                      },
                      {
                        name: labels.overbook,
                        value: String(period.overbookLimit),
                      },
                      {
                        name: labels.cost,
                        value: formatMoney(period.costPerNight, locale),
                      },
                      {
                        name: labels.agencyPrice,
                        value:
                          period.defaultAgencyPricePerNight == null
                            ? labels.noDefaultRate
                            : formatMoney(
                                period.defaultAgencyPricePerNight,
                                locale,
                              ),
                      },
                      {
                        name: labels.policy,
                        value: period.policyName || "—",
                      },
                    ].map((metric) => (
                      <div key={metric.name} className="bg-white px-4 py-3">
                        <p className="text-[10px] font-semibold tracking-wider text-[var(--desk-muted)] uppercase">
                          {metric.name}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                  )}

                  {showPhotos && (
                    <details className="border-b border-[var(--desk-line)] bg-[var(--desk-canvas)]">
                      <summary className="desk-focus cursor-pointer list-none px-4 py-3 text-xs font-semibold text-[var(--desk-primary)]">
                        {labels.photos} ({offerPhotos.length})
                      </summary>
                      <div className="grid gap-4 border-t border-[var(--desk-line)] p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        <div>
                          <p className="mb-3 text-xs text-[var(--desk-muted)]">
                            {labels.photosHint}
                          </p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {offerPhotos.map((photo) => (
                              <div
                                key={photo.id}
                                className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.url}
                                  alt=""
                                  className="h-28 w-full object-cover"
                                />
                                <form
                                  action={deleteOfferPhotoAction}
                                  className="p-2 text-end"
                                >
                                  <input
                                    type="hidden"
                                    name="purchaseId"
                                    value={purchaseId}
                                  />
                                  <input
                                    type="hidden"
                                    name="photoId"
                                    value={photo.id}
                                  />
                                  <button
                                    type="submit"
                                    className={adminButtonDangerClass}
                                  >
                                    {labels.delete}
                                  </button>
                                </form>
                              </div>
                            ))}
                          </div>
                        </div>
                        <PhotoUploader offerId={period.offerId} />
                      </div>
                    </details>
                  )}

                  {(showAmend || showRates) && (
                  <div className={`grid gap-4 p-4 ${showAmend && showRates ? "xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.55fr)]" : showRates ? "lg:grid-cols-2" : ""}`}>
                    {showAmend && (
                    <details className="rounded border border-[var(--desk-line)]">
                      <summary className="desk-focus cursor-pointer list-none px-3 py-2 text-xs font-semibold text-[var(--desk-primary)]">
                        {labels.amend}
                      </summary>
                      <form
                        action={amendContractPeriodAction}
                        className="grid gap-3 border-t border-[var(--desk-line)] p-3"
                      >
                        <input type="hidden" name="purchaseId" value={purchaseId} />
                        <input
                          type="hidden"
                          name="purchaseLineId"
                          value={period.purchaseLineId}
                        />
                        <p className="text-xs text-[var(--desk-muted)]">
                          {labels.amendHint}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label={labels.from}>
                            <input
                              name="checkIn"
                              type="date"
                              min={line?.checkIn}
                              max={period.checkOut}
                              defaultValue={period.checkIn}
                              required
                              className={adminFieldClass}
                            />
                          </Field>
                          <Field label={labels.to}>
                            <input
                              name="checkOut"
                              type="date"
                              min={period.checkIn}
                              max={line?.checkOut}
                              defaultValue={period.checkOut}
                              required
                              className={adminFieldClass}
                            />
                          </Field>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Field label={labels.stock}>
                            <input
                              name="quantity"
                              type="number"
                              min={0}
                              max={5000}
                              defaultValue={period.quantity}
                              required
                              className={adminFieldClass}
                            />
                          </Field>
                          <Field label={labels.overbook}>
                            <input
                              name="overbookLimit"
                              type="number"
                              min={0}
                              max={5000}
                              defaultValue={period.overbookLimit}
                              required
                              className={adminFieldClass}
                            />
                          </Field>
                          <Field label={labels.minNights}>
                            <input
                              name="minNights"
                              type="number"
                              min={1}
                              max={120}
                              defaultValue={period.minNights}
                              required
                              className={adminFieldClass}
                            />
                          </Field>
                          <Field label={labels.holdMinutes}>
                            <input
                              name="holdMinutes"
                              type="number"
                              min={15}
                              max={43200}
                              defaultValue={period.holdMinutes}
                              required
                              className={adminFieldClass}
                            />
                          </Field>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Field label={labels.cost}>
                            <input
                              name="cost"
                              inputMode="decimal"
                              defaultValue={moneyInput(period.costPerNight)}
                              required
                              className={adminFieldClass}
                            />
                          </Field>
                          <Field label={labels.publicPrice}>
                            <input
                              name="publicPrice"
                              inputMode="decimal"
                              defaultValue={
                                period.publicPricePerNight == null
                                  ? ""
                                  : moneyInput(period.publicPricePerNight)
                              }
                              className={adminFieldClass}
                            />
                          </Field>
                          <Field label={labels.agencyPrice}>
                            <input
                              name="agencyPrice"
                              inputMode="decimal"
                              defaultValue={
                                period.defaultAgencyPricePerNight == null
                                  ? ""
                                  : moneyInput(
                                      period.defaultAgencyPricePerNight,
                                    )
                              }
                              className={adminFieldClass}
                            />
                          </Field>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label={labels.policy}>
                            <select
                              name="policyId"
                              defaultValue={period.policyId ?? ""}
                              required
                              className={adminFieldClass}
                            >
                              {activePolicies.map((policy) => (
                                <option key={policy.id} value={policy.id}>
                                  {policy.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label={labels.saleMode}>
                            <select
                              name="saleMode"
                              defaultValue={period.saleMode}
                              className={adminFieldClass}
                            >
                              <option value="book">{labels.instant}</option>
                              <option value="request">{labels.request}</option>
                            </select>
                          </Field>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium text-[var(--desk-danger)]">
                          <input
                            name="stopSale"
                            type="checkbox"
                            defaultChecked={period.stopSale}
                          />
                          {labels.stopSale}
                        </label>
                        <button type="submit" className={adminButtonClass}>
                          {labels.saveAmendment}
                        </button>
                      </form>
                    </details>
                    )}

                    {showRates && (
                    <>
                    <div className="rounded border border-[var(--desk-line)] p-3">
                      <h5 className="text-xs font-bold tracking-wide text-[var(--desk-muted)] uppercase">
                        {labels.privateRates}
                      </h5>
                      {periodRates.length ? (
                        <ul className="mt-2 grid gap-1.5">
                          {periodRates.map((rate) => (
                            <li
                              key={rate.id}
                              className="flex items-center justify-between gap-2 rounded bg-[var(--desk-surface-muted)] px-2.5 py-2 text-xs"
                            >
                              <span>
                                <strong>{rate.agencyName}</strong> ·{" "}
                                {formatMoney(rate.pricePerNight, locale)}
                              </span>
                              <form action={deleteContractPeriodRateAction}>
                                <input
                                  type="hidden"
                                  name="purchaseId"
                                  value={purchaseId}
                                />
                                <input type="hidden" name="id" value={rate.id} />
                                <button
                                  type="submit"
                                  className={adminButtonDangerClass}
                                >
                                  {labels.delete}
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--desk-muted)]">
                          {labels.noPrivateRates}
                        </p>
                      )}
                      {companies.length > 0 && (
                        <form
                          action={saveContractPeriodRateAction}
                          className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem_auto] sm:items-end"
                        >
                          <input
                            type="hidden"
                            name="purchaseId"
                            value={purchaseId}
                          />
                          <input
                            type="hidden"
                            name="contractPeriodId"
                            value={period.id}
                          />
                          <Field label={labels.agency}>
                            <select
                              name="agencyId"
                              required
                              className={adminFieldClass}
                            >
                              {companies.map((agency) => (
                                <option key={agency.id} value={agency.id}>
                                  {agency.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label={labels.rate}>
                            <input
                              name="price"
                              inputMode="decimal"
                              required
                              className={adminFieldClass}
                            />
                          </Field>
                          <button type="submit" className={adminButtonClass}>
                            {labels.saveRate}
                          </button>
                        </form>
                      )}
                    </div>
                    <div className="rounded border border-[var(--desk-line)] p-3">
                      <h5 className="text-xs font-bold tracking-wide text-[var(--desk-muted)] uppercase">
                        {labels.groupRates}
                      </h5>
                      {periodGroupRates.length ? (
                        <ul className="mt-2 grid gap-1.5">
                          {periodGroupRates.map((rate) => (
                            <li
                              key={rate.id}
                              className="flex items-center justify-between gap-2 rounded bg-[var(--desk-surface-muted)] px-2.5 py-2 text-xs"
                            >
                              <span>
                                <strong>{rate.groupName}</strong> ·{" "}
                                {formatMoney(rate.pricePerNight, locale)}
                              </span>
                              <form action={deleteContractGroupRateAction}>
                                <input type="hidden" name="purchaseId" value={purchaseId} />
                                <input type="hidden" name="id" value={rate.id} />
                                <button type="submit" className={adminButtonDangerClass}>
                                  {labels.delete}
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--desk-muted)]">
                          {labels.noGroupRates}
                        </p>
                      )}
                      {groups.length > 0 && (
                        <form
                          action={saveContractGroupRateAction}
                          className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem_auto] sm:items-end"
                        >
                          <input type="hidden" name="purchaseId" value={purchaseId} />
                          <input type="hidden" name="contractPeriodId" value={period.id} />
                          <Field label={labels.group}>
                            <select name="groupId" required className={adminFieldClass}>
                              {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label={labels.rate}>
                            <input name="price" inputMode="decimal" required className={adminFieldClass} />
                          </Field>
                          <button type="submit" className={adminButtonClass}>
                            {labels.saveGroupRate}
                          </button>
                        </form>
                      )}
                    </div>
                    </>
                    )}
                  </div>
                  )}
                </article>
              );
            })}
        </div>
      </section>
      )}
    </AdminPanel>
  );
}
