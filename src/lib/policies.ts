import { execute, query } from "@/lib/db";

export type PolicyText = {
  id: string;
  name: string;
  content: string;
  contentAr: string;
};

type PolicyRow = {
  id: string;
  name: string;
  content: string;
  content_ar: string;
};

function clean(value: string, max: number) {
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

function mapPolicy(row: PolicyRow): PolicyText {
  return { id: row.id, name: row.name, content: row.content, contentAr: row.content_ar };
}

export async function listPolicyTemplates() {
  const rows = await query<PolicyRow>(
    `SELECT id, name, content, content_ar FROM policy_templates ORDER BY created_at ASC`,
  );
  return rows.map(mapPolicy);
}

export async function listReservationPolicies(allotmentId: string) {
  const rows = await query<PolicyRow>(
    `SELECT id, name, content, content_ar FROM reservation_policies
     WHERE allotment_id = ? ORDER BY created_at ASC`,
    [allotmentId],
  );
  return rows.map(mapPolicy);
}

export async function addPolicyTemplate(name: string) {
  const title = clean(name, 80);
  if (!title) return null;
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO policy_templates (id, name, content, content_ar, created_at) VALUES (?, ?, '', '', ?)`,
    [id, title, new Date().toISOString()],
  );
  return id;
}

export async function savePolicyTemplate(id: string, name: string, content: string, contentAr: string) {
  const title = clean(name, 80);
  if (!title) return false;
  const result = await execute(
    `UPDATE policy_templates SET name = ?, content = ?, content_ar = ? WHERE id = ?`,
    [title, clean(content, 4000), clean(contentAr, 4000), id],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deletePolicyTemplate(id: string) {
  const result = await execute(`DELETE FROM policy_templates WHERE id = ?`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function addReservationPolicy(
  allotmentId: string,
  name: string,
  content = "",
  contentAr = "",
) {
  const title = clean(name, 80);
  if (!allotmentId || !title) return null;
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO reservation_policies (id, allotment_id, name, content, content_ar, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, allotmentId, title, clean(content, 4000), clean(contentAr, 4000), new Date().toISOString()],
  );
  return id;
}

export async function getPolicyTemplate(id: string) {
  const rows = await query<PolicyRow>(
    `SELECT id, name, content, content_ar FROM policy_templates WHERE id = ?`,
    [id],
  );
  return rows[0] ? mapPolicy(rows[0]) : null;
}

export async function addReservationPolicyFromTemplate(allotmentId: string, templateId: string) {
  const template = await getPolicyTemplate(templateId);
  if (!template) return null;
  return addReservationPolicy(allotmentId, template.name, template.content, template.contentAr);
}

export async function saveReservationPolicy(
  allotmentId: string,
  id: string,
  name: string,
  content: string,
  contentAr: string,
) {
  const title = clean(name, 80);
  if (!title) return false;
  const result = await execute(
    `UPDATE reservation_policies SET name = ?, content = ?, content_ar = ?
     WHERE id = ? AND allotment_id = ?`,
    [title, clean(content, 4000), clean(contentAr, 4000), id, allotmentId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteReservationPolicy(allotmentId: string, id: string) {
  const result = await execute(
    `DELETE FROM reservation_policies WHERE id = ? AND allotment_id = ?`,
    [id, allotmentId],
  );
  return (result.rowCount ?? 0) > 0;
}
