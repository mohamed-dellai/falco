import crypto from "crypto";
import { execute, query, transaction, type SqlClient } from "@/lib/db";
import { nightsBetween } from "@/lib/money";
import {
  mealPlanCode,
  saleModeCode,
  type MealPlan,
  type SaleMode,
} from "@/lib/room-types";
import {
  contractLineRule,
  offerRule,
  type ContractRule,
} from "@/lib/stock";

export type ContractPolicy = {
  id: string;
  purchaseId: string;
  name: string;
  generalTerms: string;
  cancellationTerms: string;
  paymentTerms: string;
  releaseDays: number;
  refundable: boolean;
  contentAr: string;
  active: boolean;
  createdAt: string;
};

export type ContractPeriod = {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  purchaseLineId: string;
  offerId: string;
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  roomName: string;
  guests: number;
  board: MealPlan;
  view: string;
  policyId: string | null;
  policyName: string;
  generalTerms: string;
  cancellationTerms: string;
  paymentTerms: string;
  releaseDays: number;
  refundable: boolean;
  checkIn: string;
  checkOut: string;
  quantity: number;
  costPerNight: number;
  publicPricePerNight: number | null;
  defaultAgencyPricePerNight: number | null;
  minNights: number;
  saleMode: SaleMode;
  stopSale: boolean;
  overbookLimit: number;
  holdMinutes: number;
  active: boolean;
};

export type ContractPeriodRate = {
  id: string;
  contractPeriodId: string;
  agencyId: string;
  agencyName: string;
  pricePerNight: number;
};

export type ContractGroupRate = {
  id: string;
  contractPeriodId: string;
  groupId: string;
  groupName: string;
  pricePerNight: number;
};

type ContractPeriodRow = {
  id: string;
  purchase_id: string;
  purchase_number: string;
  purchase_line_id: string;
  offer_id: string | null;
  hotel_id: string;
  hotel_name: string;
  room_type_id: string | null;
  room_name: string;
  guests: number;
  board: string;
  view: string;
  policy_id: string | null;
  policy_name: string | null;
  general_terms: string | null;
  cancellation_terms: string | null;
  payment_terms: string | null;
  release_days: number | null;
  refundable: boolean | null;
  check_in: string;
  check_out: string;
  quantity: number;
  cost_per_night: number;
  public_price_per_night: number | null;
  default_agency_price_per_night: number | null;
  min_nights: number;
  sale_mode: string;
  stop_sale: boolean;
  overbook_limit: number;
  hold_minutes: number;
  active: boolean;
};

const periodSelect = `
  SELECT period.id, purchase.id AS purchase_id, purchase.number AS purchase_number,
         period.purchase_line_id, line.offer_id, purchase.hotel_id,
         hotel.name AS hotel_name, line.room_type_id, type.name AS room_name,
         type.guests, offer.board, offer.view, period.policy_id,
         policy.name AS policy_name, policy.general_terms,
         policy.cancellation_terms, policy.payment_terms, policy.release_days,
         policy.refundable, period.check_in, period.check_out, period.quantity,
         period.cost_per_night, period.public_price_per_night,
         period.default_agency_price_per_night, period.min_nights,
         period.sale_mode, period.stop_sale, period.overbook_limit,
         period.hold_minutes, period.active
  FROM contract_periods AS period
  JOIN purchase_lines AS line ON line.id = period.purchase_line_id
  JOIN purchases AS purchase ON purchase.id = line.purchase_id
  JOIN hotels AS hotel ON hotel.id = purchase.hotel_id
  JOIN offers AS offer ON offer.id = line.offer_id
  JOIN room_types AS type ON type.id = offer.room_type_id
  LEFT JOIN contract_policies AS policy ON policy.id = period.policy_id
`;

function mapPeriod(row: ContractPeriodRow): ContractPeriod {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    purchaseNumber: row.purchase_number,
    purchaseLineId: row.purchase_line_id,
    offerId: row.offer_id ?? "",
    hotelId: row.hotel_id,
    hotelName: row.hotel_name,
    roomTypeId: row.room_type_id ?? "",
    roomName: row.room_name,
    guests: Number(row.guests),
    board: mealPlanCode(row.board) ?? "room_only",
    view: row.view ?? "",
    policyId: row.policy_id,
    policyName: row.policy_name ?? "",
    generalTerms: row.general_terms ?? "",
    cancellationTerms: row.cancellation_terms ?? "",
    paymentTerms: row.payment_terms ?? "",
    releaseDays: Number(row.release_days ?? 0),
    refundable: row.refundable ?? true,
    checkIn: row.check_in,
    checkOut: row.check_out,
    quantity: Number(row.quantity),
    costPerNight: Number(row.cost_per_night),
    publicPricePerNight:
      row.public_price_per_night == null
        ? null
        : Number(row.public_price_per_night),
    defaultAgencyPricePerNight:
      row.default_agency_price_per_night == null
        ? null
        : Number(row.default_agency_price_per_night),
    minNights: Number(row.min_nights),
    saleMode: saleModeCode(row.sale_mode) ?? "book",
    stopSale: Boolean(row.stop_sale),
    overbookLimit: Number(row.overbook_limit),
    holdMinutes: Number(row.hold_minutes),
    active: Boolean(row.active),
  };
}

export const RELEASE_DAYS_ENFORCEMENT = "informational" as const;

export function policySnapshot(period: ContractPeriod) {
  return {
    name: period.policyName,
    generalTerms: period.generalTerms,
    cancellationTerms: period.cancellationTerms,
    paymentTerms: period.paymentTerms,
    releaseDays: period.releaseDays,
    releaseDaysEnforcement: RELEASE_DAYS_ENFORCEMENT,
    refundable: period.refundable,
  };
}

async function appendContractEvent(
  sql: Pick<SqlClient, "execute">,
  input: {
    purchaseId: string;
    contractPeriodId?: string | null;
    kind: string;
    actorId?: string | null;
    details?: Record<string, unknown>;
    createdAt?: string;
  },
) {
  await sql.execute(
    `INSERT INTO contract_events
      (id, purchase_id, contract_period_id, kind, actor_type, actor_id,
       payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)`,
    [
      crypto.randomUUID(),
      input.purchaseId,
      input.contractPeriodId ?? null,
      input.kind,
      input.actorId ? "admin" : "system",
      input.actorId ?? null,
      JSON.stringify(input.details ?? {}),
      input.createdAt ?? new Date().toISOString(),
    ],
  );
}

export async function listContractPolicies(purchaseId: string) {
  const rows = await query<{
    id: string;
    purchase_id: string;
    name: string;
    general_terms: string;
    cancellation_terms: string;
    payment_terms: string;
    release_days: number;
    refundable: boolean;
    content_ar: string;
    active: boolean;
    created_at: string;
  }>(
    `SELECT * FROM contract_policies
     WHERE purchase_id = ?
     ORDER BY active DESC, created_at, id`,
    [purchaseId],
  );
  return rows.map(
    (row): ContractPolicy => ({
      id: row.id,
      purchaseId: row.purchase_id,
      name: row.name,
      generalTerms: row.general_terms,
      cancellationTerms: row.cancellation_terms,
      paymentTerms: row.payment_terms,
      releaseDays: Number(row.release_days),
      refundable: Boolean(row.refundable),
      contentAr: row.content_ar ?? "",
      active: Boolean(row.active),
      createdAt: row.created_at,
    }),
  );
}

export async function listContractPeriods(purchaseId?: string) {
  const rows = await query<ContractPeriodRow>(
    `${periodSelect}
     ${purchaseId ? "WHERE purchase.id = ?" : ""}
     ORDER BY hotel.name, type.name, offer.board, offer.view,
              period.check_in, period.check_out, period.id`,
    purchaseId ? [purchaseId] : [],
  );
  return rows.map(mapPeriod);
}

export async function getContractPeriod(id: string) {
  const rows = await query<ContractPeriodRow>(
    `${periodSelect} WHERE period.id = ?`,
    [id],
  );
  return rows[0] ? mapPeriod(rows[0]) : null;
}

export async function listContractPeriodRates(purchaseId: string) {
  const rows = await query<{
    id: string;
    contract_period_id: string;
    agency_id: string;
    agency_name: string;
    price_per_night: number;
  }>(
    `SELECT rate.id, rate.contract_period_id, rate.agency_id,
            agency.name AS agency_name, rate.price_per_night
     FROM contract_period_rates AS rate
     JOIN contract_periods AS period ON period.id = rate.contract_period_id
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN agencies AS agency ON agency.id = rate.agency_id
     WHERE line.purchase_id = ?
     ORDER BY period.check_in, agency.name`,
    [purchaseId],
  );
  return rows.map(
    (row): ContractPeriodRate => ({
      id: row.id,
      contractPeriodId: row.contract_period_id,
      agencyId: row.agency_id,
      agencyName: row.agency_name,
      pricePerNight: Number(row.price_per_night),
    }),
  );
}

export async function createContractPolicy(input: {
  purchaseId: string;
  name: string;
  generalTerms: string;
  cancellationTerms: string;
  paymentTerms: string;
  releaseDays: number;
  refundable: boolean;
  contentAr?: string;
  actorId?: string | null;
}) {
  if (
    input.name.trim().length < 2 ||
    input.name.trim().length > 100 ||
    !Number.isInteger(input.releaseDays) ||
    input.releaseDays < 0 ||
    input.releaseDays > 365
  ) {
    return null;
  }
  const purchase = await query<{ id: string }>(
    "SELECT id FROM purchases WHERE id = ? AND status = 'confirmed'",
    [input.purchaseId],
  );
  if (!purchase[0]) return null;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await transaction(async (sql) => {
    await sql.execute(
      `INSERT INTO contract_policies
        (id, purchase_id, name, general_terms, cancellation_terms,
         payment_terms, release_days, refundable, content_ar, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        id,
        input.purchaseId,
        input.name.trim(),
        input.generalTerms.trim().slice(0, 5000),
        input.cancellationTerms.trim().slice(0, 5000),
        input.paymentTerms.trim().slice(0, 5000),
        input.releaseDays,
        input.refundable,
        (input.contentAr ?? "").trim().slice(0, 4000),
        createdAt,
      ],
    );
    await appendContractEvent(sql, {
      purchaseId: input.purchaseId,
      kind: "policy_created",
      actorId: input.actorId,
      details: {
        policyId: id,
        name: input.name.trim(),
        releaseDays: input.releaseDays,
        releaseDaysEnforcement: RELEASE_DAYS_ENFORCEMENT,
        refundable: input.refundable,
      },
      createdAt,
    });
  });
  return id;
}

export async function saveContractPolicyText(
  purchaseId: string,
  id: string,
  name: string,
  content: string,
  contentAr: string,
) {
  const title = name.trim().slice(0, 100);
  if (title.length < 2) return false;
  const result = await execute(
    `UPDATE contract_policies
     SET name = ?, general_terms = ?, cancellation_terms = '', payment_terms = '', content_ar = ?
     WHERE id = ? AND purchase_id = ?`,
    [title, content.trim().slice(0, 5000), contentAr.trim().slice(0, 4000), id, purchaseId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteContractPolicy(purchaseId: string, id: string) {
  return transaction(async (sql) => {
    await sql.execute(
      `UPDATE contract_periods AS period
       SET policy_id = NULL
       FROM purchase_lines AS line
       WHERE period.purchase_line_id = line.id
         AND line.purchase_id = ?
         AND period.policy_id = ?`,
      [purchaseId, id],
    );
    await sql.execute(
      `DELETE FROM contract_policies WHERE id = ? AND purchase_id = ?`,
      [id, purchaseId],
    );
    return true;
  });
}

export async function assignContractPeriodPolicy(
  purchaseId: string,
  periodId: string,
  policyId: string,
) {
  const result = await execute(
    `UPDATE contract_periods AS period
     SET policy_id = policy.id
     FROM purchase_lines AS line, contract_policies AS policy
     WHERE period.id = ?
       AND period.purchase_line_id = line.id
       AND line.purchase_id = ?
       AND policy.id = ?
       AND policy.purchase_id = line.purchase_id
       AND policy.active = TRUE`,
    [periodId, purchaseId, policyId],
  );
  return (result.rowCount ?? 0) > 0;
}

type AmendInput = {
  purchaseLineId: string;
  policyId: string;
  checkIn: string;
  checkOut: string;
  quantity: number;
  costPerNight: number;
  publicPricePerNight: number | null;
  defaultAgencyPricePerNight: number | null;
  minNights: number;
  saleMode: SaleMode;
  stopSale: boolean;
  overbookLimit: number;
  holdMinutes: number;
  actorId?: string | null;
};

type MutablePeriod = {
  id: string;
  policy_id: string | null;
  check_in: string;
  check_out: string;
  quantity: number;
  cost_per_night: number;
  public_price_per_night: number | null;
  default_agency_price_per_night: number | null;
  min_nights: number;
  sale_mode: string;
  stop_sale: boolean;
  overbook_limit: number;
  hold_minutes: number;
};

async function clonePeriod(
  sql: SqlClient,
  source: MutablePeriod,
  checkIn: string,
  checkOut: string,
  createdAt: string,
) {
  const id = crypto.randomUUID();
  await sql.execute(
    `INSERT INTO contract_periods
      (id, purchase_line_id, policy_id, check_in, check_out, quantity,
       cost_per_night, public_price_per_night, default_agency_price_per_night,
       min_nights, sale_mode, stop_sale, overbook_limit, hold_minutes,
       active, created_at)
     SELECT ?, purchase_line_id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?
     FROM contract_periods WHERE id = ?`,
    [
      id,
      source.policy_id,
      checkIn,
      checkOut,
      source.quantity,
      source.cost_per_night,
      source.public_price_per_night,
      source.default_agency_price_per_night,
      source.min_nights,
      source.sale_mode,
      source.stop_sale,
      source.overbook_limit,
      source.hold_minutes,
      createdAt,
      source.id,
    ],
  );
  const rates = await sql.query<{
    agency_id: string;
    price_per_night: number;
  }>(
    `SELECT agency_id, price_per_night
     FROM contract_period_rates WHERE contract_period_id = ?`,
    [source.id],
  );
  for (const rate of rates) {
    await sql.execute(
      `INSERT INTO contract_period_rates
        (id, contract_period_id, agency_id, price_per_night)
       VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), id, rate.agency_id, rate.price_per_night],
    );
  }
  return id;
}

async function maxTakenOnLine(
  sql: Pick<SqlClient, "query">,
  purchaseLineId: string,
  checkIn: string,
  checkOut: string,
) {
  const rows = await sql.query<{ taken: number }>(
    `SELECT COALESCE(MAX(day_taken), 0)::int AS taken
     FROM (
       SELECT COALESCE((
         SELECT SUM(sale.quantity)::int
         FROM allotment_lines AS sale
         JOIN allotments AS reservation ON reservation.id = sale.allotment_id
         WHERE sale.purchase_line_id = ?
           AND reservation.status IN ('provisional', 'confirmed')
           AND COALESCE(sale.supplier_status, 'new') NOT IN ('cancelled', 'no_show')
           AND reservation.check_in::date <= day.day::date
           AND reservation.check_out::date > day.day::date
       ), 0) AS day_taken
       FROM generate_series(
         ?::timestamp,
         (?::date - INTERVAL '1 day')::timestamp,
         INTERVAL '1 day'
       ) AS day(day)
     ) AS nights`,
    [purchaseLineId, checkIn, checkOut],
  );
  return Number(rows[0]?.taken ?? 0);
}

export async function amendContractPeriod(input: AmendInput) {
  if (
    nightsBetween(input.checkIn, input.checkOut) < 1 ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 0 ||
    !Number.isInteger(input.costPerNight) ||
    input.costPerNight < 0 ||
    (input.publicPricePerNight != null &&
      (!Number.isInteger(input.publicPricePerNight) ||
        input.publicPricePerNight < 0)) ||
    (input.defaultAgencyPricePerNight != null &&
      (!Number.isInteger(input.defaultAgencyPricePerNight) ||
        input.defaultAgencyPricePerNight < 0)) ||
    !Number.isInteger(input.minNights) ||
    input.minNights < 1 ||
    input.minNights > 120 ||
    !Number.isInteger(input.overbookLimit) ||
    input.overbookLimit < 0 ||
    input.overbookLimit > 5000 ||
    !Number.isInteger(input.holdMinutes) ||
    input.holdMinutes < 15 ||
    input.holdMinutes > 43_200
  ) {
    return { ok: false as const, error: "invalid" as const };
  }

  return transaction(async (sql) => {
    const line = await sql.query<{
      id: string;
      offer_id: string | null;
      check_in: string;
      check_out: string;
      purchase_id: string;
    }>(
      `SELECT line.id, line.offer_id, line.check_in, line.check_out, line.purchase_id
       FROM purchase_lines AS line
       JOIN purchases AS purchase ON purchase.id = line.purchase_id
       WHERE line.id = ? AND purchase.status = 'confirmed'`,
      [input.purchaseLineId],
    );
    if (
      !line[0]?.offer_id ||
      input.checkIn < line[0].check_in ||
      input.checkOut > line[0].check_out
    ) {
      return { ok: false as const, error: "window" as const };
    }
    const policy = await sql.query<{ id: string }>(
      `SELECT id FROM contract_policies
       WHERE id = ? AND purchase_id = ? AND active = TRUE`,
      [input.policyId, line[0].purchase_id],
    );
    if (!policy[0]) return { ok: false as const, error: "invalid" as const };

    await sql.query("SELECT id FROM offers WHERE id = ? FOR UPDATE", [
      line[0].offer_id,
    ]);
    await sql.query("SELECT id FROM purchase_lines WHERE id = ? FOR UPDATE", [
      input.purchaseLineId,
    ]);
    const periods = await sql.query<MutablePeriod>(
      `SELECT id, policy_id, check_in, check_out, quantity, cost_per_night,
              public_price_per_night, default_agency_price_per_night,
              min_nights, sale_mode, stop_sale, overbook_limit, hold_minutes
       FROM contract_periods
       WHERE purchase_line_id = ? AND active = TRUE
         AND check_in < ? AND check_out > ?
       ORDER BY check_in, id
       FOR UPDATE`,
      [input.purchaseLineId, input.checkOut, input.checkIn],
    );
    if (!periods.length) {
      return { ok: false as const, error: "window" as const };
    }
    const taken = await maxTakenOnLine(
      sql,
      input.purchaseLineId,
      input.checkIn,
      input.checkOut,
    );
    if (taken > input.quantity + input.overbookLimit) {
      return {
        ok: false as const,
        error: "quantity" as const,
        remaining: taken,
      };
    }

    const createdAt = new Date().toISOString();
    for (const period of periods) {
      await sql.execute(
        "UPDATE contract_periods SET active = FALSE WHERE id = ?",
        [period.id],
      );
      if (period.check_in < input.checkIn) {
        await clonePeriod(
          sql,
          period,
          period.check_in,
          input.checkIn,
          createdAt,
        );
      }
      if (period.check_out > input.checkOut) {
        await clonePeriod(
          sql,
          period,
          input.checkOut,
          period.check_out,
          createdAt,
        );
      }
    }

    const id = crypto.randomUUID();
    await sql.execute(
      `INSERT INTO contract_periods
        (id, purchase_line_id, policy_id, check_in, check_out, quantity,
         cost_per_night, public_price_per_night, default_agency_price_per_night,
         min_nights, sale_mode, stop_sale, overbook_limit, hold_minutes,
         active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        id,
        input.purchaseLineId,
        input.policyId,
        input.checkIn,
        input.checkOut,
        input.quantity,
        input.costPerNight,
        input.publicPricePerNight,
        input.defaultAgencyPricePerNight,
        input.minNights,
        input.saleMode,
        input.stopSale,
        input.overbookLimit,
        input.holdMinutes,
        createdAt,
      ],
    );

    const inherited = periods[0];
    const inheritedRates = await sql.query<{
      agency_id: string;
      price_per_night: number;
    }>(
      `SELECT agency_id, price_per_night
       FROM contract_period_rates WHERE contract_period_id = ?`,
      [inherited.id],
    );
    for (const rate of inheritedRates) {
      await sql.execute(
        `INSERT INTO contract_period_rates
          (id, contract_period_id, agency_id, price_per_night)
         VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), id, rate.agency_id, rate.price_per_night],
      );
    }
    await appendContractEvent(sql, {
      purchaseId: line[0].purchase_id,
      contractPeriodId: id,
      kind: "period_amended",
      actorId: input.actorId,
      details: {
        purchaseLineId: input.purchaseLineId,
        replacedPeriodIds: periods.map((period) => period.id),
        policyId: input.policyId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        quantity: input.quantity,
        costPerNight: input.costPerNight,
        publicPricePerNight: input.publicPricePerNight,
        defaultAgencyPricePerNight: input.defaultAgencyPricePerNight,
        minNights: input.minNights,
        saleMode: input.saleMode,
        stopSale: input.stopSale,
        overbookLimit: input.overbookLimit,
        holdMinutes: input.holdMinutes,
      },
      createdAt,
    });
    return { ok: true as const, id };
  });
}

export async function saveContractPeriodRate(input: {
  contractPeriodId: string;
  agencyId: string;
  pricePerNight: number;
  actorId?: string | null;
}) {
  if (!Number.isInteger(input.pricePerNight) || input.pricePerNight < 1) {
    return false;
  }
  const valid = await query<{ id: string; purchase_id: string }>(
    `SELECT period.id, line.purchase_id
     FROM contract_periods AS period
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     JOIN agencies AS agency ON agency.id = ?
     WHERE period.id = ? AND period.active = TRUE
       AND purchase.status = 'confirmed' AND agency.kind = 'agency'`,
    [input.agencyId, input.contractPeriodId],
  );
  if (!valid[0]) return false;
  await transaction(async (sql) => {
    await sql.execute(
      `INSERT INTO contract_period_rates
        (id, contract_period_id, agency_id, price_per_night)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (contract_period_id, agency_id)
       DO UPDATE SET price_per_night = EXCLUDED.price_per_night`,
      [
        crypto.randomUUID(),
        input.contractPeriodId,
        input.agencyId,
        input.pricePerNight,
      ],
    );
    await appendContractEvent(sql, {
      purchaseId: valid[0].purchase_id,
      contractPeriodId: input.contractPeriodId,
      kind: "period_rate_saved",
      actorId: input.actorId,
      details: {
        agencyId: input.agencyId,
        pricePerNight: input.pricePerNight,
      },
    });
  });
  return true;
}

export async function listContractGroupRates(purchaseId: string) {
  const rows = await query<{
    id: string;
    contract_period_id: string;
    group_id: string;
    group_name: string;
    price_per_night: number;
  }>(
    `SELECT rate.id, rate.contract_period_id, rate.group_id,
            client_group.name AS group_name, rate.price_per_night
     FROM contract_group_rates AS rate
     JOIN contract_periods AS period ON period.id = rate.contract_period_id
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN client_groups AS client_group ON client_group.id = rate.group_id
     WHERE line.purchase_id = ?
     ORDER BY period.check_in, client_group.name`,
    [purchaseId],
  );
  return rows.map(
    (row): ContractGroupRate => ({
      id: row.id,
      contractPeriodId: row.contract_period_id,
      groupId: row.group_id,
      groupName: row.group_name,
      pricePerNight: Number(row.price_per_night),
    }),
  );
}

export async function saveContractGroupRate(input: {
  contractPeriodId: string;
  groupId: string;
  pricePerNight: number;
  actorId?: string | null;
}) {
  if (!Number.isInteger(input.pricePerNight) || input.pricePerNight < 1) {
    return false;
  }
  const valid = await query<{ id: string; purchase_id: string }>(
    `SELECT period.id, line.purchase_id
     FROM contract_periods AS period
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     JOIN client_groups AS client_group ON client_group.id = ?
     WHERE period.id = ? AND period.active = TRUE
       AND purchase.status = 'confirmed'`,
    [input.groupId, input.contractPeriodId],
  );
  if (!valid[0]) return false;
  await transaction(async (sql) => {
    await sql.execute(
      `INSERT INTO contract_group_rates
        (id, contract_period_id, group_id, price_per_night)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (contract_period_id, group_id)
       DO UPDATE SET price_per_night = EXCLUDED.price_per_night`,
      [
        crypto.randomUUID(),
        input.contractPeriodId,
        input.groupId,
        input.pricePerNight,
      ],
    );
    await appendContractEvent(sql, {
      purchaseId: valid[0].purchase_id,
      contractPeriodId: input.contractPeriodId,
      kind: "period_rate_saved",
      actorId: input.actorId,
      details: {
        groupId: input.groupId,
        pricePerNight: input.pricePerNight,
      },
    });
  });
  return true;
}

export async function deleteContractGroupRate(
  id: string,
  actorId?: string | null,
) {
  const rows = await query<{
    contract_period_id: string;
    group_id: string;
    purchase_id: string;
    price_per_night: number;
  }>(
    `SELECT rate.contract_period_id, rate.group_id, line.purchase_id,
            rate.price_per_night
     FROM contract_group_rates AS rate
     JOIN contract_periods AS period ON period.id = rate.contract_period_id
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     WHERE rate.id = ?`,
    [id],
  );
  if (!rows[0]) return false;
  await transaction(async (sql) => {
    await sql.execute("DELETE FROM contract_group_rates WHERE id = ?", [id]);
    await appendContractEvent(sql, {
      purchaseId: rows[0].purchase_id,
      contractPeriodId: rows[0].contract_period_id,
      kind: "period_rate_deleted",
      actorId,
      details: {
        groupId: rows[0].group_id,
        pricePerNight: Number(rows[0].price_per_night),
      },
    });
  });
  return true;
}

export async function deleteContractPeriodRate(
  id: string,
  actorId?: string | null,
) {
  const rows = await query<{
    contract_period_id: string;
    agency_id: string;
    purchase_id: string;
    price_per_night: number;
  }>(
    `SELECT rate.contract_period_id, rate.agency_id, line.purchase_id,
            rate.price_per_night
     FROM contract_period_rates AS rate
     JOIN contract_periods AS period ON period.id = rate.contract_period_id
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     WHERE rate.id = ?`,
    [id],
  );
  if (!rows[0]) return false;
  await transaction(async (sql) => {
    await sql.execute("DELETE FROM contract_period_rates WHERE id = ?", [id]);
    await appendContractEvent(sql, {
      purchaseId: rows[0].purchase_id,
      contractPeriodId: rows[0].contract_period_id,
      kind: "period_rate_deleted",
      actorId,
      details: {
        agencyId: rows[0].agency_id,
        pricePerNight: Number(rows[0].price_per_night),
      },
    });
  });
  return true;
}

export async function syncLegacyContractRate(input: {
  purchaseLineId: string;
  agencyId: string;
  pricePerNight: number;
  actorId?: string | null;
}) {
  if (!Number.isInteger(input.pricePerNight) || input.pricePerNight < 1) {
    return false;
  }
  return transaction(async (sql) => {
    const line = await sql.query<{ id: string; purchase_id: string }>(
      `SELECT line.id, line.purchase_id
       FROM purchase_lines AS line
       JOIN purchases AS purchase ON purchase.id = line.purchase_id
       WHERE line.id = ? AND purchase.status = 'confirmed'`,
      [input.purchaseLineId],
    );
    const agency = await sql.query<{ id: string; kind: string | null }>(
      "SELECT id, kind FROM agencies WHERE id = ?",
      [input.agencyId],
    );
    if (!line[0] || !agency[0] || agency[0].kind === "individual") return false;
    const periods = await sql.query<{ id: string }>(
      `SELECT id FROM contract_periods
       WHERE purchase_line_id = ? AND active = TRUE
       ORDER BY check_in, id`,
      [input.purchaseLineId],
    );
    if (!periods.length) return false;
    await sql.execute(
      `INSERT INTO contract_rates
        (id, purchase_line_id, agency_id, price_per_night)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (purchase_line_id, agency_id)
       DO UPDATE SET price_per_night = EXCLUDED.price_per_night`,
      [
        crypto.randomUUID(),
        input.purchaseLineId,
        input.agencyId,
        input.pricePerNight,
      ],
    );
    for (const period of periods) {
      await sql.execute(
        `INSERT INTO contract_period_rates
          (id, contract_period_id, agency_id, price_per_night)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (contract_period_id, agency_id)
         DO UPDATE SET price_per_night = EXCLUDED.price_per_night`,
        [
          crypto.randomUUID(),
          period.id,
          input.agencyId,
          input.pricePerNight,
        ],
      );
    }
    await appendContractEvent(sql, {
      purchaseId: line[0].purchase_id,
      kind: "legacy_rate_synchronized",
      actorId: input.actorId,
      details: {
        purchaseLineId: input.purchaseLineId,
        agencyId: input.agencyId,
        pricePerNight: input.pricePerNight,
        periodIds: periods.map((period) => period.id),
      },
    });
    return true;
  });
}

export async function removeLegacyContractRate(
  id: string,
  actorId?: string | null,
) {
  return transaction(async (sql) => {
    const rows = await sql.query<{
      purchase_line_id: string;
      agency_id: string;
      purchase_id: string;
      price_per_night: number;
    }>(
      `SELECT rate.purchase_line_id, rate.agency_id, line.purchase_id,
              rate.price_per_night
       FROM contract_rates AS rate
       JOIN purchase_lines AS line ON line.id = rate.purchase_line_id
       WHERE rate.id = ?`,
      [id],
    );
    const rate = rows[0];
    if (!rate) return false;
    await sql.execute(
      `DELETE FROM contract_period_rates AS private
       USING contract_periods AS period
       WHERE private.contract_period_id = period.id
         AND period.purchase_line_id = ?
         AND private.agency_id = ?`,
      [rate.purchase_line_id, rate.agency_id],
    );
    await sql.execute("DELETE FROM contract_rates WHERE id = ?", [id]);
    await appendContractEvent(sql, {
      purchaseId: rate.purchase_id,
      kind: "legacy_rate_removed",
      actorId,
      details: {
        purchaseLineId: rate.purchase_line_id,
        agencyId: rate.agency_id,
        pricePerNight: Number(rate.price_per_night),
      },
    });
    return true;
  });
}

export type ReservationSelection = {
  contractPeriodId: string;
  quantity: number;
};

export type PreparedSelection = {
  period: ContractPeriod;
  quantity: number;
};

export async function lockAndPrepareSelections(
  sql: SqlClient,
  selections: ReservationSelection[],
  checkIn: string,
  checkOut: string,
  options?: {
    ignoreAllotmentId?: string;
    allowStopSale?: boolean;
    allowInsufficient?: boolean;
    allowOverbook?: boolean;
  },
) {
  if (nightsBetween(checkIn, checkOut) < 1 || !selections.length) {
    return { ok: false as const, error: "dates" as const };
  }
  const quantities = new Map<string, number>();
  for (const selection of selections) {
    if (
      !selection.contractPeriodId ||
      !Number.isInteger(selection.quantity) ||
      selection.quantity < 1 ||
      selection.quantity > 5000
    ) {
      return { ok: false as const, error: "quantity" as const };
    }
    quantities.set(
      selection.contractPeriodId,
      (quantities.get(selection.contractPeriodId) ?? 0) + selection.quantity,
    );
  }
  const ids = [...quantities.keys()].sort();
  const initial = await sql.query<ContractPeriodRow>(
    `${periodSelect}
     WHERE period.id IN (${ids.map(() => "?").join(", ")})`,
    ids,
  );
  if (initial.length !== ids.length) {
    return { ok: false as const, error: "missing-room" as const };
  }
  const offers = [...new Set(initial.map((row) => row.offer_id).filter(Boolean))]
    .sort() as string[];
  const lines = [...new Set(initial.map((row) => row.purchase_line_id))].sort();
  await sql.query(
    `SELECT id FROM offers
     WHERE id IN (${offers.map(() => "?").join(", ")})
     ORDER BY id FOR UPDATE`,
    offers,
  );
  await sql.query(
    `SELECT id FROM purchase_lines
     WHERE id IN (${lines.map(() => "?").join(", ")})
     ORDER BY id FOR UPDATE`,
    lines,
  );
  await sql.query(
    `SELECT id FROM contract_periods
     WHERE id IN (${ids.map(() => "?").join(", ")})
     ORDER BY id FOR UPDATE`,
    ids,
  );
  const current = await sql.query<ContractPeriodRow>(
    `${periodSelect}
     WHERE period.id IN (${ids.map(() => "?").join(", ")})`,
    ids,
  );
  const byId = new Map(current.map((row) => [row.id, row]));
  const prepared = [...quantities.keys()].flatMap((id) => {
    const row = byId.get(id);
    return row ? [{ period: mapPeriod(row), quantity: quantities.get(id) ?? 0 }] : [];
  });
  if (prepared.length !== ids.length) {
    return { ok: false as const, error: "missing-room" as const };
  }
  const requestedByLine = new Map<string, number>();
  const requestedByOffer = new Map<string, number>();
  for (const item of prepared) {
    const { period, quantity } = item;
    if (
      !period.active ||
      period.checkIn > checkIn ||
      period.checkOut < checkOut ||
      nightsBetween(checkIn, checkOut) < period.minNights
    ) {
      return { ok: false as const, error: "window" as const };
    }
    if (period.stopSale && !options?.allowStopSale) {
      return { ok: false as const, error: "stop-sale" as const };
    }
    if (period.saleMode === "request") continue;
    requestedByLine.set(
      period.purchaseLineId,
      (requestedByLine.get(period.purchaseLineId) ?? 0) + quantity,
    );
    requestedByOffer.set(
      period.offerId,
      (requestedByOffer.get(period.offerId) ?? 0) + quantity,
    );
  }
  const allowance = (rule: ContractRule) =>
    options?.allowOverbook && rule.quantityLeft === 0
      ? rule.overbookLeft
      : rule.quantityLeft;
  let available = true;
  let remaining = Number.POSITIVE_INFINITY;
  for (const [lineId, requested] of requestedByLine) {
    const rule = await contractLineRule(
      lineId,
      checkIn,
      checkOut,
      sql,
      options?.ignoreAllotmentId,
      options?.allowStopSale,
    );
    const free = allowance(rule);
    remaining = Math.min(remaining, free);
    if (requested > free) {
      available = false;
      if (!options?.allowInsufficient) {
        return {
          ok: false as const,
          error: "quantity" as const,
          remaining: free,
        };
      }
    }
  }
  for (const [offerId, requested] of requestedByOffer) {
    const rule = await offerRule(
      offerId,
      checkIn,
      checkOut,
      sql,
      options?.ignoreAllotmentId,
      options?.allowStopSale,
    );
    const free = allowance(rule);
    remaining = Math.min(remaining, free);
    if (requested > free) {
      available = false;
      if (!options?.allowInsufficient) {
        return {
          ok: false as const,
          error: "quantity" as const,
          remaining: free,
        };
      }
    }
  }
  return {
    ok: true as const,
    selections: prepared,
    available,
    remaining: Number.isFinite(remaining) ? remaining : 0,
  };
}
