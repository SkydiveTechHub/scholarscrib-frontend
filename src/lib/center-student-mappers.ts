import type {
  CenterInvitePreviewOut,
  StudentCenterMembershipOut,
  StudentCentersMineOut,
} from "@/lib/api/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function tutorDisplayName(tutor: unknown): string {
  if (!isRecord(tutor)) return "Tutor";
  const named = [str(tutor.firstName), str(tutor.lastName)]
    .filter(Boolean)
    .join(" ");
  return named || str(tutor.name) || "Tutor";
}

function membershipStatus(value: unknown): StudentCenterMembershipOut["status"] {
  const raw = (str(value) ?? "active").toUpperCase();
  if (
    raw === "ACTIVE" ||
    raw === "INVITED" ||
    raw === "LEFT" ||
    raw === "REMOVED"
  ) {
    return raw;
  }
  return raw as StudentCenterMembershipOut["status"];
}

/**
 * BE `GET /api/centers` returns nested `{ center, tutor, membership, whatTutorCanSee }`.
 * Older FE shapes were flat — accept both.
 */
export function mapStudentCentersMine(raw: unknown): StudentCentersMineOut {
  if (!isRecord(raw) || !Array.isArray(raw.centers)) {
    return { centers: [] };
  }

  const centers: StudentCenterMembershipOut[] = raw.centers.map((row) => {
    if (!isRecord(row)) {
      return {
        centerId: "",
        centerName: "Center",
        tutorName: "Tutor",
        status: "ACTIVE",
      };
    }

    if (isRecord(row.center)) {
      const membership = isRecord(row.membership) ? row.membership : {};
      return {
        centerId: str(row.center.id) ?? str(membership.centerId) ?? "",
        centerName: str(row.center.name) ?? "Center",
        tutorName: tutorDisplayName(row.tutor),
        state: str(row.center.state) ?? str(
          isRecord(row.tutor) ? row.tutor.state : null,
        ),
        joinedAt: str(membership.joinedAt),
        status: membershipStatus(membership.status),
        visibilitySummary: str(row.whatTutorCanSee),
      };
    }

    return {
      centerId: str(row.centerId) ?? "",
      centerName: str(row.centerName) ?? "Center",
      tutorName: str(row.tutorName) ?? "Tutor",
      state: str(row.state),
      joinedAt: str(row.joinedAt),
      status: membershipStatus(row.status),
      visibilitySummary: str(row.visibilitySummary),
    };
  });

  return { centers };
}

/**
 * BE `GET /api/centers/invites/{code}` returns nested invite/center/tutor/consent.
 */
export function mapInvitePreview(raw: unknown): CenterInvitePreviewOut {
  if (!isRecord(raw)) {
    return {
      code: "",
      centerId: "",
      centerName: "Center",
      tutorName: "Tutor",
    };
  }

  if (isRecord(raw.center)) {
    const invite = isRecord(raw.invite) ? raw.invite : {};
    return {
      code: str(invite.code) ?? str(raw.code) ?? "",
      centerId: str(raw.center.id) ?? "",
      centerName: str(raw.center.name) ?? "Center",
      tutorName: tutorDisplayName(raw.tutor),
      state: str(raw.center.state) ?? str(
        isRecord(raw.tutor) ? raw.tutor.state : null,
      ),
      revoked: Boolean(raw.revoked ?? invite.revoked),
      expired: Boolean(raw.expired ?? invite.expired),
      full: Boolean(raw.full),
      consentVersion: str(
        isRecord(raw.consent) ? raw.consent.version : null,
      ),
    };
  }

  return {
    code: str(raw.code) ?? "",
    centerId: str(raw.centerId) ?? "",
    centerName: str(raw.centerName) ?? "Center",
    tutorName: str(raw.tutorName) ?? "Tutor",
    state: str(raw.state),
    revoked: Boolean(raw.revoked),
    expired: Boolean(raw.expired),
    full: Boolean(raw.full),
  };
}
