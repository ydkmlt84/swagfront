import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { AppUpdateInfo } from "@swagfront/shared";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const rootPackageJsonPath = path.resolve(currentDirectory, "../../package.json");
const CACHE_TTL_MS = 15 * 60 * 1000;

type ReleaseCache = {
  repo: string;
  expiresAt: number;
  value: AppUpdateInfo;
};

type GitHubReleaseResponse = {
  tag_name?: string;
  html_url?: string;
};

let packageVersionCache: string | null = null;
let releaseCache: ReleaseCache | null = null;

async function readCurrentVersion(): Promise<string> {
  if (packageVersionCache) {
    return packageVersionCache;
  }

  try {
    const packageJson = JSON.parse(await readFile(rootPackageJsonPath, "utf8")) as {
      version?: string;
    };
    packageVersionCache = packageJson.version?.trim() || "0.0.0";
  } catch {
    packageVersionCache = "0.0.0";
  }

  return packageVersionCache;
}

function normalizeVersion(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/^v/i, "");
  return normalized || null;
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

export async function getAppUpdateInfo(repo: string): Promise<AppUpdateInfo> {
  const currentVersion = await readCurrentVersion();

  if (!repo) {
    return {
      enabled: false,
      currentVersion,
      latestVersion: null,
      latestUrl: null,
      updateAvailable: false,
      checkedAt: null,
      error: null
    };
  }

  if (releaseCache && releaseCache.repo === repo && releaseCache.expiresAt > Date.now()) {
    return releaseCache.value;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "swagfront"
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub release check failed with ${response.status}`);
    }

    const payload = (await response.json()) as GitHubReleaseResponse;
    const latestVersion = normalizeVersion(payload.tag_name ?? null);
    const normalizedCurrentVersion = normalizeVersion(currentVersion) ?? currentVersion;

    const value: AppUpdateInfo = {
      enabled: true,
      currentVersion,
      latestVersion,
      latestUrl: payload.html_url ?? null,
      updateAvailable:
        latestVersion !== null &&
        compareVersions(latestVersion, normalizedCurrentVersion) > 0,
      checkedAt: new Date().toISOString(),
      error: null
    };

    releaseCache = {
      repo,
      expiresAt: Date.now() + CACHE_TTL_MS,
      value
    };

    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown release check error";
    const value: AppUpdateInfo = {
      enabled: true,
      currentVersion,
      latestVersion: null,
      latestUrl: null,
      updateAvailable: false,
      checkedAt: new Date().toISOString(),
      error: message
    };

    releaseCache = {
      repo,
      expiresAt: Date.now() + CACHE_TTL_MS,
      value
    };

    return value;
  }
}
