import Link from "next/link";
import { deleteAssignmentAction } from "@/app/admin/actions";
import { NamedConfirm } from "@/components/named-confirm";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { assignmentValue, type Assignment } from "@/lib/inventory";
import { formatMoney, todayInRiyadh } from "@/lib/money";

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
    return (
      <p className="rounded border border-dashed border-[#c5ced8] bg-white px-4 py-6 text-sm text-[#5c6776]">
        {copy.noAllotmentRows}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#dfe5ec] bg-white">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead className="bg-[#fbf9f5] text-[11px] font-semibold uppercase tracking-wide text-[#5c6470]">
          <tr>
            <th className="px-3 py-2">{copy.status}</th>
            <th className="px-3 py-2">{copy.agency}</th>
            <th className="px-3 py-2">{copy.hotelRoom}</th>
            <th className="px-3 py-2 text-end">{copy.qty}</th>
            <th className="px-3 py-2">{copy.stay}</th>
            <th className="px-3 py-2 text-end">{copy.nights}</th>
            <th className="px-3 py-2 text-end">{copy.cost}</th>
            <th className="px-3 py-2 text-end">{copy.sell}</th>
            <th className="px-3 py-2 text-end">{copy.margin}</th>
            {allowRelease && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment) => {
            const value = assignmentValue(assignment);
            const status =
              assignment.checkOut <= today
                ? "closed"
                : assignment.checkIn > today
                  ? "upcoming"
                  : "inHouse";
            return (
              <tr key={assignment.id} data-search-item className="border-t border-[#e6ebf0]">
                <td className="px-3 py-2">
                  <span
                    className={`text-xs font-semibold ${
                      status === "inHouse"
                        ? "text-emerald-700"
                        : status === "upcoming"
                          ? "text-[#0e4d8c]"
                          : "text-[#5c6776]"
                    }`}
                  >
                    {copy[status]}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">
                  {assignment.agencyName}
                </td>
                <td className="px-3 py-2">
                  {assignment.hotelName}
                  <span className="block text-xs text-[#5c6776]">
                    {assignment.roomName}
                  </span>
                  {assignment.allotmentId && (
                    <Link
                      href={`/admin/assignments/${assignment.allotmentId}`}
                      className="text-xs font-semibold text-[#0e4d8c] hover:underline"
                    >
                      {copy.allotment}
                    </Link>
                  )}
                </td>
                <td className="px-3 py-2 text-end tabular-nums">
                  {assignment.quantity}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {assignment.checkIn}
                  <span className="text-[#5c6776]"> → </span>
                  {assignment.checkOut}
                </td>
                <td className="px-3 py-2 text-end tabular-nums">
                  {value.nights}
                </td>
                <td className="px-3 py-2 text-end font-plex">
                  {formatMoney(value.cost, locale)}
                </td>
                <td className="px-3 py-2 text-end font-plex">
                  {formatMoney(value.revenue, locale)}
                </td>
                <td className="px-3 py-2 text-end font-plex font-semibold text-[#0e4d8c]">
                  {formatMoney(value.margin, locale)}
                </td>
                {allowRelease && (
                  <td className="px-3 py-2 text-end">
                    {assignment.allotmentId ? (
                      <Link
                        href={`/admin/assignments/${assignment.allotmentId}`}
                        className="text-xs font-semibold text-[#0e4d8c]"
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
                          checkIn: assignment.checkIn,
                          checkOut: assignment.checkOut,
                        })}
                        confirm={copy.releaseConfirm}
                        pendingLabel={copy.releasing}
                        action={deleteAssignmentAction}
                        fields={{ id: assignment.id, roomId: assignment.roomId }}
                        trigger={copy.release}
                        cancelLabel={copy.keepAllotment}
                      />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
