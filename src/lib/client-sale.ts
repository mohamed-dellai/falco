import { query } from "@/lib/db";

export async function clientCanBuy(agencyId: string) {
  const rows = await query<{ id: string }>(
    `SELECT id FROM agencies
     WHERE id = ? AND stop_sale = FALSE AND disabled = FALSE`,
    [agencyId],
  );
  return Boolean(rows[0]);
}

export function clientIsOpen(client: { stopSale: boolean; disabled: boolean }) {
  return !client.stopSale && !client.disabled;
}
