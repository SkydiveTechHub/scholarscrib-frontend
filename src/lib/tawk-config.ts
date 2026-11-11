/** True when both public Tawk embed IDs are set. The chat bubble stays off otherwise. */
export function isTawkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim() &&
      process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim(),
  );
}
