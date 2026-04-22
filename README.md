# SWAGfront

Small read-only visibility app for inspecting SWAG reverse proxy config files and the Docker containers that appear to sit behind them.

## What it does

- Reads SWAG proxy configs from the environment variable.
- Ignores `.sample` configs by default, with an option to show them in the UI.
- Uses lightweight parsing to extract `server_name`, `proxy_pass`, `upstream_app`, and `upstream_port`.
- Optionally reads Docker container metadata from the local Docker socket.
- Attempts conservative best-effort matching between SWAG configs and Docker containers when Docker inspection is enabled.
- Stays read-only: no config edits, no Docker controls.

## Docker

```yaml
services:
  swagfront:
    image: ghcr.io/ydkmlt84/swagfront
    container_name: swagfront
    hostname: swagfront
    volumes:
      - <your_host_proxyconfs_folder>:/swag/proxy-confs:ro
      - /var/run/docker.sock:/var/run/docker.sock # not necessary if you dont want to use the docker socket
    environment:
      SWAG_PROXY_CONFS_DIR: /swag/proxy-confs
      USE_DOCKER: "true" # or false to disable docker socket use.
      BASE_DOMAIN: example.com
      # Optional: show latest GitHub release info in the UI
      # RELEASE_REPO: owner/repo
    ports:
      - "5559:5559"
```

Key mounts:

- `<your_host_proxyconfs_folder>:/swag/proxy-confs:ro`
- `/var/run/docker.sock:/var/run/docker.sock`

If you do not want any Docker inspection at all, set:

- `USE_DOCKER=false`

When Docker inspection is disabled, you can omit the Docker socket mount entirely. The app will still parse SWAG configs and build target URLs, but container status and matching stay off.

## Matching notes

The matching logic is intentionally simple and conservative. It is possible a match exists between a config file and a currently running container, and no match is found.

## Optional release check

If you want the UI to show the running app version and whether a newer GitHub release exists, set:

- `RELEASE_REPO=owner/repo`

Example:

- `RELEASE_REPO=ydkmlt84/swagfront`

When unset, the UI still shows the current running version, but update checking stays off.

## Safety

- Only `GET` endpoints are implemented
- No file writes outside normal application runtime
- No config editing
- No restart, stop, prune, exec, or shell control features
