import type { MaterialType } from "./materials";

/** PDFs and images are uploaded; videos and links carry a pasted URL. */
export function requiresUpload(type: MaterialType): boolean {
  return type === "PDF" || type === "IMAGE";
}
