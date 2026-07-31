import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Award,
  BadgeCheck,
  Copy,
  Download,
  FileText,
  Linkedin,
  Loader2,
  RefreshCw,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCertificateStatus, issueCertificate } from "@/lib/certificates.functions";
import { AtlasCertificate, formatDate } from "@/components/certificate/atlas-certificate";

function slugName(name: string) {
  return name.trim().replace(/\s+/g, "-");
}

export function CredentialPanel() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getCertificateStatus);
  const issue = useServerFn(issueCertificate);
  const [showCaption, setShowCaption] = useState(false);

  const status = useQuery({
    queryKey: ["certificate-status"],
    queryFn: () => fetchStatus() as Promise<any>,
  });

  const issueMut = useMutation({
    mutationFn: () => issue() as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-status"] });
      toast.success("Certificate issued. Your credential is verifiable.");
    },
    onError: (e) =>
      toast.error(
        e instanceof Error
          ? e.message
          : "We could not generate your certificate right now. Your completion record is safe. Please try again.",
      ),
  });

  if (status.isLoading) {
    return (
      <div className="mt-8 flex items-center gap-2 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparing your credential…
      </div>
    );
  }

  const data = status.data;
  const cert = data?.certificate;

  if (!cert) {
    return (
      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Award className="h-4 w-4" /> Verifiable credential
        </div>
        <h2 className="mt-3 font-display text-2xl font-medium tracking-tight">
          Atlas Certificate of Simulated Workplace Experience
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {data?.eligible
            ? "Issue your certificate to get a one-page A4 credential, a detailed performance report, a unique verification code and a public verification page."
            : (data?.reason ??
              "Your certificate will become available after all required programme activities have been completed.")}
        </p>
        {data?.eligible && (
          <Button
            className="mt-5"
            size="lg"
            onClick={() => issueMut.mutate()}
            disabled={issueMut.isPending}
          >
            {issueMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="mr-2 h-4 w-4" />
            )}
            {issueMut.isPending ? "Issuing…" : "Issue my certificate"}
          </Button>
        )}
        {issueMut.isError && (
          <Button variant="outline" className="mt-3 ml-3" onClick={() => issueMut.mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        )}
      </div>
    );
  }

  const code = cert.verification_code as string;
  const verifyUrl = data.verificationUrl ?? `https://atlassim.co/verify/${code}`;
  const fileName = `Atlas-Certificate-${slugName(cert.recipient_name)}-${slugName(cert.project_name)}-${code}`;
  const caption = `I completed the ${cert.programme_name} in the simulated role of ${cert.simulated_role}.

During the experience, I practised ${(cert.competencies ?? []).slice(0, 4).join(", ") || "stakeholder management, risk and issue management and workplace decision-making"}.

Overall performance: ${cert.grade} — ${cert.overall_score}/100

Verify credential: ${verifyUrl}

#AtlasSim #ProjectManagement #WorkplaceLearning`;
  const xCaption = `I completed the ${cert.programme_name} in the simulated role of ${cert.simulated_role}.\n\nFinal performance: ${cert.grade} — ${cert.overall_score}/100\n\n${verifyUrl}\n\n#AtlasSim`;

  return (
    <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <BadgeCheck className="h-4 w-4 text-emerald-600" /> Verified Atlas credential
      </div>
      <h2 className="mt-3 font-display text-2xl font-medium tracking-tight">
        {cert.grade} — {cert.overall_score}/100
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {cert.programme_name} · simulated role: {cert.simulated_role} · completed{" "}
        {formatDate(cert.completion_date)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Certificate No. {code} · {verifyUrl}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border">
          <AtlasCertificate cert={cert} qrCodeUrl={data.qrCodeUrl} verificationUrl={verifyUrl} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={`/certificate/${code}?print=1`} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" /> Download certificate
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/report/${code}?print=1`} target="_blank" rel="noreferrer">
                <FileText className="mr-2 h-4 w-4" /> Download performance report
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/verify/${code}`} target="_blank" rel="noreferrer">
                <BadgeCheck className="mr-2 h-4 w-4" /> View public credential
              </a>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(caption);
                setShowCaption(true);
                window.open(
                  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`,
                  "_blank",
                  "noopener",
                );
                toast.success("Caption copied — paste it into your LinkedIn post.");
              }}
            >
              <Linkedin className="mr-2 h-4 w-4" /> Share on LinkedIn
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(xCaption)}`,
                  "_blank",
                  "noopener",
                )
              }
            >
              <Twitter className="mr-2 h-4 w-4" /> Share on X
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(verifyUrl);
                toast.success("Verification link copied");
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy verification link
            </Button>
          </div>

          {showCaption && (
            <label className="text-xs text-muted-foreground">
              Edit your caption before posting
              <textarea
                defaultValue={caption}
                rows={8}
                className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground"
              />
            </label>
          )}

          <details className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
            <summary className="cursor-pointer font-medium">
              Add to LinkedIn → Licences &amp; Certifications
            </summary>
            <dl className="mt-3 space-y-1.5 text-muted-foreground">
              <div>
                <dt className="inline font-medium text-foreground">Credential name: </dt>
                <dd className="inline">
                  {cert.project_name} Simulated Workplace Experience
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Issuing organisation: </dt>
                <dd className="inline">Atlas</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Issue date: </dt>
                <dd className="inline">{formatDate(cert.issued_at)}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Credential ID: </dt>
                <dd className="inline">{code}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Credential URL: </dt>
                <dd className="inline">{verifyUrl}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Suggested skills: </dt>
                <dd className="inline">
                  {(cert.competencies ?? []).join(", ") || "Project coordination"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              This is simulated workplace experience — not employment. Suggested file name:{" "}
              {fileName}.pdf
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}