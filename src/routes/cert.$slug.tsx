import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPublicCertificate } from "@/lib/outcomes.functions";

export const Route = createFileRoute("/cert/$slug")({
  loader: async ({ params }) => {
    const row = await getPublicCertificate({ data: { slug: params.slug } });
    if (!row) throw notFound();
    return row;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Atlas Certificate · ${loaderData?.user_display_name ?? "Coordinator"}` },
      {
        name: "description",
        content: `${loaderData?.user_display_name ?? "An Atlas coordinator"} completed ${loaderData?.template_title ?? "an Atlas simulation"} with grade ${loaderData?.grade ?? "Pass"}.`,
      },
      { property: "og:title", content: `Atlas Certificate · ${loaderData?.grade ?? "Pass"}` },
      {
        property: "og:description",
        content: `${loaderData?.user_display_name ?? "An Atlas coordinator"} completed ${loaderData?.template_title ?? "an Atlas simulation"} on Atlas.`,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Certificate not found.
    </div>
  ),
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Couldn't load certificate.
    </div>
  ),
  component: Certificate,
});

function Certificate() {
  const cert = Route.useLoaderData();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      setTimeout(() => window.print(), 600);
    }
  }, []);

  const completed = new Date(cert.completed_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-neutral-100 px-6 py-12 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="relative aspect-[1.414/1] w-full overflow-hidden rounded-3xl border-[14px] border-double border-amber-200 bg-white p-12 shadow-2xl print:rounded-none print:border-amber-400 print:shadow-none">
          {/* Watermark */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
            <div className="font-display text-[14rem] font-black tracking-tighter">ATLAS</div>
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between text-xs uppercase tracking-[0.3em] text-neutral-500">
            <span>Atlas · Certificate of Completion</span>
            <span>No. {cert.share_slug.toUpperCase()}</span>
          </div>

          {/* Body */}
          <div className="relative mt-12 text-center">
            <div className="text-sm uppercase tracking-[0.24em] text-neutral-500">
              This is to certify that
            </div>
            <div className="mt-6 font-display text-5xl font-medium tracking-tight text-neutral-900 md:text-6xl">
              {cert.user_display_name ?? "Atlas Coordinator"}
            </div>
            <div className="mt-2 text-sm text-neutral-500">acting as {cert.user_role}</div>

            <div className="mt-10 text-base text-neutral-600">
              has successfully completed the simulation
            </div>
            <div className="mt-2 font-display text-3xl font-medium text-neutral-900">
              {cert.template_title}
            </div>

            <div className="mt-10 inline-flex flex-col items-center gap-1">
              <div className="text-xs uppercase tracking-[0.24em] text-neutral-500">
                Final grade
              </div>
              <div className="rounded-full bg-neutral-900 px-6 py-2 font-display text-2xl font-medium text-white">
                {cert.grade}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                Score: {cert.score}/100
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative absolute bottom-12 left-12 right-12 mt-12 flex items-end justify-between text-xs text-neutral-500">
            <div>
              <div className="font-display text-lg font-medium text-neutral-900">Atlas</div>
              <div className="mt-0.5">atlassim.co</div>
            </div>
            <div className="text-right">
              <div className="font-medium text-neutral-900">Completed</div>
              <div>{completed}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-neutral-600 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:border-neutral-400"
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href.split("?")[0]);
            }}
            className="rounded-full border border-neutral-300 bg-white px-4 py-2 font-medium text-neutral-700 hover:border-neutral-400"
          >
            Copy share link
          </button>
          <a
            href="https://atlassim.co"
            className="rounded-full bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800"
          >
            Try Atlas yourself →
          </a>
        </div>
      </div>
    </div>
  );
}