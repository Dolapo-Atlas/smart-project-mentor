/**
 * Replaces bracketed placeholder names that AI-written emails sometimes leave
 * behind (e.g. "Hi [Coordinator's Name],") with the real learner or sender
 * name, so simulation emails always read like real workplace mail.
 */
const APOS = "['’`]?s?";

export function personaliseBody(
  body: string,
  opts: { learnerName?: string | null; senderName?: string | null; senderTitle?: string | null },
): string {
  const learner = (opts.learnerName || "").trim() || "there";
  const sender = (opts.senderName || "").trim();
  let out = body ?? "";

  // Placeholders that refer to the reader (the learner / coordinator).
  const learnerPatterns = [
    new RegExp(`\\[\\s*(?:the\\s+)?coordinator${APOS}(?:\\s+(?:first\\s+)?name)?\\s*\\]`, "gi"),
    new RegExp(`\\[\\s*(?:recipient|learner|user|reader|colleague)${APOS}(?:\\s+name)?\\s*\\]`, "gi"),
    /\[\s*(?:first\s+name|name|full\s+name|insert\s+name)\s*\]/gi,
    /\{\{\s*(?:name|first_name|coordinator)\s*\}\}/gi,
  ];
  for (const re of learnerPatterns) out = out.replace(re, learner);

  // Placeholders in the sign-off refer to the sender.
  if (sender) {
    out = out.replace(new RegExp(`\\[\\s*your${APOS}?\\s*name\\s*\\]`, "gi"), sender);
    out = out.replace(/\[\s*sender(?:'s)?\s*name\s*\]/gi, sender);
  }
  if (opts.senderTitle) {
    out = out.replace(/\[\s*(?:your\s+)?(?:title|role|job\s+title)\s*\]/gi, opts.senderTitle);
  }

  // Anything left over that still looks like a name placeholder.
  out = out.replace(/\[[^\]\n]{0,40}name[^\]\n]{0,20}\]/gi, learner);

  return out;
}
