"use client";

import { useState } from "react";
import { useAdminCopy } from "@/components/admin-locale";
import { AdminField, adminFieldClass } from "@/components/admin-ui";
import type { ClientKind } from "@/lib/inventory";

export function ClientFields({
  client,
  groups,
  portal = false,
}: {
  client?: {
    kind: ClientKind;
    name: string;
    nameAr: string;
    country: string;
    contactName: string;
    email: string;
    phone: string;
    commercialRegistration: string;
    vatNumber: string;
    vatNotRequired: boolean;
    groupId: string | null;
    portalEmail?: string;
  };
  groups: Array<{ id: string; name: string }>;
  portal?: boolean;
}) {
  const copy = useAdminCopy();
  const [kind, setKind] = useState<ClientKind>(client?.kind ?? "agency");
  const individual = kind === "individual";

  return (
    <>
      <AdminField
        label={copy.clientKind}
        hint={individual ? copy.individualHint : copy.agencyHint}
      >
        <select
          name="kind"
          value={kind}
          onChange={(event) =>
            setKind(event.target.value === "individual" ? "individual" : "agency")
          }
          className={adminFieldClass}
        >
          <option value="agency">{copy.agency}</option>
          <option value="individual">{copy.individual}</option>
        </select>
      </AdminField>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label={individual ? copy.fullName : copy.agencyName}>
          <input
            name="name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={client?.name}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label={copy.hotelNameAr}>
          <input
            name="nameAr"
            maxLength={140}
            defaultValue={client?.nameAr}
            className={adminFieldClass}
          />
        </AdminField>
      </div>
      <AdminField label={copy.country}>
        <input
          name="country"
          maxLength={80}
          defaultValue={client?.country}
          className={adminFieldClass}
        />
      </AdminField>
      {!individual && (
        <>
          <AdminField label={copy.contact}>
            <input
              name="contactName"
              maxLength={120}
              defaultValue={client?.contactName}
              className={adminFieldClass}
            />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label={copy.commercialRegistration}>
              <input
                name="commercialRegistration"
                maxLength={40}
                defaultValue={client?.commercialRegistration}
                className={adminFieldClass}
              />
            </AdminField>
            <AdminField label={copy.vatNumber}>
              <input
                name="vatNumber"
                maxLength={40}
                defaultValue={client?.vatNumber}
                className={adminFieldClass}
              />
            </AdminField>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-[var(--desk-line)] px-4 py-3">
            <input
              type="checkbox"
              name="vatNotRequired"
              value="1"
              defaultChecked={client?.vatNotRequired ?? false}
              className="mt-1 size-4"
            />
            <span>
              <span className="block text-sm font-semibold">{copy.vatNotRequired}</span>
              <span className="mt-1 block text-sm text-[var(--desk-muted)]">
                {copy.vatNotRequiredHint}
              </span>
            </span>
          </label>
          <AdminField label={copy.clientGroup} hint={copy.groupRateHint}>
            <select
              name="groupId"
              defaultValue={client?.groupId ?? ""}
              className={adminFieldClass}
            >
              <option value="">{copy.noClientGroup}</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </AdminField>
          {portal && (
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label={copy.portalEmail}>
                <input
                  name="portalEmail"
                  type="email"
                  maxLength={160}
                  defaultValue={client?.portalEmail}
                  className={adminFieldClass}
                />
              </AdminField>
              <AdminField label={copy.portalPassword} hint={copy.portalPasswordHint}>
                <input
                  name="portalPassword"
                  type="password"
                  autoComplete="new-password"
                  maxLength={200}
                  className={adminFieldClass}
                />
              </AdminField>
            </div>
          )}
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label={copy.email}>
          <input
            name="email"
            type="email"
            maxLength={160}
            defaultValue={client?.email}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label={copy.phone}>
          <input
            name="phone"
            maxLength={40}
            defaultValue={client?.phone}
            className={adminFieldClass}
          />
        </AdminField>
      </div>
    </>
  );
}

export function PortalFields({
  portalEmail,
}: {
  portalEmail?: string;
}) {
  const copy = useAdminCopy();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AdminField label={copy.portalEmail}>
        <input
          name="portalEmail"
          type="email"
          maxLength={160}
          defaultValue={portalEmail}
          className={adminFieldClass}
        />
      </AdminField>
      <AdminField label={copy.portalPassword} hint={copy.portalPasswordHint}>
        <input
          name="portalPassword"
          type="password"
          autoComplete="new-password"
          maxLength={200}
          className={adminFieldClass}
        />
      </AdminField>
    </div>
  );
}
