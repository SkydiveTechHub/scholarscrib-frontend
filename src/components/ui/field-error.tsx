import { LuCircleAlert } from "react-icons/lu";

/**
 * Inline validation message for one field. Give the input
 * `aria-describedby={`${id}-error`}` and `aria-invalid` so screen readers
 * announce it with the field.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={`${id}-error`}
      role="alert"
      className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger animate-fade-in"
    >
      <LuCircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/** Border/ring classes that turn an `.input` red while it is invalid. */
export const INVALID_INPUT = "border-danger focus:border-danger focus:ring-danger/15";
