import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import {
  canAccessConsole,
  canManageAdmins,
  type AdminPrincipal,
} from "./admin-access";

/**
 * Admin identity resolution. The proxy check is optimistic and can be outrun
 * by a stale cookie; Next's own docs state it "should not be used as a full
 * session management or authorization solution". This — the backend session
 * re-read — is the wall.
 */

export type AdminGuardResult =
  | { ok: true; actor: AdminPrincipal }
  | { ok: false; response: NextResponse };

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const session = await getAdminSession();
  const admin = session?.admin;
  if (!admin?.id) return null;
  return { id: admin.id, isActive: admin.isActive, isOwner: admin.isOwner };
}

export async function requireAdminPage(): Promise<AdminPrincipal> {
  const admin = await getAdminPrincipal();
  if (!canAccessConsole(admin)) redirect("/admin/login");
  return admin as AdminPrincipal;
}

export async function requireOwnerPage(): Promise<AdminPrincipal> {
  const admin = await getAdminPrincipal();
  if (!canAccessConsole(admin)) redirect("/admin/login");
  if (!canManageAdmins(admin)) redirect("/admin");
  return admin as AdminPrincipal;
}

export async function requireAdminApi(): Promise<AdminGuardResult> {
  const admin = await getAdminPrincipal();
  if (!canAccessConsole(admin)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, actor: admin as AdminPrincipal };
}

export async function requireOwnerApi(): Promise<AdminGuardResult> {
  const admin = await getAdminPrincipal();
  if (!canAccessConsole(admin)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!canManageAdmins(admin)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Owner access required" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, actor: admin as AdminPrincipal };
}