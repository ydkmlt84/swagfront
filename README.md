# swagfront

Small read-only visibility app for inspecting SWAG reverse proxy config files and the Docker containers that appear to sit behind them.

## What it does

- Reads SWAG proxy configs from `/swag/proxy-confs`
- Ignores `.sample` configs by default, with an option to show them in the UI
- Uses lightweight parsing to extract `server_name`, `proxy_pass`, `upstream_app`, and `upstream_port`
- Reads Docker container metadata from the local Docker socket or Windows named pipe
- Attempts conservative best-effort matching between SWAG configs and Docker containers
- Exposes a single backend data endpoint at `GET /api/proxies`
- Stays read-only: no config edits, no Docker controls, no shell-based mutation logic

## Project layout

- `shared`: shared TypeScript types
- `backend`: Express API that reads SWAG and Docker data
- `frontend`: React + Vite dashboard

## Local development

### Requirements

- Node.js 22+
- Yarn 4+
- Access to a SWAG config directory
- Access to the Docker socket if you want live container inspection

### Install

```bash
yarn install
```

Create a root `.env` file if you want local dev values loaded automatically by both the backend and frontend.

### Run the backend

```bash
yarn dev:backend
```

Backend environment variables:

- `SWAG_PROXY_CONFS_DIR`: SWAG proxy config directory, default `/swag/proxy-confs`
- `DOCKER_SOCKET_PATH`: Docker connection path, default `//./pipe/docker_engine` on Windows and `/var/run/docker.sock` on Linux
- `BASE_DOMAIN`: optional base domain used to build full public URLs for subfolder configs, such as `example.com`

### Run the frontend

```bash
yarn dev:frontend
```

Frontend environment variables:

- None required for the current setup. In dev, Vite proxies `/api` to the backend on `localhost:5559`.

### Windows dev

If you use Docker Desktop on Windows, `yarn dev` and `yarn dev:backend` will default to `//./pipe/docker_engine`, so you usually do not need to set `DOCKER_SOCKET_PATH`.

You will still usually want to point `SWAG_PROXY_CONFS_DIR` at a local copy or synced folder containing your SWAG proxy configs. Putting that in the root `.env` file is enough for `yarn dev`.

Example:

```dotenv
SWAG_PROXY_CONFS_DIR=C:\Users\justi\Documents\used_configs
BASE_DOMAIN=example.com
```

### Linux deployment

For your real Linux deployment, keep using the normal socket mount and Linux-style SWAG path:

- `/swag/proxy-confs`
- `/var/run/docker.sock`

## Docker

Example compose file: [docker-compose.example.yml](/c:/Users/justi/Desktop/swagfront/swagfront/docker-compose.example.yml)

Key mounts:

- `/swag/proxy-confs:/swag/proxy-confs:ro`
- `/var/run/docker.sock:/var/run/docker.sock`

Build and run:

```bash
docker compose -f docker-compose.example.yml up --build
```

The app will be served on `http://localhost:5559`.

This project now builds into a single deployable container image:

- the backend reads SWAG configs and Docker metadata
- the backend also serves the built frontend assets
- only one container and one published port are required

## API

### `GET /api/proxies`

Optional query params:

- `includeSamples=true` to include inactive `.sample` configs

Response includes:

- parsed SWAG config details
- matched Docker container info when a conservative match is available
- match confidence and warning text when the inference is weak or ambiguous

## Matching notes

The matching logic is intentionally simple and conservative.

Signals used:

- `upstream_app` compared to container names and aliases
- `proxy_pass` host compared to container names and aliases
- `upstream_port` and `proxy_pass` port compared to exposed container ports
- token overlap between config-derived names and container-derived names

If the evidence is weak or tied, the UI shows that uncertainty instead of pretending the match is exact.

## Safety

- Only `GET` endpoints are implemented
- No file writes outside normal application runtime
- No config editing
- No Docker mutation calls
- No restart, stop, prune, exec, or shell control features
