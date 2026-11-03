import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function loadRootPublicEnv(): Record<string, string> {
  const rootEnvPath = path.resolve(process.cwd(), "..", ".env");
  if (!fs.existsSync(rootEnvPath)) {
    return {};
  }

  const publicVars: Record<string, string> = {};
  const lines = fs.readFileSync(rootEnvPath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) continue;

    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key.startsWith("NEXT_PUBLIC_") && !(key in process.env)) {
      publicVars[key] = val;
    }
  }
  return publicVars;
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: loadRootPublicEnv(),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
