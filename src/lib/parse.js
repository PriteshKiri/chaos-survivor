import Papa from "papaparse";
import * as XLSX from "xlsx";

// Header candidates checked (in priority order) for auto-detecting the name column.
const NAME_HEADER_PRIORITY = [
  "full name",
  "fullname",
  "your name",
  "name",
  "participant",
  "participant name",
  "attendee",
  "attendee name",
  "first name",
  "firstname",
];

function normalizeHeader(h) {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Parse a File (CSV or XLSX) into { headers, rows }.
 * rows is an array of plain objects keyed by the original header strings.
 */
export async function parseFile(file) {
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const headers = rows.length ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }

  // CSV (and anything else) via PapaParse
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        resolve({ headers, rows: result.data });
      },
      error: reject,
    });
  });
}

/**
 * Try to confidently pick the name column from headers.
 * Returns the matching header string, or null if not confident.
 */
export function detectNameColumn(headers) {
  if (!headers || headers.length === 0) return null;

  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  // Exact normalized match against priority list
  for (const candidate of NAME_HEADER_PRIORITY) {
    const hit = normalized.find((h) => h.norm === candidate);
    if (hit) return hit.raw;
  }

  // Contains "name" but not obviously something else (username/nickname are fine too)
  const contains = normalized.filter((h) => h.norm.includes("name"));
  if (contains.length === 1) return contains[0].raw;

  return null;
}

/**
 * Extract a cleaned, de-duplicated list of names from rows using the given column.
 */
export function extractNames(rows, column) {
  const seen = new Set();
  const names = [];
  for (const row of rows) {
    const value = String(row[column] ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(value);
  }
  return names;
}
