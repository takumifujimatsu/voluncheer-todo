"use client";

import { useCallback, useState } from "react";
import {
  DONE_LIMIT_STORAGE_KEY,
  type DoneLimit,
  DONE_LIMIT_OPTIONS,
} from "@/lib/taskFilters";

const VALID_LIMITS: DoneLimit[] = ["all", 10, 30, 50, 100];

function parseDoneLimit(raw: string | null): DoneLimit {
  if (!raw) return "all";
  if (raw === "all") return "all";
  const n = parseInt(raw, 10);
  if (VALID_LIMITS.includes(n as DoneLimit)) return n as DoneLimit;
  return "all";
}

export function useDoneLimit() {
  const [doneLimit, setDoneLimitState] = useState<DoneLimit>(() =>
    typeof window !== "undefined"
      ? parseDoneLimit(localStorage.getItem(DONE_LIMIT_STORAGE_KEY))
      : "all"
  );

  const setDoneLimit = useCallback((value: DoneLimit) => {
    setDoneLimitState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(DONE_LIMIT_STORAGE_KEY, String(value));
    }
  }, []);

  return { doneLimit, setDoneLimit };
}
