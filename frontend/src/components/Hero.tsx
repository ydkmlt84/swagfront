import { ProxiesResponse } from '@swagfront/shared'

type HeroProps = {
  data: ProxiesResponse | null
}

export function Hero({ data }: HeroProps) {
  return (
    <header className="hero">
      <div className="hero-copy">
        <div className="title-row">
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
