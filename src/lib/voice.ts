import { useEffect, useRef, useState, useCallback } from "react";

export type VoiceSettings = {
  enabled: boolean;
  readEmails: boolean;
  readBriefings: boolean;
  volume: number; // 0..1
  speed: number; // 0.5..2
};

const DEFAULTS: VoiceSettings = {
  enabled: false,
  readEmails: true,
  readBriefings: true,
  volume: 1,
  speed: 1,
};

const STORAGE_KEY = "atlas.voice.settings.v1";

function read(): VoiceSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function useVoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULTS);
  useEffect(() => setSettings(read()), []);
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setSettings(read());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        // Notify same-tab listeners
        window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
      } catch {}
      return next;
    });
  }, []);
  return { settings, update };
}

// Stable voice assignment per stakeholder name. Keep consistent throughout sim.
const VOICE_MAP: Record<string, string> = {
  "Sarah Williams": "shimmer",
  "David Okafor": "echo",
  "Priya Anand": "sage",
  "James Lin": "verse",
  "CareSoft Ltd": "ash",
  "Margaret Hollis": "ballad",
  "Rachel Stone": "ballad",
  "Project Update": "coral",
};

export function voiceForStakeholder(name: string | null | undefined): string {
  if (!name) return "alloy";
  if (VOICE_MAP[name]) return VOICE_MAP[name];
  // Stable hash fallback
  const voices = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return voices[Math.abs(h) % voices.length];
}

export type SpeechController = {
  audio: HTMLAudioElement;
  abort: AbortController;
  ready: Promise<void>;
};

/**
 * Fetches MP3 from the TTS endpoint and returns a playing HTMLAudioElement.
 * Caller owns play/pause and revoking the object URL on cleanup.
 */
export async function speak(
  text: string,
  opts: { voice?: string; volume?: number; speed?: number; signal?: AbortSignal } = {},
): Promise<HTMLAudioElement> {
  const res = await fetch("/api/public/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: opts.voice ?? "alloy",
      speed: opts.speed ?? 1,
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `TTS failed: ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.volume = Math.min(1, Math.max(0, opts.volume ?? 1));
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  return audio;
}

/** React hook: load-and-play / pause / cleanup audio for a button. */
export function useSpeech() {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src && URL.revokeObjectURL(a.src);
      audioRef.current = null;
    }
    setState("idle");
  }, []);

  useEffect(() => () => stop(), [stop]);

  const play = useCallback(
    async (text: string, opts: { voice?: string; volume?: number; speed?: number } = {}) => {
      stop();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState("loading");
      try {
        const a = await speak(text, { ...opts, signal: ctrl.signal });
        if (ctrl.signal.aborted) {
          a.pause();
          return;
        }
        audioRef.current = a;
        a.addEventListener("ended", () => setState("idle"));
        a.addEventListener("pause", () => {
          if (a.ended) return;
          if (audioRef.current === a) setState("idle");
        });
        await a.play();
        setState("playing");
      } catch (e) {
        if ((e as any)?.name !== "AbortError") {
          console.error("TTS error:", e);
        }
        setState("idle");
      }
    },
    [stop],
  );

  return { state, play, stop };
}