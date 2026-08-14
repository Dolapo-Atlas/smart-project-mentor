import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getActiveProject } from "@/lib/projects.functions";
import { getOverview } from "@/lib/sim.functions";
import {
  ArrowRight,
  Info,
  Compass,
  Target,
  Boxes,
  CalendarClock,
  Users,
  ShieldAlert,
  AlertTriangle,
  UserRound,
  type LucideIcon,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** First run: the CTA just closes the pack so the next prompt can appear. */
  firstRun?: boolean;
};

const TABS = [
  { label: "Overview", icon: Compass },
  { label: "Objectives & Success", icon: Target },
  { label: "Scope", icon: Boxes },
  { label: "Timeline & Budget", icon: CalendarClock },
  { label: "Stakeholders", icon: Users },
  { label: "Risks & Assumptions", icon: ShieldAlert },
  { label: "Current Issues", icon: AlertTriangle },
  { label: "Your Role", icon: UserRound },
] as const satisfies readonly { label: string; icon: LucideIcon }[];

type Tab = (typeof TABS)[number]["label"];

export function ProjectInitiationPack({ open, onOpenChange, firstRun }: Props) {
  const fetchActive = useServerFn(getActiveProject);
  const fetchOverview = useServerFn(getOverview);
  const [tab, setTab] = useState<Tab>("Overview");

  const { data: active } = useQuery({
    queryKey: ["active-project"],
    queryFn: () => fetchActive(),
    enabled: open,
  });
  const { data: overview } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetchOverview(),
    enabled: open,
  });

  const activeAny = active as any;
  const tpl = activeAny?.project_templates ?? {};
  const title =
    activeAny?.display_name ??
    tpl?.title ??
    overview?.state?.project_name ??
    "Digital Care Records Rollout";
  const roleTitle =
    ((overview?.profile as any)?.preferred_role as string | undefined)?.trim() ||
    ((overview?.profile as any)?.role as string | undefined)?.trim() ||
    "Project Coordinator";

  const activeIcon =
    TABS.find((t) => t.label === tab)?.icon ?? Compass;
  const ActiveIcon = activeIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 left-0 top-0 shadow-2xl sm:left-[50%] sm:top-[50%] sm:h-[92dvh] sm:max-w-6xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:border [&>button]:right-5 [&>button]:top-5 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-primary-foreground/10 [&>button]:p-2 [&>button]:text-primary-foreground [&>button]:opacity-90 [&>button]:hover:bg-primary-foreground/20"
      >
        {/* Navy header + sticky tab rail */}
        <div className="shrink-0 bg-navy px-5 pb-4 pt-6 text-navy-foreground sm:px-8 sm:pb-5 sm:pt-8">
          <div className="text-[10px] uppercase tracking-[0.24em] text-navy-foreground/60">
            {title}
          </div>
          <DialogTitle className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-4xl">
            Project Initiation Pack
          </DialogTitle>
          <DialogDescription className="mt-1.5 max-w-2xl text-sm text-navy-foreground/70">
            Your starting point for understanding the project, its purpose,
            current position, constraints and known concerns.
          </DialogDescription>

          <div className="-mx-5 mt-5 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
            <div
              role="tablist"
              aria-label="Project Initiation Pack sections"
              className="flex w-max gap-2"
            >
              {TABS.map(({ label, icon: Icon }) => {
                const activeTab = label === tab;
                return (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={activeTab}
                    onClick={() => setTab(label)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-2xl border px-3.5 py-2 text-xs font-medium transition-all duration-200 sm:text-sm ${
                      activeTab
                        ? "border-accent-orange bg-accent-orange text-accent-orange-foreground shadow-lg shadow-black/25"
                        : "border-navy-foreground/15 bg-navy-foreground/5 text-navy-foreground/75 hover:border-accent-orange/60 hover:bg-navy-foreground/10 hover:text-navy-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-4 py-5 sm:px-8 sm:py-7">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-start gap-2.5 rounded-2xl border border-accent-orange/25 bg-accent-orange/5 p-3.5 text-xs text-foreground/75 sm:text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-orange" />
              <span>
                You do not need to read everything now. Use this pack throughout
                the project and return to the relevant section when you need
                information for a task or decision.
              </span>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy text-navy-foreground">
                <ActiveIcon className="h-4.5 w-4.5" />
              </span>
              <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                {tab}
              </h2>
            </div>

            <div
              key={tab}
              className="mt-4 animate-in fade-in-0 slide-in-from-bottom-1 space-y-5 rounded-3xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground/85 shadow-sm duration-300 sm:p-6"
            >
              {tab === "Overview" && <OverviewTab />}
              {tab === "Objectives & Success" && <ObjectivesTab />}
              {tab === "Scope" && <ScopeTab />}
              {tab === "Timeline & Budget" && <TimelineTab />}
              {tab === "Stakeholders" && <StakeholdersTab />}
              {tab === "Risks & Assumptions" && <RisksTab />}
              {tab === "Current Issues" && <IssuesTab />}
              {tab === "Your Role" && <RoleTab roleTitle={roleTitle} />}
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Use this information when completing project tasks. New emails,
              decisions and project events may change what you know as the
              simulation progresses.
            </p>
          </div>
        </div>

        {/* Sticky footer actions */}
        <div className="shrink-0 border-t border-border bg-card px-4 py-3 sm:px-8 sm:py-4">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            {firstRun ? (
              <Button size="lg" onClick={() => onOpenChange(false)}>
                <ArrowRight className="mr-2 h-4 w-4" />
                I’ve read the Project Initiation Pack
              </Button>
            ) : (
              <Button asChild onClick={() => onOpenChange(false)}>
                <Link to="/app/tasks">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Back to my work
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-lg font-medium tracking-tight text-foreground">
      {children}
    </h3>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-orange" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warn" | "navy" | "green" | "lilac";
}) {
  const tones: Record<string, string> = {
    default: "border-surface-neutral-border bg-surface-neutral",
    warn: "border-surface-orange-border bg-surface-orange",
    navy: "border-surface-navy-border bg-surface-navy",
    green: "border-surface-green-border bg-surface-green",
    lilac: "border-surface-lilac-border bg-surface-lilac",
  };
  return (
    <div
      className={`rounded-3xl border p-5 shadow-[var(--shadow-soft)] transition-all duration-500 ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

function OverviewTab() {
  return (
    <>
      <section>
        <H>Why this project exists</H>
        <p className="mt-2">
          The organisation currently uses a mixture of paper-based and
          inconsistent digital processes for recording care information across
          its services.
        </p>
        <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
          This creates several challenges
        </p>
        <Bullets
          items={[
            "Important care information can be difficult to access quickly.",
            "Recording practices differ between locations.",
            "Staff sometimes duplicate information across systems and paper records.",
            "Managers have limited visibility of consistent operational information.",
            "Missing or incomplete records can create clinical and governance risks.",
            "Reporting across multiple services is difficult.",
          ]}
        />
        <p className="mt-3">
          The organisation has therefore approved the introduction of a standard
          Digital Care Records solution using{" "}
          <span className="font-medium text-foreground">CareSoft</span>.
        </p>
        <p className="mt-2">
          The programme aims to provide a safer, more consistent and accessible
          way of recording and managing care information.
        </p>
      </section>

      <section>
        <H>Current project position</H>
        <Card>
          <p>
            The programme is currently in the{" "}
            <span className="font-medium text-foreground">Initiation</span>{" "}
            phase.
          </p>
          <p className="mt-2">
            Some high-level decisions have already been made, but several areas
            still need to be clarified, documented and agreed before the project
            can move safely into full Planning.
          </p>
          <p className="mt-2">
            The project team is now establishing the project foundations,
            confirming scope, identifying risks and dependencies, agreeing
            governance and preparing the project for detailed planning.
          </p>
        </Card>
      </section>
    </>
  );
}

function ObjectivesTab() {
  return (
    <>
      <section>
        <H>Project objective</H>
        <p className="mt-2">
          The Digital Care Records Rollout will introduce and embed the CareSoft
          Digital Care Records solution across the participating care services.
        </p>
        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          The project aims to
        </p>
        <Bullets
          items={[
            "Standardise how care information is recorded.",
            "Reduce unnecessary reliance on paper records.",
            "Improve accessibility and quality of care information.",
            "Prepare staff to use the new system confidently.",
            "Complete required technical integration and migration work.",
            "Reach a controlled Go Live without unacceptable disruption to care services.",
          ]}
        />
      </section>

      <section>
        <H>What success currently looks like</H>
        <p className="mt-2">
          The project will be considered successful if the agreed services are
          able to move onto CareSoft safely within the approved delivery window.
        </p>
        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          Current expectations include
        </p>
        <Bullets
          items={[
            "CareSoft being technically ready for operational use.",
            "Required integrations operating reliably.",
            "Agreed historical data being migrated successfully.",
            "Relevant staff completing required training.",
            "Clinical and operational risks being appropriately managed.",
            "Project expenditure remaining within the approved budget.",
            "The organisation reaching Go Live with an acceptable level of risk.",
          ]}
        />
      </section>

      <Card tone="warn">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-accent-orange">
          Important
        </div>
        <p className="mt-1">
          Some detailed success measures have not yet been fully agreed. Do not
          invent information that has not been confirmed.
        </p>
      </Card>
    </>
  );
}

function ScopeTab() {
  return (
    <>
      <section>
        <H>Current project scope</H>
        <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
          The project currently includes
        </p>
        <Bullets
          items={[
            "Implementation of the CareSoft Digital Care Records solution.",
            "Technical configuration required for deployment.",
            "Integration with relevant existing systems.",
            "Migration of agreed care-record data.",
            "Staff preparation and training.",
            "Testing and readiness activities.",
            "Stakeholder engagement.",
            "Project governance and reporting.",
            "Preparation for operational Go Live.",
          ]}
        />
      </section>

      <section>
        <H>Currently outside scope</H>
        <p className="mt-2">
          Unless formally approved through change control, the project does not
          automatically include:
        </p>
        <Bullets
          items={[
            "Unrelated organisational IT upgrades.",
            "Replacement of systems not required for CareSoft implementation.",
            "Major operational-process redesign outside the Digital Care Records programme.",
            "Additional functionality requested after the agreed scope has been confirmed.",
          ]}
        />
      </section>

      <Card tone="warn">
        <p>
          Any request that could materially affect scope, cost, timeline or
          delivery must be assessed through the project’s change-control
          process.
        </p>
      </Card>
    </>
  );
}

function TimelineTab() {
  return (
    <>
      <section>
        <H>Delivery timeline</H>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Planned delivery window
            </div>
            <div className="mt-1 font-display text-2xl font-medium text-accent-orange">
              12 weeks
            </div>
          </Card>
          <Card>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Approved budget
            </div>
            <div className="mt-1 font-display text-2xl font-medium text-navy">
              £1,200,000
            </div>
          </Card>
        </div>
        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          Current lifecycle
        </p>
        <p className="mt-1 font-medium text-foreground">
          Initiation → Planning → Execution → Go Live
        </p>
        <p className="mt-2">
          Movement between phases depends on project readiness rather than
          simply reaching a particular date. Critical unresolved risks,
          incomplete deliverables or governance concerns may prevent the project
          from moving into the next phase.
        </p>
      </section>

      <section>
        <H>Approved budget</H>
        <p className="mt-2">
          The budget of{" "}
          <span className="font-medium text-foreground">£1,200,000</span>{" "}
          supports the wider rollout, including:
        </p>
        <Bullets
          items={[
            "Technology and implementation.",
            "Integration work.",
            "Data migration.",
            "Training.",
            "Project delivery activities.",
            "Readiness and Go Live preparation.",
          ]}
        />
        <p className="mt-3">
          Significant changes that affect cost must be assessed before being
          accepted.
        </p>
      </section>
    </>
  );
}

const STAKEHOLDERS: { name: string; role: string; note: string }[] = [
  {
    name: "David Okafor",
    role: "Executive Sponsor",
    note: "Provides senior sponsorship, funding oversight and support for major project decisions and escalation.",
  },
  {
    name: "Sarah Williams",
    role: "Project Manager",
    note: "Responsible for overall delivery coordination and expects clear information, action tracking and early escalation of significant concerns.",
  },
  {
    name: "Rachel Stone",
    role: "Clinical Governance Lead",
    note: "Focused on clinical safety, record quality, regulatory requirements and governance.",
  },
  {
    name: "Margaret Hollis",
    role: "Care Home Manager",
    note: "Represents the operational environment and is concerned with staff readiness, workload and disruption to care services.",
  },
  {
    name: "James Lin",
    role: "Technical Lead",
    note: "Responsible for integrations, technical dependencies and system readiness.",
  },
  {
    name: "Priya Anand",
    role: "Finance Lead",
    note: "Provides financial oversight and expects material cost implications to be understood and communicated.",
  },
  {
    name: "CareSoft Representative",
    role: "Solution Partner & Support Advocate",
    note: "Represents the system supplier and supports implementation and vendor-related technical requirements.",
  },
];

function StakeholdersTab() {
  return (
    <>
      <H>Key stakeholders</H>
      <div className="space-y-3">
        {STAKEHOLDERS.map((s) => (
          <Card key={s.name}>
            <div className="font-medium text-foreground">{s.name}</div>
            <div className="text-[11px] uppercase tracking-wider text-accent-orange">
              {s.role}
            </div>
            <p className="mt-1.5 text-sm">{s.note}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        This tab provides project context only.
      </p>
    </>
  );
}

function RisksTab() {
  return (
    <>
      <section>
        <H>Current assumptions</H>
        <p className="mt-2">The project currently assumes that:</p>
        <Bullets
          items={[
            "Required stakeholders will remain available during the delivery period.",
            "CareSoft will provide the technical information needed for integration.",
            "Required data can be migrated within the planned delivery window.",
            "Appropriate staff will be available for training.",
            "Operational teams can prepare for the new system without unacceptable disruption to normal care delivery.",
          ]}
        />
        <p className="mt-3 text-muted-foreground">
          Assumptions may later become risks or issues if evidence changes.
        </p>
      </section>

      <section>
        <H>Known constraints</H>
        <div className="mt-3 space-y-3">
          <Card>
            <span className="font-medium text-foreground">Time:</span> the
            programme currently has a{" "}
            <span className="font-medium text-accent-orange">12-week</span>{" "}
            delivery window.
          </Card>
          <Card>
            <span className="font-medium text-foreground">Budget:</span>{" "}
            delivery should remain within the approved{" "}
            <span className="font-medium text-navy">£1.2 million</span> unless
            additional expenditure is formally authorised.
          </Card>
          <Card>
            <span className="font-medium text-foreground">
              Operational continuity:
            </span>{" "}
            care services must continue operating safely during implementation.
          </Card>
          <Card>
            <span className="font-medium text-foreground">
              Stakeholder availability:
            </span>{" "}
            senior and operational stakeholders have responsibilities outside
            the project.
          </Card>
          <Card>
            <span className="font-medium text-foreground">
              Technical dependencies:
            </span>{" "}
            successful delivery depends on CareSoft, integrations and data
            migration.
          </Card>
        </div>
      </section>
    </>
  );
}

const ISSUES = [
  {
    title: "CareSoft v4.2 Integration Documentation",
    body: "Additional technical documentation is required from CareSoft to support integration planning. The request may require escalation if the required information is not provided within the expected timeframe.",
  },
  {
    title: "Database Migration v2.1 Synchronisation Failure",
    body: "A migration-related synchronisation problem has been identified. Its potential impact on migration planning and delivery readiness must be understood and tracked.",
  },
  {
    title: "HL7 Interface Instability",
    body: "Instability has been identified in an HL7 interface required by the programme. Its potential impact on technical readiness and Go Live should be recorded and monitored through the RAID process.",
  },
];

function IssuesTab() {
  return (
    <>
      <H>Current issues</H>
      <div className="space-y-3">
        {ISSUES.map((i) => (
          <Card key={i.title} tone="warn">
            <span className="inline-block rounded-sm bg-accent-orange/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-orange">
              Known concern
            </span>
            <div className="mt-2 font-medium text-foreground">{i.title}</div>
            <p className="mt-1.5 text-sm">{i.body}</p>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Nothing here is added to the RAID log automatically — how you handle
        this information is your decision.
      </p>
    </>
  );
}

function RoleTab({ roleTitle }: { roleTitle: string }) {
  return (
    <>
      <section>
        <H>Your role</H>
        <p className="mt-2">
          You are the{" "}
          <span className="font-medium text-foreground">{roleTitle}</span>{" "}
          supporting the Digital Care Records Rollout.
        </p>
        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
          Your responsibilities include
        </p>
        <Bullets
          items={[
            "Coordinating project information.",
            "Maintaining project documentation.",
            "Supporting development of the Project Charter.",
            "Maintaining the RAID log.",
            "Tracking actions and deliverables.",
            "Coordinating stakeholder communication.",
            "Supporting meetings.",
            "Preparing project updates and status information.",
            "Following up action owners.",
            "Raising risks, issues and dependencies.",
            "Escalating matters through the appropriate governance route.",
          ]}
        />
        <p className="mt-3">
          You support project decision-making, but significant approvals must
          follow the project’s governance process.
        </p>
      </section>

      <section>
        <H>Your immediate priorities</H>
        <Card>
          <Bullets
            items={[
              "Understand the project’s purpose and current position.",
              "Review the available project information.",
              "Begin developing the Project Charter.",
              "Identify missing or unclear information.",
              "Record appropriate risks, issues, assumptions and dependencies.",
              "Deal with priority project concerns as they emerge.",
              "Keep project information current as new events occur.",
            ]}
          />
        </Card>
      </section>
    </>
  );
}
