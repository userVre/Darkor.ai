import { useCallback, useEffect, useRef, useState } from "react";

type HealthStatus = "checking" | "online" | "offline";

type BackendHealth = {
  status: HealthStatus;
  lastCheckedAt: number | null;
  lastError: string | null;
  retry: () => void;
};

type HealthOptions = {
  enabled?: boolean;
  intervalMs?: number;
  timeoutMs?: number;
};

async function pingBackend(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return { ok: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export function useBackendHealth(url?: string, options: HealthOptions = {}): BackendHealth {
  const { enabled = true, intervalMs = 15000, timeoutMs = 5000 } = options;
  const [status, setStatus] = useState<HealthStatus>(enabled ? "checking" : "offline");
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const latestStatus = useRef<HealthStatus>("checking");
  const statusRef = useRef<HealthStatus>("checking");

  const runCheck = useCallback(async () => {
    if (!enabled || !url) {
      setStatus("offline");
      setLastError(url ? "Health checks disabled" : "Missing backend URL");
      setLastCheckedAt(Date.now());
      return;
    }

    if (statusRef.current === "checking") {
      setStatus("checking");
    }
    const result = await pingBackend(url, timeoutMs);
    setLastCheckedAt(Date.now());
    setLastError(result.error);
    setStatus(result.ok ? "online" : "offline");
  }, [enabled, timeoutMs, url]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const check = async () => {
      if (!active) return;
      await runCheck();
    };

    void check();
    const id = setInterval(check, intervalMs);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled, intervalMs, runCheck]);

  useEffect(() => {
    if (latestStatus.current !== status) {
      console.log("[Network] Backend status", status);
      latestStatus.current = status;
    }
    statusRef.current = status;
  }, [status]);

  return {
    status,
    lastCheckedAt,
    lastError,
    retry: runCheck,
  };
}
