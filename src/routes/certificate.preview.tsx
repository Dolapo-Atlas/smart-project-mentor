import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AtlasCertificate, type CertificateRecord } from "@/components/certificate/atlas-certificate";

function verificationUrl(code: string) {
  return `https://atlassim.co/verify/${code}`;
}

const SAMPLE_CERT: CertificateRecord = {
  recipient_name: "Dolapo Rasaq",
  simulated_role: "Project Coordinator",
  programme_name: "Atlas Digital Care Records Programme",
  project_name: "Digital Care Records Rollout",
  simulated_budget: "£1,200,000",
  simulated_timeline: "12 weeks",
  completion_date: "2026-07-31",
  issued_at: "2026-07-31",
  overall_score: 88,
  grade: "Distinction",
  competencies: [
    "Project Charter Creation",
    "Stakeholder Management",
    "RAID Log Development",
    "Risk and Issue Management",
    "Project Scheduling",
    "Scope & Change Control",
    "Project Reporting & Governance",
    "Budget Awareness",
  ],
  verification_code: "ATLAS-2026-A7F3K9D2M4",
  certificate_status: "valid",
};

const SAMPLE_QR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23FDFCF8'/%3E%3Cpath d='M20 20h20v20H20zm25 0h5v5h-5zm10 0h5v5h-5zm10 0h20v20H65zM20 45h5v5h-5zm10 0h5v5h-5zm15 0h5v5h-5zm10 0h5v5h-5zm15 0h5v5h-5zm10 0h5v5h-5zM20 55h15v15H20zm25 0h5v5h-5zm10 0h5v5h-5zm10 0h20v20H65zM20 80h5v5h-5zm10 0h5v5h-5zm15 0h5v5h-5zm10 0h5v5h-5zm15 0h5v5h-5zm10 0h5v5h-5z' fill='%230B1F3A'/%3E%3C/svg%3E";

export const Route = createFileRoute("/certificate/preview")({
  head: () => ({
    meta: [
      { title: "Atlas Certificate Preview · Dolapo Rasaq" },
      { name: "description", content: "Preview of the Atlas Certificate of Simulated Workplace Experience for Dolapo Rasaq." },
      { property: "og:title", content: "Atlas Certificate Preview · Dolapo Rasaq" },
      { property: "og:description", content: "Preview of the Atlas Certificate of Simulated Workplace Experience for Dolapo Rasaq." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificatePreviewPage,
});

function CertificatePreviewPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-[850px] print:max-w-none">
        <div className="print-sheet">
          <AtlasCertificate
            cert={SAMPLE_CERT}
            qrCodeUrl={SAMPLE_QR}
            verificationUrl={verificationUrl(SAMPLE_CERT.verification_code)}
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
          <span className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2 font-medium text-amber-900">
            Preview only — verification code is not live
          </span>
        </div>
      </div>
    </div>
  );
}
