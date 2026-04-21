import { useEffect, useMemo, useState } from 'react'
import { ProxiesResponse, ProxyRow } from '@swagfront/shared'

function matchesSearch(row: ProxyRow, query: string): boolean {
  if (!query) {
    return true
  }

  const haystack = [
    row.filename,
    row.serverNames.join(' '),
    row.publicUrls.join(' '),
    row.docker?.name ?? '',
    row.detectedProxyTarget ?? '',
    row.match.reason,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(query.toLowerCase())
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function shuffledRows(rows: ProxyRow[]): ProxyRow[] {
  return [...rows].sort((left, right) => {
    if (left.isSample !== right.isSample) {
      return left.isSample ? 1 : -1
    }

    return hashString(left.filename) - hashString(right.filename)
  })
}

function cardTitle(row: ProxyRow): string {
  if (row.publicUrls[0]) {
    try {
      const host = new URL(row.publicUrls[0]).hostname
      return host.split('.')[0] || host
    } catch {
      return row.publicUrls[0]
    }
  }

  return row.serverNames[0] ?? row.upstreamApp ?? 'unknown'
}

function cardUrl(row: ProxyRow): string {
  return row.publicUrls[0] ?? 'No public URL'
}

function displayUrl(row: ProxyRow): string {
  const url = row.publicUrls[0]
  if (!url) {
    return 'No public URL'
  }

  return url.replace(/^https?:\/\//, '')
}

function statusText(row: ProxyRow): string {
  if (!row.docker) {
    return row.match.confidence === 'none' ? 'No match' : 'Uncertain'
  }

  return row.docker.status
}

function targetText(row: ProxyRow): string {
  if (row.detectedProxyTarget) {
    return row.detectedProxyTarget
  }

  if (row.upstreamApp || row.upstreamPort) {
    return `${row.upstreamApp ?? '?'}:${row.upstreamPort ?? '?'}`
  }

  return 'No target found'
}

function posterShapeClass(row: ProxyRow): string {
  const variants = [
    'shapes-a',
    'shapes-b',
    'shapes-c',
    'shapes-d',
    'shapes-e',
    'shapes-f',
  ]
  return variants[hashString(`${row.filename}:shapes`) % variants.length]
}

function cardAccentClass(row: ProxyRow): string {
  if (row.docker?.status === 'running') {
    return 'poster-running'
  }

  if (row.docker?.status === 'stopped') {
    return 'poster-stopped'
  }

  const accents = [
    'poster-purple',
    'poster-blue',
    'poster-magenta',
    'poster-cyan',
    'poster-red',
    'poster-green',
    'poster-orange',
    'poster-teal',
    'poster-rose',
    'poster-indigo',
    'poster-lime',
    'poster-yellow',
    'poster-coral',
  ]
  return accents[hashString(row.filename) % accents.length]
}

export function App() {
  const [data, setData] = useState<ProxiesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [includeSamples, setIncludeSamples] = useState(false)
  const [activityFilter, setActivityFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all')

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/proxies?includeSamples=${includeSamples}`
      )
      if (!response.ok) {
        let details = `Request failed with ${response.status}`

        try {
          const errorPayload = (await response.json()) as {
            error?: string
            details?: string
          }
          if (errorPayload.details) {
            details = `${details}: ${errorPayload.details}`
          } else if (errorPayload.error) {
            details = `${details}: ${errorPayload.error}`
          }
        } catch {
          // Keep the HTTP status fallback when the backend error response is not JSON.
        }

        throw new Error(details)
      }

      const payload = (await response.json()) as ProxiesResponse
      setData(payload)
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unknown UI fetch error'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [includeSamples])

  const rows = useMemo(
    () =>
      shuffledRows(
        (data?.rows ?? []).filter((row) => {
          if (!matchesSearch(row, search)) {
            return false
          }

          if (activityFilter === 'active') {
            return !row.isSample
          }

          if (activityFilter === 'inactive') {
            return row.isSample
          }

          return true
        })
      ),
    [activityFilter, data, search]
  )

  return (
    <div className="page-shell">
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
                Super simple SWAG front showing your proxied containers and
                where they target to. No actions can be performed to your SWAG
                config or Docker containers.
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
              {data
                ? new Date(data.generatedAt).toLocaleString()
                : 'Loading...'}
            </strong>
          </div>
        </div>
      </header>

      <section className="toolbar">
        <input
          aria-label="Search proxies"
          className="search-input"
          placeholder="Search by host, file, target, or container"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <label className="switch-control">
          <input
            type="checkbox"
            className="switch-input"
            checked={includeSamples}
            onChange={(event) => setIncludeSamples(event.target.checked)}
          />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
          <span>Show sample configs</span>
        </label>
        <div
          className="filter-pills"
          role="group"
          aria-label="Poster activity filter"
        >
          <button
            type="button"
            className={`filter-pill ${
              activityFilter === 'all' ? 'selected' : ''
            }`}
            onClick={() => setActivityFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-pill ${
              activityFilter === 'active' ? 'selected' : ''
            }`}
            onClick={() => setActivityFilter('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={`filter-pill ${
              activityFilter === 'inactive' ? 'selected' : ''
            }`}
            onClick={() => setActivityFilter('inactive')}
          >
            Inactive
          </button>
        </div>
        <button
          className="refresh-button"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {error ? (
        <div className="error-banner">Failed to load data: {error}</div>
      ) : null}
      {data?.warnings.map((warning) => (
        <div className="warning-banner" key={warning}>
          {warning}
        </div>
      ))}

      <section className="poster-grid">
        {rows.map((row) => (
          <article
            key={row.filename}
            className={`proxy-poster ${cardAccentClass(row)} ${posterShapeClass(
              row
            )} ${row.isSample ? 'sample' : 'active'} ${
              row.publicUrls[0] ? 'clickable' : ''
            }`}
            onClick={() => {
              if (!row.publicUrls[0]) {
                return
              }

              window.open(row.publicUrls[0], '_blank', 'noreferrer')
            }}
            role={row.publicUrls[0] ? 'link' : undefined}
            tabIndex={row.publicUrls[0] ? 0 : -1}
            onKeyDown={(event) => {
              if (!row.publicUrls[0]) {
                return
              }

              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                window.open(row.publicUrls[0], '_blank', 'noreferrer')
              }
            }}
          >
            <div className="poster-art">
              <div className="poster-shape poster-shape-one" />
              <div className="poster-shape poster-shape-two" />
              <div className="poster-title-wrap">
                <span className="poster-kicker">{statusText(row)}</span>
                <strong className="poster-title">{cardTitle(row)}</strong>
              </div>
            </div>
            <div className="poster-footer">
              <span
                className={`poster-state-badge ${
                  row.isSample ? 'inactive' : 'active'
                }`}
              >
                {row.isSample ? 'Inactive' : 'Active'}
              </span>
            </div>
            <div className="poster-overlay">
              <span>URL: {displayUrl(row)}</span>
              <span>Container: {row.docker?.name ?? 'Unmatched'}</span>
              <span>Target: {targetText(row)}</span>
              <span>
                Ports:{' '}
                {row.docker?.portMappings.join(', ') ||
                  row.upstreamPort ||
                  'None'}
              </span>
            </div>
          </article>
        ))}

        {!loading && rows.length === 0 ? (
          <div className="empty-state posters-empty">
            <strong>No configs matched.</strong>
            <span>
              Try a different search or include inactive sample configs.
            </span>
          </div>
        ) : null}
      </section>
    </div>
  )
}
