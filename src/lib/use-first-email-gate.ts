import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFirstEmailGate } from "@/lib/first-run.functions";

/** Per-instance so a brand new project asks for the pack again. */
export function packSeenKey(instanceId?: string | null) {
  return instanceId ? `atlas.initiation-pack.opened.${instanceId}` : null;
}

export type FirstEmailGate = Awaited<ReturnType<typeof getFirstEmailGate>>;

/**
 * Day-one gate state: has the learner opened the Project Initiation Pack (the
 * only proof they actually read the email) and replied to the Project Manager?
 * Presentation only — nothing here writes project data.
 */
export function useFirstEmailGate() {
  const fetchGate = useServerFn(getFirstEmailGate);
  const { data, isLoading } = useQuery({
    queryKey: ["first-email-gate"],
    queryFn: () => fetchGate() as Promise<FirstEmailGate>,
  });
  const instanceId = data?.instanceId ?? null;
  const [packOpened, setPackOpened] = useState(false);

  useEffect(() => {
    const key = packSeenKey(instanceId);
    if (!key) return;
    try {
      setPackOpened(window.localStorage.getItem(key) === "1");
    } catch {
      setPackOpened(false);
    }
  }, [instanceId]);

  const markPackOpened = useCallback(() => {
    const key = packSeenKey(instanceId);
    setPackOpened(true);
    if (!key) return;
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* non-blocking */
    }
  }, [instanceId]);

  return {
    gate: data,
    loading: isLoading,
    instanceId,
    /** Everything except Home / Inbox stays shut until the reply is sent. */
    required: !!data?.required,
    replied: !!data?.replied,
    packOpened,
    markPackOpened,
  };
}
