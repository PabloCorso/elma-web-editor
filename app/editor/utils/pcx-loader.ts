import type { PictureData } from "elmajs";

type DecodedPcx = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

const PCX_HEADER_SIZE = 128;
const VGA_PALETTE_SIZE = 769; // 0x0C marker + 256 * 3 bytes

function decodePcx(pcx: Uint8Array): DecodedPcx {
  if (pcx.length < PCX_HEADER_SIZE + VGA_PALETTE_SIZE) {
    throw new Error("PCX buffer too small");
  }

  const dataView = new DataView(pcx.buffer, pcx.byteOffset, pcx.byteLength);
  const manufacturer = dataView.getUint8(0);
  const _version = dataView.getUint8(1);
  const encoding = dataView.getUint8(2);
  const bitsPerPixel = dataView.getUint8(3);

  if (manufacturer !== 0x0a || encoding !== 1 || bitsPerPixel !== 8) {
    throw new Error("Unsupported PCX format (expected 8-bit RLE)");
  }

  const xMin = dataView.getUint16(4, true);
  const yMin = dataView.getUint16(6, true);
  const xMax = dataView.getUint16(8, true);
  const yMax = dataView.getUint16(10, true);
  const width = xMax - xMin + 1;
  const height = yMax - yMin + 1;
  const bytesPerLine = dataView.getUint16(66, true);
  const planes = dataView.getUint8(65);

  if (planes !== 1) {
    throw new Error("Unsupported PCX planes (expected 1)");
  }

  const paletteMarkerIndex = pcx.length - VGA_PALETTE_SIZE;
  if (pcx[paletteMarkerIndex] !== 0x0c) {
    throw new Error("Missing VGA palette marker in PCX");
  }

  // Decode RLE pixel indices
  const decoded = new Uint8Array(bytesPerLine * height);
  let src = PCX_HEADER_SIZE;
  let dst = 0;

  while (dst < decoded.length && src < paletteMarkerIndex) {
    const value = pcx[src++];
    if ((value & 0xc0) === 0xc0) {
      const runLength = value & 0x3f;
      const data = pcx[src++];
      decoded.fill(data, dst, dst + runLength);
      dst += runLength;
    } else {
      decoded[dst++] = value;
    }
  }

  if (dst < decoded.length) {
    throw new Error("PCX RLE decode ended early");
  }

  // Build RGBA buffer from palette + indices
  const palette = pcx.subarray(
    paletteMarkerIndex + 1,
    paletteMarkerIndex + VGA_PALETTE_SIZE
  );
  const pixels = new Uint8ClampedArray(width * height * 4);
  // Transparency: for object sprites, the color of the top-left pixel is transparent.
  // Determine the palette index of the top-left pixel from decoded data (first byte).
  let transparentIndex = decoded[0];
  // Fallback to palette index 0 if decoded[0] is out of range.
  if (transparentIndex * 3 + 2 >= palette.length) transparentIndex = 0;

  for (let y = 0; y < height; y++) {
    const lineOffset = y * bytesPerLine;
    for (let x = 0; x < width; x++) {
      const idx = decoded[lineOffset + x];
      const palOffset = idx * 3;
      const outOffset = (y * width + x) * 4;
      const r = palette[palOffset];
      const g = palette[palOffset + 1];
      const b = palette[palOffset + 2];
      pixels[outOffset] = r;
      pixels[outOffset + 1] = g;
      pixels[outOffset + 2] = b;
      // Treat the palette index used by the top-left pixel as transparent.
      pixels[outOffset + 3] = idx === transparentIndex ? 0 : 255;
    }
  }

  return { width, height, pixels };
}

export function pcxToImageBitmap(pcxData: Uint8Array) {
  const { width, height, pixels } = decodePcx(pcxData);
  // Clone into a new buffer (ensures ArrayBuffer, not SharedArrayBuffer).
  const clamped = new Uint8ClampedArray(pixels.length);
  clamped.set(pixels);
  const imageData = new ImageData(clamped, width, height);
  return createImageBitmap(imageData);
}

export async function decodeLgrPictureBitmap(picture: PictureData) {
  const bytes = new Uint8Array(
    picture.data.buffer,
    picture.data.byteOffset,
    picture.data.byteLength
  );
  return pcxToImageBitmap(bytes);
}
