import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMilestones, type Milestone } from "@/lib/milestones.functions";
import { MilestoneAchievedDialog } from "./milestone-achieved-dialog";
import { MilestoneShareDialog } from "./milestone-share-dialog";

const KEY = "atlas.milestones.seen";

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Watches the verified milestone feed and surfaces the newest one the learner
 * hasn't acknowledged yet. Purely presentational: it never writes simulation
 * state, and one milestone is shown at a time so the workflow stays calm.
 */
export function MilestoneWatcher() {
  const fetchFeed = useServerFn(listMilestones);
  const { data } = useQuery({ queryKey: ["milestones"], queryFn: () => fetchFeed() });
  const [current, setCurrent] = useState<Milestone | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!data?.milestones?.length) return;
    const seen = readSeen();
    if (seen.length === 0) {
      // First load on this device: treat existing history as already seen so a
      // returning learner isn't shown old milestones.
      window.localStorage.setItem(KEY, JSON.stringify(data.milestones.map((m) => m.id)));
      return;
    }
    const fresh = data.milestones.find((m) => !seen.includes(m.id));
    if (fresh && !current) setCurrent(fresh);
  }, [data, current]);

  const acknowledge = () => {
    if (!current) return;
    const seen = readSeen();
    window.localStorage.setItem(KEY, JSON.stringify([...seen, current.id]));
    setCurrent(null);
  };

  if (!data) return null;

  return (
    <>
      <MilestoneAchievedDialog
        milestone={current}
        projectName={data.projectName}
        simulatedRole={data.simulatedRole}
        open={!!current && !shareOpen}
        onOpenChange={(v) => {
          if (!v) acknowledge();
        }}
        onShare={() => setShareOpen(true)}
      />
      <MilestoneShareDialog
        milestone={current}
        learnerName={data.learnerName}
        simulatedRole={data.simulatedRole}
        projectName={data.projectName}
        open={shareOpen}
        onOpenChange={(v) => {
          setShareOpen(v);
          if (!v) acknowledge();
        }}
      />
    </>
  );
}