import { deflateSync, inflateSync } from "zlib";
import type { PdfRaster } from "@/lib/plain-pdf";

function jpegSize(bytes: Buffer) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = bytes.readUInt16BE(offset + 2);
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      const components = bytes[offset + 9];
      if (components !== 1 && components !== 3) return null;
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
        colorSpace: components === 1 ? ("DeviceGray" as const) : ("DeviceRGB" as const),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function paeth(left: number, up: number, corner: number) {
  const estimate = left + up - corner;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const cornerDistance = Math.abs(estimate - corner);
  if (leftDistance <= upDistance && leftDistance <= cornerDistance) return left;
  if (upDistance <= cornerDistance) return up;
  return corner;
}

function pngRaster(bytes: Buffer): PdfRaster | null {
  if (
    bytes.length < 8 ||
    bytes[0] !== 0x89 ||
    bytes.toString("ascii", 1, 4) !== "PNG"
  ) {
    return null;
  }
  let width = 0;
  let height = 0;
  let colorType = -1;
  let bitDepth = 0;
  const idat: Buffer[] = [];
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) return null;
    const chunk = bytes.subarray(start, end);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      if (chunk[12] !== 0) return null;
    } else if (type === "PLTE") {
      palette = Buffer.from(chunk);
    } else if (type === "tRNS") {
      transparency = Buffer.from(chunk);
    } else if (type === "IDAT") {
      idat.push(chunk);
    } else if (type === "IEND") {
      break;
    }
    offset = end + 4;
  }
  if (!width || !height || bitDepth !== 8 || width > 1600 || height > 1600) return null;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) return null;
  if (colorType === 3 && !palette) return null;
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }
  const stride = width * channels;
  const expected = height * (stride + 1);
  if (raw.length < expected) return null;
  const samples = Buffer.alloc(height * stride);
  let previous = Buffer.alloc(stride);
  let cursor = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const line = Buffer.from(raw.subarray(cursor, cursor + stride));
    cursor += stride;
    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? line[index - channels] : 0;
      const up = previous[index];
      const corner = index >= channels ? previous[index - channels] : 0;
      const value = line[index];
      if (filter === 1) line[index] = (value + left) & 255;
      else if (filter === 2) line[index] = (value + up) & 255;
      else if (filter === 3) line[index] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) line[index] = (value + paeth(left, up, corner)) & 255;
      else if (filter !== 0) return null;
    }
    line.copy(samples, row * stride);
    previous = line;
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * channels;
    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 255;
    if (colorType === 0) {
      red = green = blue = samples[source];
    } else if (colorType === 4) {
      red = green = blue = samples[source];
      alpha = samples[source + 1];
    } else if (colorType === 2) {
      red = samples[source];
      green = samples[source + 1];
      blue = samples[source + 2];
    } else if (colorType === 6) {
      red = samples[source];
      green = samples[source + 1];
      blue = samples[source + 2];
      alpha = samples[source + 3];
    } else if (palette) {
      const index = samples[source] * 3;
      red = palette[index] ?? 0;
      green = palette[index + 1] ?? 0;
      blue = palette[index + 2] ?? 0;
      if (transparency && samples[source] < transparency.length) alpha = transparency[samples[source]];
    }
    const mix = alpha / 255;
    const target = pixel * 3;
    rgb[target] = Math.round(red * mix + 255 * (1 - mix));
    rgb[target + 1] = Math.round(green * mix + 255 * (1 - mix));
    rgb[target + 2] = Math.round(blue * mix + 255 * (1 - mix));
  }
  return {
    width,
    height,
    colorSpace: "DeviceRGB",
    filter: "FlateDecode",
    data: deflateSync(rgb),
  };
}

export function readLogo(bytes: Buffer): PdfRaster | null {
  if (bytes.length < 16 || bytes.length > 1_500_000) return null;
  const jpeg = jpegSize(bytes);
  if (jpeg && jpeg.width <= 1600 && jpeg.height <= 1600) {
    return {
      width: jpeg.width,
      height: jpeg.height,
      colorSpace: jpeg.colorSpace,
      filter: "DCTDecode",
      data: bytes,
    };
  }
  return pngRaster(bytes);
}
