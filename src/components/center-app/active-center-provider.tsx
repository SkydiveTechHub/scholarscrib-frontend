"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTutorCenters } from "@/hooks/api/use-center";
import {
  pickActiveCenter,
  readStoredActiveCenterId,
  writeStoredActiveCenterId,
} from "@/lib/active-center";
import type { UseQueryResult } from "@tanstack/react-query";
import type { CenterOut, CentersListOut } from "@/lib/api/types";

type ActiveCenterContextValue = {
  centersQuery: UseQueryResult<CentersListOut, Error>;
  centers: CenterOut[];
  center: CenterOut | null;
  centerId: string | null;
  setActiveCenterId: (id: string) => void;
  hasMultiple: boolean;
  /** One-shot prefer (e.g. `?centerId=`) — also persists. */
  preferCenterId: (id: string | null | undefined) => void;
};

const ActiveCenterContext = createContext<ActiveCenterContextValue | null>(
  null,
);

export function ActiveCenterProvider({ children }: { children: ReactNode }) {
  const centersQuery = useTutorCenters();
  const centers = centersQuery.data?.centers ?? [];
  const [storedId, setStoredId] = useState<string | null>(null);

  useEffect(() => {
    setStoredId(readStoredActiveCenterId());
  }, []);

  const setActiveCenterId = useCallback((id: string) => {
    writeStoredActiveCenterId(id);
    setStoredId(id);
  }, []);

  const preferCenterId = useCallback(
    (id: string | null | undefined) => {
      if (!id) return;
      if (!centers.some((c) => c.id === id)) return;
      writeStoredActiveCenterId(id);
      setStoredId(id);
    },
    [centers],
  );

  const center = useMemo(
    () => pickActiveCenter(centers, storedId),
    [centers, storedId],
  );

  const value = useMemo(
    () => ({
      centersQuery,
      centers,
      center,
      centerId: center?.id ?? null,
      setActiveCenterId,
      hasMultiple: centers.length > 1,
      preferCenterId,
    }),
    [
      centersQuery,
      centers,
      center,
      setActiveCenterId,
      preferCenterId,
    ],
  );

  return (
    <ActiveCenterContext.Provider value={value}>
      {children}
    </ActiveCenterContext.Provider>
  );
}

export function useActiveCenterContext() {
  const ctx = useContext(ActiveCenterContext);
  if (!ctx) {
    throw new Error(
      "useActiveCenterContext must be used within ActiveCenterProvider",
    );
  }
  return ctx;
}
