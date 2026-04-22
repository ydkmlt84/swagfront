# SWAGfront

Small read-only visibility app for inspecting SWAG reverse proxy config files and the Docker containers that appear to sit behind them.

## What it does

- Reads SWAG proxy configs from the environment variable.
- Ignores `.sample` configs by default, with an option to show them in the UI.
- Uses lightweight parsing to extract `server_name`, `proxy_pass`, `upstream_app`, and `upstream_port`.
- Reads Docker container metadata from the local Docker socket.
- Attempts conservative best-effort matching between SWAG configs and Docker containers.
- Stays read-only: no config edits, no Docker controls.

## Docker

```yaml
services:
  swagfront:
    container_name: swagfront
    hostname: swagfront
    volumes:
      - <your_host_proxyconfs_folder>:/swag/proxy-confs:ro
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      SWAG_PROXY_CONFS_DIR: /swag/proxy-confs
      BASE_DOMAIN: example.com
    ports:
      - "5559:5559"
```

Key mounts:

- `<your_host_proxyconfs_folder>:/swag/proxy-confs:ro`
- `/var/run/docker.sock:/var/run/docker.sock`

## Matching notes

The matching logic is intentionally simple and conservative. It is possible a match exists between a config file and a currently running container, and no match is found.

## Safety

- Only `GET` endpoints are implemented
- No file writes outside normal application runtime
- No config editing
- No restart, stop, prune, exec, or shell control features
