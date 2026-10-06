"use client";

import { useState } from "react";
import { useAdminCopy } from "@/components/admin-locale";
import { AdminField, adminFieldClass } from "@/components/admin-ui";
import type { ClientKind } from "@/lib/inventory";

export function ClientFields({
  client,
}: {
  client?: {
    kind: ClientKind;
    name: string;
    country: string;
    contactName: string;
    email: string;
    phone: string;
    commercialRegistration: string;
    vatNumber: string;
    portalEmail?: string;
  };
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
