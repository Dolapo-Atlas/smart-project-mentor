import { cn } from "@/lib/utils";

type StakeholderMeta = {
  seed: string;
  initial: string;
  bg: string; // tailwind bg class
  fg: string; // tailwind text class
};

// Fixed mapping by display name. Unknown names get a deterministic fallback.
const BOOK: Record<string, StakeholderMeta> = {
  "Sarah Williams": { seed: "sarah-williams", initial: "S", bg: "bg-purple-500", fg: "text-white" },
  "David Okafor": { seed: "david-okafor", initial: "D", bg: "bg-[#1e3a8a]", fg: "text-white" },
  "Priya Anand": { seed: "priya-anand", initial: "P", bg: "bg-emerald-600", fg: "text-white" },
  "James Lin": { seed: "james-lin", initial: "J", bg: "bg-blue-500", fg: "text-white" },
  "Margaret Hollis": { seed: "margaret-hollis", initial: "M", bg: "bg-orange-500", fg: "text-white" },
  "Rachel Stone": { seed: "rachel-stone", initial: "R", bg: "bg-teal-600", fg: "text-white" },
  "CareSoft Ltd": { seed: "caresoft", initial: "C", bg: "bg-slate-500", fg: "text-white" },
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
  return { seed: slug, initial, bg: p.bg, fg: p.fg };
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
  const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(m.seed)}&radius=50&backgroundType=gradientLinear`;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-1 ring-border",
        s.wh,
        s.text,
        m.bg,
        m.fg,
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