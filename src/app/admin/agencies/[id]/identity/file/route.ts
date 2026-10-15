import { currentAdmin } from "@/lib/admin-auth";
import { getIdentityFile } from "@/lib/client-crm";
import { contactRevealed } from "@/lib/contact-reveal";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await currentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  if (!(await contactRevealed(admin.id))) {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await context.params;
  const file = await getIdentityFile(id);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${file.filename.replaceAll('"', "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
