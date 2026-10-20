import { LuStar } from "react-icons/lu";
import { cn } from "@/lib/utils";

export function AstraAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary",
        className,
      )}
    >
      <LuStar className="h-4 w-4" />
    </span>
  );
}
