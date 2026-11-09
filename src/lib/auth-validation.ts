// Client-side validation for the sign-in and sign-up forms. Pure functions so
// the rules are testable and shared by both pages; the API stays the source of
// truth and re-validates everything.

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

// Deliberately loose: one "@" with something either side and a dot in the
// domain. Strict RFC checks reject real addresses; the verification email is
// the real proof of ownership.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 25;
export const MAX_NAME_LENGTH = 50;
// The API's own minimum (RegisterIn / ProfilePatch).
export const MIN_NAME_LENGTH = 2;

/** Message for a person's first or last name, or undefined when it is fine. */
export function validateName(value: string, label: "first" | "last"): string | undefined {
  const name = value.trim();
  if (!name) return `Enter your ${label} name.`;
  if (name.length < MIN_NAME_LENGTH) {
    return `Your ${label} name must be at least ${MIN_NAME_LENGTH} characters.`;
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Your ${label} name can't be longer than ${MAX_NAME_LENGTH} characters.`;
  }
  return undefined;
}

/** Message for a new password (sign-up, reset, change), or undefined when fine. */
export function validateNewPassword(value: string): string | undefined {
  if (!value) return "Create a password.";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password can't be longer than ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address, like you@example.com.";
  }
  return undefined;
}

export type ForgotPasswordField = "email";

export function validateForgotPassword(values: {
  email: string;
}): FieldErrors<ForgotPasswordField> {
  const email = validateEmail(values.email);
  return email ? { email } : {};
}

export type ResetPasswordField = "password" | "confirm";

export function validateResetPassword(values: {
  password: string;
  confirm: string;
}): FieldErrors<ResetPasswordField> {
  const errors: FieldErrors<ResetPasswordField> = {};
  const password = validateNewPassword(values.password);
  if (password) errors.password = password;
  if (!values.confirm) {
    errors.confirm = "Confirm your new password.";
  } else if (!password && values.confirm !== values.password) {
    // Only compare once the password itself is acceptable, so the user fixes
    // one problem at a time instead of seeing two contradictory messages.
    errors.confirm = "Passwords don't match.";
  }
  return errors;
}

export type LoginField = "email" | "password";

export function validateLogin(values: Record<LoginField, string>): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  // No length rule here: an existing account may predate the current minimum.
  if (!values.password) errors.password = "Enter your password.";
  return errors;
}

export type RegisterField =
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "classLevel"
  | "track"
  | "state";

export const REGISTER_STEP_FIELDS: Record<1 | 2, RegisterField[]> = {
  1: ["firstName", "lastName", "email", "password"],
  2: ["classLevel", "track", "state"],
};

export function validateRegisterStep(
  step: 1 | 2,
  values: Record<RegisterField, string>,
): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};

  if (step === 1) {
    const firstName = validateName(values.firstName, "first");
    if (firstName) errors.firstName = firstName;
    const lastName = validateName(values.lastName, "last");
    if (lastName) errors.lastName = lastName;
    const email = validateEmail(values.email);
    if (email) errors.email = email;
    const password = validateNewPassword(values.password);
    if (password) errors.password = password;
  } else {
    if (!values.classLevel) errors.classLevel = "Select your class level.";
    if (!values.track) errors.track = "Select your track.";
    if (!values.state) errors.state = "Select your state.";
  }

  return errors;
}
