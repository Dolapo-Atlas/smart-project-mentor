import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

/**
 * Project-aware stakeholder roster. Every project_template carries its own
 * `stakeholders` JSON array; this module resolves it for the user's active
 * project and falls back to the Digital Care Records cast for legacy state.
 */

export type RosterMember = {
  role: string;        // canonical role key: pm | sponsor | finance | tech | operations | admin | vendor | clinical | care_home | …
  name: string;        // display name shown in UI and AI prompts
  title: string;       // job title
  seed: string;        // stable avatar seed (unique per template+role)
};

export const DEFAULT_ROSTER: RosterMember[] = [
  { role: "pm",        name: "Sarah Williams",  title: "Project Manager",                seed: "dcr-pm-sarah-williams" },
  { role: "sponsor",   name: "David Okafor",    title: "Executive Sponsor",              seed: "dcr-sponsor-david-okafor" },
  { role: "finance",   name: "Priya Anand",     title: "Finance Lead",                   seed: "dcr-finance-priya-anand" },
  { role: "tech",      name: "James Lin",       title: "Technical Lead",                 seed: "dcr-tech-james-lin" },
  { role: "vendor",    name: "CareSoft Ltd",    title: "Vendor — Implementation",        seed: "dcr-vendor-caresoft" },
  { role: "care_home", name: "Margaret Hollis", title: "Care Home Manager, Oakwood",     seed: "dcr-ops-margaret-hollis" },
  { role: "clinical",  name: "Rachel Stone",    title: "Clinical Governance Lead",       seed: "dcr-clin-rachel-stone" },
];

function coerce(raw: unknown): RosterMember[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_ROSTER;
  const out: RosterMember[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.role === "string" && typeof o.name === "string" && typeof o.title === "string") {
      out.push({
        role: o.role,
        name: o.name,
        title: o.title,
        seed: typeof o.seed === "string" && o.seed ? o.seed : `${o.role}-${o.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      });
    }
  }
  return out.length ? out : DEFAULT_ROSTER;
}

/** Server-side: load the active roster for a user, or DEFAULT_ROSTER. */
export async function loadRoster(supabase: any, userId: string): Promise<RosterMember[]> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_project_instance_id")
    .eq("id", userId)
    .maybeSingle();
  const instanceId = profile?.current_project_instance_id as string | undefined;
  if (!instanceId) return DEFAULT_ROSTER;
  const { data: inst } = await supabase
    .from("project_instances")
    .select("project_templates(stakeholders)")
    .eq("id", instanceId)
    .maybeSingle();
  const tpl: any = (inst as any)?.project_templates ?? {};
  return coerce(tpl.stakeholders);
}

/** Convert a roster to a lookup keyed by canonical role. */
export function rosterByRole(roster: RosterMember[]): Record<string, RosterMember> {
  const out: Record<string, RosterMember> = {};
  for (const m of roster) out[m.role] = m;
  return out;
}

/** Convert a roster to a lookup keyed by display name. */
export function rosterByName(roster: RosterMember[]): Record<string, RosterMember> {
  const out: Record<string, RosterMember> = {};
  for (const m of roster) out[m.name] = m;
  return out;
}

/** Server fn the UI calls to render dropdowns/avatars for the active project. */
export const getActiveRoster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return loadRoster(context.supabase, context.userId);
  });

/** Client hook — falls back to DEFAULT_ROSTER while loading. */
export function useRoster(): RosterMember[] {
  const fn = useServerFn(getActiveRoster);
  const q = useQuery({
    queryKey: ["roster"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
  });
  return q.data ?? DEFAULT_ROSTER;
}