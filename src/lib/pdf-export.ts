/**
 * Client-side PDF export for credential surfaces.
 * Renders a DOM node to canvas and lays it out on A4 pages.
 */
export async function exportElementToPdf(
  el: HTMLElement,
  filename: string,
  opts: { background?: string; multipage?: boolean } = {},
) {
  const [{ default: html2canvas }, jspdf] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  const { jsPDF } = jspdf;

  const canvas = await html2canvas(el, {
    scale: Math.min(2, window.devicePixelRatio || 1) * 1.5,
    backgroundColor: opts.background ?? "#FDFCF8",
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  if (!opts.multipage) {
    // Fit the whole sheet onto one page, centred.
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(imgData, "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h);
  } else {
    // Scale to full width, then slide the image up page by page.
    const h = (canvas.height * pageW) / canvas.width;
    let remaining = h;
    let offset = 0;
    while (remaining > 0.5) {
      pdf.addImage(imgData, "JPEG", 0, -offset, pageW, h);
      remaining -= pageH;
      offset += pageH;
      if (remaining > 0.5) pdf.addPage();
    }
  }

  pdf.save(filename);
}
