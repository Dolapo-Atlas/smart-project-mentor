/**
 * Meta Pixel + GA4 loader and a single `track()` helper used by the
 * /project-readiness sales page and the post-payment onboarding flow.
 *
 * Both IDs are publishable and read from Vite env:
 *   VITE_META_PIXEL_ID
 *   VITE_GA4_MEASUREMENT_ID
 * When an ID is absent the corresponding tracker is simply skipped.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    _atlasTrackersReady?: boolean;
  }
}

const PIXEL_ID = import.meta.env['VITE_META_PIXEL_ID'] as string | undefined;
const GA4_ID = import.meta.env['VITE_GA4_MEASUREMENT_ID'] as string | undefined;

export type FunnelEvent =
  | "landing_page_view"
  | "primary_cta_click"
  | "checkout_started"
  | "purchase_completed"
  | "account_created"
  | "first_task_started"
  | "first_task_completed"
  | "video_played"
  | "video_completed"
  | "faq_opened"
  | "country_selected"
  | "credential_generated"
  // In-app journey steps (see learner-events.shared.ts). Mirrored to GA4/Meta
  // so ad optimisation can target learners who actually start work.
  | "signed_in"
  | "onboarding_started"
  | "role_selected"
  | "project_created"
  | "brief_opened"
  | "brief_closed"
  | "first_email_prompt_shown"
  | "inbox_opened"
  | "first_reply_sent"
  | "day_advanced";

/** Meta standard-event mapping so ad optimisation works out of the box. */
const META_EVENTS: Partial<Record<FunnelEvent, { name: string; standard: boolean }>> = {
  landing_page_view: { name: "ViewContent", standard: true },
  primary_cta_click: { name: "AddToCart", standard: true },
  checkout_started: { name: "InitiateCheckout", standard: true },
  purchase_completed: { name: "Purchase", standard: true },
  account_created: { name: "CompleteRegistration", standard: true },
};

export function initTrackers() {
  if (typeof window === "undefined" || window._atlasTrackersReady) return;
  window._atlasTrackersReady = true;

  if (PIXEL_ID) {
    const w = window as unknown as Record<string, any>;
    if (!w.fbq) {
      const n: any = (...args: unknown[]) => {
        n.callMethod ? n.callMethod(...args) : n.queue.push(args);
      };
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      w.fbq = n;
      w._fbq = n;
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(s);
    }
    window.fbq?.("init", PIXEL_ID);
    window.fbq?.("track", "PageView");
  }

  if (GA4_ID) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID);
  }
}

export function track(event: FunnelEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const payload = { ...readCampaign(), ...params };
  window.gtag?.("event", event, payload);
  const meta = META_EVENTS[event];
  if (meta) {
    window.fbq?.(meta.standard ? "track" : "trackCustom", meta.name, payload);
  } else {
    window.fbq?.("trackCustom", event, payload);
  }
  if (import.meta.env.DEV) console.debug("[atlas-track]", event, payload);
}

const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_country",
  "variant",
  "country",
] as const;

const STORAGE_KEY = "atlas_campaign";

/** Persist the first-touch campaign so it survives checkout redirects. */
export function captureCampaign(search: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const found: Record<string, string> = {};
  for (const k of CAMPAIGN_KEYS) {
    const v = search[k];
    if (typeof v === "string" && v) found[k] = v;
  }
  if (!Object.keys(found).length) return;
  try {
    const existing = readCampaign();
    if (!Object.keys(existing).length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    }
  } catch {
    /* storage unavailable */
  }
}

export function readCampaign(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}