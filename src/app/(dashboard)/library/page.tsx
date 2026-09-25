import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getLibraryShelf } from "@/lib/library";
import { LibraryView } from "@/components/library/library-view";

// The shelf is resolved on the server. It used to mount a spinner and fetch
// /api/library, which also meant a second lookup of the student's track.
export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user?.id) redirect("/login");

  const subjects = await getLibraryShelf();

  return <LibraryView subjects={subjects} />;
}