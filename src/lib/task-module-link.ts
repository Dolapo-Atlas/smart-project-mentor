export type TaskModuleLinkTask = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  linked_module_route?: string | null;
  completion_action?: string | null;
};

function inferRaidKind(t: { title?: string | null; description?: string | null; category?: string | null }):
  "risk" | "assumption" | "issue" | "dependency" {
  const s = `${t.title ?? ""} ${t.description ?? ""} ${t.category ?? ""}`.toLowerCase();
  if (/\bassumption/.test(s)) return "assumption";
  if (/\bissue|incident|blocker/.test(s)) return "issue";
  if (/\bdependenc/.test(s)) return "dependency";
  return "risk";
}

function commsBody(t: TaskModuleLinkTask) {
  const action = t.completion_action?.trim();
  const detail = t.description?.trim();
  if (action && detail) return `${action}\n\nContext: ${detail}`;
  return action || detail || "";
}

export function getTaskModuleLink(t: TaskModuleLinkTask): { to: string; search?: Record<string, string> } {
  const base = t.linked_module_route ?? "/app/tasks";
  if (base === "/app/raid") {
    return {
      to: "/app/raid",
      search: { task: t.id, kind: inferRaidKind(t), prefill_title: t.title ?? "" },
    };
  }
  if (["/app/charter", "/app/reports", "/app/stakeholders", "/app/lessons"].includes(base)) {
    return { to: base, search: { task: t.id } };
  }
  if (base === "/app/changes") {
    return { to: "/app/changes", search: { task: t.id, prefill_title: t.title ?? "" } };
  }
  if (base === "/app/comms") {
    return {
      to: "/app/comms",
      search: {
        task: t.id,
        prefill_title: t.title ?? "",
        prefill_body: commsBody(t),
      },
    };
  }
  return { to: base };
}