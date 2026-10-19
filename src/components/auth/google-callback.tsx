"use client";

import { useEffect } from "react";
import { useGoogleTokens } from "@/hooks/api/use-auth";
import { markFreshSignIn } from "@/lib/encouragement";
import { setStudentToken } from "@/lib/client-session";
import { consumeGoogleState } from "@/lib/google-oauth-state";

// Google redirects back to the site root with ?code=. A code is single-use,
// and React strict mode runs effects twice in dev, so remember what was sent.
const sentCodes = new Set<string>();

/**
 * Finishes the Google sign-in: when the landing page is opened with an OAuth
 * `code`, trade it with the backend for an access token. The redirect URI must
 * be byte-identical to the one the backend sent Google at the start of the
 * flow (its FRONTEND_URL, with the trailing slash), or Google rejects the code.
 */
export function GoogleCallback() {
  const googleTokens = useGoogleTokens();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    // `iss` distinguishes a Google redirect from any other ?code= on this URL.
    if (!code || params.get("iss") !== "https://accounts.google.com") return;
    if (sentCodes.has(code)) return;
    sentCodes.add(code);

    // Drop the single-use code from the address bar and history right away.
    const state = params.get("state");
    window.history.replaceState(null, "", window.location.pathname);

    // A code that did not come from a sign-in this tab started is refused.
    if (!consumeGoogleState(state)) {
      window.location.replace("/login?error=google");
      return;
    }

    googleTokens
      .mutateAsync({ code, redirectUri: `${window.location.origin}/` })
      .then((data) => {
        setStudentToken(data.accessToken);
        markFreshSignIn();
        // Full navigation so the proxy sees the fresh cookie. A profile that
        // still needs completing is sent on by the dashboard layout.
        window.location.assign("/dashboard");
      })
      .catch(() => {
        // Surfaced through googleTokens.isError below.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failed = googleTokens.isError;
  if (!failed && !googleTokens.isPending && !googleTokens.isSuccess) return null;

  return (
    <div
      role="status"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-6 text-center backdrop-blur-sm"
    >
      {failed ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Google sign-in failed. Please try again.
          </p>
          <a
            href="/login"
            className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Back to sign in
          </a>
        </div>
      ) : (
        <p className="text-sm font-semibold text-foreground">
          Signing you in with Google…
        </p>
      )}
    </div>
  );
}
