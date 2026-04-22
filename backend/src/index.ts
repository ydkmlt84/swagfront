import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import express from "express";
import { DockerContainerInfo, ProxiesResponse, ProxyRow } from "@swagfront/shared";
import { config, envPath } from "./config.js";
import { inspectContainers } from "./dockerClient.js";
import { matchProxyToContainer } from "./dockerMatching.js";
import { readProxyConfigs } from "./proxyConfigParser.js";
import { getAppUpdateInfo } from "./releaseCheck.js";

const app = express();
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const frontendDistPath = path.resolve(currentDirectory, "../../frontend/dist");

if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/proxies", async (request, response) => {
  const includeSamples = request.query.includeSamples === "true";

  try {
    const proxyConfigs = await readProxyConfigs(config.swagProxyConfsDir, includeSamples, config.baseDomain);
    const warnings: string[] = [];
    const appInfo = await getAppUpdateInfo(config.releaseRepo);
    let containers: DockerContainerInfo[] = [];

    try {
      containers = await inspectContainers(config.dockerSocketPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Docker inspection error";
      console.warn(`[api] Docker metadata unavailable: ${message}`);
      warnings.push(`Docker metadata unavailable: ${message}`);
    }

    const rows: ProxyRow[] = proxyConfigs.map((proxyConfig) => {
      const match = matchProxyToContainer(proxyConfig, containers);

      return {
        ...proxyConfig,
        docker: match.docker,
        match: {
          confidence: match.confidence,
          matchedContainerName: match.matchedContainerName,
          reason: match.reason
        },
        detectedProxyTarget:
          proxyConfig.proxyPassTarget ??
          ([proxyConfig.upstreamApp, proxyConfig.upstreamPort].filter(Boolean).join(":") || null)
      };
    });

    const payload: ProxiesResponse = {
      generatedAt: new Date().toISOString(),
      includeSamples,
      warnings,
      app: appInfo,
      rows
    };

    response.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown read-only inspection error";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[api] Failed to load proxy visibility data");
    console.error(`[api] Details: ${message}`);
    if (stack) {
      console.error(stack);
    }
    response.status(500).json({
      error: "Failed to load proxy visibility data",
      details: message
    });
  }
});

if (existsSync(frontendDistPath)) {
  app.get("/{*path}", (request, response, next) => {
    if (request.path.startsWith("/api/")) {
      next();
      return;
    }

    response.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.listen(config.port, () => {
  console.log(`swagfront backend listening on http://localhost:${config.port}`);
  console.log(`[startup] Loaded env file: ${envPath}`);
});
