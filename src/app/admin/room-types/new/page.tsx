import { redirect } from "next/navigation";

export default function NewRoomTypePage() {
  redirect("/admin/settings?section=hotel");
}
