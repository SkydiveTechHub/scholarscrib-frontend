import { isApiError } from "./api/errors";

/**
 * Why a plan check failed, in terms the review step can act on.
 *
 * `unsupported` means the server answered but has no preview route (404 or 405,
 * whose body is the framework's `{"detail": ...}` rather than our `{"error": ...}`).
 * That is an older server that also does not know the `timetable` field, so a
 * save would drop it without saying so.
 */
export type PreviewFailure =
  | { kind: "unsupported" }
  | { kind: "failed"; message: string };

export function describePreviewFailure(error: unknown): PreviewFailure {
  if (!isApiError(error)) {
    return { kind: "failed", message: "Network error while checking this plan." };
  }
  if (error.status === 404 || error.status === 405) return { kind: "unsupported" };
  return {
    kind: "failed",
    message: error.body?.error ?? `We could not check this plan (error ${error.status}).`,
  };
}

/**
 * Whether a save should be held back. With an unsupported server, only a plan
 * that sends no timetable can be saved without losing something.
 */
export function holdsBackSave(failure: PreviewFailure | null, timetableInUse: boolean): boolean {
  return failure?.kind === "unsupported" && timetableInUse;
}
