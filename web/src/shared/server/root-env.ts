import fs from "node:fs";
import path from "node:path";

let cachedRootEnv: Record<string, string> | null = null;

function loadRootEnvFile(): Record<string, string> {
  if (cachedRootEnv) return cachedRootEnv;
  const result: Record<string, string> = {};
  try {
    const candidates = [
      path.resolve(process.cwd(), "..", ".env"),
      path.resolve(process.cwd(), ".env"),
    ];
    for (const envPath of candidates) {
      if (!fs.existsSync(envPath)) continue;
      const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx <= 0) continue;
        const key = line.slice(0, eqIdx).trim();
        const val = line
          .slice(eqIdx + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");
        if (!(key in result)) {
          result[key] = val;
        }
      }
    }
  } catch {
    // Restricted runtimes may not allow fs access; fall back to process.env only
  }
  cachedRootEnv = result;
  return result;
}

function isUsableSecret(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    !trimmed.startsWith("your_") &&
    trimmed !== "CHANGE_ME"
  );
}

/**
 * Reads a server-only secret from process.env first, then from monorepo root `.env`.
 */
export function readServerSecret(...keys: string[]): string | null {
  for (const key of keys) {
    const fromProcess = process.env[key];
    if (isUsableSecret(fromProcess)) return fromProcess.trim();
  }
  const fileEnv = loadRootEnvFile();
  for (const key of keys) {
    const fromFile = fileEnv[key];
    if (isUsableSecret(fromFile)) return fromFile.trim();
  }
  return null;
}

