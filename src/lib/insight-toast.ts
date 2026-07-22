import { toast } from "sonner";
import { getInsight, type InsightKey } from "@/lib/pm-insights";

/**
 * Post-action toast with a senior-PM style rationale as the description.
 * The action still gets its own primary confirmation string; this adds the
 * "here's why that happened" layer beneath it.
 */
export function insightToast(
  insight: InsightKey,
  title: string,
  opts?: { kind?: "success" | "info" | "warning" | "error" },
) {
  const description = getInsight(insight).toast;
  const fn =
    opts?.kind === "warning"
      ? toast.warning
      : opts?.kind === "error"
        ? toast.error
        : opts?.kind === "info"
          ? toast.info ?? toast
          : toast.success;
  // 8s so the senior-PM rationale is actually readable, not a 2s flash.
  fn(title, { description, duration: 8000 });
}