import { DockerContainerInfo, MatchConfidence, ProxyConfigInfo, ProxyMatchInfo } from "@swagfront/shared";

type MatchResult = ProxyMatchInfo & {
  docker: DockerContainerInfo | null;
};

type CandidateMatch = {
  container: DockerContainerInfo;
  score: number;
  reasons: string[];
  hasExactNameEvidence: boolean;
  hasMeaningfulNameEvidence: boolean;
};

const ignoredTokens = new Set([
  "bak",
  "backup",
  "conf",
  "default",
  "docker",
  "sample",
  "subdomain",
  "subfolder"
]);

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isIpAddress(value: string | null | undefined): boolean {
  const normalized = normalize(value);
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized);
}

function tokenize(value: string | null | undefined): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => token.length >= 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !ignoredTokens.has(token));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function scoreNameSimilarity(configTokens: string[], containerTokens: string[]): string[] {
  const overlap = configTokens.filter((token) => containerTokens.includes(token));
  return unique(overlap);
}

function getFilenameStem(filename: string): string {
  return filename.replace(/\.(?:sample|bak)$/i, "").replace(/\.[^.]+$/i, "");
}

export function matchProxyToContainer(config: ProxyConfigInfo, containers: DockerContainerInfo[]): MatchResult {
  let best: CandidateMatch | undefined;
  let tied = false;

  const configTokens = unique([
    ...(!isIpAddress(config.upstreamApp) ? tokenize(config.upstreamApp) : []),
    ...(!isIpAddress(config.proxyPassHost) ? tokenize(config.proxyPassHost) : []),
    ...tokenize(getFilenameStem(config.filename)),
    ...config.serverNames.flatMap((name) => tokenize(name))
  ]);

  for (const container of containers) {
    let score = 0;
    const reasons: string[] = [];
    const aliases = unique([container.name, ...container.aliases]);
    const containerTokens = tokenize(aliases.join(" "));
    let hasExactNameEvidence = false;
    let hasMeaningfulNameEvidence = false;

    if (config.upstreamApp && aliases.some((alias) => normalize(alias) === normalize(config.upstreamApp))) {
      score += 5;
      reasons.push("exact upstream_app match");
      hasExactNameEvidence = true;
      hasMeaningfulNameEvidence = true;
    }

    if (config.proxyPassHost && aliases.some((alias) => normalize(alias) === normalize(config.proxyPassHost))) {
      score += 4;
      reasons.push("exact proxy_pass host match");
      hasExactNameEvidence = true;
      hasMeaningfulNameEvidence = true;
    }

    const overlappingTokens = scoreNameSimilarity(configTokens, containerTokens);
    if (overlappingTokens.length > 0) {
      score += Math.min(overlappingTokens.length, 3);
      reasons.push(`name similarity (${overlappingTokens.join(", ")})`);
      hasMeaningfulNameEvidence = true;
    }

    if (config.upstreamPort && container.exposedContainerPorts.includes(config.upstreamPort)) {
      score += 3;
      reasons.push("upstream_port matches exposed port");
    }

    if (config.proxyPassPort && container.exposedContainerPorts.includes(config.proxyPassPort)) {
      score += 2;
      reasons.push("proxy_pass port matches exposed port");
    }

    if (score === 0) {
      continue;
    }

    if (!hasMeaningfulNameEvidence) {
      continue;
    }

    if (container.status !== "running" && !hasExactNameEvidence) {
      continue;
    }

    if (!best || score > best.score) {
      best = { container, score, reasons, hasExactNameEvidence, hasMeaningfulNameEvidence };
      tied = false;
      continue;
    }

    if (best && score === best.score) {
      tied = true;
    }
  }

  if (!best) {
    return {
      docker: null,
      confidence: "none",
      matchedContainerName: null,
      reason: "No reasonable container match found"
    };
  }

  if (tied) {
    return {
      docker: null,
      confidence: "none",
      matchedContainerName: null,
      reason: "Multiple possible containers matched with similar confidence"
    };
  }

  let confidence: MatchConfidence = "low";
  if (best.score >= 7) {
    confidence = "high";
  } else if (best.score >= 4) {
    confidence = "medium";
  }

  if (confidence === "low" && !best.hasExactNameEvidence) {
    return {
      docker: null,
      confidence: "none",
      matchedContainerName: null,
      reason: "Only weak name similarity was found; leaving unmatched"
    };
  }

  return {
    docker: best.container,
    confidence,
    matchedContainerName: best.container.name,
    reason: best.reasons.join(", ")
  };
}
