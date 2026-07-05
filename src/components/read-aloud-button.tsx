import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Square } from "lucide-react";
import { useSpeech, useVoiceSettings, personaForStakeholder } from "@/lib/voice";
import { useRoster } from "@/lib/roster";
import { toast } from "sonner";

export function ReadAloudButton({
  text,
  stakeholder,
  size = "sm",
  variant = "outline",
  label = "Read aloud",
}: {
  text: string;
  stakeholder?: string | null;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
  label?: string;
}) {
  const { settings } = useVoiceSettings();
  const { state, play, stop } = useSpeech();
  const roster = useRoster();
  const role = stakeholder ? roster.find((m) => m.name === stakeholder)?.role : undefined;
  const persona = personaForStakeholder(stakeholder, role);

  const onClick = () => {
    if (state !== "idle") {
      stop();
      return;
    }
    if (!text.trim()) {
      toast.error("Nothing to read");
      return;
    }
    play(text, {
      voice: persona.voice,
      instructions: persona.instructions,
      volume: settings.volume,
      // User's global speed multiplies the persona's baseline speed.
      speed: persona.speed * settings.speed,
    });
  };

  return (
    <Button type="button" variant={variant} size={size} onClick={onClick}>
      {state === "loading" ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : state === "playing" ? (
        <Square className="mr-2 h-4 w-4" />
      ) : (
        <Volume2 className="mr-2 h-4 w-4" />
      )}
      {state === "playing" ? "Stop" : state === "loading" ? "Loading…" : label}
    </Button>
  );
}