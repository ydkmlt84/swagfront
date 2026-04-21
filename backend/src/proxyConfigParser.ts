import { promises as fs } from "node:fs";
import path from "node:path";
import { ProxyConfigInfo } from "@swagfront/shared";

type ParsedTokens = {
  serverNames: string[];
  subfolderPaths: string[];
  proxyPassTarget: string | null;
  proxyPassHost: string | null;
  proxyPassPort: string | null;
  upstreamApp: string | null;
  upstreamPort: string | null;
};

function stripComments(line: string): string {
  const hashIndex = line.indexOf("#");
  return hashIndex >= 0 ? line.slice(0, hashIndex) : line;
}

function extractVariable(content: string, variableName: string): string | null {
  const pattern = new RegExp(`\\bset\\s+\\$${variableName}\\s+("?)([^";\\s]+)\\1\\s*;`, "i");
  const match = content.match(pattern);
  return match?.[2] ?? null;
}

function extractServerNames(content: string): string[] {
  const names = new Set<string>();
  const regex = /\bserver_name\s+([^;]+);/gi;

  for (const match of content.matchAll(regex)) {
    const tokens = match[1]
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .filter((value) => value !== "_");

    for (const token of tokens) {
      names.add(token);
    }
  }

  return [...names];
}

function extractProxyPassTarget(content: string): string | null {
  const regex = /\bproxy_pass\s+([^;]+);/gi;
  for (const match of content.matchAll(regex)) {
    const target = match[1].trim();
    if (target && !target.includes("$upstream_proto://$upstream_app:$upstream_port")) {
      return target;
    }
  }
  return null;
}

function extractSubfolderPaths(content: string): string[] {
  const paths = new Set<string>();
  const regex = /\blocation\s+([^\s{]+)\s*\{/gi;

  for (const match of content.matchAll(regex)) {
    const candidate = match[1]?.trim();
    if (!candidate || !candidate.startsWith("/")) {
      continue;
    }

    if (candidate === "/" || candidate.includes("$")) {
      continue;
    }

    const cleaned = candidate.replace(/\/+$/, "");
    if (cleaned) {
      paths.add(cleaned);
    }
  }

  return [...paths];
}

function parseHostAndPort(target: string | null): Pick<ParsedTokens, "proxyPassHost" | "proxyPassPort"> {
  if (!target) {
    return { proxyPassHost: null, proxyPassPort: null };
  }

  const cleaned = target.replace(/\/+$/, "");

  try {
    const parsed = new URL(cleaned);
    return {
      proxyPassHost: parsed.hostname || null,
      proxyPassPort: parsed.port || (parsed.protocol === "https:" ? "443" : parsed.protocol === "http:" ? "80" : null)
    };
  } catch {
    const fallback = cleaned.match(/^(?:[a-z]+:\/\/)?([^:/\s]+)(?::(\d+))?/i);
    return {
      proxyPassHost: fallback?.[1] ?? null,
      proxyPassPort: fallback?.[2] ?? null
    };
  }
}

function resolveServerNameToPublicHost(serverName: string, baseDomain: string): string {
  const trimmed = serverName.trim();

  if (!baseDomain) {
    return trimmed;
  }

  if (trimmed === "*") {
    return baseDomain;
  }

  if (trimmed.endsWith(".*")) {
    return `${trimmed.slice(0, -2)}.${baseDomain}`;
  }

  return trimmed;
}

function derivePublicUrls(serverNames: string[], subfolderPaths: string[], baseDomain: string): string[] {
  if (serverNames.length > 0) {
    return serverNames.map((name) => `https://${resolveServerNameToPublicHost(name, baseDomain)}`);
  }

  if (baseDomain && subfolderPaths.length > 0) {
    return subfolderPaths.map((subfolderPath) => `https://${baseDomain}${subfolderPath}`);
  }

  return [];
}

function isSupportedProxyConfigFile(filename: string): boolean {
  return (
    filename.endsWith(".subdomain.conf")
    || filename.endsWith(".subdomain.conf.sample")
    || filename.endsWith(".subfolder.conf")
    || filename.endsWith(".subfolder.conf.sample")
  );
}

function parseConfigContent(content: string): ParsedTokens {
  const normalized = content
    .split("\n")
    .map((line) => stripComments(line).trim())
    .join("\n");

  const serverNames = extractServerNames(normalized);
  const subfolderPaths = extractSubfolderPaths(normalized);
  const upstreamApp = extractVariable(normalized, "upstream_app");
  const upstreamPort = extractVariable(normalized, "upstream_port");
  const proxyPassTarget = extractProxyPassTarget(normalized);
  const { proxyPassHost, proxyPassPort } = parseHostAndPort(proxyPassTarget);

  return {
    serverNames,
    subfolderPaths,
    proxyPassTarget,
    proxyPassHost,
    proxyPassPort,
    upstreamApp,
    upstreamPort
  };
}

export async function readProxyConfigs(
  directoryPath: string,
  includeSamples: boolean,
  baseDomain: string
): Promise<ProxyConfigInfo[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && isSupportedProxyConfigFile(entry.name));
  const results: ProxyConfigInfo[] = [];

  for (const file of files) {
    const isSample = file.name.endsWith(".sample");
    if (isSample && !includeSamples) {
      continue;
    }

    const fullPath = path.join(directoryPath, file.name);
    try {
      const [content, stats] = await Promise.all([
        fs.readFile(fullPath, "utf8"),
        fs.stat(fullPath)
      ]);

      const parsed = parseConfigContent(content);

      results.push({
        filename: file.name,
        isSample,
        publicUrls: derivePublicUrls(parsed.serverNames, parsed.subfolderPaths, baseDomain),
        serverNames: parsed.serverNames,
        proxyPassTarget: parsed.proxyPassTarget,
        proxyPassHost: parsed.proxyPassHost,
        proxyPassPort: parsed.proxyPassPort,
        upstreamApp: parsed.upstreamApp,
        upstreamPort: parsed.upstreamPort,
        lastModified: stats.mtime.toISOString()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown config parsing error";
      console.error(`[proxyConfigParser] Failed to read or parse "${file.name}": ${message}`);
    }
  }

  return results.sort((a, b) => a.filename.localeCompare(b.filename));
}
