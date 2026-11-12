import { redirect } from "next/navigation";
import { requireTutorPage } from "@/lib/center-session";

export const dynamic = "force-dynamic";

/** M0 home: land on Roster until a real overview ships. */
export default async function CenterHomePage() {
  await requireTutorPage();
  redirect("/center/roster");
}
