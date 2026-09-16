import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjects from "./tools/list-projects";
import getProjectStatus from "./tools/get-project-status";
import listTasks from "./tools/list-tasks";
import listRaidItems from "./tools/list-raid-items";
import listCertificates from "./tools/list-certificates";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "atlas-a-coordinator-s-diary",
  title: "Atlas-A coordinator's diary",
  version: "0.1.0",
  instructions:
    "Read-only tools for Atlas, a project coordinator simulation. Use list_projects to find the learner's simulation runs, get_project_status for the current day/phase/health of one run, list_tasks and list_raid_items for their work in progress, and list_certificates for completed credentials.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProjects, getProjectStatus, listTasks, listRaidItems, listCertificates],
});
