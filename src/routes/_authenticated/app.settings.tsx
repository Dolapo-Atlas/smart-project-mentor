import { createFileRoute } from "@tanstack/react-router";
import { useVoiceSettings, useSpeech, voiceForStakeholder } from "@/lib/voice";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { STAKEHOLDERS } from "@/lib/stakeholders";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
});

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const { settings, update } = useVoiceSettings();
  const { play, stop, state } = useSpeech();

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preferences</div>
        <h1 className="font-display text-4xl font-medium">Settings</h1>
      </header>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-xl font-medium">Voice mode</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Atlas can read stakeholder emails and end-of-day briefings out loud. Voice is always
          optional — nothing auto-plays unless you turn this on.
        </p>

        <div className="mt-6">
          <Row
            title="Voice mode"
            description="Master switch. When off, no automatic audio plays."
          >
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => update({ enabled: v })}
            />
          </Row>
          <Row
            title="Read emails aloud"
            description="Show the Read aloud button on stakeholder emails."
          >
            <Switch
              checked={settings.readEmails}
              onCheckedChange={(v) => update({ readEmails: v })}
            />
          </Row>
          <Row
            title="Read end-of-day briefings"
            description="Auto-play briefing when blocked from advancing time."
          >
            <Switch
              checked={settings.readBriefings}
              onCheckedChange={(v) => update({ readBriefings: v })}
              disabled={!settings.enabled}
            />
          </Row>
          <Row title="Voice volume">
            <div className="w-48">
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[settings.volume]}
                onValueChange={([v]) => update({ volume: v })}
              />
              <div className="mt-1 text-right text-[10px] text-muted-foreground">
                {Math.round(settings.volume * 100)}%
              </div>
            </div>
          </Row>
          <Row title="Voice speed">
            <div className="w-48">
              <Slider
                min={0.5}
                max={1.5}
                step={0.05}
                value={[settings.speed]}
                onValueChange={([v]) => update({ speed: v })}
              />
              <div className="mt-1 text-right text-[10px] text-muted-foreground">
                {settings.speed.toFixed(2)}×
              </div>
            </div>
          </Row>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-xl font-medium">Stakeholder voices</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each stakeholder uses a consistent voice. Preview them below.
        </p>
        <ul className="mt-4 divide-y divide-border">
          {STAKEHOLDERS.map((s) => {
            const voice = voiceForStakeholder(s.name);
            return (
              <li key={s.role} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.title} · voice: {voice}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (state !== "idle") {
                      stop();
                      return;
                    }
                    play(
                      `Hi, this is ${s.name}, ${s.title}. This is how I'll sound in your briefings.`,
                      { voice, volume: settings.volume, speed: settings.speed },
                    );
                  }}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  {state === "playing" ? "Stop" : "Preview"}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}