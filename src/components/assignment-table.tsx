import Link from "next/link";
import { deleteAssignmentAction } from "@/app/admin/actions";
import {
  AdminEmptyState,
  AdminStatusPill,
  AdminTableFrame,
} from "@/components/admin-ui";
import { NamedConfirm } from "@/components/named-confirm";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { assignmentValue, type Assignment } from "@/lib/inventory";
import {
  formatDate,
  formatDateRange,
  formatMoney,
  todayInRiyadh,
} from "@/lib/money";

export async function AssignmentTable({
  assignments,
  allowRelease = false,
}: {
  assignments: Assignment[];
  allowRelease?: boolean;
}) {
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const today = todayInRiyadh();

  if (!assignments.length) {
    return <AdminEmptyState title={copy.noAllotmentRows} />;
  }

  const rows = assignments.map((assignment) => ({
    assignment,
    value: assignmentValue(assignment),
    status:
      assignment.checkOut <= today
        ? ("closed" as const)
        : assignment.checkIn > today
          ? ("upcoming" as const)
          : ("inHouse" as const),
  }));

  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {rows.map(({ assignment, value, status }) => (
          <article
            key={assignment.id}
            className="rounded-2xl border border-[var(--desk-line)] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{assignment.agencyName}</h3>
                <p className="mt-1 text-sm">
                  {assignment.hotelName} · {assignment.roomName}
                </p>
              </div>
              <AdminStatusPill
                tone={
                  status === "inHouse"
                    ? "success"
                    : status === "upcoming"
                      ? "info"
                      : "neutral"
                }
              >
                {copy[status]}
              </AdminStatusPill>
            </div>
            <p className="mt-3 font-plex text-xs text-[var(--desk-muted)]">
              {formatDateRange(assignment.checkIn, assignment.checkOut, locale)}{" "}
              · {value.nights} {copy.nights.toLocaleLowerCase(locale)}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--desk-line)] pt-3 text-xs">
              <span>
                <span className="block text-[var(--desk-muted)]">
                  {copy.qty}
                </span>
                <strong className="font-plex">{assignment.quantity}</strong>
              </span>
              <span>
                <span className="block text-[var(--desk-muted)]">
                  {copy.sell}
                </span>
                <strong className="font-plex">
                  {formatMoney(value.revenue, locale)}
                </strong>
              </span>
              <span className="text-end">
                <span className="block text-[var(--desk-muted)]">
                  {copy.margin}
                </span>
                <strong className="font-plex text-[var(--desk-primary)]">
                  {formatMoney(value.margin, locale)}
                </strong>
              </span>
            </div>
            {allowRelease && (
              <div className="mt-3 flex justify-end border-t border-[var(--desk-line)] pt-3">
                <AssignmentAction
                  assignment={assignment}
                  copy={copy}
                  locale={locale}
                />
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="hidden lg:block">
        <AdminTableFrame>
          <table className="desk-table w-full min-w-[880px] border-collapse text-start text-sm">
            <thead className="bg-[var(--desk-canvas)]">
              <tr>
                <th className="px-4 py-3 text-start">{copy.status}</th>
                <th className="px-4 py-3 text-start">{copy.client}</th>
                <th className="px-4 py-3 text-start">{copy.hotelRoom}</th>
                <th className="px-4 py-3 text-end">{copy.qty}</th>
                <th className="px-4 py-3 text-start">{copy.stay}</th>
                <th className="px-4 py-3 text-end">{copy.nights}</th>
                <th className="px-4 py-3 text-end">{copy.cost}</th>
                <th className="px-4 py-3 text-end">{copy.sell}</th>
                <th className="px-4 py-3 text-end">{copy.margin}</th>
                {allowRelease && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ assignment, value, status }) => (
                <tr key={assignment.id}>
                  <td className="px-4 py-3">
                    <AdminStatusPill
                      tone={
                        status === "inHouse"
                          ? "success"
                          : status === "upcoming"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {copy[status]}
                    </AdminStatusPill>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {assignment.agencyName}
                  </td>
                  <td className="px-4 py-3">
                    {assignment.hotelName}
                    <span className="block text-xs text-[var(--desk-muted)]">
                      {assignment.roomName}
                    </span>
                    {assignment.allotmentId && (
                      <Link
                        href={`/admin/allotments/${assignment.allotmentId}`}
                        className="desk-focus rounded-sm text-xs font-semibold text-[var(--desk-primary)] hover:underline"
                      >
                        {copy.allotment}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end font-plex">
                    {assignment.quantity}
                  </td>
                  <td className="px-4 py-3 font-plex text-xs whitespace-nowrap">
                    {formatDateRange(
                      assignment.checkIn,
                      assignment.checkOut,
                      locale,
                    )}
                  </td>
                  <td className="px-4 py-3 text-end font-plex">
                    {value.nights}
                  </td>
                  <td className="px-4 py-3 text-end font-plex">
                    {formatMoney(value.cost, locale)}
                  </td>
                  <td className="px-4 py-3 text-end font-plex">
                    {formatMoney(value.revenue, locale)}
                  </td>
                  <td className="px-4 py-3 text-end font-plex font-semibold text-[var(--desk-primary)]">
                    {formatMoney(value.margin, locale)}
                  </td>
                  {allowRelease && (
                    <td className="px-4 py-3 text-end">
                      <AssignmentAction
                        assignment={assignment}
                        copy={copy}
                        locale={locale}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableFrame>
      </div>
    </>
  );
}

function AssignmentAction({
  assignment,
  copy,
  locale,
}: {
  assignment: Assignment;
  copy: ReturnType<typeof adminCopy>;
  locale: "en" | "fr";
}) {
  return assignment.allotmentId ? (
    <Link
      href={`/admin/allotments/${assignment.allotmentId}`}
      className="desk-focus rounded-sm text-xs font-semibold text-[var(--desk-primary)]"
    >
      {copy.openRecord}
    </Link>
  ) : (
    <NamedConfirm
      title={copy.releaseTitle}
      body={fill(copy.releaseBody, {
        agency: assignment.agencyName,
        room: assignment.roomName,
        hotel: assignment.hotelName,
        checkIn: formatDate(assignment.checkIn, locale),
        checkOut: formatDate(assignment.checkOut, locale),
      })}
      confirm={copy.releaseConfirm}
      pendingLabel={copy.releasing}
      action={deleteAssignmentAction}
      fields={{ id: assignment.id, roomId: assignment.roomId }}
      trigger={copy.release}
      cancelLabel={copy.keepAllotment}
    />
  );
}
