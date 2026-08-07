import atlasMarkAsset from "@/assets/atlas-mark.png.asset.json";
const atlasMark = atlasMarkAsset.url;
import founderSignature from "@/assets/founder-signature.png";

export type CertificateRecord = {
  recipient_name: string;
  simulated_role: string;
  programme_name: string;
  project_name: string;
  simulated_budget?: string | null;
  simulated_timeline?: string | null;
  completion_date: string;
  issued_at?: string | null;
  overall_score: number;
  grade: string;
  competencies?: string[] | null;
  verification_code: string;
  certificate_status?: string;
};

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * A4 portrait credential. Presentation only — every value is issued server-side.
 */
export function AtlasCertificate({
  cert,
  qrCodeUrl,
  verificationUrl,
}: {
  cert: CertificateRecord;
  qrCodeUrl?: string | null;
  verificationUrl: string;
}) {
  const competencies = (cert.competencies ?? []).filter(Boolean);
  const isDistinction = cert.grade === "Distinction";

  return (
    <div
      className="atlas-cert relative mx-auto flex w-full flex-col overflow-hidden bg-[#FDFCF8] text-[#2D2D3F] shadow-2xl print:shadow-none"
      style={{ aspectRatio: "1 / 1.4142", containerType: "inline-size" }}
      role="img"
      aria-label={`Atlas Certificate of Simulated Workplace Experience for ${cert.recipient_name}, ${cert.programme_name}, in the simulated role of ${cert.simulated_role}. Overall performance ${cert.grade}, ${cert.overall_score} out of 100. Verification code ${cert.verification_code}.`}
    >
      {/* Borders */}
      <div className="pointer-events-none absolute inset-0 border-[6px] border-[#0B1F3A]" />
      <div className="pointer-events-none absolute inset-[14px] border border-[#C9A84C]" />
      {[
        "left-[14px] top-[14px] border-l-2 border-t-2",
        "right-[14px] top-[14px] border-r-2 border-t-2",
        "left-[14px] bottom-[14px] border-b-2 border-l-2",
        "right-[14px] bottom-[14px] border-b-2 border-r-2",
      ].map((pos) => (
        <div
          key={pos}
          className={`pointer-events-none absolute h-[5%] w-[7%] border-[#C9A84C] ${pos}`}
        />
      ))}

      {/* Watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035]">
        <img src={atlasMark} alt="" className="w-[55%]" />
      </div>

      <div
        className="relative flex h-full flex-col px-[8%] py-[6%]"
        style={{ fontSize: "1.9cqw" }}
      >
        {/* Header */}
        <header className="flex flex-col items-center text-center">
          <img src={atlasMark} alt="Atlas" className="h-[6cqw] w-auto" />
          <div className="mt-[1.5cqw] font-display text-[1.6cqw] font-semibold uppercase tracking-[0.5em] text-[#0B1F3A]">
            Atlas
          </div>
          <h1 className="mt-[2cqw] font-display text-[3.1cqw] font-medium uppercase leading-tight tracking-[0.14em] text-[#0B1F3A]">
            Certificate of Simulated
            <br />
            Workplace Experience
          </h1>
          <div className="mt-[1cqw] text-[1.25cqw] uppercase tracking-[0.24em] text-[#6B7280]">
            Certificate of Achievement
          </div>
          <div className="mt-[1.2cqw] h-[2px] w-[18%] bg-[#C9A84C]" />
          <div className="mt-[1.2cqw] text-[1.15cqw] uppercase tracking-[0.2em] text-[#6B7280]">
            Certificate No. {cert.verification_code}
          </div>
        </header>

        {/* Recipient */}
        <section className="mt-[3.5cqw] text-center">
          <div className="text-[1.25cqw] uppercase tracking-[0.28em] text-[#6B7280]">
            This is to certify that
          </div>
          <div className="mt-[1.5cqw] font-display text-[4.6cqw] font-semibold leading-none tracking-tight text-[#0B1F3A]">
            {cert.recipient_name}
          </div>
          <div className="mt-[2cqw] text-[1.35cqw] text-[#6B7280]">
            has successfully completed the
          </div>
          <div className="mt-[0.8cqw] font-display text-[2.5cqw] font-medium uppercase tracking-[0.06em] text-[#0B1F3A]">
            {cert.programme_name}
          </div>
          <div className="mt-[1.6cqw] text-[1.35cqw] text-[#6B7280]">
            in the simulated role of
          </div>
          <div className="mt-[0.6cqw] inline-block border-y border-[#C9A84C] px-[2cqw] py-[0.7cqw] font-display text-[2.2cqw] font-semibold uppercase tracking-[0.18em] text-[#0B1F3A]">
            {cert.simulated_role}
          </div>
        </section>

        {/* Performance */}
        <section className="mt-[3cqw] text-center">
          <div className="text-[1.15cqw] uppercase tracking-[0.28em] text-[#6B7280]">
            Overall performance
          </div>
          <div
            className={`mt-[0.9cqw] inline-flex items-baseline gap-[1cqw] rounded-full px-[2.4cqw] py-[0.9cqw] font-display text-[2.1cqw] font-semibold uppercase tracking-[0.14em] ${
              isDistinction
                ? "bg-[#0B1F3A] text-[#FDFCF8] ring-2 ring-[#C9A84C]"
                : "bg-[#0B1F3A] text-[#FDFCF8]"
            }`}
          >
            <span>{cert.grade}</span>
            <span className="text-[1.5cqw] font-normal tracking-normal">
              {cert.overall_score}/100
            </span>
          </div>
          <div className="mt-[0.9cqw] text-[1.05cqw] text-[#6B7280]">
            Pass: 60–74 &nbsp;|&nbsp; Merit: 75–84 &nbsp;|&nbsp; Distinction: 85–100
          </div>
        </section>

        {/* Programme details */}
        <section className="mt-[2.6cqw] grid grid-cols-2 gap-x-[4cqw] gap-y-[1cqw] border-y border-[#0B1F3A]/15 py-[1.8cqw] text-[1.2cqw]">
          {[
            ["Simulated Role", cert.simulated_role],
            ["Project", cert.project_name],
            ["Simulated Budget", cert.simulated_budget ?? "—"],
            ["Simulated Timeline", cert.simulated_timeline ?? "—"],
            ["Completion Date", formatDate(cert.completion_date)],
            ["Overall Score", `${cert.overall_score}/100`],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-baseline justify-between gap-[1cqw]">
              <span className="uppercase tracking-[0.16em] text-[#6B7280]">{label}</span>
              <span className="text-right font-medium text-[#0B1F3A]">{value}</span>
            </div>
          ))}
        </section>

        {/* Competencies */}
        {competencies.length > 0 && (
          <section className="mt-[2.2cqw] text-center">
            <div className="text-[1.1cqw] uppercase tracking-[0.28em] text-[#6B7280]">
              Competencies demonstrated
            </div>
            <div className="mx-auto mt-[1cqw] max-w-[85%] text-[1.35cqw] font-medium leading-relaxed text-[#0B1F3A]">
              {competencies.join(" · ")}
            </div>
          </section>
        )}

        <p className="mx-auto mt-[2.2cqw] max-w-[86%] text-center text-[1.1cqw] leading-relaxed text-[#6B7280]">
          This credential confirms that the recipient completed a structured Atlas
          simulated workplace experience and demonstrated practical capability across
          the competencies listed above. It records simulated experience and does not
          represent employment.
        </p>

        {/* Signature + verification */}
        <footer className="mt-auto flex items-end justify-between gap-[3cqw] pt-[2.5cqw]">
          <div className="flex-1">
            <img
              src={founderSignature}
              alt="Signature of Dolapo Rasaq"
              className="mb-[0.3cqw] h-[4.5cqw] w-auto object-contain object-left"
              style={{ filter: "brightness(0.45) contrast(1.35) saturate(0.85)" }}
            />
            <div className="w-[70%] border-t border-[#0B1F3A]" />
            <div className="mt-[0.6cqw] text-[1.3cqw] font-semibold text-[#0B1F3A]">
              Dolapo Rasaq
            </div>
            <div className="text-[1.05cqw] text-[#6B7280]">Founder, Atlas</div>
            <div className="text-[1.05cqw] text-[#6B7280]">
              Issued by Atlassim Technologies Limited · {formatDate(cert.issued_at ?? cert.completion_date)}
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-[7cqw] w-[7cqw] flex-col items-center justify-center rounded-full border-2 border-[#C9A84C] text-[0.75cqw] font-semibold uppercase leading-tight tracking-[0.12em] text-[#0B1F3A]">
              Verified
              <br />
              Atlas
              <br />
              Credential
            </div>
          </div>

          <div className="flex flex-1 flex-col items-end text-right">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt={`QR code linking to ${verificationUrl}`}
                className="h-[7cqw] w-[7cqw]"
              />
            ) : null}
            <div className="mt-[0.6cqw] text-[1cqw] leading-relaxed text-[#6B7280]">
              Verification Code
              <br />
              <span className="font-medium text-[#0B1F3A]">{cert.verification_code}</span>
              <br />
              Verify at{" "}
              <span className="break-all font-medium text-[#0B1F3A]">
                atlassim.co/verify/{cert.verification_code}
              </span>
            </div>
          </div>
        </footer>

        <div className="mt-[1.6cqw] border-t border-[#0B1F3A]/10 pt-[1.2cqw] text-center text-[1cqw] text-[#6B7280]">
          <span className="font-semibold uppercase tracking-[0.3em] text-[#0B1F3A]">
            Atlas
          </span>
          <span className="mx-[1cqw]">AI-powered simulated workplace environment</span>
          <span className="font-medium text-[#0B1F3A]">atlassim.co</span>
          <div className="mt-[0.4cqw] italic">Practise before the pressure is real.</div>
        </div>
      </div>
    </div>
  );
}