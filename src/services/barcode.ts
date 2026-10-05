// Barcode generation + dependency-free SVG rendering (EAN-13, EAN-8, Code 128-B fallback).
// Generated codes are EAN-13 with the in-store prefix '200' so they pass the cashier scanner's
// default validation (digits only, 8 or 13 characters).

export const STORE_PREFIX = '200';

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
// Parity of the left 6 digits chosen by the first digit (L=0, G=1).
const EAN13_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

export const eanCheckDigit = (body: string): number => {
  // body = all digits except the check digit. Weights alternate 3,1 starting from the rightmost.
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
};

export const isValidEan = (code: string): boolean =>
  /^\d+$/.test(code) && (code.length === 13 || code.length === 8) &&
  eanCheckDigit(code.slice(0, -1)) === Number(code[code.length - 1]);

/** Generate an in-store EAN-13 not present in `taken` (compared lowercased/trimmed). */
export const generateEan13 = (taken: Iterable<string | undefined>): string => {
  const used = new Set<string>();
  for (const t of taken) {
    const n = t?.trim().toLowerCase();
    if (n) used.add(n);
  }
  for (let attempt = 0; attempt < 10000; attempt++) {
    let body = STORE_PREFIX;
    for (let i = 0; i < 9; i++) body += Math.floor(Math.random() * 10);
    const code = body + eanCheckDigit(body);
    if (!used.has(code)) return code;
  }
  throw new Error('Could not generate a unique barcode');
};

export const encodeEan13 = (code: string): string => {
  const parity = EAN13_PARITY[Number(code[0])];
  let bits = '101';
  for (let i = 0; i < 6; i++) {
    const d = Number(code[i + 1]);
    bits += parity[i] === 'L' ? L[d] : G[d];
  }
  bits += '01010';
  for (let i = 7; i < 13; i++) bits += R[Number(code[i])];
  return bits + '101';
};

export const encodeEan8 = (code: string): string => {
  let bits = '101';
  for (let i = 0; i < 4; i++) bits += L[Number(code[i])];
  bits += '01010';
  for (let i = 4; i < 8; i++) bits += R[Number(code[i])];
  return bits + '101';
};

// Code 128 bar/space width patterns, values 0..106 (106 = stop, 7 elements).
const C128 = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 ' +
  '123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 ' +
  '232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 ' +
  '313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 ' +
  '111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 ' +
  '114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'
).split(' ');

export const CODE128_PATTERNS = C128;

export const encodeCode128B = (text: string): string => {
  const values = [104];
  for (const ch of text) values.push(ch.charCodeAt(0) - 32);
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  values.push(sum % 103, 106);
  let bits = '';
  for (const v of values) {
    const pattern = C128[v];
    for (let i = 0; i < pattern.length; i++) bits += (i % 2 === 0 ? '1' : '0').repeat(Number(pattern[i]));
  }
  return bits;
};

export type BarcodeSymbology = 'EAN-13' | 'EAN-8' | 'Code 128';

export const encodeBarcode = (value: string): { bits: string; symbology: BarcodeSymbology; quiet: number } => {
  if (value.length === 13 && isValidEan(value)) return { bits: encodeEan13(value), symbology: 'EAN-13', quiet: 11 };
  if (value.length === 8 && isValidEan(value)) return { bits: encodeEan8(value), symbology: 'EAN-8', quiet: 7 };
  // Code 128-B covers printable ASCII; replace anything else so rendering never throws.
  const safe = value.replace(/[^\x20-\x7e]/g, '?');
  return { bits: encodeCode128B(safe), symbology: 'Code 128', quiet: 10 };
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface BarcodeCardOptions {
  value: string;
  name: string;
  subtitle?: string;
}

/**
 * Self-contained SVG for a barcode card: name label, crisp bars, number beneath.
 * Units are barcode modules; scale via width/height when rasterizing.
 */
export const buildBarcodeCardSvg = ({ value, name, subtitle }: BarcodeCardOptions): { svg: string; width: number; height: number } => {
  const { bits, quiet } = encodeBarcode(value);
  const pad = 4;
  const width = bits.length + quiet * 2;
  const nameY = pad + 9;
  const subY = nameY + 8;
  const barTop = subtitle ? subY + 4 : nameY + 5;
  const barH = 46;
  const textY = barTop + barH + 9;
  const height = textY + pad + 2;

  let rects = '';
  for (let i = 0; i < bits.length; ) {
    if (bits[i] === '1') {
      let j = i;
      while (j < bits.length && bits[j] === '1') j++;
      rects += `<rect x="${quiet + i}" y="${barTop}" width="${j - i}" height="${barH}"/>`;
      i = j;
    } else i++;
  }
  const label = name.length > 26 ? name.slice(0, 25) + '…' : name;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">` +
    `<rect width="${width}" height="${height}" fill="#fff"/>` +
    `<text x="${width / 2}" y="${nameY}" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="8" font-weight="700" fill="#000">${esc(label)}</text>` +
    (subtitle ? `<text x="${width / 2}" y="${subY}" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="5" fill="#444">${esc(subtitle)}</text>` : '') +
    `<g fill="#000">${rects}</g>` +
    `<text x="${width / 2}" y="${textY}" text-anchor="middle" font-family="Menlo,Consolas,monospace" font-size="8" letter-spacing="1.5" fill="#000" shape-rendering="auto">${esc(value)}</text>` +
    `</svg>`;
  return { svg, width, height };
};

export const svgToDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Rasterize an SVG string to a PNG blob (width in px). */
export const svgToPngBlob = (svg: string, w: number, h: number, pxWidth = 1200): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = pxWidth / w;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
    };
    img.onerror = () => reject(new Error('Could not render barcode image'));
    img.src = svgToDataUrl(svg);
  });
