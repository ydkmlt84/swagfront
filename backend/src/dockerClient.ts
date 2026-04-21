import Docker from "dockerode";
import { DockerContainerInfo } from "@swagfront/shared";

function toPortMappings(
  ports: Array<{ IP?: string; PrivatePort?: number; PublicPort?: number; Type?: string }>
): { publishedHostPorts: string[]; exposedContainerPorts: string[]; portMappings: string[] } {
  const publishedHostPorts = new Set<string>();
  const exposedContainerPorts = new Set<string>();
  const portMappings = new Set<string>();

  for (const port of ports) {
    if (port.PrivatePort !== undefined) {
      const containerPort = String(port.PrivatePort);
      exposedContainerPorts.add(containerPort);
      if (port.PublicPort !== undefined) {
        const hostPort = String(port.PublicPort);
        publishedHostPorts.add(hostPort);
        portMappings.add(`${hostPort}:${containerPort}`);
      }
    }
  }

  return {
    publishedHostPorts: [...publishedHostPorts].sort(),
    exposedContainerPorts: [...exposedContainerPorts].sort((a, b) => Number(a) - Number(b)),
    portMappings: [...portMappings].sort((a, b) => {
      const [hostA = "0"] = a.split(":");
      const [hostB = "0"] = b.split(":");
      return Number(hostA) - Number(hostB);
    })
  };
}

export async function inspectContainers(socketPath: string): Promise<DockerContainerInfo[]> {
  const docker = new Docker({ socketPath });
  const containers = await docker.listContainers({ all: true });

  return containers.map((container) => {
    const name = container.Names?.[0]?.replace(/^\//, "") ?? container.Id.slice(0, 12);
    const aliases = (container.Names ?? []).map((value) => value.replace(/^\//, ""));
    const mappings = toPortMappings(container.Ports ?? []);
    const state = container.State === "running" ? "running" : container.State === "exited" ? "stopped" : "unknown";

    return {
      id: container.Id,
      name,
      aliases,
      status: state,
      publishedHostPorts: mappings.publishedHostPorts,
      exposedContainerPorts: mappings.exposedContainerPorts,
      portMappings: mappings.portMappings
    };
  });
}
