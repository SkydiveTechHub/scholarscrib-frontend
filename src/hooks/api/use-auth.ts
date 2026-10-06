"use client";

import { useMutation } from "@tanstack/react-query";
import { endpoints } from "@/lib/api/endpoints";
import { request } from "@/lib/api/http";

type TokenOut = { accessToken: string };

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
        data: input,
        anonymous: true,
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
