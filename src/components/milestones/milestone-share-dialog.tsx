import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Linkedin, Copy, Download, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Milestone } from "@/lib/milestones.functions";
import { milestoneCaption } from "@/lib/milestone-copy";
import { MilestoneCard } from "./milestone-card";

const SHARE_URL = "https://atlassim.co";

export function MilestoneShareDialog({
  milestone,
  learnerName,
  simulatedRole,
  projectName,
  open,
  onOpenChange,
}: {
  milestone: Milestone | null;
  learnerName: string;
  simulatedRole: string;
  projectName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const initial = useMemo(
    () => (milestone ? milestoneCaption(milestone, projectName) : ""),
    [milestone, projectName],
  );
  const [caption, setCaption] = useState(initial);
  const [busy, setBusy] = useState(false);

  // Reset the caption when a different milestone is opened, but keep the
  // learner's edits while they stay on the same one.
  useEffect(() => {
    setCaption(initial);
  }, [milestone?.id, initial]);

  if (!milestone) return null;

  const renderImage = async (): Promise<Blob | null> => {
    const el = cardRef.current;
    if (!el) return null;
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  };

  const download = async (silent = false) => {
    setBusy(true);
    try {
      const blob = await renderImage();
      if (!blob) throw new Error("Could not render the card");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlas-milestone-${milestone.id.replace(/[^a-z0-9]+/gi, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Download failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(`${caption}\n\n${SHARE_URL}`);
    toast.success("Share text copied.");
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copy();
      return;
    }
    setBusy(true);
    try {
      const blob = await renderImage();
      const files =
        blob && (navigator as any).canShare?.({ files: [new File([blob], "milestone.png", { type: "image/png" })] })
          ? [new File([blob], "atlas-milestone.png", { type: "image/png" })]
          : undefined;
      await navigator.share({ title: milestone.title, text: caption, url: SHARE_URL, ...(files ? { files } : {}) });
    } catch {
      /* the learner cancelled */
    } finally {
      setBusy(false);
    }
  };

  const openLinkedIn = async () => {
    // LinkedIn cannot accept an uploaded image through a share URL, so we hand
    // the learner both pieces: the card saved to their device and the caption on
    // the clipboard, then open the LinkedIn composer for them to attach it.
    const saved = await download(true);
    await navigator.clipboard.writeText(`${caption}\n\n${SHARE_URL}`).catch(() => {});
    toast.success(
      saved
        ? "Card saved and caption copied — paste the caption, then attach the image."
        : "Caption copied — paste it into your post.",
    );
    window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank", "noopener");
  };

  const openX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(SHARE_URL)}`,
      "_blank",
      "noopener",
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Share milestone</DialogTitle>
          <DialogDescription>
            This is exactly the card that gets shared. LinkedIn won&rsquo;t accept an image from a
            link, so choosing LinkedIn saves the card to your device, copies your caption, and opens
            the composer — paste the caption and attach the image.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-[var(--shadow-soft-lift)]">
          <MilestoneCard
            ref={cardRef}
            milestone={milestone}
            learnerName={learnerName}
            simulatedRole={simulatedRole}
            projectName={projectName}
          />
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="milestone-caption" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Your caption
          </label>
          <Textarea
            id="milestone-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={9}
            className="text-sm leading-relaxed"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={openLinkedIn}>
            <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
          </Button>
          <Button variant="outline" onClick={openX}>
            <span className="mr-2 font-semibold">X</span> Post
          </Button>
          <Button variant="outline" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" /> Copy text
          </Button>
          <Button variant="outline" onClick={() => download()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download image
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button variant="ghost" onClick={nativeShare} disabled={busy}>
              <Share2 className="mr-2 h-4 w-4" /> More
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}