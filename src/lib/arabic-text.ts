import { readFileSync } from "fs";
import path from "path";

// Amiri Regular, SIL Open Font License. Presentation forms are in the cmap.

type FontFace = {
  bytes: Buffer;
  unitsPerEm: number;
  glyphs: number;
  widths: number[];
  ascent: number;
  descent: number;
  bbox: [number, number, number, number];
  glyphOf: (codePoint: number) => number;
};

const forms: Record<number, readonly number[]> = {
  0x0621: [0xfe80],
  0x0622: [0xfe81, 0xfe82],
  0x0623: [0xfe83, 0xfe84],
  0x0624: [0xfe85, 0xfe86],
  0x0625: [0xfe87, 0xfe88],
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  0x0627: [0xfe8d, 0xfe8e],
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  0x0629: [0xfe93, 0xfe94],
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  0x062f: [0xfea9, 0xfeaa],
  0x0630: [0xfeab, 0xfeac],
  0x0631: [0xfead, 0xfeae],
  0x0632: [0xfeaf, 0xfeb0],
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0],
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0],
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  0x0648: [0xfeed, 0xfeee],
  0x0649: [0xfeef, 0xfef0],
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4],
};

const lamAlef: Record<number, readonly [number, number]> = {
  0x0622: [0xfef5, 0xfef6],
  0x0623: [0xfef7, 0xfef8],
  0x0625: [0xfef9, 0xfefa],
  0x0627: [0xfefb, 0xfefc],
};

let face: FontFace | null = null;

function loadFace(): FontFace {
  if (face) return face;
  const bytes = readFileSync(path.join(process.cwd(), "src/lib/fonts/Amiri-Regular.ttf"));
  const tables = new Map<string, { offset: number; length: number }>();
  const count = bytes.readUInt16BE(4);
  for (let index = 0; index < count; index += 1) {
    const at = 12 + index * 16;
    tables.set(bytes.toString("ascii", at, at + 4), {
      offset: bytes.readUInt32BE(at + 8),
      length: bytes.readUInt32BE(at + 12),
    });
  }
  const head = tables.get("head")!.offset;
  const hhea = tables.get("hhea")!.offset;
  const hmtx = tables.get("hmtx")!.offset;
  const maxp = tables.get("maxp")!.offset;
  const unitsPerEm = bytes.readUInt16BE(head + 18);
  const glyphs = bytes.readUInt16BE(maxp + 4);
  const metrics = bytes.readUInt16BE(hhea + 34);
  const widths = Array.from({ length: glyphs }, (_, glyph) => {
    const slot = Math.min(glyph, Math.max(0, metrics - 1));
    return bytes.readUInt16BE(hmtx + slot * 4);
  });
  const glyphOf = cmapLookup(bytes, tables.get("cmap")!.offset);
  face = {
    bytes,
    unitsPerEm,
    glyphs,
    widths,
    ascent: bytes.readInt16BE(hhea + 4),
    descent: bytes.readInt16BE(hhea + 6),
    bbox: [
      bytes.readInt16BE(head + 36),
      bytes.readInt16BE(head + 38),
      bytes.readInt16BE(head + 40),
      bytes.readInt16BE(head + 42),
    ],
    glyphOf,
  };
  return face;
}

function cmapLookup(bytes: Buffer, cmap: number) {
  const records = bytes.readUInt16BE(cmap + 2);
  let format12 = 0;
  let format4 = 0;
  for (let index = 0; index < records; index += 1) {
    const rec = cmap + 4 + index * 8;
    const sub = cmap + bytes.readUInt32BE(rec + 4);
    const format = bytes.readUInt16BE(sub);
    if (format === 12 && !format12) format12 = sub;
    if (format === 4 && !format4) format4 = sub;
  }
  return (codePoint: number) => {
    if (format12) {
      const groups = bytes.readUInt32BE(format12 + 12);
      let low = 0;
      let high = groups - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        const group = format12 + 16 + mid * 12;
        const start = bytes.readUInt32BE(group);
        const end = bytes.readUInt32BE(group + 4);
        const glyph = bytes.readUInt32BE(group + 8);
        if (codePoint < start) high = mid - 1;
        else if (codePoint > end) low = mid + 1;
        else return glyph + (codePoint - start);
      }
    }
    if (!format4 || codePoint > 0xffff) return 0;
    const segCount = bytes.readUInt16BE(format4 + 6) / 2;
    const endStart = format4 + 14;
    const startStart = endStart + segCount * 2 + 2;
    const deltaStart = startStart + segCount * 2;
    const offsetStart = deltaStart + segCount * 2;
    for (let index = 0; index < segCount; index += 1) {
      const end = bytes.readUInt16BE(endStart + index * 2);
      if (codePoint > end) continue;
      const start = bytes.readUInt16BE(startStart + index * 2);
      if (codePoint < start) return 0;
      const offset = bytes.readUInt16BE(offsetStart + index * 2);
      const delta = bytes.readInt16BE(deltaStart + index * 2);
      if (offset === 0) return (codePoint + delta) & 0xffff;
      const glyph = bytes.readUInt16BE(offsetStart + index * 2 + offset + (codePoint - start) * 2);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

export function arabicFontResource() {
  const loaded = loadFace();
  return {
    bytes: loaded.bytes,
    widths: loaded.widths,
    ascent: loaded.ascent,
    descent: loaded.descent,
    bbox: loaded.bbox,
  };
}

function mark(codePoint: number) {
  return (codePoint >= 0x064b && codePoint <= 0x065f) || codePoint === 0x0670;
}

function letterBefore(chars: number[], index: number) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (mark(chars[cursor])) continue;
    return forms[chars[cursor]] ? chars[cursor] : 0;
  }
  return 0;
}

function letterAfter(chars: number[], index: number) {
  for (let cursor = index + 1; cursor < chars.length; cursor += 1) {
    if (mark(chars[cursor])) continue;
    return forms[chars[cursor]] ? chars[cursor] : 0;
  }
  return 0;
}

function joinsForward(codePoint: number) {
  return (forms[codePoint]?.length ?? 0) === 4;
}

function shapeLogical(text: string) {
  const chars = [...text].map((char) => char.codePointAt(0) ?? 0);
  const shaped: number[] = [];
  for (let index = 0; index < chars.length; index += 1) {
    const codePoint = chars[index];
    if (codePoint === 0x0644) {
      const ligature = lamAlef[chars[index + 1] ?? 0];
      if (ligature) {
        const previous = letterBefore(chars, index);
        shaped.push(previous && joinsForward(previous) ? ligature[1] : ligature[0]);
        index += 1;
        continue;
      }
    }
    const form = forms[codePoint];
    if (!form) {
      shaped.push(codePoint);
      continue;
    }
    const previous = letterBefore(chars, index);
    const next = letterAfter(chars, index);
    const joinPrevious = Boolean(previous && joinsForward(previous));
    const joinNext = Boolean(next && joinsForward(codePoint));
    if (joinPrevious && joinNext && form.length === 4) shaped.push(form[3]);
    else if (joinPrevious) shaped.push(form[1]);
    else if (joinNext && form.length === 4) shaped.push(form[2]);
    else shaped.push(form[0]);
  }
  return shaped;
}

function latinRun(codePoint: number) {
  return (
    (codePoint >= 0x30 && codePoint <= 0x39) ||
    (codePoint >= 0x41 && codePoint <= 0x5a) ||
    (codePoint >= 0x61 && codePoint <= 0x7a) ||
    codePoint === 0x2e ||
    codePoint === 0x2c ||
    codePoint === 0x2f ||
    codePoint === 0x2d ||
    codePoint === 0x3a ||
    codePoint === 0x25
  );
}

function visual(codes: number[]) {
  const arabic = codes.some(
    (code) => (code >= 0x0600 && code <= 0x06ff) || (code >= 0xfb50 && code <= 0xfdff) || (code >= 0xfe70 && code <= 0xfeff),
  );
  if (!arabic) return codes;
  const mirrored = codes.map((code) => (code === 0x28 ? 0x29 : code === 0x29 ? 0x28 : code));
  const reversed = [...mirrored].reverse();
  const ordered: number[] = [];
  let index = 0;
  while (index < reversed.length) {
    if (!latinRun(reversed[index])) {
      ordered.push(reversed[index]);
      index += 1;
      continue;
    }
    let end = index;
    while (end < reversed.length && latinRun(reversed[end])) end += 1;
    ordered.push(...reversed.slice(index, end).reverse());
    index = end;
  }
  return ordered;
}

export type ArabicRun = { ids: number[]; unicodes: number[]; width: number };

export function arabicLines(text: string, size: number, maxWidth: number): ArabicRun[] {
  const loaded = loadFace();
  const logical = shapeLogical(text.trim());
  const measure = (codePoint: number) => {
    const glyph = loaded.glyphOf(codePoint);
    if (!glyph) return 0;
    return ((loaded.widths[glyph] ?? 0) * size) / loaded.unitsPerEm;
  };
  const rows: number[][] = [];
  let row: number[] = [];
  let width = 0;
  const commit = () => {
    while (row[0] === 0x20) row.shift();
    while (row.at(-1) === 0x20) row.pop();
    if (row.length) rows.push(row);
    row = [];
    width = 0;
  };
  for (const codePoint of logical) {
    const advance = measure(codePoint) || size * 0.25;
    if (row.length && width + advance > maxWidth) commit();
    if (codePoint === 0x20 && !row.length) continue;
    row.push(codePoint);
    width += advance;
  }
  commit();
  if (!rows.length) return [];
  return rows.map((codes) => {
    const ordered = visual(codes);
    const ids: number[] = [];
    const unicodes: number[] = [];
    let runWidth = 0;
    for (const codePoint of ordered) {
      const glyph = loaded.glyphOf(codePoint);
      if (!glyph) continue;
      ids.push(glyph);
      unicodes.push(codePoint);
      runWidth += ((loaded.widths[glyph] ?? 0) * size) / loaded.unitsPerEm;
    }
    return { ids, unicodes, width: runWidth };
  });
}
