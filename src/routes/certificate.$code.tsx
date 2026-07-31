import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPublicCredential } from "@/lib/certificates.functions";
import { AtlasCertificate } from "@/components/certificate/atlas-certificate";

export const Route = createFileRoute("/certificate/$code")({
  loader: async ({ params }) => {
    const res = await getPublicCredential({ data: { code: params.code } });
    if (!res.found) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const c = loaderData?.certificate;
    const title = `Atlas Certificate · ${c?.recipient_name ?? "Credential"}`;
    const description = `${c?.recipient_name ?? "An Atlas learner"} completed ${c?.programme_name ?? "an Atlas programme"} in the simulated role of ${c?.simulated_role ?? "Project Coordinator"} — ${c?.grade ?? "Pass"}, ${c?.overall_score ?? 0}/100.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
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
      Couldn't load this credential right now. Please try again.
    </div>
  ),
  component: CertificatePage,
});

function CertificatePage() {
  const { certificate, qrCodeUrl, verificationUrl } = Route.useLoaderData();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-[850px] print:max-w-none">
        <div className="print-sheet">
          <AtlasCertificate
            cert={certificate as any}
            qrCodeUrl={qrCodeUrl}
            verificationUrl={verificationUrl!}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[#0B1F3A] px-5 py-2 font-medium text-white hover:opacity-90"
          >
            Download / print A4 PDF
          </button>
          <a
            href={`/verify/${certificate.verification_code}`}
            className="rounded-full border border-neutral-300 bg-white px-5 py-2 font-medium text-neutral-700 hover:border-neutral-400"
          >
            Public verification page
          </a>
          <a
            href={`/report/${certificate.verification_code}`}
            className="rounded-full border border-neutral-300 bg-white px-5 py-2 font-medium text-neutral-700 hover:border-neutral-400"
          >
            Performance report
          </a>
        </div>
      </div>
    </div>
  );
}