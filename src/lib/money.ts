/**
 * Single money formatter for Atlas. Provider amounts are stored in minor units
 * (pence / kobo / paise) on the confirmed payment record, so every surface —
 * paywall, success banner, receipt, email, admin record — formats from the same
 * numbers rather than hardcoded price text.
 */
export function formatMinor(amount: number, currency: string): string {
  const code = (currency || "GBP").toUpperCase();
  const zeroDecimal = new Set(["JPY", "KRW", "VND", "CLP", "XAF", "XOF", "BIF", "DJF"]);
  const divisor = zeroDecimal.has(code) ? 1 : 100;
  const value = amount / divisor;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}
