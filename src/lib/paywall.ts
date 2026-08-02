/** Client-side helper: recognise the free-preview paywall error from the server. */
export function isPaywallError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return msg.toLowerCase().includes("free preview is complete");
}
