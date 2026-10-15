import { redirect } from "next/navigation";

export default function RoomTypesPage() {
  redirect("/admin/settings?section=hotel");
}
