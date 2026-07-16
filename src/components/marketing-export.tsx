import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import html2canvas from "html2canvas-pro";
import JSZip from "jszip";
import {
  Camera,
  Download,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Layers,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ----------------------------- types & presets ----------------------------- */

type AspectKey = "native" | "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
const ASPECTS: { key: AspectKey; label: string; ratio: number | null }[] = [
  { key: "native", label: "Native", ratio: null },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "3:4", label: "3:4", ratio: 3 / 4 },
  { key: "9:16", label: "9:16", ratio: 9 / 16 },
];

type VariantKey = "white" | "gradient" | "transparent" | "macbook" | "ipad" | "iphone";
const VARIANTS: { key: VariantKey; label: string; kind: "bg" | "device" }[] = [
  { key: "white", label: "White", kind: "bg" },
  { key: "gradient", label: "Atlas gradient", kind: "bg" },
  { key: "transparent", label: "Transparent", kind: "bg" },
  { key: "macbook", label: "MacBook", kind: "device" },
  { key: "ipad", label: "iPad", kind: "device" },
  { key: "iphone", label: "iPhone", kind: "device" },
];

type Target = { path: string; label: string; slug: string };
const ALL_TARGETS: Target[] = [
  { path: "/app", label: "Dashboard", slug: "dashboard" },
  { path: "/app/inbox", label: "Inbox", slug: "inbox" },
  { path: "/app/tasks", label: "Tasks", slug: "tasks" },
  { path: "/app/completed", label: "Completed", slug: "completed" },
  { path: "/app/comms", label: "Comms", slug: "comms" },
  { path: "/app/meetings", label: "Meetings", slug: "meetings" },
  { path: "/app/stakeholders", label: "Stakeholders", slug: "stakeholders" },
  { path: "/app/documents", label: "Documents", slug: "documents" },
  { path: "/app/reports", label: "Reports", slug: "reports" },
  { path: "/app/budget", label: "Budget", slug: "budget" },
  { path: "/app/changes", label: "Changes", slug: "changes" },
  { path: "/app/gates", label: "Gates", slug: "gates" },
  { path: "/app/raid", label: "RAID Log", slug: "raid" },
  { path: "/app/health", label: "Project Health", slug: "health" },
  { path: "/app/learning", label: "Learning", slug: "learning" },
];

/* --------------------------------- helpers --------------------------------- */

function tsStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
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

function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Deliver a file to the user reliably across browsers:
 * - On mobile (where multi-download is blocked & .png often opens inline),
 *   try the native Share sheet first so the file can be saved to Files/Photos.
 * - Otherwise fall back to a standard anchor download.
 */
async function deliverFile(blob: Blob, filename: string) {
  try {
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
      share?: (d: { files: File[]; title?: string }) => Promise<void>;
    };
    if (isMobile() && nav.share && nav.canShare) {
      const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename });
        return;
      }
    }
  } catch {
    // user cancelled or share failed — fall through to download
  }
  downloadBlob(blob, filename);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

/** Inject styles that hide chrome and force a clean marketing look while capturing. */
function applyMarketingMode(enabled: boolean): () => void {
  if (!enabled) return () => {};
  const css = `
    [data-marketing-hide], .marketing-hide,
    [data-tour="trigger"], [data-screenshot-launcher] { visibility: hidden !important; }
    body, html { cursor: none !important; }
    ::-webkit-scrollbar { display: none !important; }
    * { scrollbar-width: none !important; }
    main { box-shadow: none !important; }
  `;
  const style = document.createElement("style");
  style.setAttribute("data-marketing-mode", "true");
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
  return () => style.remove();
}

async function snapMain(): Promise<HTMLCanvasElement> {
  const node =
    (document.querySelector("main") as HTMLElement | null) ??
    (document.body as HTMLElement);
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  return html2canvas(node, {
    backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
    scale: Math.min(window.devicePixelRatio > 1 ? 2.5 : 2, 2.5),
    useCORS: true,
    logging: false,
  });
}

/* ---------------------------- composition layer ---------------------------- */

function paintGradient(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Atlas warm gradient (cream → amber wash).
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#fbf7f0");
  g.addColorStop(0.55, "#f6e6c8");
  g.addColorStop(1, "#e8c79a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Soft radial highlight
  const r = ctx.createRadialGradient(w * 0.25, h * 0.2, 0, w * 0.25, h * 0.2, Math.max(w, h) * 0.7);
  r.addColorStop(0, "rgba(255,255,255,0.55)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  ctx.shadowColor = "rgba(20,15,10,0.28)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 30;
  ctx.fillStyle = "rgba(0,0,0,0.001)";
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

function drawClipped(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(src, x, y, w, h);
  ctx.restore();
}

/** Compose a captured screenshot inside the chosen variant + aspect frame. */
function compose(
  src: HTMLCanvasElement,
  variant: VariantKey,
  aspect: AspectKey,
): HTMLCanvasElement {
  const aspectRatio = ASPECTS.find((a) => a.key === aspect)?.ratio ?? null;

  // Decide canvas dimensions.
  let cw: number, ch: number;
  const sw = src.width;
  const sh = src.height;
  if (aspectRatio == null) {
    // Native: pad slightly around the source.
    const pad = Math.round(sw * 0.06);
    cw = sw + pad * 2;
    ch = sh + pad * 2;
  } else {
    // Fit source into a frame with the given aspect ratio.
    const longest = Math.max(sw, sh);
    const baseW = Math.max(1600, longest);
    if (aspectRatio >= 1) {
      cw = baseW;
      ch = Math.round(cw / aspectRatio);
    } else {
      ch = baseW;
      cw = Math.round(ch * aspectRatio);
    }
  }

  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const ctx = out.getContext("2d")!;

  // Background
  if (variant === "transparent") {
    // leave alpha 0
  } else if (variant === "white" || variant === "macbook" || variant === "ipad" || variant === "iphone") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
    if (variant !== "white") paintGradient(ctx, cw, ch);
  } else if (variant === "gradient") {
    paintGradient(ctx, cw, ch);
  }

  // Device specifics
  if (variant === "macbook") {
    drawMacBook(ctx, src, cw, ch);
    return out;
  }
  if (variant === "ipad") {
    drawTablet(ctx, src, cw, ch);
    return out;
  }
  if (variant === "iphone") {
    drawPhone(ctx, src, cw, ch);
    return out;
  }

  // Plain bg variants — place screenshot centered with subtle shadow + rounded corners.
  const padX = Math.round(cw * 0.06);
  const padY = Math.round(ch * 0.08);
  const maxW = cw - padX * 2;
  const maxH = ch - padY * 2;
  const scale = Math.min(maxW / sw, maxH / sh);
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);
  const dx = Math.round((cw - dw) / 2);
  const dy = Math.round((ch - dh) / 2);
  const radius = Math.round(Math.min(dw, dh) * 0.018);
  if (variant !== "transparent") drawShadow(ctx, dx, dy, dw, dh, radius);
  drawClipped(ctx, src, dx, dy, dw, dh, radius);
  return out;
}

/* --------------------------- device frame drawing -------------------------- */

function drawMacBook(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, cw: number, ch: number) {
  // Frame proportions inspired by Linear/Stripe marketing mockups.
  const frameW = Math.round(cw * 0.82);
  const aspect = 16 / 10;
  const frameH = Math.round(frameW / aspect);
  const fx = Math.round((cw - frameW) / 2);
  const fy = Math.round((ch - frameH) / 2 - ch * 0.02);
  const bezel = Math.round(frameW * 0.018);
  const radius = Math.round(frameW * 0.018);

  // Bezel
  drawShadow(ctx, fx, fy, frameW, frameH, radius);
  ctx.fillStyle = "#1c1917";
  roundRectPath(ctx, fx, fy, frameW, frameH, radius);
  ctx.fill();
  // Camera dot
  ctx.fillStyle = "#3f3f46";
  ctx.beginPath();
  ctx.arc(fx + frameW / 2, fy + bezel / 2, Math.max(2, bezel * 0.18), 0, Math.PI * 2);
  ctx.fill();
  // Screen
  const sx = fx + bezel;
  const sy = fy + bezel;
  const sw = frameW - bezel * 2;
  const sh = frameH - bezel * 2;
  drawClipped(ctx, src, sx, sy, sw, sh, Math.max(2, radius - 4));

  // Base / hinge
  const baseW = Math.round(frameW * 1.08);
  const baseH = Math.round(frameH * 0.035);
  const baseX = Math.round((cw - baseW) / 2);
  const baseY = fy + frameH;
  ctx.fillStyle = "#d6d3d1";
  roundRectPath(ctx, baseX, baseY, baseW, baseH, baseH / 2);
  ctx.fill();
  // Notch
  const notchW = Math.round(baseW * 0.18);
  const notchH = Math.round(baseH * 0.6);
  ctx.fillStyle = "#a8a29e";
  roundRectPath(
    ctx,
    Math.round((cw - notchW) / 2),
    baseY + Math.round(baseH * 0.1),
    notchW,
    notchH,
    notchH / 2,
  );
  ctx.fill();
}

function drawTablet(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, cw: number, ch: number) {
  const isLandscape = cw >= ch;
  const aspect = isLandscape ? 4 / 3 : 3 / 4;
  const frameW = isLandscape ? Math.round(cw * 0.78) : Math.round(ch * 0.78 * aspect);
  const frameH = Math.round(frameW / aspect);
  const fx = Math.round((cw - frameW) / 2);
  const fy = Math.round((ch - frameH) / 2);
  const bezel = Math.round(Math.min(frameW, frameH) * 0.03);
  const radius = Math.round(Math.min(frameW, frameH) * 0.04);

  drawShadow(ctx, fx, fy, frameW, frameH, radius);
  ctx.fillStyle = "#0f0f10";
  roundRectPath(ctx, fx, fy, frameW, frameH, radius);
  ctx.fill();
  const sx = fx + bezel;
  const sy = fy + bezel;
  const sw = frameW - bezel * 2;
  const sh = frameH - bezel * 2;
  drawClipped(ctx, src, sx, sy, sw, sh, Math.max(2, radius - 8));
}

function drawPhone(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, cw: number, ch: number) {
  const aspect = 9 / 19.5;
  let frameH = Math.round(ch * 0.86);
  let frameW = Math.round(frameH * aspect);
  if (frameW > cw * 0.6) {
    frameW = Math.round(cw * 0.6);
    frameH = Math.round(frameW / aspect);
  }
  const fx = Math.round((cw - frameW) / 2);
  const fy = Math.round((ch - frameH) / 2);
  const bezel = Math.round(frameW * 0.035);
  const radius = Math.round(frameW * 0.13);

  drawShadow(ctx, fx, fy, frameW, frameH, radius);
  ctx.fillStyle = "#0a0a0a";
  roundRectPath(ctx, fx, fy, frameW, frameH, radius);
  ctx.fill();
  const sx = fx + bezel;
  const sy = fy + bezel;
  const sw = frameW - bezel * 2;
  const sh = frameH - bezel * 2;
  drawClipped(ctx, src, sx, sy, sw, sh, Math.max(2, radius - 10));

  // Dynamic island
  const islandW = Math.round(frameW * 0.32);
  const islandH = Math.round(islandW * 0.28);
  const ix = Math.round((cw - islandW) / 2);
  const iy = fy + Math.round(bezel * 1.4);
  ctx.fillStyle = "#000";
  roundRectPath(ctx, ix, iy, islandW, islandH, islandH / 2);
  ctx.fill();
}

/* --------------------------------- component -------------------------------- */

export function MarketingExport({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  floating = true,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  floating?: boolean;
} = {}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (o: boolean) => {
    if (onOpenChangeProp) onOpenChangeProp(o);
    else setOpenInternal(o);
  };
  const [busy, setBusy] = useState(false);
  const [aspect, setAspect] = useState<AspectKey>("native");
  const [variants, setVariants] = useState<Record<VariantKey, boolean>>({
    white: false,
    gradient: true,
    transparent: false,
    macbook: true,
    ipad: false,
    iphone: false,
  });
  const [marketingMode, setMarketingMode] = useState(true);
  const [hiRes, setHiRes] = useState(true);
  const [targets, setTargets] = useState<Record<string, boolean>>(() => ({
    "/app": true,
    "/app/inbox": true,
    "/app/tasks": true,
  }));

  const selectedVariants = (Object.keys(variants) as VariantKey[]).filter((v) => variants[v]);
  const selectedTargets = ALL_TARGETS.filter((t) => targets[t.path]);

  async function captureOnce(): Promise<HTMLCanvasElement> {
    const cleanup = applyMarketingMode(marketingMode);
    // Let the chrome-hide repaint before capture.
    await new Promise((r) => setTimeout(r, 120));
    try {
      const cnv = await snapMain();
      if (!hiRes) {
        // Downscale to ~1440 width for smaller files.
        const ratio = 1440 / cnv.width;
        if (ratio < 1) {
          const tmp = document.createElement("canvas");
          tmp.width = Math.round(cnv.width * ratio);
          tmp.height = Math.round(cnv.height * ratio);
          tmp.getContext("2d")!.drawImage(cnv, 0, 0, tmp.width, tmp.height);
          return tmp;
        }
      }
      return cnv;
    } finally {
      cleanup();
    }
  }

  async function exportCurrent() {
    if (busy) return;
    if (selectedVariants.length === 0) {
      toast.error("Pick at least one variant");
      return;
    }
    setBusy(true);
    setOpen(false);
    try {
      const raw = await captureOnce();
      const slug = pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "page";
      const stamp = tsStamp();
      // Single variant → deliver the PNG directly.
      // Multiple variants OR mobile → bundle into one ZIP so the browser
      // only has to accept one download (mobile blocks sequential downloads).
      if (selectedVariants.length === 1) {
        const v = selectedVariants[0];
        const composed = compose(raw, v, aspect);
        const blob = await canvasToBlob(composed);
        await deliverFile(blob, `atlas-${slug}-${v}-${aspect.replace(":", "x")}-${stamp}.png`);
        toast.success("Exported — check your downloads or Files app");
      } else {
        const zip = new JSZip();
        for (const v of selectedVariants) {
          const composed = compose(raw, v, aspect);
          const blob = await canvasToBlob(composed);
          zip.file(`atlas-${slug}-${v}-${aspect.replace(":", "x")}.png`, blob);
        }
        const out = await zip.generateAsync({ type: "blob" });
        await deliverFile(out, `atlas-${slug}-${stamp}.zip`);
        toast.success(`Exported ${selectedVariants.length} variants — saved as ZIP`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Capture failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportPack() {
    if (busy) return;
    if (selectedVariants.length === 0) return toast.error("Pick at least one variant");
    if (selectedTargets.length === 0) return toast.error("Pick at least one page");
    setBusy(true);
    setOpen(false);
    const zip = new JSZip();
    const original = pathname;
    try {
      for (const t of selectedTargets) {
        await navigate({ to: t.path });
        await new Promise((r) => setTimeout(r, 1400));
        const raw = await captureOnce();
        const folder = zip.folder(t.slug)!;
        for (const v of selectedVariants) {
          const composed = compose(raw, v, aspect);
          const blob = await canvasToBlob(composed);
          folder.file(`${t.slug}-${v}-${aspect.replace(":", "x")}.png`, blob);
        }
        toast.message(`Captured ${t.label}`);
      }
      const out = await zip.generateAsync({ type: "blob" });
      await deliverFile(out, `atlas-marketing-pack-${tsStamp()}.zip`);
      toast.success(`Marketing pack ready — ${selectedTargets.length} pages × ${selectedVariants.length} variants`);
      await navigate({ to: original });
    } catch (e) {
      console.error(e);
      toast.error("Pack export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-screenshot-launcher
      data-marketing-hide
      className="fixed bottom-24 left-4 z-30 print:hidden md:bottom-auto md:left-auto md:right-6 md:top-24"
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary" className="shadow-md border border-border" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {busy ? "Exporting…" : "Marketing Export"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Marketing Export Studio
            </DialogTitle>
            <DialogDescription>
              Export pixel-perfect screenshots in marketing-ready formats. Phase 1: aspect ratios,
              clean chrome, gradient backgrounds, and device frames.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="single" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">
                <Camera className="mr-2 h-3.5 w-3.5" /> This page
              </TabsTrigger>
              <TabsTrigger value="pack">
                <Layers className="mr-2 h-3.5 w-3.5" /> Marketing pack
              </TabsTrigger>
              <TabsTrigger value="soon">
                <ImageIcon className="mr-2 h-3.5 w-3.5" /> Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-5 pt-4">
              <AspectPicker value={aspect} onChange={setAspect} />
              <VariantPicker value={variants} onChange={setVariants} />
              <SharedToggles
                marketingMode={marketingMode}
                setMarketingMode={setMarketingMode}
                hiRes={hiRes}
                setHiRes={setHiRes}
              />
              <div className="flex justify-end">
                <Button onClick={exportCurrent} disabled={busy}>
                  <Download className="mr-2 h-4 w-4" />
                  Export {selectedVariants.length || 0} variant
                  {selectedVariants.length === 1 ? "" : "s"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="pack" className="space-y-5 pt-4">
              <AspectPicker value={aspect} onChange={setAspect} />
              <VariantPicker value={variants} onChange={setVariants} />
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Pages to include
                </Label>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {ALL_TARGETS.map((t) => {
                    const on = !!targets[t.path];
                    return (
                      <button
                        key={t.path}
                        type="button"
                        onClick={() => setTargets((s) => ({ ...s, [t.path]: !on }))}
                        className={`rounded-md border px-2.5 py-1.5 text-xs text-left transition ${
                          on
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <SharedToggles
                marketingMode={marketingMode}
                setMarketingMode={setMarketingMode}
                hiRes={hiRes}
                setHiRes={setHiRes}
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {selectedTargets.length} pages × {selectedVariants.length} variants ={" "}
                  <span className="text-foreground font-medium">
                    {selectedTargets.length * selectedVariants.length}
                  </span>{" "}
                  files
                </div>
                <Button onClick={exportPack} disabled={busy}>
                  <Download className="mr-2 h-4 w-4" /> Generate Marketing Pack
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="soon" className="pt-4">
              <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 text-foreground">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="font-medium">Phase 2 — coming soon</span>
                  <Badge variant="secondary" className="ml-1 text-[10px]">preview</Badge>
                </div>
                Designed marketing templates (hero compositions, social covers, App Store screenshots)
                and photographic backdrops (desk, coffee shop, glass meeting room) will drop into this
                tab. Your existing exports keep working — templates compose on top.
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------------- subviews -------------------------------- */

function AspectPicker({ value, onChange }: { value: AspectKey; onChange: (v: AspectKey) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Aspect ratio</Label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ASPECTS.map((a) => {
          const on = a.key === value;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => onChange(a.key)}
              className={`rounded-md border px-3 py-1.5 text-xs transition ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VariantPicker({
  value,
  onChange,
}: {
  value: Record<VariantKey, boolean>;
  onChange: (v: Record<VariantKey, boolean>) => void;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Variants</Label>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {VARIANTS.map((v) => {
          const on = !!value[v.key];
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => onChange({ ...value, [v.key]: !on })}
              className={`rounded-md border px-2.5 py-1.5 text-xs text-left transition ${
                on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="font-medium">{v.label}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">{v.kind}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SharedToggles({
  marketingMode,
  setMarketingMode,
  hiRes,
  setHiRes,
}: {
  marketingMode: boolean;
  setMarketingMode: (v: boolean) => void;
  hiRes: boolean;
  setHiRes: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-card/40 p-3">
      <label className="flex items-center justify-between gap-3 text-sm">
        <div>
          <div className="font-medium">Marketing mode</div>
          <div className="text-xs text-muted-foreground">Hide cursor, scrollbars, capture chrome</div>
        </div>
        <Switch checked={marketingMode} onCheckedChange={setMarketingMode} />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        <div>
          <div className="font-medium">High-res (Retina 2.5×)</div>
          <div className="text-xs text-muted-foreground">Off = ~1440px wide, smaller files</div>
        </div>
        <Switch checked={hiRes} onCheckedChange={setHiRes} />
      </label>
    </div>
  );
}