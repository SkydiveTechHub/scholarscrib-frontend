/**
 * The four kinds of library material, shared by the admin console and the
 * student shelf. The members match the backend's `MaterialType` enum by name.
 */
export const MATERIAL_TYPES = ["PDF", "IMAGE", "VIDEO", "LINK"] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];

/**
 * Display text. A map rather than a CSS `capitalize`, which would render the
 * initialism "PDF" as "Pdf".
 */
export const MATERIAL_LABELS: Record<MaterialType, string> = {
  PDF: "PDF",
  IMAGE: "Image",
  VIDEO: "Video",
  LINK: "Link",
};

