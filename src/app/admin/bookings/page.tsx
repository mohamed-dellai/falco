import { redirect } from "next/navigation";

export default function BookingsPage() {
  redirect("/admin/allotments?channel=b2c");
}
