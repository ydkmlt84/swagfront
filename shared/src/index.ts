export type DockerContainerInfo = {
  id: string;
  name: string;
  aliases: string[];
  status: "running" | "stopped" | "unknown";
  publishedHostPorts: string[];
  exposedContainerPorts: string[];
  portMappings: string[];
};

export type ProxyConfigInfo = {
  filename: string;
  isSample: boolean;
  publicUrls: string[];
  serverNames: string[];
  proxyPassTarget: string | null;
  proxyPassHost: string | null;
  proxyPassPort: string | null;
  upstreamApp: string | null;
  upstreamPort: string | null;
  lastModified: string;
};

export type MatchConfidence = "high" | "medium" | "low" | "none";

export type ProxyMatchInfo = {
  confidence: MatchConfidence;
  matchedContainerName: string | null;
  reason: string;
};

export type ProxyRow = ProxyConfigInfo & {
  docker: DockerContainerInfo | null;
  match: ProxyMatchInfo;
  detectedProxyTarget: string | null;
};

export type AppUpdateInfo = {
  enabled: boolean;
  currentVersion: string;
  latestVersion: string | null;
  latestUrl: string | null;
  updateAvailable: boolean;
  checkedAt: string | null;
  error: string | null;
};

export type ProxiesResponse = {
  generatedAt: string;
  includeSamples: boolean;
  dockerEnabled: boolean;
  warnings: string[];
  app: AppUpdateInfo;
  rows: ProxyRow[];
};
