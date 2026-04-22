import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
export const envPath = path.resolve(currentDirectory, "../../.env");

dotenv.config({ path: envPath, quiet: true });

function defaultDockerSocketPath(): string {
  return process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export const config = {
  port: 5559,
  swagProxyConfsDir: process.env.SWAG_PROXY_CONFS_DIR ?? "/swag/proxy-confs",
  useDocker: parseBooleanEnv(process.env.USE_DOCKER, true),
  dockerSocketPath: process.env.DOCKER_SOCKET_PATH ?? defaultDockerSocketPath(),
  baseDomain: (process.env.BASE_DOMAIN ?? "").trim(),
  releaseRepo: (process.env.RELEASE_REPO ?? "").trim()
};
