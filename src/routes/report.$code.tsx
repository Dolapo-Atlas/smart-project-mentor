import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPublicCredential } from "@/lib/certificates.functions";
import { formatDate } from "@/components/certificate/atlas-certificate";
import atlasMark from "@/assets/atlas-mark.png";

const AREA_LABELS: Record<string, string> = {
  knowledgeApplication: "Knowledge Application",
  decisionMaking: "Decision-Making",
  stakeholderManagement: "Stakeholder Management",
  riskManagement: "Risk Management",
  documentation: "Documentation",
  deliveryManagement: "Delivery Management",
  communication: "Communication",
};

export const Route = createFileRoute("/report/$code")({
  loader: async ({ params }) => {
    const res = await getPublicCredential({ data: { code: params.code } });
    if (!res.found) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const c = loaderData?.certificate;
    const title = `Atlas Workplace Performance Report · ${c?.recipient_name ?? "Credential"}`;
    const description = `Detailed performance evidence for ${c?.recipient_name ?? "an Atlas learner"} on ${c?.programme_name ?? "an Atlas programme"} — ${c?.grade ?? "Pass"}, ${c?.overall_score ?? 0}/100.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-muted-foreground">
      We could not verify this Atlas credential. Check the code and try again.
    </div>
  ),
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-muted-foreground">
      Couldn't load this report right now. Please try again.
    </div>
  ),
  component: ReportPage,
});

function ReportPage() {
  const { certificate: cert, qrCodeUrl, verificationUrl } = Route.useLoaderData();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const perf = (cert.performance_breakdown ?? {}) as Record<string, number>;
  const areas = Object.keys(AREA_LABELS)
    .filter((k) => typeof perf[k] === "number")
    .map((k) => ({ label: AREA_LABELS[k], score: Math.round(perf[k]) }));
  const competencies = (cert.competencies as string[] | null) ?? [];
  const strengths = (cert.strengths as string[] | null) ?? [];
  const gaps = (cert.development_areas as string[] | null) ?? [];

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-10 print:bg-white print:p-0">
      <article className="mx-auto max-w-[820px] rounded-3xl bg-[#FDFCF8] p-8 shadow-xl md:p-12 print:rounded-none print:p-8 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-[#0B1F3A]/15 pb-6">
          <div className="flex items-center gap-3">
            <img src={atlasMark} alt="Atlas" className="h-10 w-10" />
            <div>
              <div className="font-display text-lg font-semibold text-[#0B1F3A]">Atlas</div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                Workplace Performance Report
              </div>
            </div>
          </div>
          {qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt={`QR code linking to ${verificationUrl}`}
              className="h-20 w-20"
            />
          ) : null}
        </header>

        <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight text-[#0B1F3A]">
          {cert.recipient_name}
        </h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          {cert.programme_name} · in the simulated role of {cert.simulated_role}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-[#0B1F3A]/10 bg-white p-5 text-sm md:grid-cols-3">
          {[
            ["Overall score", `${cert.overall_score}/100`],
            ["Grade", cert.grade],
            ["Project", cert.project_name],
            ["Simulated budget", cert.simulated_budget ?? "—"],
            ["Simulated timeline", cert.simulated_timeline ?? "—"],
            ["Completion date", formatDate(cert.completion_date)],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{k}</dt>
              <dd className="mt-1 font-medium text-[#0B1F3A]">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-[#0B1F3A]">
            Performance by area
          </h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-[#0B1F3A]/15 text-left text-xs uppercase tracking-[0.16em] text-[#6B7280]">
                <th scope="col" className="py-2">Performance area</th>
                <th scope="col" className="py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#0B1F3A]/10 font-semibold text-[#0B1F3A]">
                <td className="py-2.5">Overall performance</td>
                <td className="py-2.5 text-right">{cert.overall_score}/100</td>
              </tr>
              {areas.map((a) => (
                <tr key={a.label} className="border-b border-[#0B1F3A]/10">
                  <td className="py-2.5 text-[#2D2D3F]">{a.label}</td>
                  <td className="py-2.5 text-right font-medium text-[#0B1F3A]">
                    {a.score}/100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {competencies.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-semibold text-[#0B1F3A]">
              Competencies demonstrated
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {competencies.map((c) => (
                <li key={c} className="rounded-xl bg-white px-3 py-2 text-sm text-[#0B1F3A]">
                  {c}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="font-display text-lg font-semibold text-[#0B1F3A]">Strengths</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#2D2D3F]">
              {strengths.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-[#0B1F3A]">
              Development areas
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[#2D2D3F]">
              {gaps.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="mt-10 border-t border-[#0B1F3A]/15 pt-6 text-xs leading-relaxed text-[#6B7280]">
          Verification code {cert.verification_code} · Verify at atlassim.co/verify/
          {cert.verification_code}
          <br />
          This report records performance within an Atlas simulated workplace experience. It
          does not represent employment by Atlas or the simulated organisation.
        </footer>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#0B1F3A] px-5 py-2.5 text-sm font-medium text-white"
          >
            Download / print report
          </button>
          <a
            href={`/verify/${cert.verification_code}`}
            className="rounded-full border border-[#0B1F3A]/20 bg-white px-5 py-2.5 text-sm font-medium text-[#0B1F3A]"
          >
            Public verification page
          </a>
        </div>
      </article>
    </div>
  );
}