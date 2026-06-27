import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import html2canvas from "html2canvas-pro";
import JSZip from "jszip";
import { Camera, Download, Loader2, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Target = { path: string; label: string; slug: string };

const DEFAULT_TARGETS: Target[] = [
  { path: "/app", label: "Dashboard", slug: "dashboard" },
  { path: "/app/inbox", label: "Inbox", slug: "inbox" },
  { path: "/app/tasks", label: "Tasks", slug: "tasks" },
];

async function snapMain(): Promise<Blob> {
  const node =
    (document.querySelector("main") as HTMLElement | null) ??
    (document.body as HTMLElement);
  // Wait a frame so any just-mounted content paints.
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const canvas = await html2canvas(node, {
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
    scale: window.devicePixelRatio > 1 ? 2 : 1,
    useCORS: true,
    logging: false,
  });
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function tsStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function ScreenshotMode() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [busy, setBusy] = useState<null | "single" | "bundle">(null);
  const [hidden, setHidden] = useState(false);

  async function captureCurrent() {
    if (busy) return;
    setBusy("single");
    setHidden(true);
    try {
      // Give the launcher a tick to unmount before capture.
      await new Promise((r) => setTimeout(r, 80));
      const blob = await snapMain();
      const slug = pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "page";
      downloadBlob(blob, `atlas-${slug}-${tsStamp()}.png`);
      toast.success("Screenshot saved");
    } catch (e) {
      console.error(e);
      toast.error("Capture failed");
    } finally {
      setHidden(false);
      setBusy(null);
    }
  }

  async function captureBundle(targets: Target[]) {
    if (busy) return;
    setBusy("bundle");
    setHidden(true);
    const zip = new JSZip();
    const original = pathname;
    try {
      for (const t of targets) {
        await navigate({ to: t.path });
        // Wait for route render + loaders to settle.
        await new Promise((r) => setTimeout(r, 1200));
        const blob = await snapMain();
        zip.file(`${t.slug}.png`, blob);
        toast.message(`Captured ${t.label}`);
      }
      const out = await zip.generateAsync({ type: "blob" });
      downloadBlob(out, `atlas-screenshots-${tsStamp()}.zip`);
      toast.success(`Exported ${targets.length} screenshots`);
      await navigate({ to: original });
    } catch (e) {
      console.error(e);
      toast.error("Bundle capture failed");
    } finally {
      setHidden(false);
      setBusy(null);
    }
  }

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[55] print:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="shadow-md border border-border"
            disabled={!!busy}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {busy === "bundle" ? "Capturing…" : "Capture"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Screenshot mode</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={captureCurrent} disabled={!!busy}>
            <Download className="mr-2 h-4 w-4" />
            Capture this page (PNG)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => captureBundle(DEFAULT_TARGETS)}
            disabled={!!busy}
          >
            <Images className="mr-2 h-4 w-4" />
            Export Dashboard + Inbox + Tasks
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}