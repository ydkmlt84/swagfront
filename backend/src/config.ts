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

export const config = {
  port: 5559,
  swagProxyConfsDir: process.env.SWAG_PROXY_CONFS_DIR ?? "/swag/proxy-confs",
  dockerSocketPath: process.env.DOCKER_SOCKET_PATH ?? defaultDockerSocketPath(),
  baseDomain: (process.env.BASE_DOMAIN ?? "").trim(),
  releaseRepo: (process.env.RELEASE_REPO ?? "").trim()
};
