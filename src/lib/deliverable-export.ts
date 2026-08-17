// Client-side exports for project deliverables: branded PDF and Word (.docx).

export type DeliverableDoc = {
  title: string;
  projectName?: string | null;
  ownerName?: string | null;
  role?: string | null;
  status?: string | null;
  version?: number;
  date?: string | null;
  sections: { heading: string; body: string }[];
};

function labelOf(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function sectionsFromPayload(payload: Record<string, string>) {
  return Object.entries(payload)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([k, v]) => ({ heading: labelOf(k), body: String(v).trim() }));
}

/** Parse "## Heading" markdown into sections (fallback for artefacts stored as markdown). */
export function sectionsFromMarkdown(markdown: string) {
  const out: { heading: string; body: string }[] = [];
  const lines = markdown.split(/\r?\n/);
  let heading = "";
  let body: string[] = [];
  const flush = () => {
    const text = body.join("\n").trim();
    if (heading || text) out.push({ heading: heading || "Content", body: text });
    body = [];
  };
  for (const line of lines) {
    const m = /^#{1,3}\s+(.*)$/.exec(line.trim());
    if (m) {
      flush();
      heading = m[1].trim();
    } else {
      body.push(line);
    }
  }
  flush();
  return out.filter((s) => s.body.length > 0);
}

/** Sections for a deliverable, preferring structured payload then markdown. */
export function sectionsForDeliverable(
  payload: Record<string, string> | null | undefined,
  markdown: string | null | undefined,
) {
  const fromPayload = sectionsFromPayload(payload ?? {});
  if (fromPayload.length > 0) return fromPayload;
  return markdown ? sectionsFromMarkdown(markdown) : [];
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function paragraph(text: string, opts: { bold?: boolean; size?: number; spaceAfter?: number } = {}) {
  const size = opts.size ?? 22; // half-points
  return `<w:p><w:pPr><w:spacing w:after="${opts.spaceAfter ?? 120}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="${size}"/>${
    opts.bold ? "<w:b/>" : ""
  }</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

/** Build a valid minimal .docx from the deliverable and download it. */
export async function exportDeliverableToDocx(doc: DeliverableDoc, filename: string) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const metaLine = [
    doc.projectName ? `Project: ${doc.projectName}` : null,
    doc.ownerName ? `Prepared by: ${doc.ownerName}${doc.role ? ` (${doc.role})` : ""}` : null,
    doc.version ? `Version ${doc.version}` : null,
    doc.status ? `Status: ${doc.status}` : null,
    doc.date ? `Date: ${doc.date}` : null,
  ].filter(Boolean) as string[];

  const body = [
    paragraph("ATLAS SIMULATION DELIVERABLE", { bold: true, size: 18 }),
    paragraph(doc.title, { bold: true, size: 36, spaceAfter: 160 }),
    ...metaLine.map((line) => paragraph(line, { size: 20 })),
    paragraph("", { spaceAfter: 200 }),
    ...doc.sections.flatMap((s) => [
      paragraph(s.heading, { bold: true, size: 26, spaceAfter: 60 }),
      ...s.body.split(/\n+/).map((line) => paragraph(line)),
    ]),
    paragraph(
      "Generated in Atlas by Atlassim Technologies Limited — simulated project work for professional development.",
      { size: 16, spaceAfter: 0 },
    ),
  ].join("");

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.folder("_rels")!.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.folder("word")!.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
  );

  const blob = await zip.generateAsync({ mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", type: "blob" });
  download(blob, filename);
}

/** Text-based branded PDF (selectable text, no canvas rasterising). */
export async function exportDeliverableToPdf(doc: DeliverableDoc, filename: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const width = pageW - margin * 2;
  let y = margin;

  const ensure = (needed: number) => {
    if (y + needed > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // Header band
  pdf.setFillColor(16, 32, 62);
  pdf.rect(0, 0, pageW, 26, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("ATLAS", margin, 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Project deliverable", margin, 19);
  if (doc.projectName) pdf.text(doc.projectName, pageW - margin, 16, { align: "right" });
  y = 38;

  pdf.setTextColor(16, 32, 62);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(doc.title, margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 96, 110);
  const meta = [
    doc.ownerName ? `Prepared by ${doc.ownerName}${doc.role ? ` · ${doc.role}` : ""}` : null,
    doc.version ? `Version ${doc.version}` : null,
    doc.status ? doc.status : null,
    doc.date ?? null,
  ]
    .filter(Boolean)
    .join("   |   ");
  if (meta) {
    pdf.text(meta, margin, y);
    y += 8;
  }
  pdf.setDrawColor(226, 220, 208);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  for (const section of doc.sections) {
    ensure(16);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(16, 32, 62);
    pdf.text(section.heading, margin, y);
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(40, 44, 52);
    const lines = pdf.splitTextToSize(section.body, width) as string[];
    for (const line of lines) {
      ensure(6);
      pdf.text(line, margin, y);
      y += 5;
    }
    y += 5;
  }

  ensure(14);
  pdf.setFontSize(8);
  pdf.setTextColor(140, 145, 155);
  pdf.text(
    "Generated in Atlas by Atlassim Technologies Limited — simulated project work for professional development.",
    margin,
    pageH - 12,
  );

  pdf.save(filename);
}