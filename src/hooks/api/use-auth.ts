"use client";

import { useMutation } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";

type TokenOut = { accessToken: string };

// Without a ceiling a stalled connection leaves the sign-in/sign-up button
// spinning forever; a timeout surfaces as a no-response error the forms report
// as a connection problem, and the button re-enables for a retry.
const AUTH_TIMEOUT_MS = 20_000;

export type RegisterInput = {
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  classLevel: string;
  track: string;
  state: string;
};

export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      request<{ ok: boolean; message: string }>({
        method: "POST",
        url: endpoints.auth.register,
        timeout: AUTH_TIMEOUT_MS,
        data: input,
        anonymous: true,
      }),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      request<TokenOut>({
        method: "POST",
        url: endpoints.auth.login,
        timeout: AUTH_TIMEOUT_MS,
        data: input,
        anonymous: true,
      }),
  });
}

export function useGoogleTokens() {
  return useMutation({
    mutationFn: (input: { code: string; redirectUri: string }) =>
      request<TokenOut>({
        method: "POST",
        url: endpoints.auth.googleTokens,
        data: input,
        anonymous: true,
      }),
  });
}

type MessageOut = { message: string };

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: { email: string }) =>
      request<MessageOut>({
        method: "POST",
        url: endpoints.auth.forgotPassword,
        timeout: AUTH_TIMEOUT_MS,
        data: input,
        anonymous: true,
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { email: string; token: string; newPassword: string }) =>
      request<MessageOut>({
        method: "POST",
        url: endpoints.auth.resetPassword,
        timeout: AUTH_TIMEOUT_MS,
        data: input,
        anonymous: true,
      }),
  });
}

export function useAdminForgotPassword() {
  return useMutation({
    mutationFn: (input: { identifier: string }) =>
      request<MessageOut>({
        method: "POST",
        url: endpoints.admin.auth.forgotPassword,
        data: input,
        anonymous: true,
        realm: "admin",
      }),
  });
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: (input: {
      identifier: string;
      token: string;
      newPassword: string;
    }) =>
      request<MessageOut>({
        method: "POST",
        url: endpoints.admin.auth.resetPassword,
        data: input,
        anonymous: true,
        realm: "admin",
      }),
  });
}

export function useOtpSend() {
  return useMutation({
    mutationFn: (input: { email: string }) =>
      request<{ ok: boolean; message?: string }>({
        method: "POST",
        url: endpoints.auth.otpSend,
        data: input,
      }),
  });
}

export function useOtpVerify() {
  return useMutation({
    mutationFn: (input: { email: string; otp: string }) =>
      request<{ ok: boolean; message?: string }>({
        method: "POST",
        url: endpoints.auth.otpVerify,
        data: input,
      }),
  });
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: (input: { identifier: string; password: string }) =>
      request<TokenOut>({
        method: "POST",
        url: endpoints.admin.auth.login,
        data: input,
        anonymous: true,
        realm: "admin",
      }),
  });
}
