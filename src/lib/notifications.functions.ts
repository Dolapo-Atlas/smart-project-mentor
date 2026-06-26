import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Notification = {
  id: string;
  kind: "email" | "task_done" | "stakeholder" | "story";
  title: string;
  detail: string;
  at: string;
  href: string;
  unread: boolean;
};

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: inbox }, { data: doneTasks }, { data: rels }] = await Promise.all([
      supabase
        .from("inbox_messages")
        .select("id,sender_name,subject,tone,read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("tasks")
        .select("id,title,status,completed_at,submitted_at,created_at,linked_stakeholder")
        .eq("user_id", userId)
        .in("status", ["done", "approved", "submitted"])
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("stakeholder_relationships")
        .select("stakeholder_name,sentiment,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

    const items: Notification[] = [];

    for (const m of inbox ?? []) {
      items.push({
        id: `email-${m.id}`,
        kind: "email",
        title: `${m.sender_name} → ${m.subject}`,
        detail:
          m.tone === "urgent" || m.tone === "frustrated"
            ? "Urgent — needs a reply"
            : "New message in your inbox",
        at: m.created_at,
        href: "/app/inbox",
        unread: !m.read,
      });
    }

    for (const t of doneTasks ?? []) {
      const at = t.completed_at ?? t.submitted_at ?? t.created_at;
      items.push({
        id: `task-${t.id}`,
        kind: "task_done",
        title:
          t.status === "submitted"
            ? `Submitted: ${t.title}`
            : `Closed: ${t.title}`,
        detail: t.linked_stakeholder
          ? `Reviewed by ${t.linked_stakeholder}`
          : "Task moved forward",
        at,
        href: "/app/tasks",
        unread: false,
      });
    }

    for (const r of rels ?? []) {
      if (r.sentiment <= -20) {
        items.push({
          id: `rel-${r.stakeholder_name}`,
          kind: "stakeholder",
          title: `${r.stakeholder_name} — sentiment ${r.sentiment}`,
          detail: "Relationship needs repair",
          at: r.updated_at,
          href: "/app/stakeholders",
          unread: true,
        });
      } else if (r.sentiment >= 40) {
        items.push({
          id: `rel-${r.stakeholder_name}`,
          kind: "stakeholder",
          title: `${r.stakeholder_name} — sentiment ${r.sentiment}`,
          detail: "Relationship is strong",
          at: r.updated_at,
          href: "/app/stakeholders",
          unread: false,
        });
      }
    }

    items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    const unreadCount = items.filter((i) => i.unread).length;
    return { items: items.slice(0, 15), unreadCount };
  });