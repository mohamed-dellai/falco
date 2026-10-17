import { execute, query } from "@/lib/db";

export const serviceClientStatuses = ["new", "provisional", "confirmed", "cancelled"] as const;
export const servicePaymentStatuses = ["not_paid", "partial", "paid"] as const;
export const serviceProviderStatuses = ["new", "provisional", "confirmed", "cancelled"] as const;
export const serviceTaxTypes = ["sales", "profit", "none"] as const;

export type ServiceClientStatus = (typeof serviceClientStatuses)[number];
export type ServicePaymentStatus = (typeof servicePaymentStatuses)[number];
export type ServiceProviderStatus = (typeof serviceProviderStatuses)[number];
export type ServiceTaxType = (typeof serviceTaxTypes)[number];

export type ServiceType = {
  id: string;
  name: string;
};

export type DeskService = {
  id: string;
  number: number;
  typeId: string;
  typeName: string;
  agencyId: string;
  agencyName: string;
  hotelId: string;
  hotelName: string;
  bookingNumber: string;
  allotmentId: string;
  serviceDate: string;
  endDate: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  taxType: ServiceTaxType;
  guestName: string;
  description: string;
  internalNotes: string;
  clientStatus: ServiceClientStatus;
  paymentStatus: ServicePaymentStatus;
  providerStatus: ServiceProviderStatus;
};

const VAT_RATE = 15;

export function serviceTotals(service: Pick<DeskService, "quantity" | "unitCost" | "unitPrice" | "taxType">) {
  const cost = service.unitCost * service.quantity;
  const sell = service.unitPrice * service.quantity;
  if (service.taxType === "none") {
    return { cost, sell, vat: 0, gross: sell };
  }
  if (service.taxType === "profit") {
    const margin = Math.max(0, sell - cost);
    const vat = Math.round((margin * VAT_RATE) / (100 + VAT_RATE));
    return { cost, sell, vat, gross: sell };
  }
  const vat = Math.round((sell * VAT_RATE) / 100);
  return { cost, sell, vat, gross: sell + vat };
}

function asClient(value: string): ServiceClientStatus {
  return serviceClientStatuses.includes(value as ServiceClientStatus) ? (value as ServiceClientStatus) : "new";
}

function asPayment(value: string): ServicePaymentStatus {
  return servicePaymentStatuses.includes(value as ServicePaymentStatus) ? (value as ServicePaymentStatus) : "not_paid";
}

function asProvider(value: string): ServiceProviderStatus {
  return serviceProviderStatuses.includes(value as ServiceProviderStatus) ? (value as ServiceProviderStatus) : "new";
}

function asTax(value: string): ServiceTaxType {
  return serviceTaxTypes.includes(value as ServiceTaxType) ? (value as ServiceTaxType) : "sales";
}

export async function listServiceTypes() {
  const rows = await query<{ id: string; name: string }>(
    `SELECT id, name FROM service_types ORDER BY name`,
  );
  return rows.map((row): ServiceType => ({ id: row.id, name: row.name }));
}

export async function addServiceType(name: string) {
  const title = name.replace(/\u0000/g, "").trim().slice(0, 80);
  if (title.length < 2) return null;
  const id = crypto.randomUUID();
  await execute(`INSERT INTO service_types (id, name, created_at) VALUES (?, ?, ?)`, [
    id,
    title,
    new Date().toISOString(),
  ]);
  return id;
}

export async function deleteServiceType(id: string) {
  const used = await query<{ id: string }>(`SELECT id FROM desk_services WHERE type_id = ? LIMIT 1`, [id]);
  if (used[0]) return false;
  const result = await execute(`DELETE FROM service_types WHERE id = ?`, [id]);
  return (result.rowCount ?? 0) > 0;
}

type ServiceRow = {
  id: string;
  number: number;
  type_id: string;
  type_name: string;
  agency_id: string;
  agency_name: string | null;
  hotel_id: string;
  hotel_name: string | null;
  booking_number: string;
  allotment_id: string;
  service_date: string;
  end_date: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  tax_type: string;
  guest_name: string;
  description: string;
  internal_notes: string;
  client_status: string;
  payment_status: string;
  provider_status: string;
};

function mapService(row: ServiceRow): DeskService {
  return {
    id: row.id,
    number: Number(row.number),
    typeId: row.type_id,
    typeName: row.type_name,
    agencyId: row.agency_id,
    agencyName: row.agency_name ?? "",
    hotelId: row.hotel_id,
    hotelName: row.hotel_name ?? "",
    bookingNumber: row.booking_number,
    allotmentId: row.allotment_id,
    serviceDate: row.service_date,
    endDate: row.end_date,
    quantity: Number(row.quantity),
    unitCost: Number(row.unit_cost),
    unitPrice: Number(row.unit_price),
    taxType: asTax(row.tax_type),
    guestName: row.guest_name,
    description: row.description,
    internalNotes: row.internal_notes,
    clientStatus: asClient(row.client_status),
    paymentStatus: asPayment(row.payment_status),
    providerStatus: asProvider(row.provider_status),
  };
}

const serviceSelect = `
  SELECT service.id, service.number, service.type_id, type.name AS type_name,
         service.agency_id, agency.name AS agency_name,
         service.hotel_id, hotel.name AS hotel_name,
         service.booking_number, service.allotment_id, service.service_date, service.end_date,
         service.quantity, service.unit_cost, service.unit_price, service.tax_type,
         service.guest_name, service.description, service.internal_notes,
         service.client_status, service.payment_status, service.provider_status
  FROM desk_services AS service
  JOIN service_types AS type ON type.id = service.type_id
  LEFT JOIN agencies AS agency ON agency.id = service.agency_id
  LEFT JOIN hotels AS hotel ON hotel.id = service.hotel_id
`;

export async function listDeskServices(filter?: {
  typeId?: string;
  clientStatus?: string;
  paymentStatus?: string;
  providerStatus?: string;
  allotmentId?: string;
}) {
  const where: string[] = [];
  const args: string[] = [];
  if (filter?.allotmentId) {
    where.push("service.allotment_id = ?");
    args.push(filter.allotmentId);
  }
  if (filter?.typeId) {
    where.push("service.type_id = ?");
    args.push(filter.typeId);
  }
  if (filter?.clientStatus && serviceClientStatuses.includes(filter.clientStatus as ServiceClientStatus)) {
    where.push("service.client_status = ?");
    args.push(filter.clientStatus);
  }
  if (filter?.paymentStatus && servicePaymentStatuses.includes(filter.paymentStatus as ServicePaymentStatus)) {
    where.push("service.payment_status = ?");
    args.push(filter.paymentStatus);
  }
  if (filter?.providerStatus && serviceProviderStatuses.includes(filter.providerStatus as ServiceProviderStatus)) {
    where.push("service.provider_status = ?");
    args.push(filter.providerStatus);
  }
  const rows = await query<ServiceRow>(
    `${serviceSelect}
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY service.number DESC`,
    args,
  );
  return rows.map(mapService);
}

export async function getDeskService(id: string) {
  const rows = await query<ServiceRow>(`${serviceSelect} WHERE service.id = ?`, [id]);
  return rows[0] ? mapService(rows[0]) : null;
}

export async function saveDeskService(input: {
  id?: string;
  typeId: string;
  agencyId: string;
  hotelId: string;
  bookingNumber: string;
  serviceDate: string;
  endDate: string;
  quantity: number;
  unitCost: number | null;
  unitPrice: number;
  taxType: string;
  guestName: string;
  description: string;
  internalNotes: string;
  clientStatus: string;
  paymentStatus: string;
  providerStatus: string;
  allotmentId?: string;
}) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate) ||
    (input.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 999 ||
    (input.unitCost != null && (!Number.isInteger(input.unitCost) || input.unitCost < 0)) ||
    !Number.isInteger(input.unitPrice) ||
    input.unitPrice < 0
  ) {
    return null;
  }
  const type = await query<{ id: string }>(`SELECT id FROM service_types WHERE id = ?`, [input.typeId]);
  let agencyId = input.agencyId;
  let hotelId = input.hotelId;
  let booking = input.bookingNumber.replace(/\s+/g, "").slice(0, 40);
  let allotmentId = input.allotmentId ?? "";
  let unitCost = input.unitCost;
  let endDate = input.endDate;
  let clientStatus = input.clientStatus;
  let paymentStatus = input.paymentStatus;
  let providerStatus = input.providerStatus;
  if (input.id) {
    const current = await query<{
      allotment_id: string;
      unit_cost: number;
      end_date: string;
      booking_number: string;
      client_status: string;
      payment_status: string;
      provider_status: string;
    }>(
      `SELECT allotment_id, unit_cost, end_date, booking_number, client_status, payment_status, provider_status
       FROM desk_services WHERE id = ?`,
      [input.id],
    );
    if (input.allotmentId === undefined) allotmentId = current[0]?.allotment_id ?? "";
    if (current[0]) {
      if (unitCost == null) unitCost = Number(current[0].unit_cost);
      if (!endDate) endDate = current[0].end_date;
      if (!booking) booking = current[0].booking_number;
      if (!clientStatus) clientStatus = current[0].client_status;
      if (!paymentStatus) paymentStatus = current[0].payment_status;
      if (!providerStatus) providerStatus = current[0].provider_status;
    }
  }
  if (unitCost == null) unitCost = 0;
  if (allotmentId) {
    const stay = await query<{ id: string; number: string; agency_id: string; hotel_id: string | null }>(
      `SELECT id, number, agency_id, hotel_id FROM allotments WHERE id = ?`,
      [allotmentId],
    );
    if (!stay[0]) return null;
    agencyId = stay[0].agency_id;
    hotelId = stay[0].hotel_id || hotelId;
    booking = stay[0].number;
    allotmentId = stay[0].id;
  }
  const agency = agencyId
    ? await query<{ id: string }>(`SELECT id FROM agencies WHERE id = ?`, [agencyId])
    : [];
  const hotel = hotelId
    ? await query<{ id: string }>(`SELECT id FROM hotels WHERE id = ?`, [hotelId])
    : [];
  if (!type[0] || !agency[0] || !hotel[0]) return null;
  const description = input.description.replace(/\u0000/g, "").trim().slice(0, 2000);
  const guestName = input.guestName.replace(/\u0000/g, "").trim().slice(0, 120);
  const internalNotes = input.internalNotes.replace(/\u0000/g, "").trim().slice(0, 2000);
  const values = [
    input.typeId,
    agencyId,
    hotelId,
    booking,
    allotmentId,
    input.serviceDate,
    endDate,
    input.quantity,
    unitCost,
    input.unitPrice,
    asTax(input.taxType),
    guestName,
    description,
    internalNotes,
    asClient(clientStatus),
    asPayment(paymentStatus),
    asProvider(providerStatus),
  ];
  if (input.id) {
    const result = await execute(
      `UPDATE desk_services
       SET type_id = ?, agency_id = ?, hotel_id = ?, booking_number = ?, allotment_id = ?, service_date = ?, end_date = ?,
           quantity = ?, unit_cost = ?, unit_price = ?, tax_type = ?, guest_name = ?, description = ?, internal_notes = ?,
           client_status = ?, payment_status = ?, provider_status = ?
       WHERE id = ?`,
      [...values, input.id],
    );
    return (result.rowCount ?? 0) > 0 ? input.id : null;
  }
  const next = await query<{ number: number }>(`SELECT COALESCE(MAX(number), 0) + 1 AS number FROM desk_services`);
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO desk_services
      (id, number, type_id, agency_id, hotel_id, booking_number, allotment_id, service_date, end_date,
       quantity, unit_cost, unit_price, tax_type, guest_name, description, internal_notes,
       client_status, payment_status, provider_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, Number(next[0]?.number ?? 1), ...values, new Date().toISOString()],
  );
  return id;
}

export async function deleteDeskService(id: string, allotmentId?: string) {
  const result = await execute(
    allotmentId
      ? `DELETE FROM desk_services WHERE id = ? AND allotment_id = ?`
      : `DELETE FROM desk_services WHERE id = ?`,
    allotmentId ? [id, allotmentId] : [id],
  );
  return (result.rowCount ?? 0) > 0;
}
