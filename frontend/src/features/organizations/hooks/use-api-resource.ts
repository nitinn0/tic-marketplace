"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api";

export type ApiResource<T> = {
  data: T | null;
  error: string | null;
  status: number | null;
  loading: boolean;
  reload: () => Promise<void>;
};

/** Loads data from the API, ignoring responses that arrive after the inputs changed. */
export function useApiResource<T>(loader: (() => Promise<T>) | null, deps: readonly unknown[]): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async () => {
    const current = ++requestId.current;
    const load = loaderRef.current;
    if (!load) return;
    try {
      const result = await load();
      if (current !== requestId.current) return;
      setData(result);
      setError(null);
      setStatus(null);
    } catch (err) {
      if (current !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Request failed");
      setStatus(err instanceof ApiError ? err.status : null);
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, status, loading, reload: run };
}
