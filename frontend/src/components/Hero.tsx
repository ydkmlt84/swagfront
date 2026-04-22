import { AppUpdateInfo, ProxiesResponse } from '@swagfront/shared'

type HeroProps = {
  data: ProxiesResponse | null
}

function versionSummary(app: AppUpdateInfo | undefined): string {
  if (!app) {
    return 'Loading...'
  }

  if (!app.enabled) {
    return app.currentVersion
  }

  if (app.updateAvailable && app.latestVersion) {
    return `${app.currentVersion} -> ${app.latestVersion}`
  }

  if (app.error) {
    return `${app.currentVersion} | check unavailable`
  }

  return `${app.currentVersion} | current`
}

export function Hero({ data }: HeroProps) {
  return (
    <header className="hero">
      <div className="hero-copy">
        <div className="title-row">
          <div className="hero-version">
            <span className="hero-version-text">{versionSummary(data?.app)}</span>
            {data?.app?.updateAvailable && data.app.latestUrl ? (
              <a
                className="hero-version-link"
                href={data.app.latestUrl}
                target="_blank"
                rel="noreferrer"
              >
                Update available
              </a>
            ) : data?.app?.error ? (
              <span className="hero-version-note">Release check unavailable</span>
            ) : data?.app?.enabled ? (
              <span className="hero-version-note">No update available</span>
            ) : (
              <span className="hero-version-note">Update check off</span>
            )}
          </div>
          <div className="hero-logo-wrap">
            <img
              className="hero-logo"
              src="/swagfront_icon.svg"
              alt="SWAG Front logo"
            />
          </div>
          <div>
            <h1>SWAG Front</h1>
            <p className="subtle">
              Super simple SWAG front showing your proxied containers and where
              they target to. No actions can be performed to your SWAG config
              or Docker containers.
            </p>
          </div>
        </div>
      </div>
      <div className="hero-meta">
        <div className="meta-card">
          <span>Configs</span>
          <strong>{data?.rows.length ?? 0}</strong>
        </div>
        <div className="meta-card">
          <span>Updated</span>
          <strong>
            {data ? new Date(data.generatedAt).toLocaleString() : 'Loading...'}
          </strong>
        </div>
      </div>
    </header>
  )
}
