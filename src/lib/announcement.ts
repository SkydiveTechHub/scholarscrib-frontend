// Announcement composer rules. Validation and delivery happen on the backend.

export const CONFIRM_TYPED_THRESHOLD = 500;

export function needsTypedConfirm(devices: number): boolean {
  return devices >= CONFIRM_TYPED_THRESHOLD;
}
