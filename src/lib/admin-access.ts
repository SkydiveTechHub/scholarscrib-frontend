/**
 * Every admin authorization decision, as pure functions.
 *
 * These are deliberately database-free so they can be unit tested the way
 * `flashcard-ownership.ts` is. The database lookup that feeds them lives in
 * `admin-session.ts`; keeping the two apart is what makes the rules testable.
 */

export type AdminPrincipal = {
  id: string;
  isActive: boolean;
  isOwner: boolean;
};

export function canAccessConsole(
  admin: Pick<AdminPrincipal, "isActive"> | null,
): boolean {
  return admin?.isActive === true;
}

/** Creating and revoking admins is the owner's tier, not every admin's. */
export function canManageAdmins(
  admin: Pick<AdminPrincipal, "isActive" | "isOwner"> | null,
): boolean {
  return admin?.isActive === true && admin.isOwner === true;
}

/**
 * Student capabilities.
 *
 * Two levels, not a role enum: the reversible actions are every active admin's,
 * the irreversible ones are the owner's. Hiding a control in the UI is
 * presentation — the routes call these too.
 */

export function canEditStudent(
  actor: Pick<AdminPrincipal, "isActive"> | null,
): boolean {
  return canAccessConsole(actor);
}

/** Reversible, so it is not held back to the owner. */
export function canSuspendStudent(
  actor: Pick<AdminPrincipal, "isActive"> | null,
): boolean {
  return canAccessConsole(actor);
}

/** Cascades across progress, attempts, mastery and flashcards. Owner only. */
export function canDeleteStudent(
  actor: Pick<AdminPrincipal, "isActive" | "isOwner"> | null,
): boolean {
  return canManageAdmins(actor);
}

export function canForceSignOutStudent(
  actor: Pick<AdminPrincipal, "isActive" | "isOwner"> | null,
): boolean {
  return canManageAdmins(actor);
}

