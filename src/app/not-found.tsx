import type { Metadata } from "next";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import { Logo } from "@/components/ui/logo";

// Next serves this with a real HTTP 404 for any URL no route matches, and for
// any notFound() call that has no nearer not-found boundary. noindex so a
// crawler that follows a dead link doesn't keep the URL around.
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <Logo className="mb-10" />

      <p className="text-sm font-bold uppercase tracking-widest text-primary">
        Error 404
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        We can&apos;t find that page
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The link may be broken, or the page may have moved. Head back home and
        pick up where you left off.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover active:scale-[0.99]"
      >
        <LuArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to home
      </Link>
    </main>
  );
}
