const swaps: Record<string, string> = {
  "\u2014": "-",
  "\u2013": "-",
  "\u2192": "->",
  "\u00d7": "x",
  "\u00b7": " | ",
  "\u0153": "oe",
  "\u0152": "OE",
  "\u2019": "'",
  "\u2018": "'",
  "\u201c": "\"",
  "\u201d": "\"",
  "\u00a0": " ",
};

function latin(value: string) {
  let out = "";
  for (const char of value) {
    const mapped = swaps[char] ?? char;
    for (const piece of mapped) {
      const code = piece.codePointAt(0) ?? 0;
      if (code < 32 || code > 255) continue;
      if (code === 0x28 || code === 0x29 || code === 0x5c) out += `\\${piece}`;
      else out += piece;
    }
  }
  return out;
}

function wrap(value: string, width: number) {
  const text = latin(value);
  if (text.length <= width) return [text];
  const rows: string[] = [];
  let rest = text;
  while (rest.length > width) {
    const breakAt = rest.lastIndexOf(" ", width);
    const cut = breakAt > 20 ? breakAt : width;
    rows.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest) rows.push(rest);
  return rows;
}

export function plainPdf(source: string) {
  const rows = source
    .split("\n")
    .flatMap((line) => (line.trim() ? wrap(line, 92) : [""]));
  const pages: string[][] = [];
  for (let index = 0; index < rows.length; index += 46) {
    pages.push(rows.slice(index, index + 46));
  }
  if (!pages.length) pages.push([""]);

  const fontId = 3 + pages.length * 2;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
  ];
  const pageIds: number[] = [];
  pages.forEach((page, index) => {
    const contentId = 3 + index * 2;
    const pageId = contentId + 1;
    pageIds.push(pageId);
    const content = [
      "BT",
      "/F1 11 Tf",
      "48 790 Td",
      "15 TL",
      ...page.map((line) => `(${line}) Tj T*`),
      "ET",
    ].join("\n");
    objects.push(
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    );
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    );
  });
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, "latin1");
}

type Rgb = readonly [number, number, number];

const ink: Rgb = [0.082, 0.216, 0.369];
const slate: Rgb = [0.392, 0.455, 0.545];
const line: Rgb = [0.886, 0.91, 0.941];
const paper: Rgb = [0.973, 0.98, 0.988];

export type PdfRaster = {
  width: number;
  height: number;
  colorSpace: "DeviceRGB" | "DeviceGray";
  filter: "DCTDecode" | "FlateDecode";
  data: Buffer;
};

function pdfText(value: string) {
  return latin(value).replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function fitText(value: string, width: number, size: number) {
  const max = Math.max(1, Math.floor(width / (size * 0.48)));
  const text = latin(value);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}.`;
}

export function createPdfSheet() {
  const pages: string[][] = [[]];
  const images: PdfRaster[] = [];
  const footer: string[] = [];
  let stamping = false;
  let y = 800;
  let floor = 42;
  const left = 36;
  const right = 559;

  function page() {
    return pages[pages.length - 1];
  }

  function sink() {
    return stamping ? footer : page();
  }

  function need(height: number) {
    if (y - height >= floor) return;
    pages.push([]);
    y = 800;
  }

  function rgb(color: Rgb) {
    return `${color[0]} ${color[1]} ${color[2]}`;
  }

  return {
    left,
    right,
    gap(height: number) {
      need(height);
      y -= height;
    },
    text(value: string, x = left, size = 9, bold = false, color: Rgb = ink) {
      const shown = pdfText(value);
      if (!shown) return;
      need(size + 4);
      page().push(
        `BT ${rgb(color)} rg /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y - size} Tm (${shown}) Tj ET`,
      );
      y -= size + 3;
    },
    caption(value: string, x = left) {
      const shown = pdfText(value);
      if (!shown) return;
      need(12);
      page().push(
        `BT ${rgb(slate)} rg /F1 8 Tf 1 0 0 1 ${x} ${y - 8} Tm (${shown}) Tj ET`,
      );
      y -= 12;
    },
    columns(
      cells: Array<{ text: string; width: number; align?: "end"; bold?: boolean }>,
      size = 8,
      color: Rgb = ink,
    ) {
      need(size + 6);
      let x = left;
      for (const cell of cells) {
        const shown = fitText(cell.text, cell.width - 4, size);
        const used = shown.length * size * 0.48;
        const tx = cell.align === "end" ? Math.max(x, x + cell.width - used - 2) : x + 2;
        page().push(
          `BT ${rgb(color)} rg /${cell.bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${tx.toFixed(1)} ${(y - size).toFixed(1)} Tm (${pdfText(shown)}) Tj ET`,
        );
        x += cell.width;
      }
      y -= size + 5;
    },
    band(cells: Array<{ text: string; width: number; align?: "end" }>) {
      need(16);
      const top = y;
      page().push(`${rgb(ink)} rg ${left} ${top - 14} ${right - left} 14 re f`);
      let x = left;
      for (const cell of cells) {
        const shown = fitText(cell.text, cell.width - 4, 8);
        const used = shown.length * 8 * 0.48;
        const tx = cell.align === "end" ? Math.max(x, x + cell.width - used - 2) : x + 2;
        page().push(
          `BT 1 1 1 rg /F2 8 Tf 1 0 0 1 ${tx.toFixed(1)} ${(top - 10).toFixed(1)} Tm (${pdfText(shown)}) Tj ET`,
        );
        x += cell.width;
      }
      y = top - 18;
    },
    rule() {
      need(8);
      page().push(`${rgb(line)} RG 0.6 w ${left} ${y} m ${right} ${y} l S`);
      y -= 8;
    },
    shade(height: number) {
      need(height);
      page().push(`${rgb(paper)} rg ${left} ${y - height} ${right - left} ${height} re f`);
    },
    margin(next: number) {
      floor = next;
    },
    stamp(draw: () => void) {
      stamping = true;
      draw();
      stamping = false;
    },
    y() {
      return y;
    },
    setY(next: number) {
      y = next;
    },
    reserve(height: number) {
      need(height);
      const top = y;
      y -= height;
      return top;
    },
    place(
      value: string,
      x: number,
      baseline: number,
      size = 9,
      bold = false,
      color: Rgb = ink,
      align: "start" | "end" | "center" = "start",
      maxWidth?: number,
    ) {
      const shown = maxWidth ? fitText(value, maxWidth, size) : latin(value);
      if (!shown) return;
      const used = shown.length * size * (bold ? 0.52 : 0.46);
      const tx = align === "end" ? x - used : align === "center" ? x - used / 2 : x;
      sink().push(
        `BT ${rgb(color)} rg /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${tx.toFixed(1)} ${baseline.toFixed(1)} Tm (${shown}) Tj ET`,
      );
    },
    fill(x: number, bottom: number, width: number, height: number, color: Rgb) {
      sink().push(
        `${rgb(color)} rg ${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
      );
    },
    stroke(x: number, bottom: number, width: number, height: number, color: Rgb) {
      sink().push(
        `${rgb(color)} RG 0.6 w ${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`,
      );
    },
    line(x1: number, y1: number, x2: number, y2: number, color: Rgb, width = 0.6) {
      sink().push(
        `${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
      );
    },
    image(raster: PdfRaster, x: number, top: number, width: number, height: number) {
      if (width <= 0 || height <= 0) return;
      const name = `Im${images.push(raster)}`;
      const bottom = top - height;
      page().push(
        `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${bottom.toFixed(2)} cm /${name} Do Q`,
      );
    },
    toBuffer() {
      if (footer.length) {
        for (const commands of pages) commands.push(...footer);
      }
      const fontId = 3 + pages.length * 2;
      const boldId = fontId + 1;
      const imageStart = boldId + 1;
      const xobject = images
        .map((unused, index) => `/Im${index + 1} ${imageStart + index} 0 R`)
        .join(" ");
      const resources = images.length
        ? `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> /XObject << ${xobject} >> >>`
        : `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >>`;
      const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", ""];
      const pageIds: number[] = [];
      pages.forEach((commands, index) => {
        const contentId = 3 + index * 2;
        const pageId = contentId + 1;
        pageIds.push(pageId);
        const content = commands.join("\n");
        objects.push(
          `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
        );
        objects.push(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R ${resources} >>`,
        );
      });
      objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
      objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
      objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
      for (const raster of images) {
        const stream = raster.data.toString("latin1");
        objects.push(
          `<< /Type /XObject /Subtype /Image /Width ${raster.width} /Height ${raster.height} /ColorSpace /${raster.colorSpace} /BitsPerComponent 8 /Filter /${raster.filter} /Length ${raster.data.length} >>\nstream\n${stream}\nendstream`,
        );
      }
      let body = "%PDF-1.4\n";
      const offsets = [0];
      objects.forEach((object, index) => {
        offsets.push(Buffer.byteLength(body, "latin1"));
        body += `${index + 1} 0 obj\n${object}\nendobj\n`;
      });
      const xref = Buffer.byteLength(body, "latin1");
      body += `xref\n0 ${objects.length + 1}\n`;
      body += "0000000000 65535 f \n";
      for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
      body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return Buffer.from(body, "latin1");
    },
  };
}

export function pdfFile(filename: string, body: Buffer) {
  const safe = filename.replace(/[^\w.-]+/g, "-");
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function pdfResponse(filename: string, source: string) {
  return pdfFile(filename, plainPdf(source));
}
