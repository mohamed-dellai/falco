import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!testDatabaseUrl);

type Db = typeof import("@/lib/db");
type Reservations = typeof import("@/lib/reservations");
type Contracts = typeof import("@/lib/contracts");
type Cart = typeof import("@/lib/agency-cart");
type Reports = typeof import("@/lib/reports");
type Inventory = typeof import("@/lib/inventory");
type HoldRelease = typeof import("@/lib/hold-release");
type Stock = typeof import("@/lib/stock");

integration("booking desk integration", () => {
  let db: Db;
  let reservations: Reservations;
  let contracts: Contracts;
  let cart: Cart;
  let reports: Reports;
  let inventory: Inventory;
  let holdRelease: HoldRelease;
  let stock: Stock;

  const stay = { checkIn: "2030-01-10", checkOut: "2030-01-13" };

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    db = await import("@/lib/db");
    reservations = await import("@/lib/reservations");
    contracts = await import("@/lib/contracts");
    cart = await import("@/lib/agency-cart");
    reports = await import("@/lib/reports");
    inventory = await import("@/lib/inventory");
    holdRelease = await import("@/lib/hold-release");
    stock = await import("@/lib/stock");
    await db.query("SELECT 1");
  });

  beforeEach(async () => {
    await db.execute(
      `TRUNCATE TABLE
         job_runs, agency_checkout_attempts, contract_events,
         reservation_events, agency_cart_lines, agency_carts,
         contract_period_rates, contract_periods, contract_policies,
         contract_rates, allotment_lines, allotments, bookings, assignments,
         purchase_lines, purchases, offer_photos, offers, room_photos, rooms,
         hotel_photos, agency_logins, agencies, room_types, hotels
       CASCADE`,
    );
    const createdAt = new Date().toISOString();
    await db.execute(
      `INSERT INTO hotels
        (id, name, city, address, description, stars, distance_to_haram,
         reservation_email, reservation_phone, reservation_whatsapp, created_at)
       VALUES
        ('hotel-1', 'Ledger Hotel', 'makkah', 'Test Street', '', 5, '',
         'hotel@example.test', '+966500000001', '+966500000001', ?)`,
      [createdAt],
    );
    await db.execute(
      `INSERT INTO room_types
        (id, name, guests, board, view, description, created_at)
       VALUES
        ('type-double', 'double', 2, 'room_only', '', '', ?),
        ('type-triple', 'triple', 3, 'breakfast', '', '', ?)`,
      [createdAt, createdAt],
    );
    await db.execute(
      `INSERT INTO offers
        (id, hotel_id, room_type_id, board, view, created_at)
       VALUES
        ('offer-room', 'hotel-1', 'type-double', 'room_only', 'City', ?),
        ('offer-breakfast', 'hotel-1', 'type-triple', 'breakfast', 'Haram', ?)`,
      [createdAt, createdAt],
    );
    await db.execute(
      `INSERT INTO agencies
        (id, name, kind, country, contact_name, email, phone,
         commercial_registration, vat_number, created_at)
       VALUES
        ('agency-1', 'Alpha Travel', 'agency', 'SA', 'Alpha Agent',
         'alpha@example.test', '+966500000010', '', '', ?),
        ('agency-2', 'Beta Travel', 'agency', 'SA', 'Beta Agent',
         'beta@example.test', '+966500000020', '', '', ?)`,
      [createdAt, createdAt],
    );
    await db.execute(
      `INSERT INTO purchases
        (id, number, hotel_id, status, check_in, check_out, notes,
         created_at, confirmed_at)
       VALUES
        ('purchase-1', 'P90001', 'hotel-1', 'confirmed', '2030-01-01',
         '2030-02-01', '', ?, ?)`,
      [createdAt, createdAt],
    );
    await db.execute(
      `INSERT INTO purchase_lines
        (id, purchase_id, room_name, description, capacity, quantity,
         cost_per_night, sort_order, check_in, check_out,
         public_price_per_night, room_type_id, offer_id, board, view,
         min_nights, sale_mode)
       VALUES
        ('line-room-a', 'purchase-1', 'double', '', 2, 1, 10000, 0,
         '2030-01-01', '2030-02-01', 20000, 'type-double', 'offer-room',
         'room_only', 'City', 1, 'book'),
        ('line-breakfast', 'purchase-1', 'triple', '', 3, 2, 12000, 1,
         '2030-01-01', '2030-02-01', 24000, 'type-triple',
         'offer-breakfast', 'breakfast', 'Haram', 1, 'book'),
        ('line-room-b', 'purchase-1', 'double', '', 2, 1, 11000, 2,
         '2030-01-01', '2030-02-01', 21000, 'type-double', 'offer-room',
         'room_only', 'City', 1, 'book')`,
    );
    await db.execute(
      `INSERT INTO contract_policies
        (id, purchase_id, name, general_terms, cancellation_terms,
         payment_terms, release_days, refundable, active, created_at)
       VALUES
        ('policy-original', 'purchase-1', 'Original', 'Original general',
         'Cancel 7 days before arrival', 'Prepay', 7, TRUE, TRUE, ?)`,
      [createdAt],
    );
    await db.execute(
      `INSERT INTO contract_periods
        (id, purchase_line_id, policy_id, check_in, check_out, quantity,
         cost_per_night, public_price_per_night,
         default_agency_price_per_night, min_nights, sale_mode, stop_sale,
         overbook_limit, hold_minutes, active, created_at)
       VALUES
        ('period-room-a', 'line-room-a', 'policy-original', '2030-01-01',
         '2030-02-01', 1, 10000, 20000, 19000, 1, 'book', FALSE, 0, 60, TRUE, ?),
        ('period-breakfast', 'line-breakfast', 'policy-original', '2030-01-01',
         '2030-02-01', 2, 12000, 24000, 22000, 1, 'book', FALSE, 0, 60, TRUE, ?),
        ('period-room-b', 'line-room-b', 'policy-original', '2030-01-01',
         '2030-02-01', 1, 11000, 21000, 18000, 1, 'book', FALSE, 0, 60, TRUE, ?)`,
      [createdAt, createdAt, createdAt],
    );
    await db.execute(
      `INSERT INTO contract_period_rates
        (id, contract_period_id, agency_id, price_per_night)
       VALUES ('private-alpha', 'period-room-a', 'agency-1', 15000)`,
    );
  });

  afterAll(async () => {
    if (db) {
      await db.execute(
        `TRUNCATE TABLE
           job_runs, agency_checkout_attempts, contract_events,
           reservation_events, agency_cart_lines, agency_carts,
           contract_period_rates, contract_periods, contract_policies,
           allotment_lines, allotments, purchase_lines, purchases,
           offers, agency_logins, agencies, room_types, hotels
         CASCADE`,
      );
    }
  });

  it("creates one exact-rate multi-room reservation from the agency basket", async () => {
    expect(
      await cart.addAgencyCartLine({
        agencyId: "agency-1",
        contractPeriodId: "period-room-a",
        hotelId: "hotel-1",
        ...stay,
        quantity: 1,
      }),
    ).toEqual({ ok: true });
    expect(
      await cart.addAgencyCartLine({
        agencyId: "agency-1",
        contractPeriodId: "period-breakfast",
        hotelId: "hotel-1",
        ...stay,
        quantity: 2,
      }),
    ).toEqual({ ok: true });
    const basket = await cart.getAgencyCart("agency-1");
    expect(basket?.total).toBe((15000 + 22000 * 2) * 3);

    const result = await cart.checkoutAgencyCart({
      agencyId: "agency-1",
      termsAccepted: true,
      acceptedBy: "Alpha Agent",
      notes: "Group arrival 18:00",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("provisional");
    const rows = await db.query<{
      contract_period_id: string;
      agency_price_per_night: number;
      board_snapshot: string;
      terms_snapshot: { name: string };
    }>(
      `SELECT contract_period_id, agency_price_per_night, board_snapshot,
              terms_snapshot
       FROM allotment_lines WHERE allotment_id = ?
       ORDER BY sort_order`,
      [result.id],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      contract_period_id: "period-room-a",
      agency_price_per_night: 15000,
      board_snapshot: "room_only",
    });
    expect(rows[1]).toMatchObject({
      contract_period_id: "period-breakfast",
      agency_price_per_night: 22000,
      board_snapshot: "breakfast",
    });
    expect(rows[0].terms_snapshot.name).toBe("Original");
    expect(await cart.getAgencyCart("agency-1")).toBeNull();
  });

  it("serializes concurrent holds and never exceeds one period capacity", async () => {
    const results = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        reservations.createAgencyReservation({
          agencyId: "agency-1",
          ...stay,
          selections: [
            { contractPeriodId: "period-room-a", quantity: 1 },
          ],
          termsAccepted: true,
          termsAcceptedName: `Agent ${index}`,
        }),
      ),
    );
    const statuses = results.flatMap((result) =>
      result.ok ? [result.status] : [],
    );
    expect(statuses.filter((status) => status === "provisional")).toHaveLength(
      1,
    );
    expect(statuses.filter((status) => status === "request")).toHaveLength(2);
    const holding = await db.query<{ quantity: number }>(
      `SELECT COALESCE(SUM(line.quantity), 0)::int AS quantity
       FROM allotment_lines AS line
       JOIN allotments AS reservation ON reservation.id = line.allotment_id
       WHERE line.purchase_line_id = 'line-room-a'
         AND reservation.status IN ('provisional', 'confirmed')`,
    );
    expect(Number(holding[0].quantity)).toBe(1);
  });

  it("serializes desk and B2B holds on different periods of one offer", async () => {
    const deskDraft = await inventory.saveAllotment({
      agencyId: "agency-1",
      ...stay,
      notes: "Desk group",
      termsAccepted: true,
      termsAcceptedBy: "Desk agent",
      lines: [
        {
          roomId: "",
          offerId: "offer-room",
          purchaseLineId: "line-room-a",
          contractPeriodId: "period-room-a",
          quantity: 1,
          costPerNight: 10000,
          agencyPricePerNight: 15000,
        },
      ],
    });
    expect(deskDraft.ok).toBe(true);
    if (!deskDraft.ok) return;

    const [desk, b2b] = await Promise.all([
      inventory.holdAllotment(deskDraft.id),
      reservations.createAgencyReservation({
        agencyId: "agency-1",
        ...stay,
        selections: [{ contractPeriodId: "period-room-b", quantity: 1 }],
        termsAccepted: true,
        termsAcceptedName: "Alpha Agent",
      }),
    ]);
    expect(desk).toMatchObject({ ok: true });
    expect(b2b).toMatchObject({ ok: true, status: "provisional" });

    const held = await db.query<{ quantity: number }>(
      `SELECT COALESCE(SUM(line.quantity), 0)::int AS quantity
       FROM allotment_lines AS line
       JOIN allotments AS reservation ON reservation.id = line.allotment_id
       WHERE line.offer_id = 'offer-room'
         AND reservation.status IN ('provisional', 'confirmed')`,
    );
    expect(Number(held[0].quantity)).toBe(2);
  });

  it("applies stop-sale and overbook limits", async () => {
    await db.execute(
      "UPDATE contract_periods SET stop_sale = TRUE WHERE id = 'period-room-a'",
    );
    const stopped = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(stopped).toMatchObject({ ok: false, error: "stop-sale" });

    await db.execute(
      `UPDATE contract_periods
       SET stop_sale = FALSE, overbook_limit = 1
       WHERE id = 'period-room-a'`,
    );
    const first = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    const second = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    const third = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(first.ok && first.status).toBe("provisional");
    expect(second.ok && second.status).toBe("provisional");
    expect(third.ok && third.status).toBe("request");
  });

  it("expires holds and appends the audit event", async () => {
    const created = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await db.execute(
      "UPDATE allotments SET hold_until = ? WHERE id = ?",
      [new Date(Date.now() - 60_000).toISOString(), created.id],
    );
    await reservations.expireReservationHolds();
    const state = await db.query<{ status: string }>(
      "SELECT status FROM allotments WHERE id = ?",
      [created.id],
    );
    expect(state[0].status).toBe("cancelled");
    const events = await reservations.listReservationEvents(created.id);
    expect(events.some((event) => event.eventType === "hold_expired")).toBe(
      true,
    );
  });

  it("keeps sold terms immutable across a date-scoped amendment", async () => {
    const created = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(created.ok).toBe(true);
    const policyId = await contracts.createContractPolicy({
      purchaseId: "purchase-1",
      name: "Amended",
      generalTerms: "New general",
      cancellationTerms: "No refund",
      paymentTerms: "Immediate",
      releaseDays: 14,
      refundable: false,
    });
    expect(policyId).toBeTruthy();
    const amendment = await contracts.amendContractPeriod({
      purchaseLineId: "line-room-a",
      policyId: policyId ?? "",
      checkIn: "2030-01-10",
      checkOut: "2030-01-20",
      quantity: 1,
      costPerNight: 10500,
      publicPricePerNight: 20500,
      defaultAgencyPricePerNight: 19500,
      minNights: 1,
      saleMode: "book",
      stopSale: false,
      overbookLimit: 0,
      holdMinutes: 60,
    });
    expect(amendment.ok).toBe(true);
    const events = await db.query<{ kind: string }>(
      `SELECT kind FROM contract_events
       WHERE purchase_id = 'purchase-1' AND kind = 'period_amended'`,
    );
    expect(events).toHaveLength(1);
    if (!created.ok) return;
    const snapshots = await db.query<{
      terms_snapshot: { name: string; generalTerms: string };
    }>(
      "SELECT terms_snapshot FROM allotment_lines WHERE allotment_id = ?",
      [created.id],
    );
    expect(snapshots[0].terms_snapshot).toMatchObject({
      name: "Original",
      generalTerms: "Original general",
    });
  });

  it("enforces cross-agency access and records cancellation requests", async () => {
    const created = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(
      await reservations.getAgencyReservation("agency-2", created.number),
    ).toBeNull();
    expect(
      await reservations.requestAgencyCancellation({
        agencyId: "agency-2",
        number: created.number,
        reason: "Wrong agency",
      }),
    ).toBe(false);
    expect(
      await reservations.requestAgencyCancellation({
        agencyId: "agency-1",
        number: created.number,
        reason: "Group cancelled",
      }),
    ).toBe(true);
    const events = await reservations.listReservationEvents(created.id);
    expect(
      events.some((event) => event.eventType === "cancellation_requested"),
    ).toBe(true);
  });

  it("reconciles report capacity, reservations, revenue, and margin", async () => {
    const created = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [
        { contractPeriodId: "period-room-a", quantity: 1 },
        { contractPeriodId: "period-breakfast", quantity: 1 },
      ],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(created.ok).toBe(true);
    const report = await reports.reservationReport(
      reports.reportFilters({
        from: stay.checkIn,
        to: stay.checkOut,
        hotelId: "hotel-1",
      }),
    );
    expect(report.totals.contractedRoomNights).toBe(12);
    expect(report.totals.reservedRoomNights).toBe(6);
    expect(report.totals.revenue).toBe((15000 + 22000) * 3);
    expect(report.totals.cost).toBe((10000 + 12000) * 3);
    expect(report.totals.margin).toBe((5000 + 10000) * 3);
  });

  it("frees expired stock from the scheduled job without a page read", async () => {
    const created = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await db.execute("UPDATE allotments SET hold_until = ? WHERE id = ?", [
      new Date(Date.now() - 60_000).toISOString(),
      created.id,
    ]);
    const job = await holdRelease.runHoldReleaseJob();
    expect(job.skipped).toBe(false);
    expect(job.reservationsExpired).toBe(1);
    expect(job.error).toBeUndefined();
    const state = await db.query<{ status: string }>(
      "SELECT status FROM allotments WHERE id = ?",
      [created.id],
    );
    expect(state[0].status).toBe("cancelled");
    expect(
      await stock.contractLineFree("line-room-a", stay.checkIn, stay.checkOut),
    ).toBe(1);
    const runs = await db.query<{ status: string }>(
      "SELECT status FROM job_runs WHERE name = 'release-holds'",
    );
    expect(runs.some((run) => run.status === "succeeded")).toBe(true);
  });

  it("alerts when the previous successful hold release is older than 15 minutes", async () => {
    await db.execute(
      `INSERT INTO job_runs
        (id, name, status, started_at, finished_at, duration_ms, processed_count, error)
       VALUES ('old-run', 'release-holds', 'succeeded', ?, ?, 10, 0, '')`,
      [
        new Date(Date.now() - 20 * 60_000).toISOString(),
        new Date(Date.now() - 20 * 60_000).toISOString(),
      ],
    );
    const job = await holdRelease.runHoldReleaseJob();
    expect(job.stale).toBe(true);
    expect(job.error).toBeUndefined();
  });

  it("cancels provisional reservations that have no hold expiry", async () => {
    await db.execute(
      "ALTER TABLE allotments DROP CONSTRAINT IF EXISTS allotments_provisional_hold_until",
    );
    try {
      await db.execute(
        `INSERT INTO allotments
          (id, number, agency_id, status, check_in, check_out, notes,
           created_at, channel, supplier_status)
         VALUES
          ('orphan-hold', 'A90001', 'agency-1', 'provisional', ?, ?, '',
           ?, 'b2b', 'not_requested')`,
        [stay.checkIn, stay.checkOut, new Date().toISOString()],
      );
      await stock.releaseExpiredHolds();
      const state = await db.query<{ status: string }>(
        "SELECT status FROM allotments WHERE id = 'orphan-hold'",
      );
      expect(state[0].status).toBe("cancelled");
    } finally {
      await db.execute(
        `DO $$
         BEGIN
           ALTER TABLE allotments
             ADD CONSTRAINT allotments_provisional_hold_until
             CHECK (
               status <> 'provisional'
               OR (hold_until IS NOT NULL AND btrim(hold_until) <> '')
             );
         EXCEPTION
           WHEN duplicate_object THEN NULL;
         END $$`,
      );
    }
  });

  it("returns the original reservation when checkout is repeated", async () => {
    expect(
      await cart.addAgencyCartLine({
        agencyId: "agency-1",
        contractPeriodId: "period-breakfast",
        hotelId: "hotel-1",
        ...stay,
        quantity: 1,
      }),
    ).toEqual({ ok: true });
    const key = crypto.randomUUID();
    const first = await cart.checkoutAgencyCart({
      agencyId: "agency-1",
      termsAccepted: true,
      acceptedBy: "Alpha Agent",
      notes: "",
      idempotencyKey: key,
    });
    const second = await cart.checkoutAgencyCart({
      agencyId: "agency-1",
      termsAccepted: true,
      acceptedBy: "Alpha Agent",
      notes: "",
      idempotencyKey: key,
    });
    expect(first.ok && second.ok && first.number === second.number).toBe(true);
    expect(second.ok && second.idempotent).toBe(true);
    const rows = await db.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM allotments WHERE agency_id = 'agency-1'",
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  it("rejects basket quantities above live bookable stock", async () => {
    const added = await cart.addAgencyCartLine({
      agencyId: "agency-1",
      contractPeriodId: "period-room-a",
      hotelId: "hotel-1",
      ...stay,
      quantity: 2,
    });
    expect(added).toEqual({ ok: false, error: "quantity" });
  });

  it("approves or denies cancellation without losing the stock decision", async () => {
    const created = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(
      await reservations.requestAgencyCancellation({
        agencyId: "agency-1",
        number: created.number,
        reason: "Change of plan",
      }),
    ).toBe(true);
    const denied = await reservations.decideCancellation({
      allotmentId: created.id,
      decision: "denied",
      actorId: "admin-1",
      note: "Inside policy",
    });
    expect(denied).toEqual({ ok: true, decision: "denied" });
    const held = await db.query<{
      status: string;
      cancel_requested_at: string | null;
    }>("SELECT status, cancel_requested_at FROM allotments WHERE id = ?", [
      created.id,
    ]);
    expect(held[0]).toMatchObject({
      status: "provisional",
      cancel_requested_at: null,
    });
    expect(
      await stock.contractLineFree("line-room-a", stay.checkIn, stay.checkOut),
    ).toBe(0);

    expect(
      await reservations.requestAgencyCancellation({
        agencyId: "agency-1",
        number: created.number,
        reason: "Group cancelled",
      }),
    ).toBe(true);
    const approved = await reservations.decideCancellation({
      allotmentId: created.id,
      decision: "approved",
      actorId: "admin-1",
    });
    expect(approved).toEqual({ ok: true, decision: "approved" });
    const released = await db.query<{
      status: string;
      supplier_status: string;
      cancel_requested_at: string | null;
    }>(
      `SELECT status, supplier_status, cancel_requested_at
       FROM allotments WHERE id = ?`,
      [created.id],
    );
    expect(released[0]).toMatchObject({
      status: "cancelled",
      supplier_status: "cancelled",
      cancel_requested_at: null,
    });
    expect(
      await stock.contractLineFree("line-room-a", stay.checkIn, stay.checkOut),
    ).toBe(1);
    const events = await reservations.listReservationEvents(created.id);
    expect(
      events.find((event) => event.eventType === "cancellation_approved")
        ?.details,
    ).toMatchObject({ stockEffect: "released", supplierAction: "cancelled" });
    expect(
      events.find((event) => event.eventType === "cancellation_denied")
        ?.details,
    ).toMatchObject({ stockEffect: "unchanged" });
  });

  it("reopens a cancelled reservation only when stock can be held again", async () => {
    const created = await reservations.createAgencyReservation({
      agencyId: "agency-1",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Alpha Agent",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect((await reservations.cancelReservation(created.id)).ok).toBe(true);
    await db.execute(
      "UPDATE allotments SET supplier_status = 'cancelled' WHERE id = ?",
      [created.id],
    );
    const reopened = await inventory.reopenAllotment(created.id);
    expect(reopened).toMatchObject({
      ok: true,
      status: "provisional",
      idempotent: false,
    });
    const repeated = await inventory.reopenAllotment(created.id);
    expect(repeated).toMatchObject({ ok: true, idempotent: true });
    const supplier = await db.query<{ supplier_status: string }>(
      "SELECT supplier_status FROM allotments WHERE id = ?",
      [created.id],
    );
    expect(supplier[0].supplier_status).toBe("not_requested");
    const held = await db.query<{ quantity: number }>(
      `SELECT COALESCE(SUM(line.quantity), 0)::int AS quantity
       FROM allotment_lines AS line
       JOIN allotments AS reservation ON reservation.id = line.allotment_id
       WHERE line.purchase_line_id = 'line-room-a'
         AND reservation.status IN ('provisional', 'confirmed')`,
    );
    expect(Number(held[0].quantity)).toBe(1);

    expect((await reservations.cancelReservation(created.id)).ok).toBe(true);
    const other = await reservations.createAgencyReservation({
      agencyId: "agency-2",
      ...stay,
      selections: [{ contractPeriodId: "period-room-a", quantity: 1 }],
      termsAccepted: true,
      termsAcceptedName: "Beta Agent",
    });
    expect(other.ok && other.status).toBe("provisional");
    const blocked = await inventory.reopenAllotment(created.id);
    expect(blocked).toMatchObject({ ok: false, error: "quantity" });
  });

  it("keeps legacy contract rates synchronized with active period rates", async () => {
    expect(
      await inventory.saveContractRate({
        purchaseLineId: "line-room-a",
        agencyId: "agency-2",
        pricePerNight: 12345,
      }),
    ).toBe(true);
    const periodRates = await db.query<{ price_per_night: number }>(
      `SELECT price_per_night FROM contract_period_rates
       WHERE contract_period_id = 'period-room-a' AND agency_id = 'agency-2'`,
    );
    const legacyRates = await db.query<{ price_per_night: number }>(
      `SELECT price_per_night FROM contract_rates
       WHERE purchase_line_id = 'line-room-a' AND agency_id = 'agency-2'`,
    );
    expect(Number(periodRates[0].price_per_night)).toBe(12345);
    expect(Number(legacyRates[0].price_per_night)).toBe(12345);
    const events = await db.query<{ kind: string }>(
      `SELECT kind FROM contract_events
       WHERE kind = 'legacy_rate_synchronized'`,
    );
    expect(events).toHaveLength(1);
  });
});
