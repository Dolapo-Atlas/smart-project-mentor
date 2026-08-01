import { useEffect, useRef, useState } from "react";
import { PlayCircle } from "lucide-react";
import demoAsset from "@/assets/atlas-demo.mp4.asset.json";
import posterAsset from "@/assets/atlas-demo-poster.jpg.asset.json";

export const ATLAS_DEMO_URL = demoAsset.url;
export const ATLAS_DEMO_POSTER = posterAsset.url;

/**
 * Portrait product walkthrough. Autoplays muted when scrolled into view and
 * shows a play affordance when autoplay is blocked (iOS low-power mode).
 */
export function DemoVideo({
  src = ATLAS_DEMO_URL,
  onPlay,
  className = "",
}: {
  src?: string;
  onPlay?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          el.play()
            .then(() => {
              setPlaying(true);
              onPlay?.();
            })
            .catch(() => setPlaying(false));
        } else {
          el.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div
      className={`relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[24px] bg-black/5 ${className}`}
      style={{ aspectRatio: "9 / 16" }}
    >
      <video
        ref={ref}
        src={src}
        poster={ATLAS_DEMO_POSTER}
        width={720}
        height={1280}
        muted
        playsInline
        loop
        controls
        preload="metadata"
        aria-label="Atlas product walkthrough"
        className="absolute inset-0 block h-full w-full rounded-[24px] object-cover"
      />
      {!playing && (
        <button
          type="button"
          onClick={() => {
            ref.current
              ?.play()
              .then(() => {
                setPlaying(true);
                onPlay?.();
              })
              .catch(() => {});
          }}
          className="absolute inset-0 grid place-items-center rounded-[24px] bg-black/25 transition-colors hover:bg-black/15"
          aria-label="Play the Atlas product walkthrough"
        >
          <PlayCircle className="h-14 w-14 text-white drop-shadow" aria-hidden />
        </button>
      )}
    </div>
  );
}
