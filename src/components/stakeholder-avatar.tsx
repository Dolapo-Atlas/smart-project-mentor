import { cn } from "@/lib/utils";

type StakeholderMeta = {
  seed: string;
  initial: string;
  bg: string; // tailwind bg class
  fg: string; // tailwind text class
  ring: string; // tailwind ring color class for role
};

// Role-coloured rings by stakeholder type.
// Sponsor=Purple, PM=Blue, Clinical=Red, Operations=Green, Tech=Teal, Vendor=Orange, PMO/Analyst=Grey
const RING = {
  sponsor: "ring-purple-500",
  pm: "ring-blue-500",
  clinical: "ring-red-500",
  operations: "ring-emerald-500",
  tech: "ring-teal-500",
  vendor: "ring-orange-500",
  pmo: "ring-slate-400",
} as const;

// Fixed mapping by display name. Unknown names get a deterministic fallback.
const BOOK: Record<string, StakeholderMeta> = {
  "Sarah Williams": { seed: "sarah-williams-pm", initial: "S", bg: "bg-blue-500", fg: "text-white", ring: RING.pm },
  "David Okafor": { seed: "david-okafor-exec", initial: "D", bg: "bg-purple-600", fg: "text-white", ring: RING.sponsor },
  "Priya Anand": { seed: "priya-anand-finance", initial: "P", bg: "bg-slate-500", fg: "text-white", ring: RING.pmo },
  "James Lin": { seed: "james-lin-tech", initial: "J", bg: "bg-teal-600", fg: "text-white", ring: RING.tech },
  "Margaret Hollis": { seed: "margaret-hollis-ops", initial: "M", bg: "bg-emerald-600", fg: "text-white", ring: RING.operations },
  "Rachel Stone": { seed: "rachel-stone-clinical", initial: "R", bg: "bg-red-500", fg: "text-white", ring: RING.clinical },
  "CareSoft Ltd": { seed: "caresoft-vendor", initial: "C", bg: "bg-orange-500", fg: "text-white", ring: RING.vendor },
};

const PALETTE = [
  { bg: "bg-purple-500", fg: "text-white" },
  { bg: "bg-blue-500", fg: "text-white" },
  { bg: "bg-emerald-600", fg: "text-white" },
  { bg: "bg-orange-500", fg: "text-white" },
  { bg: "bg-teal-600", fg: "text-white" },
  { bg: "bg-rose-500", fg: "text-white" },
  { bg: "bg-slate-500", fg: "text-white" },
];

function metaFor(name: string): StakeholderMeta {
  if (BOOK[name]) return BOOK[name];
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const p = PALETTE[Math.abs(h) % PALETTE.length];
  return { seed: slug, initial, bg: p.bg, fg: p.fg, ring: "ring-border" };
}

const SIZES: Record<string, { wh: string; text: string; px: number }> = {
  xs: { wh: "h-6 w-6", text: "text-[10px]", px: 24 },
  sm: { wh: "h-8 w-8", text: "text-xs", px: 32 },
  md: { wh: "h-10 w-10", text: "text-sm", px: 40 },
  lg: { wh: "h-12 w-12", text: "text-base", px: 48 },
};

export function StakeholderAvatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const m = metaFor(name);
  const s = SIZES[size];
  // Notionists: clean, professional Notion/Linear-style illustrated avatars.
  // Muted neutral background palette so the role ring carries the colour signal.
  const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(
    m.seed,
  )}&radius=50&backgroundColor=eef2f7,e5e7eb,f1f5f9,e2e8f0,f3f4f6&backgroundType=solid`;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-2 ring-offset-2 ring-offset-background",
        s.wh,
        s.text,
        m.bg,
        m.fg,
        m.ring,
        className,
      )}
      aria-label={name}
      title={name}
    >
      <span aria-hidden="true">{m.initial}</span>
      <img
        src={url}
        alt=""
        width={s.px}
        height={s.px}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </span>
  );
}

export default StakeholderAvatar;