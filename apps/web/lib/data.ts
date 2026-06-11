/**
 * Server-side readers for the JSON / CSV reports produced by the Python pipeline.
 * All reads happen on the Node side (Next.js server components) — nothing is fetched
 * from the client.
 */
import fs from "fs";
import path from "path";

const REPORTS_DIR = path.resolve(process.cwd(), "..", "..", "reports");
const SUBMISSIONS_DIR = path.resolve(process.cwd(), "..", "..", "submissions");

export function reportsDir() {
  return REPORTS_DIR;
}

export function submissionsDir() {
  return SUBMISSIONS_DIR;
}

export function readJson<T = any>(name: string): T | null {
  const p = path.join(REPORTS_DIR, name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

export function readCsv(name: string): Record<string, string>[] {
  const p = path.join(REPORTS_DIR, name);
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf-8").trim();
  const lines = raw.split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const parts = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = parts[i]));
    return obj;
  });
}

export function readSubmissionPreview(filename: string, max: number = 12) {
  const p = path.join(SUBMISSIONS_DIR, filename);
  if (!fs.existsSync(p)) return { rows: [] as { id: string; corrosion_risk: string }[], total: 0 };
  const raw = fs.readFileSync(p, "utf-8").trim();
  const lines = raw.split(/\r?\n/);
  const headers = lines[0].split(",");
  const rows = lines.slice(1, 1 + max).map((line) => {
    const parts = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = parts[i]));
    return obj as { id: string; corrosion_risk: string };
  });
  return { rows, total: lines.length - 1 };
}

export function listSubmissions(): { name: string; bytes: number }[] {
  if (!fs.existsSync(SUBMISSIONS_DIR)) return [];
  return fs
    .readdirSync(SUBMISSIONS_DIR)
    .filter((f) => f.endsWith(".csv"))
    .map((f) => ({
      name: f,
      bytes: fs.statSync(path.join(SUBMISSIONS_DIR, f)).size,
    }));
}
