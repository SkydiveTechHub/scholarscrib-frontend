import Link from "next/link";
import { getBannerAnnouncement } from "@/lib/announcement-data";
import { isInternalPath } from "@/lib/push-payload";
import { buttonClass } from "@/components/ui/button";
import { DismissibleAnnouncement } from "./dismiss-announcement-button";

export async function AnnouncementBanner() {
  // Never throws: a failed read renders no banner rather than a broken page.
  const announcement = await getBannerAnnouncement();
  if (!announcement) return null;

  return (
    <DismissibleAnnouncement id={announcement.id}>
      <p className="text-sm font-bold text-foreground break-words">{announcement.title}</p>
      <p className="mt-0.5 text-sm text-muted break-words">{announcement.body}</p>
      {isInternalPath(announcement.url) && (
        <Link href={announcement.url} className={buttonClass("outline", "sm", "mt-3")}>
          Open
        </Link>
      )}
    </DismissibleAnnouncement>
  );
}
