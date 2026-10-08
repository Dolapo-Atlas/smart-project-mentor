import { useEffect, useRef, useState } from "react";
import { PlayCircle } from "lucide-react";
import demoAsset from "@/assets/atlas-demo.mp4.asset.json";
import posterAsset from "@/assets/atlas-demo-poster.jpg.asset.json";
import founderVideoAsset from "@/assets/atlas-founder-video.mp4.asset.json";
import founderPosterAsset from "@/assets/atlas-founder-video-poster.jpg.asset.json";

export const ATLAS_DEMO_URL = demoAsset.url;
export const ATLAS_DEMO_POSTER = posterAsset.url;
export const ATLAS_FOUNDER_VIDEO_URL = founderVideoAsset.url;
export const ATLAS_FOUNDER_VIDEO_POSTER = founderPosterAsset.url;

/**
 * Product demo video. Autoplays muted when scrolled into view and shows a
 * play affordance when autoplay is blocked (iOS low-power mode).
 * Supports landscape (16/9) and portrait (9/16) source videos.
 */
export function DemoVideo({
  src = ATLAS_DEMO_URL,
  poster = ATLAS_DEMO_POSTER,
  aspectRatio = "16 / 9",
  onPlay,
  className = "",
}: {
  src?: string;
  poster?: string;
  aspectRatio?: string;
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
      className={`relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-black/5 shadow-2xl ${className}`}
      style={{ aspectRatio }}
    >
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        playsInline
        loop
        controls
        preload="metadata"
        aria-label="Atlas product demo"
        className="absolute inset-0 block h-full w-full rounded-2xl object-cover"
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
          className="absolute inset-0 grid place-items-center rounded-2xl bg-black/30 transition-colors hover:bg-black/20"
          aria-label="Play the Atlas product demo"
        >
          <PlayCircle className="h-16 w-16 text-white drop-shadow-lg" aria-hidden />
        </button>
      )}
    </div>
  );
}
