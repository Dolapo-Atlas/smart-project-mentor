import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicCredential } from "@/lib/certificates.functions";
import { AtlasCertificate, formatDate } from "@/components/certificate/atlas-certificate";
import atlasMarkAsset from "@/assets/atlas-mark.png.asset.json";
const atlasMark = atlasMarkAsset.url;
import { BadgeCheck, ShieldAlert, ShieldX, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/verify/$code")({
  loader: async ({ params }) => getPublicCredential({ data: { code: params.code } }),
  head: ({ loaderData, params }) => {
    const c = loaderData?.found ? loaderData.certificate : null;
    const title = c
      ? `Verified: ${c.recipient_name} · Atlas Credential`
      : "Verify an Atlas credential";
    const description = c
      ? `${c.recipient_name} completed ${c.programme_name} in the simulated role of ${c.simulated_role}. Performance: ${c.grade} — ${c.overall_score}/100. Credential ${params.code}.`
      : "Check the authenticity of an Atlas simulated workplace experience credential.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => <VerifyShell><NotFoundState /></VerifyShell>,
  component: VerifyPage,
});

function VerifyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      <header className="border-b border-[#0B1F3A]/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <img src={atlasMark} alt="Atlas" className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight text-[#0B1F3A]">
              Atlas
            </span>
          </a>
          <span className="text-xs uppercase tracking-[0.24em] text-[#6B7280]">
            Credential verification
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      <footer className="border-t border-[#0B1F3A]/10 px-6 py-8 text-center text-sm text-[#6B7280]">
        Atlassim Technologies Limited (Atlas) · AI-powered simulated workplace environment ·{" "}
        <a className="font-medium text-[#0B1F3A]" href="https://atlassim.co">
          atlassim.co
        </a>
      </footer>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="rounded-3xl border border-[#0B1F3A]/10 bg-white p-8 text-center shadow-sm">
      <ShieldX className="mx-auto h-10 w-10 text-rose-600" aria-hidden />
      <h1 className="mt-4 font-display text-2xl font-semibold text-[#0B1F3A]">
        Credential not verified
      </h1>
      <p className="mt-2 text-sm text-[#6B7280]">
        We could not verify this Atlas credential. Check the code and try again.
      </p>
      <a
        href="https://atlassim.co"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0B1F3A] px-5 py-2.5 text-sm font-medium text-white"
      >
        Explore Atlas <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function VerifyPage() {
  const data = Route.useLoaderData();

  if (!data.found) {
    return (
      <VerifyShell>
        <NotFoundState />
      </VerifyShell>
    );
  }

  const cert = data.certificate;
  const status = cert.certificate_status ?? "valid";
  const competencies = (cert.competencies as string[] | null) ?? [];

  return (
    <VerifyShell>
      {/* Status banner */}
      {status === "valid" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <BadgeCheck className="mt-0.5 h-6 w-6 text-emerald-700" aria-hidden />
          <div>
            <div className="font-semibold text-emerald-800">Verified credential</div>
            <p className="text-sm text-emerald-800/80">
              This Atlas credential is valid and was issued by Atlas.
            </p>
          </div>
        </div>
      ) : status === "superseded" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-6 w-6 text-amber-700" aria-hidden />
          <div>
            <div className="font-semibold text-amber-800">
              A newer version of this credential has been issued.
            </div>
            {data.supersededByCode && (
              <a
                className="text-sm font-medium underline"
                href={`/verify/${data.supersededByCode}`}
              >
                View the current version
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <ShieldX className="mt-0.5 h-6 w-6 text-rose-700" aria-hidden />
          <div>
            <div className="font-semibold text-rose-800">
              This credential is no longer valid.
            </div>
            <p className="text-sm text-rose-800/80">Status: {status}</p>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#0B1F3A] md:text-4xl">
            {cert.recipient_name}
          </h1>
          <p className="mt-2 text-[#6B7280]">
            completed <span className="font-medium text-[#0B1F3A]">{cert.programme_name}</span>{" "}
            in the simulated role of{" "}
            <span className="font-medium text-[#0B1F3A]">{cert.simulated_role}</span>
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-[#0B1F3A]/10 bg-white p-5 text-sm">
            {[
              ["Overall performance", `${cert.grade} — ${cert.overall_score}/100`],
              ["Project", cert.project_name],
              ["Completion date", formatDate(cert.completion_date)],
              ["Issue date", formatDate(cert.issued_at)],
              ["Certificate ID", cert.verification_code],
              ["Issuing organisation", "Atlas"],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{k}</dt>
                <dd className="mt-1 font-medium text-[#0B1F3A]">{v}</dd>
              </div>
            ))}
          </dl>

          {competencies.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                Competencies demonstrated
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {competencies.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-[#0B1F3A]/15 bg-white px-3 py-1.5 text-sm text-[#0B1F3A]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-6 rounded-2xl bg-[#0B1F3A]/[0.04] p-4 text-sm leading-relaxed text-[#2D2D3F]">
            This credential confirms completion and performance within an Atlas simulated
            workplace experience, issued by Atlassim Technologies Limited. It does not
            represent employment by Atlassim Technologies Limited or the simulated organisation.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/certificate/${cert.verification_code}`}
              className="rounded-full bg-[#0B1F3A] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              View & download certificate
            </a>
            <a
              href={`/report/${cert.verification_code}`}
              className="rounded-full border border-[#0B1F3A]/20 bg-white px-5 py-2.5 text-sm font-medium text-[#0B1F3A]"
            >
              Performance report
            </a>
            <Link
              to="/"
              className="rounded-full px-5 py-2.5 text-sm font-medium text-[#0B1F3A] underline"
            >
              What is Atlas?
            </Link>
          </div>
        </div>

        <aside>
          <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
            Certificate preview
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#0B1F3A]/10">
            <AtlasCertificate
              cert={cert as any}
              qrCodeUrl={data.qrCodeUrl}
              verificationUrl={data.verificationUrl!}
            />
          </div>
        </aside>
      </div>
    </VerifyShell>
  );
}