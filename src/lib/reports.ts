import { query } from "@/lib/db";
import {
  nightsBetween,
  shiftIsoDate,
  todayInRiyadh,
} from "@/lib/money";
import { releaseExpiredHolds } from "@/lib/stock";

export type ReportFilters = {
  from: string;
  to: string;
  hotelId: string;
  offerId: string;
  city: string;
  channel: "" | "desk" | "b2b" | "b2c";
};

export type ReportDay = {
  day: string;
  contracted: number;
  overbook: number;
  reserved: number;
  free: number;
  arrivals: number;
  departures: number;
  revenue: number;
  cost: number;
  margin: number;
};

export type SourceMetric = {
  channel: "desk" | "b2b" | "b2c";
  reservations: number;
  roomNights: number;
  revenue: number;
};

export type ReservationReport = {
  filters: ReportFilters;
  days: ReportDay[];
  totals: {
    contractedRoomNights: number;
    overbookRoomNights: number;
    reservedRoomNights: number;
    freeRoomNights: number;
    arrivals: number;
    departures: number;
    occupancy: number;
    averageSellingPrice: number;
    revenue: number;
    cost: number;
    margin: number;
  };
  sources: SourceMetric[];
  queues: {
    requests: number;
    cancellations: number;
    expiringHolds: number;
  };
};

type PeriodRow = {
  hotel_id: string;
  offer_id: string;
  city: string;
  check_in: string;
  check_out: string;
  quantity: number;
  overbook_limit: number;
};

type ReservationLineRow = {
  reservation_id: string;
  status: string;
  channel: string;
  hotel_id: string;
  offer_id: string;
  city: string;
  check_in: string;
  check_out: string;
  hold_until: string | null;
  cancel_requested_at: string | null;
  quantity: number;
  cost_per_night: number;
  agency_price_per_night: number;
};

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function reportFilters(
  input: Partial<Record<keyof ReportFilters, string | undefined>>,
): ReportFilters {
  const today = todayInRiyadh();
  const from = validDate(input.from) || today;
  const proposedTo = validDate(input.to) || shiftIsoDate(from, 30);
  const to =
    nightsBetween(from, proposedTo) >= 1 &&
    nightsBetween(from, proposedTo) <= 366
      ? proposedTo
      : shiftIsoDate(from, 30);
  const channel = ["desk", "b2b", "b2c"].includes(input.channel ?? "")
    ? (input.channel as ReportFilters["channel"])
    : "";
  return {
    from,
    to,
    hotelId: input.hotelId ?? "",
    offerId: input.offerId ?? "",
    city: input.city ?? "",
    channel,
  };
}

function reportDays(from: string, to: string) {
  const days: string[] = [];
  for (let day = from; day < to; day = shiftIsoDate(day, 1)) {
    days.push(day);
  }
  return days;
}

function activeHold(row: ReservationLineRow, now: number) {
  if (row.status === "confirmed") return true;
  if (row.status !== "provisional" || !row.hold_until) return false;
  const expiry = new Date(row.hold_until).getTime();
  return Number.isFinite(expiry) && expiry > now;
}

function appliesToDay(
  row: { check_in: string; check_out: string },
  day: string,
) {
  return row.check_in <= day && row.check_out > day;
}

export async function reservationReport(filters: ReportFilters) {
  await releaseExpiredHolds();
  const [periods, lines] = await Promise.all([
    query<PeriodRow>(
      `SELECT purchase.hotel_id, line.offer_id, hotel.city, period.check_in,
              period.check_out, period.quantity, period.overbook_limit
       FROM contract_periods AS period
       JOIN purchase_lines AS line ON line.id = period.purchase_line_id
       JOIN purchases AS purchase ON purchase.id = line.purchase_id
       JOIN hotels AS hotel ON hotel.id = purchase.hotel_id
       WHERE period.active = TRUE AND purchase.status = 'confirmed'
         AND period.check_in < ? AND period.check_out > ?`,
      [filters.to, filters.from],
    ),
    query<ReservationLineRow>(
      `SELECT reservation.id AS reservation_id, reservation.status,
              reservation.channel, offer.hotel_id, offer.id AS offer_id, hotel.city,
              reservation.check_in, reservation.check_out,
              reservation.hold_until, reservation.cancel_requested_at,
              line.quantity, line.cost_per_night,
              line.agency_price_per_night
       FROM allotment_lines AS line
       JOIN allotments AS reservation ON reservation.id = line.allotment_id
       JOIN offers AS offer ON offer.id = line.offer_id
       JOIN hotels AS hotel ON hotel.id = offer.hotel_id
       WHERE reservation.check_in < ? AND reservation.check_out > ?`,
      [filters.to, filters.from],
    ),
  ]);
  const periodRows = periods.filter(
    (period) =>
      (!filters.hotelId || period.hotel_id === filters.hotelId) &&
      (!filters.offerId || period.offer_id === filters.offerId) &&
      (!filters.city || period.city === filters.city),
  );
  const reservationRows = lines.filter(
    (line) =>
      (!filters.hotelId || line.hotel_id === filters.hotelId) &&
      (!filters.offerId || line.offer_id === filters.offerId) &&
      (!filters.city || line.city === filters.city) &&
      (!filters.channel || line.channel === filters.channel),
  );
  const now = Date.now();
  const holding = reservationRows.filter((line) => activeHold(line, now));
  const confirmed = reservationRows.filter(
    (line) => line.status === "confirmed",
  );
  const days = reportDays(filters.from, filters.to).map((day): ReportDay => {
    const dayPeriods = periodRows.filter((period) =>
      appliesToDay(period, day),
    );
    const dayLines = holding.filter((line) => appliesToDay(line, day));
    const contracted = dayPeriods.reduce(
      (sum, period) => sum + Number(period.quantity),
      0,
    );
    const overbook = dayPeriods.reduce(
      (sum, period) => sum + Number(period.overbook_limit),
      0,
    );
    const reserved = dayLines.reduce(
      (sum, line) => sum + Number(line.quantity),
      0,
    );
    const revenue = dayLines.reduce(
      (sum, line) =>
        sum + Number(line.agency_price_per_night) * Number(line.quantity),
      0,
    );
    const cost = dayLines.reduce(
      (sum, line) =>
        sum + Number(line.cost_per_night) * Number(line.quantity),
      0,
    );
    return {
      day,
      contracted,
      overbook,
      reserved,
      free: Math.max(0, contracted + overbook - reserved),
      arrivals: confirmed
        .filter((line) => line.check_in === day)
        .reduce((sum, line) => sum + Number(line.quantity), 0),
      departures: confirmed
        .filter((line) => line.check_out === day)
        .reduce((sum, line) => sum + Number(line.quantity), 0),
      revenue,
      cost,
      margin: revenue - cost,
    };
  });
  const sourceChannels = ["desk", "b2b", "b2c"] as const;
  const sources = sourceChannels.map((channel): SourceMetric => {
    const channelLines = holding.filter((line) => line.channel === channel);
    const reservations = new Set(
      channelLines.map((line) => line.reservation_id),
    ).size;
    const roomNights = channelLines.reduce(
      (sum, line) =>
        sum +
        Number(line.quantity) *
          Math.max(
            0,
            nightsBetween(
              line.check_in < filters.from ? filters.from : line.check_in,
              line.check_out > filters.to ? filters.to : line.check_out,
            ),
          ),
      0,
    );
    const revenue = channelLines.reduce((sum, line) => {
      const nights = Math.max(
        0,
        nightsBetween(
          line.check_in < filters.from ? filters.from : line.check_in,
          line.check_out > filters.to ? filters.to : line.check_out,
        ),
      );
      return (
        sum +
        Number(line.agency_price_per_night) *
          Number(line.quantity) *
          nights
      );
    }, 0);
    return { channel, reservations, roomNights, revenue };
  });
  const total = (key: keyof ReportDay) =>
    days.reduce((sum, day) => sum + Number(day[key]), 0);
  const reservedRoomNights = total("reserved");
  const capacityRoomNights = total("contracted") + total("overbook");
  const revenue = total("revenue");
  const cost = total("cost");
  const uniqueReservations = new Map<
    string,
    {
      status: string;
      cancellation: string | null;
      holdUntil: string | null;
    }
  >();
  for (const line of reservationRows) {
    uniqueReservations.set(line.reservation_id, {
      status: line.status,
      cancellation: line.cancel_requested_at,
      holdUntil: line.hold_until,
    });
  }
  const reservations = [...uniqueReservations.values()];
  return {
    filters,
    days,
    totals: {
      contractedRoomNights: total("contracted"),
      overbookRoomNights: total("overbook"),
      reservedRoomNights,
      freeRoomNights: total("free"),
      arrivals: total("arrivals"),
      departures: total("departures"),
      occupancy:
        capacityRoomNights > 0
          ? (reservedRoomNights / capacityRoomNights) * 100
          : 0,
      averageSellingPrice:
        reservedRoomNights > 0 ? revenue / reservedRoomNights : 0,
      revenue,
      cost,
      margin: revenue - cost,
    },
    sources,
    queues: {
      requests: reservations.filter((item) => item.status === "request").length,
      cancellations: reservations.filter(
        (item) =>
          item.cancellation &&
          !["cancelled", "no_show", "unavailable", "regret"].includes(item.status),
      ).length,
      expiringHolds: reservations.filter(
        (item) =>
          item.status === "provisional" &&
          item.holdUntil &&
          new Date(item.holdUntil).getTime() > now &&
          new Date(item.holdUntil).getTime() <= now + 24 * 60 * 60 * 1000,
      ).length,
    },
  } satisfies ReservationReport;
}

export async function hotelReportDays(
  hotelId: string,
  from: string,
  to: string,
) {
  return (
    await reservationReport(
      reportFilters({ hotelId, from, to }),
    )
  ).days;
}
