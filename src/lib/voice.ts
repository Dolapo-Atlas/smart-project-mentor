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

// -----------------------------------------------------------------------------
// Persona-aware voices
// -----------------------------------------------------------------------------
// Every stakeholder gets a voice + speaking-style instructions that match their
// personality, seniority, and function. The TTS model (gpt-4o-mini-tts) uses
// the `instructions` field to steer tone, pacing, and warmth — so an executive
// sponsor sounds authoritative, a clinical lead sounds calm and empathetic,
// a vendor sounds polished and corporate, etc.
//
// Two lookup layers:
//   1. NAME_PERSONAS — hand-crafted personas for the flagship Atlas cast.
//   2. ROLE_PERSONAS — role-based fallbacks so new stakeholders in future
//      project templates automatically inherit a matching voice.

export type Persona = {
  voice: string;      // one of the ALLOWED_VOICES in /api/public/tts
  instructions: string;
  speed: number;      // baseline speed; user's global speed multiplies this
};

// Voices allowed by the TTS gateway.
const VALID_VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo",
  "sage", "shimmer", "verse", "marin", "cedar",
]);

const ROLE_PERSONAS: Record<string, Persona> = {
  pm: {
    voice: "coral",
    instructions:
      "Warm, organised, and collaborative — the calm project manager keeping everyone aligned. Speak with clear diction and a friendly, professional cadence.",
    speed: 1.0,
  },
  sponsor: {
    voice: "cedar",
    instructions:
      "Authoritative executive sponsor. Speak with measured gravitas, confident pacing, and a lower register. Sound like a senior leader who chooses words carefully.",
    speed: 0.95,
  },
  finance: {
    voice: "sage",
    instructions:
      "Precise, analytical finance lead. Speak crisply and evenly, with slight emphasis on numbers and financial terms. Neutral, no-nonsense delivery.",
    speed: 1.0,
  },
  tech: {
    voice: "echo",
    instructions:
      "Measured, thoughtful technical lead. Calm and articulate, with a slight pause before technical points. Sound like an experienced engineer explaining a system.",
    speed: 0.98,
  },
  vendor: {
    voice: "verse",
    instructions:
      "Polished corporate account manager from a vendor. Confident, warm, slightly formal — pitching without being pushy.",
    speed: 1.02,
  },
  care_home: {
    voice: "marin",
    instructions:
      "Warm, empathetic care home manager. Grounded and caring, with an unhurried, reassuring pace. Sound like someone who spends the day with residents and families.",
    speed: 0.95,
  },
  operations: {
    voice: "ballad",
    instructions:
      "Practical operations lead. Direct, energetic, matter-of-fact — someone who runs a rota and wants clear next steps.",
    speed: 1.05,
  },
  clinical: {
    voice: "shimmer",
    instructions:
      "Calm clinical governance lead. Professional, precise, and reassuring — the tone of a senior nurse or clinician explaining a safety concern.",
    speed: 0.97,
  },
  admin: {
    voice: "alloy",
    instructions: "Neutral, helpful administrator. Clear and even, no strong colour.",
    speed: 1.0,
  },
};

// Named personas for the flagship Atlas cast override role defaults.
const NAME_PERSONAS: Record<string, Persona> = {
  "Sarah Williams": ROLE_PERSONAS.pm,
  "David Okafor": ROLE_PERSONAS.sponsor,
  "Priya Anand": ROLE_PERSONAS.finance,
  "James Lin": ROLE_PERSONAS.tech,
  "CareSoft Ltd": ROLE_PERSONAS.vendor,
  "Margaret Hollis": ROLE_PERSONAS.care_home,
  "Rachel Stone": ROLE_PERSONAS.clinical,
  // System narrator for project briefings.
  "Project Update": {
    voice: "ash",
    instructions:
      "Documentary-style narrator giving a concise project briefing. Steady, engaging, neutral — think a professional newsreader.",
    speed: 1.0,
  },
};

const FALLBACK_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar"];
const FALLBACK: Persona = {
  voice: "alloy",
  instructions: "Neutral, professional workplace voice. Clear diction, even pacing.",
  speed: 1.0,
};

function stableVoiceFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return FALLBACK_VOICES[Math.abs(h) % FALLBACK_VOICES.length];
}

/** Full persona (voice + speaking instructions + baseline speed) for a stakeholder. */
export function personaForStakeholder(
  name: string | null | undefined,
  role?: string | null,
): Persona {
  if (name && NAME_PERSONAS[name]) return NAME_PERSONAS[name];
  if (role && ROLE_PERSONAS[role]) return ROLE_PERSONAS[role];
  if (name) {
    const voice = stableVoiceFor(name);
    return { ...FALLBACK, voice: VALID_VOICES.has(voice) ? voice : "alloy" };
  }
  return FALLBACK;
}

/** Backwards-compat: just the voice id for a stakeholder. */
export function voiceForStakeholder(name: string | null | undefined, role?: string | null): string {
  return personaForStakeholder(name, role).voice;
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
  opts: {
    voice?: string;
    volume?: number;
    speed?: number;
    instructions?: string;
    signal?: AbortSignal;
  } = {},
): Promise<HTMLAudioElement> {
  const res = await fetch("/api/public/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: opts.voice ?? "alloy",
      speed: opts.speed ?? 1,
      instructions: opts.instructions,
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
    async (
      text: string,
      opts: { voice?: string; volume?: number; speed?: number; instructions?: string } = {},
    ) => {
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