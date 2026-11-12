import { endpoints } from "@/lib/api/endpoints";
import { isApiError } from "@/lib/api/errors";
import { request } from "@/lib/api/http";
import { mapThread, mapThreadList } from "./map";
import type { AstraThread, AstraThreadSummary } from "./types";

export function isThreadMissing(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

export async function listCenterAstraThreads(
  centerId: string,
): Promise<AstraThreadSummary[]> {
  const raw = await request<unknown>({
    method: "GET",
    url: endpoints.centerApi.astra.threads(centerId),
    realm: "tutor",
  });
  return mapThreadList(raw);
}

export async function createCenterAstraThread(
  centerId: string,
): Promise<AstraThread> {
  const raw = await request<unknown>({
    method: "POST",
    url: endpoints.centerApi.astra.threads(centerId),
    data: {},
    realm: "tutor",
  });
  const thread = mapThread(raw);
  if (!thread) throw new Error("Astra didn't return a thread.");
  return thread;
}

export async function getCenterAstraThread(
  centerId: string,
  threadId: string,
): Promise<AstraThread> {
  const raw = await request<unknown>({
    method: "GET",
    url: endpoints.centerApi.astra.thread(centerId, threadId),
    realm: "tutor",
  });
  const thread = mapThread(raw);
  if (!thread) throw new Error("Astra didn't return that thread.");
  return thread;
}

export async function archiveCenterAstraThread(
  centerId: string,
  threadId: string,
): Promise<void> {
  await request({
    method: "DELETE",
    url: endpoints.centerApi.astra.thread(centerId, threadId),
    realm: "tutor",
  });
}
