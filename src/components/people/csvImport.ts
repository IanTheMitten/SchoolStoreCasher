// Parses a student list in the form `barcode|name|grade`. The delimiter is auto-detected
// (| , ; or tab) and a header row is skipped if present.

export interface StudentCsvRow {
  barcode: string;
  name: string;
  grade: string;
}

export interface StudentCsvParseResult {
  rows: StudentCsvRow[];
  /** Human-readable problems, e.g. "Line 4: missing name". */
  problems: string[];
}

const DELIMITERS = ['|', '\t', ';', ','];

const detectDelimiter = (lines: string[]) => {
  const sample = lines.slice(0, 10).join('\n');
  let best = '|';
  let bestCount = 0;
  for (const d of DELIMITERS) {
    const count = sample.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
};

// Minimal quote handling: "a, b" stays one cell, "" is an escaped quote.
const splitLine = (line: string, delimiter: string) => {
  const cells: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"' && cur.trim() === '') {
      quoted = true;
      cur = '';
    } else if (ch === delimiter) {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
};

/** "G7", "g 7", "7", "Grade 7" → "Grade 7"; anything else (e.g. 국내반) is kept as written. */
export const normalizeGrade = (raw: string) => {
  const value = raw.trim();
  const match = value.match(/^(?:g(?:rade)?\.?\s*)?(\d{1,2})$/i);
  return match ? `Grade ${Number(match[1])}` : value;
};

const isHeader = (cells: string[]) =>
  cells.some(c => /^(barcode|name|grade|student|id)$/i.test(c));

export function parseStudentCsv(text: string): StudentCsvParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\n|\r/);
  const nonEmpty = lines.filter(l => l.trim());
  const delimiter = detectDelimiter(nonEmpty);

  const problems: string[] = [];
  const byBarcode = new Map<string, { row: StudentCsvRow; line: number }>();
  let sawFirst = false;

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (!line.trim()) return;
    const cells = splitLine(line, delimiter);
    if (!sawFirst) {
      sawFirst = true;
      if (isHeader(cells)) return;
    }

    const [barcode = '', name = '', grade = ''] = cells;
    if (!barcode) { problems.push(`Line ${lineNo}: missing barcode`); return; }
    if (!name) { problems.push(`Line ${lineNo}: missing name`); return; }

    const key = barcode.toLowerCase();
    const prev = byBarcode.get(key);
    if (prev) problems.push(`Line ${lineNo}: barcode ${barcode} repeats line ${prev.line}, using line ${lineNo}`);
    byBarcode.set(key, { row: { barcode, name, grade: normalizeGrade(grade) }, line: lineNo });
  });

  return { rows: Array.from(byBarcode.values()).map(v => v.row), problems };
}
