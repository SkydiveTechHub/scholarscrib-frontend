import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { request } from "@/lib/api/http";
import { mapThread, mapThreadList } from "./map";
import type { AstraThread, AstraThreadSummary } from "./types";

export function isThreadMissing(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

export async function listAdminAstraThreads(): Promise<AstraThreadSummary[]> {
  const raw = await request<unknown>({
    method: "GET",
    url: endpoints.admin.astra.threads,
    realm: "admin",
  });
  return mapThreadList(raw);
}

export async function createAdminAstraThread(): Promise<AstraThread> {
  const raw = await request<unknown>({
    method: "POST",
    url: endpoints.admin.astra.threads,
    data: {},
    realm: "admin",
  });
  const thread = mapThread(raw);
  if (!thread) throw new Error("Astra didn't return a thread.");
  return thread;
}

export async function getAdminAstraThread(threadId: string): Promise<AstraThread> {
  const raw = await request<unknown>({
    method: "GET",
    url: endpoints.admin.astra.thread(threadId),
    realm: "admin",
  });
  const thread = mapThread(raw);
  if (!thread) throw new Error("Astra didn't return that thread.");
  return thread;
}

export async function archiveAdminAstraThread(threadId: string): Promise<void> {
  await request({
    method: "DELETE",
    url: endpoints.admin.astra.thread(threadId),
    realm: "admin",
  });
}
