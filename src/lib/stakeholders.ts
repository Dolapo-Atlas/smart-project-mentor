// Backward-compat default cast. Live UI should call `useRoster()` from
// `@/lib/roster` to render the *active project's* people.
export { DEFAULT_ROSTER as STAKEHOLDERS } from "./roster";
export type { RosterMember } from "./roster";